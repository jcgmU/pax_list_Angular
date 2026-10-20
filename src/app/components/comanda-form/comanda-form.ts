import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../store.service';
import { buildCourses, deriveMealSlots, seatZone, MealSlot, MenuItem } from '../../../domain/mealService';
import { FLIGHT_CODES } from '../../../domain/flightCodes';
import { ParsedPassenger } from '../../../infrastructure/mockData';
import { LucideAngularModule, Bell, ChefHat, CheckCircle2, UserX } from 'lucide-angular';
import { MenuOptionList } from '../menu-option-list/menu-option-list';

const SERVICE_LABELS: Record<string, { label: string; color: string }> = {
  INSIGNIA: { label: 'Servicio Insignia', color: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25' },
  AMERICAS: { label: 'Business Class Americas', color: 'text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/25' },
};

@Component({
  selector: 'app-comanda-form',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MenuOptionList],
  templateUrl: './comanda-form.html',
})
export class ComandaForm {
  passenger = input.required<ParsedPassenger>();
  store = inject(StoreService);

  readonly Bell = Bell;
  readonly ChefHat = ChefHat;
  readonly CheckCircle2 = CheckCircle2;
  readonly UserX = UserX;

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
    return this.store.getOrder(this.passenger().seat) ?? {};
  });

  ssrMeals = computed(() => {
    const mealCodes = Object.keys(FLIGHT_CODES.MEALS);
    return this.passenger().codes.filter((c) => mealCodes.includes(c));
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
    return seatZone(this.passenger().seat);
  });

  isUnavailable = computed(() => {
    const man = this.manifest();
    if (!man) return false;
    const key = `${man.flightNumber}::${this.passenger().seat}`;
    return this.unavailable()[key] === true;
  });

  FLIGHT_CODES = FLIGHT_CODES;

  getMealDescription(code: string) {
    return (FLIGHT_CODES.MEALS as Record<string, string>)[code];
  }

  getRemainingForItem(slot: MealSlot, kind: 'plato' | 'entrada', itemId: string, stock: number): number {
    return this.store.getRemainingForItem(slot, kind, itemId, stock, this.passenger().seat);
  }

  setPaxUnavailable(val: boolean) {
    this.store.setPaxUnavailable(this.passenger().seat, val);
  }

  setCourseSelection(slot: MealSlot, patch: any) {
    this.store.setCourseSelection(this.passenger().seat, slot, patch);
  }

  getCoursePlatosAgostados(course: any) {
    const slot = course.slot as MealSlot;
    const sel = this.order()[slot] ?? {};
    return course.platosFuertes.filter(
      (item: MenuItem) => this.getRemainingForItem(slot, 'plato', item.id, item.stock ?? 99) === 0
        && sel.platoFuerteId !== item.id
    );
  }

  getCourseEntradasAgostadas(course: any) {
    if (!course.hasEntrada) return [];
    const slot = course.slot as MealSlot;
    const sel = this.order()[slot] ?? {};
    return course.entradas.filter(
      (item: MenuItem) => this.getRemainingForItem(slot, 'entrada', item.id, item.stock ?? 99) === 0
        && sel.entradaId !== item.id
    );
  }
}
