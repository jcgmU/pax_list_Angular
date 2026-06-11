export function getAircraftConfigKey(aircraftType: string): string {
  const t = aircraftType.toUpperCase().replace(/[\s-]/g, '');

  if (t.includes('787') || t.includes('B788') || t.includes('B787')) {
    if (t.includes('EXNAS')) return 'B788_EXNAS';
    return 'B788_STD';
  }
  if (t.includes('A320')) return 'A320_STD';
  if (t.includes('A319')) {
    if (t.includes('N741')) return 'A319_N741AV';
    return 'A319_STD';
  }

  return 'A320_STD';
}
