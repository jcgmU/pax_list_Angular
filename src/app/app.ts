import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from './store.service';
import type { ServiceType } from '../domain/mealService';

import { DemoSelector } from './components/demo-selector/demo-selector';
import { SeatMap } from './components/seat-map/seat-map';
import { StatsSidebar } from './components/stats-sidebar/stats-sidebar';
import { PassengerModal } from './components/passenger-modal/passenger-modal';
import { ComandaMode } from './components/comanda-mode/comanda-mode';

import { LucideAngularModule, RotateCcw, FlaskConical, ChevronDown, ChefHat, ArrowRight, Sun, Moon } from 'lucide-angular';

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
  
  readonly RotateCcw = RotateCcw;
  readonly FlaskConical = FlaskConical;
  readonly ChevronDown = ChevronDown;
  readonly ChefHat = ChefHat;
  readonly ArrowRight = ArrowRight;
  readonly Sun = Sun;
  readonly Moon = Moon;

  theme = signal<'light' | 'dark'>(
    document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  );

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable: the choice lasts for this session */
    }
  }

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
