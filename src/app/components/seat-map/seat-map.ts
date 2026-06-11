import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { LucideAngularModule, Coffee, Bath, Box, Accessibility, Dog, Utensils, AlertCircle, Search, CheckCircle2 } from 'lucide-angular';
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
    if (this.isBlocked(element, seatId)) return 'bg-slate-800 opacity-20 cursor-not-allowed';
    const pax = this.getPassenger(seatId);
    if (pax) {
      if (pax.status === 'DIAM' || pax.status === 'D') return 'bg-slate-900';
      if (pax.status === 'GOLD' || pax.status === 'G') return 'bg-amber-400';
      return 'bg-[#E20613]/10';
    }
    return 'bg-slate-200'; // Libre
  }

  getTextColor(seatId: string, element: AircraftElement): string {
    if (this.isBlocked(element, seatId)) return 'text-transparent';
    const pax = this.getPassenger(seatId);
    if (pax) {
      if (pax.status === 'GOLD' || pax.status === 'G') return 'text-slate-900';
      if (pax.status !== 'DIAM' && pax.status !== 'D') return 'text-[#E20613] font-black';
      return 'text-white';
    }
    return 'text-slate-400'; // Libre
  }

  getRingClasses(seatId: string): string {
    if (this.store.selectedSeat() === seatId) return 'ring-4 ring-[#E20613] ring-offset-2 z-10';
    if (this.isHighlighted(seatId)) return 'ring-4 ring-amber-400 ring-offset-1 z-10 animate-pulse';
    return '';
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

  selectSeat(seatId: string, element: AircraftElement) {
    if (!this.isBlocked(element, seatId)) {
      this.store.setSelectedSeat(seatId);
    }
  }
}
