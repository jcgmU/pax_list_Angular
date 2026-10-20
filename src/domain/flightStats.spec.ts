import { describe, it, expect, beforeEach } from 'vitest';
import {
  seatsWithInfant,
  seatsWithAnySsr,
  seatsWithMeal,
  seatsWithCode,
  countSSR,
  countMeals
} from './flightStats';
import { FLIGHT_CODES } from './flightCodes';
import type { ParsedPassenger } from '../infrastructure/mockData';
import { TestBed } from '@angular/core/testing';
import { StoreService } from '../app/store.service';

describe('flightStats - funciones puras de coincidencia por lente (Ronda 3)', () => {
  const samplePax: ParsedPassenger[] = [
    { seat: '1A', firstName: 'CARLOS', lastName: 'RAMIREZ', status: 'MAGN', codes: ['MAGN', 'INF'], rawText: '' },
    { seat: '1C', firstName: 'ANDRES', lastName: 'BOTERO', status: 'GOLD', codes: ['GOLD', 'GFML', 'WCHR'], rawText: '' },
    { seat: '2A', firstName: 'MARIO', lastName: 'LONDONO', codes: ['PETC'], rawText: '' },
    { seat: '2C', firstName: 'ANA', lastName: 'RESTREPO', status: 'DIAM', codes: ['DIAM'], rawText: '' },
    { seat: '3A', firstName: 'JUAN', lastName: 'ARANGO', codes: [], rawText: '' },
  ];

  it('seatsWithInfant retorna solo asientos con código INF', () => {
    const res = seatsWithInfant(samplePax);
    expect(res).toEqual(new Set(['1A']));
  });

  it('seatsWithAnySsr retorna pasajeros con al menos un código SSR operativo (excluyendo estatus y VIP)', () => {
    const res = seatsWithAnySsr(samplePax);
    // 1C tiene GFML y WCHR; 2A tiene PETC; 1A solo tiene MAGN e INF; 2C solo DIAM; 3A ninguno
    expect(res).toEqual(new Set(['1C', '2A']));
  });

  it('seatsWithMeal retorna pasajeros con requerimiento de comida especial', () => {
    const res = seatsWithMeal(samplePax, Object.keys(FLIGHT_CODES.MEALS));
    // 1C tiene GFML
    expect(res).toEqual(new Set(['1C']));
  });

  it('seatsWithCode retorna exactamente los asientos con ese código específico', () => {
    expect(seatsWithCode(samplePax, 'WCHR')).toEqual(new Set(['1C']));
    expect(seatsWithCode(samplePax, 'PETC')).toEqual(new Set(['2A']));
    expect(seatsWithCode(samplePax, 'NO_EXISTE')).toEqual(new Set());
  });
});

describe('StoreService - MapLens management', () => {
  let store: StoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StoreService]
    });
    store = TestBed.inject(StoreService);
  });

  it('toggleMapLens activa un lente, y pulsar el mismo lo apaga (null)', () => {
    expect(store.mapLens()).toBeNull();

    store.toggleMapLens({ kind: 'infants' });
    expect(store.mapLens()).toEqual({ kind: 'infants' });

    store.toggleMapLens({ kind: 'infants' });
    expect(store.mapLens()).toBeNull();
  });

  it('toggleMapLens reemplaza un lente activo por otro diferente', () => {
    store.toggleMapLens({ kind: 'infants' });
    expect(store.mapLens()?.kind).toBe('infants');

    store.toggleMapLens({ kind: 'ssr' });
    expect(store.mapLens()?.kind).toBe('ssr');

    store.toggleMapLens({ kind: 'code', code: 'GFML' });
    expect(store.mapLens()).toEqual({ kind: 'code', code: 'GFML' });

    store.toggleMapLens({ kind: 'code', code: 'WCHR' });
    expect(store.mapLens()).toEqual({ kind: 'code', code: 'WCHR' });
  });

  it('showOccupancy y toggleOccupancy mantienen compatibilidad hacia atrás', () => {
    expect(store.showOccupancy()).toBe(false);

    store.toggleOccupancy();
    expect(store.showOccupancy()).toBe(true);
    expect(store.mapLens()).toEqual({ kind: 'occupancy' });

    store.toggleOccupancy();
    expect(store.showOccupancy()).toBe(false);
    expect(store.mapLens()).toBeNull();
  });

  it('setManifest limpia el lente activo', () => {
    store.toggleMapLens({ kind: 'meals' });
    expect(store.mapLens()).not.toBeNull();

    store.setManifest(null);
    expect(store.mapLens()).toBeNull();
  });
});
