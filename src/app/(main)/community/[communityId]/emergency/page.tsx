"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, orderBy, limit } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Shield,
  ShieldAlert,
  Flame,
  Building,
  Waves,
  Zap,
  Droplets,
  Radio,
  LifeBuoy,
  Building2,
  CheckCircle2,
  HeartHandshake,
  AlertTriangle,
  Navigation,
  Truck,
  Clock,
  ExternalLink,
  Info,
  PhoneCall,
  Home,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Award,
  ShieldCheck,
  ChevronRight,
  Activity,
  Layers,
  BatteryCharging,
  Utensils,
  MessageSquareText,
  FileText,
  Lock,
  Tractor,
  Users2,
  TreePine,
  KeyRound,
  Key,
  Bus,
  Car
} from "lucide-react";
import { 
  DEFAULT_COLLECTION_POINTS, 
  DEFAULT_EVACUATION_PARTNERS,
  type EvacuationCollectionPoint,
  type EvacuationTransportPartner
} from "@/lib/types/emergencySop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { registerResilienceVolunteerAction, ScenarioFacilitiesMap } from "@/lib/actions/emergencyPlanActions";

type CommunityData = {
  name?: string;
};

const VOLUNTEER_SKILL_OPTIONS = [
  { id: '4x4', label: '4x4 Vehicle with Winch (Bad weather / snow runner)' },
  { id: 'chainsaw', label: 'Chainsaw & NPTC Certification (Clearing fallen trees)' },
  { id: 'generator', label: 'Portable Diesel Generator (Auxiliary power support)' },
  { id: 'tractor', label: 'Heavy Agricultural Tractor w/ Plough (Firebreaks / clearance)' },
  { id: 'radio', label: 'Licensed PMR446 / HAM Radio Operator (Mesh communications)' },
  { id: 'warmspace', label: 'Warm Space & Canteen Helper (Hot food & welfare shifts)' },
  { id: 'livestock', label: 'Livestock Trailer / Horsebox (Farm animal evacuation)' },
  { id: 'firstaid', label: 'First Aid / Medical Training (Emergency response)' },
];

const DEFAULT_FALLBACK_FACILITIES: ScenarioFacilitiesMap = {
  wildfire: {
    f1: { name: 'Evacuation Corridor / Escape Highway', primary: 'A10 Northbound towards Regional Bypass', secondary: 'B402 Relief Corridor towards Coast', isFailover: false },
    f2: { name: 'Evacuation Refuge & Shelter Hub', primary: 'Oakridge Community Academy Sports Complex', secondary: 'Oakridge Civic Hall & Canteen', isFailover: false },
    f3: { name: 'Incident Command Post', primary: 'Oakridge Town Hall, The Square', secondary: 'Community Centre Main Hall', isFailover: false }
  },
  urbanfire: {
    f1: { name: 'Traffic Bypass & Cordon Corridor', primary: 'Bypass via North Ridge Avenue', secondary: 'Relief Route via Valley Road', isFailover: false },
    f2: { name: 'Immediate Warmth & Family Assembly Hub', primary: 'Oakridge Community Hall, The Square', secondary: 'Civic Centre Assembly Room', isFailover: false },
    f3: { name: 'Forward Fire & Rescue Appliance Staging', primary: 'The Square Central Staging Area', secondary: 'High Street Car Park Hardstanding', isFailover: false }
  },
  flood: {
    f1: { name: 'High-Ground Evacuation Refuge (>220m)', primary: 'Oakridge Community Academy (High Ridge Campus)', secondary: 'Oakridge Sports & Leisure Clubhouse', isFailover: false },
    f2: { name: 'Council Sandbag Collection Depot', primary: 'Municipal Depot, High Street Car Park', secondary: 'Highways Maintenance Yard', isFailover: false },
    f3: { name: 'Emergency Flood Warden Command Desk', primary: 'Civic Command Post', secondary: 'Town Hall Lower Meeting Room', isFailover: false }
  },
  power: {
    f1: { name: 'Warm Space Hub & Soup Canteen (Generator Powered)', primary: 'Community Hub Hall (25kVA Generator, Heating & Kitchen)', secondary: 'Civic Hall Canteen', isFailover: false },
    f2: { name: 'Device Charging & Thermal Blanket Bank', primary: 'Academy Sports Complex (Multi-Socket Bank)', secondary: 'Community Lounge Power Station', isFailover: false },
    f3: { name: 'Off-Grid Mesh Radio Net & Welfare Check Station', primary: 'North Ridge Repeater / PMR Channel 7', secondary: 'Academy Radio Net Controller', isFailover: false }
  },
  drought: {
    f1: { name: 'Emergency Water Bowser Tanker Station', primary: 'High Street Public Car Park (Heavy Tanker Access)', secondary: 'Showgrounds Mobile Bowser Stand', isFailover: false },
    f2: { name: 'Potable Bottled Water Distribution Hub', primary: 'Community Centre Main Hall (10L / person / day)', secondary: 'Town Hall Distribution Desk', isFailover: false },
    f3: { name: 'Agricultural & Livestock Water Draw Point', primary: 'Rural Showgrounds 5000L Mobile Bowser', secondary: 'River Valley Dedicated Pump Point', isFailover: false }
  },
  unrest: {
    f1: { name: 'Public Safety Safe Haven & Sanctuary', primary: 'Town Hall Reinforced Complex & Secure Rooms', secondary: 'Civic Centre Inner Hall', isFailover: false },
    f2: { name: 'Pedestrian & Traffic Avoidance Bypass', primary: 'Bypass High Street via Park Road & Station Way', secondary: 'Outer Perimeter Ring Road', isFailover: false },
    f3: { name: 'Emergency Services Liaison Command Link', primary: 'Regional Command Control Link', secondary: 'Duty Inspector Mobile Command Post', isFailover: false }
  },
  defence: {
    f1: { name: 'Subterranean Reinforced Shelter', primary: 'Oakridge Community Academy Reinforced Basement Complex', secondary: 'Civic Centre Vaulted Cellars', isFailover: false },
    f2: { name: 'Potable Spring & Gravity Water Borehole', primary: 'High Ridge Gravity-Fed Spring Reservoir', secondary: 'Valley Borehole Pump Station', isFailover: false },
    f3: { name: 'Civil Resilience Command Bunker', primary: 'Academy Operations Suite', secondary: 'Town Hall Secure Meeting Room', isFailover: false }
  }
};

