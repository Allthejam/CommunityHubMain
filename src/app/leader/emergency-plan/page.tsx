'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldAlert,
  Flame,
  Building,
  Waves,
  Zap,
  Droplets,
  ShieldCheck,
  Award,
  Truck,
  Tractor,
  Radio,
  Clock,
  Printer,
  Copy,
  Check,
  Save,
  Loader2,
  RefreshCw,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  Send,
  Sparkles,
  Info,
  ChevronRight,
  Split,
  Eye,
  EyeOff,
  Building2,
  RadioTower,
  TreePine,
  LifeBuoy,
  ArrowRight,
  Navigation,
  Shield,
  Megaphone,
  Users2,
  Lock,
  Activity,
  Package,
  Layers,
  MessageSquareText,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  publishCommunityEmergencyBroadcastAction,
  updateLiveThreatStatusAction,
  ScenarioFacilitiesMap,
  ScenarioFacilityItem
} from '@/lib/actions/emergencyPlanActions';

type HazardType = 'wildfire' | 'urbanfire' | 'flood' | 'power' | 'drought' | 'unrest' | 'defence' | 'submission';

interface PriorityItem {
  title: string;
  desc: string;
}

interface TimelineItem {
  title: string;
  desc: string;
}

const DEFAULT_SCENARIO_FACILITIES: ScenarioFacilitiesMap = {
  wildfire: {
    f1: {
      name: 'Evacuation Corridor / Escape Highway',
      category: 'route',
      primary: 'A95 Northbound towards Aviemore / A9',
      secondary: 'A939 towards Nairn / Coast (Clear of pine belt)',
      isFailover: false
    },
    f2: {
      name: 'Evacuation Refuge & Shelter Hub',
      category: 'hub',
      primary: 'Grantown Grammar School Sports Complex',
      secondary: 'Inverallan Church Hall & Canteen',
      isFailover: false
    },
    f3: {
      name: 'Incident Command Post',
      category: 'command',
      primary: 'The Town Hall, The Square',
      secondary: 'Royal British Legion Hall (RBLS), The Square',
      isFailover: false
    }
  },
  urbanfire: {
    f1: {
      name: 'Traffic Bypass & Cordon Corridor',
      category: 'route',
      primary: 'Bypass via Castle Grant Estate Road & Seafield Avenue',
      secondary: 'Relief Route via Old Spey Bridge & B9102',
      isFailover: false
    },
    f2: {
      name: 'Immediate Warmth & Family Assembly Hub',
      category: 'hub',
      primary: 'RBLS Legion Main Hall, The Square',
      secondary: 'Strathspey Church Hall & Kitchen',
      isFailover: false
    },
    f3: {
      name: 'Forward Fire & Rescue Appliance Staging',
      category: 'command',
      primary: 'The Square Central Staging Area',
      secondary: 'Burnfield Car Park Hardstanding',
      isFailover: false
    }
  },
  flood: {
    f1: {
      name: 'High-Ground Evacuation Refuge (>220m Contour)',
      category: 'hub',
      primary: 'Grantown Grammar School (Above 220m contour)',
      secondary: 'Spey Valley Golf Clubhouse (High Ground)',
      isFailover: false
    },
    f2: {
      name: 'Council Sandbag Collection Depot',
      category: 'depot',
      primary: 'Highland Council Depot, Burnfield Car Park',
      secondary: 'Strathspey Roads Yard & Salt Shed',
      isFailover: false
    },
    f3: {
      name: 'Emergency Flood Warden Command Desk',
      category: 'command',
      primary: 'Burnfield Command Portacabin',
      secondary: 'Town Hall Lower Meeting Room',
      isFailover: false
    }
  },
  power: {
    f1: {
      name: 'Warm Space Hub & Soup Canteen (Generator Powered)',
      category: 'warmth',
      primary: 'Community Hub Hall (25kVA Generator, Heating & Kitchen)',
      secondary: 'Inverallan Church Canteen & Warm Room',
      isFailover: false
    },
    f2: {
      name: 'Device Charging & Thermal Blanket Bank',
      category: 'charging',
      primary: 'Grammar School Sports Tech Suite (Multi-Socket Bank)',
      secondary: 'Legion Lounge Power Station',
      isFailover: false
    },
    f3: {
      name: 'Off-Grid Mesh Radio Net & Welfare Check Station',
      category: 'radio',
      primary: 'Anagach Hill Repeater / PMR Channel 7',
      secondary: 'High School Mast Net Controller',
      isFailover: false
    }
  },
  drought: {
    f1: {
      name: 'Scottish Water Bowser Tanker Station',
      category: 'bowser',
      primary: 'Burnfield Car Park (Heavy Tanker Access Hardstanding)',
      secondary: 'Showgrounds Agricultural Bowser Stand',
      isFailover: false
    },
    f2: {
      name: 'Potable Bottled Water Rationing Hub',
      category: 'bottled',
      primary: 'RBLS Legion Main Hall (10L / person / day ration)',
      secondary: 'Town Hall Distribution Desk',
      isFailover: false
    },
    f3: {
      name: 'Agricultural & Livestock Water Draw Point',
      category: 'livestock',
      primary: 'Spey Valley Showgrounds 5000L Mobile Bowser Tank',
      secondary: 'River Spey Dedicated Mobile Pump Point',
      isFailover: false
    }
  },
  unrest: {
    f1: {
      name: 'Public Safety Safe Haven & Sanctuary',
      category: 'sanctuary',
      primary: 'Town Hall Reinforced Complex & Secure Rooms',
      secondary: 'Legion Inner Hall Sanctuary',
      isFailover: false
    },
    f2: {
      name: 'Pedestrian & Traffic Avoidance Bypass',
      category: 'route',
      primary: 'Bypass High Street via Grant Road & Woodside',
      secondary: 'Outer Perimeter Ring Road',
      isFailover: false
    },
    f3: {
      name: 'Police Scotland Liaison Command Link',
      category: 'police',
      primary: 'Aviemore Police Command Control 101 Priority Line',
      secondary: 'Duty Inspector Mobile Command Post',
      isFailover: false
    }
  },
  defence: {
    f1: {
      name: 'Subterranean Reinforced Shelter',
      category: 'shelter',
      primary: 'Grantown Grammar School Reinforced Basement Complex',
      secondary: 'Castle Grant Vaulted Cellars',
      isFailover: false
    },
    f2: {
      name: 'Potable Spring & Gravity-Fed Water Borehole',
      category: 'spring',
      primary: 'Castle Grant Estate Gravity-Fed Spring Tank 1',
      secondary: 'Hillhead Borehole Pump Station',
      isFailover: false
    },
    f3: {
      name: 'Civil Resilience Command Bunker',
      category: 'command',
      primary: 'Grammar School Operations Suite',
      secondary: 'Town Hall Secure Meeting Room',
      isFailover: false
    }
  }
};

const DEFAULT_PRIORITIES: Record<string, { p1: PriorityItem; p2: PriorityItem; p3: PriorityItem }> = {
  wildfire: {
    p1: { title: 'Life Safety & Immediate Evac Corridor', desc: 'Secure primary escape highway and escort vulnerable residents clear of the pine fuel belt.' },
    p2: { title: 'SFRS Water Point Access', desc: 'Maintain unobstructed access to River Spey draw points and high-capacity main hydrants.' },
    p3: { title: 'Livestock & Asset Holding', desc: 'Deploy volunteer trailers to muster horses and livestock at showgrounds field holding zones.' }
  },
  urbanfire: {
    p1: { title: 'Structural Cordon Clearance', desc: 'Establish 150m volunteer safety perimeter clear of high-risk timber buildings and fuel storage.' },
    p2: { title: 'Immediate Warmth Assembly', desc: 'Open designated warmth hall for displaced tenants with hot drinks, blankets, and roll call check-in.' },
    p3: { title: 'Emergency Traffic Bypass', desc: 'Divert non-emergency vehicles through estate relief roads to allow unrestricted appliance access.' }
  },
  flood: {
    p1: { title: 'SEPA Early Warning & Sandbag Deployment', desc: 'Mobilise volunteer teams to distribute council sandbag pallets to low-lying properties.' },
    p2: { title: 'High-Ground Evacuation', desc: 'Escort residents in flood risk zone to designated high-ground refuge above the flood contour line.' },
    p3: { title: 'Water Rescue Boat Slipway', desc: 'Clear debris and secure the slipway for SFRS and volunteer water rescue boat launches.' }
  },
  power: {
    p1: { title: 'Warm Space & Generator Activation', desc: 'Start backup generator at refuge hub to power heating, soup canteen, and phone charging banks.' },
    p2: { title: 'Vulnerable Resident Door-to-Door Checks', desc: 'Dispatch 4x4 volunteer teams with thermal blankets and hot flasks to off-grid steadings.' },
    p3: { title: 'PMR446 Mesh Radio Comms', desc: 'Establish hourly check-in net on PMR Channel 7 / Sub 11 across all village sectors.' }
  },
  drought: {
    p1: { title: 'Potable Bottled Water Distribution', desc: 'Open central distribution hub allocating 10 litres per person per day to affected PWS households.' },
    p2: { title: 'Scottish Water Bowser Tanker Stand', desc: 'Manage access and queuing for heavy water bowser refill stations at council car park.' },
    p3: { title: 'Livestock Trough Water Runs', desc: 'Coordinate mobile bowser trailers to deliver non-potable water to farm field troughs.' }
  },
  unrest: {
    p1: { title: 'Public Safety Avoidance Perimeter', desc: 'Issue immediate community advisory to avoid the central square and shelter indoors.' },
    p2: { title: 'Police Scotland Liaison Direct Channel', desc: 'Establish direct phone and radio link with the duty inspector for verified status updates.' },
    p3: { title: 'Community Hall Safe Haven', desc: 'Provide secure temporary sanctuary for stranded workers and visitors until clear.' }
  },
  defence: {
    p1: { title: 'Potable Spring & Borehole Security', desc: 'Activate gravity-fed estate spring tanks and safeguard borehole supply valves.' },
    p2: { title: 'Subterranean Shelter Readiness', desc: 'Unlock and inspect reinforced grammar school basement complex with dry rations and medical kits.' },
    p3: { title: 'Community Self-Sufficiency Net', desc: 'Audit local bulk food reserves and establish volunteer distribution shifts.' }
  }
};

