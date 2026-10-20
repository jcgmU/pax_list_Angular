import type { ParsedPassenger } from '../infrastructure/mockData';

export const KIT_SIZES = ['S/M', 'L/XL', 'XXL'] as const;
export type KitSize = (typeof KIT_SIZES)[number];

export interface ComfortKitSizes {
  pajamaSize?: KitSize;
  sleeperSize?: KitSize;
}

export interface ComfortKitProfile extends ComfortKitSizes {
  travelerId: string;
  updatedAt: string; // ISO
}

/**
 * Identifica al pasajero de forma estable entre vuelos para poder recordar su talla.
 * Hoy se deriva del nombre porque el manifiesto mock no trae número de LifeMiles;
 * cuando el CRM de lealtad esté integrado (ver LifeMiles adapter en ARQUITECTURA_V3.md),
 * este ID debe venir del `lifemilesNumber` real del pasajero, no del nombre.
 */
export function deriveTravelerId(passenger: Pick<ParsedPassenger, 'firstName' | 'lastName'>): string {
  return `${passenger.lastName}-${passenger.firstName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-');
}

export function isComfortKitRegistered(sizes: ComfortKitSizes | undefined): boolean {
  return !!sizes?.pajamaSize && !!sizes?.sleeperSize;
}
