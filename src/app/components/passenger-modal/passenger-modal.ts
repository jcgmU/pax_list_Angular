import { Component, inject, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { FLIGHT_CODES } from '../../../domain/flightCodes';
import { getCabinClass } from '../../../domain/cabinLookup';
import { ComandaForm } from '../comanda-form/comanda-form';
import { ComfortKitCard } from '../comfort-kit-card/comfort-kit-card';
import { LucideAngularModule, X, User, Star, Utensils, Accessibility, AlertCircle, Info, AlertTriangle, CheckCircle2, Dog, Gift, Baby, Battery, Briefcase, Diamond, Crown } from 'lucide-angular';
import { ParsedPassenger } from '../../../infrastructure/mockData';

@Component({
  selector: 'app-passenger-modal',
  standalone: true,
  imports: [CommonModule, ComandaForm, ComfortKitCard, LucideAngularModule],
  templateUrl: './passenger-modal.html',
})
export class PassengerModal {
  store = inject(StoreService);

  readonly X = X;
  readonly User = User;
  readonly Star = Star;
  readonly Utensils = Utensils;
  readonly Accessibility = Accessibility;
  readonly AlertCircle = AlertCircle;
  readonly Info = Info;
  readonly AlertTriangle = AlertTriangle;
  readonly CheckCircle2 = CheckCircle2;
  readonly Dog = Dog;
  readonly Gift = Gift;
  readonly Baby = Baby;
  readonly Battery = Battery;
  readonly Briefcase = Briefcase;
  readonly Diamond = Diamond;
  readonly Crown = Crown;

  selectedSeat = this.store.selectedSeat;
  manifest = this.store.manifest;

  passenger = computed(() => {
    const seat = this.selectedSeat();
    if (!seat) return undefined;
    return this.store.getPassengerBySeat(seat);
  });

  showComanda = computed(() => {
    const man = this.manifest();
    const seat = this.selectedSeat();
    if (!man || !seat) return false;
    const cabinClass = getCabinClass(man.aircraftType, seat);
    return cabinClass === 'business' && !!this.passenger();
  });

  // El Kit de Confort es un obsequio de Business Class — misma elegibilidad que la comanda.
  showComfortKit = computed(() => this.showComanda());

  getCodeDescription(code: string): string {
    for (const category of Object.values(FLIGHT_CODES)) {
      if ((category as Record<string, string>)[code]) return (category as Record<string, string>)[code];
    }
    return 'Requerimiento especial';
  }

  @HostListener('document:keydown.escape')
  close() {
    this.store.setSelectedSeat(null);
  }

  markNpsRecovered() {
    const seat = this.selectedSeat();
    if (seat) {
      this.store.recoverNps(seat);
    }
  }

  filteredCodes = computed(() => {
    const p = this.passenger();
    if (!p) return [];
    const loyaltyCodes = ['MAGN', 'M', 'DIAM', 'D', 'GOLD', 'G', 'SILV', 'SILVER', 'PLUS'];
    return p.codes.filter(c => !loyaltyCodes.includes(c));
  });

  getIconInfo(code: string) {
    let Icon = this.Info;
    let iconColor = 'bg-fg/[0.07] text-fg-3';

    if (['WCHR', 'WCHS', 'WCHC', 'WCMP', 'WCOB'].includes(code)) {
      Icon = this.Accessibility;
      iconColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
    } else if (Object.keys(FLIGHT_CODES.ANIMALS).includes(code)) {
      Icon = this.Dog;
      iconColor = 'bg-orange-500/15 text-orange-700 dark:text-orange-300';
    } else if (Object.keys(FLIGHT_CODES.MEALS).includes(code)) {
      Icon = this.Utensils;
      iconColor = 'bg-green-500/15 text-green-700 dark:text-green-300';
    } else if (
      Object.keys(FLIGHT_CODES.MEDICAL).includes(code) ||
      Object.keys(FLIGHT_CODES.LEGAL).includes(code)
    ) {
      Icon = this.AlertCircle;
      iconColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
    } else if (Object.keys(FLIGHT_CODES.BATTERIES).includes(code)) {
      Icon = this.Battery;
      iconColor = 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300';
    } else if (Object.keys(FLIGHT_CODES.ASSISTANCE).includes(code)) {
      Icon = this.Briefcase;
      iconColor = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300';
    } else if (code === 'BDAY') {
      Icon = this.Gift;
      iconColor = 'bg-pink-500/15 text-pink-700 dark:text-pink-300';
    } else if (code === 'INF' || code === 'CHD') {
      Icon = this.Baby;
      iconColor = 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300';
    }

    return { Icon, iconColor };
  }
}
