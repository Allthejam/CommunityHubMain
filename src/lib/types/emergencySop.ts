export interface IncidentSopTask {
  id: string;
  title: string;
  desc: string;
  role?: string;
  shortcutAction?: 'announcement' | 'threat' | 'bulletin' | 'keyholders' | 'volunteers' | 'standdown' | 'none';
  isCompleted: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
}

export interface IncidentSopPhase {
  id: string;
  timeTag: string;
  title: string;
  desc: string;
  tasks: IncidentSopTask[];
}

export type ScenarioSopsMap = Record<string, IncidentSopPhase[]>;

export const DEFAULT_SCENARIO_SOPS: ScenarioSopsMap = {
  wildfire: [
    {
      id: 'wf_phase_1',
      timeTag: 'PHASE 1 (0 – 15 MINS)',
      title: 'Rapid Alert Broadcast & Moorland Smoke Assessment',
      desc: 'Instantly notify community residents, evaluate wind direction / rate of spread, and establish threat readiness.',
      tasks: [
        {
          id: 'wf_task_1_1',
          title: 'Dispatch Wildfire Emergency Broadcast Announcement',
          desc: 'Send an urgent broadcast announcement to all community members warning of smoke/fire threat and advising window closure or evacuation prep.',
          role: 'Community Wildfire Lead',
          shortcutAction: 'announcement',
          isCompleted: false
        },
        {
          id: 'wf_task_1_2',
          title: 'Elevate Threat Readiness (Red / Amber)',
          desc: 'Set threat status to Red (Incident Active) or Amber (Advisory) so public portal indicators highlight live wildfire threat.',
          role: 'Incident Commander',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'wf_task_1_3',
          title: 'Publish Initial Wildfire Situation Bulletin',
          desc: 'Broadcast first verified factual notice detailing fire location, wind direction, and road access to public page and Noticeboard.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        }
      ]
    },
    {
      id: 'wf_phase_2',
      timeTag: 'PHASE 2 (15 – 45 MINS)',
      title: 'SFRS Multi-Agency Escalation & Estate Gate Unlocks',
      desc: 'Verify 999 SFRS dispatch, liaise with Castle Grant / estate factors for perimeter access, and unlock water standpipes.',
      tasks: [
        {
          id: 'wf_task_2_1',
          title: 'Confirm SFRS Incident Command & Moorland Grid Ref',
          desc: 'Ensure SFRS Highland Command have precise OS Grid / What3Words and details of terrain access tracks.',
          role: 'SFRS Fire Station Liaison',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'wf_task_2_2',
          title: 'Unlock Estate Firebreak Gates & Water Draft Points',
          desc: 'Contact estate factor to unlock private forestry gates and provide SFRS tenders access to River Spey draft hardstandings.',
          role: 'Estate Factor / Land Manager',
          shortcutAction: 'keyholders',
          isCompleted: false
        },
        {
          id: 'wf_task_2_3',
          title: 'Open Primary Community Rest Centre',
          desc: 'Dispatch keyholder to unlock Oakridge Community Academy complex for evacuees escaping smoke plume.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        }
      ]
    },
    {
      id: 'wf_phase_3',
      timeTag: 'PHASE 3 (45 – 90 MINS)',
      title: 'Agricultural Machinery & Water Bowser Mobilization',
      desc: 'Activate registered 4WD tractors with subsoil ploughs for emergency firebreaks and deploy high-capacity water bowsers.',
      tasks: [
        {
          id: 'wf_task_3_1',
          title: 'Mobilize 4WD Agricultural Firebreak Tractors',
          desc: 'Dispatch on-call heavy agricultural tractors to cut defensive soil firebreaks under SFRS tactical direction.',
          role: 'Head Gamekeeper / Farm Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        },
        {
          id: 'wf_task_3_2',
          title: 'Deploy High-Pressure Water Bowsers & Argocats',
          desc: 'Position 5,000L tractor-towed high-pressure bowsers and Argocat ATVs for spot-fire damping along perimeter.',
          role: 'Operations Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        },
        {
          id: 'wf_task_3_3',
          title: 'Establish PMR446 Radio Net (Channel 3 / HAM)',
          desc: 'Activate off-grid moorland radio patrol on PMR Channel 3 for ground spotters.',
          role: 'Comms Warden',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'wf_phase_4',
      timeTag: 'PHASE 4 (ONGOING INCIDENT)',
      title: 'Rolling Public Bulletins, Livestock Evacuation & Audit',
      desc: 'Maintain hourly public situation updates, move livestock to designated safe pastures, and log all tactical actions.',
      tasks: [
        {
          id: 'wf_task_4_1',
          title: 'Post Rolling Public Bulletins (Every 30–60 Mins)',
          desc: 'Update community on containment percentage, smoke drift direction, and evacuation route clearances.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'wf_task_4_2',
          title: 'Coordinate Livestock Movement to Safe Pastures',
          desc: 'Direct threatened livestock to Showgrounds Field 4 perimeter paddocks with secure water supply.',
          role: 'Agricultural Volunteer Lead',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'wf_task_4_3',
          title: 'Maintain Immutable Statutory Incident Audit Log',
          desc: 'Ensure all agency handoffs, asset dispatches, and leader directives are timestamped in the compliance log.',
          role: 'Incident Commander',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'wf_phase_5',
      timeTag: 'PHASE 5 (CLOSURE & RECOVERY)',
      title: 'Fireground Stand-Down, All-Clear Notice & Review',
      desc: 'Confirm full extinguishment with SFRS, issue public All-Clear bulletin, and conduct post-incident debrief.',
      tasks: [
        {
          id: 'wf_task_5_1',
          title: 'Issue Official All-Clear Situation Notice',
          desc: 'Publish All-Clear bulletin confirming containment and safe return for residents.',
          role: 'Incident Commander',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'wf_task_5_2',
          title: 'Return Community Threat Readiness to Green (Normal)',
          desc: 'De-escalate public emergency portal threat banner and stand down volunteer tractor operators.',
          role: 'Community Resilience Lead',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'wf_task_5_3',
          title: 'Conduct Statutory Wildfire Debrief & 6-Month Review',
          desc: 'Replenish estate water storage tanks, inspect firebreak equipment, and re-certify resilience plan.',
          role: 'Incident Commander & SFRS LSO',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    }
  ],

  urbanfire: [
    {
      id: 'uf_phase_1',
      timeTag: 'PHASE 1 (0 – 15 MINS)',
      title: 'High Street Tenement Cordon & Immediate Evacuation Alert',
      desc: 'Warn residents in historic core, establish safety cordon, and broadcast urgent public safety bulletin.',
      tasks: [
        {
          id: 'uf_task_1_1',
          title: 'Dispatch Urban Fire Emergency Broadcast Announcement',
          desc: 'Broadcast emergency notification advising residents within 100m cordon to evacuate and avoid High Street.',
          role: 'Urban Resilience Lead',
          shortcutAction: 'announcement',
          isCompleted: false
        },
        {
          id: 'uf_task_1_2',
          title: 'Elevate Threat Status to Red (Incident Active)',
          desc: 'Switch threat status to Red to alert incoming mutual aid and emergency personnel.',
          role: 'Incident Commander',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'uf_task_1_3',
          title: 'Publish First Urban Fire Situation Notice',
          desc: 'Publish active road closures and designated emergency bypass routes (e.g. Castle Road diversion).',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        }
      ]
    },
    {
      id: 'uf_phase_2',
      timeTag: 'PHASE 2 (15 – 45 MINS)',
      title: 'SFRS Multi-Agency Link & Warmth Hub Opening',
      desc: 'Liaise with SFRS Highland Command, dispatch keyholders to open RBLS Legion Warmth Canteen, and alert Council Housing.',
      tasks: [
        {
          id: 'uf_task_2_1',
          title: 'Confirm SFRS Water Tender & Hydrant Locations',
          desc: 'Provide SFRS with High Street standpipe cache locations and main gas/electric shutoff isolation points.',
          role: 'SFRS Incident Command Liaison',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'uf_task_2_2',
          title: 'Unlock RBLS Legion Warmth Hub & Evacuation Canteen',
          desc: 'Open rest shelter with hot beverages, blankets, and dry shelter for evacuated families.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        },
        {
          id: 'uf_task_2_3',
          title: 'Contact Highland Council Emergency Housing Team',
          desc: 'Trigger temporary overnight rehousing protocols for families with damaged tenement premises.',
          role: 'Council Liaison',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'uf_phase_3',
      timeTag: 'PHASE 3 (45 – 90 MINS)',
      title: 'Welfare Support, Transport & Vulnerable Resident Care',
      desc: 'Mobilize volunteer transport for elderly residents, assist pets, and coordinate canteen meal provisions.',
      tasks: [
        {
          id: 'uf_task_3_1',
          title: 'Mobilize Volunteer Drivers & Wheelchair Accessible Transport',
          desc: 'Transport mobility-impaired residents from perimeter to the primary warmth hub.',
          role: 'Volunteer Transport Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        },
        {
          id: 'uf_task_3_2',
          title: 'Register Evacuated Residents at Rest Centre',
          desc: 'Maintain private registry of displaced persons and coordinate pharmacy/medical essentials.',
          role: 'Welfare Lead',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'uf_phase_4',
      timeTag: 'PHASE 4 (ONGOING INCIDENT)',
      title: 'Rolling High Street Bulletins & Multi-Agency Coordination',
      desc: 'Maintain hourly bulletins on cordon boundaries, smoke dissipation, and housing placement updates.',
      tasks: [
        {
          id: 'uf_task_4_1',
          title: 'Post Rolling Road & Cordon Bulletins',
          desc: 'Broadcast verified updates on business access, High Street reopened sections, and utility restoration.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'uf_task_4_2',
          title: 'Record All Incident Actions in Statutory Audit Log',
          desc: 'Log housing handoffs and property key access in the compliance log.',
          role: 'Incident Commander',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'uf_phase_5',
      timeTag: 'PHASE 5 (CLOSURE & RECOVERY)',
      title: 'Building Safety Clearance, All-Clear & Stand-Down',
      desc: 'Obtain Building Standards safety clearance, publish All-Clear, and transition displaced residents to council housing.',
      tasks: [
        {
          id: 'uf_task_5_1',
          title: 'Issue Official All-Clear Situation Notice',
          desc: 'Publish All-Clear bulletin detailing High Street reopening and cordon collapse.',
          role: 'Incident Commander',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'uf_task_5_2',
          title: 'Return Threat Status to Normal (Green)',
          desc: 'Close emergency alert banner and stand down warmth canteen volunteers.',
          role: 'Resilience Lead',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'uf_task_5_3',
          title: 'Conduct Statutory Debrief & Community Support Review',
          desc: 'Conduct community debrief with SFRS and business factors association.',
          role: 'Incident Commander & Council EPO',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    }
  ],

  flood: [
    {
      id: 'fl_phase_1',
      timeTag: 'PHASE 1 (0 – 15 MINS)',
      title: 'SEPA River Warning Broadcast & Threat Elevation',
      desc: 'Monitor Speyside river gauge levels, elevate threat readiness, and dispatch flood alert broadcast.',
      tasks: [
        {
          id: 'fl_task_1_1',
          title: 'Dispatch Flood Warning Broadcast Announcement',
          desc: 'Send urgent flood alert advising riverside residents to deploy flood barriers and move vehicles to high ground.',
          role: 'Community Flood Warden',
          shortcutAction: 'announcement',
          isCompleted: false
        },
        {
          id: 'fl_task_1_2',
          title: 'Elevate Threat Status (Red / Amber)',
          desc: 'Set threat level to Red (Incident Active) or Amber (Flood Alert) based on SEPA gauge telemetry.',
          role: 'Incident Commander',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'fl_task_1_3',
          title: 'Publish First Flood Situation Notice',
          desc: 'Broadcast river level forecast, high ground parking locations, and sandbag collection depot details.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        }
      ]
    },
    {
      id: 'fl_phase_2',
      timeTag: 'PHASE 2 (15 – 45 MINS)',
      title: 'Sandbag Depot Unlock & High-Ground Shelter Open',
      desc: 'Unlock Burnfield sandbag store, coordinate council road teams, and open high-ground rest centre.',
      tasks: [
        {
          id: 'fl_task_2_1',
          title: 'Unlock Burnfield Sandbag & Barrier Store',
          desc: 'Dispatch keyholder to unlock council sandbag depot and distribute bags to vulnerable properties.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        },
        {
          id: 'fl_task_2_2',
          title: 'Open High-Ground Evacuation Centre (Grammar School)',
          desc: 'Unlock community complex situated above the 1-in-200 year flood plain.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        },
        {
          id: 'fl_task_2_3',
          title: 'Liaise with SEPA Duty Hydrologist & Police Scotland',
          desc: 'Establish direct telephone contact for river crest timing and road closure cordons.',
          role: 'Liaison Lead',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'fl_phase_3',
      timeTag: 'PHASE 3 (45 – 90 MINS)',
      title: '4x4 Snorkel Transport, Sump Pumps & Sandbag Deployment',
      desc: 'Deploy volunteer 4x4 vehicles with wading snorkels, position submersible trash pumps, and protect substations.',
      tasks: [
        {
          id: 'fl_task_3_1',
          title: 'Mobilize Raised 4x4 Vehicles & Sandbag Fill Teams',
          desc: 'Dispatch high-clearance 4x4s with sandbags and rescue gear to low-lying riverside properties.',
          role: 'Operations Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        },
        {
          id: 'fl_task_3_2',
          title: 'Deploy High-Volume Sump & Trash Pumps',
          desc: 'Install petrol water pumps at key culvert blockages and vulnerable substation perimeters.',
          role: 'Volunteer Equipment Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        }
      ]
    },
    {
      id: 'fl_phase_4',
      timeTag: 'PHASE 4 (ONGOING INCIDENT)',
      title: 'Rolling Gauge Telemetry, Road Closures & Audit Log',
      desc: 'Broadcast hourly river crest updates, monitor bridge stability, and maintain the statutory audit log.',
      tasks: [
        {
          id: 'fl_task_4_1',
          title: 'Post Hourly Flood & Road Closure Bulletins',
          desc: 'Broadcast verified river crest levels, submerged bridge alerts, and drinking water safety notices.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'fl_task_4_2',
          title: 'Maintain Statutory Audit & Resource Log',
          desc: 'Record all road closures, pump deployments, and agency directives in the compliance log.',
          role: 'Incident Commander',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'fl_phase_5',
      timeTag: 'PHASE 5 (CLOSURE & RECOVERY)',
      title: 'Floodwater Receding Inspection, All-Clear & Sump Cleanup',
      desc: 'Inspect road bridges, pump out flooded basements, issue All-Clear notice, and restock sandbag caches.',
      tasks: [
        {
          id: 'fl_task_5_1',
          title: 'Issue Official All-Clear Situation Notice',
          desc: 'Publish All-Clear bulletin confirming river levels have receded below danger thresholds.',
          role: 'Incident Commander',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'fl_task_5_2',
          title: 'Return Threat Status to Normal (Green)',
          desc: 'De-escalate portal alert banner and stand down high-ground evacuation shelter.',
          role: 'Flood Warden Lead',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'fl_task_5_3',
          title: 'Conduct Statutory Flood Review & Sandbag Restock',
          desc: 'Restock Burnfield sandbag depot, clean submersible pumps, and re-certify resilience plan.',
          role: 'Incident Commander & Highland Council',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    }
  ],

  power: [
    {
      id: 'po_phase_1',
      timeTag: 'PHASE 1 (0 – 15 MINS)',
      title: 'Blackout Broadcast & Priority Medical Needs Check',
      desc: 'Notify community of grid outage, assess duration with SSEN (105), and check on oxygen/power-dependent residents.',
      tasks: [
        {
          id: 'po_task_1_1',
          title: 'Dispatch Power Outage Emergency Broadcast Announcement',
          desc: 'Send broadcast notification reminding residents of SSEN fault line (105), warmth hub location, and blackout safety.',
          role: 'Community Power Lead',
          shortcutAction: 'announcement',
          isCompleted: false
        },
        {
          id: 'po_task_1_2',
          title: 'Elevate Threat Status to Amber / Red',
          desc: 'Switch threat status to Amber (Advisory) or Red (Extended Winter Blackout) on community portal.',
          role: 'Incident Commander',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'po_task_1_3',
          title: 'Publish Initial Power Outage Situation Bulletin',
          desc: 'Broadcast SSEN estimated restoration time and warmth/charging centre opening hours.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        }
      ]
    },
    {
      id: 'po_phase_2',
      timeTag: 'PHASE 2 (15 – 45 MINS)',
      title: 'Generator Heating Hub Unlock & Vulnerable Care Lead Alert',
      desc: 'Start Village Hall generator, unlock warmth centre, and coordinate with district nurses and care homes.',
      tasks: [
        {
          id: 'po_task_2_1',
          title: 'Unlock Village Hall & Start Backup Diesel Generator',
          desc: 'Dispatch keyholder to start 45kVA generator, power hall heating, and set up hot water boiler.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        },
        {
          id: 'po_task_2_2',
          title: 'Contact District Nurses & Speyside Care Home',
          desc: 'Verify backup battery status for oxygen concentrators and dialysis patients.',
          role: 'Vulnerable Lead',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'po_task_2_3',
          title: 'Liaise with SSEN Fault Control (105)',
          desc: 'Obtain dedicated substation fault logs and estimated re-energization timeline.',
          role: 'SSEN Liaison',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'po_phase_3',
      timeTag: 'PHASE 3 (45 – 90 MINS)',
      title: 'Mobile Generator Deployment & Off-Grid Radio Net',
      desc: 'Deploy portable 5kVA generators to vulnerable households and establish PMR446 blackout radio network.',
      tasks: [
        {
          id: 'po_task_3_1',
          title: 'Deploy Portable Generators & Extension Leads',
          desc: 'Distribute 5kVA portable generators to vulnerable residents and medical equipment users.',
          role: 'Operations Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        },
        {
          id: 'po_task_3_2',
          title: 'Activate PMR446 / HAM Radio Blackout Network',
          desc: 'Establish radio communications on Channel 3 for warden welfare checks if cellular towers exhaust battery reserves.',
          role: 'Telecoms Lead',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'po_phase_4',
      timeTag: 'PHASE 4 (ONGOING INCIDENT)',
      title: 'Rolling Welfare Checks, Charging Station & Audit Log',
      desc: 'Provide phone charging stations at warmth hub, conduct door-to-door welfare checks, and log all fuel distributions.',
      tasks: [
        {
          id: 'po_task_4_1',
          title: 'Post 2-Hourly Restoration & Welfare Bulletins',
          desc: 'Broadcast updates on grid progress, hot food availability, and physical noticeboard announcements.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'po_task_4_2',
          title: 'Maintain Statutory Audit & Fuel Distribution Log',
          desc: 'Record diesel fuel refills and welfare visits in the compliance log.',
          role: 'Incident Commander',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'po_phase_5',
      timeTag: 'PHASE 5 (CLOSURE & RECOVERY)',
      title: 'Grid Restoration Verification, All-Clear & Debrief',
      desc: 'Verify grid voltage stability across township, issue All-Clear bulletin, and restock diesel reserves.',
      tasks: [
        {
          id: 'po_task_5_1',
          title: 'Issue Official All-Clear Situation Notice',
          desc: 'Publish All-Clear bulletin confirming full grid power restoration.',
          role: 'Incident Commander',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'po_task_5_2',
          title: 'Return Threat Readiness to Normal (Green)',
          desc: 'Stand down emergency generator centre and restore normal threat status.',
          role: 'Resilience Lead',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'po_task_5_3',
          title: 'Service Generators & Restock Diesel Fuel',
          desc: 'Top up 1,000L red diesel store and re-certify resilience plan.',
          role: 'Incident Commander & Energy Team',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    }
  ],

  drought: [
    {
      id: 'dr_phase_1',
      timeTag: 'PHASE 1 (0 – 15 MINS)',
      title: 'Water Shortage Advisory Broadcast & Threat Elevation',
      desc: 'Assess Private Water Supplies (PWS), liaise with Scottish Water, and issue community water conservation broadcast.',
      tasks: [
        {
          id: 'dr_task_1_1',
          title: 'Dispatch Water Conservation Emergency Broadcast',
          desc: 'Broadcast alert advising strict water conservation and informing residents of emergency bottled water distribution points.',
          role: 'Water Resilience Lead',
          shortcutAction: 'announcement',
          isCompleted: false
        },
        {
          id: 'dr_task_1_2',
          title: 'Elevate Threat Status to Amber / Red',
          desc: 'Set portal threat indicator to Amber (Shortage Advisory) or Red (Supply Failure).',
          role: 'Incident Commander',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'dr_task_1_3',
          title: 'Publish Initial Water Distribution Bulletin',
          desc: 'Broadcast locations of emergency water tankers, bowsers, and distribution hours.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        }
      ]
    },
    {
      id: 'dr_phase_2',
      timeTag: 'PHASE 2 (15 – 45 MINS)',
      title: 'Scottish Water Bowser Setup & Bottled Water Hub Open',
      desc: 'Position 10,000L static bowsers at designated hubs, unlock bottled water caches, and arrange livestock water.',
      tasks: [
        {
          id: 'dr_task_2_1',
          title: 'Unlock Bottled Water Cache & Distribution Hub',
          desc: 'Open Community Centre distribution point for emergency 5L bottled water rations.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        },
        {
          id: 'dr_task_2_2',
          title: 'Coordinate Scottish Water Tanker Placement',
          desc: 'Ensure Scottish Water tankers have clear access and hardstanding at Town Square.',
          role: 'Liaison Lead',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'dr_phase_3',
      timeTag: 'PHASE 3 (45 – 90 MINS)',
      title: 'Volunteer Bowser Delivery & Livestock Water Haulage',
      desc: 'Deploy tractor-towed bowsers to isolated rural PWS households and livestock pastures.',
      tasks: [
        {
          id: 'dr_task_3_1',
          title: 'Mobilize Tractor Water Bowsers for Isolated Homes',
          desc: 'Dispatch volunteer tractors with water bowsers to refill dry private storage tanks.',
          role: 'Operations Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        },
        {
          id: 'dr_task_3_2',
          title: 'Deliver Livestock Water to Upland Farms',
          desc: 'Ensure farm livestock have continuous water supply in coordination with NFU Scotland.',
          role: 'Agricultural Volunteer Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        }
      ]
    },
    {
      id: 'dr_phase_4',
      timeTag: 'PHASE 4 (ONGOING INCIDENT)',
      title: 'Rolling Water Depletion Updates & Audit Logging',
      desc: 'Maintain daily bulletins on aquifer recovery, tanker schedules, and maintain audit records.',
      tasks: [
        {
          id: 'dr_task_4_1',
          title: 'Post Daily Water Distribution Bulletins',
          desc: 'Broadcast updated tanker replenishment times and boil-water notices if applicable.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'dr_task_4_2',
          title: 'Maintain Statutory Audit & Water Allocation Log',
          desc: 'Log litres distributed and tanker deliveries in the compliance log.',
          role: 'Incident Commander',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'dr_phase_5',
      timeTag: 'PHASE 5 (CLOSURE & RECOVERY)',
      title: 'Water Quality Testing, All-Clear & Stand-Down',
      desc: 'Verify Scottish Water mains pressure and PWS water potability, issue All-Clear, and restock bottled reserves.',
      tasks: [
        {
          id: 'dr_task_5_1',
          title: 'Issue Official All-Clear Situation Notice',
          desc: 'Publish All-Clear bulletin confirming normal water supplies have been restored.',
          role: 'Incident Commander',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'dr_task_5_2',
          title: 'Return Threat Readiness to Normal (Green)',
          desc: 'Stand down emergency distribution hubs and restore green readiness.',
          role: 'Resilience Lead',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'dr_task_5_3',
          title: 'Restock Emergency Bottled Water Stores',
          desc: 'Replenish community reserves and re-certify resilience plan.',
          role: 'Incident Commander & Water Team',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    }
  ],

  unrest: [
    {
      id: 'un_phase_1',
      timeTag: 'PHASE 1 (0 – 15 MINS)',
      title: 'Civil Safety Advisory Broadcast & Threat Elevation',
      desc: 'Issue calm safety advice, designate area avoidance cordons, and elevate threat readiness.',
      tasks: [
        {
          id: 'un_task_1_1',
          title: 'Dispatch Community Safety Broadcast Announcement',
          desc: 'Send broadcast notification advising residents to stay indoors, secure premises, and avoid focal protest areas.',
          role: 'Community Lead',
          shortcutAction: 'announcement',
          isCompleted: false
        },
        {
          id: 'un_task_1_2',
          title: 'Elevate Threat Status to Amber / Red',
          desc: 'Set portal threat indicator to Amber (Precautionary Advisory) or Red (Active Disturbance).',
          role: 'Incident Commander',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'un_task_1_3',
          title: 'Publish First De-escalation Situation Notice',
          desc: 'Broadcast verified factual updates on transport disruptions and verified emergency helplines.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        }
      ]
    },
    {
      id: 'un_phase_2',
      timeTag: 'PHASE 2 (15 – 45 MINS)',
      title: 'Police Scotland Liaison Link & Secure Facility Locks',
      desc: 'Establish link with Police Scotland Community Sergeant and verify perimeter locks on community facilities.',
      tasks: [
        {
          id: 'un_task_2_1',
          title: 'Contact Police Scotland Community Liaison',
          desc: 'Establish direct communication channel with local division commander for verified situational updates.',
          role: 'Police Liaison Lead',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'un_task_2_2',
          title: 'Secure Community Facilities & Public Buildings',
          desc: 'Contact keyholders to ensure community halls, sports pavilions, and stores are locked and CCTV operational.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        }
      ]
    },
    {
      id: 'un_phase_3',
      timeTag: 'PHASE 3 (45 – 90 MINS)',
      title: 'Vulnerable Resident Check & Community Calming',
      desc: 'Check on isolated residents, provide telephone reassurance, and counter unverified social media rumours.',
      tasks: [
        {
          id: 'un_task_3_1',
          title: 'Conduct Remote Welfare Telephone Checks',
          desc: 'Phone vulnerable elderly residents and provide calm reassurance.',
          role: 'Welfare Lead',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'un_task_3_2',
          title: 'Active Rumour Control & Fact Checking',
          desc: 'Cross-reference reports with Police Scotland before sharing updates to avoid public panic.',
          role: 'Communications Lead',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'un_phase_4',
      timeTag: 'PHASE 4 (ONGOING INCIDENT)',
      title: 'Rolling Verified Public Bulletins & Statutory Audit',
      desc: 'Post rolling verified bulletins and document all council/police communications in the audit log.',
      tasks: [
        {
          id: 'un_task_4_1',
          title: 'Post Rolling Community Safety Bulletins',
          desc: 'Broadcast updates on public transport reopenings and business hours.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'un_task_4_2',
          title: 'Maintain Statutory Audit & Incident Log',
          desc: 'Record all police directives and security events in the compliance log.',
          role: 'Incident Commander',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'un_phase_5',
      timeTag: 'PHASE 5 (CLOSURE & RECOVERY)',
      title: 'Calm Restored Confirmation, All-Clear & Community Debrief',
      desc: 'Confirm return to public order with police, issue All-Clear bulletin, and host community dialogue.',
      tasks: [
        {
          id: 'un_task_5_1',
          title: 'Issue Official All-Clear Situation Notice',
          desc: 'Publish All-Clear bulletin confirming full return to normal community operations.',
          role: 'Incident Commander',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'un_task_5_2',
          title: 'Return Threat Readiness to Normal (Green)',
          desc: 'De-escalate portal alert banner and return threat status to Green.',
          role: 'Resilience Lead',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'un_task_5_3',
          title: 'Conduct Multi-Agency Community Review',
          desc: 'Hold post-incident debrief with community leaders and police liaisons.',
          role: 'Incident Commander & Police Scotland',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    }
  ],

  defence: [
    {
      id: 'cd_phase_1',
      timeTag: 'PHASE 1 (0 – 15 MINS)',
      title: 'National Resilience Alert & Civil Defence Warning',
      desc: 'Activate civil defence protocol under Scottish Resilience framework, broadcast emergency notice, and elevate threat.',
      tasks: [
        {
          id: 'cd_task_1_1',
          title: 'Dispatch Civil Defence Broadcast Announcement',
          desc: 'Broadcast high-priority instructions advising essential supply checks, battery radio monitoring, and shelter locations.',
          role: 'Civil Defence Lead',
          shortcutAction: 'announcement',
          isCompleted: false
        },
        {
          id: 'cd_task_1_2',
          title: 'Elevate Threat Status to Red (National Emergency)',
          desc: 'Set portal threat indicator to Red to lock down non-essential public activities.',
          role: 'Incident Commander',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'cd_task_1_3',
          title: 'Publish First Civil Defence Situation Notice',
          desc: 'Broadcast emergency broadcast radio frequencies (BBC Radio Scotland 810 MW) and shelter guidelines.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        }
      ]
    },
    {
      id: 'cd_phase_2',
      timeTag: 'PHASE 2 (15 – 45 MINS)',
      title: 'Hardened Rest Shelter & Emergency Store Unlock',
      desc: 'Unlock reinforced community facility basements/shelters, inspect off-grid water springs, and test backup generators.',
      tasks: [
        {
          id: 'cd_task_2_1',
          title: 'Unlock Reinforced Community Shelter / Vault',
          desc: 'Open reinforced shelter space with first aid, emergency rations, and water supplies.',
          role: 'Keyholder Lead',
          shortcutAction: 'keyholders',
          isCompleted: false
        },
        {
          id: 'cd_task_2_2',
          title: 'Inspect Off-Grid Gravity-Fed Water Spring',
          desc: 'Verify water flow from local natural spring / storage header tank independent of mains power.',
          role: 'Water Lead',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'cd_task_2_3',
          title: 'Establish Council Emergency Planning Officer Liaison',
          desc: 'Establish contact with Regional Resilience Partnership (RRP) emergency operations centre.',
          role: 'Liaison Lead',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'cd_phase_3',
      timeTag: 'PHASE 3 (45 – 90 MINS)',
      title: 'Off-Grid Comms Mesh & Essential Rationing Setup',
      desc: 'Deploy volunteer radio operators on HAM/PMR446 mesh and organize food/medical rationing teams.',
      tasks: [
        {
          id: 'cd_task_3_1',
          title: 'Activate HAM / PMR446 Emergency Mesh Net',
          desc: 'Connect local wardens via off-grid radio channels to maintain communication during national blackout.',
          role: 'Telecoms Warden',
          shortcutAction: 'none',
          isCompleted: false
        },
        {
          id: 'cd_task_3_2',
          title: 'Organize First Aid & Medical Volunteer Post',
          desc: 'Set up emergency triage post staffed by qualified first aiders and retired medical professionals.',
          role: 'Medical Lead',
          shortcutAction: 'volunteers',
          isCompleted: false
        }
      ]
    },
    {
      id: 'cd_phase_4',
      timeTag: 'PHASE 4 (ONGOING INCIDENT)',
      title: 'Physical Noticeboard Dispatch, Rationing & Audit',
      desc: 'Post printed bulletins to physical weatherproof noticeboards across township and log all supply distributions.',
      tasks: [
        {
          id: 'cd_task_4_1',
          title: 'Post Physical Noticeboard Bulletins',
          desc: 'Distribute printed official information to Town Hall Square, Post Office, and Village Noticeboards.',
          role: 'Communications Lead',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'cd_task_4_2',
          title: 'Maintain Statutory Audit & Resource Distribution Log',
          desc: 'Ensure all supplies, fuel, and medical items issued are recorded in the compliance log.',
          role: 'Incident Commander',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    },
    {
      id: 'cd_phase_5',
      timeTag: 'PHASE 5 (CLOSURE & RECOVERY)',
      title: 'Official Stand-Down Directive, All-Clear & Review',
      desc: 'Receive official stand-down notice from Scottish Government, issue All-Clear, and restock civil defence emergency stores.',
      tasks: [
        {
          id: 'cd_task_5_1',
          title: 'Issue Official All-Clear Situation Notice',
          desc: 'Publish All-Clear bulletin confirming national emergency stand-down and resumption of normal services.',
          role: 'Incident Commander',
          shortcutAction: 'bulletin',
          isCompleted: false
        },
        {
          id: 'cd_task_5_2',
          title: 'Return Threat Readiness to Normal (Green)',
          desc: 'De-escalate civil defence alert and restore normal status.',
          role: 'Civil Defence Lead',
          shortcutAction: 'threat',
          isCompleted: false
        },
        {
          id: 'cd_task_5_3',
          title: 'Conduct Statutory Civil Defence Recertification',
          desc: 'Restock medical caches, service emergency batteries, and re-certify resilience plan.',
          role: 'Incident Commander & Regional Resilience Lead',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    }
  ]
};

// ==========================================
// MASS EVACUATION & TRANSPORT MOBILISATION TYPES
// ==========================================

export type TransportVehicleType = 'coach' | 'minibus' | 'taxi_4x4' | 'accessible_van';
export type TransportReadinessStatus = 'standby' | 'mobilised' | 'active_evacuation' | 'completed' | 'off_duty';
export type RoadAccessibilityTier = 'all_vehicles' | 'minibus_taxi_only' | '4x4_only';

export interface EvacuationTransportPartner {
  id: string;
  operator: string;
  vehicleType: TransportVehicleType;
  vehicleCount: number;
  totalSeats: number;
  assignedSector: string;
  dispatchContact: string;
  driverName?: string;
  pickupMusterPoint: string;
  dropoffDestination: string;
  status: TransportReadinessStatus;
  notes?: string;
}

export interface EvacuationCollectionPoint {
  id: string;
  name: string;
  address: string;
  accessibleFor: RoadAccessibilityTier;
  targetRoads: string;
  designatedVehicles: string;
  dropoffShelter: string;
  onSiteCoordinator: string;
  coordinatorPhone: string;
  status: 'open' | 'staged' | 'cleared' | 'closed';
  notes?: string;
}

export interface EvacuationDepartureLog {
  id: string;
  timestamp: string;
  operator: string;
  vehicleType: TransportVehicleType;
  headcount: number;
  fromPoint: string;
  toShelter: string;
  status: 'loading' | 'en_route' | 'arrived';
  loggedBy: string;
}

export const DEFAULT_EVACUATION_PARTNERS: EvacuationTransportPartner[] = [
  {
    id: 'partner-stagecoach',
    operator: 'DemoVille Regional Transit (Main Depot)',
    vehicleType: 'coach',
    vehicleCount: 2,
    totalSeats: 106,
    assignedSector: 'Arterial Routes: High Street, Town Square & Main A10 corridor',
    dispatchContact: '01632 960111 (24h Emergency Dispatch)',
    pickupMusterPoint: 'The Square & Public Car Park, Oakridge, DE1 4MO',
    dropoffDestination: 'DemoVille Central Sports Complex (Shelter Alpha)',
    status: 'standby',
    notes: 'Large 53-seat coaches suitable for main roads only.'
  },
  {
    id: 'partner-dial-a-bus',
    operator: 'DemoVille Community Transport Action (CTA)',
    vehicleType: 'accessible_van',
    vehicleCount: 2,
    totalSeats: 32,
    assignedSector: 'Care Facilities & Non-Ambulatory: Oakridge Health Centre & Meadowview Assisted Living',
    dispatchContact: '01632 960300 (Duty Mobiliser: 07700 900123)',
    pickupMusterPoint: 'Meadowview Assisted Living & Oakridge Health Centre',
    dropoffDestination: 'DemoVille Civic Centre (Accessible Wing)',
    status: 'standby',
    notes: 'Equipped with hydraulic wheelchair lift and secure wheelchair anchor bays.'
  },
  {
    id: 'partner-speyside-taxis',
    operator: 'Oakridge Cabs & Private Hire',
    vehicleType: 'taxi_4x4',
    vehicleCount: 4,
    totalSeats: 24,
    assignedSector: 'Rural Lanes & Outskirts: Hill Road, North Valley & Farms',
    dispatchContact: '01632 960200 (Direct Lead: 07712 345678)',
    pickupMusterPoint: 'Door-to-door rural shuttle & Academy feeder',
    dropoffDestination: 'The Square Coach Transfer Hub / Direct to Shelter Alpha',
    status: 'standby',
    notes: 'All-wheel drive vehicles capable of narrow rural passes and adverse weather conditions.'
  },
  {
    id: 'partner-cairngorm-taxis',
    operator: 'DemoVille Executive 4x4 Fleet',
    vehicleType: 'taxi_4x4',
    vehicleCount: 3,
    totalSeats: 18,
    assignedSector: 'South & Riverside Corridor: Valley Road & isolated hamlets',
    dispatchContact: '01632 960201',
    pickupMusterPoint: 'Valley Village Hall / West Lane Junction',
    dropoffDestination: 'DemoVille Central Sports Complex (Shelter Alpha)',
    status: 'standby',
    notes: '4x4 estate vehicles with high ground clearance for forest tracks and flood verge bypass.'
  }
];

export const DEFAULT_COLLECTION_POINTS: EvacuationCollectionPoint[] = [
  {
    id: 'point-square',
    name: 'Town Square & Public Car Park (Arterial Coach Hub)',
    address: 'The Square, High Street, Oakridge, DE1 4MO',
    accessibleFor: 'all_vehicles',
    targetRoads: 'Town Centre, High Street, Station Road, Civic Way',
    designatedVehicles: '2x 53-Seat Regional Coaches + Minibuses',
    dropoffShelter: 'DemoVille Central Sports Complex (Shelter Alpha)',
    onSiteCoordinator: 'John MacRae (Community Warden)',
    coordinatorPhone: '07700 900222',
    status: 'staged',
    notes: 'Primary high-capacity coach loading zone. Public amenities available.'
  },
  {
    id: 'point-primary-school',
    name: 'Oakridge Community Academy Turning Circle',
    address: 'School Road, Oakridge, DE1 4MO',
    accessibleFor: 'all_vehicles',
    targetRoads: 'South Oakridge, Valley Road, Residential Estates',
    designatedVehicles: '1x Regional Coach + 2x Community Minibuses',
    dropoffShelter: 'DemoVille Central Sports Complex (Shelter Alpha)',
    onSiteCoordinator: 'Sarah Fraser (School Liaison)',
    coordinatorPhone: '07700 900333',
    status: 'staged',
    notes: 'Dedicated bus turning loop with covered canopy for loading families and children.'
  },
  {
    id: 'point-cromdale',
    name: 'North Valley Feeder Point',
    address: 'North Valley Approach, DE1 4MO',
    accessibleFor: 'minibus_taxi_only',
    targetRoads: 'North Hills, Single-Track Lanes, Farm Tracks',
    designatedVehicles: '4x Oakridge Taxis & 4WD Shuttles (Transfer to Coach Hub)',
    dropoffShelter: 'Transfer to The Square Coach Hub / Direct to Shelter Beta',
    onSiteCoordinator: 'Angus Grant (Rural Sector Lead)',
    coordinatorPhone: '07700 900444',
    status: 'staged',
    notes: 'Narrow road access. Full-size coaches CANNOT enter. Taxis run continuous feeder shuttles to the Square.'
  }
];
