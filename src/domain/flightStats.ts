import type { AircraftConfig } from './aircraftConfigs';
import type { FlightManifest, ParsedPassenger } from '../infrastructure/mockData';

export function countEmptySeats(manifest: FlightManifest, config: AircraftConfig): number {
  const occupiedSeats = new Set(manifest.passengers.map(p => p.seat));
  let total = 0;

  for (const element of config.elements) {
    if (element.type !== 'cabin') continue;
    for (const row of element.rows) {
      for (const col of element.layout) {
        if (col === 'aisle') continue;
        const seatId = `${row}${col}`;
        const isBlocked = element.blockedSeats?.includes(seatId);
        if (!isBlocked && !occupiedSeats.has(seatId)) {
          total++;
        }
      }
    }
  }

  return total;
}

export const SSR_EXCLUDED_CODES = new Set([
  'MAGN', 'M', 'DIAM', 'D', 'GOLD', 'G', 'SILV', 'SILVER', 'PLUS',
  'BDAY', 'CLIENTE TOP', 'STAFF', 'INF', 'CHD'
]);

export function countSSR(passengers: ParsedPassenger[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const p of passengers) {
    for (const code of p.codes) {
      if (SSR_EXCLUDED_CODES.has(code)) continue;
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }

  return counts;
}

export function countMeals(passengers: ParsedPassenger[], mealCodes: string[]): number {
  const mealSet = new Set(mealCodes);
  let total = 0;
  for (const p of passengers) {
    for (const code of p.codes) {
      if (mealSet.has(code)) total++;
    }
  }
  return total;
}

/**
 * Retorna el conjunto de asientos de pasajeros con infante asociado (código INF).
 */
export function seatsWithInfant(passengers: ParsedPassenger[]): Set<string> {
  const seats = new Set<string>();
  for (const p of passengers) {
    if (p.codes.includes('INF')) {
      seats.add(p.seat);
    }
  }
  return seats;
}

/**
 * Retorna el conjunto de asientos de pasajeros con al menos un servicio especial SSR
 * (códigos operativos que no corresponden a estatus VIP ni infantes).
 */
export function seatsWithAnySsr(
  passengers: ParsedPassenger[],
  excludedCodes: Set<string> = SSR_EXCLUDED_CODES
): Set<string> {
  const seats = new Set<string>();
  for (const p of passengers) {
    if (p.codes.some(c => !excludedCodes.has(c))) {
      seats.add(p.seat);
    }
  }
  return seats;
}

/**
 * Retorna el conjunto de asientos de pasajeros con requerimiento de comida especial.
 */
export function seatsWithMeal(passengers: ParsedPassenger[], mealCodes: string[]): Set<string> {
  const mealSet = new Set(mealCodes);
  const seats = new Set<string>();
  for (const p of passengers) {
    if (p.codes.some(c => mealSet.has(c))) {
      seats.add(p.seat);
    }
  }
  return seats;
}

/**
 * Retorna el conjunto de asientos de pasajeros que portan un código específico.
 */
export function seatsWithCode(passengers: ParsedPassenger[], code: string): Set<string> {
  const seats = new Set<string>();
  for (const p of passengers) {
    if (p.codes.includes(code)) {
      seats.add(p.seat);
    }
  }
  return seats;
}
