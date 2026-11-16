export type EvChargerItem = {
  id: string;
  name: string;
  address: string;
  locationNotes?: string;
  accessType: '24_7' | 'restricted';
  accessHours?: string;
  connectorType?: string; // e.g. 'Type 2', 'CCS Rapid', 'Type 2 & CCS'
  powerKw?: string; // e.g. '7kW', '22kW', '50kW'
  operatorName?: string;
  baysCount?: number;
  lat?: number;
  lng?: number;
};

export const DEFAULT_DEMO_EV_CHARGERS: EvChargerItem[] = [
  {
    id: 'ev-1',
    name: 'Burnside Car Park — Rapid & Fast EV Hub',
    address: 'Burnside Avenue, Grantown-on-Spey PH26 3EG',
    locationNotes: 'Located at the north end of the public car park beside the recycling point.',
    accessType: '24_7',
    connectorType: 'CCS Rapid & Type 2',
    powerKw: '50kW / 22kW',
    operatorName: 'ChargePlace Scotland',
    baysCount: 4,
    lat: 57.3316,
    lng: -3.6098,
  },
  {
    id: 'ev-2',
    name: 'Craig Maclean Leisure Centre EV Bays',
    address: 'Cromdale Road, Grantown-on-Spey PH26 3HU',
    locationNotes: 'Two marked EV bays immediately to the left of the main leisure centre entrance.',
    accessType: 'restricted',
    accessHours: 'Mon - Fri 07:00 - 21:00, Sat - Sun 09:00 - 17:00',
    connectorType: 'Type 2 Dual',
    powerKw: '22kW',
    operatorName: 'Highland EV Network',
    baysCount: 2,
    lat: 57.3279,
    lng: -3.6068,
  },
  {
    id: 'ev-3',
    name: 'High Street / The Square Public Charger',
    address: 'The Square, High Street, Grantown-on-Spey PH26 3HG',
    locationNotes: 'On-street EV bay opposite the town square bus stop.',
    accessType: '24_7',
    connectorType: 'Type 2',
    powerKw: '22kW',
    operatorName: 'ChargePlace Scotland',
    baysCount: 2,
    lat: 57.3304,
    lng: -3.6129,
  },
];
