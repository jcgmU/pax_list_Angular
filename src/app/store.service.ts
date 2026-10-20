import { Injectable, signal, computed } from '@angular/core';
import type { FlightManifest, ParsedPassenger } from '../infrastructure/mockData';
import { AIRCRAFT_CONFIGS } from '../domain/aircraftConfigs';
import { FLIGHT_CODES } from '../domain/flightCodes';
import { getAircraftConfigKey } from '../domain/aircraftMatch';
import {
  countEmptySeats,
  countSSR,
  countMeals,
  seatsWithInfant,
  seatsWithAnySsr,
  seatsWithMeal,
  seatsWithCode
} from '../domain/flightStats';
import type { ServiceType, MealSlot, CrewZone, StockPool } from '../domain/mealService';
import { deriveMealSlots, seatZone, resolveStockPool, calculateRemaining } from '../domain/mealService';
import { getCabinClass } from '../domain/cabinLookup';
import type { ComfortKitProfile, ComfortKitSizes } from '../domain/comfortKit';
import { deriveTravelerId } from '../domain/comfortKit';
import { loadComfortKitProfiles, saveComfortKitProfile } from '../infrastructure/comfortKitProfiles';

export interface CourseSelection {
  entradaId?: string;
  platoFuerteId?: string;
  wakeUp?: boolean;
  unmetPlatoId?: string;
  unmetEntradaId?: string;
}

export type PassengerOrder = Partial<Record<MealSlot, CourseSelection>>;

