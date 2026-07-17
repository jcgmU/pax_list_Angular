import type { ComfortKitProfile, ComfortKitSizes } from '../domain/comfortKit';
import { deriveTravelerId } from '../domain/comfortKit';

// Simula el perfil de lealtad del pasajero persistido en el CRM (LifeMiles).
// En producción esto se sustituye por el `lifemiles.adapter.ts` del BFF —
// el resto de la app no necesita cambiar cuando eso ocurra.
const STORAGE_KEY = 'avianca:comfort-kit-profiles';

// Datos de demo: pasajeros Elite que ya volaron antes y dejaron su talla registrada.
// Igual que mockData.ts, esto es solo para prototipar el flujo — se retira cuando
// el perfil venga del CRM real de LifeMiles.
const DEMO_SEEDS: Array<{
  lastName: string;
  firstName: string;
  hoodieSize: NonNullable<ComfortKitSizes['hoodieSize']>;
  pantsSize: NonNullable<ComfortKitSizes['pantsSize']>;
  slipperSize: NonNullable<ComfortKitSizes['slipperSize']>;
  daysAgo: number;
}> = [
  { lastName: 'RAMIREZ', firstName: 'CARLOS', hoodieSize: 'L', pantsSize: 'L', slipperSize: 'M', daysAgo: 14 },
  { lastName: 'OSPINA', firstName: 'LUCIA', hoodieSize: 'S', pantsSize: 'S', slipperSize: 'S', daysAgo: 30 },
  { lastName: 'ECHEVERRI', firstName: 'RAFAEL', hoodieSize: 'XL', pantsSize: 'XL', slipperSize: 'L', daysAgo: 7 },
  { lastName: 'PALACIO', firstName: 'HELENA', hoodieSize: 'M', pantsSize: 'M', slipperSize: 'M', daysAgo: 21 },
  { lastName: 'LLINÁS', firstName: 'GUSTAVO', hoodieSize: 'XL', pantsSize: 'XL', slipperSize: 'L', daysAgo: 3 },
  { lastName: 'BARRIOS', firstName: 'MARINA', hoodieSize: 'S', pantsSize: 'S', slipperSize: 'S', daysAgo: 45 },
];

function readAll(): Record<string, ComfortKitProfile> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ComfortKitProfile>) : {};
  } catch {
    return {};
  }
}

function writeAll(profiles: Record<string, ComfortKitProfile>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
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
      hoodieSize: seed.hoodieSize,
      pantsSize: seed.pantsSize,
      slipperSize: seed.slipperSize,
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
