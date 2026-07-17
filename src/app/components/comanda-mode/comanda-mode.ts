import { Component, EventEmitter, Output, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, CheckCircle2, Utensils, ChevronRight, AlertTriangle } from 'lucide-angular';
import { StoreService } from '../../store.service';
import { AIRCRAFT_CONFIGS, AircraftCabin } from '../../../domain/aircraftConfigs';
import { getAircraftConfigKey } from '../../../domain/aircraftMatch';
import { FLIGHT_CODES } from '../../../domain/flightCodes';
import { deriveMealSlots, seatZone, buildCourses, CrewZone } from '../../../domain/mealService';

const MEAL_CODES = new Set(Object.keys(FLIGHT_CODES.MEALS));

// --- Zone Selection Component ---
@Component({
  selector: 'app-zone-selection',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative border border-slate-100 animate-modal-entry">
        <button
          (click)="onClose.emit()"
          class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <lucide-angular [img]="X" size="18"></lucide-angular>
        </button>

        <div class="mb-8">
          <h2 class="text-lg font-black text-slate-900 mb-1">¿Qué pasillo atiendes?</h2>
          <p class="text-xs text-slate-500 font-medium">Seleccione su zona de servicio para la cabina Business</p>
        </div>

        <div class="flex flex-col gap-3">
          <button
            (click)="onSelect.emit('A-D')"
            class="flex items-center justify-between w-full px-6 py-4 bg-gradient-to-r from-[#E20613] to-red-500 text-white rounded-2xl font-bold text-base hover:from-red-700 hover:to-red-600 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-md shadow-red-500/10 cursor-pointer"
          >
            <span>Pasillo A – D</span>
            <lucide-angular [img]="ChevronRight" size="16"></lucide-angular>
          </button>
          <button
            (click)="onSelect.emit('E-K')"
            class="flex items-center justify-between w-full px-6 py-4 border border-[#E20613] text-[#E20613] rounded-2xl font-bold text-base hover:bg-red-50/50 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span>Pasillo E – K</span>
            <lucide-angular [img]="ChevronRight" size="16"></lucide-angular>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ZoneSelectionComponent {
  @Output() onSelect = new EventEmitter<CrewZone>();
  @Output() onClose = new EventEmitter<void>();

  readonly X = X;
  readonly ChevronRight = ChevronRight;
}

// --- Seat Cell Component ---
@Component({
  selector: 'app-seat-cell',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div *ngIf="!passenger()" class="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 opacity-40 min-h-[68px] flex items-center justify-center">
      <span class="text-slate-450 text-xs font-black">—</span>
    </div>

    <button *ngIf="passenger()"
      (click)="store.setSelectedSeat(seatId)"
      [ngClass]="borderClass()"
      class="bg-white border rounded-2xl p-2.5 cursor-pointer transition-all text-left w-full min-h-[68px] flex flex-col justify-between hover:shadow-md shadow-sm relative group hover:-translate-y-0.5"
    >
      <div class="flex items-start justify-between gap-1 w-full">
        <span class="text-[10px] font-black text-slate-400 group-hover:text-slate-500">{{ seatId }}</span>
        <div class="flex items-center gap-1">
          <lucide-angular *ngIf="mealSSRCodes().length > 0" [img]="Utensils" size="11" class="text-amber-500 flex-shrink-0"></lucide-angular>
          <lucide-angular *ngIf="isComplete()" [img]="CheckCircle2" size="12" class="text-emerald-500 flex-shrink-0"></lucide-angular>
          <span *ngIf="isPartial() && !isComplete()" class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 inline-block"></span>
        </div>
      </div>
      
      <div class="mt-1 flex-1 min-w-0">
        <p class="text-[11px] font-bold text-slate-800 leading-none truncate group-hover:text-slate-900">{{ shortName() }}</p>
        
        <p *ngIf="selectedMealName()" class="text-[9px] text-[#E20613] font-black mt-1 truncate leading-none">{{ selectedMealName() }}</p>
        
        <div *ngIf="!selectedMealName() && mealSSRCodes().length > 0" class="flex flex-wrap gap-0.5 mt-1">
          <span *ngFor="let code of mealSSRCodes()" class="text-[8px] font-black bg-amber-50 border border-amber-100/60 text-amber-700 px-1 py-0.5 rounded-md leading-none">
            {{ code }}
          </span>
        </div>
      </div>
    </button>
  `
})
export class SeatCellComponent {
  @Input({ required: true }) seatId!: string;

  readonly Utensils = Utensils;
  readonly CheckCircle2 = CheckCircle2;

  constructor(public store: StoreService) {}

  passenger = computed(() => {
    return this.store.manifest()?.passengers.find((p) => p.seat === this.seatId);
  });

  orderKey = computed(() => {
    return `${this.store.manifest()?.flightNumber}::${this.seatId}`;
  });

  order = computed(() => {
    return this.store.orders()[this.orderKey()];
  });

  isUnavailable = computed(() => {
    return this.store.unavailable()[this.orderKey()] === true;
  });

  slots = computed(() => {
    const srvType = this.store.activeServiceType();
    const manifest = this.store.manifest();
    if (srvType && manifest) {
      return deriveMealSlots(srvType, manifest.departureTime);
    }
    return [];
  });

  courses = computed(() => {
    const srvType = this.store.activeServiceType();
    return srvType ? buildCourses(srvType, this.slots()) : [];
  });

  mealSSRCodes = computed(() => {
    return this.passenger()?.codes.filter((c) => MEAL_CODES.has(c)) ?? [];
  });

  hasMealSSR = computed(() => this.mealSSRCodes().length > 0);

  isComplete = computed(() => {
    const ord = this.order();
    const sl = this.slots();
    return this.isUnavailable() || this.hasMealSSR() || (
      ord !== undefined && sl.length > 0 && sl.every((slot) => ord[slot]?.platoFuerteId)
    );
  });

  isPartial = computed(() => {
    const ord = this.order();
    const sl = this.slots();
    return !this.isComplete() && ord !== undefined && sl.some((slot) => ord[slot]?.platoFuerteId);
  });

  selectedMealName = computed(() => {
    const ord = this.order();
    const crs = this.courses();
    if (ord && crs.length > 0) {
      for (const course of crs) {
        const platoId = ord[course.slot]?.platoFuerteId;
        if (platoId) {
          const plato = course.platosFuertes.find((p) => p.id === platoId);
          if (plato) {
            return plato.name.length > 18 ? `${plato.name.slice(0, 18)}…` : plato.name;
          }
        }
      }
    }
    return null;
  });

  shortName = computed(() => {
    const p = this.passenger();
    if (!p) return null;
    return `${p.lastName.slice(0, 10)}, ${p.firstName.charAt(0)}`;
  });

  borderClass = computed(() => {
    if (this.isComplete()) return 'border-emerald-200 bg-emerald-50/20';
    if (this.isPartial()) return 'border-amber-250 bg-amber-50/15';
    return 'border-slate-200/80';
  });
}

// --- Seat Map Component ---
@Component({
  selector: 'app-seat-map-comanda',
  standalone: true,
  imports: [CommonModule, SeatCellComponent, LucideAngularModule],
  template: `
    <ng-container *ngIf="manifest()">
      <div class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div class="bg-white rounded-[32px] shadow-2xl w-full max-w-lg my-4 border border-slate-100 overflow-hidden animate-modal-entry">
          
          <!-- Header with gradient -->
          <div class="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#E20613] to-[#ff4d5a] text-white shadow-md">
            <div>
              <h2 class="text-sm font-black uppercase tracking-wider">{{ zoneLabel() }}</h2>
              <p class="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-0.5">
                {{ attended() }} / {{ businessPassengers().length }} atendidos
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                *ngIf="store.activeServiceType() === 'INSIGNIA'"
                (click)="showWarning = true"
                class="text-[10px] font-black uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Cambiar pasillo
              </button>
              <button
                (click)="store.closeComanda()"
                class="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <lucide-angular [img]="X" size="18"></lucide-angular>
              </button>
            </div>
          </div>

          <!-- Grid -->
          <div *ngIf="businessCabin()" class="px-6 py-5 space-y-3 bg-[#f8fafc]">
            <!-- Column headers -->
            <div class="flex items-center gap-2 mb-1">
              <div class="w-8 flex-shrink-0"></div>
              <div *ngFor="let letter of filteredLetters()" class="flex-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {{ letter }}
              </div>
            </div>

            <!-- Rows -->
            <div *ngFor="let row of businessCabin()?.rows" class="flex items-center gap-2">
              <div class="w-8 flex-shrink-0 text-xs font-black text-slate-400 text-right pr-1">
                {{ row }}
              </div>
              <div *ngFor="let letter of filteredLetters()" class="flex-1 min-w-0">
                <app-seat-cell [seatId]="row + letter"></app-seat-cell>
              </div>
            </div>
          </div>

          <div class="p-3 bg-slate-50 text-center border-t border-slate-100">
            <p class="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">
              Modo Comanda Business Class
            </p>
          </div>
        </div>
      </div>

      <!-- Diálogo de advertencia al cambiar de pasillo -->
      <div *ngIf="showWarning" class="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-100 animate-modal-entry">
          <div class="flex items-start gap-3">
            <div class="p-2 bg-amber-50 rounded-xl shrink-0 border border-amber-100/50">
              <lucide-angular [img]="AlertTriangle" size="16" class="text-amber-600"></lucide-angular>
            </div>
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-900">¿Cambiar de pasillo?</h3>
              <p class="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                Las comandas registradas para el pasillo <span class="font-black text-slate-800">{{ store.crewZone() }}</span> se eliminarán de este dispositivo.
                Asegúrese de que el otro tripulante tenga esta información antes de continuar.
              </p>
            </div>
          </div>
          <div class="flex gap-2 pt-1.5">
            <button
              (click)="showWarning = false"
              class="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
            >
              Cancelar
            </button>
            <button
              (click)="confirmChangeZone()"
              class="flex-1 px-4 py-2.5 bg-[#E20613] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 shadow-md shadow-red-500/10 transition-all cursor-pointer active:scale-95"
            >
              Cambiar
            </button>
          </div>
        </div>
      </div>
    </ng-container>
  `
})
export class SeatMapComponent {
  showWarning = false;

  readonly X = X;
  readonly AlertTriangle = AlertTriangle;

  constructor(public store: StoreService) {}

  manifest = computed(() => this.store.manifest());

  businessCabin = computed(() => {
    const man = this.manifest();
    if (!man) return null;
    const configKey = getAircraftConfigKey(man.aircraftType);
    const config = AIRCRAFT_CONFIGS[configKey];
    return config?.elements.find(
      (el): el is AircraftCabin => el.type === 'cabin' && el.class === 'business'
    ) ?? null;
  });

  filteredLetters = computed(() => {
    const cabin = this.businessCabin();
    if (!cabin) return [];
    const allLetters = cabin.layout.filter((l) => l !== 'aisle');
    const srvType = this.store.activeServiceType();
    const zone = this.store.crewZone();
    if (srvType === 'INSIGNIA' && zone) {
      return allLetters.filter((l) => seatZone(l) === zone);
    }
    return allLetters;
  });

  businessPassengers = computed(() => {
    const cabin = this.businessCabin();
    const letters = this.filteredLetters();
    const man = this.manifest();
    if (!cabin || !man) return [];
    
    const allSeats = cabin.rows.flatMap((row) =>
      letters.map((letter) => `${row}${letter}`)
    );
    return allSeats.filter((seatId) =>
      man.passengers.some((p) => p.seat === seatId)
    );
  });

  attended = computed(() => {
    const pax = this.businessPassengers();
    const man = this.manifest();
    if (!man) return 0;
    const unav = this.store.unavailable();
    const ords = this.store.orders();
    const srvType = this.store.activeServiceType();
    const slots = srvType ? deriveMealSlots(srvType, man.departureTime) : [];

    return pax.filter((seatId) => {
      const key = `${man.flightNumber}::${seatId}`;
      if (unav[key]) return true;
      const order = ords[key];
      return order !== undefined && slots.length > 0 && slots.every((slot) => order[slot]?.platoFuerteId);
    }).length;
  });

  zoneLabel = computed(() => {
    const srvType = this.store.activeServiceType();
    const zone = this.store.crewZone();
    return srvType === 'INSIGNIA' && zone ? `Pasillo ${zone}` : 'Cabina Business';
  });

  confirmChangeZone() {
    const zone = this.store.crewZone();
    if (zone) this.store.clearZoneOrders(zone);
    this.store.setCrewZone(null);
    this.showWarning = false;
  }
}

// --- Main Component ---
@Component({
  selector: 'app-comanda-mode',
  standalone: true,
  imports: [CommonModule, ZoneSelectionComponent, SeatMapComponent],
  templateUrl: './comanda-mode.html',
})
export class ComandaMode {
  constructor(public store: StoreService) {}

  needsZoneSelection = computed(() => {
    return this.store.activeServiceType() === 'INSIGNIA' && this.store.crewZone() === null;
  });

  onZoneSelect(zone: CrewZone) {
    this.store.setCrewZone(zone);
  }

  onZoneClose() {
    this.store.closeComanda();
  }
}