const SCENARIO_METADATA: Record<string, {
  label: string;
  shortLabel: string;
  icon: any;
  color: string;
  borderColor: string;
  bgLight: string;
  badgeBg: string;
  simpleSummary: string;
  residentAdvice: string[];
}> = {
  wildfire: {
    label: "🔥 Wildfire & Moorland Fire",
    shortLabel: "Wildfire",
    icon: Flame,
    color: "text-red-600 dark:text-red-400",
    borderColor: "border-red-500",
    bgLight: "bg-red-50 dark:bg-red-950/30",
    badgeBg: "bg-red-600",
    simpleSummary: "Guidance for wildfire threats in surrounding pinewoods, heaths, and rural estates.",
    residentAdvice: [
      "Keep doors and windows firmly closed to prevent smoke inhalation and spark ingress.",
      "Follow the designated escape highway and avoid driving along dense pine plantation corridors.",
      "If you do not drive or require assisted transport, proceed to the nearest designated muster point."
    ]
  },
  urbanfire: {
    label: "🏢 Town & Building Structural Fire",
    shortLabel: "Town Fire",
    icon: Building,
    color: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-500",
    bgLight: "bg-orange-50 dark:bg-orange-950/30",
    badgeBg: "bg-orange-600",
    simpleSummary: "Guidance for major town-centre fires, building collapses, and emergency cordons.",
    residentAdvice: [
      "Keep at least 150 metres clear of active cordons to allow fire engines and tenders rapid access.",
      "If evacuated from your home or business, proceed immediately to the Family Assembly & Warmth Hub.",
      "Follow traffic diversions and do not park on narrow side streets needed by emergency services."
    ]
  },
  flood: {
    label: "🌊 River Flooding & Severe Storms",
    shortLabel: "Flooding",
    icon: Waves,
    color: "text-cyan-600 dark:text-cyan-400",
    borderColor: "border-cyan-500",
    bgLight: "bg-cyan-50 dark:bg-cyan-950/30",
    badgeBg: "bg-cyan-600",
    simpleSummary: "Guidance for river spate, heavy surface flooding, sandbag depots, and high-ground shelters.",
    residentAdvice: [
      "Never walk or drive through floodwater — 30cm of moving water can float a family car.",
      "Collect emergency sandbags from the Council Sandbag Depot if your property is in the flood zone.",
      "If water enters your property, move to the designated High-Ground Evacuation Refuge (>220m contour)."
    ]
  },
  power: {
    label: "⚡ Power Outage & Winter Warmth",
    shortLabel: "Power Cut",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500",
    bgLight: "bg-amber-50 dark:bg-amber-950/30",
    badgeBg: "bg-amber-500 text-slate-950 font-bold",
    simpleSummary: "Guidance during extended electricity blackout, generator-powered warm spaces, and phone charging.",
    residentAdvice: [
      "The community generator-powered Warm Space is open for hot soup, tea, and heated shelter.",
      "Bring your phone, tablet, and charging cables to the device charging station at the sports suite.",
      "Check on elderly or isolated neighbours to ensure they have warm blankets and working torches."
    ]
  },
  drought: {
    label: "💧 Water Shortage & Bowser Points",
    shortLabel: "Water Shortage",
    icon: Droplets,
    color: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500",
    bgLight: "bg-blue-50 dark:bg-blue-950/30",
    badgeBg: "bg-blue-600",
    simpleSummary: "Guidance for private water supply (PWS) dry-ups, potable water rationing, and static bowsers.",
    residentAdvice: [
      "Potable bottled drinking water is available for collection at the central distribution hub (10L/person/day).",
      "Large Scottish Water road bowsers are stationed at the main car park for refilling clean domestic containers.",
      "Report private spring or borehole dry-ups to the local water resilience team for emergency tank delivery."
    ]
  },
  evacuation: {
    label: "🚌 Civic Evacuation & Transport Shuttles",
    shortLabel: "Evacuation Fleet",
    icon: Bus,
    color: "text-teal-600 dark:text-teal-400",
    borderColor: "border-teal-500",
    bgLight: "bg-teal-50 dark:bg-teal-950/30",
    badgeBg: "bg-teal-600",
    simpleSummary: "Designated pickup points, Stagecoach buses, accessible minibuses, and taxis for non-drivers.",
    residentAdvice: [
      "If an evacuation is declared and you don't drive, walk to your nearest designated muster collection point.",
      "Stagecoach arterial coaches, community minibuses, and local 4x4 taxis will transport you to reception shelters.",
      "Wheelchair users and non-ambulatory residents can request door-to-door escort via the duty dispatch number."
    ]
  },
  unrest: {
    label: "🛡️ Civil Unrest & Public Safety",
    shortLabel: "Public Safety",
    icon: ShieldCheck,
    color: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500",
    bgLight: "bg-purple-50 dark:bg-purple-950/30",
    badgeBg: "bg-purple-600",
    simpleSummary: "Advisories for civil disturbances, crowd safety, safe haven sanctuaries, and bypass routes.",
    residentAdvice: [
      "Avoid designated core unrest areas and use the outer perimeter pedestrian ring routes.",
      "Proceed to the Town Hall reinforced sanctuary if you feel unsafe or require immediate protection.",
      "Follow direct instructions from Police Scotland officers on the ground."
    ]
  },
  defence: {
    label: "🎖️ Civil Defence & State Emergency",
    shortLabel: "Civil Defence",
    icon: Award,
    color: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
    badgeBg: "bg-emerald-600",
    simpleSummary: "Reinforced basement shelters, gravity-fed emergency water springs, and civil protection.",
    residentAdvice: [
      "Report to the reinforced shelter complex during severe national infrastructure emergencies.",
      "Gravity-fed potable spring water distribution points operate independently of the electric grid.",
      "Tune into local battery radios (PMR Channel 7 / HAM 2M) for official verified civil situation broadcasts."
    ]
  }
};

export default function CommunityEmergencyPortalPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.communityId as string;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  // Real-time listener on Community doc
  const communityDocRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId) : null), [communityId, db]);
  const { data: communityData, isLoading: isCommLoading } = useDoc<CommunityData>(communityDocRef);

  // Real-time listener on Emergency Plan doc so public view updates instantly!
  const emergencyPlanRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId, 'emergency_plan', 'main') : null), [communityId, db]);
  const { data: emergencyPlan, isLoading: isPlanLoading } = useDoc<any>(emergencyPlanRef);

  // Real-time listener on live Emergency Bulletins subcollection
  const messagesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(collection(db, `communities/${communityId}/emergency_messages`), orderBy('createdAt', 'desc'), limit(10));
  }, [communityId, db]);
  const { data: publicMessagesList } = useCollection<any>(messagesQuery);

  // User-selected plan state (defaulting to the leader's active hazard or 'power')
  const activeLeaderScenario = emergencyPlan?.activeHazardScenario || 'wildfire';
  const threatStatus = emergencyPlan?.currentThreatStatus || 'normal';
  const isCrisisMode = threatStatus === 'incident' || threatStatus === 'advisory';

  const [selectedPlan, setSelectedPlan] = React.useState<string>(activeLeaderScenario);

  // Sync selectedPlan if an active crisis is declared by leaders
  React.useEffect(() => {
    if (isCrisisMode && activeLeaderScenario) {
      setSelectedPlan(activeLeaderScenario);
    }
  }, [isCrisisMode, activeLeaderScenario]);

  // Volunteer Sign-Up Modal State
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = React.useState(false);
  const [volContactName, setVolContactName] = React.useState('');
  const [volOperatorName, setVolOperatorName] = React.useState('');
  const [volPhone, setVolPhone] = React.useState('');
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  const [volNotes, setVolNotes] = React.useState('');
  const [isSubmittingVol, setIsSubmittingVol] = React.useState(false);

  // Pre-fill contact name from user profile on mount / user change
  React.useEffect(() => {
    if (user && !volContactName) {
      setVolContactName((userProfile as any)?.name || user.displayName || '');
    }
  }, [user, userProfile, volContactName]);

  const communityName = communityData?.name || emergencyPlan?.townshipName || "Community";

  const handleSkillToggle = (skillLabel: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillLabel) ? prev.filter(s => s !== skillLabel) : [...prev, skillLabel]
    );
  };

  const handleRegisterVolunteer = async () => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please log in to register as a community resilience volunteer.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedSkills.length === 0) {
      toast({ title: 'Select at least one skill or asset', variant: 'destructive' });
      return;
    }

    setIsSubmittingVol(true);
    try {
      const primaryName = volContactName.trim() || (userProfile as any)?.name || user.displayName || 'Community Resident';
      const res = await registerResilienceVolunteerAction({
        userId: user.uid,
        communityId,
        userName: primaryName,
        contactName: primaryName,
        operatorName: volOperatorName.trim(),
        userEmail: user.email || '',
        phone: volPhone.trim(),
        skills: selectedSkills,
        equipmentNotes: volNotes.trim()
      });

      if (res.success) {
        toast({
          title: 'Thank You for Volunteering! 🛡️',
          description: `Your skills and assets have been registered with the ${communityName} Community Resilience team.`
        });
        setIsVolunteerModalOpen(false);
      } else {
        toast({ title: 'Registration Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingVol(false);
    }
  };

  // Living Plan Certification Status Calculations
  const lastReviewedAt = emergencyPlan?.lastReviewedAt;
  const isPlanCurrent = React.useMemo(() => {
    if (!lastReviewedAt) return false;
    const reviewedDate = lastReviewedAt?.toDate ? lastReviewedAt.toDate() : new Date(lastReviewedAt);
    if (isNaN(reviewedDate.getTime())) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return reviewedDate >= sixMonthsAgo;
  }, [lastReviewedAt]);

  const formattedLastReviewed = React.useMemo(() => {
    if (!lastReviewedAt) return null;
    const d = lastReviewedAt?.toDate ? lastReviewedAt.toDate() : new Date(lastReviewedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [lastReviewedAt]);

  const formattedNextDue = React.useMemo(() => {
    const nextDue = emergencyPlan?.nextReviewDueAt;
    if (!nextDue) return null;
    const d = nextDue?.toDate ? nextDue.toDate() : new Date(nextDue);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [emergencyPlan?.nextReviewDueAt]);

  if (isCommLoading || isPlanLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-red-500" />
        <p className="text-sm font-medium text-muted-foreground">Connecting to Live Emergency Portal...</p>
      </div>
    );
  }

  // Official Situation Notice State
  const officialNotice = emergencyPlan?.officialNotice;
  const hasActiveNotice = officialNotice?.isActive && (officialNotice?.message || officialNotice?.headline);

  // Selected Plan Metadata & Facilities Resolution
  const activeMeta = SCENARIO_METADATA[selectedPlan] || SCENARIO_METADATA.wildfire;
  const ActiveIcon = activeMeta.icon;

  const currentFacilities = selectedPlan !== 'evacuation' 
    ? (emergencyPlan?.scenarioFacilities?.[selectedPlan] || DEFAULT_FALLBACK_FACILITIES[selectedPlan] || DEFAULT_FALLBACK_FACILITIES.wildfire)
    : null;

  const f1 = currentFacilities?.f1;
  const f2 = currentFacilities?.f2;
  const f3 = currentFacilities?.f3;

  const effectiveF1 = f1?.isFailover ? f1?.secondary : f1?.primary;
  const effectiveF2 = f2?.isFailover ? f2?.secondary : f2?.primary;
  const effectiveF3 = f3?.isFailover ? f3?.secondary : f3?.primary;

  const hasAnyFailover = Boolean(f1?.isFailover || f2?.isFailover || f3?.isFailover);

  // Priorities for the selected plan
  const planPriorities = emergencyPlan?.priorities?.[selectedPlan] || {
    p1: { title: 'Life Safety & Immediate Protection', desc: activeMeta.residentAdvice[0] },
    p2: { title: 'Essential Provisions & Warmth/Water', desc: activeMeta.residentAdvice[1] },
    p3: { title: 'Assistance for Vulnerable Neighbours', desc: activeMeta.residentAdvice[2] }
  };

  // Scenario Multi-Agency Liaisons
  const planLiaisons = emergencyPlan?.scenarioLiaisons?.[selectedPlan] || [];

  return (
    <div className="container max-w-6xl mx-auto py-6 sm:py-8 space-y-6 pb-16">
      
      {/* 1. TOP NAVIGATION & VOLUNTEER ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/community/${communityId}/about`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to About {communityName}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/home">
              <Home className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Home
            </Link>
          </Button>
        </div>

        <Dialog open={isVolunteerModalOpen} onOpenChange={setIsVolunteerModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold shadow-md text-xs sm:text-sm">
              <HeartHandshake className="h-4 w-4" /> Volunteer Skills & 4x4 Assets
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card border text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-500" />
                Register for Community Resilience
              </DialogTitle>
              <DialogDescription className="text-xs">
                Let your local community resilience leaders know what equipment, 4x4 vehicles, generators, or skills you can offer during bad weather, floods, or emergencies.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Contact Name / Owner *</Label>
                  <Input
                    value={volContactName}
                    onChange={(e) => setVolContactName(e.target.value)}
                    placeholder="e.g. John MacDonald (Owner / Lead)"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Operator Name (If Different)</Label>
                  <Input
                    value={volOperatorName}
                    onChange={(e) => setVolOperatorName(e.target.value)}
                    placeholder="e.g. Gordon Smith (Driver / Operator)"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Contact Phone Number *</Label>
                <Input
                  value={volPhone}
                  onChange={(e) => setVolPhone(e.target.value)}
                  placeholder="e.g. 07700 900123"
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Skills, Equipment & Capabilities You Can Offer:</Label>
                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto p-2 border rounded-xl bg-muted/20">
                  {VOLUNTEER_SKILL_OPTIONS.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2 text-xs p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSkills.includes(item.label)}
                        onCheckedChange={() => handleSkillToggle(item.label)}
                        className="mt-0.5"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Additional Notes / Vehicle Specs (Optional)</Label>
                <Textarea
                  value={volNotes}
                  onChange={(e) => setVolNotes(e.target.value)}
                  placeholder="e.g. Land Rover Defender with 9500lb winch; 8kVA portable diesel generator."
                  rows={2}
                  className="text-xs resize-y min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleRegisterVolunteer}
                disabled={isSubmittingVol}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 w-full sm:w-auto"
              >
                {isSubmittingVol ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit Volunteer Registration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 2. OFFICIAL LIVE CRISIS BULLETIN BANNER (IF ACTIVE) */}
      {(hasActiveNotice || (publicMessagesList && publicMessagesList.some((m: any) => m.isActive))) && (() => {
        const activeMsg = publicMessagesList?.find((m: any) => m.isActive);
        const headline = activeMsg?.title || officialNotice?.headline || 'Official Community Situation Notice';
        const body = activeMsg?.body || officialNotice?.message;
        const issuer = activeMsg ? `${activeMsg.authorName} (${activeMsg.authorRole})` : officialNotice?.issuedBy;
        const level = activeMsg?.level || (threatStatus === 'incident' ? 'critical' : 'warning');

        const levelStyle =
          level === 'critical'
            ? { border: 'border-red-500', bg: 'from-red-950/50', badge: 'bg-red-600 text-white', label: '🔴 Critical Alert' }
            : level === 'warning'
            ? { border: 'border-amber-500', bg: 'from-amber-950/50', badge: 'bg-amber-400 text-slate-950 font-black', label: '🟠 Threat Warning' }
            : level === 'advisory'
            ? { border: 'border-yellow-500', bg: 'from-yellow-950/50', badge: 'bg-yellow-400 text-slate-950 font-black', label: '🟡 Community Advisory' }
            : level === 'allclear'
            ? { border: 'border-emerald-500', bg: 'from-emerald-950/50', badge: 'bg-emerald-600 text-white font-bold', label: '🟢 All Clear / Stand Down' }
            : { border: 'border-blue-500', bg: 'from-blue-950/50', badge: 'bg-blue-600 text-white', label: 'ℹ️ Official Notice' };

        return (
          <Card className={`border-2 ${levelStyle.border} bg-gradient-to-r ${levelStyle.bg} via-card to-card shadow-2xl overflow-hidden`}>
            <CardHeader className="p-5 pb-3 border-b bg-muted/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-red-600 text-white rounded-xl shadow-md">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${levelStyle.badge} text-[10px] uppercase font-mono tracking-wider`}>
                        {levelStyle.label}
                      </Badge>
                      <Badge variant="outline" className="border-red-500/40 text-red-500 text-[10px] font-bold gap-1">
                        <Lock className="h-3 w-3" /> Direct Verified Broadcast
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-black text-foreground pt-1">
                      {headline}
                    </CardTitle>
                  </div>
                </div>

                {issuer && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">
                      Issued By: <strong className="text-foreground font-bold">{issuer}</strong>
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              <p className="text-sm sm:text-base text-foreground leading-relaxed font-semibold whitespace-pre-wrap">
                {body}
              </p>

              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Undistorted Official Bulletin from Community Council
                </span>
                <span className="font-mono font-medium">
                  {new Date().toLocaleDateString('en-GB')} Live Stream
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* 3. SIMPLIFIED "SEE EMERGENCY PLAN FOR..." SELECTOR */}
      <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card shadow-lg">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-extrabold text-[10px] uppercase tracking-wide">
                  Interactive Resident Guide
                </Badge>
                <Badge variant="outline" className="text-xs font-semibold">
                  {communityName} Resilience
                </Badge>
              </div>
              <CardTitle className="text-lg sm:text-xl font-black mt-1 text-slate-950 dark:text-white">
                See Emergency Plan For:
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-medium">
                Choose any scenario below to see the exact shelter locations, directions, hot food hubs, and action steps set up by your community council.
              </CardDescription>
            </div>

            {/* Dropdown Selector */}
            <div className="w-full sm:w-80 shrink-0">
              <Select value={selectedPlan} onValueChange={(val) => setSelectedPlan(val)}>
                <SelectTrigger className="h-11 text-sm font-bold border-2 border-primary/50 bg-background shadow-sm">
                  <SelectValue placeholder="Select an Emergency Plan..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-2 shadow-2xl">
                  {Object.entries(SCENARIO_METADATA).map(([key, meta]) => (
                    <SelectItem key={key} value={key} className="font-bold py-2 text-xs sm:text-sm">
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* Quick Filter Buttons (Pills) */}
        <CardContent className="p-3 sm:p-4 bg-muted/20">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap sm:flex-nowrap">
            {Object.entries(SCENARIO_METADATA).map(([key, meta]) => {
              const isSelected = selectedPlan === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPlan(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 border-2 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                      : 'bg-card hover:bg-muted text-muted-foreground border-border/80'
                  }`}
                >
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. FOCUSED SCENARIO VIEW (CHANGES TO SHOW ONLY THE SELECTED PLAN) */}
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Focused Hero Banner for Selected Plan */}
        <div className={`p-6 rounded-3xl border-2 ${activeMeta.borderColor} ${activeMeta.bgLight} shadow-xl relative overflow-hidden`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md shrink-0">
                <ActiveIcon className={`h-8 w-8 ${activeMeta.color}`} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${activeMeta.badgeBg} text-white font-extrabold text-[10px] uppercase tracking-wider`}>
                    Official Statutory Plan
                  </Badge>
                  {isCrisisMode && activeLeaderScenario === selectedPlan && (
                    <Badge className="bg-red-600 text-white font-black animate-pulse text-[10px] uppercase">
                      🔴 Active Incident in Effect
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-semibold border-slate-400">
                    SFRS 2026–2029 Aligned
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white pt-0.5">
                  {activeMeta.label.replace(/^[^\s]+\s/, '')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium max-w-3xl leading-relaxed">
                  {activeMeta.simpleSummary}
                </p>
              </div>
            </div>

            {hasAnyFailover && (
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 text-amber-950 dark:text-amber-100 text-xs font-bold flex items-center gap-2 shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Failover in effect: Secondary backup facility active</span>
              </div>
            )}
          </div>
        </div>

        {/* 4A. SCENARIO FACILITIES (IF NOT EVACUATION FLEET) */}
        {selectedPlan !== 'evacuation' && currentFacilities && (
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              Designated Facilities & Support Locations for {activeMeta.shortLabel}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Facility 1 */}
              <Card className="border-2 bg-card shadow-md flex flex-col justify-between hover:border-primary/50 transition-all">
                <div>
                  <CardHeader className="p-4 pb-2 bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-extrabold flex items-center gap-1.5 text-primary">
                        <LifeBuoy className="h-4 w-4" /> {f1?.name}
                      </CardTitle>
                      <Badge className={f1?.isFailover ? 'bg-amber-400 text-slate-950 font-black text-[9px]' : 'bg-primary text-primary-foreground text-[9px] font-bold'}>
                        {f1?.isFailover ? 'FAILOVER' : 'PRIMARY'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Location / Route</Label>
                      <p className="text-sm font-black text-slate-950 dark:text-white pt-0.5">{effectiveF1}</p>
                    </div>
                    {f1?.isFailover && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        ⚠️ Primary compromised. Divert to this backup location.
                      </p>
                    )}
                  </CardContent>
                </div>
                <div className="p-4 pt-0">
                  {effectiveF1 && (
                    <Button asChild className="w-full text-xs font-bold gap-2 h-9 shadow-sm">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveF1 + ', ' + communityName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="h-4 w-4" /> Directions in Google Maps
                      </a>
                    </Button>
                  )}
                </div>
              </Card>

              {/* Facility 2 */}
              <Card className="border-2 bg-card shadow-md flex flex-col justify-between hover:border-primary/50 transition-all">
                <div>
                  <CardHeader className="p-4 pb-2 bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-extrabold flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
                        <Building2 className="h-4 w-4" /> {f2?.name}
                      </CardTitle>
                      <Badge className={f2?.isFailover ? 'bg-amber-400 text-slate-950 font-black text-[9px]' : 'bg-cyan-600 text-white text-[9px] font-bold'}>
                        {f2?.isFailover ? 'FAILOVER' : 'PRIMARY'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Location / Route</Label>
                      <p className="text-sm font-black text-slate-950 dark:text-white pt-0.5">{effectiveF2}</p>
                    </div>
                    {f2?.isFailover && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        ⚠️ Primary compromised. Divert to this backup location.
                      </p>
                    )}
                  </CardContent>
                </div>
                <div className="p-4 pt-0">
                  {effectiveF2 && (
                    <Button asChild variant="outline" className="w-full text-xs font-bold gap-2 border-2 border-cyan-500/50 h-9 shadow-sm hover:bg-cyan-50 dark:hover:bg-cyan-950/40">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveF2 + ', ' + communityName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="h-4 w-4 text-cyan-600" /> Directions in Google Maps
                      </a>
                    </Button>
                  )}
                </div>
              </Card>

              {/* Facility 3 */}
              <Card className="border-2 bg-card shadow-md flex flex-col justify-between hover:border-primary/50 transition-all">
                <div>
                  <CardHeader className="p-4 pb-2 bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-extrabold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <Shield className="h-4 w-4" /> {f3?.name}
                      </CardTitle>
                      <Badge className={f3?.isFailover ? 'bg-amber-400 text-slate-950 font-black text-[9px]' : 'bg-slate-800 text-slate-200 text-[9px] font-bold'}>
                        {f3?.isFailover ? 'FAILOVER' : 'PRIMARY'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Location / Command Channel</Label>
                      <p className="text-sm font-black text-slate-950 dark:text-white pt-0.5">{effectiveF3}</p>
                    </div>
                    {f3?.isFailover && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        ⚠️ Primary compromised. Divert to this backup location.
                      </p>
                    )}
                  </CardContent>
                </div>
                <div className="p-4 pt-0">
                  {effectiveF3 && (
                    <Button asChild variant="outline" className="w-full text-xs font-bold gap-2 border-2 border-amber-500/50 h-9 shadow-sm hover:bg-amber-50 dark:hover:bg-amber-950/40">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveF3 + ', ' + communityName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="h-4 w-4 text-amber-600" /> Locate on Map
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 4B. WHAT YOU SHOULD DO: 3 RESIDENT PRIORITIES */}
        <Card className="border-2 shadow-md">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-black flex items-center gap-2 text-slate-950 dark:text-white">
              <Clock className="h-4 w-4 text-primary" />
              What You Should Do: 3 Key Actions for Residents
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Immediate life safety advice approved by Community Resilience Leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl border-2 bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 space-y-1.5">
              <span className="font-black text-red-700 dark:text-red-400 uppercase tracking-wider text-[11px]">
                Step 1: Life Safety
              </span>
              <p className="font-extrabold text-sm text-slate-950 dark:text-white">{planPriorities.p1?.title || 'Immediate Protection'}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{planPriorities.p1?.desc || activeMeta.residentAdvice[0]}</p>
            </div>

            <div className="p-4 rounded-2xl border-2 bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 space-y-1.5">
              <span className="font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[11px]">
                Step 2: Shelter & Provisions
              </span>
              <p className="font-extrabold text-sm text-slate-950 dark:text-white">{planPriorities.p2?.title || 'Refuge & Warmth'}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{planPriorities.p2?.desc || activeMeta.residentAdvice[1]}</p>
            </div>

            <div className="p-4 rounded-2xl border-2 bg-cyan-50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800 space-y-1.5">
              <span className="font-black text-cyan-800 dark:text-cyan-400 uppercase tracking-wider text-[11px]">
                Step 3: Welfare & Neighbours
              </span>
              <p className="font-extrabold text-sm text-slate-950 dark:text-white">{planPriorities.p3?.title || 'Check on Neighbours'}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{planPriorities.p3?.desc || activeMeta.residentAdvice[2]}</p>
            </div>
          </CardContent>
        </Card>

        {/* 4C. PUBLIC EVACUATION MUSTER POINTS & SHUTTLE BUS HUBS (SHOWN FOR EVACUATION OR ALWAYS ACCESSIBLE) */}
        {(selectedPlan === 'evacuation' || selectedPlan === 'wildfire' || selectedPlan === 'flood') && (
          <Card className="border-2 border-teal-500/40 bg-gradient-to-br from-teal-950/20 via-card to-card shadow-lg">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-teal-500/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 shrink-0">
                    <Bus className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-teal-600 text-white border-teal-700 text-[10px] font-black uppercase">
                        Civic Evacuation Shuttles & Non-Drivers
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-0.5">
                      Designated Passenger Collection Points & Muster Hubs
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground font-medium">
                      If an evacuation is declared and you do not have private vehicle transport, proceed to your designated muster point for coordinated bus and taxi transport.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(emergencyPlan?.collectionPoints && Array.isArray(emergencyPlan.collectionPoints) && emergencyPlan.collectionPoints.length > 0
                  ? emergencyPlan.collectionPoints
                  : DEFAULT_COLLECTION_POINTS
                ).map((point: EvacuationCollectionPoint) => (
                  <div 
                    key={point.id} 
                    className="p-4 rounded-2xl border-2 bg-card hover:bg-muted/30 transition-all space-y-2 flex flex-col justify-between shadow-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <Badge 
                          className={`text-[10px] font-black ${
                            point.accessibleFor === 'all_vehicles' ? 'bg-teal-100 text-teal-950 border-2 border-teal-400 dark:bg-teal-950 dark:text-teal-100' :
                            point.accessibleFor === 'minibus_taxi_only' ? 'bg-amber-100 text-amber-950 border-2 border-amber-400 dark:bg-amber-950 dark:text-amber-100' :
                            'bg-red-100 text-red-950 border-2 border-red-400 dark:bg-red-950 dark:text-red-100'
                          }`}
                        >
                          {point.accessibleFor === 'all_vehicles' && '🚌 Full Coaches OK'}
                          {point.accessibleFor === 'minibus_taxi_only' && '🚐 Minibus & Taxi Hub'}
                          {point.accessibleFor === '4x4_only' && '🚙 4x4 Shuttle Only'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] uppercase font-mono font-bold">
                          {point.status}
                        </Badge>
                      </div>

                      <p className="font-black text-sm text-slate-950 dark:text-white">{point.name}</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{point.address}</p>

                      <div className="pt-1 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        <p>🎯 <strong>Vehicles:</strong> <span className="font-bold text-slate-950 dark:text-white">{point.designatedVehicles}</span></p>
                        <p>🏁 <strong>Destination:</strong> <span className="font-bold text-slate-950 dark:text-white">{point.dropoffShelter}</span></p>
                        <p>👤 <strong>Muster Lead:</strong> {point.onSiteCoordinator} ({point.coordinatorPhone})</p>
                      </div>
                    </div>

                    <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold h-8 gap-1.5 mt-2 border-teal-500/50 hover:bg-teal-50 dark:hover:bg-teal-950/30">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.address + ', ' + communityName)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Navigation className="h-3.5 w-3.5 text-teal-600" /> Directions in Google Maps
                      </a>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Wheelchair & Assisted Evacuation Note */}
              <div className="p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-400 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-100">
                <LifeBuoy className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-black">Require Wheelchair or Assisted Evacuation?</p>
                  <p className="font-semibold leading-relaxed">
                    Wheelchair-lift minibuses (CTCO) and 4x4 private hire taxis are on standby for residents with limited mobility or living on single-track rural roads. Call the local resilience lead or 24/7 crisis dispatch for escort assistance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4D. MULTI-AGENCY LIAISONS & LOCAL EMERGENCY CONTACTS FOR THIS PLAN */}
        {planLiaisons.length > 0 && (
          <Card className="border-2 shadow-md">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-black flex items-center gap-2 text-slate-950 dark:text-white">
                <Users2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Specialist Contacts & Agency Liaisons for {activeMeta.shortLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {planLiaisons.map((l: any, idx: number) => (
                  <div key={l.id || idx} className="p-3.5 rounded-xl border bg-card space-y-1.5 text-xs shadow-sm">
                    <p className="font-black text-slate-950 dark:text-white">{l.role}</p>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{l.agencyOrName}</p>
                    <a
                      href={`tel:${(l.telephone || '').replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline text-xs"
                    >
                      <Phone className="h-3.5 w-3.5" /> {l.telephone}
                    </a>
                    {l.notes && <p className="text-[11px] text-muted-foreground italic">{l.notes}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* 5. NATIONAL & REGIONAL CRISIS HELPLINES (ALWAYS AT BOTTOM) */}
      <Card className="border-2 shadow-md bg-card">
        <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b">
          <CardTitle className="text-base font-black flex items-center gap-2 text-slate-950 dark:text-white">
            <PhoneCall className="h-4 w-4 text-red-600" />
            Key Emergency Helplines & Outage Numbers (1-Click Call)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <a
              href="tel:999"
              className="p-3.5 rounded-2xl border-2 border-red-500/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 transition-all block space-y-1 shadow-sm"
            >
              <p className="font-extrabold text-red-700 dark:text-red-400">Emergency Life & Fire Threat</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-mono">999</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">SFRS, Police Scotland, Ambulance</p>
            </a>

            <a
              href="tel:101"
              className="p-3.5 rounded-2xl border-2 border-blue-500/40 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 transition-all block space-y-1 shadow-sm"
            >
              <p className="font-extrabold text-blue-700 dark:text-blue-400">Police Scotland (Non-Emergency)</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-mono">101</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Report non-urgent incidents</p>
            </a>

            <a
              href="tel:105"
              className="p-3.5 rounded-2xl border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 transition-all block space-y-1 shadow-sm"
            >
              <p className="font-extrabold text-amber-800 dark:text-amber-400">Power Grid Failure (SSEN)</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-mono">105</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Free national power outage line</p>
            </a>

            <a
              href="tel:111"
              className="p-3.5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 transition-all block space-y-1 shadow-sm"
            >
              <p className="font-extrabold text-emerald-700 dark:text-emerald-400">NHS 24 (Urgent Care)</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-mono">111</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Medical advice & urgent care</p>
            </a>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
