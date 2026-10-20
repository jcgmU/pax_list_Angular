import { Component, inject, computed, signal, ElementRef, DestroyRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { LucideAngularModule, Coffee, Bath, Box, Accessibility, Dog, Utensils, AlertCircle, Search, CheckCircle2, Star, AlertTriangle, Crown } from 'lucide-angular';
import { AIRCRAFT_CONFIGS, AircraftElement } from '../../../domain/aircraftConfigs';
import { getAircraftConfigKey } from '../../../domain/aircraftMatch';
import { getCabinClass } from '../../../domain/cabinLookup';
import { deriveMealSlots } from '../../../domain/mealService';
import { FLIGHT_CODES } from '../../../domain/flightCodes';
import { SearchBar } from '../search-bar/search-bar';

// Por debajo de esta escala el asiento (44 px) baja del mínimo táctil de WCAG 2.5.8 (24 px); el resto se desplaza en horizontal.
const MIN_FIT_ZOOM = 0.55;

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SearchBar],
  templateUrl: './seat-map.html',
  styleUrls: ['./seat-map.css']
})
export class SeatMap {
  store = inject(StoreService);
  
  showSearch = false;

  // Escala el fuselaje para que quepa en pantallas angostas; en anchos mayores queda en 1.
  fitZoom = signal(1);

  readonly Search = Search;
  readonly Coffee = Coffee;
  readonly Bath = Bath;
  readonly Box = Box;
  readonly Accessibility = Accessibility;
  readonly Dog = Dog;
  readonly Utensils = Utensils;
  readonly AlertCircle = AlertCircle;
  readonly CheckCircle2 = CheckCircle2;
  readonly Star = Star;
  readonly AlertTriangle = AlertTriangle;
  readonly Crown = Crown;

  configKey = computed(() => {
    const man = this.store.manifest();
    return man ? getAircraftConfigKey(man.aircraftType) : '';
  });

  config = computed(() => {
    const key = this.configKey();
    return key ? AIRCRAFT_CONFIGS[key] : null;
  });

