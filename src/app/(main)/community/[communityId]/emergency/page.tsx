"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, orderBy, limit } from "firebase/firestore";
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
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
    f1: { name: 'Evacuation Corridor / Escape Highway', primary: 'A95 Northbound towards Aviemore / A9', secondary: 'A939 towards Nairn / Coast', isFailover: false },
    f2: { name: 'Evacuation Refuge & Shelter Hub', primary: 'Grantown Grammar School Sports Complex', secondary: 'Inverallan Church Hall & Canteen', isFailover: false },
    f3: { name: 'Incident Command Post', primary: 'The Town Hall, The Square', secondary: 'Royal British Legion Hall (RBLS)', isFailover: false }
  },
  urbanfire: {
    f1: { name: 'Traffic Bypass & Cordon Corridor', primary: 'Bypass via Castle Grant Estate Road & Seafield Avenue', secondary: 'Relief Route via Old Spey Bridge', isFailover: false },
    f2: { name: 'Immediate Warmth & Family Assembly Hub', primary: 'RBLS Legion Main Hall, The Square', secondary: 'Strathspey Church Hall', isFailover: false },
    f3: { name: 'Forward Fire & Rescue Appliance Staging', primary: 'The Square Central Staging Area', secondary: 'Burnfield Car Park Hardstanding', isFailover: false }
  },
  flood: {
    f1: { name: 'High-Ground Evacuation Refuge (>220m)', primary: 'Grantown Grammar School (Above 220m contour)', secondary: 'Spey Valley Golf Clubhouse', isFailover: false },
    f2: { name: 'Council Sandbag Collection Depot', primary: 'Highland Council Depot, Burnfield Car Park', secondary: 'Strathspey Roads Yard', isFailover: false },
    f3: { name: 'Emergency Flood Warden Command Desk', primary: 'Burnfield Command Portacabin', secondary: 'Town Hall Lower Meeting Room', isFailover: false }
  },
  power: {
    f1: { name: 'Warm Space Hub & Soup Canteen (Generator Powered)', primary: 'Community Hub Hall (25kVA Generator, Heating & Kitchen)', secondary: 'Inverallan Church Canteen', isFailover: false },
    f2: { name: 'Device Charging & Thermal Blanket Bank', primary: 'Grammar School Sports Tech Suite (Multi-Socket Bank)', secondary: 'Legion Lounge Power Station', isFailover: false },
    f3: { name: 'Off-Grid Mesh Radio Net & Welfare Check Station', primary: 'Anagach Hill Repeater / PMR Channel 7', secondary: 'High School Mast Net Controller', isFailover: false }
  },
  drought: {
    f1: { name: 'Scottish Water Bowser Tanker Station', primary: 'Burnfield Car Park (Heavy Tanker Access)', secondary: 'Showgrounds Agricultural Bowser Stand', isFailover: false },
    f2: { name: 'Potable Bottled Water Rationing Hub', primary: 'RBLS Legion Main Hall (10L / person / day)', secondary: 'Town Hall Distribution Desk', isFailover: false },
    f3: { name: 'Agricultural & Livestock Water Draw Point', primary: 'Spey Valley Showgrounds 5000L Mobile Bowser', secondary: 'River Spey Dedicated Mobile Pump Point', isFailover: false }
  },
  unrest: {
    f1: { name: 'Public Safety Safe Haven & Sanctuary', primary: 'Town Hall Reinforced Complex & Secure Rooms', secondary: 'Legion Inner Hall Sanctuary', isFailover: false },
    f2: { name: 'Pedestrian & Traffic Avoidance Bypass', primary: 'Bypass High Street via Grant Road & Woodside', secondary: 'Outer Perimeter Ring Road', isFailover: false },
    f3: { name: 'Police Scotland Liaison Command Link', primary: 'Aviemore Police Command Control 101 Line', secondary: 'Duty Inspector Mobile Command Post', isFailover: false }
  },
  defence: {
    f1: { name: 'Subterranean Reinforced Shelter', primary: 'Grantown Grammar School Reinforced Basement Complex', secondary: 'Castle Grant Vaulted Cellars', isFailover: false },
    f2: { name: 'Potable Spring & Gravity Water Borehole', primary: 'Castle Grant Estate Gravity-Fed Spring Tank 1', secondary: 'Hillhead Borehole Pump Station', isFailover: false },
    f3: { name: 'Civil Resilience Command Bunker', primary: 'Grammar School Operations Suite', secondary: 'Town Hall Secure Meeting Room', isFailover: false }
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

  // Living Plan Certification Status Calculations (MUST be at top level before early returns)
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

  const threatStatus = emergencyPlan?.currentThreatStatus || 'normal';
  const activeScenario = emergencyPlan?.activeHazardScenario || 'wildfire';
  const isCrisisMode = threatStatus === 'incident' || threatStatus === 'advisory';

  // Official Situation Notice State
  const officialNotice = emergencyPlan?.officialNotice;
  const hasActiveNotice = officialNotice?.isActive && (officialNotice?.message || officialNotice?.headline);

  // Scenario-Specific Facilities Resolution for the active hazard
  const activeFacs = emergencyPlan?.scenarioFacilities?.[activeScenario] || DEFAULT_FALLBACK_FACILITIES[activeScenario] || DEFAULT_FALLBACK_FACILITIES.wildfire;

  const f1 = activeFacs.f1;
  const f2 = activeFacs.f2;
  const f3 = activeFacs.f3;

  const effectiveF1 = f1.isFailover ? f1.secondary : f1.primary;
  const effectiveF2 = f2.isFailover ? f2.secondary : f2.primary;
  const effectiveF3 = f3.isFailover ? f3.secondary : f3.primary;

  const hasAnyFailover = f1.isFailover || f2.isFailover || f3.isFailover;

  // Get active scenario priorities
  const activePriorities = emergencyPlan?.priorities?.[activeScenario] || {
    p1: { title: 'Immediate Life Safety & Safe Evacuation', desc: 'Follow official directions and move clear of the threat perimeter.' },
    p2: { title: 'Emergency Water & Canteen Access', desc: 'Proceed to the active refuge for warmth and emergency provisions.' },
    p3: { title: 'Welfare & Asset Protection', desc: 'Check in with marshals and report any isolated or vulnerable neighbors.' }
  };

  // Helper for Scenario Styling & Info
  const getScenarioTheme = () => {
    switch (activeScenario) {
      case 'wildfire':
        return {
          name: 'Wildfire & Moorland Fire',
          icon: Flame,
          color: 'text-red-500',
          border: 'border-red-500/50',
          bg: 'bg-red-950/20',
          badgeBg: 'bg-red-600',
          bannerGradient: 'from-red-950/90 via-slate-900 to-slate-950',
          heroTitle: 'ACTIVE WILDFIRE EVACUATION & ESCAPE CORRIDOR ALERT',
          specificDesc: `High-risk vegetation: ${emergencyPlan?.wildfire?.fuels || 'Mature Scots Pine & Heather'}. Avoid fuel corridors and follow the designated escape route.`
        };
      case 'urbanfire':
        return {
          name: 'Urban Structural Fire',
          icon: Building,
          color: 'text-orange-500',
          border: 'border-orange-500/50',
          bg: 'bg-orange-950/20',
          badgeBg: 'bg-orange-600',
          bannerGradient: 'from-orange-950/90 via-slate-900 to-slate-950',
          heroTitle: 'STRUCTURAL FIRE & SAFETY CORDON ALERT',
          specificDesc: `Affected area: ${emergencyPlan?.urbanfire?.riskBlocks || 'Town Central Core'}. Keep ${emergencyPlan?.urbanfire?.cordonDist || '150'}m clear to allow unrestricted appliance access.`
        };
      case 'flood':
        return {
          name: 'River Flooding & Coastal Surge',
          icon: Waves,
          color: 'text-cyan-500',
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-950/20',
          badgeBg: 'bg-cyan-600',
          bannerGradient: 'from-cyan-950/90 via-slate-900 to-slate-950',
          heroTitle: 'SEPA FLOOD WARNING & HIGH-GROUND REFUGES',
          specificDesc: `Threat watercourse: ${emergencyPlan?.flood?.river || 'River Spey in Spate'} (${emergencyPlan?.flood?.sepaCode || 'Flood Warning Zone'}). Sandbags and high-ground shelters are operational.`
        };
      case 'power':
        return {
          name: 'Prolonged Grid Power Outage',
          icon: Zap,
          color: 'text-amber-500',
          border: 'border-amber-500/50',
          bg: 'bg-amber-950/20',
          badgeBg: 'bg-amber-600',
          bannerGradient: 'from-amber-950/90 via-slate-900 to-slate-950',
          heroTitle: 'PROLONGED POWER OUTAGE - WARM SPACE ACTIVATION',
          specificDesc: `Grid outage exceeds ${emergencyPlan?.power?.triggerHours || '4'} hours. Generator-powered Warm Space hub is open for heating, hot meals, and phone charging.`
        };
      case 'drought':
        return {
          name: 'Water Shortage & Drought',
          icon: Droplets,
          color: 'text-blue-500',
          border: 'border-blue-500/50',
          bg: 'bg-blue-950/20',
          badgeBg: 'bg-blue-600',
          bannerGradient: 'from-blue-950/90 via-slate-900 to-slate-950',
          heroTitle: 'PRIVATE WATER SUPPLY (PWS) & BOWSER STATIONS ACTIVE',
          specificDesc: `Emergency water distribution active for ${emergencyPlan?.drought?.pwsCount || 'Rural Households on dry springs'}. Static bowsers and bottled water points are open.`
        };
      case 'unrest':
        return {
          name: 'Civil Unrest & Public Safety',
          icon: ShieldCheck,
          color: 'text-purple-500',
          border: 'border-purple-500/50',
          bg: 'bg-purple-950/20',
          badgeBg: 'bg-purple-600',
          bannerGradient: 'from-purple-950/90 via-slate-900 to-slate-950',
          heroTitle: 'PUBLIC SAFETY ALERT - AVOIDANCE PERIMETER',
          specificDesc: `Safety advisory: Avoid ${emergencyPlan?.unrest?.avoidArea || 'Town Square core'}. Follow instructions from Police Scotland.`
        };
      case 'defence':
        return {
          name: 'Civil Defence & State Emergency',
          icon: Award,
          color: 'text-emerald-500',
          border: 'border-emerald-500/50',
          bg: 'bg-emerald-950/20',
          badgeBg: 'bg-emerald-600',
          bannerGradient: 'from-emerald-950/90 via-slate-900 to-slate-950',
          heroTitle: 'CIVIL DEFENCE & EMERGENCY DISTRIBUTION ACTIVE',
          specificDesc: `Emergency distribution active. Potable spring: ${emergencyPlan?.defence?.waterSpring || 'Gravity Tanks'}. Shelter: ${emergencyPlan?.defence?.shelterLoc || 'Reinforced Complex'}.`
        };
      default:
        return {
          name: 'Community Emergency',
          icon: ShieldAlert,
          color: 'text-red-500',
          border: 'border-red-500/50',
          bg: 'bg-red-950/20',
          badgeBg: 'bg-red-600',
          bannerGradient: 'from-slate-900 via-indigo-950 to-slate-900',
          heroTitle: 'COMMUNITY EMERGENCY NOTICE',
          specificDesc: 'Follow instructions from local resilience marshals.'
        };
    }
  };

  const currentTheme = getScenarioTheme();
  const ScenarioIcon = currentTheme.icon;

  return (
    <div className="container max-w-6xl mx-auto py-6 sm:py-8 space-y-8 pb-16">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold shadow-md">
              <HeartHandshake className="h-4 w-4" /> Volunteer Skills & Assets
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card border text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-500" />
                Register for Community Resilience
              </DialogTitle>
              <DialogDescription className="text-xs">
                Let your local community council know what equipment, 4x4 vehicles, or skills you can offer during bad weather, floods, or emergencies.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Contact Name / Owner *</Label>
                  <Input
                    value={volContactName}
                    onChange={(e) => setVolContactName(e.target.value)}
                    placeholder="e.g. John MacDonald (Owner / Manager)"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Operator Name (If Different)</Label>
                  <Input
                    value={volOperatorName}
                    onChange={(e) => setVolOperatorName(e.target.value)}
                    placeholder="e.g. Gordon Smith (Driver / Lead Operator)"
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
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-2 border rounded-xl bg-muted/20">
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

      {/* ========================================================================= */}
      {/* OFFICIAL VERIFIED SITUATION NOTICE / LIVE LEADER BULLETIN                 */}
      {/* ========================================================================= */}
      {(hasActiveNotice || (publicMessagesList && publicMessagesList.some((m: any) => m.isActive))) && (() => {
        const activeMsg = publicMessagesList?.find((m: any) => m.isActive);
        const headline = activeMsg?.title || officialNotice?.headline || 'Official Community Situation Notice';
        const body = activeMsg?.body || officialNotice?.message;
        const issuer = activeMsg ? `${activeMsg.authorName} (${activeMsg.authorRole})` : officialNotice?.issuedBy;
        const level = activeMsg?.level || (threatStatus === 'incident' ? 'critical' : 'warning');

        const levelStyle =
          level === 'critical'
            ? { border: 'border-red-500/80', bg: 'from-red-950/40', badge: 'bg-red-600 text-white', label: '🔴 Critical Alert' }
            : level === 'warning'
            ? { border: 'border-amber-500/80', bg: 'from-amber-950/40', badge: 'bg-amber-500 text-slate-950 font-bold', label: '🟠 Threat Warning' }
            : level === 'advisory'
            ? { border: 'border-yellow-500/80', bg: 'from-yellow-950/40', badge: 'bg-yellow-500 text-slate-950 font-bold', label: '🟡 Community Advisory' }
            : level === 'allclear'
            ? { border: 'border-emerald-500/80', bg: 'from-emerald-950/40', badge: 'bg-emerald-600 text-white font-bold', label: '🟢 All Clear / Stand Down' }
            : { border: 'border-blue-500/80', bg: 'from-blue-950/40', badge: 'bg-blue-600 text-white', label: 'ℹ️ Official Notice' };

        return (
          <Card className={`border-2 ${levelStyle.border} bg-gradient-to-r ${levelStyle.bg} via-card to-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300`}>
            <CardHeader className="p-5 pb-3 border-b border-border/50 bg-muted/30">
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
                      <Badge variant="outline" className="border-red-500/40 text-red-400 text-[10px] font-mono gap-1">
                        <Lock className="h-3 w-3" /> Verified Information
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-extrabold text-foreground pt-1">
                      {headline}
                    </CardTitle>
                  </div>
                </div>

                {issuer && (
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block font-mono">
                      Issued By: <strong className="text-foreground">{issuer}</strong>
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-3">
              <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                {body}
              </p>

              <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Direct Community Council Dispatch • Undistorted Official Bulletin
                </span>
                <span className="font-mono">
                  {new Date().toLocaleDateString('en-GB')} Live Feed
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODE A: CRISIS INCIDENT RESPONSE MODE (SPOTLIGHTS ACTIVE SCENARIO)        */}
      {/* ========================================================================= */}
      {isCrisisMode ? (
        <div className="space-y-8">
          {/* Dynamic Incident Hero Banner */}
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${currentTheme.bannerGradient} border ${currentTheme.border} p-6 sm:p-8 text-white shadow-2xl`}>
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className={`p-3 ${currentTheme.badgeBg} text-white rounded-2xl shadow-lg ring-4 ring-white/10`}>
                  <ScenarioIcon className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-red-600 text-white font-bold animate-pulse text-[10px] uppercase font-mono tracking-wider">
                      {threatStatus === 'incident' ? '🔴 Active Incident in Progress' : '🟡 Urgent Weather / Hazard Advisory'}
                    </Badge>
                    <Badge variant="outline" className="border-white/30 text-white text-[10px] font-mono uppercase">
                      Active Disaster Scenario: {currentTheme.name}
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-headline mt-1">
                    {currentTheme.heroTitle}
                  </h1>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-200 max-w-3xl leading-relaxed font-medium">
                {currentTheme.specificDesc}
              </p>

              {/* Failover Notice Banner if any facility has been diverted */}
              {hasAnyFailover && (
                <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    Notice: Dynamic facility failovers are in effect for this incident. One or more primary facilities have been diverted to secondary backups below.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC SCENARIO-SPECIFIC FACILITIES (Unique for Wildfire vs Power Cut vs Flood etc.) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scenario Facility 1 */}
            <Card className="border-primary/40 bg-card shadow-lg flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 pb-3 bg-muted/20 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                      <LifeBuoy className="h-4 w-4" /> {f1.name}
                    </CardTitle>
                    <Badge className={f1.isFailover ? 'bg-amber-500 text-slate-950 font-bold text-[9px]' : 'bg-primary text-primary-foreground text-[9px]'}>
                      {f1.isFailover ? 'SECONDARY FAILOVER ACTIVE' : 'ACTIVE / PRIMARY'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Location / Protocol</Label>
                    <p className="text-sm font-bold text-foreground">{effectiveF1}</p>
                  </div>
                  {f1.isFailover && (
                    <p className="text-[11px] text-amber-500 font-semibold">
                      Primary was compromised. Diverting all residents to this secondary facility.
                    </p>
                  )}
                </CardContent>
              </div>

              <div className="p-5 pt-0">
                {effectiveF1 && (
                  <Button asChild className="w-full text-xs font-bold gap-2 shadow-sm h-9">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveF1 + ', ' + communityName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-4 w-4" /> Open in Google Maps
                    </a>
                  </Button>
                )}
              </div>
            </Card>

            {/* Scenario Facility 2 */}
            <Card className="border-cyan-500/40 bg-card shadow-lg flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 pb-3 bg-muted/20 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                      <Building2 className="h-4 w-4" /> {f2.name}
                    </CardTitle>
                    <Badge className={f2.isFailover ? 'bg-amber-500 text-slate-950 font-bold text-[9px]' : 'bg-cyan-600 text-white text-[9px]'}>
                      {f2.isFailover ? 'SECONDARY FAILOVER ACTIVE' : 'ACTIVE / PRIMARY'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Location / Protocol</Label>
                    <p className="text-sm font-bold text-foreground">{effectiveF2}</p>
                  </div>
                  {f2.isFailover && (
                    <p className="text-[11px] text-amber-500 font-semibold">
                      Primary was compromised. Diverting all operations to this secondary facility.
                    </p>
                  )}
                </CardContent>
              </div>

              <div className="p-5 pt-0">
                {effectiveF2 && (
                  <Button asChild variant="outline" className="w-full text-xs font-bold gap-2 border-cyan-500/40 hover:bg-cyan-500/10 h-9">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveF2 + ', ' + communityName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-4 w-4 text-cyan-500" /> Open in Google Maps
                    </a>
                  </Button>
                )}
              </div>
            </Card>

            {/* Scenario Facility 3 */}
            <Card className="border-amber-500/40 bg-card shadow-lg flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 pb-3 bg-muted/20 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Shield className="h-4 w-4" /> {f3.name}
                    </CardTitle>
                    <Badge className={f3.isFailover ? 'bg-amber-500 text-slate-950 font-bold text-[9px]' : 'bg-slate-800 text-slate-200 text-[9px]'}>
                      {f3.isFailover ? 'SECONDARY FAILOVER ACTIVE' : 'ACTIVE / PRIMARY'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Location / Channel</Label>
                    <p className="text-sm font-bold text-foreground">{effectiveF3}</p>
                  </div>
                  {f3.isFailover && (
                    <p className="text-[11px] text-amber-500 font-semibold">
                      Primary was compromised. Diverting all operations to this secondary facility.
                    </p>
                  )}
                </CardContent>
              </div>

              <div className="p-5 pt-0">
                {effectiveF3 && (
                  <Button asChild variant="outline" className="w-full text-xs font-bold gap-2 border-amber-500/40 hover:bg-amber-500/10 h-9">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveF3 + ', ' + communityName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-4 w-4 text-amber-500" /> Locate on Map
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Active Priorities Section */}
          <Card className="border shadow-md">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Active Operational Priorities for {currentTheme.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border bg-red-950/10 border-red-500/30 space-y-1.5">
                <span className="font-bold text-red-500 uppercase tracking-wider text-[11px]">#1 Critical Priority</span>
                <p className="font-bold text-sm text-foreground">{activePriorities.p1?.title || activePriorities.p1Title}</p>
                <p className="text-muted-foreground leading-relaxed">{activePriorities.p1?.desc || activePriorities.p1Desc}</p>
              </div>

              <div className="p-4 rounded-xl border bg-amber-950/10 border-amber-500/30 space-y-1.5">
                <span className="font-bold text-amber-500 uppercase tracking-wider text-[11px]">#2 Critical Priority</span>
                <p className="font-bold text-sm text-foreground">{activePriorities.p2?.title || activePriorities.p2Title}</p>
                <p className="text-muted-foreground leading-relaxed">{activePriorities.p2?.desc || activePriorities.p2Desc}</p>
              </div>

              <div className="p-4 rounded-xl border bg-cyan-950/10 border-cyan-500/30 space-y-1.5">
                <span className="font-bold text-cyan-500 uppercase tracking-wider text-[11px]">#3 Critical Priority</span>
                <p className="font-bold text-sm text-foreground">{activePriorities.p3?.title || activePriorities.p3Title}</p>
                <p className="text-muted-foreground leading-relaxed">{activePriorities.p3?.desc || activePriorities.p3Desc}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE B: PEACE-TIME PREPAREDNESS GUIDE (NORMAL STATUS)                     */
        /* ========================================================================= */
        <div className="space-y-8">
          {/* Normal Preparedness Hero Banner */}
          {/* Normal Preparedness Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-950/60 ring-4 ring-emerald-500/20">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={
                        isPlanCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] uppercase font-mono'
                          : lastReviewedAt
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-mono'
                          : 'bg-slate-700/50 text-slate-300 border-slate-600 text-[10px] uppercase font-mono'
                      }>
                        {isPlanCurrent ? '🟢 Verified Living Plan Current' : lastReviewedAt ? '🟡 Statutory Review Due' : '⚪ Draft / Uncertified'}
                      </Badge>
                      <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[10px] font-mono">
                        SFRS 2026–2029 Aligned (Priority 2 & 7)
                      </Badge>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-headline mt-1">
                      {communityName} Community Emergency & Resilience Guide
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-700/60 text-xs text-slate-300">
                <p>
                  <strong>Statutory Audit:</strong> {formattedLastReviewed ? `Reviewed on ${formattedLastReviewed} by ${emergencyPlan?.reviewedByName || 'Community Lead'}` : 'Community council draft plan'}
                  {formattedNextDue && <span className="text-slate-400 ml-2">• <strong>Next Review:</strong> {formattedNextDue}</span>}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Emergency Services Callout:</span>
                  <a href="tel:999" className="font-mono font-bold text-red-400 hover:underline">999</a>
                  <span className="text-slate-600">•</span>
                  <a href="tel:101" className="font-mono font-bold text-cyan-400 hover:underline">Police 101</a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick-Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Warm Space & Outage Hub */}
            <Card className="border-amber-500/30 bg-card shadow-sm flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Zap className="h-4 w-4" /> Winter Warm Space & Outage Hub
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-1 space-y-2 text-xs">
                  <p className="font-bold text-sm text-foreground">
                    {emergencyPlan?.scenarioFacilities?.power?.f1?.primary || 'Community Hub Hall (Generator Powered)'}
                  </p>
                  <p className="text-muted-foreground">
                    Hours during power cuts: {emergencyPlan?.power?.warmHours || '08:00 - 22:00'} • Canteen & Phone Charging Banks
                  </p>
                </CardContent>
              </div>
              <div className="p-5 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 gap-1.5">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((emergencyPlan?.scenarioFacilities?.power?.f1?.primary || 'Community Hall') + ', ' + communityName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-3.5 w-3.5 text-amber-500" /> Directions in Google Maps
                  </a>
                </Button>
              </div>
            </Card>

            {/* Card 2: Sandbags & Flood Precautions */}
            <Card className="border-cyan-500/30 bg-card shadow-sm flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                    <Waves className="h-4 w-4" /> Sandbag Depot & Flooding
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-1 space-y-2 text-xs">
                  <p className="font-bold text-sm text-foreground">
                    {emergencyPlan?.scenarioFacilities?.flood?.f2?.primary || emergencyPlan?.flood?.sandbagLoc || 'Council Depot, Burnfield Car Park'}
                  </p>
                  <p className="text-muted-foreground font-mono">
                    Duty Team: {emergencyPlan?.flood?.sandbagTel || '07700 900888'}
                  </p>
                </CardContent>
              </div>
              <div className="p-5 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 gap-1.5">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((emergencyPlan?.scenarioFacilities?.flood?.f2?.primary || 'Council Depot') + ', ' + communityName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-3.5 w-3.5 text-cyan-500" /> Locate Sandbag Depot
                  </a>
                </Button>
              </div>
            </Card>

            {/* Card 3: Water Shortage & PWS */}
            <Card className="border-blue-500/30 bg-card shadow-sm flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Droplets className="h-4 w-4" /> Water Shortage & PWS Refills
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-1 space-y-2 text-xs">
                  <p className="font-bold text-sm text-foreground">
                    {emergencyPlan?.scenarioFacilities?.drought?.f1?.primary || emergencyPlan?.drought?.bowserLoc || 'Burnfield Car Park Bowser Station'}
                  </p>
                  <p className="text-muted-foreground">
                    Bottled Water Hub: {emergencyPlan?.scenarioFacilities?.drought?.f2?.primary || emergencyPlan?.drought?.bottledHub || 'RBLS Legion Main Hall'}
                  </p>
                </CardContent>
              </div>
              <div className="p-5 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 gap-1.5">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((emergencyPlan?.scenarioFacilities?.drought?.f1?.primary || 'Burnfield Car Park') + ', ' + communityName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-3.5 w-3.5 text-blue-500" /> Locate Bowser Station
                  </a>
                </Button>
              </div>
            </Card>
          </div>

          {/* Collapsible Preparedness Accordions */}
          <Card className="border shadow-md">
            <CardHeader className="p-5 pb-2 border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Community Resilience & Preparedness Guidelines
              </CardTitle>
              <CardDescription className="text-xs">
                Review specific contingency plans for local hazards in {communityName}, aligned with statutory emergency service frameworks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <Accordion type="single" collapsible defaultValue="wf" className="w-full space-y-2">
                {/* 1. Wildfire (Clean Master Accordion) */}
                <AccordionItem value="wf" className="border rounded-2xl p-2">
                  <AccordionTrigger className="text-sm font-bold flex items-center gap-2 text-red-600 dark:text-red-400 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Flame className="h-4 w-4" />
                      Wildfire & Climate Emergency Resilience Plan (SFRS Aligned)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-xs text-muted-foreground leading-relaxed pt-3">
                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-foreground flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-red-600 dark:text-red-400">Scottish Fire & Rescue Service (SFRS) Local Plan 2026–2029 Alignment</p>
                        <p className="text-[11px] text-muted-foreground">Delivering SFRS Priority 2 (Wildfire & Climate Resilience) and Priority 7 (Community Resilience).</p>
                      </div>
                      <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-400 text-[10px] whitespace-nowrap">
                        Statutory Priority
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                        <Label className="text-[11px] font-bold text-foreground uppercase">Designated Evacuation Highway</Label>
                        <p className="text-sm font-bold text-foreground">{emergencyPlan?.scenarioFacilities?.wildfire?.f1?.primary || 'A95 Northbound towards Aviemore / A9'}</p>
                        <p className="text-[11px] text-muted-foreground">Secondary Non-Pine Bypass: {emergencyPlan?.scenarioFacilities?.wildfire?.f1?.secondary || 'A939 towards Coast'}</p>
                      </div>

                      <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                        <Label className="text-[11px] font-bold text-foreground uppercase">Evacuation Refuge & Shelter Hub</Label>
                        <p className="text-sm font-bold text-foreground">{emergencyPlan?.scenarioFacilities?.wildfire?.f2?.primary || 'Grammar School Sports Complex'}</p>
                        <p className="text-[11px] text-muted-foreground">Secondary Welfare Hub: {emergencyPlan?.scenarioFacilities?.wildfire?.f2?.secondary || 'Inverallan Church Hall'}</p>
                      </div>
                    </div>

                    {/* Section 1: Dynamic Hazard Areas & Fuel Profile */}
                    <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
                      <h4 className="font-bold text-foreground flex items-center gap-1.5">
                        <TreePine className="h-4 w-4 text-red-500" /> 1. Wildfire Hazard Assessment & Fuel Profile
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {(emergencyPlan?.wildfireHazardAreas && emergencyPlan.wildfireHazardAreas.length > 0
                          ? emergencyPlan.wildfireHazardAreas
                          : [
                              {
                                id: '1',
                                title: 'Anagach Pinewoods Corridor',
                                fuelType: emergencyPlan?.wildfire?.fuels || '1,000ha mature Scots Pine & needle duff',
                                windThreat: emergencyPlan?.wildfire?.windThreat || 'East / South-East winds driving fire towards town'
                              }
                            ]
                        ).map((area: any, idx: number) => (
                          <div key={area.id || idx} className="p-3 bg-card/60 rounded-lg border space-y-1 text-[11px]">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] px-1 py-0 font-mono">#{idx + 1}</Badge>
                              <span>{area.title}</span>
                            </div>
                            <p className="text-muted-foreground"><strong className="text-foreground">Fuel:</strong> {area.fuelType}</p>
                            <p className="text-muted-foreground"><strong className="text-foreground">Threat Path:</strong> {area.windThreat}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: SFRS Community Asset Register */}
                    <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
                      <h4 className="font-bold text-foreground flex items-center gap-1.5">
                        <Tractor className="h-4 w-4 text-amber-500" /> 2. SFRS Community Asset Register (Machinery & Water Abstraction)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {(emergencyPlan?.wildfireAssetList && emergencyPlan.wildfireAssetList.length > 0
                          ? emergencyPlan.wildfireAssetList
                          : [
                              {
                                id: '1',
                                name: 'Heavy Agricultural Tractors & Ploughs',
                                category: 'Firebreaks',
                                description: emergencyPlan?.wildfireAssets?.firebreakTractors || '4x Heavy 4WD agricultural tractors with subsoil ploughs on call'
                              },
                              {
                                id: '2',
                                name: 'Water Abstraction Points & Draft Stations',
                                category: 'Water Abstraction',
                                description: emergencyPlan?.wildfireAssets?.waterAbstractionPoints || emergencyPlan?.wildfire?.waterPoint || 'River Spey Old Bridge tender hardstanding draft point'
                              },
                              {
                                id: '3',
                                name: '4x4 Transport, Argocat ATVs & Water Bowsers',
                                category: 'All-Terrain Transport',
                                description: emergencyPlan?.wildfireAssets?.bowsersAndATVs || '2x 5,000L Tractor Water Bowsers & 6x Estate Argocat ATVs'
                              },
                              {
                                id: '4',
                                name: 'Livestock & Equine Emergency Holding Pastures',
                                category: 'Livestock Holding',
                                description: emergencyPlan?.wildfireAssets?.livestockPastures || emergencyPlan?.wildfire?.livestockGrounds || 'Showgrounds Field 4 & North Paddocks'
                              }
                            ]
                        ).map((asset: any, idx: number) => (
                          <div key={asset.id || idx} className="p-3 bg-card/60 rounded-lg border space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-foreground">{asset.name}</p>
                              {asset.category && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-400">
                                  {asset.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground leading-relaxed">{asset.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Flood */}
                <AccordionItem value="fl">
                  <AccordionTrigger className="text-sm font-bold flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                    <span className="flex items-center gap-2"><Waves className="h-4 w-4" /> River Flooding & Extreme Rainfall</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-xs text-muted-foreground leading-relaxed pt-2">
                    <div className="space-y-1">
                      <p>• High-Ground Evacuation Refuge: <strong className="text-foreground">{emergencyPlan?.scenarioFacilities?.flood?.f1?.primary || 'Grammar School (Above 220m contour)'}</strong></p>
                      <p>• Sandbag Depot: <strong className="text-foreground">{emergencyPlan?.scenarioFacilities?.flood?.f2?.primary || 'Council Depot, Burnfield Car Park'}</strong> (Duty Tel: {emergencyPlan?.flood?.sandbagTel || '07700 900888'})</p>
                      <p>• Watercourses: <strong className="text-foreground">{emergencyPlan?.flood?.river || 'River Spey & Local Burns'}</strong> ({emergencyPlan?.flood?.sepaCode || 'Speyside Zone'})</p>
                    </div>

                    {emergencyPlan?.scenarioLiaisons?.flood && emergencyPlan.scenarioLiaisons.flood.length > 0 && (
                      <div className="pt-2 border-t space-y-1.5">
                        <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Flood Multi-Agency Liaisons:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {emergencyPlan.scenarioLiaisons.flood.map((l: any, idx: number) => (
                            <div key={l.id || idx} className="p-2 rounded bg-card border text-[11px]">
                              <p className="font-bold text-foreground">{l.role}: {l.agencyOrName}</p>
                              <p className="font-mono text-primary">📞 {l.telephone}</p>
                              {l.notes && <p className="text-[10px] text-muted-foreground">{l.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Power Cut */}
                <AccordionItem value="po">
                  <AccordionTrigger className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Prolonged Winter Power Cuts & Grid Outages</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-xs text-muted-foreground leading-relaxed pt-2">
                    <div className="space-y-1">
                      <p>• Warm Space & Soup Canteen: <strong className="text-foreground">{emergencyPlan?.scenarioFacilities?.power?.f1?.primary || 'Community Hub Hall (Generator Powered)'}</strong></p>
                      <p>• Device Charging Banks: <strong className="text-foreground">{emergencyPlan?.scenarioFacilities?.power?.f2?.primary || 'Grammar School Sports Tech Suite'}</strong></p>
                      <p>• Operating Schedule: <strong className="text-foreground">{emergencyPlan?.power?.warmHours || '08:00 - 22:00 Daily'}</strong></p>
                      <p>• Generator Power: <strong className="text-foreground">{emergencyPlan?.power?.generatorSpecs || '25kVA Backup Diesel Generator'}</strong></p>
                    </div>

                    {emergencyPlan?.scenarioLiaisons?.power && emergencyPlan.scenarioLiaisons.power.length > 0 && (
                      <div className="pt-2 border-t space-y-1.5">
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Power Grid & Welfare Liaisons:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {emergencyPlan.scenarioLiaisons.power.map((l: any, idx: number) => (
                            <div key={l.id || idx} className="p-2 rounded bg-card border text-[11px]">
                              <p className="font-bold text-foreground">{l.role}: {l.agencyOrName}</p>
                              <p className="font-mono text-primary">📞 {l.telephone}</p>
                              {l.notes && <p className="text-[10px] text-muted-foreground">{l.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Water Shortage */}
                <AccordionItem value="dr">
                  <AccordionTrigger className="text-sm font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <span className="flex items-center gap-2"><Droplets className="h-4 w-4" /> Private Water Supplies (PWS) & Drought</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-xs text-muted-foreground leading-relaxed pt-2">
                    <div className="space-y-1">
                      <p>• Scottish Water Bowser Station: <strong className="text-foreground">{emergencyPlan?.scenarioFacilities?.drought?.f1?.primary || 'Burnfield Car Park Bowser Station'}</strong></p>
                      <p>• Bottled Water Rationing Point: <strong className="text-foreground">{emergencyPlan?.scenarioFacilities?.drought?.f2?.primary || 'RBLS Legion Main Hall'}</strong> (10L / person / day)</p>
                      <p>• Farm Livestock Water Point: <strong className="text-foreground">{emergencyPlan?.scenarioFacilities?.drought?.f3?.primary || 'Spey Valley Showgrounds 5000L Bowser'}</strong></p>
                    </div>

                    {emergencyPlan?.scenarioLiaisons?.drought && emergencyPlan.scenarioLiaisons.drought.length > 0 && (
                      <div className="pt-2 border-t space-y-1.5">
                        <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Water Shortage & Tanker Liaisons:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {emergencyPlan.scenarioLiaisons.drought.map((l: any, idx: number) => (
                            <div key={l.id || idx} className="p-2 rounded bg-card border text-[11px]">
                              <p className="font-bold text-foreground">{l.role}: {l.agencyOrName}</p>
                              <p className="font-mono text-primary">📞 {l.telephone}</p>
                              {l.notes && <p className="text-[10px] text-muted-foreground">{l.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {/* COMMUNICATIONS REDUNDANCY & NOTICEBOARD NET */}
      <Card className="border shadow-md">
        <CardHeader className="p-5 pb-3 bg-muted/20 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Radio className="h-5 w-5 text-primary" />
            Communications Redundancy & Cellular Blackout Protocol
          </CardTitle>
          <CardDescription className="text-xs">
            How to communicate and receive verified emergency updates if telephone and internet masts fail.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <Label className="text-[11px] font-bold uppercase text-primary flex items-center gap-1.5">
                <Radio className="h-4 w-4" /> Off-Grid Radio Mesh & Frequencies
              </Label>
              <p className="text-muted-foreground leading-relaxed">
                During grid/mobile outages, volunteer operators conduct hourly check-in nets on:
              </p>
              <p className="font-mono font-bold text-sm text-foreground bg-muted p-2 rounded border">
                {emergencyPlan?.comms?.hamPmrFreq || 'PMR446 Channel 7 / CTCSS 11 | HAM 2M (145.500MHz)'}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <Label className="text-[11px] font-bold uppercase text-primary flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" /> Weatherproof Physical Noticeboards
              </Label>
              <p className="text-muted-foreground leading-relaxed">
                Official printed situation reports are refreshed every 4 hours at:
              </p>
              <p className="font-medium text-foreground bg-muted p-2 rounded border leading-relaxed">
                {emergencyPlan?.comms?.noticeboards || 'Post Office Window, Pharmacy Outer Board, RBLS Outer Door, Village Hall Board'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RECENT OFFICIAL INCIDENT BULLETINS & SITUATION LOG */}
      {publicMessagesList && publicMessagesList.length > 0 && (
        <Card className="border shadow-md">
          <CardHeader className="p-5 pb-3 bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <MessageSquareText className="h-5 w-5 text-primary" />
                Live Situation Bulletins & Incident Updates
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {publicMessagesList.length} Official Bulletins
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Chronological log of verified broadcasts from Community Incident Response Leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {publicMessagesList.map((msg: any) => (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border space-y-2 text-xs transition-all ${
                  msg.isActive
                    ? 'border-primary/50 bg-primary/5 shadow-sm'
                    : 'border-border/60 bg-muted/20 text-muted-foreground'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
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
                    <span className="font-bold text-foreground text-sm">{msg.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {msg.createdAt?.toDate
                      ? msg.createdAt.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Recent'}
                  </span>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between">
                  <span>Author: <strong className="text-foreground">{msg.authorName}</strong> ({msg.authorRole})</span>
                  {msg.isActive && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px]">
                      ● Live Broadcast
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* NATIONAL & REGIONAL EMERGENCY HELPLINES */}
      <Card className="border shadow-md">
        <CardHeader className="p-5 pb-3 bg-muted/20 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <PhoneCall className="h-5 w-5 text-red-500" />
            Key Emergency Helplines & Utility Outage Numbers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border bg-red-950/10 border-red-500/30 space-y-1">
              <p className="font-bold text-red-600 dark:text-red-400">Life Threat / SFRS / Police</p>
              <p className="text-lg font-black text-foreground">999</p>
              <p className="text-[11px] text-muted-foreground">Emergency Life & Fire Threat</p>
            </div>

            <div className="p-3.5 rounded-xl border bg-blue-950/10 border-blue-500/30 space-y-1">
              <p className="font-bold text-blue-600 dark:text-blue-400">Police Scotland (Non-Emergency)</p>
              <p className="text-lg font-black text-foreground">101</p>
              <p className="text-[11px] text-muted-foreground">Report incidents & civil unrest</p>
            </div>

            <div className="p-3.5 rounded-xl border bg-amber-950/10 border-amber-500/30 space-y-1">
              <p className="font-bold text-amber-600 dark:text-amber-400">Power Grid Failure (SSEN)</p>
              <p className="text-lg font-black text-foreground">105</p>
              <p className="text-[11px] text-muted-foreground">Free national power outage line</p>
            </div>

            <div className="p-3.5 rounded-xl border bg-emerald-950/10 border-emerald-500/30 space-y-1">
              <p className="font-bold text-emerald-600 dark:text-emerald-400">NHS 24 (Urgent Care)</p>
              <p className="text-lg font-black text-foreground">111</p>
              <p className="text-[11px] text-muted-foreground">Non-life threatening medical</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
