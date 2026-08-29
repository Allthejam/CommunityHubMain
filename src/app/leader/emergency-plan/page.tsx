'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
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
  XCircle,
  Plus,
  Trash2,
  Edit3,
  UserPlus,
  HeartHandshake,
  KeyRound,
  Key,
  History,
  Search,
  Filter,
  Download,
  AlertCircle,
  Calendar,
  FileCheck,
  ListChecks,
  CheckSquare2,
  Square,
  PlusCircle,
  RotateCcw,
  ArrowUpRight,
  ExternalLink,
  BookmarkCheck
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
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/rich-text-editor';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import {
  publishCommunityEmergencyBroadcastAction,
  updateLiveThreatStatusAction,
  certifyEmergencyPlanAction,
  publishEmergencyMessageAction,
  retractEmergencyMessageAction,
  archiveEmergencyMessageAction,
  standDownEmergencyAndArchiveBulletinsAction,
  logEmergencyAuditAction,
  EmergencyMessage,
  EmergencyAuditLogEntry,
  EmergencyMessageLevel,
  ScenarioFacilitiesMap,
  ScenarioFacilityItem,
  WildfireHazardArea,
  WildfireAssetItem,
  WildfireContactItem,
  WildfireTimelineStage,
  WildfireSafeguardingItem,
  KeyholderItem,
  ScenarioLiaisonItem,
  ScenarioLiaisonsMap,
  ScenarioTimelineStage,
  ScenarioTimelinesMap
} from '@/lib/actions/emergencyPlanActions';
import {
  IncidentSopPhase,
  IncidentSopTask,
  ScenarioSopsMap,
  DEFAULT_SCENARIO_SOPS,
  EvacuationTransportPartner,
  EvacuationCollectionPoint,
  DEFAULT_EVACUATION_PARTNERS,
  DEFAULT_COLLECTION_POINTS,
  TransportVehicleType,
  TransportReadinessStatus,
  RoadAccessibilityTier
} from '@/lib/types/emergencySop';
import { Bus, Car, Phone } from 'lucide-react';

type HazardType = 'wildfire' | 'urbanfire' | 'flood' | 'power' | 'drought' | 'unrest' | 'defence' | 'evacuation' | 'submission' | 'messages' | 'audit';

const DEFAULT_SCENARIO_LIAISONS: ScenarioLiaisonsMap = {
  wildfire: [
    { id: 'wf-1', role: 'Community Wildfire Lead', agencyOrName: '', telephone: '', notes: '' },
    { id: 'wf-2', role: 'SFRS Fire Station Liaison', agencyOrName: '', telephone: '', notes: '' },
    { id: 'wf-3', role: 'Estate Factor / Land Manager', agencyOrName: '', telephone: '', notes: '' },
    { id: 'wf-4', role: 'Head Gamekeeper / Moorland Lead', agencyOrName: '', telephone: '', notes: '' }
  ],
  flood: [
    { id: 'fl-1', role: 'Community Flood Warden', agencyOrName: '', telephone: '', notes: '' },
    { id: 'fl-2', role: 'SEPA Flood Warning Liaison', agencyOrName: '', telephone: '', notes: '' },
    { id: 'fl-3', role: 'Local Council Roads & Sandbags', agencyOrName: '', telephone: '', notes: '' },
    { id: 'fl-4', role: 'River Bailiff / Fishery Board', agencyOrName: '', telephone: '', notes: '' }
  ],
  power: [
    { id: 'po-1', role: 'Community Power & Warmth Lead', agencyOrName: '', telephone: '', notes: '' },
    { id: 'po-2', role: 'Electricity Network Liaison', agencyOrName: '', telephone: '', notes: '' },
    { id: 'po-3', role: 'Care Home & Vulnerable Lead', agencyOrName: '', telephone: '', notes: '' },
    { id: 'po-4', role: 'Telecoms & Off-Grid Radio Lead', agencyOrName: '', telephone: '', notes: '' }
  ],
  urbanfire: [
    { id: 'uf-1', role: 'Urban Resilience & Rest Hub Lead', agencyOrName: '', telephone: '', notes: '' },
    { id: 'uf-2', role: 'SFRS Incident Command Liaison', agencyOrName: '', telephone: '', notes: '' },
    { id: 'uf-3', role: 'Local Council Housing / Homeless', agencyOrName: '', telephone: '', notes: '' },
    { id: 'uf-4', role: 'Property Factors / Landlords', agencyOrName: '', telephone: '', notes: '' }
  ],
  drought: [
    { id: 'dr-1', role: 'Community Water Resilience Lead', agencyOrName: '', telephone: '', notes: '' },
    { id: 'dr-2', role: 'Scottish Water Emergency Response', agencyOrName: '', telephone: '', notes: '' },
    { id: 'dr-3', role: 'Private Water Supplies (PWS) Rep', agencyOrName: '', telephone: '', notes: '' },
    { id: 'dr-4', role: 'Agricultural Livestock Water Lead', agencyOrName: '', telephone: '', notes: '' }
  ],
  unrest: [
    { id: 'cu-1', role: 'Community Council Chair', agencyOrName: '', telephone: '', notes: '' },
    { id: 'cu-2', role: 'Police Scotland Area Inspector', agencyOrName: '', telephone: '', notes: '' },
    { id: 'cu-3', role: 'Youth & Community Liaison', agencyOrName: '', telephone: '', notes: '' },
    { id: 'cu-4', role: 'High Street Merchants Lead', agencyOrName: '', telephone: '', notes: '' }
  ],
  defence: [
    { id: 'cd-1', role: 'Community Resilience Gold Lead', agencyOrName: '', telephone: '', notes: '' },
    { id: 'cd-2', role: 'Local Council Emergency Planning', agencyOrName: '', telephone: '', notes: '' },
    { id: 'cd-3', role: 'Emergency Shelter Operations Lead', agencyOrName: '', telephone: '', notes: '' },
    { id: 'cd-4', role: 'Emergency Communications (RAYNET/HAM)', agencyOrName: '', telephone: '', notes: '' }
  ]
};

const DEFAULT_KEYHOLDERS: KeyholderItem[] = [
  {
    id: 'kh-1',
    facilityOrAsset: '',
    category: 'Emergency Shelter / Warmth Hub',
    primaryName: '',
    primaryPhone: '',
    backupName: '',
    backupPhone: '',
    keyLocationNotes: ''
  },
  {
    id: 'kh-2',
    facilityOrAsset: '',
    category: 'Hydrants & Water Infrastructure',
    primaryName: '',
    primaryPhone: '',
    backupName: '',
    backupPhone: '',
    keyLocationNotes: ''
  },
  {
    id: 'kh-3',
    facilityOrAsset: '',
    category: 'Estate Gates & Heavy Machinery Access',
    primaryName: '',
    primaryPhone: '',
    backupName: '',
    backupPhone: '',
    keyLocationNotes: ''
  },
  {
    id: 'kh-4',
    facilityOrAsset: '',
    category: 'Flood Defence & Equipment Depot',
    primaryName: '',
    primaryPhone: '',
    backupName: '',
    backupPhone: '',
    keyLocationNotes: ''
  }
];

const VOLUNTEER_SKILL_OPTIONS = [
  { id: '4x4', label: '4x4 Vehicle with Winch / Tow Bar' },
  { id: 'tractor', label: 'Agricultural Tractor / Heavy Machinery' },
  { id: 'chainsaw', label: 'NPTC Certified Chainsaw Operator' },
  { id: 'generator', label: 'Portable Generator / Power Equipment' },
  { id: 'radio', label: 'HAM / PMR446 Radio Communications' },
  { id: 'firstaid', label: 'First Aid / Medical / Nursing Background' },
  { id: 'canteen', label: 'Community Canteen / Food Prep Lead' },
  { id: 'marshal', label: 'Evacuation Marshal / Door-to-Door Lead' }
];

const DEFAULT_WILDFIRE_ASSETS: WildfireAssetItem[] = [
  {
    id: 'asset-1',
    category: 'Firebreaks',
    name: '',
    description: ''
  },
  {
    id: 'asset-2',
    category: 'Water Abstraction',
    name: '',
    description: ''
  },
  {
    id: 'asset-3',
    category: 'All-Terrain Transport',
    name: '',
    description: ''
  },
  {
    id: 'asset-4',
    category: 'Temporary Livestock Holding',
    name: '',
    description: ''
  }
];

interface PriorityItem {
  title: string;
  desc: string;
}

interface TimelineItem {
  title: string;
  desc: string;
}

const DEFAULT_WILDFIRE_AREAS: WildfireHazardArea[] = [
  {
    id: 'area-1',
    title: '',
    fuelType: '',
    windThreat: ''
  }
];

const DEFAULT_WILDFIRE_CONTACTS: WildfireContactItem[] = [
  {
    id: 'c-1',
    role: 'Community Resilience Coordinator',
    name: '',
    telephone: '',
    notes: ''
  },
  {
    id: 'c-2',
    role: 'SFRS Fire Station Incident Lead',
    name: '',
    telephone: '',
    notes: ''
  },
  {
    id: 'c-3',
    role: 'Local Estates Office / Land Factor',
    name: '',
    telephone: '',
    notes: ''
  },
  {
    id: 'c-4',
    role: 'Head Gamekeeper / Moorland Patrol',
    name: '',
    telephone: '',
    notes: ''
  }
];

const DEFAULT_WILDFIRE_STAGES: WildfireTimelineStage[] = [
  {
    id: 'stage-1',
    timeTag: 'T+0 MINS',
    title: 'Activate Incident Command & 999 Callout',
    desc: 'Notify Community Council leads, unlock Active HQ, and check SFRS liaison status.'
  },
  {
    id: 'stage-2',
    timeTag: 'T+15 MINS',
    title: 'Broadcast Level 3 Alert & Firebreaks',
    desc: 'Issue emergency push broadcast with escape route. Contact estate tractor operators for firebreak deployment.'
  },
  {
    id: 'stage-3',
    timeTag: 'T+30 MINS',
    title: 'Open Refuge Hub & Mobilise 4x4 Teams',
    desc: 'Hall keyholder turns on generators; volunteer 4x4 drivers muster for mobility-impaired resident pick-ups.'
  },
  {
    id: 'stage-4',
    timeTag: 'T+60 MINS',
    title: 'Joint Handover with SFRS Commander',
    desc: 'Brief incoming SFRS Incident Commander on community assets, open water draft points, and evacuated headcount.'
  }
];

const DEFAULT_WILDFIRE_SAFEGUARDING: WildfireSafeguardingItem[] = [
  {
    id: 'sg-1',
    title: 'Priority Evacuation List Protocol',
    description: 'Community Resilience Volunteers maintain a confidential priority check-in list for elderly, wheelchair-bound, or off-grid residents living along forested fringes. In a Level 3 Wildfire event, 4x4 volunteer teams are dispatched immediately to assist with early evacuation before smoke limits road visibility.',
    category: 'protocol'
  },
  {
    id: 'sg-2',
    title: 'Free Home Fire Safety Visit (HFSV) Referrals',
    description: 'Under SFRS Priority 3, community leaders can refer vulnerable households for free Home Fire Safety Visits, where firefighters fit long-life interlinked smoke alarms, test heating appliances, and assess perimeter vegetation clearance.',
    category: 'hfsv'
  }
];

