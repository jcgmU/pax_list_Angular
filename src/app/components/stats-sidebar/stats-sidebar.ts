import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, MapLens } from '../../store.service';
import { SearchBar } from '../search-bar/search-bar';
import { 
  LucideAngularModule, 
  Users, Utensils, Accessibility, Baby, BarChart2, ChevronDown, 
  Star, Diamond, ChefHat, Bell, CheckCircle2, Crown
} from 'lucide-angular';
import { ParsedPassenger } from '../../../infrastructure/mockData';
import { getCabinClass } from '../../../domain/cabinLookup';
import { deriveMealSlots, buildCourses, ServiceType, MealSlot } from '../../../domain/mealService';

@Component({
  selector: 'app-stats-sidebar',
  standalone: true,
  imports: [CommonModule, SearchBar, LucideAngularModule],
  templateUrl: './stats-sidebar.html',
  styleUrl: './stats-sidebar.css',
})
export class StatsSidebar {
  store = inject(StoreService);

  readonly Users = Users;
  readonly Utensils = Utensils;
  readonly Accessibility = Accessibility;
  readonly Baby = Baby;
  readonly BarChart2 = BarChart2;
  readonly ChevronDown = ChevronDown;
  readonly Star = Star;
  readonly Diamond = Diamond;
  readonly ChefHat = ChefHat;
  readonly Bell = Bell;
  readonly CheckCircle2 = CheckCircle2;
  readonly Crown = Crown;

  isOpen = signal(false);
  expandedCode = computed(() => {
    const lens = this.store.mapLens();
    return lens?.kind === 'code' ? lens.code : null;
  });

  manifest = this.store.manifest;
  activeServiceType = this.store.activeServiceType;
  stats = this.store.flightStats;
  orders = this.store.orders;
  unavailable = this.store.unavailable;

