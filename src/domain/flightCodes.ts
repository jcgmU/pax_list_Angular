export const FLIGHT_CODES = {
  MEDICAL: {
    BLND: 'Discapacidad visual',
    DEAF: 'Discapacidad auditiva',
    DPNA: 'Discapacidad intelectual/desarrollo',
    PRM: 'Movilidad reducida',
    WCHC: 'Silla de ruedas hasta el asiento',
    WCMP: 'Silla de ruedas manual',
    WCOB: 'Silla de ruedas a bordo',
    WCHR: 'Silla de ruedas (Ramp)',
    WCHS: 'Silla de ruedas (Steps)',
    POC: 'Concentrador de oxígeno portátil',
    CPAP: 'Dispositivo CPAP'
  },
  LEGAL: {
    PICA: 'Custodiado acompañado',
    DEPA: 'Deportado acompañado',
    DEPU: 'Deportado no acompañado',
    INAD: 'Inadmisible'
  },
  ASSISTANCE: {
    EXST: 'Asiento extra',
    CBBG: 'Equipaje en cabina',
    ABP: 'Pasajero apto para ayuda en emergencia'
  },
  ANIMALS: {
    SVAN: 'Animal de servicio',
    ESAN: 'Animal de soporte emocional',
    PETC: 'Mascota en cabina'
  },
  MEALS: {
    BBML: 'Comida para bebé',
    CHML: 'Comida infantil',
    VGML: 'Comida vegetariana',
    GFML: 'Comida libre de gluten',
    MEML: 'Carne de res/cerdo/pollo',
    FSML: 'Pescado o mariscos',
    PSML: 'Pasta o vegetariano'
  },
  STATUS: {
    DIAM: 'LifeMiles Diamond',
    D: 'LifeMiles Diamond',
    GOLD: 'LifeMiles Gold',
    G: 'LifeMiles Gold',
    SILV: 'LifeMiles Silver',
    SILVER: 'LifeMiles Silver',
    PLUS: 'Tarifa/Estatus Plus',
    BDAY: 'Cumpleaños',
    'CLIENTE TOP': 'Alto valor comercial',
    STAFF: 'Colaborador aerolínea',
    INF: 'Infante (<24m)',
    CHD: 'Niño (2-11 años)'
  },
  BATTERIES: {
    WCLB: 'Batería ión litio',
    WCBW: 'Batería celda húmeda'
  }
} as const;

export type FlightCodeCategory = keyof typeof FLIGHT_CODES;
