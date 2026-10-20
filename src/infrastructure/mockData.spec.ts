import { describe, it, expect } from 'vitest';
import { DEMO_FLIGHTS, FLIGHT_AV210, FLIGHT_AV026, FLIGHT_AV120 } from './mockData';
import { AIRCRAFT_CONFIGS, AircraftCabin } from '../domain/aircraftConfigs';
import { getAircraftConfigKey } from '../domain/aircraftMatch';
import { getCabinClass } from '../domain/cabinLookup';

describe('mockData - Validación de asientos y ocupación (T4 & C4)', () => {
  it('todos los vuelos tienen asientos válidos, sin duplicados y sin usar bloqueados', () => {
    for (const flight of DEMO_FLIGHTS) {
      const configKey = getAircraftConfigKey(flight.aircraftType);
      const config = AIRCRAFT_CONFIGS[configKey];
      expect(config).toBeDefined();

      const cabinElements = config.elements.filter((el): el is AircraftCabin => el.type === 'cabin');
      const allValidSeats = new Set<string>();
      const allBlockedSeats = new Set<string>();

      for (const cabin of cabinElements) {
        if (cabin.blockedSeats) {
          for (const b of cabin.blockedSeats) allBlockedSeats.add(b);
        }
        for (const r of cabin.rows) {
          for (const col of cabin.layout) {
            if (col !== 'aisle') {
              allValidSeats.add(`${r}${col}`);
            }
          }
        }
      }

      const seenSeats = new Set<string>();
      for (const p of flight.passengers) {
        expect(allValidSeats.has(p.seat)).toBe(true);
        expect(allBlockedSeats.has(p.seat)).toBe(false);
        expect(seenSeats.has(p.seat)).toBe(false);
        seenSeats.add(p.seat);
      }
    }
  });

  it('ocupación por cabina creíble y homogénea para cada vuelo', () => {
    for (const flight of DEMO_FLIGHTS) {
      const configKey = getAircraftConfigKey(flight.aircraftType);
      const config = AIRCRAFT_CONFIGS[configKey];
      const cabinElements = config.elements.filter((el): el is AircraftCabin => el.type === 'cabin');

      const capacities: Record<'business' | 'plus' | 'economy', number> = {
        business: 0,
        plus: 0,
        economy: 0,
      };

      for (const cabin of cabinElements) {
        const blocked = new Set(cabin.blockedSeats || []);
        let count = 0;
        for (const r of cabin.rows) {
          for (const col of cabin.layout) {
            if (col !== 'aisle' && !blocked.has(`${r}${col}`)) {
              count++;
            }
          }
        }
        capacities[cabin.class] += count;
      }

      const passengerCounts: Record<'business' | 'plus' | 'economy', number> = {
        business: 0,
        plus: 0,
        economy: 0,
      };

      for (const p of flight.passengers) {
        const cls = getCabinClass(flight.aircraftType, p.seat);
        expect(cls).toBeDefined();
        passengerCounts[cls!]++;
      }

      const busRatio = passengerCounts.business / capacities.business;
      const plusRatio = passengerCounts.plus / capacities.plus;
      const ecoRatio = passengerCounts.economy / capacities.economy;
      const totalRatio = flight.passengers.length / (capacities.business + capacities.plus + capacities.economy);

      // Business: 85 - 100%
      expect(busRatio).toBeGreaterThanOrEqual(0.85);
      expect(busRatio).toBeLessThanOrEqual(1.0);

      // Plus: 75 - 90%
      expect(plusRatio).toBeGreaterThanOrEqual(0.75);
      expect(plusRatio).toBeLessThanOrEqual(0.90);

      // Economy: 70 - 85%
      expect(ecoRatio).toBeGreaterThanOrEqual(0.70);
      expect(ecoRatio).toBeLessThanOrEqual(0.85);

      // Total load factor: 78 - 90%
      expect(totalRatio).toBeGreaterThanOrEqual(0.78);
      expect(totalRatio).toBeLessThanOrEqual(0.90);
    }
  });

  it('C4: Plus y Economy cumplen los mínimos por fila, sin dos consecutivas <70%, sin rachas >3 ni 4 vacíos contiguos', () => {
    for (const flight of DEMO_FLIGHTS) {
      const isA320 = flight.aircraftType.includes('A320');
      const rows: Record<number, string[]> = {};

      for (const p of flight.passengers) {
        const r = parseInt(p.seat);
        const col = p.seat.replace(/[0-9]/g, '');
        rows[r] = rows[r] || [];
        rows[r].push(col);
      }

      const plusRows = isA320 ? [4, 5, 6, 7, 8, 9, 10, 11] : [8, 9, 10, 11];
      const ecoRows = isA320
        ? [12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
        : [12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41];

      function verifyCabins(rowList: number[], isEconomy: boolean) {
        const ratios: number[] = [];
        const occCounts: number[] = [];

        for (let i = 0; i < rowList.length; i++) {
          const r = rowList[i];
          const occ = (rows[r] || []).length;
          const total = isA320 ? 6 : (r === 35 ? 6 : 9);
          const isLastTwo = isEconomy && (i >= rowList.length - 2);
          const minRatio = isLastTwo ? 0.50 : 0.60;
          const ratio = occ / total;

          // Mínimo 60% (o 50% en últimas 2 de economy)
          expect(ratio).toBeGreaterThanOrEqual(minRatio);

          ratios.push(ratio);
          occCounts.push(occ);

          // Verificar que no hay 4 vacíos contiguos en la misma fila
          const physicalLayout = isA320
            ? ['A', 'B', 'C', 'D', 'E', 'K']
            : (r === 35 ? ['A', 'B', 'C', 'G', 'J', 'K'] : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'J', 'K']);

          const occCols = new Set(rows[r] || []);
          let emptyStreak = 0;
          for (const col of physicalLayout) {
            if (!occCols.has(col)) {
              emptyStreak++;
              expect(emptyStreak).toBeLessThan(4);
            } else {
              emptyStreak = 0;
            }
          }
        }

        // Nunca dos filas consecutivas por debajo del 70%
        for (let i = 0; i < ratios.length - 1; i++) {
          const bothUnder70 = ratios[i] < 0.70 && ratios[i + 1] < 0.70;
          expect(bothUnder70).toBe(false);
        }

        // No más de 3 filas consecutivas con el mismo número de ocupados
        let streak = 1;
        for (let i = 1; i < occCounts.length; i++) {
          if (occCounts[i] === occCounts[i - 1]) {
            streak++;
            expect(streak).toBeLessThanOrEqual(3);
          } else {
            streak = 1;
          }
        }
      }

      verifyCabins(plusRows, false);
      verifyCabins(ecoRows, true);
    }
  });

  it('el infantCount es 100% coherente con los pasajeros con código INF', () => {
    for (const flight of DEMO_FLIGHTS) {
      const infPassengers = flight.passengers.filter(p => p.codes.includes('INF'));
      expect(infPassengers.length).toBe(flight.infantCount);
    }
  });
});