  magnoPax = computed(() => {
    const m = this.manifest();
    if (!m) return [];
    return m.passengers
      .filter(p => ['MAGN', 'M'].includes(p.status ?? ''))
      .sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true }));
  });

  diamondPax = computed(() => {
    const m = this.manifest();
    if (!m) return [];
    return m.passengers
      .filter(p => ['DIAM', 'D'].includes(p.status ?? ''))
      .sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true }));
  });

  goldPax = computed(() => {
    const m = this.manifest();
    if (!m) return [];
    return m.passengers
      .filter(p => ['GOLD', 'G'].includes(p.status ?? ''))
      .sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true }));
  });

  totalSSR = computed(() => Object.values(this.stats().ssrCounts).reduce((a, b) => a + b, 0));

  ssrCodes = computed(() => Object.keys(this.stats().ssrCounts));

  getPassengersForCode(code: string) {
    const m = this.manifest();
    if (!m) return [];
    return m.passengers
      .filter(p => p.codes.includes(code))
      .sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true }));
  }

  isLensCodeActive(code: string): boolean {
    const lens = this.store.mapLens();
    return lens?.kind === 'code' && lens.code === code;
  }

  private scrollToMapIfMobile() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const seatMapEl = document.querySelector('app-seat-map');
      if (seatMapEl) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        seatMapEl.scrollIntoView({
          block: 'start',
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    }
  }

  toggleLens(lens: MapLens) {
    const current = this.store.mapLens();
    const willBeActive = !current || current.kind !== lens.kind || (lens.kind === 'code' && (current as any).code !== lens.code);
    this.store.toggleMapLens(lens);
    if (willBeActive) {
      this.scrollToMapIfMobile();
    }
  }

  toggleOccupancy() {
    const willBeActive = !this.store.showOccupancy();
    this.store.toggleOccupancy();
    if (willBeActive) {
      this.scrollToMapIfMobile();
    }
  }

  handleCodeClick(code: string) {
    this.toggleLens({ kind: 'code', code });
  }

  toggleOpen() {
    this.isOpen.update(v => !v);
  }

  comandaData = computed(() => {
    const m = this.manifest();
    const serviceType = this.activeServiceType();
    const allOrders = this.orders();
    if (!m || !serviceType) return null;

    const slots = deriveMealSlots(serviceType, m.departureTime);
    const courses = buildCourses(serviceType, slots);

    const businessPax = m.passengers.filter(
      (p) => getCabinClass(m.aircraftType, p.seat) === 'business'
    );

    const getOrderForSeat = (seat: string) => allOrders[`${m.flightNumber}::${seat}`];

    const comandasTomadas = businessPax.filter((p) => {
      const order = getOrderForSeat(p.seat);
      return order && slots.every((slot) => order[slot]?.platoFuerteId);
    }).length;

    const wakeUpByCourse = courses
      .filter((c) => c.hasWakeUp)
      .map((c) => ({
        label: c.label,
        slot: c.slot,
        seats: businessPax
          .filter((p) => getOrderForSeat(p.seat)?.[c.slot]?.wakeUp)
          .sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true })),
      }))
      .filter((c) => c.seats.length > 0);

    const serviceLabel = serviceType === 'INSIGNIA' ? 'Servicio Insignia' : 'Business Americas';

    const unmetCounts: Record<string, { name: string; count: number; kind: 'plato' | 'entrada' }> = {};

    Object.entries(allOrders)
      .filter(([key]) => key.startsWith(`${m.flightNumber}::`))
      .forEach(([_, order]) => {
        slots.forEach(slot => {
          const sel = (order as any)[slot];
          if (sel?.unmetPlatoId) {
            const item = courses.flatMap(c => c.platosFuertes).find(i => i.id === sel.unmetPlatoId);
            if (item) {
              unmetCounts[sel.unmetPlatoId] ??= { name: item.name, count: 0, kind: 'plato' };
              unmetCounts[sel.unmetPlatoId].count++;
            }
          }
          if (sel?.unmetEntradaId) {
            const item = courses.flatMap(c => c.entradas || []).find(i => i.id === sel.unmetEntradaId);
            if (item) {
              unmetCounts[sel.unmetEntradaId] ??= { name: item.name, count: 0, kind: 'entrada' };
              unmetCounts[sel.unmetEntradaId].count++;
            }
          }
        });
      });

    const sortedUnmet = Object.values(unmetCounts).sort((a, b) => b.count - a.count).filter(x => x.count > 0);

    return {
      serviceLabel,
      comandasTomadas,
      businessPaxCount: businessPax.length,
      wakeUpByCourse,
      courses,
      serviceType,
      sortedUnmet
    };
  });

  getZoneFromKey(key: string, flightNumber: string): 'A-D' | 'E-K' | null {
    const seat = key.replace(`${flightNumber}::`, '');
    const letter = seat.replace(/[0-9]/g, '').toUpperCase();
    return letter <= 'D' ? 'A-D' : 'E-K';
  }

  countConsumed(
    slot: string,
    kind: 'plato' | 'entrada',
    itemId: string,
    zone: 'A-D' | 'E-K' | 'all'
  ): number {
    const allOrders = this.orders();
    const m = this.manifest();
    if (!m) return 0;
    const flightNumber = m.flightNumber;

    return Object.entries(allOrders)
      .filter(([key]) => key.startsWith(`${flightNumber}::`))
      .filter(([key]) => {
        if (zone === 'all') return true;
        return this.getZoneFromKey(key, flightNumber) === zone;
      })
      .filter(([_, order]) =>
        kind === 'plato'
          ? (order as any)[slot]?.platoFuerteId === itemId
          : (order as any)[slot]?.entradaId === itemId
      ).length;
  }

  getInventoryBarData(consumed: number, stock: number) {
    const remaining = Math.max(0, stock - consumed);
    const pct = stock > 0 ? (consumed / stock) * 100 : 0;
    const isLow = remaining <= 2 && remaining > 0;
    const isOut = remaining === 0;
    return { remaining, pct: Math.min(100, pct), isLow, isOut };
  }
}