const DEFAULT_SCENARIO_FACILITIES: ScenarioFacilitiesMap = {
  wildfire: {
    f1: {
      name: 'Evacuation Corridor / Escape Highway',
      category: 'route',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f2: {
      name: 'Evacuation Refuge & Shelter Hub',
      category: 'hub',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f3: {
      name: 'Incident Command Post',
      category: 'command',
      primary: '',
      secondary: '',
      isFailover: false
    }
  },
  urbanfire: {
    f1: {
      name: 'Traffic Bypass & Cordon Corridor',
      category: 'route',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f2: {
      name: 'Immediate Warmth & Family Assembly Hub',
      category: 'hub',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f3: {
      name: 'Forward Fire & Rescue Appliance Staging',
      category: 'command',
      primary: '',
      secondary: '',
      isFailover: false
    }
  },
  flood: {
    f1: {
      name: 'High-Ground Evacuation Refuge (>220m Contour)',
      category: 'hub',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f2: {
      name: 'Council Sandbag Collection Depot',
      category: 'depot',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f3: {
      name: 'Emergency Flood Warden Command Desk',
      category: 'command',
      primary: '',
      secondary: '',
      isFailover: false
    }
  },
  power: {
    f1: {
      name: 'Warm Space Hub & Soup Canteen (Generator Powered)',
      category: 'warmth',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f2: {
      name: 'Device Charging & Thermal Blanket Bank',
      category: 'charging',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f3: {
      name: 'Off-Grid Mesh Radio Net & Welfare Check Station',
      category: 'radio',
      primary: '',
      secondary: '',
      isFailover: false
    }
  },
  drought: {
    f1: {
      name: 'Scottish Water Bowser Tanker Station',
      category: 'bowser',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f2: {
      name: 'Potable Bottled Water Rationing Hub',
      category: 'bottled',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f3: {
      name: 'Agricultural & Livestock Water Draw Point',
      category: 'livestock',
      primary: '',
      secondary: '',
      isFailover: false
    }
  },
  unrest: {
    f1: {
      name: 'Public Safety Safe Haven & Sanctuary',
      category: 'sanctuary',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f2: {
      name: 'Pedestrian & Traffic Avoidance Bypass',
      category: 'route',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f3: {
      name: 'Police Scotland Liaison Command Link',
      category: 'police',
      primary: '',
      secondary: '',
      isFailover: false
    }
  },
  defence: {
    f1: {
      name: 'Subterranean Reinforced Shelter',
      category: 'shelter',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f2: {
      name: 'Potable Spring & Gravity-Fed Water Borehole',
      category: 'spring',
      primary: '',
      secondary: '',
      isFailover: false
    },
    f3: {
      name: 'Civil Resilience Command Bunker',
      category: 'command',
      primary: '',
      secondary: '',
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

const DEFAULT_TIMELINES_MAP: ScenarioTimelinesMap = {
  wildfire: [
    { id: 'wf-t0', timeTag: 'T+00 MINS', title: 'Activate Incident Command & Alert Keyholders', desc: 'Notify Community Council leads, unlock Active HQ, and check SFRS liaison status.' },
    { id: 'wf-t15', timeTag: 'T+15 MINS', title: 'Broadcast Level 3 Evacuation Alert', desc: 'Issue emergency push broadcast with designated escape route and designated refuge hub.' },
    { id: 'wf-t30', timeTag: 'T+30 MINS', title: 'Open Active Refuge & Mobilise 4x4 Teams', desc: 'Hall keyholder turns on generators; volunteer drivers muster for mobility-impaired pick-ups.' },
    { id: 'wf-t60', timeTag: 'T+60 MINS', title: 'Moorland Firebreak & Estate Machinery Staging', desc: 'Coordinate tractors with heavy mowers/ploughs to create perimeter buffer breaks.' }
  ],
  urbanfire: [
    { id: 'uf-t0', timeTag: 'T+00 MINS', title: 'Establish Safe Cordon', desc: 'Assist police/fire in keeping public 150m back from structure.' },
    { id: 'uf-t15', timeTag: 'T+15 MINS', title: 'Open Warmth Sanctuary', desc: 'Unlock designated warmth hall, set up kettle boilers, and begin roll-call registration.' },
    { id: 'uf-t30', timeTag: 'T+30 MINS', title: 'Appliance Traffic Flow', desc: 'Set up temporary bypass signs to prevent vehicle gridlock on High Street.' },
    { id: 'uf-t60', timeTag: 'T+60 MINS', title: 'Emergency Housing Coordination', desc: 'Liaise with local B&Bs and council housing for displaced family accommodation.' }
  ],
  flood: [
    { id: 'fl-t0', timeTag: 'T+00 MINS', title: 'Receive SEPA Alert & Inspect Watercourses', desc: 'Check river gauges and notify volunteer flood wardens.' },
    { id: 'fl-t15', timeTag: 'T+15 MINS', title: 'Unlock Sandbag Depot', desc: 'Highland Roads keyholder releases sandbags; dispatch pallets to vulnerable doors.' },
    { id: 'fl-t30', timeTag: 'T+30 MINS', title: 'High-Ground Shelter Open', desc: 'Designated high-ground canteen operational with emergency rations.' },
    { id: 'fl-t60', timeTag: 'T+60 MINS', title: 'Check Vulnerable Water Ingress', desc: 'Wardens verify all ground-floor elderly residents have moved upstairs or evacuated.' }
  ],
  power: [
    { id: 'po-t0', timeTag: 'T+00 MINS', title: 'Monitor SSEN Outage Map & Grid Status', desc: 'Track estimated restore time. If >4 hrs in sub-zero temps, initiate Warm Space.' },
    { id: 'po-t15', timeTag: 'T+15 MINS', title: 'Start Diesel Generator & Connect Heaters', desc: 'Fire up backup generator at Active Refuge Hub; verify power to charging hub and kitchen.' },
    { id: 'po-t30', timeTag: 'T+30 MINS', title: 'Open Warm Space Canteen', desc: 'Provide hot food, device charging, and welfare support to residents without power.' },
    { id: 'po-t60', timeTag: 'T+60 MINS', title: 'Off-Grid Radio Net Check', desc: 'Radio operators conduct 60-minute check on PMR Channel 7 to log remote household welfare.' }
  ],
  drought: [
    { id: 'dr-t0', timeTag: 'T+00 MINS', title: 'Log Affected PWS Springs', desc: 'Collate registry of households whose private water wells have run dry.' },
    { id: 'dr-t15', timeTag: 'T+15 MINS', title: 'Liaise with Scottish Water', desc: 'Confirm delivery time for static bowser and pallets of bottled water.' },
    { id: 'dr-t30', timeTag: 'T+30 MINS', title: 'Open Bottled Distribution Hub', desc: 'Volunteers set up drive-through rationing point at designated distribution car park.' },
    { id: 'dr-t60', timeTag: 'T+60 MINS', title: 'Mobile Bowser Farm Deliveries', desc: '4x4 tankers begin runs to outlying livestock holdings.' }
  ],
  unrest: [
    { id: 'cu-t0', timeTag: 'T+00 MINS', title: 'Police Scotland Channel Sync', desc: 'Establish communication with Local Area Commander on 101 priority line.' },
    { id: 'cu-t15', timeTag: 'T+15 MINS', title: 'Issue Safety Notice', desc: 'Send app alert advising locals to stay indoors and keep businesses secured.' },
    { id: 'cu-t30', timeTag: 'T+30 MINS', title: 'Secure Community Assets', desc: 'Ensure public halls and facilities are locked to prevent vandalism.' },
    { id: 'cu-t60', timeTag: 'T+60 MINS', title: 'Community Welfare Monitoring', desc: 'Check in on shop owners and vulnerable residents in adjacent perimeter.' }
  ],
  defence: [
    { id: 'cd-t0', timeTag: 'T+00 MINS', title: 'Civil Contingency Net Setup', desc: 'Community resilience team convenes at primary bunker / command room.' },
    { id: 'cd-t15', timeTag: 'T+15 MINS', title: 'Inspect Potable Springs & Gravity Lines', desc: 'Verify water valves and gravity pressure from hill boreholes.' },
    { id: 'cd-t30', timeTag: 'T+30 MINS', title: 'Subterranean Shelter Unlocked', desc: 'Check ventilation systems, emergency lighting, and medical inventory.' },
    { id: 'cd-t60', timeTag: 'T+60 MINS', title: 'Rationing & Security Shift Allocation', desc: 'Assign 12-hour volunteer security and welfare shifts.' }
  ]
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

  // Real-time Community Doc for ownership check
  const communityDocRef = useMemoFirebase(() => (activeCommunityId && db ? doc(db, 'communities', activeCommunityId) : null), [activeCommunityId, db]);
  const { data: communityDoc } = useDoc<any>(communityDocRef);

  // Granular Role-Based Permissions Resolution
  const isUnrestrictedLeader = useMemo(() => {
    if (!user || !userProfile) return false;
    if (userProfile.isPresident || (userProfile as any)?.permissions?.isCommunityCreator) return true;
    if (communityDoc?.creatorId === user.uid || communityDoc?.presidentId === user.uid) return true;
    return false;
  }, [user, userProfile, communityDoc]);

  const permissions = useMemo(() => {
    if (isUnrestrictedLeader) {
      return {
        canViewPlan: true,
        canEditPlan: true,
        canSendMessages: true,
        canViewAudit: true,
        canUpdateCertification: true,
      };
    }
    const commPerms = (userProfile as any)?.communityRoles?.[activeCommunityId]?.permissions || (userProfile as any)?.permissions || {};
    return {
      canViewPlan: commPerms.emergencyCanViewPlan ?? true,
      canEditPlan: commPerms.emergencyCanEditPlan ?? commPerms.actionManageCommunities ?? false,
      canSendMessages: commPerms.emergencyCanSendMessages ?? commPerms.canSendEmergencyBroadcast ?? false,
      canViewAudit: commPerms.emergencyCanViewAudit ?? commPerms.viewAuditLog ?? false,
      canUpdateCertification: commPerms.emergencyCanUpdateCertification ?? commPerms.actionManageCommunities ?? false,
    };
  }, [isUnrestrictedLeader, userProfile, activeCommunityId]);

  // Real-time Messages Collection Listener
  const messagesQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return query(collection(db, `communities/${activeCommunityId}/emergency_messages`), orderBy('createdAt', 'desc'), limit(50));
  }, [activeCommunityId, db]);
  const { data: emergencyMessagesList } = useCollection<EmergencyMessage>(messagesQuery);

  // Real-time Audit Logs Collection Listener
  const auditQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return query(collection(db, `communities/${activeCommunityId}/emergency_audit_logs`), orderBy('timestamp', 'desc'), limit(100));
  }, [activeCommunityId, db]);
  const { data: auditLogsList } = useCollection<EmergencyAuditLogEntry>(auditQuery);

  const [activeHazard, setActiveHazard] = useState<HazardType>('wildfire');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isUpdatingAlert, setIsUpdatingAlert] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [hasCopiedPayload, setHasCopiedPayload] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Live Situation Message Composer State
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgLevel, setMsgLevel] = useState<EmergencyMessageLevel>('warning');
  const [msgCategory, setMsgCategory] = useState<string>('general');
  const [msgAuthorName, setMsgAuthorName] = useState('');
  const [msgAuthorRole, setMsgAuthorRole] = useState('Incident Commander / Lead');
  const [isPublishingMessage, setIsPublishingMessage] = useState(false);
  const [isRetractingMessage, setIsRetractingMessage] = useState(false);
  const [retractReasonInput, setRetractReasonInput] = useState('');
  const [isRetractDialogOpen, setIsRetractDialogOpen] = useState(false);

  // Stand Down Incident & Bulk Bulletin Archive State
  const [isStandDownDialogOpen, setIsStandDownDialogOpen] = useState(false);
  const [isStandingDown, setIsStandingDown] = useState(false);
  const [standDownIssueAllClear, setStandDownIssueAllClear] = useState(true);
  const [standDownAllClearTitle, setStandDownAllClearTitle] = useState('🟢 ALL CLEAR: Emergency Incident Stood Down');
  const [standDownAllClearBody, setStandDownAllClearBody] = useState('Official incident stand-down. Emergency response services have stood down. Road cordons are open and community facilities have returned to regular schedule.');
  const [bulletinFilter, setBulletinFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Audit Search & Filter State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterType, setAuditFilterType] = useState<string>('ALL');

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
  const [townshipName, setTownshipName] = useState('Local Community');

  // Scenario-Specific Facilities Map (Unique per Annexe)
  const [scenarioFacilities, setScenarioFacilities] = useState<ScenarioFacilitiesMap>(DEFAULT_SCENARIO_FACILITIES);

  // Editable Hazard Priorities & Dynamic Timelines Map
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES);
  const [timelinesMap, setTimelinesMap] = useState<ScenarioTimelinesMap>(DEFAULT_TIMELINES_MAP);

  // Living Plan Certification & Audit Lifecycle
  const [lastReviewedAt, setLastReviewedAt] = useState<any>(null);
  const [reviewedByName, setReviewedByName] = useState<string>('');
  const [reviewedByRole, setReviewedByRole] = useState<string>('Community Leader / Resilience Lead');
  const [nextReviewDueAt, setNextReviewDueAt] = useState<any>(null);
  const [lsoEndorsement, setLsoEndorsement] = useState<any>(null);
  const [isCertifyModalOpen, setIsCertifyModalOpen] = useState(false);
  const [isCertifying, setIsCertifying] = useState(false);
  const [certifierNameInput, setCertifierNameInput] = useState('');
  const [certifierRoleInput, setCertifierRoleInput] = useState('Community Resilience Coordinator');

  // Hazard 1: Wildfire Core Data
  const [wfFuels, setWfFuels] = useState('');
  const [wfWind, setWfWind] = useState('');
  const [wfHydrants, setWfHydrants] = useState('');
  const [wfWater, setWfWater] = useState('');
  const [wfLivestock, setWfLivestock] = useState('');

  // Dynamic Wildfire Arrays (with + Add and Delete)
  const [wfHazardAreas, setWfHazardAreas] = useState<WildfireHazardArea[]>(DEFAULT_WILDFIRE_AREAS);
  const [wfContactList, setWfContactList] = useState<WildfireContactItem[]>(DEFAULT_WILDFIRE_CONTACTS);
  const [wfTimelineStages, setWfTimelineStages] = useState<WildfireTimelineStage[]>(DEFAULT_WILDFIRE_STAGES);
  const [wfSafeguardingList, setWfSafeguardingList] = useState<WildfireSafeguardingItem[]>(DEFAULT_WILDFIRE_SAFEGUARDING);

  // Wildfire Contacts Matrix (Fallback / Single Lead)
  const [wfCoordName, setWfCoordName] = useState('');
  const [wfCoordTel, setWfCoordTel] = useState('');
  const [wfEstateName, setWfEstateName] = useState('');
  const [wfEstateTel, setWfEstateTel] = useState('');
  const [wfKeeperName, setWfKeeperName] = useState('');
  const [wfKeeperTel, setWfKeeperTel] = useState('');
  const [wfStationName, setWfStationName] = useState('');
  const [wfStationTel, setWfStationTel] = useState('');

  // Scenario-Specific Multi-Agency Liaisons State & Handlers
  const [scenarioLiaisons, setScenarioLiaisons] = useState<ScenarioLiaisonsMap>(DEFAULT_SCENARIO_LIAISONS);

  const currentLiaisons = useMemo(() => {
    return scenarioLiaisons[activeHazard] || DEFAULT_SCENARIO_LIAISONS[activeHazard] || [];
  }, [scenarioLiaisons, activeHazard]);

  const handleAddScenarioLiaison = (hazard: string) => {
    const newLiaison: ScenarioLiaisonItem = {
      id: `liaison-${Date.now()}`,
      role: 'Agency / Community Specialist',
      agencyOrName: '',
      telephone: '',
      notes: ''
    };
    setScenarioLiaisons((prev) => ({
      ...prev,
      [hazard]: [...(prev[hazard] || DEFAULT_SCENARIO_LIAISONS[hazard] || []), newLiaison]
    }));
  };

  const handleUpdateScenarioLiaison = (hazard: string, id: string, field: keyof ScenarioLiaisonItem, value: string) => {
    setScenarioLiaisons((prev) => ({
      ...prev,
      [hazard]: (prev[hazard] || DEFAULT_SCENARIO_LIAISONS[hazard] || []).map((l) =>
        l.id === id ? { ...l, [field]: value } : l
      )
    }));
  };

  const handleDeleteScenarioLiaison = (hazard: string, id: string) => {
    setScenarioLiaisons((prev) => ({
      ...prev,
      [hazard]: (prev[hazard] || DEFAULT_SCENARIO_LIAISONS[hazard] || []).filter((l) => l.id !== id)
    }));
  };

  // Keyholders & Infrastructure Access Register State & Handlers
  const [keyholdersList, setKeyholdersList] = useState<KeyholderItem[]>(DEFAULT_KEYHOLDERS);

  const handleAddKeyholder = () => {
    const newKh: KeyholderItem = {
      id: `kh-${Date.now()}`,
      facilityOrAsset: 'New Community Facility / Access Gate / Hydrant Cache',
      category: 'Building / Shelter',
      primaryName: '',
      primaryPhone: '',
      backupName: '',
      backupPhone: '',
      keyLocationNotes: ''
    };
    setKeyholdersList((prev) => [...prev, newKh]);
  };

  const handleUpdateKeyholder = (id: string, field: keyof KeyholderItem, value: string) => {
    setKeyholdersList((prev) =>
      prev.map((k) => (k.id === id ? { ...k, [field]: value } : k))
    );
  };

  const handleDeleteKeyholder = (id: string) => {
    setKeyholdersList((prev) => prev.filter((k) => k.id !== id));
  };

  // SFRS Community Asset Register (Dynamic List + Fallback)
  const [wfAssetList, setWfAssetList] = useState<WildfireAssetItem[]>(DEFAULT_WILDFIRE_ASSETS);
  const [wfAssetTractors, setWfAssetTractors] = useState('');
  const [wfAssetWater, setWfAssetWater] = useState('');
  const [wfAssetBowsers, setWfAssetBowsers] = useState('');
  const [wfAssetPastures, setWfAssetPastures] = useState('');

  // Section 2: Dynamic Wildfire Assets Handlers
  const handleAddAssetItem = () => {
    const newAsset: WildfireAssetItem = {
      id: `asset-${Date.now()}`,
      category: 'Machinery / Equipment',
      name: 'New Community Machinery / Water Point',
      description: ''
    };
    setWfAssetList((prev) => [...prev, newAsset]);
  };

  const handleUpdateAssetItem = (id: string, field: keyof WildfireAssetItem, value: string) => {
    setWfAssetList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleDeleteAssetItem = (id: string) => {
    setWfAssetList((prev) => prev.filter((a) => a.id !== id));
  };

  // Volunteer Manual Management State & Handlers
  const [isAddVolModalOpen, setIsAddVolModalOpen] = useState(false);
  const [volNameInput, setVolNameInput] = useState('');
  const [volOperatorInput, setVolOperatorInput] = useState('');
  const [volPhoneInput, setVolPhoneInput] = useState('');
  const [volSelectedSkills, setVolSelectedSkills] = useState<string[]>([]);
  const [volNotesInput, setVolNotesInput] = useState('');
  const [isSavingVol, setIsSavingVol] = useState(false);

  const handleToggleVolSkill = (skillLabel: string) => {
    setVolSelectedSkills((prev) =>
      prev.includes(skillLabel) ? prev.filter((s) => s !== skillLabel) : [...prev, skillLabel]
    );
  };

  const handleManualSaveVolunteer = async () => {
    if (!db || !activeCommunityId) return;
    if (!volNameInput.trim()) {
      toast({ title: 'Contact Name Required', description: 'Please enter the primary contact name.', variant: 'destructive' });
      return;
    }

    setIsSavingVol(true);
    try {
      await addDoc(collection(db, 'communities', activeCommunityId, 'resilience_volunteers'), {
        userName: volNameInput.trim(),
        contactName: volNameInput.trim(),
        operatorName: volOperatorInput.trim(),
        phone: volPhoneInput.trim(),
        skills: volSelectedSkills,
        equipmentNotes: volNotesInput.trim(),
        registeredAt: serverTimestamp(),
        source: 'leader_manual'
      });

      toast({
        title: 'Volunteer Added to Register',
        description: `${volNameInput} has been added to the community resilience register.`
      });

      setVolNameInput('');
      setVolOperatorInput('');
      setVolPhoneInput('');
      setVolSelectedSkills([]);
      setVolNotesInput('');
      setIsAddVolModalOpen(false);
    } catch (e: any) {
      console.error('Error adding volunteer:', e);
      toast({ title: 'Error', description: e.message || 'Failed to add volunteer.', variant: 'destructive' });
    } finally {
      setIsSavingVol(false);
    }
  };

  const handleDeleteVolunteer = async (volId: string, volName: string) => {
    if (!db || !activeCommunityId || !volId) return;
    try {
      await deleteDoc(doc(db, 'communities', activeCommunityId, 'resilience_volunteers', volId));
      toast({
        title: 'Volunteer Removed',
        description: `${volName || 'Volunteer'} was removed from the register.`
      });
    } catch (e: any) {
      console.error('Error removing volunteer:', e);
      toast({ title: 'Error', description: e.message || 'Failed to remove volunteer.', variant: 'destructive' });
    }
  };

  // Section 1: Dynamic Hazard Areas Handlers
  const handleAddHazardArea = () => {
    const newArea: WildfireHazardArea = {
      id: `area-${Date.now()}`,
      title: 'New High-Risk Fuel Belt / Moorland Zone',
      fuelType: '',
      windThreat: ''
    };
    setWfHazardAreas((prev) => [...prev, newArea]);
  };

  const handleUpdateHazardArea = (id: string, field: keyof WildfireHazardArea, value: string) => {
    setWfHazardAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleDeleteHazardArea = (id: string) => {
    setWfHazardAreas((prev) => prev.filter((a) => a.id !== id));
  };

  // Section 3: Dynamic Coordinator Contacts Handlers
  const handleAddContact = () => {
    const newContact: WildfireContactItem = {
      id: `c-${Date.now()}`,
      role: 'Emergency Liaison / Specialist',
      name: '',
      telephone: '',
      notes: ''
    };
    setWfContactList((prev) => [...prev, newContact]);
  };

  const handleUpdateContact = (id: string, field: keyof WildfireContactItem, value: string) => {
    setWfContactList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteContact = (id: string) => {
    setWfContactList((prev) => prev.filter((c) => c.id !== id));
  };

  // Section 4: Dynamic Timeline Stages Handlers
  const handleAddTimelineStage = () => {
    const newStage: WildfireTimelineStage = {
      id: `stage-${Date.now()}`,
      timeTag: `T+${(wfTimelineStages.length + 1) * 30} MINS`,
      title: 'Follow-Up Operational Phase',
      desc: 'Operational actions executed during this stage.'
    };
    setWfTimelineStages((prev) => [...prev, newStage]);
  };

  const handleUpdateTimelineStage = (id: string, field: keyof WildfireTimelineStage, value: string) => {
    setWfTimelineStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleDeleteTimelineStage = (id: string) => {
    setWfTimelineStages((prev) => prev.filter((s) => s.id !== id));
  };

  // Section 5: Dynamic Safeguarding Handlers
  const handleAddSafeguardingItem = () => {
    const newItem: WildfireSafeguardingItem = {
      id: `sg-${Date.now()}`,
      title: 'New Vulnerable Safeguarding Protocol',
      description: '',
      category: 'custom'
    };
    setWfSafeguardingList((prev) => [...prev, newItem]);
  };

  const handleUpdateSafeguardingItem = (id: string, field: keyof WildfireSafeguardingItem, value: string) => {
    setWfSafeguardingList((prev) =>
      prev.map((sg) => (sg.id === id ? { ...sg, [field]: value } : sg))
    );
  };

  const handleDeleteSafeguardingItem = (id: string) => {
    setWfSafeguardingList((prev) => prev.filter((sg) => sg.id !== id));
  };

  // Hazard 2: Urban Fire
  const [ufRiskBlocks, setUfRiskBlocks] = useState('');
  const [ufCordonDist, setUfCordonDist] = useState('150');
  const [ufBypassRoute, setUfBypassRoute] = useState('');
  const [ufWarmthHub, setUfWarmthHub] = useState('');

  // Hazard 3: Flood & Surge
  const [flRiver, setFlRiver] = useState('');
  const [flSepaCode, setFlSepaCode] = useState('');
  const [flSandbagLoc, setFlSandbagLoc] = useState('');
  const [flSandbagTel, setFlSandbagTel] = useState('');
  const [flHighGround, setFlHighGround] = useState('');

  // Hazard 4: Power Outage
  const [poTriggerHours, setPoTriggerHours] = useState('4');
  const [poWarmHours, setPoWarmHours] = useState('');
  const [poRadioRepeater, setPoRadioRepeater] = useState('');
  const [poGeneratorSpecs, setPoGeneratorSpecs] = useState('');

  // Hazard 5: Water Shortage & Drought
  const [drPwsCount, setDrPwsCount] = useState('');
  const [drBowserLoc, setDrBowserLoc] = useState('');
  const [drHoseType, setDrHoseType] = useState('');
  const [drBottledHub, setDrBottledHub] = useState('');
  const [drLivestockWater, setDrLivestockWater] = useState('');

  // Hazard 6: Civil Unrest
  const [cuAvoidArea, setCuAvoidArea] = useState('');
  const [cuPoliceLiaison, setCuPoliceLiaison] = useState('');

  // Hazard 7: Civil Defence
  const [cdWaterSpring, setCdWaterSpring] = useState('');
  const [cdShelterLoc, setCdShelterLoc] = useState('');

  // Community Capability, Asset & Equipment Inventory
  const [ast4x4, setAst4x4] = useState('');
  const [astChainsaws, setAstChainsaws] = useState('');
  const [astGenerators, setAstGenerators] = useState('');
  const [astRadios, setAstRadios] = useState('');
  const [astHeavyTractors, setAstHeavyTractors] = useState('');
  const [astArgocatsQuads, setAstArgocatsQuads] = useState('');

  // Communications
  const [commsHamFreq, setCommsHamFreq] = useState('');
  const [commsNoticeboards, setCommsNoticeboards] = useState('');

  // Scenario-Specific Operational Notes & Guidance (Unique per scenario)
  const [scenarioNotes, setScenarioNotes] = useState<Record<string, string>>({
    wildfire: '',
    urbanfire: '',
    flood: '',
    power: '',
    drought: '',
    unrest: '',
    defence: ''
  });

  const handleUpdateScenarioNotes = (hazard: string, contentHtml: string) => {
    setScenarioNotes((prev) => ({
      ...prev,
      [hazard]: contentHtml
    }));
  };

  // Scenario-Specific Incident Response SOPs Map
  const [sopsMap, setSopsMap] = useState<ScenarioSopsMap>(DEFAULT_SCENARIO_SOPS);

  // Evacuation Transport Fleet & Collection Points State
  const [evacuationPartners, setEvacuationPartners] = useState<EvacuationTransportPartner[]>(DEFAULT_EVACUATION_PARTNERS);
  const [collectionPoints, setCollectionPoints] = useState<EvacuationCollectionPoint[]>(DEFAULT_COLLECTION_POINTS);

  // Partner Modal Dialogs
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<EvacuationTransportPartner | null>(null);
  const [partnerFormData, setPartnerFormData] = useState<Partial<EvacuationTransportPartner>>({
    operator: '',
    vehicleType: 'coach',
    vehicleCount: 1,
    totalSeats: 50,
    assignedSector: '',
    dispatchContact: '',
    pickupMusterPoint: '',
    dropoffDestination: '',
    status: 'standby',
    notes: ''
  });

  // Collection Point Modal Dialogs
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<EvacuationCollectionPoint | null>(null);
  const [pointFormData, setPointFormData] = useState<Partial<EvacuationCollectionPoint>>({
    name: '',
    address: '',
    accessibleFor: 'all_vehicles',
    targetRoads: '',
    designatedVehicles: '',
    dropoffShelter: '',
    onSiteCoordinator: '',
    coordinatorPhone: '',
    status: 'staged',
    notes: ''
  });

  const [isPrintManifestModalOpen, setIsPrintManifestModalOpen] = useState(false);

  const handleOpenAddPartner = () => {
    setEditingPartner(null);
    setPartnerFormData({
      operator: '',
      vehicleType: 'coach',
      vehicleCount: 1,
      totalSeats: 50,
      assignedSector: '',
      dispatchContact: '',
      pickupMusterPoint: '',
      dropoffDestination: '',
      status: 'standby',
      notes: ''
    });
    setIsPartnerModalOpen(true);
  };

  const handleOpenEditPartner = (partner: EvacuationTransportPartner) => {
    setEditingPartner(partner);
    setPartnerFormData({ ...partner });
    setIsPartnerModalOpen(true);
  };

  const handleSavePartner = () => {
    if (!partnerFormData.operator || !partnerFormData.assignedSector) {
      toast({ title: 'Validation Error', description: 'Operator name and assigned sector are required.', variant: 'destructive' });
      return;
    }

    if (editingPartner) {
      setEvacuationPartners(prev => prev.map(p => p.id === editingPartner.id ? { ...p, ...partnerFormData } as EvacuationTransportPartner : p));
      toast({ title: 'Partner Updated', description: `${partnerFormData.operator} details updated.` });
    } else {
      const newPartner: EvacuationTransportPartner = {
        id: `partner-${Date.now()}`,
        operator: partnerFormData.operator || 'Transport Operator',
        vehicleType: partnerFormData.vehicleType || 'coach',
        vehicleCount: Number(partnerFormData.vehicleCount) || 1,
        totalSeats: Number(partnerFormData.totalSeats) || 50,
        assignedSector: partnerFormData.assignedSector || '',
        dispatchContact: partnerFormData.dispatchContact || '',
        pickupMusterPoint: partnerFormData.pickupMusterPoint || '',
        dropoffDestination: partnerFormData.dropoffDestination || '',
        status: (partnerFormData.status as TransportReadinessStatus) || 'standby',
        notes: partnerFormData.notes || ''
      };
      setEvacuationPartners(prev => [...prev, newPartner]);
      toast({ title: 'Partner Added', description: `${newPartner.operator} added to fleet roster.` });
    }
    setIsPartnerModalOpen(false);
  };

  const handleDeletePartner = (id: string) => {
    setEvacuationPartners(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Removed', description: 'Transport partner removed from roster.' });
  };

  const handlePrintDriverManifest = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=1100');
    if (!printWindow) {
      toast({
        title: 'Popup Blocked',
        description: 'Please allow popups in your browser to print the driver manifest sheet.',
        variant: 'destructive'
      });
      return;
    }

    const totalCapacity = evacuationPartners.reduce((acc, p) => acc + (p.totalSeats || 0), 0);

    const partnersHtml = evacuationPartners.map((p) => `
      <div style="border: 1.5px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
          <span>[${p.vehicleType.toUpperCase().replace('_', ' ')}] ${p.operator}</span>
          <span style="color: #047857; font-weight: 800;">${p.vehicleCount} Unit(s) • ${p.totalSeats} Total Seats</span>
        </div>
        <div style="color: #334155; margin-bottom: 3px;">📍 <strong>Assigned Sector:</strong> ${p.assignedSector}</div>
        <div style="color: #334155; margin-bottom: 3px;">📞 <strong>24/7 Crisis Dispatch:</strong> <span style="font-family: monospace; font-weight: 800; color: #0f172a;">${p.dispatchContact}</span></div>
        <div style="color: #334155;">🏁 <strong>Pickup Muster:</strong> ${p.pickupMusterPoint} ➔ <strong>Drop-Off Reception:</strong> ${p.dropoffDestination}</div>
        ${p.notes ? `<div style="margin-top: 5px; padding: 4px 8px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; color: #92400e; font-weight: 700; font-size: 10.5px;">💡 Note: ${p.notes}</div>` : ''}
      </div>
    `).join('');

    const pointsHtml = collectionPoints.map((pt) => `
      <div style="border: 1.5px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
          <span>${pt.name}</span>
          <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 800; text-transform: uppercase;">${pt.accessibleFor.replace('_', ' ')}</span>
        </div>
        <div style="color: #334155; margin-bottom: 3px;">📍 <strong>Address:</strong> ${pt.address}</div>
        <div style="color: #334155; margin-bottom: 3px;">🎯 <strong>Assigned Fleet:</strong> ${pt.designatedVehicles} ➔ <strong>Drop-Off Shelter:</strong> ${pt.dropoffShelter}</div>
        <div style="color: #334155;">👤 <strong>On-Site Lead:</strong> ${pt.onSiteCoordinator} (${pt.coordinatorPhone})</div>
      </div>
    `).join('');

    const htmlContent = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8" />',
      '<title>EMERGENCY EVACUATION DRIVER BRIEFING & MANIFEST - ' + townshipName.toUpperCase() + '</title>',
      '<style>',
      '@page { size: A4 portrait; margin: 8mm; }',
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #ffffff; font-size: 11px; line-height: 1.35; padding: 10px; }',
      '.header { border-bottom: 3px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }',
      '.title { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; color: #0f172a; }',
      '.subtitle { font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px; }',
      '.badge { font-size: 9px; font-weight: 900; color: #dc2626; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 3px; }',
      '.meta-box { background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-weight: 800; font-size: 11px; }',
      '.section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-top: 14px; margin-bottom: 8px; color: #0f172a; }',
      '.driver-orders { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 10px 14px; margin-top: 14px; color: #78350f; font-size: 11px; }',
      '.driver-orders h4 { font-weight: 900; margin-bottom: 5px; text-transform: uppercase; font-size: 12px; }',
      '.driver-orders ol { padding-left: 18px; }',
      '.driver-orders li { margin-bottom: 3px; }',
      '.footer { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 9px; color: #64748b; text-align: center; font-family: monospace; }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="header">',
      '  <div>',
      '    <div class="badge">SCOTTISH CIVIL RESILIENCE TRANSPORT PROTOCOL</div>',
      '    <div class="title">CIVIC EVACUATION DRIVER BRIEFING & MANIFEST</div>',
      '    <div class="subtitle">Official Operational Sheet for Stagecoach Drivers, Accessible Van Operators & Taxi Marshals</div>',
      '  </div>',
      '  <div style="text-align: right; font-family: monospace; font-size: 10px; font-weight: 800;">',
      '    <div>JURISDICTION: ' + townshipName.toUpperCase() + '</div>',
      '    <div>DATE: ' + new Date().toLocaleDateString('en-GB') + '</div>',
      '  </div>',
      '</div>',
      '<div class="meta-box">',
      '  <div>COMMUNITY: <strong>' + townshipName + '</strong></div>',
      '  <div>TOTAL REGISTERED FLEET CAPACITY: <span style="color: #047857;">' + totalCapacity + ' PASSENGER SEATS</span></div>',
      '  <div>FLEET OPERATORS: <strong>' + evacuationPartners.length + ' REGISTERED</strong></div>',
      '</div>',
      '<div class="section-title">1. REGISTERED TRANSPORT FLEET OPERATORS</div>',
      partnersHtml,
      '<div class="section-title">2. DESIGNATED PASSENGER COLLECTION & MUSTER HUBS</div>',
      pointsHtml,
      '<div class="driver-orders">',
      '  <h4>⚠️ MANDATORY FIELD DRIVER & OPERATOR INSTRUCTIONS</h4>',
      '  <ol>',
      '    <li><strong>Road Suitability & Clearance:</strong> Full-size coaches (Tier 1) must remain on designated arterial A-Roads and Wide Hubs. Do NOT attempt narrow single-track country passes.</li>',
      '    <li><strong>Priority Boarding:</strong> Give immediate priority boarding to non-ambulatory, elderly, and vulnerable residents requiring assistance.</li>',
      '    <li><strong>Departure & Arrival Logging:</strong> Report vehicle ID, passenger headcount, and departure time to the On-Site Muster Lead or 24/7 Crisis Dispatch number before moving off.</li>',
      '    <li><strong>Designated Drop-Off Shelters:</strong> Transport evacuees strictly to the designated reception shelter specified above unless re-routed by Police Scotland / SFRS Incident Command.</li>',
      '  </ol>',
      '</div>',
      '<div class="footer">',
      '  COMMUNITY RESILIENCE EMERGENCY PLANNING DOCUMENT • OFFICIAL DRIVER FIELD MANIFEST • KEEP IN CAB / GLOVEBOX',
      '</div>',
      '<script>',
      '  window.onload = function() { window.print(); };',
      '</script>',
      '</body>',
      '</html>'
    ].join('\n');

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleTogglePartnerStatus = (id: string, newStatus: TransportReadinessStatus) => {
    setEvacuationPartners(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    toast({ title: 'Status Updated', description: `Fleet partner status set to ${newStatus.toUpperCase()}` });
  };

  const handleOpenAddPoint = () => {
    setEditingPoint(null);
    setPointFormData({
      name: '',
      address: '',
      accessibleFor: 'all_vehicles',
      targetRoads: '',
      designatedVehicles: '',
      dropoffShelter: '',
      onSiteCoordinator: '',
      coordinatorPhone: '',
      status: 'staged',
      notes: ''
    });
    setIsPointModalOpen(true);
  };

  const handleOpenEditPoint = (point: EvacuationCollectionPoint) => {
    setEditingPoint(point);
    setPointFormData({ ...point });
    setIsPointModalOpen(true);
  };

  const handleSavePoint = () => {
    if (!pointFormData.name || !pointFormData.address) {
      toast({ title: 'Validation Error', description: 'Collection point name and address are required.', variant: 'destructive' });
      return;
    }

    if (editingPoint) {
      setCollectionPoints(prev => prev.map(pt => pt.id === editingPoint.id ? { ...pt, ...pointFormData } as EvacuationCollectionPoint : pt));
      toast({ title: 'Muster Point Updated', description: `${pointFormData.name} updated.` });
    } else {
      const newPoint: EvacuationCollectionPoint = {
        id: `point-${Date.now()}`,
        name: pointFormData.name || 'Collection Point',
        address: pointFormData.address || '',
        accessibleFor: (pointFormData.accessibleFor as RoadAccessibilityTier) || 'all_vehicles',
        targetRoads: pointFormData.targetRoads || '',
        designatedVehicles: pointFormData.designatedVehicles || '',
        dropoffShelter: pointFormData.dropoffShelter || '',
        onSiteCoordinator: pointFormData.onSiteCoordinator || '',
        coordinatorPhone: pointFormData.coordinatorPhone || '',
        status: (pointFormData.status as any) || 'staged',
        notes: pointFormData.notes || ''
      };
      setCollectionPoints(prev => [...prev, newPoint]);
      toast({ title: 'Muster Point Added', description: `${newPoint.name} added to evacuation matrix.` });
    }
    setIsPointModalOpen(false);
  };

  const handleDeletePoint = (id: string) => {
    setCollectionPoints(prev => prev.filter(pt => pt.id !== id));
    toast({ title: 'Removed', description: 'Collection point removed from plan.' });
  };

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
          
          // Load Dynamic Timeline Stages per Hazard
          if (data.timelinesMap) {
            setTimelinesMap((prev) => ({ ...prev, ...data.timelinesMap }));
          } else if (data.timelines) {
            const converted: ScenarioTimelinesMap = {};
            Object.entries(data.timelines).forEach(([scen, val]: [string, any]) => {
              if (val && val.t0) {
                converted[scen] = [
                  { id: `${scen}-t0`, timeTag: 'T+00 MINS', title: val.t0.title || '', desc: val.t0.desc || '' },
                  { id: `${scen}-t15`, timeTag: 'T+15 MINS', title: val.t15.title || '', desc: val.t15.desc || '' },
                  { id: `${scen}-t30`, timeTag: 'T+30 MINS', title: val.t30.title || '', desc: val.t30.desc || '' },
                  { id: `${scen}-t60`, timeTag: 'T+60 MINS', title: val.t60.title || '', desc: val.t60.desc || '' }
                ];
              }
            });
            setTimelinesMap((prev) => ({ ...prev, ...converted }));
          }

          if (data.lastReviewedAt) setLastReviewedAt(data.lastReviewedAt);
          if (data.reviewedByName) setReviewedByName(data.reviewedByName);
          if (data.reviewedByRole) setReviewedByRole(data.reviewedByRole);
          if (data.nextReviewDueAt) setNextReviewDueAt(data.nextReviewDueAt);
          if (data.lsoEndorsement) setLsoEndorsement(data.lsoEndorsement);
          
          // Load Scenario-Specific Operational Notes
          if (data.scenarioNotes) {
            setScenarioNotes((prev) => ({
              ...prev,
              ...data.scenarioNotes
            }));
          } else if (typeof data.additionalNotesHtml === 'string' && data.additionalNotesHtml) {
            setScenarioNotes((prev) => ({
              ...prev,
              wildfire: data.additionalNotesHtml
            }));
          }

          // Load Dynamic Keyholders & Access Register
          if (Array.isArray(data.keyholdersList) && data.keyholdersList.length > 0) {
            setKeyholdersList(data.keyholdersList);
          }

          // Load Evacuation Transport Fleet & Collection Points
          if (Array.isArray(data.evacuationPartners) && data.evacuationPartners.length > 0) {
            setEvacuationPartners(data.evacuationPartners);
          }
          if (Array.isArray(data.collectionPoints) && data.collectionPoints.length > 0) {
            setCollectionPoints(data.collectionPoints);
          }

          // Load Scenario-Specific Multi-Agency Liaisons
          if (data.scenarioLiaisons) {
            setScenarioLiaisons((prev) => ({
              ...prev,
              ...data.scenarioLiaisons
            }));
          }

          // Load Dynamic Wildfire Arrays
          if (Array.isArray(data.wildfireHazardAreas) && data.wildfireHazardAreas.length > 0) {
            setWfHazardAreas(data.wildfireHazardAreas);
          }
          if (Array.isArray(data.wildfireAssetList) && data.wildfireAssetList.length > 0) {
            setWfAssetList(data.wildfireAssetList);
          }
          if (Array.isArray(data.wildfireContactList) && data.wildfireContactList.length > 0) {
            setWfContactList(data.wildfireContactList);
          }
          if (Array.isArray(data.wildfireTimelineStages) && data.wildfireTimelineStages.length > 0) {
            setWfTimelineStages(data.wildfireTimelineStages);
          }
          if (Array.isArray(data.wildfireSafeguardingList) && data.wildfireSafeguardingList.length > 0) {
            setWfSafeguardingList(data.wildfireSafeguardingList);
          }

          if (data.wildfireContacts) {
            if (data.wildfireContacts.coordinatorName) setWfCoordName(data.wildfireContacts.coordinatorName);
            if (data.wildfireContacts.coordinatorTel) setWfCoordTel(data.wildfireContacts.coordinatorTel);
            if (data.wildfireContacts.estateManagerName) setWfEstateName(data.wildfireContacts.estateManagerName);
            if (data.wildfireContacts.estateManagerTel) setWfEstateTel(data.wildfireContacts.estateManagerTel);
            if (data.wildfireContacts.headKeeperName) setWfKeeperName(data.wildfireContacts.headKeeperName);
            if (data.wildfireContacts.headKeeperTel) setWfKeeperTel(data.wildfireContacts.headKeeperTel);
            if (data.wildfireContacts.fireStationName) setWfStationName(data.wildfireContacts.fireStationName);
            if (data.wildfireContacts.fireStationTel) setWfStationTel(data.wildfireContacts.fireStationTel);
          }

          if (data.wildfireAssets) {
            if (data.wildfireAssets.firebreakTractors) setWfAssetTractors(data.wildfireAssets.firebreakTractors);
            if (data.wildfireAssets.waterAbstractionPoints) setWfAssetWater(data.wildfireAssets.waterAbstractionPoints);
            if (data.wildfireAssets.bowsersAndATVs) setWfAssetBowsers(data.wildfireAssets.bowsersAndATVs);
            if (data.wildfireAssets.livestockPastures) setWfAssetPastures(data.wildfireAssets.livestockPastures);
          }

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

          if (data.incidentSops && typeof data.incidentSops === 'object') {
            setSopsMap((prev) => ({
              ...DEFAULT_SCENARIO_SOPS,
              ...data.incidentSops
            }));
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

  // Synchronize townshipName with the active community name if no plan was saved yet
  useEffect(() => {
    if (communityDoc?.name) {
      setTownshipName((prev) => (!prev || prev === 'Local Community' || prev === 'Grantown-on-Spey & Strathspey') ? communityDoc.name : prev);
    }
  }, [communityDoc?.name]);

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

  // Certify and Stamp Plan as Reviewed Current
  const handleCertifyPlan = async () => {
    if (!activeCommunityId || !certifierNameInput.trim()) {
      toast({ title: 'Name Required', description: 'Please enter your name to certify this plan.', variant: 'destructive' });
      return;
    }

    setIsCertifying(true);
    try {
      const res = await certifyEmergencyPlanAction({
        communityId: activeCommunityId,
        reviewerName: certifierNameInput.trim(),
        reviewerRole: certifierRoleInput.trim(),
        userId: user?.uid || 'leader'
      });

      if (res.success) {
        setLastReviewedAt(new Date(res.reviewedAt!));
        setReviewedByName(certifierNameInput.trim());
        setReviewedByRole(certifierRoleInput.trim());
        setNextReviewDueAt(new Date(res.nextReviewDueAt!));
        setIsCertifyModalOpen(false);
        toast({
          title: '🟢 Plan Certified & Stamped Current!',
          description: `Certified by ${certifierNameInput}. Next statutory review scheduled in 6 months.`
        });
      } else {
        toast({ title: 'Certification Failed', description: res.error || 'Could not certify plan.', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error('Error certifying plan:', e);
      toast({ title: 'Error', description: e.message || 'Failed to certify plan.', variant: 'destructive' });
    } finally {
      setIsCertifying(false);
    }
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
          timelinesMap,
          additionalNotesHtml: scenarioNotes.wildfire || '',
          keyholdersList,
          scenarioLiaisons,
          scenarioNotes,
          evacuationPartners,
          collectionPoints,
          incidentSops: sopsMap,
          wildfireHazardAreas: wfHazardAreas,
          wildfireAssetList: wfAssetList,
          wildfireContactList: wfContactList,
          wildfireTimelineStages: wfTimelineStages,
          wildfireSafeguardingList: wfSafeguardingList,
          wildfireContacts: {
            coordinatorName: wfCoordName,
            coordinatorTel: wfCoordTel,
            estateManagerName: wfEstateName,
            estateManagerTel: wfEstateTel,
            headKeeperName: wfKeeperName,
            headKeeperTel: wfKeeperTel,
            fireStationName: wfStationName,
            fireStationTel: wfStationTel
          },
          wildfireAssets: {
            firebreakTractors: wfAssetTractors,
            waterAbstractionPoints: wfAssetWater,
            bowsersAndATVs: wfAssetBowsers,
            livestockPastures: wfAssetPastures
          },
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

      // Record in Emergency Audit Log
      await logEmergencyAuditAction({
        communityId: activeCommunityId,
        actionType: 'PLAN_SAVE',
        category: activeHazard.toUpperCase(),
        actorName: (userProfile as any)?.name || user?.displayName || 'Community Leader',
        actorEmail: user?.email || '',
        actorRole: (userProfile as any)?.role || 'Community Resilience Leader',
        actorId: user?.uid || 'leader',
        summary: `Saved Statutory Resilience Plan (${activeHazard.toUpperCase()} Annexe / General Settings)`,
        details: { activeHazard, townshipName }
      });

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

  // Live Situation Message Publish Handler
  const handlePublishMessage = async () => {
    if (!activeCommunityId || !user) {
      toast({ title: 'Error', description: 'Leader authentication required.', variant: 'destructive' });
      return;
    }
    if (!msgTitle.trim() || !msgBody.trim()) {
      toast({ title: 'Missing Information', description: 'Please enter a bulletin headline and message body.', variant: 'destructive' });
      return;
    }

    setIsPublishingMessage(true);
    try {
      const author = msgAuthorName.trim() || (userProfile as any)?.name || user.displayName || 'Incident Commander';
      const role = msgAuthorRole.trim() || 'Community Resilience Leader';

      const res = await publishEmergencyMessageAction({
        communityId: activeCommunityId,
        title: msgTitle.trim(),
        body: msgBody.trim(),
        level: msgLevel,
        hazardCategory: msgCategory,
        authorName: author,
        authorRole: role,
        authorId: user.uid,
        authorEmail: user.email || '',
      });

      if (res.success) {
        toast({
          title: 'Live Bulletin Published 📢',
          description: `Bulletin "${msgTitle}" is now live on the Public Community Portal.`
        });
        setMsgTitle('');
        setMsgBody('');
        setIsNoticeActive(true);
        setNoticeHeadline(msgTitle);
        setNoticeMessage(msgBody);
        setNoticeIssuedBy(`${author} (${role})`);
      } else {
        toast({ title: 'Publishing Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsPublishingMessage(false);
    }
  };

  // Live Situation Message Retract Handler
  const handleRetractMessage = async (messageId?: string) => {
    if (!activeCommunityId || !user) {
      toast({ title: 'Error', description: 'Leader authentication required.', variant: 'destructive' });
      return;
    }

    setIsRetractingMessage(true);
    try {
      const author = (userProfile as any)?.name || user.displayName || 'Incident Commander';
      const res = await retractEmergencyMessageAction({
        communityId: activeCommunityId,
        messageId,
        authorName: author,
        authorRole: 'Community Resilience Leader',
        authorId: user.uid,
        authorEmail: user.email || '',
        reason: retractReasonInput.trim() || 'Situation normalized.',
      });

      if (res.success) {
        toast({
          title: 'Bulletin Retracted',
          description: 'Active emergency bulletin has been cleared from the public portal.'
        });
        setIsNoticeActive(false);
        setNoticeHeadline('');
        setNoticeMessage('');
        setIsRetractDialogOpen(false);
        setRetractReasonInput('');
      } else {
        toast({ title: 'Retract Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRetractingMessage(false);
    }
  };

  // Live Situation Message Archive Handler
  const handleArchiveMessage = async (messageId: string, reason?: string) => {
    if (!activeCommunityId || !user) {
      toast({ title: 'Error', description: 'Leader authentication required.', variant: 'destructive' });
      return;
    }

    try {
      const author = (userProfile as any)?.name || user.displayName || 'Incident Commander';
      const role = (userProfile as any)?.role || 'Community Resilience Leader';
      const res = await archiveEmergencyMessageAction({
        communityId: activeCommunityId,
        messageId,
        authorName: author,
        authorRole: role,
        authorId: user.uid,
        authorEmail: user.email || '',
        reason: reason || 'Bulletin archived by incident commander.',
      });

      if (res.success) {
        toast({
          title: 'Bulletin Archived 📦',
          description: 'Emergency bulletin has been cleared from active status and archived to audit logs.'
        });
      } else {
        toast({ title: 'Archive Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Stand Down Incident & Bulk Archive Handler
  const handleStandDownIncident = async () => {
    if (!activeCommunityId || !user) {
      toast({ title: 'Error', description: 'Leader authentication required.', variant: 'destructive' });
      return;
    }

    setIsStandingDown(true);
    try {
      const author = (userProfile as any)?.name || user.displayName || 'Incident Commander';
      const role = (userProfile as any)?.role || 'Community Resilience Leader';

      const res = await standDownEmergencyAndArchiveBulletinsAction({
        communityId: activeCommunityId,
        authorName: author,
        authorRole: role,
        authorId: user.uid,
        authorEmail: user.email || '',
        issueAllClearNotice: standDownIssueAllClear,
        allClearTitle: standDownAllClearTitle.trim(),
        allClearBody: standDownAllClearBody.trim(),
        hazardCategory: activeHazardScenario,
      });

      if (res.success) {
        toast({
          title: 'Incident Stood Down & Archived 🟢',
          description: `All ${res.archivedCount || 0} active bulletins were archived to the audit log. Threat status restored to Normal (Green).`
        });
        setCurrentThreatStatus('normal');
        if (standDownIssueAllClear) {
          setIsNoticeActive(true);
          setNoticeHeadline(standDownAllClearTitle.trim());
          setNoticeMessage(standDownAllClearBody.trim());
          setNoticeIssuedBy(`${author} (${role})`);
        } else {
          setIsNoticeActive(false);
          setNoticeHeadline('');
          setNoticeMessage('');
        }
        setIsStandDownDialogOpen(false);
      } else {
        toast({ title: 'Stand Down Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsStandingDown(false);
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
        // Record in Emergency Audit Log
        await logEmergencyAuditAction({
          communityId: activeCommunityId,
          actionType: 'THREAT_CHANGE',
          category: 'Threat Status',
          actorName: (userProfile as any)?.name || user?.displayName || 'Community Leader',
          actorEmail: user?.email || '',
          actorRole: 'Community Resilience Leader',
          actorId: user.uid,
          summary: `Updated Community Threat Level to ${targetStatus.toUpperCase()}`,
          details: { previousStatus: currentThreatStatus, newStatus: targetStatus, activeHazardScenario }
        });

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

  // Dynamic Timeline Milestone Helpers
  const handleAddDynamicTimelineStage = (hazard: string) => {
    const current = timelinesMap[hazard] || DEFAULT_TIMELINES_MAP[hazard] || [];
    const nextCount = current.length + 1;
    const minutes = nextCount * 30;
    const timeTag = minutes >= 120 
      ? `T+${Math.floor(minutes / 60)} HOURS` 
      : minutes >= 60 
      ? `T+${Math.floor(minutes / 60)} HOUR` 
      : `T+${minutes} MINS`;

    const newStage: ScenarioTimelineStage = {
      id: `stage-${Date.now()}`,
      timeTag,
      title: 'New Operational Response Action',
      desc: ''
    };

    setTimelinesMap((prev) => ({
      ...prev,
      [hazard]: [...(prev[hazard] || DEFAULT_TIMELINES_MAP[hazard] || []), newStage]
    }));
  };

  const handleUpdateDynamicTimelineStage = (
    hazard: string,
    id: string,
    field: keyof ScenarioTimelineStage,
    value: string
  ) => {
    setTimelinesMap((prev) => ({
      ...prev,
      [hazard]: (prev[hazard] || DEFAULT_TIMELINES_MAP[hazard] || []).map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    }));
  };

  const handleDeleteDynamicTimelineStage = (hazard: string, id: string) => {
    setTimelinesMap((prev) => ({
      ...prev,
      [hazard]: (prev[hazard] || DEFAULT_TIMELINES_MAP[hazard] || []).filter((s) => s.id !== id)
    }));
  };

  // Living Plan Certification Status Calculations
  const isPlanCurrent = useMemo(() => {
    if (!lastReviewedAt) return false;
    const reviewedDate = lastReviewedAt?.toDate ? lastReviewedAt.toDate() : new Date(lastReviewedAt);
    if (isNaN(reviewedDate.getTime())) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return reviewedDate >= sixMonthsAgo;
  }, [lastReviewedAt]);

  const formattedLastReviewed = useMemo(() => {
    if (!lastReviewedAt) return null;
    const d = lastReviewedAt?.toDate ? lastReviewedAt.toDate() : new Date(lastReviewedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [lastReviewedAt]);

  const formattedNextDue = useMemo(() => {
    if (!nextReviewDueAt) return null;
    const d = nextReviewDueAt?.toDate ? nextReviewDueAt.toDate() : new Date(nextReviewDueAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [nextReviewDueAt]);

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
  const currentTimelineStages = timelinesMap[activeHazard] || DEFAULT_TIMELINES_MAP[activeHazard] || [];

  const renderScenarioLiaisonsCard = (hazardKey: string, hazardTitle: string) => {
    const liaisons = scenarioLiaisons[hazardKey] || DEFAULT_SCENARIO_LIAISONS[hazardKey] || [];
    return (
      <Card className="border shadow-md bg-card/70">
        <CardHeader className="bg-muted/30 border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Users2 className="h-4 w-4 text-cyan-500" />
                {hazardTitle} Multi-Agency Liaisons & Service Contacts
              </CardTitle>
              <CardDescription className="text-xs">
                Specialist control rooms, agency officers, and community coordinators for this scenario.
              </CardDescription>
            </div>
            <Button
              onClick={() => handleAddScenarioLiaison(hazardKey)}
              size="sm"
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
            >
              <Plus className="h-4 w-4 text-slate-950" /> Add Agency Liaison
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {liaisons.map((liaison, idx) => (
              <div
                key={liaison.id || idx}
                className="p-3.5 rounded-xl border bg-card space-y-2 text-xs relative group transition-all hover:border-cyan-500/40 shadow-sm"
              >
                <div className="flex items-center justify-between border-b pb-1.5">
                  <Input
                    value={liaison.role}
                    onChange={(e) => handleUpdateScenarioLiaison(hazardKey, liaison.id, 'role', e.target.value)}
                    placeholder="Role / Title"
                    className="bg-transparent border-none text-xs font-bold text-cyan-600 dark:text-cyan-400 p-0 h-auto focus-visible:ring-0 focus-visible:bg-muted/40 flex-grow mr-1"
                  />
                  <Button
                    onClick={() => handleDeleteScenarioLiaison(hazardKey, liaison.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded"
                    title="Delete contact"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Agency / Contact Name</Label>
                  <Input
                    value={liaison.agencyOrName}
                    onChange={(e) => handleUpdateScenarioLiaison(hazardKey, liaison.id, 'agencyOrName', e.target.value)}
                    placeholder="Agency / Contact Name"
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">24/7 Telephone</Label>
                  <Input
                    value={liaison.telephone}
                    onChange={(e) => handleUpdateScenarioLiaison(hazardKey, liaison.id, 'telephone', e.target.value)}
                    placeholder="24/7 Telephone"
                    className="h-7 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Operational Notes</Label>
                  <Input
                    value={liaison.notes || ''}
                    onChange={(e) => handleUpdateScenarioLiaison(hazardKey, liaison.id, 'notes', e.target.value)}
                    placeholder="Operational notes / radio channel..."
                    className="h-7 text-[11px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderScenarioNotesCard = (hazardKey: string, hazardTitle: string, sectionNumber?: string) => {
    return (
      <Card className="border shadow-md bg-card">
        <CardHeader className="bg-muted/30 border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              {sectionNumber ? `${sectionNumber}. ` : ''}Additional {hazardTitle} Information & Operational Notes
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 uppercase">
              {hazardKey} Plan Specific
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Add custom operational notes, landowner agreements, muster points, staging locations, or local instructions strictly for {hazardTitle}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-2">
          <div className="bg-card rounded-xl border p-1 shadow-sm">
            <RichTextEditor
              value={scenarioNotes[hazardKey] || ''}
              onChange={(val) => handleUpdateScenarioNotes(hazardKey, val)}
              placeholder={`Type bespoke operational instructions, staging details, landowner agreements, or equipment notes for ${hazardTitle} here...`}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

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

        {/* Living Statutory Plan Verification & Certification Status Bar */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge className={
                isPlanCurrent 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-mono uppercase px-2.5 py-1 flex items-center gap-1.5'
                  : lastReviewedAt
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-[11px] font-mono uppercase px-2.5 py-1 flex items-center gap-1.5'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600 text-[11px] font-mono uppercase px-2.5 py-1 flex items-center gap-1.5'
              }>
                {isPlanCurrent ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                {isPlanCurrent ? '🟢 Verified Current' : lastReviewedAt ? '🟡 Statutory Review Due' : '⚪ Draft / Uncertified'}
              </Badge>
              <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[11px] font-mono">
                SFRS 2026–2029 Aligned (Priority 2 & 7)
              </Badge>
            </div>

            <div className="text-slate-300 text-[11px] space-y-0.5">
              <p>
                <strong>Last Verified:</strong> {formattedLastReviewed ? `${formattedLastReviewed} by ${reviewedByName || 'Community Lead'} (${reviewedByRole || 'Lead'})` : 'Never certified'}
                {formattedNextDue && <span className="text-slate-400 ml-2">• <strong>Next Statutory Review Due:</strong> {formattedNextDue}</span>}
              </p>
            </div>
          </div>

          <Dialog open={isCertifyModalOpen} onOpenChange={setIsCertifyModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs shadow-md shadow-emerald-950/60 whitespace-nowrap">
                <CheckCircle2 className="h-4 w-4" /> Certify Plan Current
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-white">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 uppercase font-mono">
                    Statutory Certification
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-white pt-1">
                  Certify Community Emergency Resilience Plan
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  By certifying, you confirm this emergency plan has been reviewed against local hazard profiles, contact numbers are verified, and resources are up to date for <strong>{townshipName}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Certifying Officer / Leader Full Name</Label>
                  <Input
                    value={certifierNameInput}
                    onChange={(e) => setCertifierNameInput(e.target.value)}
                    placeholder="e.g. Cllr. Graham Mackenzie / Dr. M. Ross"
                    className="bg-slate-900 border-slate-700 text-white text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Resilience Role / Appointment</Label>
                  <Input
                    value={certifierRoleInput}
                    onChange={(e) => setCertifierRoleInput(e.target.value)}
                    placeholder="e.g. Community Council Resilience Lead"
                    className="bg-slate-900 border-slate-700 text-white text-xs"
                  />
                </div>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <p className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Clock className="h-3.5 w-3.5" /> 6-Month Active Validity Cycle
                  </p>
                  <p className="text-slate-400">
                    Stamps today's date into the public and council register. The system will automatically notify you before the 6-month cycle expires.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" size="sm" onClick={() => setIsCertifyModalOpen(false)} className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800">
                  Cancel
                </Button>
                <Button
                  onClick={handleCertifyPlan}
                  disabled={isCertifying || !certifierNameInput.trim()}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
                >
                  {isCertifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Sign & Certify Today
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* INCIDENT SOP QUICK-START ACTION BAR */}
      <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <ListChecks className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-sky-400 font-headline">
                {activeHazard.toUpperCase()} Incident Response Standard Operating Procedure (SOP)
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-sky-500/40 text-sky-300">
                {sopsMap[activeHazard]?.filter((p) => p.tasks?.every((t) => t.isCompleted))?.length || 0} / {sopsMap[activeHazard]?.length || 5} Phases Active
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              5-phase operational action plan with multi-agency escalation, volunteer deployment, and 1-page pocket grab-bag checklist for {activeHazard.toUpperCase()}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <Link href={`/leader/emergency-plan/sop?hazard=${activeHazard}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-slate-900 border-sky-500/40 text-sky-300 hover:bg-sky-950/60 font-bold text-xs h-9 gap-1.5 shadow-sm"
            >
              <Printer className="h-4 w-4 text-sky-400" /> Print Pocket Card
            </Button>
          </Link>

          <Link href={`/leader/emergency-plan/sop?hazard=${activeHazard}`}>
            <Button
              type="button"
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-9 gap-1.5 shadow-lg shadow-sky-950/60 cursor-pointer"
            >
              <ListChecks className="h-4 w-4" /> Open Action Checklist
            </Button>
          </Link>
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
        <div id="incident-sop-section" className="flex items-center justify-between flex-wrap gap-2 pb-2 scroll-mt-6">
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
                value="evacuation"
                className="gap-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <Bus className="h-4 w-4 text-teal-400 data-[state=active]:text-white" /> Evacuation Fleet ({evacuationPartners.length})
              </TabsTrigger>

              <TabsTrigger
                value="submission"
                className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs py-2 px-4 rounded-xl transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" /> Living Master Plan
              </TabsTrigger>

              <TabsTrigger
                value="messages"
                className="gap-2 data-[state=active]:bg-pink-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <MessageSquareText className="h-4 w-4 text-pink-400 data-[state=active]:text-white" /> Live Bulletins
              </TabsTrigger>

              <TabsTrigger
                value="audit"
                className="gap-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all"
              >
                <History className="h-4 w-4 text-violet-400 data-[state=active]:text-white" /> Audit & Event Log
              </TabsTrigger>
            </TabsList>
          </div>

          {/* DYNAMIC SCENARIO-SPECIFIC INCIDENT SOP CARD */}
          {['wildfire', 'urbanfire', 'flood', 'power', 'drought', 'unrest', 'defence'].includes(activeHazard) && (
            <div className="my-5 p-4 md:p-5 rounded-3xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
                  <ListChecks className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-400 font-headline">
                      {activeHazard.toUpperCase()} Incident Response Standard Operating Procedure (SOP)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-sky-500/40 text-sky-300">
                      {sopsMap[activeHazard]?.filter((p) => p.tasks?.every((t) => t.isCompleted))?.length || 0} / {sopsMap[activeHazard]?.length || 5} Phases Active
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">
                    5-phase tactical action checklist tailored for <strong>{activeHazard.toUpperCase()}</strong> with multi-agency protocols, volunteer dispatch, and printable grab-bag reference card.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <Link href={`/leader/emergency-plan/sop?hazard=${activeHazard}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-slate-900 border-sky-500/40 text-sky-300 hover:bg-sky-950/60 font-bold text-xs h-9 gap-1.5 shadow-sm"
                  >
                    <Printer className="h-4 w-4 text-sky-400" /> Print Pocket Card
                  </Button>
                </Link>

                <Link href={`/leader/emergency-plan/sop?hazard=${activeHazard}`}>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-9 gap-1.5 shadow-lg shadow-sky-950/60 cursor-pointer"
                  >
                    <ListChecks className="h-4 w-4" /> Open {activeHazard.toUpperCase()} Action Checklist →
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* DYNAMIC SCENARIO-SPECIFIC INFRASTRUCTURE FAILOVER SIMULATOR */}
          {['wildfire', 'urbanfire', 'flood', 'power', 'drought', 'unrest', 'defence'].includes(activeHazard) && (
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
          {['wildfire', 'urbanfire', 'flood', 'power', 'drought', 'unrest', 'defence'].includes(activeHazard) && (
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
                      className="text-xs resize-y min-h-[70px]"
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
                      className="text-xs resize-y min-h-[70px]"
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
                      className="text-xs resize-y min-h-[70px]"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 1. WILDFIRE (MASTER LIVING TEMPLATE - SFRS 2026-2029 ALIGNED) */}
          <TabsContent value="wildfire" className="space-y-6 mt-4">
            {/* SFRS Statutory Alignment Banner */}
            <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-950 p-5 rounded-2xl border border-red-500/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-red-600 text-white text-xs font-bold font-mono uppercase px-2 py-0.5">
                    SFRS Priority 2 & 7
                  </Badge>
                  <span className="text-xs font-bold text-red-300">
                    Scottish Fire & Rescue Service — Local Fire and Rescue Plan 2026–2029
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Flame className="h-5 w-5 text-red-500" />
                  Wildfire & Climate Emergency Resilience Plan
                </h2>
                <p className="text-xs text-slate-300">
                  Living statutory plan for wildfire prevention, early community notification, agricultural firebreak coordination, and evacuation corridors.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSavePlan}
                  disabled={isSavingPlan}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs shadow-md shadow-emerald-950/40"
                >
                  {isSavingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Wildfire Plan
                </Button>
              </div>
            </div>

            {/* SECTION 1: HAZARD ASSESSMENT & FUEL PROFILE (DYNAMIC LIST WITH + ADD / DELETE) */}
            <Card className="border-red-500/30 shadow-md bg-slate-950/80">
              <CardHeader className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border-b border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-red-400 flex items-center gap-2">
                      <TreePine className="h-4 w-4" /> 1. Wildfire Hazard Assessment & Fuel Profile
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Identify local fuel types, terrain risks, and wind corridors that threaten homes and infrastructure.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleAddHazardArea}
                    size="sm"
                    className="bg-red-400 hover:bg-red-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
                  >
                    <Plus className="h-4 w-4 text-slate-950" /> Add Hazard / Fuel Area
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                {wfHazardAreas.map((area, idx) => (
                  <div
                    key={area.id || idx}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative group transition-all hover:border-red-500/40 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2 flex-grow mr-2">
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-mono">
                          ZONE #{idx + 1}
                        </Badge>
                        <Input
                          value={area.title}
                          onChange={(e) => handleUpdateHazardArea(area.id, 'title', e.target.value)}
                          placeholder="Zone / Area Name (e.g. Anagach Pinewoods Corridor)"
                          className="bg-transparent border-none text-xs font-bold text-white p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-950/60"
                        />
                      </div>
                      <Button
                        onClick={() => handleDeleteHazardArea(area.id)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                        title="Delete this Hazard Area"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-300">High-Risk Vegetation & Fuel Belt</Label>
                        <Input
                          value={area.fuelType}
                          onChange={(e) => handleUpdateHazardArea(area.id, 'fuelType', e.target.value)}
                          placeholder="e.g. 1,000ha mature Scots Pine plantation, heavy needle duff, and heather"
                          className="bg-slate-950 border-slate-700 text-white text-xs h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-300">Prevailing Wind Threat & Vulnerable Boundaries</Label>
                        <Input
                          value={area.windThreat}
                          onChange={(e) => handleUpdateHazardArea(area.id, 'windThreat', e.target.value)}
                          placeholder="e.g. East / South-East winds blowing flame and ember shower towards town"
                          className="bg-slate-950 border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <span>
                      <strong>SFRS Wildfire Danger Assessment:</strong> Monitor Met Office Fire Severity Index (FSI) & Scottish Fire Danger warnings during dry spring/summer spells.
                    </span>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] whitespace-nowrap">
                    Active Vigilance
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: SFRS COMMUNITY ASSET REGISTER (DYNAMIC WITH + ADD / DELETE) */}
            <Card className="border-amber-500/30 shadow-md bg-slate-950/80">
              <CardHeader className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border-b border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-amber-400 flex items-center gap-2">
                        <Tractor className="h-4 w-4" /> 2. SFRS Community Asset Register (Machinery & Water Abstraction)
                      </CardTitle>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono uppercase">
                        Priority 7 Aligned
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-400">
                      Catalog local farm tractors, water abstraction draft points, bowsers, and holding areas identified in SFRS statutory plans.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleAddAssetItem}
                    size="sm"
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
                  >
                    <Plus className="h-4 w-4 text-slate-950" /> Add SFRS Asset / Water Point
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wfAssetList.map((asset, idx) => (
                    <div
                      key={asset.id || idx}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 relative group transition-all hover:border-amber-500/40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <Input
                          value={asset.name}
                          onChange={(e) => handleUpdateAssetItem(asset.id, 'name', e.target.value)}
                          placeholder="Asset / Resource Name (e.g. Heavy Agricultural Tractors & Ploughs)"
                          className="bg-transparent border-none text-xs font-bold text-amber-300 p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-950/60 flex-grow mr-2"
                        />
                        <Button
                          onClick={() => handleDeleteAssetItem(asset.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                          title="Delete this asset"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Resource Category / Tactical Tag</Label>
                        <Input
                          value={asset.category}
                          onChange={(e) => handleUpdateAssetItem(asset.id, 'category', e.target.value)}
                          placeholder="e.g. Firebreaks, Water Abstraction, All-Terrain Transport, Livestock Holding"
                          className="bg-slate-950 border-slate-700 text-white text-xs h-7"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Specifications, Capacity & Access Location</Label>
                        <Textarea
                          value={asset.description}
                          onChange={(e) => handleUpdateAssetItem(asset.id, 'description', e.target.value)}
                          placeholder="e.g. 4x Heavy 4WD agricultural tractors with subsoil ploughs on call..."
                          rows={2}
                          className="text-[11px] leading-relaxed resize-y min-h-[60px] bg-slate-950 border-slate-700 text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 3: EMERGENCY COORDINATOR & ESTATE NETWORK (DYNAMIC LIST WITH + ADD / DELETE) */}
            <Card className="border-cyan-500/30 shadow-md bg-slate-950/80">
              <CardHeader className="bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-950 border-b border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                      <Users2 className="h-4 w-4" /> 3. Wildfire Coordinator & Multi-Agency Network
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Key contacts for community leadership, estate gamekeepers, and emergency service liaisons.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleAddContact}
                    size="sm"
                    className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
                  >
                    <Plus className="h-4 w-4 text-slate-950" /> Add Coordinator / Contact
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wfContactList.map((contact, idx) => (
                    <div
                      key={contact.id || idx}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 relative group transition-all hover:border-cyan-500/40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <Input
                          value={contact.role}
                          onChange={(e) => handleUpdateContact(contact.id, 'role', e.target.value)}
                          placeholder="Role / Title (e.g. Community Resilience Lead)"
                          className="bg-transparent border-none text-xs font-bold text-cyan-300 p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-950/60 flex-grow"
                        />
                        <Button
                          onClick={() => handleDeleteContact(contact.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg ml-2"
                          title="Delete this contact"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400">Name / Organisation</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) => handleUpdateContact(contact.id, 'name', e.target.value)}
                            placeholder="Contact Name"
                            className="bg-slate-950 border-slate-700 text-white text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400">24/7 Telephone</Label>
                          <Input
                            value={contact.telephone}
                            onChange={(e) => handleUpdateContact(contact.id, 'telephone', e.target.value)}
                            placeholder="Phone / VHF"
                            className="bg-slate-950 border-slate-700 text-white text-xs h-8 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Operational Notes (Optional)</Label>
                        <Input
                          value={contact.notes || ''}
                          onChange={(e) => handleUpdateContact(contact.id, 'notes', e.target.value)}
                          placeholder="e.g. 24/7 Duty Mobile / Estate Radio Channel"
                          className="bg-slate-950 border-slate-700 text-slate-300 text-xs h-7"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 4: 0-60 MINUTE OPERATIONAL RESPONSE TIMELINE (DYNAMIC WITH + ADD / DELETE) */}
            <Card className="border-slate-700 shadow-md bg-slate-950/80">
              <CardHeader className="bg-slate-900/60 border-b border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-400" /> 4. Operational 0–60 Minute Response Timeline
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Step-by-step actions executed from initial detection through to joint SFRS command handover.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleAddTimelineStage}
                    size="sm"
                    className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
                  >
                    <Plus className="h-4 w-4 text-slate-950" /> Add Response Stage
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {wfTimelineStages.map((stage, idx) => (
                    <div
                      key={stage.id || idx}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative group transition-all hover:border-emerald-500/40 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Input
                            value={stage.timeTag}
                            onChange={(e) => handleUpdateTimelineStage(stage.id, 'timeTag', e.target.value)}
                            placeholder="e.g. T+0 MINS"
                            className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold h-6 px-1.5 py-0 w-24 rounded"
                          />
                          <Button
                            onClick={() => handleDeleteTimelineStage(stage.id)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                            title="Delete stage"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>

                        <Input
                          value={stage.title}
                          onChange={(e) => handleUpdateTimelineStage(stage.id, 'title', e.target.value)}
                          placeholder="Stage Title"
                          className="font-bold text-xs h-7 bg-slate-950 border-slate-700 text-white"
                        />

                        <Textarea
                          value={stage.desc}
                          onChange={(e) => handleUpdateTimelineStage(stage.id, 'desc', e.target.value)}
                          placeholder="Action instructions..."
                          rows={3}
                          className="text-[11px] resize-y min-h-[60px] bg-slate-950 border-slate-700 text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 5: VULNERABLE RESIDENTS & SAFEGUARDING (DYNAMIC WITH + ADD / DELETE & FULLY EDITABLE) */}
            <Card className="border-slate-800 shadow-md bg-slate-950/80">
              <CardHeader className="bg-slate-900/60 border-b border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" /> 5. Vulnerable Resident Evacuation & Safeguarding (SFRS Priority 3)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Fully customizable safeguarding protocols for isolated elderly residents and support for SFRS Home Fire Safety Visits (HFSVs).
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleAddSafeguardingItem}
                    size="sm"
                    className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
                  >
                    <Plus className="h-4 w-4 text-slate-950" /> Add Safeguarding Action
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wfSafeguardingList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5 relative group transition-all hover:border-emerald-500/40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <Input
                          value={item.title}
                          onChange={(e) => handleUpdateSafeguardingItem(item.id, 'title', e.target.value)}
                          placeholder="Protocol Title (e.g. Priority Evacuation List Protocol)"
                          className="bg-transparent border-none text-xs font-bold text-white p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-950/60 flex-grow mr-2"
                        />
                        <Button
                          onClick={() => handleDeleteSafeguardingItem(item.id)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>

                      <Textarea
                        value={item.description}
                        onChange={(e) => handleUpdateSafeguardingItem(item.id, 'description', e.target.value)}
                        placeholder="Detailed safeguarding protocol instructions..."
                        rows={4}
                        className="text-[11px] leading-relaxed resize-y min-h-[80px] bg-slate-950 border-slate-700 text-slate-300"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONTENT: 2. URBAN FIRE */}
          <TabsContent value="urbanfire" className="space-y-6 mt-4">
            <Card className="border-orange-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-950/40 via-background to-background border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-500">
                      <Building className="h-5 w-5" /> Annex B: Urban Structural Fire & Historic Building Plan
                    </CardTitle>
                    <CardDescription>
                      Tenement risk zones, safety cordons, traffic bypasses, and temporary warmth shelters.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleUpdateLiveThreatStatus('incident')}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8 shadow-sm border-0"
                  >
                    <AlertTriangle className="h-4 w-4 text-slate-950" /> Activate Incident (Urban Fire)
                  </Button>
                </div>
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

            {/* Urban Fire Liaisons */}
            {renderScenarioLiaisonsCard('urbanfire', 'Urban Fire & Structural')}
          </TabsContent>

          {/* TAB CONTENT: 3. FLOOD & SURGE */}
          <TabsContent value="flood" className="space-y-6 mt-4">
            <Card className="border-cyan-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-cyan-950/40 via-background to-background border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-cyan-500">
                      <Waves className="h-5 w-5" /> Annex C: River Flooding & Coastal Surge Plan
                    </CardTitle>
                    <CardDescription>
                      Watercourses, SEPA flood codes, sandbag depots & keyholders, and high ground refuges.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleUpdateLiveThreatStatus('incident')}
                    size="sm"
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8 shadow-sm border-0"
                  >
                    <AlertTriangle className="h-4 w-4 text-slate-950" /> Activate Incident (Flood)
                  </Button>
                </div>
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

            {/* Flood Liaisons */}
            {renderScenarioLiaisonsCard('flood', 'Flood & River Surge')}
          </TabsContent>

          {/* TAB CONTENT: 4. POWER OUTAGE */}
          <TabsContent value="power" className="space-y-6 mt-4">
            <Card className="border-amber-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-amber-950/40 via-background to-background border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
                      <Zap className="h-5 w-5" /> Annex D: Prolonged Power Outage & Grid Failure Plan
                    </CardTitle>
                    <CardDescription>
                      Trigger hours, Warm Space canteen hours, diesel generator specs, and PMR446 mesh radio check-ins.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleUpdateLiveThreatStatus('incident')}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8 shadow-sm border-0"
                  >
                    <AlertTriangle className="h-4 w-4 text-slate-950" /> Activate Incident (Power Cut)
                  </Button>
                </div>
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

            {/* Power Liaisons */}
            {renderScenarioLiaisonsCard('power', 'Power Outage & Grid Blackout')}
          </TabsContent>

          {/* TAB CONTENT: 5. WATER SHORTAGE & DROUGHT */}
          <TabsContent value="drought" className="space-y-6 mt-4">
            <Card className="border-blue-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-950/40 via-background to-background border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-500">
                      <Droplets className="h-5 w-5" /> Annex E: Water Shortage & Private Water Supplies (PWS)
                    </CardTitle>
                    <CardDescription>
                      PWS property count, Scottish Water bowser refill points, bottled water rationing, and livestock tanks.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleUpdateLiveThreatStatus('incident')}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8 shadow-sm border-0"
                  >
                    <AlertTriangle className="h-4 w-4 text-slate-950" /> Activate Incident (Drought)
                  </Button>
                </div>
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

            {/* Drought Liaisons */}
            {renderScenarioLiaisonsCard('drought', 'Water Shortage & PWS Contingency')}
          </TabsContent>

          {/* TAB CONTENT: 6. CIVIL UNREST */}
          <TabsContent value="unrest" className="space-y-6 mt-4">
            <Card className="border-purple-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-950/40 via-background to-background border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-500">
                      <ShieldCheck className="h-5 w-5" /> Annex F: Civil Unrest & Police Scotland Liaison
                    </CardTitle>
                    <CardDescription>
                      Avoidance perimeters, safe sanctuaries, and direct police control room channels.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleUpdateLiveThreatStatus('incident')}
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8 shadow-sm border-0"
                  >
                    <AlertTriangle className="h-4 w-4 text-slate-950" /> Activate Incident (Unrest)
                  </Button>
                </div>
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

            {/* Unrest Liaisons */}
            {renderScenarioLiaisonsCard('unrest', 'Civil Unrest & Police Scotland Liaison')}
          </TabsContent>

          {/* TAB CONTENT: 7. CIVIL DEFENCE */}
          <TabsContent value="defence" className="space-y-6 mt-4">
            <Card className="border-emerald-500/30 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-950/40 via-background to-background border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-500">
                      <Award className="h-5 w-5" /> Annex G: Civil Defence & State Emergency Distribution
                    </CardTitle>
                    <CardDescription>
                      Gravity-fed hill springs, reinforced subterranean shelters, and bulk food rationing.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleUpdateLiveThreatStatus('incident')}
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8 shadow-sm border-0"
                  >
                    <AlertTriangle className="h-4 w-4 text-slate-950" /> Activate Incident (Civil Defence)
                  </Button>
                </div>
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

            {/* Defence Liaisons */}
            {renderScenarioLiaisonsCard('defence', 'Civil Defence & Emergency Distribution')}
          </TabsContent>

          {/* TAB CONTENT: EVACUATION FLEET & COLLECTION POINTS */}
          <TabsContent value="evacuation" className="space-y-6 mt-4">
            
            {/* Strategy Callout Banner */}
            <Card className="border-2 border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-card to-slate-900/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-300 border-2 border-teal-500/40 shrink-0">
                      <Bus className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-teal-600 text-white border-teal-700 text-[11px] uppercase font-black tracking-wide">
                          Multi-Tier Evacuation Logistics
                        </Badge>
                        <Badge variant="outline" className="text-xs font-bold text-slate-900 dark:text-slate-100 border-slate-400 dark:border-slate-600">
                          {evacuationPartners.reduce((acc, p) => acc + (p.totalSeats || 0), 0)} Total Passenger Seats Available
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-black mt-1 text-slate-950 dark:text-white">
                        Civic Mass Evacuation & Transport Mobilisation Fleet
                      </CardTitle>
                      <CardDescription className="text-xs max-w-3xl leading-relaxed text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                        Coordinated standby and dispatch protocols for bus operators (Stagecoach), accessible community minibuses, and local 4x4 taxis tailored to road geography and accessibility constraints.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                      onClick={() => setIsPrintManifestModalOpen(true)}
                      variant="outline" 
                      size="sm" 
                      className="text-xs font-bold gap-1.5 border-teal-500 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" /> Driver Manifest (PDF)
                    </Button>
                    <Button 
                      onClick={handleOpenAddPartner} 
                      size="sm" 
                      className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs gap-1.5 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Transport Partner
                    </Button>
                    <Button 
                      onClick={handleOpenAddPoint} 
                      variant="secondary" 
                      size="sm" 
                      className="font-extrabold text-xs gap-1.5 text-slate-900 dark:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Muster Point
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-card border-2 border-teal-500/30 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 font-black text-xs text-teal-700 dark:text-teal-300">
                      <Bus className="h-4 w-4" />
                      <span>Tier 1: Arterial Coaches</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      50–70 seat coaches staged at main arterial collection hubs (Town Square/Arenas). Move high passenger volumes on wide roads.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-card border-2 border-indigo-500/30 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 font-black text-xs text-indigo-700 dark:text-indigo-300">
                      <Truck className="h-4 w-4" />
                      <span>Tier 2: Feeder & Care Vans</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      12–16 seat wheelchair-accessible minibuses dedicated to care homes, assisted living, and residential estate feeder runs.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-card border-2 border-amber-400 dark:border-amber-700 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 font-black text-xs text-amber-900 dark:text-amber-300">
                      <Car className="h-4 w-4" />
                      <span>Tier 3: Rural 4x4 & Taxis</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      4–8 seat taxis and 4WD vehicles dispatched to single-track country lanes, farms, and non-ambulatory residents.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transport Partners Fleet Table / Cards */}
            <Card className="border-2 shadow-md bg-card">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2 text-slate-950 dark:text-white">
                    <Bus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    Transport Partner Fleet Inventory ({evacuationPartners.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Operators and emergency dispatch contacts registered for civic evacuation.
                  </CardDescription>
                </div>
                <Button onClick={handleOpenAddPartner} size="sm" variant="ghost" className="text-xs font-bold gap-1 text-teal-700 dark:text-teal-300">
                  <Plus className="h-3.5 w-3.5" /> Add Partner
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {evacuationPartners.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 font-medium">No transport partners added yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {evacuationPartners.map((partner) => (
                      <div 
                        key={partner.id}
                        className="p-4 rounded-2xl border-2 bg-card hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 shrink-0">
                            {partner.vehicleType === 'coach' && <Bus className="h-5 w-5" />}
                            {partner.vehicleType === 'minibus' && <Truck className="h-5 w-5" />}
                            {partner.vehicleType === 'accessible_van' && <LifeBuoy className="h-5 w-5" />}
                            {partner.vehicleType === 'taxi_4x4' && <Car className="h-5 w-5" />}
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-200">
                                {partner.vehicleType.replace('_', ' ')}
                              </Badge>
                              <Badge className="bg-primary/20 text-primary border border-primary/40 text-[10px] font-extrabold">
                                {partner.vehicleCount} Vehicle{partner.vehicleCount > 1 ? 's' : ''} ({partner.totalSeats} seats)
                              </Badge>
                              <Badge 
                                className={`text-[10px] font-black uppercase tracking-wider ${
                                  partner.status === 'standby' ? 'bg-amber-100 text-amber-950 border-2 border-amber-400 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-600' :
                                  partner.status === 'mobilised' ? 'bg-orange-100 text-orange-950 border-2 border-orange-400 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-600' :
                                  partner.status === 'active_evacuation' ? 'bg-red-600 text-white border-2 border-red-700 animate-pulse' :
                                  'bg-emerald-100 text-emerald-950 border-2 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-600'
                                }`}
                              >
                                {partner.status.replace('_', ' ')}
                              </Badge>
                            </div>

                            <p className="font-black text-base text-slate-950 dark:text-white">{partner.operator}</p>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                              📍 <strong>Assigned Sector:</strong> {partner.assignedSector}
                            </p>
                            <p className="text-xs text-slate-800 dark:text-slate-200">
                              📞 <strong>24/7 Dispatch:</strong> <span className="font-mono text-slate-950 dark:text-white font-bold">{partner.dispatchContact}</span>
                            </p>

                            {partner.notes && (
                              <p className="text-xs font-bold text-amber-950 dark:text-amber-100 bg-amber-100 dark:bg-amber-950/80 px-3 py-1.5 rounded-xl border-2 border-amber-300 dark:border-amber-700 inline-block mt-1">
                                💡 {partner.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <Select 
                            value={partner.status} 
                            onValueChange={(val: TransportReadinessStatus) => handleTogglePartnerStatus(partner.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold w-36 border-2">
                              <SelectValue placeholder="Set Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standby" className="font-bold">🟡 Standby</SelectItem>
                              <SelectItem value="mobilised" className="font-bold">🟠 Mobilised</SelectItem>
                              <SelectItem value="active_evacuation" className="font-bold">🔴 Active Evac</SelectItem>
                              <SelectItem value="completed" className="font-bold">🟢 Completed</SelectItem>
                              <SelectItem value="off_duty" className="font-bold">⚪ Off Duty</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button onClick={() => handleOpenEditPartner(partner)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-bold">
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => handleDeletePartner(partner.id)} variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Designated Collection Points Matrix */}
            <Card className="border-2 shadow-md bg-card">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2 text-slate-950 dark:text-white">
                    <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    Designated Passenger Collection Points & Muster Hubs ({collectionPoints.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Pre-arranged pickup locations with road suitability rules for public evacuation.
                  </CardDescription>
                </div>
                <Button onClick={handleOpenAddPoint} size="sm" variant="ghost" className="text-xs font-bold gap-1 text-teal-700 dark:text-teal-300">
                  <Plus className="h-3.5 w-3.5" /> Add Muster Point
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {collectionPoints.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 font-medium">No collection points configured yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {collectionPoints.map((point) => (
                      <div 
                        key={point.id}
                        className="p-4 rounded-2xl border-2 bg-card hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 shrink-0">
                            <MapPin className="h-5 w-5" />
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                className={`text-[10px] font-extrabold ${
                                  point.accessibleFor === 'all_vehicles' ? 'bg-teal-100 text-teal-950 border-2 border-teal-400 dark:bg-teal-950 dark:text-teal-100 dark:border-teal-700' :
                                  point.accessibleFor === 'minibus_taxi_only' ? 'bg-amber-100 text-amber-950 border-2 border-amber-400 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700' :
                                  'bg-red-100 text-red-950 border-2 border-red-400 dark:bg-red-950 dark:text-red-100 dark:border-red-700'
                                }`}
                              >
                                {point.accessibleFor === 'all_vehicles' && '🚌 All Vehicles & Full Coaches OK'}
                                {point.accessibleFor === 'minibus_taxi_only' && '🚐 Minibus & Taxi ONLY (Narrow Access)'}
                                {point.accessibleFor === '4x4_only' && '🚙 4x4 / Rural Off-Road ONLY'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-bold border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-200">
                                {point.status.toUpperCase()}
                              </Badge>
                            </div>

                            <p className="font-black text-base text-slate-950 dark:text-white">{point.name}</p>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{point.address}</p>
                            <p className="text-xs text-slate-800 dark:text-slate-200">
                              🎯 <strong>Assigned Vehicles:</strong> <span className="text-slate-950 dark:text-white font-bold">{point.designatedVehicles}</span>
                            </p>
                            <p className="text-xs text-slate-800 dark:text-slate-200">
                              🏁 <strong>Drop-Off Shelter:</strong> <span className="text-slate-950 dark:text-white font-bold">{point.dropoffShelter}</span>
                            </p>
                            <p className="text-xs text-slate-800 dark:text-slate-200">
                              👤 <strong>On-Site Lead:</strong> {point.onSiteCoordinator} ({point.coordinatorPhone})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <Button onClick={() => handleOpenEditPoint(point)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-bold">
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => handleDeletePoint(point.id)} variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                        <p className="pl-2">1. {facs.f1.name || 'Primary Facility'}: {facs.f1.isFailover ? (facs.f1.secondary || '— [Failover not set]') + ' [FAILOVER]' : (facs.f1.primary || '— [Not specified]')}</p>
                        <p className="pl-2">2. {facs.f2.name || 'Secondary Facility'}: {facs.f2.isFailover ? (facs.f2.secondary || '— [Failover not set]') + ' [FAILOVER]' : (facs.f2.primary || '— [Not specified]')}</p>
                        <p className="pl-2">3. {facs.f3.name || 'Tertiary Facility'}: {facs.f3.isFailover ? (facs.f3.secondary || '— [Failover not set]') + ' [FAILOVER]' : (facs.f3.primary || '— [Not specified]')}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">2. CRITICAL HAZARD OPERATIONAL PROTOCOLS</h4>
                    <p>• Wildfire Fuel Belt: {wfFuels || '—'} | Water Draw: {wfWater || '—'} | Livestock: {wfLivestock || '—'}</p>
                    <p>• Structural Urban Fire Cordon: {ufCordonDist ? `${ufCordonDist}m` : '—'} | Bypass: {ufBypassRoute || '—'} | Warmth: {ufWarmthHub || '—'}</p>
                    <p>• River & Flood Spate: {flRiver || '—'} {flSepaCode ? `(${flSepaCode})` : ''} | Sandbags: {flSandbagLoc || '—'} {flSandbagTel ? `(Tel: ${flSandbagTel})` : ''} | High Ground: {flHighGround || '—'}</p>
                    <p>• Grid Outage Warm Space: {scenarioFacilities.power?.f1?.primary || '—'} {poWarmHours ? `(${poWarmHours})` : ''} | Generator: {poGeneratorSpecs || '—'} | Net: {poRadioRepeater || '—'}</p>
                    <p>• Water Shortage: {drPwsCount || '—'} | Bowser: {drBowserLoc || '—'} | Bottled Hub: {drBottledHub || '—'}</p>
                    <p>• Public Safety: Avoid {cuAvoidArea || '—'} | Police Scotland Liaison: {cuPoliceLiaison || '—'}</p>
                    <p>• Civil Defence: Spring: {cdWaterSpring || '—'} | Shelter: {cdShelterLoc || '—'}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">3. KEYHOLDERS & EMERGENCY INFRASTRUCTURE ACCESS REGISTER</h4>
                    {keyholdersList.map((kh, idx) => (
                      <p key={kh.id || idx}>
                        • <strong>{kh.facilityOrAsset || 'Facility / Asset'}</strong> ({kh.category}): Primary: {kh.primaryName || '________________'} ({kh.primaryPhone || '__________'}){kh.backupName ? ` | Backup: ${kh.backupName} (${kh.backupPhone || '__________'})` : ''} | Notes: {kh.keyLocationNotes || '—'}
                      </p>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">4. COMMUNITY ASSET & CAPABILITY REGISTER</h4>
                    <p>• 4x4 Vehicles & Winches: {ast4x4 || '—'}</p>
                    <p>• Forestry Chainsaw Teams: {astChainsaws || '—'}</p>
                    <p>• Mobile Diesel Generators: {astGenerators || '—'}</p>
                    <p>• PMR446 / HAM Operators: {astRadios || '—'}</p>
                    <p>• Heavy Agricultural Tractors & Ploughs: {astHeavyTractors || '—'}</p>
                    <p>• Estate Argo-Cats & Quads: {astArgocatsQuads || '—'}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground border-b pb-1">5. COMMUNICATIONS & CELLULAR BLACKOUT NET</h4>
                    <p>• Radio Net Frequencies: {commsHamFreq || '—'}</p>
                    <p>• Weatherproof Physical Noticeboards: {commsNoticeboards || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 9: LIVE SITUATION MESSAGES & PUBLIC BULLETINS */}
          <TabsContent value="messages" className="space-y-6 mt-4">
            {/* Header Banner */}
            <div className="p-5 rounded-2xl border bg-gradient-to-r from-pink-950/40 via-slate-900 to-slate-950 border-pink-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/40 text-[10px] font-mono uppercase px-2 py-0.5">
                    Live Incident Communications
                  </Badge>
                  {isNoticeActive || (emergencyMessagesList && emergencyMessagesList.some((m: any) => m.isActive)) ? (
                    <Badge className="bg-red-600 text-white font-bold animate-pulse text-[10px] uppercase font-mono tracking-wider">
                      ● Active Incident Bulletins Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] font-mono uppercase">
                      ✓ Normal (No Active Bulletins)
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquareText className="h-5 w-5 text-pink-400" />
                  Live Situation Bulletins & Emergency Broadcast Archive
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Broadcast verified situation updates to the public portal. When an incident is resolved, execute Stand Down to archive active warnings to the compliance audit log.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => setIsStandDownDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="bg-emerald-950/60 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60 text-xs font-bold gap-2 shrink-0 shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 🟢 Stand Down & Archive All
                </Button>

                {isNoticeActive && (
                  <Button
                    onClick={() => setIsRetractDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="bg-red-950/40 border-red-500/60 text-red-300 hover:bg-red-900/60 text-xs font-bold gap-2 shrink-0"
                  >
                    <XCircle className="h-4 w-4 text-red-400" /> Retract Active Notice
                  </Button>
                )}
              </div>
            </div>

            {/* Currently Active Live Notice Card */}
            {isNoticeActive && (
              <Card className="border-red-500/50 bg-red-950/20 shadow-xl">
                <CardHeader className="p-4 bg-red-950/40 border-b border-red-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 animate-bounce" />
                      <CardTitle className="text-sm font-bold text-red-200">
                        Active Public Emergency Bulletin (Live on Portal)
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="border-red-500/50 text-red-300 font-mono text-[10px]">
                      Live Now
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <p className="text-sm font-extrabold text-white">{noticeHeadline || 'Emergency Situation Notice'}</p>
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-red-500/20">
                    {noticeMessage}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Issued By: <strong className="text-slate-200">{noticeIssuedBy || 'Incident Commander'}</strong></span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulletin Composer */}
            <Card className="border-slate-800 bg-slate-950/80 shadow-md">
              <CardHeader className="p-4 md:p-5 bg-muted/20 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-pink-400" /> Draft & Dispatch New Public Bulletin
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Compose official community emergency bulletin. Requires Leader / Incident Commander authorization.
                    </CardDescription>
                  </div>
                  {!permissions.canSendMessages && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px]">
                      🔒 Read-Only Access
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
                {!permissions.canSendMessages ? (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-center gap-3">
                    <Lock className="h-5 w-5 text-amber-400 shrink-0" />
                    <p>You have view-only access to emergency communications. Publishing bulletins requires the <strong>"Action: Publish & Retract Live Public Bulletins"</strong> permission from the community leader in Settings.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="font-bold text-slate-200">Bulletin Headline / Title *</Label>
                        <Input
                          value={msgTitle}
                          onChange={(e) => setMsgTitle(e.target.value)}
                          placeholder="e.g. URGENT: High Street Cordon Active - Divert Traffic via Old Spey Bridge"
                          className="bg-slate-900 border-slate-700 text-white font-semibold text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-200">Severity Level</Label>
                        <Select value={msgLevel} onValueChange={(val: any) => setMsgLevel(val)}>
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-9 font-semibold">
                            <SelectValue placeholder="Severity" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-slate-800 text-white">
                            <SelectItem value="critical">🔴 Critical Emergency (Red)</SelectItem>
                            <SelectItem value="warning">🟠 Amber Threat Warning</SelectItem>
                            <SelectItem value="advisory">🟡 Community Advisory (Yellow)</SelectItem>
                            <SelectItem value="allclear">🟢 All-Clear / Stood Down</SelectItem>
                            <SelectItem value="info">ℹ️ General Resilience Info</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-200">Hazard / Incident Category</Label>
                        <Select value={msgCategory} onValueChange={(val) => setMsgCategory(val)}>
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-9">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-slate-800 text-white">
                            <SelectItem value="general">🌐 General Emergency</SelectItem>
                            <SelectItem value="wildfire">🌲 Wildfire & Moorland</SelectItem>
                            <SelectItem value="urbanfire">🏢 Urban & Building Fire</SelectItem>
                            <SelectItem value="flood">🌊 River Flood & Surge</SelectItem>
                            <SelectItem value="power">⚡ Grid Power Outage</SelectItem>
                            <SelectItem value="drought">💧 Water Shortage / Drought</SelectItem>
                            <SelectItem value="unrest">🛡️ Civil Unrest / Public Safety</SelectItem>
                            <SelectItem value="defence">🎖️ Civil Defence / Contingency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-200">Author Name</Label>
                        <Input
                          value={msgAuthorName}
                          onChange={(e) => setMsgAuthorName(e.target.value)}
                          placeholder={(userProfile as any)?.name || user?.displayName || 'Incident Lead'}
                          className="bg-slate-900 border-slate-700 text-white text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-200">Author Official Role</Label>
                        <Input
                          value={msgAuthorRole}
                          onChange={(e) => setMsgAuthorRole(e.target.value)}
                          placeholder="e.g. Incident Commander / Resilience Lead"
                          className="bg-slate-900 border-slate-700 text-white text-xs h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-slate-200">Official Situation Notice & Verified Action Directions *</Label>
                        <span className="text-[10px] text-slate-400">Displayed in full on public emergency page</span>
                      </div>
                      <Textarea
                        value={msgBody}
                        onChange={(e) => setMsgBody(e.target.value)}
                        placeholder="Provide clear, verified facts: e.g. exact road closures, location of sandbag depots, shelter opening times, generator status, water tanker locations, and 999/101 instructions..."
                        rows={4}
                        className="bg-slate-900 border-slate-700 text-white text-xs leading-relaxed resize-y"
                      />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                      <p className="text-[11px] text-slate-400">
                        Publishing immediately updates the live public emergency portal for <strong>{townshipName}</strong>.
                      </p>
                      <Button
                        onClick={handlePublishMessage}
                        disabled={isPublishingMessage}
                        className="w-full sm:w-auto bg-pink-600 hover:bg-pink-500 text-white font-bold gap-2 text-xs shadow-lg shadow-pink-950/60"
                      >
                        {isPublishingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        📢 Publish Live Bulletin to Public Portal
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Historical Emergency Bulletins Stream & Archive Matrix */}
            <Card className="border-slate-800 bg-slate-950/80 shadow-md">
              <CardHeader className="p-4 bg-muted/20 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Emergency Bulletins History & Archive ({emergencyMessagesList?.length || 0})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chronological log of all situation notices and archived historical records.
                    </CardDescription>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBulletinFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        bulletinFilter === 'all'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({emergencyMessagesList?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulletinFilter('active')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        bulletinFilter === 'active'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Active</span>
                      <span className="text-[10px] px-1 bg-emerald-950 rounded">
                        {emergencyMessagesList?.filter((m: any) => m.isActive).length || 0}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulletinFilter('archived')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        bulletinFilter === 'archived'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Archived</span>
                      <span className="text-[10px] px-1 bg-slate-800 rounded">
                        {emergencyMessagesList?.filter((m: any) => !m.isActive).length || 0}
                      </span>
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 md:p-6 space-y-3">
                {(() => {
                  const filteredList = (emergencyMessagesList || []).filter((msg: any) => {
                    if (bulletinFilter === 'active') return msg.isActive;
                    if (bulletinFilter === 'archived') return !msg.isActive;
                    return true;
                  });

                  if (filteredList.length === 0) {
                    return (
                      <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center space-y-1 text-xs text-slate-400">
                        <p className="font-bold text-white">No bulletins found for this filter ({bulletinFilter}).</p>
                        <p>All emergency messages and archived records will be displayed here.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredList.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-xl border transition-all space-y-2 text-xs ${
                            msg.isActive
                              ? 'bg-slate-900/80 border-pink-500/50 shadow-md'
                              : 'bg-slate-900/30 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                className={`text-[10px] font-mono uppercase ${
                                  msg.level === 'critical'
                                    ? 'bg-red-600 text-white'
                                    : msg.level === 'warning'
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : msg.level === 'allclear'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-blue-600 text-white'
                                }`}
                              >
                                {msg.level}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] uppercase font-mono border-slate-700 text-slate-300">
                                {msg.hazardCategory || 'General'}
                              </Badge>
                              <span className="font-bold text-white text-sm">{msg.title}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {msg.isActive ? (
                                <>
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                                    Active On Portal
                                  </Badge>
                                  {permissions.canSendMessages && (
                                    <Button
                                      onClick={() => handleArchiveMessage(msg.id)}
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-2"
                                    >
                                      📦 Archive / Clear
                                    </Button>
                                  )}
                                  {permissions.canSendMessages && (
                                    <Button
                                      onClick={() => handleRetractMessage(msg.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-300 px-2"
                                    >
                                      Retract
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px] bg-slate-900/60 font-mono">
                                  📦 Stood Down & Archived for Audit
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40 flex-wrap gap-2">
                            <span>
                              Issued by: <strong className="text-slate-300">{msg.authorName}</strong> ({msg.authorRole})
                              {msg.archiveReason && (
                                <span className="text-slate-500 ml-2 italic">• Reason: {msg.archiveReason}</span>
                              )}
                            </span>
                            <span>
                              Published:{' '}
                              {msg.createdAt?.toDate
                                ? msg.createdAt.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Recent'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Stand Down & Bulk Archive Wizard Dialog */}
            <Dialog open={isStandDownDialogOpen} onOpenChange={setIsStandDownDialogOpen}>
              <DialogContent className="sm:max-w-lg bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" /> Stand Down Emergency Incident & Archive Bulletins
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Executes official emergency stand-down. All active emergency warning bulletins will be archived to the compliance log and threat status returned to Normal (Green).
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-1">
                    <p className="font-bold">Active Bulletins to be Archived:</p>
                    <p className="text-[11px] text-emerald-300">
                      {emergencyMessagesList?.filter((m: any) => m.isActive).length || 0} active bulletin(s) currently displaying on the public portal will be marked inactive and logged to the permanent audit record.
                    </p>
                  </div>

                  {/* Option to Issue Final All-Clear Notice */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        id="issueAllClear"
                        checked={standDownIssueAllClear}
                        onCheckedChange={(checked) => setStandDownIssueAllClear(Boolean(checked))}
                        className="mt-0.5"
                      />
                      <label htmlFor="issueAllClear" className="font-bold text-white text-xs cursor-pointer">
                        Publish Final Official 🟢 All-Clear Situation Notice on Portal
                      </label>
                    </div>

                    {standDownIssueAllClear && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-300">All-Clear Headline</Label>
                          <Input
                            value={standDownAllClearTitle}
                            onChange={(e) => setStandDownAllClearTitle(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-white text-xs h-8 font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-300">All-Clear Public Message</Label>
                          <Textarea
                            value={standDownAllClearBody}
                            onChange={(e) => setStandDownAllClearBody(e.target.value)}
                            rows={3}
                            className="bg-slate-900 border-slate-700 text-white text-xs resize-y"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsStandDownDialogOpen(false)}
                    className="bg-slate-900 border-slate-700 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStandDownIncident}
                    disabled={isStandingDown}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                  >
                    {isStandingDown ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Confirm Incident Stand-Down & Archive
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Retract Dialog */}
            <Dialog open={isRetractDialogOpen} onOpenChange={setIsRetractDialogOpen}>
              <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" /> Retract Active Emergency Bulletin
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    This will clear the active emergency notice from the public community portal and return threat readiness to Normal (Green).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2 text-xs">
                  <Label className="font-bold text-slate-200">Retraction / Stand-Down Reason (Optional)</Label>
                  <Input
                    value={retractReasonInput}
                    onChange={(e) => setRetractReasonInput(e.target.value)}
                    placeholder="e.g. Threat mitigated, fire extinguished, roads reopened."
                    className="bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsRetractDialogOpen(false)} className="bg-slate-900 border-slate-700 text-slate-300">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleRetractMessage()}
                    disabled={isRetractingMessage}
                    size="sm"
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                  >
                    {isRetractingMessage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Retraction'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* TAB 10: AUDIT & COMPLIANCE EVENT LOG */}
          <TabsContent value="audit" className="space-y-6 mt-4">
            {/* Header Banner */}
            <div className="p-5 rounded-2xl border bg-gradient-to-r from-violet-950/40 via-slate-900 to-slate-950 border-violet-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40 text-[10px] font-mono uppercase px-2 py-0.5">
                    Statutory Compliance Log
                  </Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px] font-mono">
                    {auditLogsList?.length || 0} Recorded Actions
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-violet-400" />
                  Statutory Resilience Audit & Incident Event Log
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Immutable, tamper-evident chronological audit trail of all resilience plan updates, public emergency bulletins, facility failovers, and 6-monthly statutory certifications.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800 text-xs font-bold gap-2"
                >
                  <Printer className="h-4 w-4 text-violet-400" /> Export / Print Audit Report
                </Button>
              </div>
            </div>

            {/* Audit Filter & Search Bar */}
            <Card className="border-slate-800 bg-slate-950/80 shadow-md">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="relative w-full md:w-80">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Search actor, summary, category..."
                      className="pl-9 bg-slate-900 border-slate-700 text-white text-xs h-9"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto overflow-x-auto pb-1">
                    {[
                      { key: 'ALL', label: 'All Events' },
                      { key: 'STAND_DOWN', label: '🟢 Stand-Downs' },
                      { key: 'BULLETIN_PUBLISH', label: 'Bulletins' },
                      { key: 'BULLETIN_ARCHIVE', label: 'Archived' },
                      { key: 'BULLETIN_RETRACT', label: 'Retractions' },
                      { key: 'PLAN_SAVE', label: 'Plan Saves' },
                      { key: 'FAILOVER_TOGGLE', label: 'Failovers' },
                      { key: 'CERTIFICATION_SIGN', label: 'Certifications' },
                      { key: 'THREAT_CHANGE', label: 'Threat Changes' },
                    ].map((f) => (
                      <Button
                        key={f.key}
                        type="button"
                        variant={auditFilterType === f.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAuditFilterType(f.key)}
                        className={`text-[11px] h-7 px-2.5 rounded-lg ${
                          auditFilterType === f.key
                            ? 'bg-violet-600 hover:bg-violet-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audit Records Stream */}
            <Card className="border-slate-800 bg-slate-950/80 shadow-md">
              <CardHeader className="p-4 bg-muted/20 border-b border-slate-800">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-violet-400" /> Official Audit Activity Stream
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-3">
                {!permissions.canViewAudit ? (
                  <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-center gap-3">
                    <Lock className="h-6 w-6 text-amber-400 shrink-0" />
                    <p>Access to the statutory audit log is restricted to authorized community leaders. Contact your community administrator to enable <strong>"View: Emergency & Compliance Audit Log"</strong> in Settings.</p>
                  </div>
                ) : (
                  (() => {
                    const filteredLogs = (auditLogsList || []).filter((item: any) => {
                      if (auditFilterType !== 'ALL' && item.actionType !== auditFilterType) return false;
                      if (!auditSearch.trim()) return true;
                      const q = auditSearch.toLowerCase();
                      return (
                        item.summary?.toLowerCase().includes(q) ||
                        item.actorName?.toLowerCase().includes(q) ||
                        item.category?.toLowerCase().includes(q) ||
                        item.actionType?.toLowerCase().includes(q)
                      );
                    });

                    if (filteredLogs.length === 0) {
                      return (
                        <div className="p-10 rounded-xl border border-dashed border-slate-800 text-center space-y-1.5 text-xs text-slate-400">
                          <p className="font-bold text-white">No audit records found.</p>
                          <p>All plan modifications, bulletins, and statutory certifications will appear here automatically.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {filteredLogs.map((log: any, idx: number) => {
                          const actionColor =
                            log.actionType === 'BULLETIN_PUBLISH'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : log.actionType === 'BULLETIN_RETRACT'
                              ? 'bg-slate-700/60 text-slate-300 border-slate-600'
                              : log.actionType === 'CERTIFICATION_SIGN' || log.actionType === 'LSO_ENDORSEMENT'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : log.actionType === 'FAILOVER_TOGGLE'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : log.actionType === 'THREAT_CHANGE'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40';

                          return (
                            <div
                              key={log.id || idx}
                              className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-3">
                                <Badge className={`text-[9px] font-mono uppercase px-2 py-0.5 shrink-0 ${actionColor}`}>
                                  {log.actionType?.replace('_', ' ')}
                                </Badge>
                                <div className="space-y-1">
                                  <p className="font-bold text-white">{log.summary}</p>
                                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                                    <span>Actor: <strong className="text-slate-200">{log.actorName}</strong> ({log.actorRole})</span>
                                    {log.category && <Badge variant="outline" className="text-[9px] border-slate-700 py-0">{log.category}</Badge>}
                                  </div>
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-400 font-mono shrink-0 md:text-right">
                                {log.timestamp?.toDate
                                  ? log.timestamp.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                  : 'Just now'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* OPERATIONAL RESPONSE TIMELINE */}
      {['wildfire', 'urbanfire', 'flood', 'power', 'drought', 'unrest', 'defence'].includes(activeHazard) && (
        <Card className="border shadow-md">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Operational Response Timeline
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] capitalize font-mono border-amber-500/40 text-amber-500">
                    {activeHazard} ({currentTimelineStages.length} Milestones)
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Event-specific protocol milestones and operational instructions for {activeHazard.toUpperCase()}. Add or remove stages to suit your community.
                </CardDescription>
              </div>

              <Button
                onClick={() => handleAddDynamicTimelineStage(activeHazard)}
                size="sm"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
              >
                <Plus className="h-4 w-4 text-slate-950" /> Add Response Milestone
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentTimelineStages.map((stage, idx) => (
                <div
                  key={stage.id || idx}
                  className="p-3.5 rounded-xl border bg-card space-y-2 relative group transition-all hover:border-amber-500/40"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <Input
                      value={stage.timeTag}
                      onChange={(e) => handleUpdateDynamicTimelineStage(activeHazard, stage.id, 'timeTag', e.target.value)}
                      placeholder="e.g. T+00 MINS"
                      className="h-6 text-xs font-black text-amber-500 uppercase tracking-wider p-0 border-none bg-transparent focus-visible:ring-0 w-28"
                    />
                    <Button
                      onClick={() => handleDeleteDynamicTimelineStage(activeHazard, stage.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                      title="Remove milestone"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>

                  <Input
                    value={stage.title}
                    onChange={(e) => handleUpdateDynamicTimelineStage(activeHazard, stage.id, 'title', e.target.value)}
                    placeholder="Milestone Action Title"
                    className="font-bold text-xs h-8"
                  />
                  <Textarea
                    value={stage.desc}
                    onChange={(e) => handleUpdateDynamicTimelineStage(activeHazard, stage.id, 'desc', e.target.value)}
                    placeholder="Detailed operational instructions for volunteers..."
                    rows={3}
                    className="text-xs resize-y min-h-[60px]"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KEYHOLDERS & INFRASTRUCTURE ACCESS REGISTER */}
      {!['evacuation', 'messages', 'audit'].includes(activeHazard) && (
        <>
          <Card className="border shadow-md">
        <CardHeader className="bg-gradient-to-r from-amber-950/20 via-muted/30 to-muted/20 border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-500" />
                  Keyholders & Emergency Infrastructure Access Register
                </CardTitle>
                <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px] uppercase font-mono">
                  {keyholdersList.length} Access Points
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Emergency 24/7 keyholders for community rest shelters, fire hydrant standpipe caches, private estate firebreak gates, and sandbag stores.
              </CardDescription>
            </div>
            <Button
              onClick={handleAddKeyholder}
              size="sm"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0"
            >
              <Plus className="h-4 w-4 text-slate-950" /> Add Keyholder / Access Point
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {keyholdersList.map((kh, idx) => (
              <div
                key={kh.id || idx}
                className="p-4 rounded-xl border bg-card/60 hover:bg-card/90 space-y-3 relative group transition-all hover:border-amber-500/40 shadow-sm"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <Input
                    value={kh.facilityOrAsset}
                    onChange={(e) => handleUpdateKeyholder(kh.id, 'facilityOrAsset', e.target.value)}
                    placeholder="Facility / Infrastructure Asset (e.g. Village Hall or Hydrant Keys)"
                    className="bg-transparent border-none text-xs font-bold text-foreground p-0 h-auto focus-visible:ring-0 focus-visible:bg-muted/40 flex-grow mr-2"
                  />
                  <Button
                    onClick={() => handleDeleteKeyholder(kh.id)}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                    title="Delete this keyholder record"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Category / Asset Type</Label>
                  <Input
                    value={kh.category}
                    onChange={(e) => handleUpdateKeyholder(kh.id, 'category', e.target.value)}
                    placeholder="e.g. Building / Shelter, Hydrants & Water, Estate Gates, Sandbag Store"
                    className="h-7 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
                    <Label className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                      <Key className="h-3 w-3" /> Primary Keyholder
                    </Label>
                    <Input
                      value={kh.primaryName}
                      onChange={(e) => handleUpdateKeyholder(kh.id, 'primaryName', e.target.value)}
                      placeholder="Name / Role"
                      className="h-7 text-xs font-medium"
                    />
                    <Input
                      value={kh.primaryPhone}
                      onChange={(e) => handleUpdateKeyholder(kh.id, 'primaryPhone', e.target.value)}
                      placeholder="24/7 Phone Number"
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                      <Key className="h-3 w-3" /> Backup / Secondary
                    </Label>
                    <Input
                      value={kh.backupName || ''}
                      onChange={(e) => handleUpdateKeyholder(kh.id, 'backupName', e.target.value)}
                      placeholder="Name / Role"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={kh.backupPhone || ''}
                      onChange={(e) => handleUpdateKeyholder(kh.id, 'backupPhone', e.target.value)}
                      placeholder="24/7 Phone Number"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Key Location, Key Safe Code & Access Instructions</Label>
                  <Textarea
                    value={kh.keyLocationNotes || ''}
                    onChange={(e) => handleUpdateKeyholder(kh.id, 'keyLocationNotes', e.target.value)}
                    placeholder="e.g. Master key safe on wall (Code with SFRS/Police). Spare key with Caretaker..."
                    rows={2}
                    className="text-[11px] resize-y min-h-[50px] leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              <Dialog open={isAddVolModalOpen} onOpenChange={setIsAddVolModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs gap-1.5 h-8 whitespace-nowrap shadow-sm border-0">
                    <UserPlus className="h-4 w-4 text-slate-950" /> Add Volunteer / Skill
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card border text-card-foreground">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      <HeartHandshake className="h-4 w-4 text-emerald-500" />
                      Add Volunteer to Resilience Register
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Manually register a local resident, contractor, or volunteer with specialized equipment or emergency skills.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3.5 py-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="font-bold">Contact Name / Owner *</Label>
                        <Input
                          value={volNameInput}
                          onChange={(e) => setVolNameInput(e.target.value)}
                          placeholder="e.g. John MacDonald (Owner/Lead)"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-bold">Operator Name (If Different)</Label>
                        <Input
                          value={volOperatorInput}
                          onChange={(e) => setVolOperatorInput(e.target.value)}
                          placeholder="e.g. Gordon Smith (Driver/Operator)"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold">Contact Phone Number *</Label>
                      <Input
                        value={volPhoneInput}
                        onChange={(e) => setVolPhoneInput(e.target.value)}
                        placeholder="e.g. 07700 900123"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold">Skills & Equipment Capabilities</Label>
                      <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
                        {VOLUNTEER_SKILL_OPTIONS.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 p-1 text-[11px] rounded hover:bg-muted/40 cursor-pointer">
                            <Checkbox
                              checked={volSelectedSkills.includes(item.label)}
                              onCheckedChange={() => handleToggleVolSkill(item.label)}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold">Vehicle Specs / Equipment Notes (Optional)</Label>
                      <Textarea
                        value={volNotesInput}
                        onChange={(e) => setVolNotesInput(e.target.value)}
                        placeholder="e.g. Land Rover Defender with 9,500lb winch; 8kVA portable generator"
                        rows={2}
                        className="text-xs resize-y min-h-[60px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleManualSaveVolunteer}
                      disabled={isSavingVol}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 w-full sm:w-auto"
                    >
                      {isSavingVol ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Save Volunteer Record
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users2 className="h-3.5 w-3.5 text-primary" /> Registered Local Community Volunteers ({registeredVolunteers?.length || 0})
              </h4>
            </div>

            {registeredVolunteers && registeredVolunteers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {registeredVolunteers.map((vol: any) => (
                  <div key={vol.id} className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs relative group transition-all hover:border-primary/40">
                    <div className="flex items-center justify-between font-bold border-b pb-1.5">
                      <div>
                        <span className="text-foreground">{vol.contactName || vol.userName || 'Community Resident'}</span>
                        {vol.operatorName && (
                          <span className="block text-[11px] font-normal text-amber-600 dark:text-amber-400">
                            🚜 Operator: <strong>{vol.operatorName}</strong>
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={() => handleDeleteVolunteer(vol.id, vol.userName)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded shrink-0"
                        title="Remove Volunteer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {vol.phone && (
                      <p className="text-[11px] font-mono text-primary font-semibold">
                        📞 {vol.phone}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {vol.skills?.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 bg-background font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>

                    {vol.equipmentNotes && (
                      <p className="text-[11px] text-muted-foreground italic pt-0.5">&ldquo;{vol.equipmentNotes}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed bg-muted/10 text-center space-y-1.5 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">No volunteers registered yet.</p>
                <p className="text-[11px]">
                  Volunteers who submit their details via the Public Community Portal will appear here automatically, or you can add them manually with the <strong>"Add Volunteer / Skill"</strong> button above.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* ADDITIONAL OPERATIONAL INFORMATION & RESILIENCE NOTES (UNIQUE PER SCENARIO) */}
      {['wildfire', 'urbanfire', 'flood', 'power', 'drought', 'unrest', 'defence'].includes(activeHazard) && (
        <Card className="border shadow-md bg-card">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  Additional Operational Information & Resilience Notes
                </CardTitle>
                <CardDescription className="text-xs">
                  Specific operational notes, landowner agreements, muster points, or local instructions strictly for {activeHazard.toUpperCase()}.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize font-mono border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                {activeHazard} Notes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-2">
            <div className="bg-card rounded-xl border p-1 shadow-sm">
              <RichTextEditor
                value={scenarioNotes[activeHazard] || ''}
                onChange={(val) => handleUpdateScenarioNotes(activeHazard, val)}
                placeholder={`Type additional resilience notes, local instructions, equipment locations, or bespoke guidance for ${activeHazard} here...`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOTTOM ACTION & SAVE BAR */}
      <div className="p-4 md:p-5 rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              Ready to commit statutory updates?
            </p>
            <p className="text-xs text-slate-400">
              Save all changes to the living plan document and sync with the public emergency portal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-white gap-2 font-medium shadow-sm h-9 text-xs"
          >
            <Printer className="h-4 w-4 text-cyan-400" /> Print Document
          </Button>

          <Button
            onClick={handleSavePlan}
            disabled={isSavingPlan}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold shadow-lg shadow-emerald-950/40 h-9 text-xs px-5"
          >
            {isSavingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
            Save Statutory Plan
          </Button>
        </div>
      </div>
      {/* DIALOG: ADD/EDIT TRANSPORT PARTNER */}
      <Dialog open={isPartnerModalOpen} onOpenChange={setIsPartnerModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingPartner ? 'Edit Evacuation Transport Partner' : 'Add Evacuation Transport Partner'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure partner vehicle tier, road access sector, and emergency dispatch contact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">Operator / Company Name</Label>
              <Input
                value={partnerFormData.operator || ''}
                onChange={(e) => setPartnerFormData(prev => ({ ...prev, operator: e.target.value }))}
                placeholder="e.g. Stagecoach North Scotland / Strathspey Cabs"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Vehicle Tier</Label>
                <Select
                  value={partnerFormData.vehicleType || 'coach'}
                  onValueChange={(val: TransportVehicleType) => setPartnerFormData(prev => ({ ...prev, vehicleType: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Vehicle Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coach">🚌 Large Coach (50-70pax)</SelectItem>
                    <SelectItem value="minibus">🚐 Minibus (12-16pax)</SelectItem>
                    <SelectItem value="accessible_van">♿ Accessible Lift Van</SelectItem>
                    <SelectItem value="taxi_4x4">🚕 Taxi / 4x4 Private Hire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold"># Vehicles</Label>
                <Input
                  type="number"
                  min={1}
                  value={partnerFormData.vehicleCount || 1}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, vehicleCount: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Total Seats</Label>
                <Input
                  type="number"
                  min={1}
                  value={partnerFormData.totalSeats || 50}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, totalSeats: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Assigned Road Sector / Access Zone</Label>
              <Input
                value={partnerFormData.assignedSector || ''}
                onChange={(e) => setPartnerFormData(prev => ({ ...prev, assignedSector: e.target.value }))}
                placeholder="e.g. Arterial High Street & A95 / Rural Single-Track Lanes"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">24/7 Emergency Dispatch Contact (Phone / Radio)</Label>
              <Input
                value={partnerFormData.dispatchContact || ''}
                onChange={(e) => setPartnerFormData(prev => ({ ...prev, dispatchContact: e.target.value }))}
                placeholder="e.g. 01463 233371 / 07700 900123"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Primary Staging / Pickup Point</Label>
                <Input
                  value={partnerFormData.pickupMusterPoint || ''}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, pickupMusterPoint: e.target.value }))}
                  placeholder="e.g. The Square & Burnfield Car Park"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Designated Drop-Off Shelter</Label>
                <Input
                  value={partnerFormData.dropoffDestination || ''}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, dropoffDestination: e.target.value }))}
                  placeholder="e.g. Aviemore Sports Complex (Shelter Alpha)"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Operational Notes & Road Constraints</Label>
              <Textarea
                value={partnerFormData.notes || ''}
                onChange={(e) => setPartnerFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Large coaches suitable for main roads only. Single-track passes blocked for large chassis."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPartnerModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePartner} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
              {editingPartner ? 'Save Changes' : 'Add to Fleet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ADD/EDIT COLLECTION POINT */}
      <Dialog open={isPointModalOpen} onOpenChange={setIsPointModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingPoint ? 'Edit Muster Collection Point' : 'Add Passenger Collection Point'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure public muster point location, road suitability, and on-site coordinator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">Muster Point Name</Label>
              <Input
                value={pointFormData.name || ''}
                onChange={(e) => setPointFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. The Square & Burnfield Coach Park"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Physical Address / Landmark</Label>
              <Input
                value={pointFormData.address || ''}
                onChange={(e) => setPointFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. High Street, Grantown-on-Spey, PH26 3HF"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Road Accessibility Tier</Label>
                <Select
                  value={pointFormData.accessibleFor || 'all_vehicles'}
                  onValueChange={(val: RoadAccessibilityTier) => setPointFormData(prev => ({ ...prev, accessibleFor: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Accessibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_vehicles">🚌 All Vehicles & Full Coaches OK</SelectItem>
                    <SelectItem value="minibus_taxi_only">🚐 Minibus & Taxi ONLY (Narrow Road)</SelectItem>
                    <SelectItem value="4x4_only">🚙 4x4 / Rural Track ONLY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Designated Vehicles</Label>
                <Input
                  value={pointFormData.designatedVehicles || ''}
                  onChange={(e) => setPointFormData(prev => ({ ...prev, designatedVehicles: e.target.value }))}
                  placeholder="e.g. 2x Stagecoach Coaches + Minibuses"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Designated Drop-Off Destination Shelter</Label>
              <Input
                value={pointFormData.dropoffShelter || ''}
                onChange={(e) => setPointFormData(prev => ({ ...prev, dropoffShelter: e.target.value }))}
                placeholder="e.g. Aviemore Community Centre (Shelter Alpha)"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">On-Site Coordinator Name</Label>
                <Input
                  value={pointFormData.onSiteCoordinator || ''}
                  onChange={(e) => setPointFormData(prev => ({ ...prev, onSiteCoordinator: e.target.value }))}
                  placeholder="e.g. John MacRae (Community Warden)"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Coordinator Contact Phone</Label>
                <Input
                  value={pointFormData.coordinatorPhone || ''}
                  onChange={(e) => setPointFormData(prev => ({ ...prev, coordinatorPhone: e.target.value }))}
                  placeholder="e.g. 07700 900222"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPointModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePoint} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
              {editingPoint ? 'Save Changes' : 'Add Muster Point'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: PRINTABLE DRIVER MANIFEST & INCIDENT BRIEFING */}
      <Dialog open={isPrintManifestModalOpen} onOpenChange={setIsPrintManifestModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-950">
          <DialogHeader>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bus className="h-5 w-5 text-teal-600" />
                  EMERGENCY EVACUATION DRIVER BRIEFING & MANIFEST
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  Official operational transport sheet for Stagecoach drivers, taxi marshals, and emergency services.
                </DialogDescription>
              </div>
              <Button onClick={handlePrintDriverManifest} size="sm" className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs gap-1.5 shadow-sm">
                <Printer className="h-4 w-4" /> Print Sheet
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs font-mono">
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 space-y-1">
              <p className="font-bold text-slate-900 text-sm">COMMUNITY: {townshipName.toUpperCase()}</p>
              <p className="text-slate-700">DATE: {new Date().toLocaleDateString('en-GB')} | CRISIS TRANSPORT NET</p>
              <p className="text-slate-700">TOTAL FLEET CAPACITY: {evacuationPartners.reduce((acc, p) => acc + (p.totalSeats || 0), 0)} PASSENGER SEATS</p>
            </div>

            {/* Fleet Roster */}
            <div>
              <p className="font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase mb-2">1. REGISTERED EVACUATION FLEET PARTNERS</p>
              <div className="space-y-2">
                {evacuationPartners.map((p, idx) => (
                  <div key={p.id || idx} className="p-2 bg-slate-50 border rounded-lg text-[11px] space-y-0.5">
                    <p className="font-bold text-slate-900">
                      [{p.vehicleType.toUpperCase()}] {p.operator} — {p.vehicleCount} VEHICLE(S) ({p.totalSeats} SEATS)
                    </p>
                    <p className="text-slate-700">SECTOR: {p.assignedSector}</p>
                    <p className="text-slate-700">24/7 DISPATCH: {p.dispatchContact}</p>
                    <p className="text-slate-700">STAGING / PICKUP: {p.pickupMusterPoint} ➔ DROP-OFF: {p.dropoffDestination}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection Points */}
            <div>
              <p className="font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase mb-2">2. DESIGNATED PASSENGER COLLECTION POINTS</p>
              <div className="space-y-2">
                {collectionPoints.map((pt, idx) => (
                  <div key={pt.id || idx} className="p-2 bg-slate-50 border rounded-lg text-[11px] space-y-0.5">
                    <p className="font-bold text-slate-900">{pt.name} — [{pt.accessibleFor.toUpperCase()}]</p>
                    <p className="text-slate-700">ADDRESS: {pt.address}</p>
                    <p className="text-slate-700">TARGET ROADS: {pt.targetRoads}</p>
                    <p className="text-slate-700">DROP-OFF RECEPTION: {pt.dropoffShelter}</p>
                    <p className="text-slate-700">ON-SITE COORDINATOR: {pt.onSiteCoordinator} ({pt.coordinatorPhone})</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-1">
              <p className="font-bold">⚠️ CRITICAL DRIVER INSTRUCTIONS:</p>
              <p>1. Follow designated emergency corridors strictly. Avoid rural single-track passes if operating large coaches.</p>
              <p>2. Report departure headcount and arrival at reception shelter via radio or emergency dispatch number.</p>
              <p>3. Give priority boarding to non-ambulatory, elderly, and vulnerable residents.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPrintManifestModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