  slots = computed(() => {
    const srvType = this.store.activeServiceType();
    const man = this.store.manifest();
    return srvType && man ? deriveMealSlots(srvType, man.departureTime) : [];
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.updateFitZoom(host));
      observer.observe(host);
      const fuselage = host.querySelector('[data-fit-target]');
      if (fuselage) observer.observe(fuselage);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private updateFitZoom(host: HTMLElement) {
    const target = host.querySelector<HTMLElement>('[data-fit-target]');
    if (!target) return;
    const current = this.fitZoom();
    const natural = target.getBoundingClientRect().width / current;
    if (!natural) return;
    const next = Math.min(1, Math.max(MIN_FIT_ZOOM, host.clientWidth / natural));
    if (Math.abs(next - current) > 0.005) this.fitZoom.set(next);
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  hasCompleteOrder(seatId: string): boolean {
    const man = this.store.manifest();
    if (!man) return false;
    if (getCabinClass(man.aircraftType, seatId) !== 'business') return false;
    
    const order = this.store.getOrder(seatId);
    const s = this.slots();
    if (!order || s.length === 0) return false;
    return s.every((slot) => order[slot]?.platoFuerteId);
  }

  getIconForComponent(iconName: string) {
    if (iconName === 'coffee') return Coffee;
    if (iconName === 'bath') return Bath;
    if (iconName === 'box') return Box;
    return Coffee;
  }

  isAisle(col: string) {
    return col === 'aisle';
  }

  getPassenger(seatId: string) {
    return this.store.getPassengerBySeat(seatId);
  }

  isBlocked(element: AircraftElement, seatId: string) {
    if (element.type === 'facility') return false;
    return element.blockedSeats?.includes(seatId) ?? false;
  }

  isHighlighted(seatId: string): boolean {
    const term = this.store.searchTerm();
    if (term.length < 2) return false;
    const upperTerm = term.toUpperCase();
    if (seatId.includes(upperTerm)) return true;
    const pax = this.getPassenger(seatId);
    if (pax) {
      const fullName = `${pax.firstName} ${pax.lastName}`.toUpperCase();
      if (fullName.includes(upperTerm)) return true;
    }
    return false;
  }

  getBgColor(seatId: string, element: AircraftElement): string {
    if (this.isBlocked(element, seatId)) return 'bg-fg/5 border border-dashed border-line-strong pointer-events-none opacity-40';
    const pax = this.getPassenger(seatId);

    // Rama prioritaria cuando se activa "Sillas Vacías" (mostrar ocupación en el mapa)
    if (this.store.showOccupancy()) {
      if (pax) {
        return 'bg-amber-400/25 border border-amber-500/60 dark:bg-amber-400/20 dark:border-amber-400/50';
      }
      return 'bg-emerald-500/20 border border-emerald-500/60 dark:bg-emerald-500/25 dark:border-emerald-400/50';
    }

    const lens = this.store.mapLens();
    if (lens !== null) {
      const isMatch = this.store.lensSeats()?.has(seatId) ?? false;
      if (isMatch) {
        return 'bg-sky-500/25 border border-sky-500/60 dark:bg-sky-500/20 dark:border-sky-400/50';
      }
      // Asientos no coincidentes se atenúan manteniendo su fondo neutro habitual
      if (pax) {
        if (pax.status === 'MAGN' || pax.status === 'M') return 'bg-gradient-to-br from-[#3c1053] to-[#ad5389] border border-purple-950 opacity-40';
        if (pax.status === 'DIAM' || pax.status === 'D') return 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 dark:from-slate-100 dark:to-slate-300 opacity-40';
        if (pax.status === 'GOLD' || pax.status === 'G') return 'bg-gradient-to-br from-amber-400 to-amber-500 border border-amber-300/40 opacity-40';
        return 'bg-panel-3 border border-line-strong opacity-40';
      }
      return 'bg-transparent border border-line hover:border-line-strong opacity-40';
    }

    if (pax) {
      if (pax.status === 'MAGN' || pax.status === 'M') return 'bg-gradient-to-br from-[#3c1053] to-[#ad5389] border border-purple-950 shadow-sm animate-glow-purple';
      if (pax.status === 'DIAM' || pax.status === 'D') return 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 dark:from-slate-100 dark:to-slate-300 dark:border-white/60';
      if (pax.status === 'GOLD' || pax.status === 'G') return 'bg-gradient-to-br from-amber-400 to-amber-500 border border-amber-300/40';
      return 'bg-panel-3 border border-line-strong';
    }
    return 'bg-transparent border border-line hover:border-line-strong'; // Libre
  }

  getTextColor(seatId: string, element: AircraftElement): string {
    if (this.isBlocked(element, seatId)) return 'text-transparent';
    const pax = this.getPassenger(seatId);

    // Texto con contraste WCAG AA en dark y light para la vista de ocupación
    if (this.store.showOccupancy()) {
      if (pax) {
        return 'text-amber-950 dark:text-amber-200 font-bold';
      }
      return 'text-emerald-950 dark:text-emerald-200 font-bold';
    }

    const lens = this.store.mapLens();
    if (lens !== null) {
      const isMatch = this.store.lensSeats()?.has(seatId) ?? false;
      if (isMatch) {
        return 'text-sky-950 dark:text-sky-200 font-bold';
      }
      if (pax) {
        if (pax.status === 'GOLD' || pax.status === 'G') return 'text-amber-950 font-bold opacity-40';
        if (pax.status === 'MAGN' || pax.status === 'M') return 'text-white font-bold opacity-40';
        if (pax.status === 'DIAM' || pax.status === 'D') return 'text-white dark:text-slate-900 font-bold opacity-40';
        return 'text-fg font-bold opacity-40';
      }
      return 'text-fg-3 font-semibold opacity-40';
    }

    if (pax) {
      if (pax.status === 'GOLD' || pax.status === 'G') return 'text-amber-950 font-bold';
      if (pax.status === 'MAGN' || pax.status === 'M') return 'text-white font-bold';
      if (pax.status === 'DIAM' || pax.status === 'D') return 'text-white dark:text-slate-900 font-bold';
      return 'text-fg font-bold';
    }
    return 'text-fg-3 font-semibold'; // Libre
  }

  getRingClasses(seatId: string): string {
    if (this.store.selectedSeat() === seatId) return 'ring-2 ring-fg ring-offset-2 ring-offset-ink scale-105 z-10';
    if (this.hasNpsAlert(seatId)) return 'ring-2 ring-rose-500 animate-glow-rose z-10';
    if (this.isHighlighted(seatId)) return 'ring-2 ring-amber-500 animate-glow-gold z-10';
    return '';
  }

  hasNpsAlert(seatId: string): boolean {
    const pax = this.getPassenger(seatId);
    return pax?.nps !== undefined && pax.nps.score <= 6 && !pax.nps.recovered;
  }

  isNpsRecovered(seatId: string): boolean {
    const pax = this.getPassenger(seatId);
    return pax?.nps !== undefined && pax.nps.recovered;
  }

  hasWheelchair(seatId: string) {
    return this.getPassenger(seatId)?.codes.some(c => ['WCHR', 'WCHS', 'WCHC', 'WCMP', 'WCOB'].includes(c));
  }

  hasPet(seatId: string) {
    return this.getPassenger(seatId)?.codes.some(c => ['PETC', 'SVAN', 'ESAN'].includes(c));
  }

  hasMeal(seatId: string) {
    return this.getPassenger(seatId)?.codes.some(c => Object.keys(FLIGHT_CODES.MEALS).includes(c));
  }

  hasMedicalLegal(seatId: string) {
    return this.getPassenger(seatId)?.codes.some(c =>
      Object.keys(FLIGHT_CODES.MEDICAL).includes(c) || Object.keys(FLIGHT_CODES.LEGAL).includes(c)
    );
  }

  isMagno(seatId: string) {
    const pax = this.getPassenger(seatId);
    return pax?.status === 'MAGN' || pax?.status === 'M';
  }

  isDiamond(seatId: string) {
    const pax = this.getPassenger(seatId);
    return pax?.status === 'DIAM' || pax?.status === 'D';
  }

  isGold(seatId: string) {
    const pax = this.getPassenger(seatId);
    return pax?.status === 'GOLD' || pax?.status === 'G';
  }

  seatLabel(seatId: string, element: AircraftElement): string {
    if (this.isBlocked(element, seatId)) return `Asiento ${seatId}, no disponible`;
    const pax = this.getPassenger(seatId);
    if (!pax) return `Asiento ${seatId}, libre`;
    const parts = [`Asiento ${seatId}`, 'ocupado', `${pax.firstName} ${pax.lastName}`];
    if (this.store.mapLens() && this.store.mapLens()?.kind !== 'occupancy' && this.store.lensSeats()?.has(seatId)) {
      parts.push('coincide con el filtro');
    }
    if (this.isMagno(seatId)) parts.push('Magno');
    if (this.isDiamond(seatId)) parts.push('Diamond');
    if (this.isGold(seatId)) parts.push('Gold');
    if (this.hasNpsAlert(seatId)) parts.push('alerta NPS pendiente');
    if (this.isNpsRecovered(seatId)) parts.push('NPS atendido');
    if (this.hasWheelchair(seatId)) parts.push('silla de ruedas');
    if (this.hasPet(seatId)) parts.push('mascota');
    if (this.hasMeal(seatId)) parts.push('comida especial');
    if (this.hasMedicalLegal(seatId)) parts.push('requerimiento médico o legal');
    return parts.join(', ');
  }

  selectSeat(seatId: string, element: AircraftElement) {
    if (!this.isBlocked(element, seatId)) {
      this.store.setSelectedSeat(seatId);
    }
  }
}
