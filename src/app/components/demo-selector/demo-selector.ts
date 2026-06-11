import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plane, ArrowRight, Users, Clock, ChefHat } from 'lucide-angular';
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
  { bg: 'bg-blue-50', border: 'border-blue-200', flightBadge: 'bg-blue-600 text-white', btn: 'bg-blue-600 hover:bg-blue-700', serviceBadge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { bg: 'bg-amber-50', border: 'border-amber-200', flightBadge: 'bg-amber-600 text-white', btn: 'bg-amber-600 hover:bg-amber-700', serviceBadge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { bg: 'bg-rose-50', border: 'border-rose-200', flightBadge: 'bg-[#E20613] text-white', btn: 'bg-[#E20613] hover:bg-red-700', serviceBadge: 'bg-rose-100 text-rose-800 border-rose-200' },
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

  readonly Plane = Plane;
  readonly ArrowRight = ArrowRight;
  readonly Users = Users;
  readonly Clock = Clock;
  readonly ChefHat = ChefHat;

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
