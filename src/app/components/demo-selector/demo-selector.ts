import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ArrowRight, Users, Clock, ChefHat, Plane } from 'lucide-angular';
import { StoreService } from '../../store.service';
import { DEMO_FLIGHTS } from '../../../infrastructure/mockData';
import { deriveMealSlots } from '../../../domain/mealService';
import type { FlightManifest } from '../../../infrastructure/mockData';

const AIRCRAFT_LABELS: Record<string, string> = {
  'B787-8': 'Boeing 787-8 Dreamliner',
  'A320': 'Airbus A320',
  'A319': 'Airbus A319',
};

const SLOT_LABELS: Record<string, string> = {
  DESAYUNO: 'Desayuno',
  ALMUERZO: 'Almuerzo',
  CENA: 'Cena',
};

const ROUTE_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/25', flightBadge: 'bg-blue-600 text-white', btn: 'bg-blue-600 hover:bg-blue-700', serviceBadge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/25', flightBadge: 'bg-amber-600 text-white', btn: 'bg-amber-600 hover:bg-amber-700', serviceBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/25', flightBadge: 'bg-[#E20613] text-white', btn: 'bg-[#E20613] hover:bg-red-700', serviceBadge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25' },
];

@Component({
  selector: 'app-demo-selector',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './demo-selector.html',
  styleUrls: ['./demo-selector.css']
})
export class DemoSelector {
  store = inject(StoreService);

  readonly ArrowRight = ArrowRight;
  readonly Users = Users;
  readonly Clock = Clock;
  readonly ChefHat = ChefHat;
  readonly Plane = Plane;

  flights = DEMO_FLIGHTS.map((flight, i) => {
    return {
      ...flight,
      colors: ROUTE_COLORS[i],
      slots: deriveMealSlots(flight.serviceType, flight.departureTime),
      serviceLabel: flight.serviceType === 'INSIGNIA' ? 'Servicio Insignia' : 'Business Americas',
      aircraftLabel: AIRCRAFT_LABELS[flight.aircraftType] ?? flight.aircraftType
    };
  });
  
  getSlotLabel(slot: string) {
    return SLOT_LABELS[slot] || slot;
  }

  onFlightSelect(flight: FlightManifest) {
    this.store.setManifest(flight);
  }
}
