import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem, MealSlot } from '../../../domain/mealService';
import { StoreService } from '../../store.service';

@Component({
  selector: 'app-menu-option-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <label class="text-[11px] font-bold text-fg-3 uppercase tracking-widest block">{{ label() }}</label>
      <div class="space-y-1.5" role="group" [attr.aria-label]="label()">
        @for (item of items(); track item.id) {
          @let remaining = getRemaining(item);
          @let selected = selectedId() === item.id;
          @let isAgotado = remaining === 0 && !selected;

          <button
            type="button"
            (click)="!isAgotado && onSelect(item.id)"
            [disabled]="isAgotado"
            [attr.aria-pressed]="selected"
            [attr.aria-label]="item.name + ' - ' + (isAgotado ? 'Agotado' : remaining + ' restantes')"
            class="w-full text-left p-3 rounded-2xl border transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99] motion-reduce:transition-none flex items-center justify-between gap-3"
            [ngClass]="selected
              ? 'border-emerald-500/25 bg-emerald-500/10 shadow-sm cursor-pointer'
              : isAgotado
                ? 'border-line bg-fg/[0.03] opacity-40 cursor-not-allowed'
                : 'border-line-strong bg-panel hover:border-line-strong hover:shadow-sm cursor-pointer'"
          >
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold truncate" [ngClass]="selected ? 'text-emerald-700 dark:text-emerald-300' : isAgotado ? 'text-fg-3' : 'text-fg'">
                {{ item.name }}
              </p>
              <p class="text-[11px] text-fg-3 truncate mt-0.5 font-medium">{{ item.description }}</p>
            </div>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider border"
                  [ngClass]="selected
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                    : isAgotado
                      ? 'bg-slate-150 border-line-strong text-fg-3'
                      : remaining <= 1
                        ? 'bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300'
                        : remaining <= 2
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'">
              {{ isAgotado ? 'Agotado' : remaining + ' rest.' }}
            </span>
          </button>
        }
      </div>
    </div>
  `
})
export class MenuOptionList {
  label = input.required<string>();
  items = input.required<MenuItem[]>();
  selectedId = input<string | undefined>();
  slot = input.required<MealSlot>();
  kind = input.required<'plato' | 'entrada'>();
  passengerSeat = input<string>();

  itemSelected = output<string>();

  store = inject(StoreService);

  getRemaining(item: MenuItem): number {
    return this.store.getRemainingForItem(
      this.slot(),
      this.kind(),
      item.id,
      item.stock ?? 99,
      this.passengerSeat()
    );
  }

  onSelect(itemId: string) {
    this.itemSelected.emit(itemId);
  }
}
