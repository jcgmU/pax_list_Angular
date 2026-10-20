import type { ComfortKitProfile, ComfortKitSizes, KitSize } from '../domain/comfortKit';
import { deriveTravelerId, KIT_SIZES } from '../domain/comfortKit';

// Simula el perfil de lealtad del pasajero persistido en el CRM (LifeMiles).
// Clave con versión para asegurar migración limpia de esquemas antiguos.
const STORAGE_KEY_V2 = 'avianca:comfort-kit-profiles:v2';
const STORAGE_KEY_LEGACY = 'avianca:comfort-kit-profiles';

// Datos de demo: pasajeros Elite que ya volaron antes y dejaron su talla registrada.
const DEMO_SEEDS: Array<{
  lastName: string;
  firstName: string;
  pajamaSize: NonNullable<ComfortKitSizes['pajamaSize']>;
  sleeperSize: NonNullable<ComfortKitSizes['sleeperSize']>;
  daysAgo: number;
}> = [
  { lastName: 'RAMIREZ', firstName: 'CARLOS', pajamaSize: 'L/XL', sleeperSize: 'S/M', daysAgo: 14 },
  { lastName: 'OSPINA', firstName: 'LUCIA', pajamaSize: 'S/M', sleeperSize: 'S/M', daysAgo: 30 },
  { lastName: 'ECHEVERRI', firstName: 'RAFAEL', pajamaSize: 'L/XL', sleeperSize: 'L/XL', daysAgo: 7 },
  { lastName: 'PALACIO', firstName: 'HELENA', pajamaSize: 'S/M', sleeperSize: 'S/M', daysAgo: 21 },
  { lastName: 'LLINÁS', firstName: 'GUSTAVO', pajamaSize: 'L/XL', sleeperSize: 'L/XL', daysAgo: 3 },
  { lastName: 'BARRIOS', firstName: 'MARINA', pajamaSize: 'S/M', sleeperSize: 'S/M', daysAgo: 45 },
];

function normalizePajamaSize(legacySize: unknown): KitSize | undefined {
  if (typeof legacySize !== 'string') return undefined;
  if ((KIT_SIZES as readonly string[]).includes(legacySize)) return legacySize as KitSize;
  const upper = legacySize.toUpperCase();
  if (['XS', 'S', 'M'].includes(upper)) return 'S/M';
  if (['L', 'XL'].includes(upper)) return 'L/XL';
  if (upper === 'XXL') return 'XXL';
  return undefined;
}

function normalizeSleeperSize(legacySize: unknown): KitSize | undefined {
  if (typeof legacySize !== 'string') return undefined;
  if ((KIT_SIZES as readonly string[]).includes(legacySize)) return legacySize as KitSize;
  const upper = legacySize.toUpperCase();
  if (['S', 'M'].includes(upper)) return 'S/M';
  if (['L', 'XL'].includes(upper)) return 'L/XL';
  if (upper === 'XXL') return 'XXL';
  return undefined;
}

function migrateLegacyRecord(raw: unknown): Record<string, ComfortKitProfile> {
  if (!raw || typeof raw !== 'object') return {};
  const migrated: Record<string, ComfortKitProfile> = {};

  for (const [key, value] of Object.entries(raw as Record<string, any>)) {
    if (!value || typeof value !== 'object') continue;
    const pajamaSize = normalizePajamaSize(value.pajamaSize ?? value.hoodieSize ?? value.pantsSize);
    const sleeperSize = normalizeSleeperSize(value.sleeperSize ?? value.slipperSize);

    // Solo conservar perfiles donde al menos una talla pueda determinarse de forma segura
    if (pajamaSize || sleeperSize) {
      migrated[key] = {
        travelerId: typeof value.travelerId === 'string' && value.travelerId ? value.travelerId : key,
        pajamaSize,
        sleeperSize,
        updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
      };
    }
  }

  return migrated;
}

function readAll(): Record<string, ComfortKitProfile> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      return JSON.parse(rawV2) as Record<string, ComfortKitProfile>;
    }

    // Si no existe v2, revisar si hay datos del esquema anterior para migrarlos
    const rawLegacy = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (rawLegacy) {
      const parsedLegacy = JSON.parse(rawLegacy);
      const migrated = migrateLegacyRecord(parsedLegacy);
      if (Object.keys(migrated).length > 0) {
        writeAll(migrated);
        return migrated;
      }
    }
    return {};
  } catch {
    return {};
  }
}

function writeAll(profiles: Record<string, ComfortKitProfile>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(profiles));
  } catch {
    // Si la cuota de almacenamiento está llena o falla, evitamos romper la app
  }
}

export function loadComfortKitProfiles(): Record<string, ComfortKitProfile> {
  const existing = readAll();
  if (Object.keys(existing).length > 0) return existing;

  // Primera carga: sembrar demo para mostrar el estado "ya registrado".
  const seeded: Record<string, ComfortKitProfile> = {};
  for (const seed of DEMO_SEEDS) {
    const travelerId = deriveTravelerId(seed);
    seeded[travelerId] = {
      travelerId,
      pajamaSize: seed.pajamaSize,
      sleeperSize: seed.sleeperSize,
      updatedAt: new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  writeAll(seeded);
  return seeded;
}

export function saveComfortKitProfile(travelerId: string, sizes: ComfortKitSizes): ComfortKitProfile {
  const profiles = readAll();
  const profile: ComfortKitProfile = {
    ...profiles[travelerId],
    ...sizes,
    travelerId,
    updatedAt: new Date().toISOString(),
  };
  profiles[travelerId] = profile;
  writeAll(profiles);
  return profile;
}
