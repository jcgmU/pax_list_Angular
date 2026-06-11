import { Injectable, signal, computed } from '@angular/core';
import type { FlightManifest, ParsedPassenger } from '../infrastructure/mockData';
import { AIRCRAFT_CONFIGS } from '../domain/aircraftConfigs';
import { FLIGHT_CODES } from '../domain/flightCodes';
import { getAircraftConfigKey } from '../domain/aircraftMatch';
import { countEmptySeats, countSSR, countMeals } from '../domain/flightStats';
import type { ServiceType, MealSlot, CrewZone } from '../domain/mealService';
import { deriveMealSlots, seatZone } from '../domain/mealService';
import { getCabinClass } from '../domain/cabinLookup';

export interface CourseSelection {
  entradaId?: string;
  platoFuerteId?: string;
  wakeUp?: boolean;
  unmetPlatoId?: string;
  unmetEntradaId?: string;
}

export type PassengerOrder = Partial<Record<MealSlot, CourseSelection>>;

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

  getOrder(seat: string): PassengerOrder | undefined {
    const man = this.manifest();
    if (!man) return undefined;
    return this.orders()[`${man.flightNumber}::${seat}`];
  }
}
