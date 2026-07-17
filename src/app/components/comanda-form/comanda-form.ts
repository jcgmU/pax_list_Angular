import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { buildCourses, deriveMealSlots, seatZone, MealSlot, MenuItem, CrewZone } from '../../../domain/mealService';
import { FLIGHT_CODES } from '../../../domain/flightCodes';
import { ParsedPassenger } from '../../../infrastructure/mockData';
import { LucideAngularModule, Bell, BellOff, ChefHat, UtensilsCrossed, CheckCircle2, UserX, ChevronDown } from 'lucide-angular';

const SERVICE_LABELS: Record<string, { label: string; color: string }> = {
  INSIGNIA: { label: 'Servicio Insignia', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  AMERICAS: { label: 'Business Class Americas', color: 'text-blue-700 bg-blue-50 border-blue-200' },
};

const SLOT_ICONS: Record<string, string> = {
  DESAYUNO: '☀️',
  ALMUERZO: '🍽️',
  CENA: '🌙',
};

@Component({
  selector: 'app-comanda-form',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './comanda-form.html',
})
export class ComandaForm {
  @Input({ required: true }) passenger!: ParsedPassenger;
  store = inject(StoreService);

  readonly Bell = Bell;
  readonly BellOff = BellOff;
  readonly ChefHat = ChefHat;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly CheckCircle2 = CheckCircle2;
  readonly UserX = UserX;
  readonly ChevronDown = ChevronDown;

  manifest = this.store.manifest;
  activeServiceType = this.store.activeServiceType;
  unavailable = this.store.unavailable;
  orders = this.store.orders;

  serviceInfo = computed(() => {
    const sType = this.activeServiceType();
    if (!sType) return null;
    return SERVICE_LABELS[sType];
  });

  slots = computed(() => {
    const sType = this.activeServiceType();
    const man = this.manifest();
    if (!sType || !man) return [];
    return deriveMealSlots(sType, man.departureTime);
  });

  courses = computed(() => {
    const sType = this.activeServiceType();
    if (!sType) return [];
    return buildCourses(sType, this.slots());
  });

  order = computed(() => {
    return this.store.getOrder(this.passenger.seat) ?? {};
  });

  ssrMeals = computed(() => {
    const mealCodes = Object.keys(FLIGHT_CODES.MEALS);
    return this.passenger.codes.filter((c) => mealCodes.includes(c));
  });

  hasSpecialMeal = computed(() => {
    return this.ssrMeals().length > 0;
  });

  isOrderComplete = computed(() => {
    if (this.hasSpecialMeal()) return true;
    const ord = this.order();
    return this.courses().every((course) => {
      const sel = ord[course.slot];
      if (!sel?.platoFuerteId) return false;
      if (course.hasEntrada && !sel?.entradaId) return false;
      return true;
    });
  });

  zone = computed(() => {
    return seatZone(this.passenger.seat);
  });

  isUnavailable = computed(() => {
    const man = this.manifest();
    if (!man) return false;
    const key = `${man.flightNumber}::${this.passenger.seat}`;
    return this.unavailable()[key] === true;
  });

  SLOT_ICONS = SLOT_ICONS;
  FLIGHT_CODES = FLIGHT_CODES;

  getMealDescription(code: string) {
    return (FLIGHT_CODES.MEALS as Record<string, string>)[code];
  }

  getRemainingForItem(slot: MealSlot, kind: 'plato' | 'entrada', itemId: string, stock: number): number {
    const man = this.manifest();
    if (!man) return stock;
    const ords = this.orders();
    const z = this.zone();

    const consumed = Object.entries(ords)
      .filter(([key]) => key.startsWith(`${man.flightNumber}::`))
      .filter(([key]) => {
        const seat = key.replace(`${man.flightNumber}::`, '');
        return seatZone(seat) === z;
      })
      .filter(([_, orderEntry]) =>
        kind === 'plato'
          ? orderEntry[slot]?.platoFuerteId === itemId
          : orderEntry[slot]?.entradaId === itemId
      ).length;
    return Math.max(0, stock - consumed);
  }

  setPaxUnavailable(val: boolean) {
    this.store.setPaxUnavailable(this.passenger.seat, val);
  }

  setCourseSelection(slot: MealSlot, patch: any) {
    this.store.setCourseSelection(this.passenger.seat, slot, patch);
  }

  onSelectChange(slot: MealSlot, event: Event) {
    const target = event.target as HTMLSelectElement;
    this.setCourseSelection(slot, { platoFuerteId: target.value || undefined });
  }

  getCoursePlatosAgostados(course: any) {
    const slot = course.slot as MealSlot;
    const sel = this.order()[slot] ?? {};
    return course.platosFuertes.filter(
      (item: any) => this.getRemainingForItem(slot, 'plato', item.id, item.stock ?? 99) === 0
        && sel.platoFuerteId !== item.id
    );
  }

  getCourseEntradasAgostadas(course: any) {
    if (!course.hasEntrada) return [];
    const slot = course.slot as MealSlot;
    const sel = this.order()[slot] ?? {};
    return course.entradas.filter(
      (item: any) => this.getRemainingForItem(slot, 'entrada', item.id, item.stock ?? 99) === 0
        && sel.entradaId !== item.id
    );
  }
}
