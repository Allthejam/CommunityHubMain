export type DefibrillatorItem = {
  id: string;
  name: string;
  address: string;
  locationNotes?: string;
  accessType: '24_7' | 'restricted';
  accessHours?: string;
  cabinetType?: 'locked_keypad' | 'unlocked';
  cabinetCodeInstructions?: string;
  what3words?: string;
  lat?: number;
  lng?: number;
  custodianContact?: string;
};

export const DEFAULT_DEMO_DEFIBRILLATORS: DefibrillatorItem[] = [
  {
    id: 'defib-1',
    name: 'The Square - Preserved Red Telephone Kiosk',
    address: 'The Square, High Street, Grantown-on-Spey PH26 3HG',
    locationNotes: 'Inside the iconic heritage red telephone box on the east corner of the town square.',
    accessType: '24_7',
    cabinetType: 'locked_keypad',
    cabinetCodeInstructions: 'Call 999 for ambulance keypad code',
    what3words: '///reminds.stages.bounty',
    lat: 57.3308,
    lng: -3.6120,
    custodianContact: 'Grantown Community Council',
  },
  {
    id: 'defib-2',
    name: 'Grantown Health Centre & Medical Practice',
    address: 'Castle Road, Grantown-on-Spey PH26 3HR',
    locationNotes: 'Mounted on the exterior brick wall to the left of the main entrance door.',
    accessType: '24_7',
    cabinetType: 'locked_keypad',
    cabinetCodeInstructions: 'Call 999 for ambulance keypad code',
    what3words: '///revolvers.coasters.slopes',
    lat: 57.3325,
    lng: -3.6152,
    custodianContact: 'Highland NHS Trust',
  },
  {
    id: 'defib-3',
    name: 'Craig Maclean Leisure Centre & Community Sports Hall',
    address: 'Cromdale Road, Grantown-on-Spey PH26 3HU',
    locationNotes: 'Immediately inside the main reception foyer beside the front desk.',
    accessType: 'restricted',
    accessHours: 'Mon - Fri 07:00 - 21:00, Sat - Sun 09:00 - 17:00',
    cabinetType: 'unlocked',
    cabinetCodeInstructions: 'Unlocked cabinet / Immediate pull handle',
    what3words: '///glory.wishing.starlight',
    lat: 57.3275,
    lng: -3.6060,
    custodianContact: 'High Life Highland',
  },
  {
    id: 'defib-4',
    name: 'Community Fire Station & Emergency Resilience Post',
    address: 'Woodside Avenue, Grantown-on-Spey PH26 3JR',
    locationNotes: 'Mounted on the yellow exterior wall outside the fire station vehicle bay.',
    accessType: '24_7',
    cabinetType: 'locked_keypad',
    cabinetCodeInstructions: 'Call 999 for ambulance keypad code',
    what3words: '///starlight.freshen.outpost',
    lat: 57.3292,
    lng: -3.6185,
    custodianContact: 'Scottish Fire and Rescue Service First Responders',
  },
];