const DEFAULT_TIMELINES: Record<string, { t0: TimelineItem; t15: TimelineItem; t30: TimelineItem; t60: TimelineItem }> = {
  wildfire: {
    t0: { title: 'Activate Incident Command & Alert Keyholders', desc: 'Notify Community Council leads, unlock Active HQ, and check SFRS liaison status.' },
    t15: { title: 'Broadcast Level 3 Evacuation Alert', desc: 'Issue emergency push broadcast with designated escape route and designated refuge hub.' },
    t30: { title: 'Open Active Refuge & Mobilise 4x4 Teams', desc: 'Hall keyholder turns on generators; volunteer drivers muster for mobility-impaired pick-ups.' },
    t60: { title: 'Moorland Firebreak & Estate Machinery Staging', desc: 'Coordinate tractors with heavy mowers/ploughs to create perimeter buffer breaks.' }
  },
  urbanfire: {
    t0: { title: 'Establish Safe Cordon', desc: 'Assist police/fire in keeping public 150m back from structure.' },
    t15: { title: 'Open Warmth Sanctuary', desc: 'Unlock designated warmth hall, set up kettle boilers, and begin roll-call registration.' },
    t30: { title: 'Appliance Traffic Flow', desc: 'Set up temporary bypass signs to prevent vehicle gridlock on High Street.' },
    t60: { title: 'Emergency Housing Coordination', desc: 'Liaise with local B&Bs and council housing for displaced family accommodation.' }
  },
  flood: {
    t0: { title: 'Receive SEPA Alert & Inspect Watercourses', desc: 'Check river gauges and notify volunteer flood wardens.' },
    t15: { title: 'Unlock Sandbag Depot', desc: 'Highland Roads keyholder releases sandbags; dispatch pallets to vulnerable doors.' },
    t30: { title: 'High-Ground Shelter Open', desc: 'Designated high-ground canteen operational with emergency rations.' },
    t60: { title: 'Check Vulnerable Water Ingress', desc: 'Wardens verify all ground-floor elderly residents have moved upstairs or evacuated.' }
  },
  power: {
    t0: { title: 'Monitor SSEN Outage Map & Grid Status', desc: 'Track estimated restore time. If >4 hrs in sub-zero temps, initiate Warm Space.' },
    t15: { title: 'Start Diesel Generator & Connect Heaters', desc: 'Fire up backup generator at Active Refuge Hub; verify power to charging hub and kitchen.' },
    t30: { title: 'Open Warm Space Canteen', desc: 'Provide hot food, device charging, and welfare support to residents without power.' },
    t60: { title: 'Off-Grid Radio Net Check', desc: 'Radio operators conduct 60-minute check on PMR Channel 7 to log remote household welfare.' }
  },
  drought: {
    t0: { title: 'Log Affected PWS Springs', desc: 'Collate registry of households whose private water wells have run dry.' },
    t15: { title: 'Liaise with Scottish Water', desc: 'Confirm delivery time for static bowser and pallets of bottled water.' },
    t30: { title: 'Open Bottled Distribution Hub', desc: 'Volunteers set up drive-through rationing point at designated distribution car park.' },
    t60: { title: 'Mobile Bowser Farm Deliveries', desc: '4x4 tankers begin runs to outlying livestock holdings.' }
  },
  unrest: {
    t0: { title: 'Police Scotland Channel Sync', desc: 'Establish communication with Local Area Commander on 101 priority line.' },
    t15: { title: 'Issue Safety Notice', desc: 'Send app alert advising locals to stay indoors and keep businesses secured.' },
    t30: { title: 'Secure Community Assets', desc: 'Ensure public halls and facilities are locked to prevent vandalism.' },
    t60: { title: 'Community Welfare Monitoring', desc: 'Check in on shop owners and vulnerable residents in adjacent perimeter.' }
  },
  defence: {
    t0: { title: 'Civil Contingency Net Setup', desc: 'Community resilience team convenes at primary bunker / command room.' },
    t15: { title: 'Inspect Potable Springs & Gravity Lines', desc: 'Verify water valves and gravity pressure from hill boreholes.' },
    t30: { title: 'Subterranean Shelter Unlocked', desc: 'Check ventilation systems, emergency lighting, and medical inventory.' },
    t60: { title: 'Rationing & Security Shift Allocation', desc: 'Assign 12-hour volunteer security and welfare shifts.' }
  }
};

export default function LeaderEmergencyPlanPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const activeCommunityId = useMemo(() => {
    if (!userProfile) return null;
    const impersonating = (userProfile as any)?.impersonating;
    return impersonating?.communityId || userProfile.communityId;
  }, [userProfile]);

  const [activeHazard, setActiveHazard] = useState<HazardType>('wildfire');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isUpdatingAlert, setIsUpdatingAlert] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [hasCopiedPayload, setHasCopiedPayload] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Visibility & Public Portal Link
  const [isPublicOnAboutPage, setIsPublicOnAboutPage] = useState(false);

  // LIVE INCIDENT & ALERT CONTROL STATE (Independent from Plan Document)
  const [currentThreatStatus, setCurrentThreatStatus] = useState<'normal' | 'advisory' | 'incident'>('normal');
  const [activeHazardScenario, setActiveHazardScenario] = useState<string>('wildfire');

  // Official Situation Bulletin State
  const [isNoticeActive, setIsNoticeActive] = useState(false);
  const [noticeHeadline, setNoticeHeadline] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeIssuedBy, setNoticeIssuedBy] = useState('');

  // Township Area Name
  const [townshipName, setTownshipName] = useState('Grantown-on-Spey & Strathspey');

  // Scenario-Specific Facilities Map (Unique per Annexe)
  const [scenarioFacilities, setScenarioFacilities] = useState<ScenarioFacilitiesMap>(DEFAULT_SCENARIO_FACILITIES);

  // Editable Hazard Priorities & Timelines
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES);
  const [timelines, setTimelines] = useState(DEFAULT_TIMELINES);

  // Hazard 1: Wildfire
  const [wfFuels, setWfFuels] = useState('Anagach Pinewoods (1000ha mature Scots Pine) & Estate Moorlands');
  const [wfWind, setWfWind] = useState('East / South-East pinewoods towards town core');
  const [wfHydrants, setWfHydrants] = useState('High Street / The Square main high-pressure hydrants');
  const [wfWater, setWfWater] = useState('River Spey access at Old Spey Bridge hardstanding (Tender Draft Point)');
  const [wfLivestock, setWfLivestock] = useState('Spey Valley Showgrounds Field 4 & Castle Grant Paddocks');

  // Hazard 2: Urban Fire
  const [ufRiskBlocks, setUfRiskBlocks] = useState('High Street Historic Stone & Timber Tenements, Petrol Depot, Heritage Hotels');
  const [ufCordonDist, setUfCordonDist] = useState('150');
  const [ufBypassRoute, setUfBypassRoute] = useState('Bypass via Castle Grant Estate Road & Seafield Avenue');
  const [ufWarmthHub, setUfWarmthHub] = useState('RBLS Legion Main Hall / Strathspey Church Hall');

  // Hazard 3: Flood & Surge
  const [flRiver, setFlRiver] = useState('River Spey & Kylintra Burn spate');
  const [flSepaCode, setFlSepaCode] = useState('Speyside - Grantown Flood Warning Zone (023314)');
  const [flSandbagLoc, setFlSandbagLoc] = useState('Highland Council Depot, Burnfield Car Park');
  const [flSandbagTel, setFlSandbagTel] = useState('07700 900888 (Highland Roads Duty Team)');
  const [flHighGround, setFlHighGround] = useState('Grantown Grammar School (Above 220m contour line)');

  // Hazard 4: Power Outage
  const [poTriggerHours, setPoTriggerHours] = useState('4');
  const [poWarmHours, setPoWarmHours] = useState('08:00 - 22:00 Daily');
  const [poRadioRepeater, setPoRadioRepeater] = useState('Anagach Hill Mast / PMR446 Channel 7 Sub 11');
  const [poGeneratorSpecs, setPoGeneratorSpecs] = useState('25kVA Dual-Fuel Diesel Generator (Powers Canteen, Heating & Charging Banks)');

  // Hazard 5: Water Shortage & Drought
  const [drPwsCount, setDrPwsCount] = useState('120 Rural Steadings (Hill Springs & Wells Dried Up)');
  const [drBowserLoc, setDrBowserLoc] = useState('Burnfield Car Park (Heavy Tanker Access Hardstanding)');
  const [drHoseType, setDrHoseType] = useState('2.5 Inch Storz & Scottish Water Instantaneous Standpipes');
  const [drBottledHub, setDrBottledHub] = useState('RBLS Legion Main Hall (10L Containers per Household/Day)');
  const [drLivestockWater, setDrLivestockWater] = useState('Spey Valley Showgrounds 5000L Mobile Bowser Tank');

  // Hazard 6: Civil Unrest
  const [cuAvoidArea, setCuAvoidArea] = useState('High Street & Town Square Central Core');
  const [cuPoliceLiaison, setCuPoliceLiaison] = useState('Police Scotland Control Desk 101 / Duty Inspector (Aviemore Command)');

  // Hazard 7: Civil Defence
  const [cdWaterSpring, setCdWaterSpring] = useState('Castle Grant Estate Gravity-Fed Spring Tank 1');
  const [cdShelterLoc, setCdShelterLoc] = useState('Grantown Grammar School Reinforced Basement Complex');

  // Community Capability, Asset & Equipment Inventory
  const [ast4x4, setAst4x4] = useState('14 Land Rovers / Pickups on Call with Winches');
  const [astChainsaws, setAstChainsaws] = useState('6 NPTC Certified Forestry Volunteers w/ Chainsaws & PPE');
  const [astGenerators, setAstGenerators] = useState('1x 25kVA Skid, 3x Honda 8kVA Portable Generators');
  const [astRadios, setAstRadios] = useState('8 Licensed PMR446 Mesh & HAM Radio Operators');
  const [astHeavyTractors, setAstHeavyTractors] = useState('4x John Deere / Massey Tractors w/ Ploughs & Heavy Mowers (Firebreaks)');
  const [astArgocatsQuads, setAstArgocatsQuads] = useState('6x Argo-Cats & 10x Estate Quads w/ Tow Trailers for Moorland Evac');

  // Communications
  const [commsHamFreq, setCommsHamFreq] = useState('PMR446 Channel 7 / CTCSS 11 | HAM 2M Call Sign 2M0XYZ (145.500MHz)');
  const [commsNoticeboards, setCommsNoticeboards] = useState('Post Office Window, Pharmacy Outer Board, RBLS Outer Door, Village Hall Board');

  // Registered Volunteers subcollection query
  const volunteersQuery = useMemoFirebase(() => {
    if (!db || !activeCommunityId) return null;
    return collection(db, 'communities', activeCommunityId, 'resilience_volunteers');
  }, [db, activeCommunityId]);
  const { data: registeredVolunteers } = useCollection(volunteersQuery);

  // Fetch Existing Plan from Firestore on mount / community change
  useEffect(() => {
    if (!db || !activeCommunityId) {
      setIsLoadingData(false);
      return;
    }

    const fetchPlan = async () => {
      setIsLoadingData(true);
      try {
        const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
        const planDocSnap = await getDoc(planDocRef);

        if (planDocSnap.exists()) {
          const data = planDocSnap.data() as any;
          if (typeof data.isPublicOnAboutPage === 'boolean') setIsPublicOnAboutPage(data.isPublicOnAboutPage);
          if (data.currentThreatStatus) setCurrentThreatStatus(data.currentThreatStatus);
          if (data.activeHazardScenario) setActiveHazardScenario(data.activeHazardScenario);
          if (data.townshipName) setTownshipName(data.townshipName);

          if (data.officialNotice) {
            setIsNoticeActive(!!data.officialNotice.isActive);
            setNoticeHeadline(data.officialNotice.headline || '');
            setNoticeMessage(data.officialNotice.message || '');
            setNoticeIssuedBy(data.officialNotice.issuedBy || '');
          }

          if (data.scenarioFacilities) {
            setScenarioFacilities((prev) => ({
              ...prev,
              ...data.scenarioFacilities
            }));
          }

          if (data.priorities) setPriorities((prev) => ({ ...prev, ...data.priorities }));
          if (data.timelines) setTimelines((prev) => ({ ...prev, ...data.timelines }));

          if (data.wildfire) {
            setWfFuels(data.wildfire.fuels || wfFuels);
            setWfWind(data.wildfire.windThreat || wfWind);
            setWfHydrants(data.wildfire.hydrants || wfHydrants);
            setWfWater(data.wildfire.waterPoint || wfWater);
            setWfLivestock(data.wildfire.livestockGrounds || wfLivestock);
          }

          if (data.urbanfire) {
            setUfRiskBlocks(data.urbanfire.riskBlocks || ufRiskBlocks);
            setUfCordonDist(data.urbanfire.cordonDist || ufCordonDist);
            setUfBypassRoute(data.urbanfire.bypassRoute || ufBypassRoute);
            setUfWarmthHub(data.urbanfire.warmthHub || ufWarmthHub);
          }

          if (data.flood) {
            setFlRiver(data.flood.river || flRiver);
            setFlSepaCode(data.flood.sepaCode || flSepaCode);
            setFlSandbagLoc(data.flood.sandbagLoc || flSandbagLoc);
            setFlSandbagTel(data.flood.sandbagTel || flSandbagTel);
            setFlHighGround(data.flood.highGround || flHighGround);
          }

          if (data.power) {
            setPoTriggerHours(data.power.triggerHours || poTriggerHours);
            setPoWarmHours(data.power.warmHours || poWarmHours);
            setPoRadioRepeater(data.power.radioRepeater || poRadioRepeater);
            setPoGeneratorSpecs(data.power.generatorSpecs || poGeneratorSpecs);
          }

          if (data.drought) {
            setDrPwsCount(data.drought.pwsCount || drPwsCount);
            setDrBowserLoc(data.drought.bowserLoc || drBowserLoc);
            setDrHoseType(data.drought.hoseType || drHoseType);
            setDrBottledHub(data.drought.bottledHub || drBottledHub);
            setDrLivestockWater(data.drought.livestockWater || drLivestockWater);
          }

          if (data.unrest) {
            setCuAvoidArea(data.unrest.avoidArea || cuAvoidArea);
            setCuPoliceLiaison(data.unrest.policeLiaison || cuPoliceLiaison);
          }

          if (data.defence) {
            setCdWaterSpring(data.defence.waterSpring || cdWaterSpring);
            setCdShelterLoc(data.defence.shelterLoc || cdShelterLoc);
          }

          if (data.assets) {
            setAst4x4(data.assets.fourByFourCount || ast4x4);
            setAstChainsaws(data.assets.chainsaws || astChainsaws);
            setAstGenerators(data.assets.generators || astGenerators);
            setAstRadios(data.assets.radios || astRadios);
            setAstHeavyTractors(data.assets.heavyTractors || astHeavyTractors);
            setAstArgocatsQuads(data.assets.argocatsQuads || astArgocatsQuads);
          }

          if (data.comms) {
            setCommsHamFreq(data.comms.hamPmrFreq || commsHamFreq);
            setCommsNoticeboards(data.comms.noticeboardLocs || commsNoticeboards);
          }
        }
      } catch (err: any) {
        console.error('Error fetching emergency plan:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchPlan();
  }, [db, activeCommunityId]);

  // Handler to update scenario-specific facilities
  const handleScenarioFacilityChange = (
    hazardKey: string,
    facilityKey: 'f1' | 'f2' | 'f3',
    field: 'name' | 'primary' | 'secondary' | 'isFailover',
    value: any
  ) => {
    setScenarioFacilities((prev) => {
      const currentHazard = prev[hazardKey] || DEFAULT_SCENARIO_FACILITIES[hazardKey] || DEFAULT_SCENARIO_FACILITIES.wildfire;
      const currentFac = currentHazard[facilityKey];
      return {
        ...prev,
        [hazardKey]: {
          ...currentHazard,
          [facilityKey]: {
            ...currentFac,
            [field]: value
          }
        }
      };
    });
  };

  // 1. INDEPENDENT ACTION: Save Living Statutory Emergency Plan Document
  const handleSavePlan = async () => {
    if (!db || !activeCommunityId) {
      toast({ title: 'Error', description: 'No active community selected.', variant: 'destructive' });
      return;
    }

    setIsSavingPlan(true);
    try {
      const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
      await setDoc(
        planDocRef,
        {
          communityId: activeCommunityId,
          townshipName,
          isPublicOnAboutPage,
          scenarioFacilities,
          priorities,
          timelines,
          wildfire: {
            fuels: wfFuels,
            windThreat: wfWind,
            escapePrimary: scenarioFacilities.wildfire?.f1?.primary,
            escapeSecondary: scenarioFacilities.wildfire?.f1?.secondary,
            hydrants: wfHydrants,
            waterPoint: wfWater,
            livestockGrounds: wfLivestock
          },
          urbanfire: {
            riskBlocks: ufRiskBlocks,
            cordonDist: ufCordonDist,
            bypassRoute: ufBypassRoute,
            warmthHub: ufWarmthHub
          },
          flood: {
            river: flRiver,
            sepaCode: flSepaCode,
            sandbagLoc: flSandbagLoc,
            sandbagTel: flSandbagTel,
            highGround: flHighGround
          },
          power: {
            triggerHours: poTriggerHours,
            warmHours: poWarmHours,
            radioRepeater: poRadioRepeater,
            generatorSpecs: poGeneratorSpecs
          },
          drought: {
            pwsCount: drPwsCount,
            bowserLoc: drBowserLoc,
            hoseType: drHoseType,
            bottledHub: drBottledHub,
            livestockWater: drLivestockWater
          },
          unrest: {
            avoidArea: cuAvoidArea,
            policeLiaison: cuPoliceLiaison
          },
          defence: {
            waterSpring: cdWaterSpring,
            shelterLoc: cdShelterLoc
          },
          assets: {
            fourByFourCount: ast4x4,
            chainsaws: astChainsaws,
            generators: astGenerators,
            radios: astRadios,
            heavyTractors: astHeavyTractors,
            argocatsQuads: astArgocatsQuads
          },
          comms: {
            hamPmrFreq: commsHamFreq,
            noticeboardLocs: commsNoticeboards
          },
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || 'leader'
        },
        { merge: true }
      );

      toast({
        title: 'Emergency Plan Document Saved',
        description: 'Statutory Plan, Facilities & Inventory saved successfully.'
      });
    } catch (err: any) {
      console.error('Error saving plan:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save emergency plan.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingPlan(false);
    }
  };

  // 2. INDEPENDENT ACTION: Publish / Clear Public Threat Level & Situation Notice
  const handlePublishThreatStatus = async (forcedStatus?: 'normal' | 'advisory' | 'incident') => {
    if (!user || !activeCommunityId) {
      toast({ title: 'Error', description: 'Leader authentication required.', variant: 'destructive' });
      return;
    }

    const targetStatus = forcedStatus || currentThreatStatus;
    setIsUpdatingAlert(true);

    try {
      const res = await updateLiveThreatStatusAction({
        communityId: activeCommunityId,
        threatStatus: targetStatus,
        activeHazardScenario: activeHazardScenario as any,
        officialNotice: {
          headline: noticeHeadline,
          message: noticeMessage,
          issuedBy: noticeIssuedBy || `${townshipName} Community Resilience Lead`,
          isActive: targetStatus !== 'normal'
        },
        userId: user.uid
      });

      if (res.success) {
        if (targetStatus === 'incident') {
          setCurrentThreatStatus('incident');
          setIsNoticeActive(true);
          toast({
            title: '🔴 Critical Red Alert Published!',
            description: `Live Red Emergency Alert is now active on the public page for ${townshipName}.`
          });
        } else if (targetStatus === 'advisory') {
          setCurrentThreatStatus('advisory');
          setIsNoticeActive(true);
          toast({
            title: '🟡 Amber Advisory Published!',
            description: `Live Amber Weather/Hazard Advisory is now active on the public page.`
          });
        } else {
          setCurrentThreatStatus('normal');
          setIsNoticeActive(false);
          toast({
            title: '🟢 Normal Preparedness (All Good)',
            description: `Threat level stood down to Green. Public alert cleared.`
          });
        }
      } else {
        toast({ title: 'Update Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdatingAlert(false);
    }
  };

  // Helper to update priorities
  const handlePriorityChange = (hazard: string, key: 'p1' | 'p2' | 'p3', field: 'title' | 'desc', value: string) => {
    setPriorities((prev) => ({
      ...prev,
      [hazard]: {
        ...prev[hazard],
        [key]: {
          ...prev[hazard]?.[key],
          [field]: value
        }
      }
    }));
  };

  // Helper to update timelines
  const handleTimelineChange = (
    hazard: string,
    key: 't0' | 't15' | 't30' | 't60',
    field: 'title' | 'desc',
    value: string
  ) => {
    setTimelines((prev) => ({
      ...prev,
      [hazard]: {
        ...prev[hazard],
        [key]: {
          ...prev[hazard]?.[key],
          [field]: value
        }
      }
    }));
  };

  // Active scenario facilities currently viewed
  const currentScenarioKey = activeHazard === 'submission' ? 'wildfire' : activeHazard;
  const currentFacilities = scenarioFacilities[currentScenarioKey] || DEFAULT_SCENARIO_FACILITIES[currentScenarioKey] || DEFAULT_SCENARIO_FACILITIES.wildfire;

  // Generate Emergency Broadcast Payload Text dynamically from active scenario facilities
  const broadcastPayload = useMemo(() => {
    let level = 'LEVEL 2 URGENT BROADCAST';
    let title = 'COMMUNITY EMERGENCY NOTICE';
    let body = '';

    const facs = scenarioFacilities[currentScenarioKey] || DEFAULT_SCENARIO_FACILITIES[currentScenarioKey] || DEFAULT_SCENARIO_FACILITIES.wildfire;
    const actF1 = facs.f1.isFailover ? `${facs.f1.secondary} (FAILOVER ACTIVE)` : facs.f1.primary;
    const actF2 = facs.f2.isFailover ? `${facs.f2.secondary} (FAILOVER ACTIVE)` : facs.f2.primary;
    const actF3 = facs.f3.isFailover ? `${facs.f3.secondary} (FAILOVER ACTIVE)` : facs.f3.primary;

    switch (currentScenarioKey) {
      case 'wildfire':
        level = 'LEVEL 3 CRITICAL EMERGENCY BROADCAST';
        title = 'WILDFIRE EVACUATION & ESCAPE CORRIDOR ALERT';
        body = `ACTIVE WILDFIRE THREATENING ${townshipName.toUpperCase()}.\n\n` +
          `• ${facs.f1.name}: ${actF1}\n` +
          `• ${facs.f2.name}: ${actF2}\n` +
          `• ${facs.f3.name}: ${actF3}\n\n` +
          `Please stay clear of high-risk fuel zones. Follow SFRS instructions immediately.`;
        break;
      case 'urbanfire':
        level = 'LEVEL 3 CRITICAL EMERGENCY BROADCAST';
        title = 'STRUCTURAL FIRE & SAFETY CORDON ALERT';
        body = `MAJOR STRUCTURAL FIRE AT ${ufRiskBlocks.toUpperCase()}.\n\n` +
          `• ${facs.f1.name}: ${actF1}\n` +
          `• ${facs.f2.name}: ${actF2}\n` +
          `• ${facs.f3.name}: ${actF3}\n\n` +
          `Allow emergency appliances priority access on all approach roads.`;
        break;
      case 'flood':
        level = 'LEVEL 2 URGENT FLOOD WARNING';
        title = 'SEPA FLOOD WARNING & HIGH GROUND EVACUATION';
        body = `FLOOD ALERT FOR ${townshipName.toUpperCase()} (${flSepaCode}).\n\n` +
          `• ${facs.f1.name}: ${actF1}\n` +
          `• ${facs.f2.name}: ${actF2}\n` +
          `• ${facs.f3.name}: ${actF3}\n\n` +
          `Move valuables and ground-floor belongings to upper levels immediately.`;
        break;
      case 'power':
        level = 'LEVEL 2 URGENT WELFARE NOTICE';
        title = 'PROLONGED POWER OUTAGE - WARM SPACE ACTIVATION';
        body = `GRID POWER OUTAGE EXCEEDS ${poTriggerHours} HOURS.\n\n` +
          `• ${facs.f1.name}: ${actF1} (Hours: ${poWarmHours})\n` +
          `• ${facs.f2.name}: ${actF2}\n` +
          `• ${facs.f3.name}: ${actF3}`;
        break;
      case 'drought':
        level = 'LEVEL 2 WATER SUPPLY ADVISORY';
        title = 'PRIVATE WATER SUPPLY (PWS) & BOTTLED WATER DISTRIBUTION';
        body = `WATER SHORTAGE NOTICE FOR ${drPwsCount}.\n\n` +
          `• ${facs.f1.name}: ${actF1}\n` +
          `• ${facs.f2.name}: ${actF2}\n` +
          `• ${facs.f3.name}: ${actF3}`;
        break;
      case 'unrest':
        level = 'LEVEL 2 PUBLIC SAFETY NOTICE';
        title = 'PUBLIC SAFETY ALERT - AVOIDANCE ZONE';
        body = `SAFETY ADVISORY FOR ${townshipName.toUpperCase()}.\n\n` +
          `• ${facs.f1.name}: ${actF1}\n` +
          `• ${facs.f2.name}: ${actF2}\n` +
          `• ${facs.f3.name}: ${actF3}`;
        break;
      case 'defence':
        level = 'LEVEL 3 STATE EMERGENCY ALERT';
        title = 'CIVIL DEFENCE & EMERGENCY DISTRIBUTION ACTIVE';
        body = `EMERGENCY DISTRIBUTION ACTIVATED FOR ${townshipName.toUpperCase()}.\n\n` +
          `• ${facs.f1.name}: ${actF1}\n` +
          `• ${facs.f2.name}: ${actF2}\n` +
          `• ${facs.f3.name}: ${actF3}`;
        break;
      default:
        body = `Emergency preparedness notice for ${townshipName}. Check your local community hub for live updates.`;
    }

    return { level, title, body };
  }, [
    currentScenarioKey,
    townshipName,
    scenarioFacilities,
    ufRiskBlocks,
    flSepaCode,
    poTriggerHours,
    poWarmHours,
    drPwsCount
  ]);

  const handleCopyPayload = () => {
    const text = `[${broadcastPayload.level}]\n\n${broadcastPayload.title}\n\n${broadcastPayload.body}`;
    navigator.clipboard.writeText(text);
    setHasCopiedPayload(true);
    toast({ title: 'Copied to Clipboard', description: 'Emergency broadcast payload is ready to paste.' });
    setTimeout(() => setHasCopiedPayload(false), 2500);
  };

  // Direct Live Broadcast Action strictly to this community
  const handlePublishLiveBroadcast = async () => {
    if (!user || !activeCommunityId) {
      toast({ title: 'Error', description: 'You must be logged in as a community leader.', variant: 'destructive' });
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await publishCommunityEmergencyBroadcastAction({
        userId: user.uid,
        communityId: activeCommunityId,
        subject: `[EMERGENCY] ${broadcastPayload.title}`,
        message: broadcastPayload.body.replace(/\n/g, '<br/>'),
        sentBy: `${townshipName} Community Resilience Lead`
      });

      if (res.success) {
        toast({
          title: '🚨 Emergency Broadcast Sent!',
          description: `Dispatched strictly to verified members of ${townshipName}.`
        });
        setIsBroadcastModalOpen(false);
      } else {
        toast({
          title: 'Broadcast Failed',
          description: res.error || 'Could not send broadcast.',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      console.error('Error dispatching broadcast:', err);
      toast({ title: 'Error', description: 'Failed to send broadcast.', variant: 'destructive' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handlePrint = () => {
    setActiveHazard('submission');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const currentPriorities = priorities[activeHazard] || DEFAULT_PRIORITIES.wildfire;
  const currentTimeline = timelines[activeHazard] || DEFAULT_TIMELINES.wildfire;

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading Community Emergency Action Plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-3 bg-red-600/90 text-white rounded-2xl shadow-lg shadow-red-950/60 ring-4 ring-red-500/20">
                <ShieldAlert className="h-7 w-7 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline">
                    Community Emergency Action Plan
                  </h1>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[11px] font-mono tracking-wide uppercase px-2.5 py-0.5">
                    Statutory Framework
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-slate-300">
                  Event-Driven Priority Action & Resilience System for Civil Contingencies & Council Submission
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-white gap-2 font-medium shadow-sm"
            >
              <Printer className="h-4 w-4 text-cyan-400" /> Print Master Document
            </Button>

            <Button
              onClick={handleSavePlan}
              disabled={isSavingPlan}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold shadow-lg shadow-emerald-950/40"
            >
              {isSavingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Statutory Plan
            </Button>
          </div>
        </div>

        {/* Global Jurisdiction & Public Portal Settings Bar */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Jurisdiction Name */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <Label className="text-[11px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-400" /> Jurisdiction Area Name
            </Label>
            <Input
              value={townshipName}
              onChange={(e) => setTownshipName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white font-bold h-8 text-xs"
              placeholder="e.g. Grantown-on-Spey & Strathspey"
            />
          </div>

          {/* Public About Page Toggle */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="text-[11px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                {isPublicOnAboutPage ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
                Publish Emergency Portal on About Page
              </Label>
              <p className="text-[10px] text-slate-400">
                {isPublicOnAboutPage ? 'Public "Emergency & Resilience" tab is visible to residents' : 'Hidden from public (Leader Back Office only)'}
              </p>
            </div>
            <Switch
              checked={isPublicOnAboutPage}
              onCheckedChange={setIsPublicOnAboutPage}
              aria-label="Toggle Public Visibility"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INDEPENDENT LIVE THREAT LEVEL & PUBLIC ALERT COMMAND CENTER               */}
      {/* ========================================================================= */}
      <Card className={`border-2 shadow-2xl transition-all ${
        currentThreatStatus === 'incident'
          ? 'border-red-500 bg-gradient-to-r from-red-950/50 via-slate-900 to-slate-950 ring-2 ring-red-500/30'
          : currentThreatStatus === 'advisory'
          ? 'border-amber-500 bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-950 ring-2 ring-amber-500/30'
          : 'border-emerald-500/40 bg-slate-950/80'
      }`}>
        <CardHeader className="pb-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl border shadow-lg ${
                currentThreatStatus === 'incident'
                  ? 'bg-red-600 text-white border-red-400 animate-pulse ring-4 ring-red-500/20'
                  : currentThreatStatus === 'advisory'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-4 ring-amber-500/20'
                  : 'bg-emerald-600 text-white border-emerald-400'
              }`}>
                {currentThreatStatus === 'incident' ? <ShieldAlert className="h-6 w-6" /> :
                 currentThreatStatus === 'advisory' ? <AlertTriangle className="h-6 w-6" /> :
                 <ShieldCheck className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] uppercase font-mono font-bold ${
                    currentThreatStatus === 'incident' ? 'bg-red-600 text-white' :
                    currentThreatStatus === 'advisory' ? 'bg-amber-500 text-slate-950' :
                    'bg-emerald-600 text-white'
                  }`}>
                    {currentThreatStatus === 'incident' ? '🔴 RED ALERT ACTIVE' :
                     currentThreatStatus === 'advisory' ? '🟡 AMBER ADVISORY ACTIVE' :
                     '🟢 GREEN: NORMAL (ALL GOOD)'}
                  </Badge>
                  <span className="text-xs text-slate-400">• Independent Live Threat Control</span>
                </div>
                <CardTitle className="text-lg font-extrabold text-white pt-1">
                  Live Emergency Threat Status & Public Alert Command
                </CardTitle>
              </div>
            </div>

            {/* Quick Stand Down Button if alert is active */}
            {currentThreatStatus !== 'normal' && (
              <Button
                onClick={() => handlePublishThreatStatus('normal')}
                disabled={isUpdatingAlert}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" /> Stand Down to Green (All is Good)
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-6 text-xs text-white">
          {/* Threat Status Selector Buttons */}
          <div className="space-y-2">
            <Label className="font-bold text-slate-300 uppercase tracking-wider">
              1. Select Public Threat Readiness Status:
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Green Option */}
              <button
                type="button"
                onClick={() => setCurrentThreatStatus('normal')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                  currentThreatStatus === 'normal'
                    ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-white">🟢 Green: Normal</span>
                    <span className="text-[10px] text-slate-400">All is good • Standard guide mode</span>
                  </div>
                </div>
                {currentThreatStatus === 'normal' && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
              </button>

              {/* Amber Option */}
              <button
                type="button"
                onClick={() => setCurrentThreatStatus('advisory')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                  currentThreatStatus === 'advisory'
                    ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/40 text-amber-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3.5 w-3.5 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-white">🟡 Amber: Advisory</span>
                    <span className="text-[10px] text-slate-400">Weather / River / Outage alert</span>
                  </div>
                </div>
                {currentThreatStatus === 'advisory' && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
              </button>

              {/* Red Option */}
              <button
                type="button"
                onClick={() => setCurrentThreatStatus('incident')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                  currentThreatStatus === 'incident'
                    ? 'bg-red-950/60 border-red-500 ring-2 ring-red-500/40 text-red-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3.5 w-3.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <div>
                    <span className="block text-xs font-bold text-white">🔴 Red: Active Incident</span>
                    <span className="text-[10px] text-slate-400">Full crisis response & evac</span>
                  </div>
                </div>
                {currentThreatStatus === 'incident' && <Check className="h-4 w-4 text-red-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Active Incident Scenario & Notice Fields (Shown if Amber or Red selected) */}
          {currentThreatStatus !== 'normal' && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-cyan-400" /> Active Disaster Scenario
                  </Label>
                  <Select value={activeHazardScenario} onValueChange={(val: any) => setActiveHazardScenario(val)}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white font-semibold h-9 text-xs">
                      <SelectValue placeholder="Active Scenario" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                      <SelectItem value="wildfire">🌲 Wildfire & Moorland Escape</SelectItem>
                      <SelectItem value="urbanfire">🏢 Urban Structural Fire</SelectItem>
                      <SelectItem value="flood">🌊 River Flooding & Surge</SelectItem>
                      <SelectItem value="power">⚡ Power Outage & Grid Failure</SelectItem>
                      <SelectItem value="drought">💧 Water Shortage & PWS Drought</SelectItem>
                      <SelectItem value="unrest">🛡️ Civil Unrest & Public Safety</SelectItem>
                      <SelectItem value="defence">🪖 Civil Defence & State Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Situation Headline / Title
                  </Label>
                  <Input
                    value={noticeHeadline}
                    onChange={(e) => setNoticeHeadline(e.target.value)}
                    placeholder="e.g. A95 Road Closure & Sandbag Collection Notice"
                    className="font-bold text-xs h-9 bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-200 uppercase tracking-wider">
                  Verified Directions & Facts for Public Portal
                </Label>
                <Textarea
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="Enter official verified facts, road directions, sandbag collection details, or warm space operating hours..."
                  rows={3}
                  className="text-xs bg-slate-900 border-slate-700 text-white leading-relaxed resize-y"
                />
              </div>

              {/* Quick Template Presets */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] font-bold text-slate-400">Quick Templates:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveHazardScenario('wildfire');
                    setNoticeHeadline('Wildfire Evacuation & A95 Corridor Advisory');
                    setNoticeMessage('Active wildfire threatening eastern pine perimeter. Follow designated escape route towards A9. Refuge open at Grammar School.');
                  }}
                  className="text-[10px] h-7 bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                >
                  Wildfire Evacuation
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveHazardScenario('flood');
                    setNoticeHeadline('SEPA Flood Warning & Sandbag Distribution');
                    setNoticeMessage('River Spey at peak spate. Sandbag pallets ready at Burnfield Depot. High-ground shelter open at Grammar School.');
                  }}
                  className="text-[10px] h-7 bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                >
                  Flood & Sandbags
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveHazardScenario('power');
                    setNoticeHeadline('Prolonged Winter Power Cut - Warm Space Open');
                    setNoticeMessage('SSEN reporting grid fault. Community Warm Space active at Grammar School with hot meals, heating, and phone charging.');
                  }}
                  className="text-[10px] h-7 bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                >
                  Power Outage & Warmth
                </Button>
              </div>
            </div>
          )}

          {/* Alert Publish Button */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <p className="text-[11px] text-slate-400">
              {currentThreatStatus === 'normal'
                ? 'Status is currently Normal (Green). Click below to stand down or sync.'
                : `Publishing will activate the ${currentThreatStatus.toUpperCase()} alert and show the "See Alert" button to residents.`}
            </p>

            <Button
              onClick={() => handlePublishThreatStatus()}
              disabled={isUpdatingAlert}
              className={`font-bold text-xs gap-2 shadow-lg ${
                currentThreatStatus === 'incident'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/60'
                  : currentThreatStatus === 'advisory'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-950/60'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
              }`}
            >
              {isUpdatingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              {currentThreatStatus === 'incident' ? '🔴 Publish Live Red Emergency Alert' :
               currentThreatStatus === 'advisory' ? '🟡 Publish Live Amber Advisory' :
               '🟢 Stand Down / Confirm Green (Normal)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HAZARD NAVIGATION TABS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Statutory Action Annexes & Facility Infrastructure
          </h2>
          <span className="text-xs text-muted-foreground">Customize facilities, failovers & timelines for each disaster type</span>
        </div>

        <Tabs value={activeHazard} onValueChange={(val) => setActiveHazard(val as HazardType)} className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl flex min-w-max gap-1.5 h-auto">
              <TabsTrigger
                value="wildfire"
                className="gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <Flame className="h-4 w-4 text-red-400 data-[state=active]:text-white" /> Wildfire
              </TabsTrigger>

              <TabsTrigger
                value="urbanfire"
                className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <Building className="h-4 w-4 text-orange-400 data-[state=active]:text-white" /> Urban Fire
              </TabsTrigger>

              <TabsTrigger
                value="flood"
                className="gap-2 data-[state=active]:bg-cyan-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <Waves className="h-4 w-4 text-cyan-400 data-[state=active]:text-white" /> Flood & Surge
              </TabsTrigger>

              <TabsTrigger
                value="power"
                className="gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <Zap className="h-4 w-4 text-amber-400 data-[state=active]:text-white" /> Power Outage
              </TabsTrigger>

              <TabsTrigger
                value="drought"
                className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <Droplets className="h-4 w-4 text-blue-400 data-[state=active]:text-white" /> Water Shortage
              </TabsTrigger>

              <TabsTrigger
                value="unrest"
                className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-purple-400 data-[state=active]:text-white" /> Civil Unrest
              </TabsTrigger>

              <TabsTrigger
                value="defence"
                className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <Award className="h-4 w-4 text-emerald-400 data-[state=active]:text-white" /> Civil Defence
              </TabsTrigger>

              <TabsTrigger
                value="submission"
                className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs py-2 px-4 rounded-xl transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" /> Living Master Plan
              </TabsTrigger>
            </TabsList>
          </div>

          {/* DYNAMIC SCENARIO-SPECIFIC INFRASTRUCTURE FAILOVER SIMULATOR */}
          {activeHazard !== 'submission' && (
            <Card className="my-6 border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 shadow-xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-800/80 bg-slate-950/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shadow-inner">
                      <Split className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {activeHazard.toUpperCase()} Dedicated Facilities & Dynamic Failovers
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] uppercase font-mono">
                          Unique to {activeHazard}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Tailored primary facilities and secondary failovers for {activeHazard.toUpperCase()} operations.
                      </CardDescription>
                    </div>
                  </div>

                  <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white gap-2 font-bold shadow-lg shadow-red-950/40">
                        <Megaphone className="h-4 w-4" /> Dispatch {activeHazard.toUpperCase()} Broadcast
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl bg-slate-950 border-slate-800 text-white">
                      <DialogHeader>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/40 uppercase font-mono">
                            {broadcastPayload.level}
                          </Badge>
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] gap-1">
                            <Lock className="h-3 w-3" /> Strictly {townshipName}
                          </Badge>
                        </div>
                        <DialogTitle className="text-lg font-bold text-white pt-1">
                          {broadcastPayload.title}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                          This payload incorporates the active {activeHazard} facilities and will be dispatched <strong>strictly</strong> to verified members of this community.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs text-slate-200">
                        <p className="whitespace-pre-wrap leading-relaxed">{broadcastPayload.body}</p>
                      </div>

                      <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between items-center">
                        <Button
                          onClick={handleCopyPayload}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto bg-slate-900 border-slate-700 text-white hover:bg-slate-800 gap-2"
                        >
                          {hasCopiedPayload ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          {hasCopiedPayload ? 'Copied' : 'Copy Text'}
                        </Button>

                        <Button
                          onClick={handlePublishLiveBroadcast}
                          disabled={isBroadcasting}
                          size="sm"
                          className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold gap-2 shadow-lg shadow-red-950/60"
                        >
                          {isBroadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Publish Live to {townshipName}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Facility 1 */}
                <div
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    currentFacilities.f1.isFailover
                      ? 'bg-red-950/30 border-red-500/70 shadow-lg shadow-red-950/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <Input
                      value={currentFacilities.f1.name}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f1', 'name', e.target.value)}
                      className="bg-transparent border-none text-sm font-bold text-white p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-900/50"
                      placeholder="Facility #1 Name"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">Failover:</span>
                      <Switch
                        checked={currentFacilities.f1.isFailover}
                        onCheckedChange={(val) => handleScenarioFacilityChange(currentScenarioKey, 'f1', 'isFailover', val)}
                        aria-label="Toggle Facility 1 Failover"
                      />
                    </div>
                  </div>

                  {/* Primary Box */}
                  <div className={`p-3 rounded-xl border transition-colors space-y-1.5 ${
                    currentFacilities.f1.isFailover ? 'bg-slate-950/50 border-red-900/60 opacity-60' : 'bg-emerald-950/20 border-emerald-500/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${currentFacilities.f1.isFailover ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                        Primary Option
                      </Label>
                      <Badge variant={currentFacilities.f1.isFailover ? 'destructive' : 'default'} className="text-[9px] px-1.5 py-0">
                        {currentFacilities.f1.isFailover ? 'COMPROMISED' : 'ACTIVE / DEFAULT'}
                      </Badge>
                    </div>
                    <Input
                      value={currentFacilities.f1.primary}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f1', 'primary', e.target.value)}
                      placeholder="Primary facility address / route"
                      className="bg-slate-900 border-slate-700 text-xs font-semibold text-white h-8"
                    />
                  </div>

                  {/* Secondary Box */}
                  <div className={`p-3 rounded-xl border transition-colors space-y-1.5 ${
                    currentFacilities.f1.isFailover ? 'bg-amber-950/30 border-amber-500/80 shadow-md ring-1 ring-amber-500/30' : 'bg-slate-950/50 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-400" />
                        Secondary Failover Option
                      </Label>
                      <Badge className={currentFacilities.f1.isFailover ? 'bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0 animate-bounce' : 'bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0'}>
                        {currentFacilities.f1.isFailover ? 'ACTIVATED & IN USE' : 'STANDBY READY'}
                      </Badge>
                    </div>
                    <Input
                      value={currentFacilities.f1.secondary}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f1', 'secondary', e.target.value)}
                      placeholder="Secondary backup facility / route"
                      className="bg-slate-900 border-slate-700 text-xs font-semibold text-white h-8"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 pt-1">
                    Active Target: <span className="font-bold text-white font-mono">{currentFacilities.f1.isFailover ? currentFacilities.f1.secondary : currentFacilities.f1.primary}</span>
                  </p>
                </div>

                {/* Facility 2 */}
                <div
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    currentFacilities.f2.isFailover
                      ? 'bg-red-950/30 border-red-500/70 shadow-lg shadow-red-950/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <Input
                      value={currentFacilities.f2.name}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f2', 'name', e.target.value)}
                      className="bg-transparent border-none text-sm font-bold text-white p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-900/50"
                      placeholder="Facility #2 Name"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">Failover:</span>
                      <Switch
                        checked={currentFacilities.f2.isFailover}
                        onCheckedChange={(val) => handleScenarioFacilityChange(currentScenarioKey, 'f2', 'isFailover', val)}
                        aria-label="Toggle Facility 2 Failover"
                      />
                    </div>
                  </div>

                  {/* Primary Box */}
                  <div className={`p-3 rounded-xl border transition-colors space-y-1.5 ${
                    currentFacilities.f2.isFailover ? 'bg-slate-950/50 border-red-900/60 opacity-60' : 'bg-cyan-950/20 border-cyan-500/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${currentFacilities.f2.isFailover ? 'bg-red-500' : 'bg-cyan-500 animate-pulse'}`} />
                        Primary Option
                      </Label>
                      <Badge variant={currentFacilities.f2.isFailover ? 'destructive' : 'default'} className="text-[9px] px-1.5 py-0">
                        {currentFacilities.f2.isFailover ? 'COMPROMISED' : 'ACTIVE / DEFAULT'}
                      </Badge>
                    </div>
                    <Input
                      value={currentFacilities.f2.primary}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f2', 'primary', e.target.value)}
                      placeholder="Primary facility address"
                      className="bg-slate-900 border-slate-700 text-xs font-semibold text-white h-8"
                    />
                  </div>

                  {/* Secondary Box */}
                  <div className={`p-3 rounded-xl border transition-colors space-y-1.5 ${
                    currentFacilities.f2.isFailover ? 'bg-amber-950/30 border-amber-500/80 shadow-md ring-1 ring-amber-500/30' : 'bg-slate-950/50 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-400" />
                        Secondary Failover Option
                      </Label>
                      <Badge className={currentFacilities.f2.isFailover ? 'bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0 animate-bounce' : 'bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0'}>
                        {currentFacilities.f2.isFailover ? 'ACTIVATED & IN USE' : 'STANDBY READY'}
                      </Badge>
                    </div>
                    <Input
                      value={currentFacilities.f2.secondary}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f2', 'secondary', e.target.value)}
                      placeholder="Secondary backup facility"
                      className="bg-slate-900 border-slate-700 text-xs font-semibold text-white h-8"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 pt-1">
                    Active Target: <span className="font-bold text-white font-mono">{currentFacilities.f2.isFailover ? currentFacilities.f2.secondary : currentFacilities.f2.primary}</span>
                  </p>
                </div>

                {/* Facility 3 */}
                <div
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    currentFacilities.f3.isFailover
                      ? 'bg-red-950/30 border-red-500/70 shadow-lg shadow-red-950/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <Input
                      value={currentFacilities.f3.name}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f3', 'name', e.target.value)}
                      className="bg-transparent border-none text-sm font-bold text-white p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-900/50"
                      placeholder="Facility #3 Name"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">Failover:</span>
                      <Switch
                        checked={currentFacilities.f3.isFailover}
                        onCheckedChange={(val) => handleScenarioFacilityChange(currentScenarioKey, 'f3', 'isFailover', val)}
                        aria-label="Toggle Facility 3 Failover"
                      />
                    </div>
                  </div>

                  {/* Primary Box */}
                  <div className={`p-3 rounded-xl border transition-colors space-y-1.5 ${
                    currentFacilities.f3.isFailover ? 'bg-slate-950/50 border-red-900/60 opacity-60' : 'bg-amber-950/20 border-amber-500/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${currentFacilities.f3.isFailover ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
                        Primary Option
                      </Label>
                      <Badge variant={currentFacilities.f3.isFailover ? 'destructive' : 'default'} className="text-[9px] px-1.5 py-0">
                        {currentFacilities.f3.isFailover ? 'COMPROMISED' : 'ACTIVE / DEFAULT'}
                      </Badge>
                    </div>
                    <Input
                      value={currentFacilities.f3.primary}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f3', 'primary', e.target.value)}
                      placeholder="Primary facility address / post"
                      className="bg-slate-900 border-slate-700 text-xs font-semibold text-white h-8"
                    />
                  </div>

                  {/* Secondary Box */}
                  <div className={`p-3 rounded-xl border transition-colors space-y-1.5 ${
                    currentFacilities.f3.isFailover ? 'bg-amber-950/30 border-amber-500/80 shadow-md ring-1 ring-amber-500/30' : 'bg-slate-950/50 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-400" />
                        Secondary Failover Option
                      </Label>
                      <Badge className={currentFacilities.f3.isFailover ? 'bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0 animate-bounce' : 'bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0'}>
                        {currentFacilities.f3.isFailover ? 'ACTIVATED & IN USE' : 'STANDBY READY'}
                      </Badge>
                    </div>
                    <Input
                      value={currentFacilities.f3.secondary}
                      onChange={(e) => handleScenarioFacilityChange(currentScenarioKey, 'f3', 'secondary', e.target.value)}
                      placeholder="Secondary backup facility / post"
                      className="bg-slate-900 border-slate-700 text-xs font-semibold text-white h-8"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 pt-1">
                    Active Target: <span className="font-bold text-white font-mono">{currentFacilities.f3.isFailover ? currentFacilities.f3.secondary : currentFacilities.f3.primary}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* EDITABLE PRIORITIES CARDS (P1, P2, P3) */}
          {activeHazard !== 'submission' && (
            <div className="space-y-4 my-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> Critical Priorities for {activeHazard.toUpperCase()}
                </h3>
                <Badge variant="outline" className="text-[10px]">Auto-saved with Plan</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* P1 Card */}
                <Card className="border-red-500/40 bg-card shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-bold">1</span>
                      Critical Priority #1
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2">
                    <Input
                      value={currentPriorities.p1.title}
                      onChange={(e) => handlePriorityChange(activeHazard, 'p1', 'title', e.target.value)}
                      placeholder="Priority #1 Title"
                      className="font-bold text-xs h-8"
                    />
                    <Textarea
                      value={currentPriorities.p1.desc}
                      onChange={(e) => handlePriorityChange(activeHazard, 'p1', 'desc', e.target.value)}
                      placeholder="Operational instructions..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </CardContent>
                </Card>

                {/* P2 Card */}
                <Card className="border-amber-500/40 bg-card shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold">2</span>
                      Critical Priority #2
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2">
                    <Input
                      value={currentPriorities.p2.title}
                      onChange={(e) => handlePriorityChange(activeHazard, 'p2', 'title', e.target.value)}
                      placeholder="Priority #2 Title"
                      className="font-bold text-xs h-8"
                    />
                    <Textarea
                      value={currentPriorities.p2.desc}
                      onChange={(e) => handlePriorityChange(activeHazard, 'p2', 'desc', e.target.value)}
                      placeholder="Operational instructions..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </CardContent>
                </Card>

                {/* P3 Card */}
                <Card className="border-cyan-500/40 bg-card shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black text-cyan-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs font-bold">3</span>
                      Critical Priority #3
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2">
                    <Input
                      value={currentPriorities.p3.title}
                      onChange={(e) => handlePriorityChange(activeHazard, 'p3', 'title', e.target.value)}
                      placeholder="Priority #3 Title"
                      className="font-bold text-xs h-8"
                    />
                    <Textarea
                      value={currentPriorities.p3.desc}
                      onChange={(e) => handlePriorityChange(activeHazard, 'p3', 'desc', e.target.value)}
                      placeholder="Operational instructions..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 1. WILDFIRE */}
          <TabsContent value="wildfire" className="space-y-6 mt-4">
            <Card className="border-red-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-red-950/40 via-background to-background border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                  <Flame className="h-5 w-5" /> Annex A: Rural Wildfire & Moorland Escape Plan
                </CardTitle>
                <CardDescription>
                  Pinewood fuels, wind corridors, SFRS draft points, and holding zones for livestock.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">High-Risk Vegetation & Fuel Belt</Label>
                    <Input
                      value={wfFuels}
                      onChange={(e) => setWfFuels(e.target.value)}
                      placeholder="e.g. Anagach Pinewoods (1000ha Scots Pine)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Prevailing Wind Threat Corridor</Label>
                    <Input
                      value={wfWind}
                      onChange={(e) => setWfWind(e.target.value)}
                      placeholder="e.g. East / South-East pinewoods towards town"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">SFRS Water Hydrant Locations</Label>
                    <Input
                      value={wfHydrants}
                      onChange={(e) => setWfHydrants(e.target.value)}
                      placeholder="High Street & The Square hydrants"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Open Water Draw Point (River Spey/Loch)</Label>
                    <Input
                      value={wfWater}
                      onChange={(e) => setWfWater(e.target.value)}
                      placeholder="River Spey old bridge hardstanding"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Livestock & Horse Holding Grounds</Label>
                    <Input
                      value={wfLivestock}
                      onChange={(e) => setWfLivestock(e.target.value)}
                      placeholder="Spey Valley Showgrounds Field 4"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 2. URBAN FIRE */}
          <TabsContent value="urbanfire" className="space-y-6 mt-4">
            <Card className="border-orange-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-950/40 via-background to-background border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-500">
                  <Building className="h-5 w-5" /> Annex B: Urban Structural Fire & Historic Building Plan
                </CardTitle>
                <CardDescription>
                  Tenement risk zones, safety cordons, traffic bypasses, and temporary warmth shelters.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold">High-Risk Structural Blocks / Tenements</Label>
                    <Input
                      value={ufRiskBlocks}
                      onChange={(e) => setUfRiskBlocks(e.target.value)}
                      placeholder="High Street Historic Tenements & Hotels"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Volunteer Cordon Distance (Metres)</Label>
                    <Input
                      value={ufCordonDist}
                      onChange={(e) => setUfCordonDist(e.target.value)}
                      placeholder="150"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Traffic Bypass Route for Appliances</Label>
                    <Input
                      value={ufBypassRoute}
                      onChange={(e) => setUfBypassRoute(e.target.value)}
                      placeholder="Bypass via Castle Grant estate road"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Temporary Short-Term Warmth Assembly</Label>
                    <Input
                      value={ufWarmthHub}
                      onChange={(e) => setUfWarmthHub(e.target.value)}
                      placeholder="RBLS Legion Main Hall / Church Hall"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 3. FLOOD & SURGE */}
          <TabsContent value="flood" className="space-y-6 mt-4">
            <Card className="border-cyan-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-cyan-950/40 via-background to-background border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-cyan-500">
                  <Waves className="h-5 w-5" /> Annex C: River Flooding & Coastal Surge Plan
                </CardTitle>
                <CardDescription>
                  Watercourses, SEPA flood codes, sandbag depots & keyholders, and high ground refuges.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Primary Watercourse Threat</Label>
                    <Input
                      value={flRiver}
                      onChange={(e) => setFlRiver(e.target.value)}
                      placeholder="River Spey & Kylintra Burn spate"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">SEPA Flood Warning Area Name & Code</Label>
                    <Input
                      value={flSepaCode}
                      onChange={(e) => setFlSepaCode(e.target.value)}
                      placeholder="Speyside - Grantown (023314)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Sandbag Depot Location</Label>
                    <Input
                      value={flSandbagLoc}
                      onChange={(e) => setFlSandbagLoc(e.target.value)}
                      placeholder="Council Depot, Burnfield Car Park"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Sandbag Depot Keyholder Contact</Label>
                    <Input
                      value={flSandbagTel}
                      onChange={(e) => setFlSandbagTel(e.target.value)}
                      placeholder="07700 900888 (Highland Roads Team)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">High Ground Evacuation Refuge</Label>
                    <Input
                      value={flHighGround}
                      onChange={(e) => setFlHighGround(e.target.value)}
                      placeholder="Grammar School (Above 220m contour)"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 4. POWER OUTAGE */}
          <TabsContent value="power" className="space-y-6 mt-4">
            <Card className="border-amber-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-amber-950/40 via-background to-background border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
                  <Zap className="h-5 w-5" /> Annex D: Prolonged Power Outage & Grid Failure Plan
                </CardTitle>
                <CardDescription>
                  Trigger hours, Warm Space canteen hours, diesel generator specs, and PMR446 mesh radio check-ins.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Outage Trigger Threshold (Hours)</Label>
                    <Input
                      value={poTriggerHours}
                      onChange={(e) => setPoTriggerHours(e.target.value)}
                      placeholder="4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Warm Space Canteen Operating Hours</Label>
                    <Input
                      value={poWarmHours}
                      onChange={(e) => setPoWarmHours(e.target.value)}
                      placeholder="08:00 - 22:00 Daily"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Off-Grid PMR446 Channel / Mast</Label>
                    <Input
                      value={poRadioRepeater}
                      onChange={(e) => setPoRadioRepeater(e.target.value)}
                      placeholder="Anagach Hill Mast / PMR446 Ch 7 Sub 11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold">Generator & Charging Bank Specifications</Label>
                  <Input
                    value={poGeneratorSpecs}
                    onChange={(e) => setPoGeneratorSpecs(e.target.value)}
                    placeholder="25kVA Dual-Fuel Diesel Generator (Powers Heating, Canteen & Charging)"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 5. WATER SHORTAGE & DROUGHT */}
          <TabsContent value="drought" className="space-y-6 mt-4">
            <Card className="border-blue-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-950/40 via-background to-background border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-500">
                  <Droplets className="h-5 w-5" /> Annex E: Water Shortage & Private Water Supplies (PWS)
                </CardTitle>
                <CardDescription>
                  PWS property count, Scottish Water bowser refill points, bottled water rationing, and livestock tanks.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Properties on Private Water Supplies (PWS)</Label>
                    <Input
                      value={drPwsCount}
                      onChange={(e) => setDrPwsCount(e.target.value)}
                      placeholder="120 Rural Steadings (Hill Springs Dry)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Scottish Water Bowser Refill Station</Label>
                    <Input
                      value={drBowserLoc}
                      onChange={(e) => setDrBowserLoc(e.target.value)}
                      placeholder="Burnfield Car Park Hardstanding"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Tanker Standpipe & Couplings</Label>
                    <Input
                      value={drHoseType}
                      onChange={(e) => setDrHoseType(e.target.value)}
                      placeholder="2.5 Inch Storz & Instantaneous"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Potable Bottled Water Rationing Hub</Label>
                    <Input
                      value={drBottledHub}
                      onChange={(e) => setDrBottledHub(e.target.value)}
                      placeholder="RBLS Legion Main Hall (10L/day/person)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Livestock Trough Water Support</Label>
                    <Input
                      value={drLivestockWater}
                      onChange={(e) => setDrLivestockWater(e.target.value)}
                      placeholder="Spey Valley Showgrounds 5000L Bowser"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 6. CIVIL UNREST */}
          <TabsContent value="unrest" className="space-y-6 mt-4">
            <Card className="border-purple-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-950/40 via-background to-background border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-purple-500">
                  <ShieldCheck className="h-5 w-5" /> Annex F: Civil Unrest & Police Scotland Liaison
                </CardTitle>
                <CardDescription>
                  Avoidance perimeters, safe sanctuaries, and direct police control room channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Affected Sector / Avoidance Perimeter</Label>
                    <Input
                      value={cuAvoidArea}
                      onChange={(e) => setCuAvoidArea(e.target.value)}
                      placeholder="High Street & Town Square Core"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Police Scotland Liaison Direct Channel</Label>
                    <Input
                      value={cuPoliceLiaison}
                      onChange={(e) => setCuPoliceLiaison(e.target.value)}
                      placeholder="Control Desk 101 / Duty Inspector"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 7. CIVIL DEFENCE */}
          <TabsContent value="defence" className="space-y-6 mt-4">
            <Card className="border-emerald-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-950/40 via-background to-background border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-500">
                  <Award className="h-5 w-5" /> Annex G: Civil Defence & State Emergency Distribution
                </CardTitle>
                <CardDescription>
                  Gravity-fed hill springs, reinforced subterranean shelters, and bulk food rationing.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Potable Spring Borehole / Gravity Source</Label>
                    <Input
                      value={cdWaterSpring}
                      onChange={(e) => setCdWaterSpring(e.target.value)}
                      placeholder="Castle Grant Estate Spring Tank 1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Reinforced Subterranean Shelter Location</Label>
                    <Input
                      value={cdShelterLoc}
                      onChange={(e) => setCdShelterLoc(e.target.value)}
                      placeholder="Grammar School Reinforced Basement Complex"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 8. MASTER STATUTORY PRINT VIEW */}
          <TabsContent value="submission" className="space-y-6 mt-4">
            <Card className="border-amber-500/50 shadow-xl bg-card">
              <CardHeader className="border-b bg-amber-500/10 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[10px] uppercase font-mono">
                      Statutory Output
                    </Badge>
                    <CardTitle className="text-xl font-bold mt-1">
                      Living Emergency Action Plan Document
                    </CardTitle>
                    <CardDescription>
                      Full consolidated master document ready for submission to Highland Council, Police Scotland, and SFRS.
                    </CardDescription>
                  </div>
                  <Button onClick={() => window.print()} className="gap-2 font-bold shadow-md">
                    <Printer className="h-4 w-4" /> Print Document (PDF)
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="rounded-2xl border bg-muted/20 p-6 font-mono text-xs space-y-6 leading-relaxed">
                  <div className="border-b pb-4 space-y-1">
                    <h3 className="text-lg font-bold text-foreground">COMMUNITY EMERGENCY ACTION PLAN (CEAP)</h3>
                    <p className="text-muted-foreground">Jurisdiction: {townshipName} | Status: Official Living Document</p>
                    <p className="text-muted-foreground text-[10px]">
                      Generated: {new Date().toLocaleDateString('en-GB')} | Platform: Community Hub Emergency Resilience Engine
                    </p>
                  </div>

                  {/* Official Notice if active */}
                  {currentThreatStatus !== 'normal' && (
                    <div className="p-3 bg-red-950/20 border border-red-500/40 rounded space-y-1">
                      <p className="font-bold text-red-400 uppercase">CURRENT OFFICIAL SITUATION NOTICE:</p>
                      <p className="font-bold text-foreground">{noticeHeadline}</p>
                      <p className="text-muted-foreground">{noticeMessage}</p>
                      <p className="text-[10px] text-muted-foreground italic">Issued by: {noticeIssuedBy}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">1. SCENARIO-SPECIFIC CRITICAL FACILITIES & FAILOVERS</h4>
                    {Object.entries(scenarioFacilities).map(([key, facs]) => (
                      <div key={key} className="pl-2 border-l-2 border-primary/40 space-y-0.5">
                        <p className="font-bold uppercase text-primary">• {key.toUpperCase()}:</p>
                        <p className="pl-2">1. {facs.f1.name}: {facs.f1.isFailover ? facs.f1.secondary + ' [FAILOVER]' : facs.f1.primary}</p>
                        <p className="pl-2">2. {facs.f2.name}: {facs.f2.isFailover ? facs.f2.secondary + ' [FAILOVER]' : facs.f2.primary}</p>
                        <p className="pl-2">3. {facs.f3.name}: {facs.f3.isFailover ? facs.f3.secondary + ' [FAILOVER]' : facs.f3.primary}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">2. CRITICAL HAZARD OPERATIONAL PROTOCOLS</h4>
                    <p>• Wildfire Fuel Belt: {wfFuels} | Water Draw: {wfWater} | Livestock: {wfLivestock}</p>
                    <p>• Structural Urban Fire Cordon: {ufCordonDist}m | Bypass: {ufBypassRoute} | Warmth: {ufWarmthHub}</p>
                    <p>• River & Flood Spate: {flRiver} ({flSepaCode}) | Sandbags: {flSandbagLoc} (Tel: {flSandbagTel}) | High Ground: {flHighGround}</p>
                    <p>• Grid Outage Warm Space: {scenarioFacilities.power?.f1?.primary} ({poWarmHours}) | Generator: {poGeneratorSpecs} | Net: {poRadioRepeater}</p>
                    <p>• Water Shortage: {drPwsCount} | Bowser: {drBowserLoc} | Bottled Hub: {drBottledHub}</p>
                    <p>• Public Safety: Avoid {cuAvoidArea} | Police Scotland Liaison: {cuPoliceLiaison}</p>
                    <p>• Civil Defence: Spring: {cdWaterSpring} | Shelter: {cdShelterLoc}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">3. COMMUNITY ASSET & CAPABILITY REGISTER</h4>
                    <p>• 4x4 Vehicles & Winches: {ast4x4}</p>
                    <p>• Forestry Chainsaw Teams: {astChainsaws}</p>
                    <p>• Mobile Diesel Generators: {astGenerators}</p>
                    <p>• PMR446 / HAM Operators: {astRadios}</p>
                    <p>• Heavy Agricultural Tractors & Ploughs: {astHeavyTractors}</p>
                    <p>• Estate Argo-Cats & Quads: {astArgocatsQuads}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">4. COMMUNICATIONS & CELLULAR BLACKOUT NET</h4>
                    <p>• Radio Net Frequencies: {commsHamFreq}</p>
                    <p>• Weatherproof Physical Noticeboards: {commsNoticeboards}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* OPERATIONAL TIMELINE (0 - 6 HOURS) */}
      {activeHazard !== 'submission' && (
        <Card className="border shadow-md">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Operational Response Timeline (0 – 6 Hours)
                </CardTitle>
                <CardDescription className="text-xs">
                  Event-specific protocol milestones for {activeHazard.toUpperCase()}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize font-mono">
                {activeHazard} Response
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* T+0m */}
            <div className="p-3.5 rounded-xl border bg-card space-y-2">
              <span className="text-xs font-black text-red-500 uppercase tracking-wider">T+00 Minutes</span>
              <Input
                value={currentTimeline.t0.title}
                onChange={(e) => handleTimelineChange(activeHazard, 't0', 'title', e.target.value)}
                placeholder="T+00 Action Title"
                className="font-bold text-xs h-8"
              />
              <Textarea
                value={currentTimeline.t0.desc}
                onChange={(e) => handleTimelineChange(activeHazard, 't0', 'desc', e.target.value)}
                placeholder="Instructions..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* T+15m */}
            <div className="p-3.5 rounded-xl border bg-card space-y-2">
              <span className="text-xs font-black text-amber-500 uppercase tracking-wider">T+15 Minutes</span>
              <Input
                value={currentTimeline.t15.title}
                onChange={(e) => handleTimelineChange(activeHazard, 't15', 'title', e.target.value)}
                placeholder="T+15 Action Title"
                className="font-bold text-xs h-8"
              />
              <Textarea
                value={currentTimeline.t15.desc}
                onChange={(e) => handleTimelineChange(activeHazard, 't15', 'desc', e.target.value)}
                placeholder="Instructions..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* T+30m */}
            <div className="p-3.5 rounded-xl border bg-card space-y-2">
              <span className="text-xs font-black text-cyan-500 uppercase tracking-wider">T+30 Minutes</span>
              <Input
                value={currentTimeline.t30.title}
                onChange={(e) => handleTimelineChange(activeHazard, 't30', 'title', e.target.value)}
                placeholder="T+30 Action Title"
                className="font-bold text-xs h-8"
              />
              <Textarea
                value={currentTimeline.t30.desc}
                onChange={(e) => handleTimelineChange(activeHazard, 't30', 'desc', e.target.value)}
                placeholder="Instructions..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* T+60m */}
            <div className="p-3.5 rounded-xl border bg-card space-y-2">
              <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">T+60 Minutes</span>
              <Input
                value={currentTimeline.t60.title}
                onChange={(e) => handleTimelineChange(activeHazard, 't60', 'title', e.target.value)}
                placeholder="T+60 Action Title"
                className="font-bold text-xs h-8"
              />
              <Textarea
                value={currentTimeline.t60.desc}
                onChange={(e) => handleTimelineChange(activeHazard, 't60', 'desc', e.target.value)}
                placeholder="Instructions..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* CAPABILITY & ASSET REGISTER + COMMUNITY VOLUNTEER ROSTER */}
      <Card className="border shadow-md">
        <CardHeader className="bg-muted/30 border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-500" />
                Community Asset, Machinery & Volunteer Skill Register
              </CardTitle>
              <CardDescription className="text-xs">
                Local volunteer equipment inventory & resident volunteer registrations.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Users2 className="h-3 w-3 text-primary" /> {registeredVolunteers?.length || 0} Registered Volunteers
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold">4x4 Vehicles & Winches</Label>
              <Input
                value={ast4x4}
                onChange={(e) => setAst4x4(e.target.value)}
                placeholder="14 Land Rovers / Pickups"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold">Accredited Chainsaw Leads</Label>
              <Input
                value={astChainsaws}
                onChange={(e) => setAstChainsaws(e.target.value)}
                placeholder="6 NPTC Certified Volunteers"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold">Mobile Generators (kVA)</Label>
              <Input
                value={astGenerators}
                onChange={(e) => setAstGenerators(e.target.value)}
                placeholder="1x 25kVA, 3x 8kVA portable"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold">Off-Grid Radio Operators</Label>
              <Input
                value={astRadios}
                onChange={(e) => setAstRadios(e.target.value)}
                placeholder="8 Licensed PMR446 / HAM"
              />
            </div>
          </div>

          <Separator />

          {/* Heavy Agricultural & Estate Machinery */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Tractor className="h-3.5 w-3.5 text-emerald-500" /> Heavy Agricultural & Estate Machinery (Firebreaks & Evacuation)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-bold">Heavy Tractors w/ Ploughs & Mowers</Label>
                <Input
                  value={astHeavyTractors}
                  onChange={(e) => setAstHeavyTractors(e.target.value)}
                  placeholder="4x John Deere / Massey Tractors"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">Argo-Cats, 8-Wheelers & Quad Fleets</Label>
                <Input
                  value={astArgocatsQuads}
                  onChange={(e) => setAstArgocatsQuads(e.target.value)}
                  placeholder="6x Argo-Cats & 10x Estate Quads"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Communications Redundancy */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <RadioTower className="h-3.5 w-3.5 text-cyan-500" /> Communications Redundancy & "Black Start" Comms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-bold">Off-Grid Radio Channels & HAM Call Signs</Label>
                <Input
                  value={commsHamFreq}
                  onChange={(e) => setCommsHamFreq(e.target.value)}
                  placeholder="PMR446 Channel 7 / Sub 11 | HAM 2M (145.500MHz)"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">Weatherproof Physical Noticeboard Locations</Label>
                <Input
                  value={commsNoticeboards}
                  onChange={(e) => setCommsNoticeboards(e.target.value)}
                  placeholder="Post Office, Pharmacy, Village Hall Board"
                />
              </div>
            </div>
          </div>

          {/* Registered Community Volunteer Roster */}
          {registeredVolunteers && registeredVolunteers.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users2 className="h-3.5 w-3.5 text-primary" /> Registered Local Community Volunteers ({registeredVolunteers.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {registeredVolunteers.map((vol: any) => (
                    <div key={vol.id} className="p-3 rounded-xl border bg-muted/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span>{vol.userName || 'Community Resident'}</span>
                        {vol.phone && <span className="text-muted-foreground font-mono">{vol.phone}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {vol.skills?.map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 bg-background">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      {vol.equipmentNotes && (
                        <p className="text-[11px] text-muted-foreground italic pt-1">&ldquo;{vol.equipmentNotes}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
