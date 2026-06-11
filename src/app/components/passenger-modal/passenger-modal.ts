import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { FLIGHT_CODES } from '../../../domain/flightCodes';
import { getCabinClass } from '../../../domain/cabinLookup';
import { ComandaForm } from '../comanda-form/comanda-form';
import { LucideAngularModule, X, User, Star, Utensils, Accessibility, AlertCircle, Info } from 'lucide-angular';
import { ParsedPassenger } from '../../../infrastructure/mockData';

@Component({
  selector: 'app-passenger-modal',
  standalone: true,
  imports: [CommonModule, ComandaForm, LucideAngularModule],
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

  getCodeDescription(code: string): string {
    for (const category of Object.values(FLIGHT_CODES)) {
      if ((category as Record<string, string>)[code]) return (category as Record<string, string>)[code];
    }
    return 'Requerimiento especial';
  }

  close() {
    this.store.setSelectedSeat(null);
  }

  getPassengerStatusColor() {
    const status = this.passenger()?.status;
    if (status === 'DIAM' || status === 'D') {
      return 'bg-slate-900 text-white';
    }
    return 'bg-amber-100 text-amber-700';
  }

  getIconInfo(code: string) {
    let Icon = this.Info;
    let iconColor = 'bg-slate-100 text-slate-500';

    if (['WCHR', 'WCHS', 'WCHC', 'WCMP', 'WCOB'].includes(code)) {
      Icon = this.Accessibility;
      iconColor = 'bg-blue-100 text-blue-600';
    } else if (Object.keys(FLIGHT_CODES.MEALS).includes(code)) {
      Icon = this.Utensils;
      iconColor = 'bg-green-100 text-green-600';
    } else if (
      Object.keys(FLIGHT_CODES.MEDICAL).includes(code) ||
      Object.keys(FLIGHT_CODES.LEGAL).includes(code)
    ) {
      Icon = this.AlertCircle;
      iconColor = 'bg-rose-100 text-rose-600';
    }

    return { Icon, iconColor };
  }
}
