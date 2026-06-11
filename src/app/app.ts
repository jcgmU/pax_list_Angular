import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from './store.service';
import type { ServiceType } from '../domain/mealService';

import { DemoSelector } from './components/demo-selector/demo-selector';
import { SeatMap } from './components/seat-map/seat-map';
import { StatsSidebar } from './components/stats-sidebar/stats-sidebar';
import { PassengerModal } from './components/passenger-modal/passenger-modal';
import { ComandaMode } from './components/comanda-mode/comanda-mode';

import { LucideAngularModule, Plane, RotateCcw, FlaskConical, ChevronDown, ChefHat } from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    LucideAngularModule,
    DemoSelector,
    SeatMap,
    StatsSidebar,
    PassengerModal,
    ComandaMode
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  store = inject(StoreService);
  
  readonly Plane = Plane;
  readonly RotateCcw = RotateCcw;
  readonly FlaskConical = FlaskConical;
  readonly ChevronDown = ChevronDown;
  readonly ChefHat = ChefHat;

  SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
    { value: 'INSIGNIA', label: 'Servicio Insignia' },
    { value: 'AMERICAS', label: 'Business Americas' },
  ];

  onServiceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const val = target.value as ServiceType;
    if (val === this.store.manifest()?.serviceType) {
      this.store.setServiceOverride(null);
    } else {
      this.store.setServiceOverride(val);
    }
  }
}
