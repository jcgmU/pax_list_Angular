export interface FacilityComponent {
  icon: string;
  label: string;
}

export interface AircraftFacility {
  type: 'facility';
  doors: string;
  components: FacilityComponent[];
}

export interface AircraftCabin {
  type: 'cabin';
  class: 'business' | 'plus' | 'economy';
  layout: string[];
  rows: number[];
  blockedSeats?: string[];
}

export type AircraftElement = AircraftFacility | AircraftCabin;

export interface AircraftConfig {
  id: string;
  elements: AircraftElement[];
}

export const AIRCRAFT_CONFIGS: Record<string, AircraftConfig> = {
  // --- FLOTA WIDEBODY (B787) ---
  'B788_STD': {
    id: 'B787-8-STD',
    elements: [
      { type: 'facility', doors: 'L1 / R1', components: [{ icon: 'coffee', label: 'Fwd Galley' }, { icon: 'bath', label: 'Lavatory' }] },
      { type: 'cabin', class: 'business', layout: ['A', 'aisle', 'D', 'E', 'aisle', 'K'], rows: [1, 2, 3, 4, 5] },
      { type: 'facility', doors: 'L2 / R2', components: [{ icon: 'bath', label: 'Lav (L)' }, { icon: 'coffee', label: 'Mid Galley' }, { icon: 'bath', label: 'Lav (R)' }] },
      { type: 'cabin', class: 'plus', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'F', 'aisle', 'G', 'J', 'K'], rows: [8, 9, 10, 11] },
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'F', 'aisle', 'G', 'J', 'K'], rows: [12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
      { type: 'facility', doors: 'L3 / R3', components: [{ icon: 'bath', label: 'Lav (L)' }, { icon: 'bath', label: 'Lav (R)' }] },
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'F', 'aisle', 'G', 'J', 'K'], rows: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41], blockedSeats: ['35D', '35E', '35F'] },
      { type: 'facility', doors: 'L4 / R4', components: [{ icon: 'bath', label: 'Aft Lav' }, { icon: 'coffee', label: 'Aft Galley' }, { icon: 'bath', label: 'Aft Lav' }] }
    ]
  },
  'B788_EXNAS': {
    id: 'B787-8-EXNAS',
    elements: [
      { type: 'facility', doors: 'L1 / R1', components: [{ icon: 'coffee', label: 'Fwd Galley' }, { icon: 'bath', label: 'Lavatory' }] },
      { type: 'cabin', class: 'business', layout: ['A', 'C', 'aisle', 'D', 'E', 'F', 'aisle', 'H', 'K'], rows: [1, 2, 3, 4, 5] },
      { type: 'facility', doors: 'L2 / R2', components: [{ icon: 'bath', label: 'Lavatory' }, { icon: 'coffee', label: 'Mid Galley' }] },
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'F', 'aisle', 'G', 'J', 'K'], rows: [6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
      { type: 'facility', doors: 'L3 / R3', components: [{ icon: 'bath', label: 'Lavatory (L)' }, { icon: 'bath', label: 'Lavatory (R)' }] },
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'F', 'aisle', 'G', 'J', 'K'], rows: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
      { type: 'facility', doors: 'L4 / R4', components: [{ icon: 'bath', label: 'Aft Lav' }, { icon: 'coffee', label: 'Aft Galley' }, { icon: 'box', label: 'OFAR Access' }] }
    ]
  },

  // --- FLOTA NARROWBODY (A320 / A319) ---
  'A320_STD': {
    id: 'A320-STD',
    elements: [
      { type: 'facility', doors: 'L1 / R1', components: [{ icon: 'bath', label: 'Fwd Lav' }, { icon: 'coffee', label: 'Fwd Galley' }] },
      { type: 'cabin', class: 'business', layout: ['A', 'C', 'aisle', 'D', 'K'], rows: [1, 2, 3] },
      { type: 'cabin', class: 'plus', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'K'], rows: [4, 5, 6, 7, 8, 9, 10, 11] },
      { type: 'facility', doors: 'OWE L / OWE R', components: [] }, // Salida de emergencia 1
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'K'], rows: [12] },
      { type: 'facility', doors: 'OWE L / OWE R', components: [] }, // Salida de emergencia 2
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'K'], rows: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32] },
      { type: 'facility', doors: 'L2 / R2', components: [{ icon: 'bath', label: 'Aft Lav (L)' }, { icon: 'coffee', label: 'Aft Galley' }, { icon: 'bath', label: 'Aft Lav (R)' }] }
    ]
  },
  'A319_STD': {
    id: 'A319-STD',
    elements: [
      { type: 'facility', doors: 'L1 / R1', components: [{ icon: 'bath', label: 'Fwd Lav' }, { icon: 'coffee', label: 'Fwd Galley' }] },
      { type: 'cabin', class: 'business', layout: ['A', 'C', 'aisle', 'D', 'K'], rows: [1, 2, 3] },
      { type: 'cabin', class: 'plus', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'K'], rows: [4, 5, 6, 7, 8, 9] },
      { type: 'facility', doors: 'OWE L / OWE R', components: [] }, // Única salida sobre el ala
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'K'], rows: [10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
      { type: 'facility', doors: 'L2 / R2', components: [{ icon: 'bath', label: 'Aft Lav' }, { icon: 'coffee', label: 'Aft Galley' }] }
    ]
  },
  'A319_N741AV': {
    id: 'A319-N741AV',
    elements: [
      { type: 'facility', doors: 'L1 / R1', components: [{ icon: 'bath', label: 'Fwd Lav' }, { icon: 'coffee', label: 'Fwd Galley' }] },
      { type: 'cabin', class: 'business', layout: ['A', 'C', 'aisle', 'D', 'K'], rows: [1, 2, 3] },
      { type: 'cabin', class: 'plus', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'K'], rows: [4, 5, 6, 7, 8, 9] },
      { type: 'facility', doors: 'OWE L / OWE R', components: [] }, // Única salida sobre el ala
      { type: 'cabin', class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'D', 'E', 'K'], rows: [10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
      { type: 'facility', doors: 'L2 / R2', components: [{ icon: 'bath', label: 'Aft Lav' }, { icon: 'coffee', label: 'Aft Galley' }] }
    ]
  }
};