export type MapLens =
  | { kind: 'occupancy' }
  | { kind: 'infants' }
  | { kind: 'ssr' }
  | { kind: 'meals' }
  | { kind: 'code'; code: string };

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  manifest = signal<FlightManifest | null>(null);
  selectedSeat = signal<string | null>(null);
  searchTerm = signal<string>('');
  orders = signal<Record<string, PassengerOrder>>({});
  serviceOverride = signal<ServiceType | null>(null);

  unavailable = signal<Record<string, boolean>>({});
  crewZone = signal<CrewZone | null>(null);
  comandaOpen = signal<boolean>(false);
  mapLens = signal<MapLens | null>(null);
  // Perfiles de talla del Kit de Confort, persistidos entre vuelos por pasajero.
  comfortKitProfiles = signal<Record<string, ComfortKitProfile>>(loadComfortKitProfiles());

  // Compatibilidad hacia atrás obligatoria
  showOccupancy = computed(() => this.mapLens()?.kind === 'occupancy');

  lensSeats = computed<Set<string> | null>(() => {
    const lens = this.mapLens();
    const man = this.manifest();
    if (!lens || !man || lens.kind === 'occupancy') return null;
    const pax = man.passengers;
    switch (lens.kind) {
      case 'infants':
        return seatsWithInfant(pax);
      case 'ssr':
        return seatsWithAnySsr(pax);
      case 'meals':
        return seatsWithMeal(pax, Object.keys(FLIGHT_CODES.MEALS));
      case 'code':
        return seatsWithCode(pax, lens.code);
    }
  });

  lensLabel = computed<string | null>(() => {
    const lens = this.mapLens();
    if (!lens) return null;
    switch (lens.kind) {
      case 'occupancy':
        return 'Sillas vacías';
      case 'infants':
        return 'Infantes (INF)';
      case 'ssr':
        return 'Servicios SSR';
      case 'meals':
        return 'Comidas';
      case 'code': {
        const desc = (FLIGHT_CODES.MEALS as Record<string, string>)[lens.code]
          || (FLIGHT_CODES.MEDICAL as Record<string, string>)[lens.code]
          || (FLIGHT_CODES.LEGAL as Record<string, string>)[lens.code]
          || (FLIGHT_CODES.ASSISTANCE as Record<string, string>)[lens.code]
          || (FLIGHT_CODES.ANIMALS as Record<string, string>)[lens.code]
          || (FLIGHT_CODES.BATTERIES as Record<string, string>)[lens.code]
          || (FLIGHT_CODES.STATUS as Record<string, string>)[lens.code];
        return desc ? `${lens.code} · ${desc}` : lens.code;
      }
    }
  });

  // Computed properties replacing 'get' methods
  activeServiceType = computed(() => {
    return this.serviceOverride() ?? this.manifest()?.serviceType ?? null;
  });

  comandaStatus = computed<'empty' | 'in-progress' | 'complete'>(() => {
    const man = this.manifest();
    const srvType = this.activeServiceType();
    const ord = this.orders();
    const unav = this.unavailable();
    const zone = this.crewZone();

    if (!man || !srvType) return 'empty';

    const slots = deriveMealSlots(srvType, man.departureTime);
    let businessPax = man.passengers.filter(
      (p) => getCabinClass(man.aircraftType, p.seat) === 'business'
    );

    if (zone !== null) {
      businessPax = businessPax.filter((p) => seatZone(p.seat) === zone);
    }

    if (businessPax.length === 0) return 'empty';

    const mealCodeSet = new Set(Object.keys(FLIGHT_CODES.MEALS));
    const atendidos = businessPax.filter((p) => {
      if (unav[`${man.flightNumber}::${p.seat}`]) return true;
      if (p.codes.some((c) => mealCodeSet.has(c))) return true;
      const order = ord[`${man.flightNumber}::${p.seat}`];
      return order !== undefined && slots.every((slot) => order[slot]?.platoFuerteId);
    }).length;

    if (atendidos === 0) return 'empty';
    if (atendidos === businessPax.length) return 'complete';
    return 'in-progress';
  });

  flightStats = computed(() => {
    const man = this.manifest();
    if (!man) return { emptySeats: 0, ssrCounts: {} as Record<string, number>, totalMeals: 0, totalPassengers: 0, infantCount: 0 };

    const configKey = getAircraftConfigKey(man.aircraftType);
    const config = AIRCRAFT_CONFIGS[configKey];
    const emptySeats = countEmptySeats(man, config);
    const ssrCounts = countSSR(man.passengers);
    const mealCodes = Object.keys(FLIGHT_CODES.MEALS);
    const totalMeals = countMeals(man.passengers, mealCodes);

    return {
      emptySeats,
      ssrCounts,
      totalMeals,
      totalPassengers: man.passengers.length,
      infantCount: man.infantCount ?? 0,
    };
  });

  // Actions
  setManifest(manifest: FlightManifest | null) {
    this.manifest.set(manifest);
    this.serviceOverride.set(null);
    this.orders.set({});
    this.unavailable.set({});
    this.crewZone.set(null);
    this.comandaOpen.set(false);
    this.mapLens.set(null);
  }

  toggleMapLens(lens: MapLens) {
    const current = this.mapLens();
    if (!current) {
      this.mapLens.set(lens);
    } else if (current.kind === lens.kind && (lens.kind !== 'code' || (current.kind === 'code' && current.code === lens.code))) {
      this.mapLens.set(null);
    } else {
      this.mapLens.set(lens);
    }
  }

  clearMapLens() {
    this.mapLens.set(null);
  }

  toggleOccupancy() {
    this.toggleMapLens({ kind: 'occupancy' });
  }

  setSelectedSeat(seat: string | null) {
    this.selectedSeat.set(seat);
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  setServiceOverride(type: ServiceType | null) {
    this.serviceOverride.set(type);
  }

  reset() {
    this.setManifest(null);
  }

  setCourseSelection(seat: string, slot: MealSlot, patch: Partial<CourseSelection>) {
    const man = this.manifest();
    if (!man) return;
    const key = `${man.flightNumber}::${seat}`;
    this.orders.update(orders => {
      const existing = orders[key] ?? {};
      const updatedOrder: PassengerOrder = {
        ...existing,
        [slot]: { ...(existing[slot] ?? {}), ...patch },
      };
      return { ...orders, [key]: updatedOrder };
    });
  }

  clearOrder(seat: string) {
    const man = this.manifest();
    if (!man) return;
    const key = `${man.flightNumber}::${seat}`;
    this.orders.update(orders => {
      const updated = { ...orders };
      delete updated[key];
      return updated;
    });
  }

  setPaxUnavailable(seat: string, value: boolean) {
    const man = this.manifest();
    if (!man) return;
    const key = `${man.flightNumber}::${seat}`;
    this.unavailable.update(unav => {
      return { ...unav, [key]: value };
    });
  }

  setCrewZone(zone: CrewZone | null) {
    this.crewZone.set(zone);
  }

  openComanda() {
    this.comandaOpen.set(true);
  }

  closeComanda() {
    this.comandaOpen.set(false);
    this.crewZone.set(null);
  }

  clearZoneOrders(zone: CrewZone) {
    const man = this.manifest();
    if (!man) return;
    const prefix = `${man.flightNumber}::`;
    
    this.orders.update(orders => {
      const updatedOrders = { ...orders };
      Object.keys(updatedOrders)
        .filter(key => key.startsWith(prefix) && seatZone(key.slice(prefix.length)) === zone)
        .forEach(key => { delete updatedOrders[key]; });
      return updatedOrders;
    });

    this.unavailable.update(unav => {
      const updatedUnavailable = { ...unav };
      Object.keys(updatedUnavailable)
        .filter(key => key.startsWith(prefix) && seatZone(key.slice(prefix.length)) === zone)
        .forEach(key => { delete updatedUnavailable[key]; });
      return updatedUnavailable;
    });
  }

  getPassengerBySeat(seat: string): ParsedPassenger | undefined {
    return this.manifest()?.passengers.find((p) => p.seat === seat);
  }

  getRemainingForItem(
    slot: MealSlot,
    kind: 'plato' | 'entrada',
    itemId: string,
    stock: number,
    passengerSeat?: string
  ): number {
    const man = this.manifest();
    if (!man) return stock;
    const srvType = this.activeServiceType();
    if (!srvType) return stock;

    const pool = resolveStockPool(srvType, this.crewZone(), passengerSeat);
    return calculateRemaining({
      flightNumber: man.flightNumber,
      slot,
      kind,
      itemId,
      stock,
      pool,
      orders: this.orders(),
      unavailable: this.unavailable(),
    });
  }

  getOrder(seat: string): PassengerOrder | undefined {
    const man = this.manifest();
    if (!man) return undefined;
    return this.orders()[`${man.flightNumber}::${seat}`];
  }

  getComfortKitProfile(passenger: ParsedPassenger): ComfortKitProfile | undefined {
    return this.comfortKitProfiles()[deriveTravelerId(passenger)];
  }

  setComfortKitSizes(passenger: ParsedPassenger, sizes: ComfortKitSizes) {
    const travelerId = deriveTravelerId(passenger);
    const updated = saveComfortKitProfile(travelerId, sizes);
    this.comfortKitProfiles.update(profiles => ({ ...profiles, [travelerId]: updated }));
  }

  recoverNps(seat: string) {
    this.manifest.update(man => {
      if (!man) return man;
      const updatedPassengers = man.passengers.map(p => {
        if (p.seat === seat && p.nps) {
          return { ...p, nps: { ...p.nps, recovered: true } };
        }
        return p;
      });
      return { ...man, passengers: updatedPassengers };
    });
  }
}
