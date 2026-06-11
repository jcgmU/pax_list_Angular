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

export function countSSR(passengers: ParsedPassenger[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const statusCodes = new Set(['DIAM', 'D', 'GOLD', 'G', 'SILV', 'SILVER', 'PLUS', 'BDAY', 'CLIENTE TOP', 'STAFF', 'INF', 'CHD']);

  for (const p of passengers) {
    for (const code of p.codes) {
      if (statusCodes.has(code)) continue;
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
