import { describe, it, expect } from 'vitest';
import {
  calculateRemaining,
  resolveStockPool,
  deriveMealSlots,
  buildCourses,
  seatZone
} from './mealService';

describe('mealService - domain & remaining stock', () => {
  it('(a) seleccionar plato X para pax 1 -> pax 2 ve X con stock - 1', () => {
    const orders = {
      'AV210::8A': {
        DESAYUNO: { platoFuerteId: 'A-DES-2' } // Pancakes de arándanos (stock inicial 7)
      }
    };

    const remainingForPax2 = calculateRemaining({
      flightNumber: 'AV210',
      slot: 'DESAYUNO',
      kind: 'plato',
      itemId: 'A-DES-2',
      stock: 7,
      pool: 'all',
      orders
    });

    expect(remainingForPax2).toBe(6);
  });

  it('(b) cambiar de pax A-D a E-K en JFK no cambia los restantes (misma bolsa all)', () => {
    const orders = {
      'AV210::8A': { DESAYUNO: { platoFuerteId: 'A-DES-2' } }
    };

    const poolAD = resolveStockPool('AMERICAS', null, '8A');
    const poolEK = resolveStockPool('AMERICAS', null, '8K');

    expect(poolAD).toBe('all');
    expect(poolEK).toBe('all');

    const remAD = calculateRemaining({
      flightNumber: 'AV210',
      slot: 'DESAYUNO',
      kind: 'plato',
      itemId: 'A-DES-2',
      stock: 7,
      pool: poolAD,
      orders
    });

    const remEK = calculateRemaining({
      flightNumber: 'AV210',
      slot: 'DESAYUNO',
      kind: 'plato',
      itemId: 'A-DES-2',
      stock: 7,
      pool: poolEK,
      orders
    });

    expect(remAD).toBe(remEK);
    expect(remEK).toBe(6);
  });

  it('(c) en INSIGNIA con pasillo activo, la bolsa es ese pasillo', () => {
    const poolActiveCrew = resolveStockPool('INSIGNIA', 'A-D', '1K');
    expect(poolActiveCrew).toBe('A-D');

    const orders = {
      'AV026::1A': { ALMUERZO: { platoFuerteId: 'P-ALM-1' } }, // A-D consume
      'AV026::1K': { ALMUERZO: { platoFuerteId: 'P-ALM-1' } }, // E-K consume
    };

    const remAD = calculateRemaining({
      flightNumber: 'AV026',
      slot: 'ALMUERZO',
      kind: 'plato',
      itemId: 'P-ALM-1',
      stock: 4,
      pool: 'A-D',
      orders
    });

    // Solo debe descontar el consumo de 1A, no el de 1K
    expect(remAD).toBe(3);
  });

  it('(d) pax unavailable no consume comida', () => {
    const orders = {
      'AV210::1A': { DESAYUNO: { platoFuerteId: 'A-DES-1' } }
    };
    const unavailable = {
      'AV210::1A': true
    };

    const remaining = calculateRemaining({
      flightNumber: 'AV210',
      slot: 'DESAYUNO',
      kind: 'plato',
      itemId: 'A-DES-1',
      stock: 8,
      pool: 'all',
      orders,
      unavailable
    });

    // Como 1A está marcado como unavailable, no descuenta stock
    expect(remaining).toBe(8);
  });

  it('(e) el menú siempre es el mismo e idéntico para todos los pasajeros del vuelo', () => {
    const slots = deriveMealSlots('AMERICAS', '07:20');
    const courses = buildCourses('AMERICAS', slots);

    expect(courses.length).toBe(1);
    expect(courses[0].platosFuertes.map(p => p.id)).toEqual(['A-DES-1', 'A-DES-2', 'A-DES-3']);
  });
});
