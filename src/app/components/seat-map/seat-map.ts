import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { LucideAngularModule, Coffee, Bath, Box, Accessibility, Dog, Utensils, AlertCircle, Search, CheckCircle2, Star, AlertTriangle, Crown } from 'lucide-angular';
import { AIRCRAFT_CONFIGS, AircraftElement } from '../../../domain/aircraftConfigs';
import { getAircraftConfigKey } from '../../../domain/aircraftMatch';
import { getCabinClass } from '../../../domain/cabinLookup';
import { deriveMealSlots } from '../../../domain/mealService';
import { FLIGHT_CODES } from '../../../domain/flightCodes';
import { SearchBar } from '../search-bar/search-bar';

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
    const parts = [`Asiento ${seatId}`, `${pax.firstName} ${pax.lastName}`];
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
