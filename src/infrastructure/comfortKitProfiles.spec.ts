import { describe, it, expect, beforeEach } from 'vitest';
import { KIT_SIZES, isComfortKitRegistered } from '../domain/comfortKit';
import { loadComfortKitProfiles, saveComfortKitProfile } from './comfortKitProfiles';

class MockStorage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] ?? null; }
  key(index: number) { return Object.keys(this.store)[index] ?? null; }
  removeItem(key: string) { delete this.store[key]; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
}

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
  (globalThis as any).localStorage = new MockStorage();
}

describe('comfortKitProfiles - storage & migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('define exactamente las tres tallas unificadas: S/M, L/XL, XXL', () => {
    expect(KIT_SIZES).toEqual(['S/M', 'L/XL', 'XXL']);
  });

  it('isComfortKitRegistered exige que tanto pajamaSize como sleeperSize estén definidos', () => {
    expect(isComfortKitRegistered(undefined)).toBe(false);
    expect(isComfortKitRegistered({ pajamaSize: 'S/M' })).toBe(false);
    expect(isComfortKitRegistered({ sleeperSize: 'L/XL' })).toBe(false);
    expect(isComfortKitRegistered({ pajamaSize: 'S/M', sleeperSize: 'L/XL' })).toBe(true);
  });

  it('migra datos legacy de localStorage v1 sin errores', () => {
    const legacyData = {
      'perez-juan': {
        travelerId: 'perez-juan',
        hoodieSize: 'M',
        pantsSize: 'M',
        slipperSize: 'S',
        updatedAt: '2026-05-01T12:00:00.000Z',
      },
      'gomez-maria': {
        travelerId: 'gomez-maria',
        hoodieSize: 'XL',
        pantsSize: 'L',
        slipperSize: 'L',
        updatedAt: '2026-05-02T12:00:00.000Z',
      },
      'torres-ana': {
        travelerId: 'torres-ana',
        hoodieSize: 'XXL',
        pantsSize: 'XXL',
        slipperSize: 'XXL',
      }
    };

    localStorage.setItem('avianca:comfort-kit-profiles', JSON.stringify(legacyData));

    const loaded = loadComfortKitProfiles();

    expect(loaded['perez-juan']?.pajamaSize).toBe('S/M');
    expect(loaded['perez-juan']?.sleeperSize).toBe('S/M');

    expect(loaded['gomez-maria']?.pajamaSize).toBe('L/XL');
    expect(loaded['gomez-maria']?.sleeperSize).toBe('L/XL');

    expect(loaded['torres-ana']?.pajamaSize).toBe('XXL');
  });

  it('guarda y actualiza tallas usando el nuevo esquema', () => {
    const saved = saveComfortKitProfile('test-pax', { pajamaSize: 'L/XL', sleeperSize: 'S/M' });
    expect(saved.pajamaSize).toBe('L/XL');
    expect(saved.sleeperSize).toBe('S/M');
    expect(saved.updatedAt).toBeTruthy();

    const loaded = loadComfortKitProfiles();
    expect(loaded['test-pax']?.pajamaSize).toBe('L/XL');
  });
});
