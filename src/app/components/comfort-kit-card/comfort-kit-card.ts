import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { ParsedPassenger } from '../../../infrastructure/mockData';
import {
  KIT_SIZES,
  KitSize,
  isComfortKitRegistered,
} from '../../../domain/comfortKit';
import { LucideAngularModule, Shirt, Footprints, CheckCircle2, History } from 'lucide-angular';

@Component({
  selector: 'app-comfort-kit-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './comfort-kit-card.html',
})
export class ComfortKitCard {
  passenger = input.required<ParsedPassenger>();
  store = inject(StoreService);

  readonly Shirt = Shirt;
  readonly Footprints = Footprints;
  readonly CheckCircle2 = CheckCircle2;
  readonly History = History;

  readonly kitSizes = KIT_SIZES;

  profile = computed(() => this.store.getComfortKitProfile(this.passenger()));
  isRegistered = computed(() => isComfortKitRegistered(this.profile()));

  setPajamaSize(event: Event) {
    const value = (event.target as HTMLSelectElement).value as KitSize | '';
    this.store.setComfortKitSizes(this.passenger(), { pajamaSize: value || undefined });
  }

  setSleeperSize(event: Event) {
    const value = (event.target as HTMLSelectElement).value as KitSize | '';
    this.store.setComfortKitSizes(this.passenger(), { sleeperSize: value || undefined });
  }

  formatUpdatedAt(iso: string | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }
}
