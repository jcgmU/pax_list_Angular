import { AIRCRAFT_CONFIGS } from './aircraftConfigs';
import { getAircraftConfigKey } from './aircraftMatch';

export function getCabinClass(
  aircraftType: string,
  seat: string
): 'business' | 'plus' | 'economy' | null {
  const key = getAircraftConfigKey(aircraftType);
  const config = AIRCRAFT_CONFIGS[key];
  if (!config) return null;

  for (const element of config.elements) {
    if (element.type !== 'cabin') continue;
    const rowMatch = seat.match(/^(\d+)/);
    if (!rowMatch) continue;
    const row = parseInt(rowMatch[1]);
    if (element.rows.includes(row)) return element.class;
  }
  return null;
}
