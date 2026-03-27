

'use client';

import * as React from "react";
import { useState, useEffect, useRef, useTransition, useMemo, useCallback, Suspense } from "react";
import dynamic from 'next/dynamic';
import { Settings, User, MapPinned, UserCog, Save, Shield, Siren, KeyRound, LogOut, Loader2, AlertTriangle, HelpCircle, DollarSign, Crown, Mic, Activity, BellRing, RefreshCcw, ArrowLeft, Building, Send, Info, Users as UsersIcon, Bug, PlusCircle, Pencil, Trash2, Check, ChevronsUpDown, ShieldAlert, FileEdit, UserX } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from "@/firebase";
import { collection, onSnapshot, query, where, doc, getDoc, writeBatch, getDocs, limit, type Query, documentId } from "firebase/firestore";
import { runSavePoliceLiaison, getCommunitiesWithLiaisonStatus, runRemovePoliceLiaison } from "@/lib/actions/communityActions";
import { resetChats, debugAdmin } from "@/lib/actions/chatActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { savePlatformRolesAction, runHandoverLeadership, runSaveCommunityTeamPermissions } from "@/lib/actions/teamActions";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { runUpdateFaqOrder } from "@/lib/actions/faqActions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { communityReportCategories } from "@/app/(main)/report-issue/page";
import { Checkbox } from "@/components/ui/checkbox";
import { resignAsPresidentAction } from '@/lib/actions/userActions';
import { saveLeaderProfile } from '@/lib/actions/leaderActions';
import { format, addDays, differenceInDays } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const CommunityBoundaryMap = dynamic(() => import("@/components/community-boundary-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});


const initialPermissions = {
    hasBackOfficeAccess: false,
    viewDashboard: true,
    viewAnalytics: true,
    viewUsers: true,
    viewCommunities: true,
    viewTeam: true,
    viewFinancials: false,
    viewEmergency: false,
    viewAnnouncements: true,
    viewAdverts: true,
    viewNotifications: true,
    viewModeration: true,
    viewAuditLog: true,
    viewChat: true,
    viewPricing: false,
    viewAccess: false,
    viewSettings: false,
    viewLawEnforcement: false,
    actionBroadcast: false,
    actionManageContent: false,
    actionManageUsers: false,
    actionManageAccess: false,
    actionManageCommunities: false,
    isCommunityCreator: false,
    actionSetTeamPermissions: false,
    actionManageHierarchy: false,
    actionChangeGeneralSettings: false,
    actionChangePricing: false,
    actionManageModeration: false,
    accessStripe: false,
    actionImpersonateUser: false,
    actionImpersonateLeader: false,
    actionViewUserProfile: false,
    viewApplications: true,
    actionApproveApplications: true,
    actionCreateNews: false,
    actionEditNews: false,
    actionApproveNews: false,
    actionDeleteContent: false,
    actionInviteMembers: false,
    actionSuspendUsers: false,
    actionRemoveFromCommunity: false,
    actionChangeRoles: false,
    actionContactPlatformAdmin: false,
    viewForumManagement: false,
    viewLostAndFound: false,
    viewAbout: false,
    actionSetPoliceLiaison: false,
    actionSetCommunityBoundary: false,
    canSendStandardBroadcast: false,
    canSendEmergencyBroadcast: false,
    viewNewsManagement: false,
    viewMarketing: true,
    viewReports: true,
    viewFaq: true,
    viewEvents: true,
    viewBusinesses: true,
    viewWhatson: true,
    viewCharities: true,
    canViewAllCommunityReports: false,
    viewableReportCategories: [],
};

type TeamMember = {
    id: string;
    name: string;
    avatar: string;
    email: string;
    role: string;
    title?: string;
    permissions: typeof initialPermissions;
    isSecondary: boolean;
    country?: string;
    state?: string;
    region?: string;
};

type PlatformRole = {
    name: string;
    description: string;
}

const initialCommunityRoles: PlatformRole[] = [
    { name: "President", description: "Overall community control and final decision-making." },
    { name: "Vice-President", description: "Assists the President and acts as a successor." },
    { name: "Treasurer", description: "Manages community financials and budgets." },
    { name: "Secretary", description: "Handles administrative tasks and record-keeping." },
    { name: "Administrator", description: "Manages day-to-day operations and member support." },
    { name: "Moderator", description: "Monitors content and enforces community guidelines." },
    { name: "Editor", description: "Manages and approves news articles and official content." },
    { name: "Reporter", description: "Contributes news articles and reports on local events." },
    { name: "Broadcaster", description: "Sends out community announcements and alerts." },
];

const permissionGroups = [
    { 
        title: "Page Access", 
        permissions: [
            { key: 'viewDashboard', label: 'View Page: Dashboard' },
            { key: 'viewUsers', label: 'View Page: Users' },
            { key: 'viewFinancials', label: 'View Page: Financials' },
            { key: 'viewAnnouncements', label: 'View Page: Announcements' },
            { key: 'viewAdverts', label: 'View Page: Adverts' },
            { key: 'viewNotifications', label: 'View Page: Notifications' },
            { key: 'viewSettings', label: 'View Page: Community Settings' },
            { key: 'viewNewsManagement', label: 'View Page: News' },
            { key: 'viewForumManagement', label: 'View Page: Forum' },
            { key: 'viewLostAndFound', label: 'View Page: Lost & Found' },
            { key: 'viewAbout', label: 'View Page: About Page' },
            { key: 'viewReports', label: 'View Page: Reports' },
            { key: 'viewFaq', label: 'View Page: FAQ' },
            { key: 'viewEvents', label: 'View Page: Events' },
            { key: 'viewBusinesses', label: 'View Page: Businesses' },
            { key: 'viewWhatson', label: "View Page: What's On" },
            { key: 'viewCharities', label: 'View Page: Local Charities' },
            { key: 'viewMarketing', label: 'View Page: Marketing' },
        ]
    },
    {
        title: "Content & User Management",
        permissions: [
            { key: 'actionCreateNews', label: 'Action: Create News' },
            { key: 'actionEditNews', label: 'Action: Edit News' },
            { key: 'actionApproveNews', label: 'Action: Approve News' },
            { key: 'actionDeleteContent', label: 'Action: Delete Content' },
            { key: 'actionInviteMembers', label: 'Action: Invite Members' },
            { key: 'actionSuspendUsers', label: 'Action: Suspend Users' },
            { key: 'actionRemoveFromCommunity', label: 'Action: Remove from Community' },
            { key: 'canViewAllCommunityReports', label: 'Action: View All Community Reports'},
            { key: 'viewableReportCategories', label: 'View Specific Report Categories' }
        ]
    },
    {
        title: "High-Level Actions",
        permissions: [
            { key: 'actionSetTeamPermissions', label: 'Action: Set Team Permissions' },
            { key: 'actionChangeRoles', label: 'Action: Change Roles' },
            { key: 'accessStripe', label: 'Access: Access Stripe' },
            { key: 'actionContactPlatformAdmin', label: 'Action: Contact Platform Admin' },
            { key: 'actionSetPoliceLiaison', label: 'Action: Set Police Liaison' },
            { key: 'actionSetCommunityBoundary', label: 'Action: Set Community Boundary' },
        ]
    },
    {
        title: "Broadcasting Actions",
        permissions: [
             { key: 'canSendStandardBroadcast', label: 'Action: Send Standard Broadcasts' },
             { key: 'canSendEmergencyBroadcast', label: 'Action: Send Emergency Broadcasts' },
        ]
    }
];

const privilegedPermissions = [
    { key: 'actionViewUserProfile', label: 'Action: View User Profiles' },
    { key: 'actionImpersonateUser', label: 'Action: Impersonate User' },
    { key: 'actionImpersonateLeader', label: 'Action: Impersonate Leader' },
];


const lockedPermissionsForPrivateCommunityLeader: (keyof typeof initialPermissions)[] = [
    'viewFinancials',
    'viewBusinesses',
    'accessStripe',
    'actionSetCommunityBoundary',
    'actionViewUserProfile',
    'actionImpersonateUser',
    'viewEnterpriseGroups',
];

function PlatformSettingsContent() {
  const [isClient, setIsClient] = React.useState(false);
  const [allMembers, setAllMembers] = React.useState<TeamMember[]>([]);
  const [staffMembers, setStaffMembers] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [permissions, setPermissions] = useState(initialPermissions);
  const [selectedLiaisonId, setSelectedLiaisonId] = React.useState<string>("");
  
  const [policeContact, setPoliceContact] = React.useState({ officerId: "", officerName: "", officerRank: "", stationName: "", contactEmail: "", contactPhone: "" });
  
  const [successorId, setSuccessorId] = React.useState<string | null>(null);
  const [handoverPassword, setHandoverPassword] = React.useState("");
  const [isHandoverDialogOpen, setIsHandoverDialogOpen] = React.useState(false);
  const [isHandingOver, setIsHandingOver] = React.useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isSavingBackOfficeAccess, setIsSavingBackOfficeAccess] = useState(false);
  const [isSavingPoliceContact, setIsSavingPoliceContact] = React.useState(false);
  const [isMemberSearchOpen, setIsMemberSearchOpen] = React.useState(false);

  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdFromQuery = searchParams.get('userId');

  const [communityTeamRoles, setCommunityTeamRoles] = React.useState<PlatformRole[]>([]);
  const [loadingRoles, setLoadingRoles] = React.useState(true);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isResetting, startResetTransition] = useTransition();
  const [isDebugging, startDebugTransition] = useTransition();
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<{ name: string; description: string; index?: number } | null>(null);
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleDescription, setNewRoleDescription] = React.useState("");
  const [isSavingRole, setIsSavingRole] = React.useState(false);
  
  const [isPoliceLiaisonDialogOpen, setIsPoliceLiaisonDialogOpen] = React.useState(false);
  const [isRemoveLiaisonDialogOpen, setIsRemoveLiaisonDialogOpen] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [isResignDialogOpen, setIsResignDialogOpen] = React.useState(false);
  const [resignConfirmation, setResignConfirmation] = React.useState("");
  const [isResigning, setIsResigning] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  
  const impersonating = (userProfile as any)?.impersonating;
  const communityId = impersonating?.communityId || userProfile?.communityId;
  const communityName = impersonating?.communityName || userProfile?.communityName;
  
  const communityRef = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return doc(db, 'communities', communityId);
  }, [communityId, db]);
  const { data: communityData, isLoading: communityLoading } = useDoc(communityRef);

  const communityProfileDocRef = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return doc(db, 'community_profiles', communityId);
  }, [communityId, db]);
  const { data: communityProfileData, isLoading: communityProfileDocLoading } = useDoc(communityProfileDocRef);
  
  // --- New Robust Liaison Fetching ---
  const approvedLiaisonAppsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "liaison_applications"),
      where("status", "==", "Approved")
    );
  }, [db]);
  const { data: approvedApps, isLoading: appsLoading } = useCollection(approvedLiaisonAppsQuery);

  const approvedLiaisonUserIds = React.useMemo(() => {
    if (!approvedApps) return [];
    return [...new Set(approvedApps.map(app => app.applicantId))];
  }, [approvedApps]);

  const allLiaisonsQuery = useMemoFirebase(() => {
    if (!db || approvedLiaisonUserIds.length === 0) return null;
    return query(
      collection(db, "users"),
      where(documentId(), 'in', approvedLiaisonUserIds.slice(0, 30))
    );
  }, [db, approvedLiaisonUserIds]);
  const { data: allLiaisonOfficersData, isLoading: liaisonsLoading } = useCollection<TeamMember>(allLiaisonsQuery);
  // --- End New Fetching ---
  
  const liaisonOfficers = React.useMemo(() => {
    if (allLiaisonOfficersData && communityData?.country && communityData?.state && communityData?.region) {
        return allLiaisonOfficersData.filter(officer => 
            officer.country === communityData.country &&
            officer.state === communityData.state &&
            officer.region === communityData.region
        );
    }
    return [];
  }, [allLiaisonOfficersData, communityData]);

  const handleResetChats = () => {
    startResetTransition(async () => {
        const result = await resetChats();
        if (result.success) {
            toast({ title: "Success", description: result.message || "All chat histories have been reset." });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setResetConfirmation(""); 
    });
  };

  const handleDebugEnv = () => {
    startDebugTransition(async () => {
        const result = await debugAdmin();
        toast({ title: "Debug Action", description: result.message, duration: 9000 });
    });
  };

  React.useEffect(() => {
    if (communityLoading) {
        setLoadingRoles(true);
    } else if (communityData) {
        setCommunityTeamRoles(communityData.communityTeamRoles || initialCommunityRoles);
        setLoadingRoles(false);
    } else {
        setLoadingRoles(false);
    }
 }, [communityData, communityLoading]);

  React.useEffect(() => {
    if (communityProfileDocLoading) return;
    if (communityProfileData?.policeContact) {
        setPoliceContact(prev => ({
            ...prev,
            ...communityProfileData.policeContact
        }));
    } else {
        setPoliceContact({ officerId: "", officerName: "", officerRank: "", stationName: "", contactEmail: "", contactPhone: "" });
    }
  }, [communityProfileData, communityProfileDocLoading]);


  React.useEffect(() => {
    if (!communityId || !db || !user) return;
    setLoading(true);

    const q = query(collection(db, "users"), where("memberOf", "array-contains", communityId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const membersData: TeamMember[] = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const communityRoleData = data.communityRoles?.[communityId];
            membersData.push({
                id: docSnap.id,
                name: data.name,
                avatar: data.avatar,
                email: data.email,
                role: communityRoleData?.role || data.role || 'member',
                title: communityRoleData?.title || data.title || '',
                permissions: communityRoleData?.permissions || data.permissions || initialPermissions,
                isSecondary: !!communityRoleData,
            } as TeamMember);
        });
        
        setAllMembers(membersData);
        
        const leadershipRoles = ['administrator', 'moderator', 'editor', 'reporter', 'broadcaster', 'vice-president', 'treasurer', 'secretary', 'leader', 'president', 'police-liaison-officer'];
        const staff = membersData.filter(m => 
            (m.role && leadershipRoles.includes(m.role) && !m.title?.startsWith('Platform')) || m.id === user.uid
        );
        setStaffMembers(staff);

        if (staff.length > 0 && !selectedStaffId) {
            const firstEditable = staff.find(m => m.role !== 'president' && m.id !== user.uid);
            if (firstEditable) {
                setSelectedStaffId(firstEditable.id);
            } else if (staff.length > 0) {
                 setSelectedStaffId(staff[0].id);
            }
        } else if (staff.length === 0) {
            setSelectedStaffId("");
        }
        setLoading(false);
    });

    return () => {
        unsubscribe();
    };
  }, [communityId, db, user, selectedStaffId, isClient]);

  React.useEffect(() => {
    const member = staffMembers.find(m => m.id === selectedStaffId);
    if (member) {
      if (member.role === 'owner' || member.role === 'president') {
        const allPermissions = Object.fromEntries(Object.keys(initialPermissions).map(key => [key, true]));
        setPermissions({ ...allPermissions, viewableReportCategories: [] });
      } else {
        const memberPermissions = { ...initialPermissions, ...member.permissions };
        if (memberPermissions.viewableReportCategories && typeof memberPermissions.viewableReportCategories === 'object' && !Array.isArray(memberPermissions.viewableReportCategories)) {
            memberPermissions.viewableReportCategories = Object.keys(memberPermissions.viewableReportCategories);
        } else if (!memberPermissions.viewableReportCategories) {
            memberPermissions.viewableReportCategories = [];
        }
        setPermissions(memberPermissions);
      }
    }
  }, [selectedStaffId, staffMembers]);

  
  const handlePermissionChange = (key: keyof typeof initialPermissions, value: boolean | string[]) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  const handleCategoryPermissionChange = (category: string, isChecked: boolean) => {
    const currentCategories = Array.isArray(permissions.viewableReportCategories) 
        ? permissions.viewableReportCategories 
        : [];
    
    let newCategories: string[];
    if (isChecked) {
        newCategories = [...currentCategories, category];
    } else {
        newCategories = currentCategories.filter(c => c !== category);
    }
    
    handlePermissionChange('viewableReportCategories', newCategories);
  };

  const handleToggleBackOfficeAccess = async (checked: boolean) => {
    if (!selectedStaffId || !user || !communityId) return;

    setIsSavingBackOfficeAccess(true);

    const oldPermissions = { ...permissions };
    const newPermissions = { ...permissions, hasBackOfficeAccess: checked };
    setPermissions(newPermissions);

    const selectedStaffMember = staffMembers.find(m => m.id === selectedStaffId);
    const result = await runSaveCommunityTeamPermissions({
        memberId: selectedStaffId,
        permissions: newPermissions,
        communityId,
        updaterId: user.uid,
        profileType: selectedStaffMember?.isSecondary ? 'secondary' : 'primary'
    });

    setIsSavingBackOfficeAccess(false);

    if (result.success) {
        toast({ title: "Back Office Access Updated", description: `${selectedStaffMember?.name}'s back office access is now ${checked ? 'enabled' : 'disabled'}.` });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        setPermissions(oldPermissions); // Revert on failure
    }
  };


  const handleSavePermissions = async () => {
    if (!selectedStaffId || !user || !communityId) return;
    setIsSavingPermissions(true);
    const selectedStaffMember = staffMembers.find(m => m.id === selectedStaffId);
    const result = await runSaveCommunityTeamPermissions({ memberId: selectedStaffId, permissions, communityId, updaterId: user.uid, profileType: selectedStaffMember?.isSecondary ? 'secondary' : 'primary' });
    if (result.success) {
      toast({ title: "Permissions Saved", description: `Permissions for ${selectedStaffMember?.name} have been updated.` });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSavingPermissions(false);
  };
  
  const handleAssignLiaison = async () => {
    if (!communityId) {
      toast({ title: "Error", description: "Community could not be identified.", variant: "destructive"});
      return;
    }
    if (!selectedLiaisonId) {
         toast({ title: "Error", description: "An officer must be selected from the list.", variant: "destructive"});
      return;
    }
    setIsSavingPoliceContact(true);
    
    const result = await runSavePoliceLiaison({ communityId, officerId: selectedLiaisonId });
    if (result.success) {
        toast({ title: "Police Liaison Assigned" });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSavingPoliceContact(false);
    setIsPoliceLiaisonDialogOpen(false);
  }

  const handleRemoveLiaison = async () => {
      if (!communityId || !policeContact.officerId) {
        toast({ title: "Error", description: "No liaison officer is currently assigned.", variant: "destructive"});
        return;
    }
    setIsRemoving(true);
    const result = await runRemovePoliceLiaison({ communityId, officerId: policeContact.officerId });
    if(result.success) {
        toast({ title: "Liaison Removed", description: "The police liaison has been unassigned from your community." });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsRemoving(false);
    setIsRemoveLiaisonDialogOpen(false);
  }

  const handleHandover = async () => {
    if (!successorId || !user || !user.email || !handoverPassword) {
      toast({ title: "Missing Information", description: "Please select a successor and enter your password.", variant: "destructive" });
      return;
    }
    setIsHandingOver(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, handoverPassword);
      await reauthenticateWithCredential(user, credential);

      const result = await runHandoverLeadership({
        currentLeaderId: user.uid,
        newLeaderId: successorId,
      });

      if (result.success) {
        toast({ title: "Leadership Handed Over", description: "You are now being logged out." });
        setTimeout(async () => {
          if (auth) {
            await signOut(auth);
            router.push('/');
          }
        }, 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An error occurred during the handover process.", variant: "destructive" });
    } finally {
      setIsHandingOver(false);
      setHandoverPassword("");
      setIsHandoverDialogOpen(false);
    }
  }

  const handleOpenRoleDialog = (role: { name: string; description: string; } | null = null, index: number | undefined = undefined) => {
    setEditingRole(role ? { ...role, index } : null);
    setNewRoleName(role ? role.name : "");
    setNewRoleDescription(role ? role.description : "");
    setIsRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
      if (!newRoleName.trim() || !newRoleDescription.trim() || !communityId) {
          toast({ title: 'Missing Information', description: 'Please provide a name and description.', variant: 'destructive'});
          return;
      }
      setIsSavingRole(true);
      let newRoles: PlatformRole[];

      if (editingRole && editingRole.index !== undefined) {
          newRoles = [...communityTeamRoles];
          newRoles[editingRole.index] = { name: newRoleName, description: newRoleDescription };
      } else {
          newRoles = [...communityTeamRoles, { name: newRoleName, description: newRoleDescription }];
      }

      const result = await savePlatformRolesAction(newRoles, communityId);

      if (result.success) {
          setCommunityTeamRoles(newRoles);
          toast({ title: "Success", description: `Role ${editingRole ? 'updated' : 'added'}.`});
          setIsRoleDialogOpen(false);
      } else {
          toast({ title: "Error", description: result.error, variant: "destructive" });
      }
      setIsSavingRole(false);
  };

  const handleDeleteRole = async (index: number) => {
      if (!window.confirm("Are you sure you want to delete this role? This cannot be undone.")) return;
       if (!communityId) return;

      const newRoles = communityTeamRoles.filter((_, i) => i !== index);
      
      const result = await savePlatformRolesAction(newRoles, communityId);
      if (result.success) {
          setCommunityTeamRoles(newRoles);
          toast({ title: "Role Deleted" });
      } else {
          toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
  };

  const handleResign = async () => {
    if (!user || !userProfile?.communityId || resignConfirmation !== 'RESIGN') {
        toast({ title: "Confirmation failed", description: "Please type RESIGN to confirm.", variant: "destructive" });
        return;
    }
    setIsResigning(true);
    const result = await resignAsPresidentAction({ userId: user.uid, communityId: userProfile.communityId });
    if (result.success) {
        toast({ title: "Resignation Successful", description: "You are no longer the community president. You will be logged out." });
        setTimeout(async () => {
          if (auth) {
            await signOut(auth);
            router.push('/');
          }
        }, 3000);
    } else {
        toast({ title: "Resignation Failed", description: result.error, variant: "destructive" });
    }
    setIsResigning(false);
    setIsResignDialogOpen(false);
  };


  const selectedMember = staffMembers.find(m => m.id === selectedStaffId);
  const selectedMemberName = selectedMember?.name;
  const selectedMemberDisplayRole = selectedMember?.title || selectedMember?.role;
  const isPresidentSelected = selectedMember?.role === 'president';
  
  const president = staffMembers.find(m => m.role === 'president');
  const editableTeamMembers = staffMembers.filter(m => m.role !== 'president');
  
  const loggedInUserIsPresident = userProfile?.role === 'president';
  const loggedInUserPermissions = (userProfile as any)?.permissions || {};
  const canSetPermissions = userProfile?.role === 'owner' || userProfile?.role === 'president' || loggedInUserPermissions.actionSetTeamPermissions;
  const canSetPoliceLiaison = userProfile?.role === 'president' || (userProfile as any)?.permissions?.actionSetPoliceLiaison;
  const canSetCommunityBoundary = userProfile?.role === 'president' || (userProfile as any)?.permissions?.actionSetCommunityBoundary;

  const isPrivateCommunity = communityData?.visibility === 'private';
  const canEditLocked = userProfile?.role === 'owner' && (userProfile as any)?.impersonating;

  const eligibleSuccessors = staffMembers.filter(m => m.title === 'Vice President' && m.id !== user?.uid);
  
  const isPoliceContactIncomplete = !policeContact.officerId;

  const finalLoadingState = loading || isUserLoading || profileLoading || communityLoading || communityProfileDocLoading || appsLoading || liaisonsLoading;

  if (finalLoadingState) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }
  
  const pageAccessGroup = permissionGroups.find(g => g.title === 'Page Access');
  const contentUserGroup = permissionGroups.find(g => g.title === 'Content & User Management');
  const actionGroups = permissionGroups.filter(g => g.title !== 'Page Access' && g.title !== 'Content & User Management');


  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Community Settings for {communityName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your community settings, options, and team permissions.
          </p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" /> Your Leader Profile</CardTitle>
                <CardDescription>
                    This information is used for community management and verification. It is not displayed publicly on your user profile.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Your leader profile contains contact details and professional references required for your role. Keeping this up-to-date is important for platform administration.
                </p>
            </CardContent>
            <CardFooter>
                <Button asChild>
                    <Link href="/leader/profile">
                        <FileEdit className="mr-2 h-4 w-4" /> Edit Your Leader Profile
                    </Link>
                </Button>
            </CardFooter>
        </Card>

      <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                      <CardTitle className="flex items-center gap-2"><UsersIcon /> Community Team Roles</CardTitle>
                      <CardDescription>Define and rank the roles within your leadership team. The order here represents seniority.</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenRoleDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add Role</Button>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
              {loadingRoles ? (
                  <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
              ) : (
                  <div className="space-y-2">
                      {communityTeamRoles.map((role, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md group">
                              <div className="flex items-center gap-4">
                                  <div>
                                      <div className="font-medium">{role.name}</div>
                                      <div className="text-sm text-muted-foreground">{role.description}</div>
                                  </div>
                              </div>
                              {role.name !== 'President' && (
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenRoleDialog(role, index)}>
                                          <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRole(index)}>
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </CardContent>
      </Card>

        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Community Team Permissions</CardTitle>
              <CardDescription>
                  View and edit permissions for your team members. Presidents have full control by default.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 space-y-2 sm:space-y-0">
                    <div className="flex-1 w-full sm:max-w-xs">
                        <Label htmlFor="staff-member-select">Select Staff Member</Label>
                        <Select onValueChange={setSelectedStaffId} value={selectedStaffId}>
                            <SelectTrigger id="staff-member-select" disabled={staffMembers.length === 0}>
                                <SelectValue placeholder="Select a member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {staffMembers.map(member => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.name} ({member.title || member.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedStaffId && (
                        <div className="flex items-center space-x-2 pb-2">
                            <Switch
                                id="back-office-access"
                                checked={permissions.hasBackOfficeAccess}
                                onCheckedChange={handleToggleBackOfficeAccess}
                                disabled={isPresidentSelected || !canSetPermissions || isSavingBackOfficeAccess}
                            />
                            <Label htmlFor="back-office-access">Back Office Access</Label>
                            {isSavingBackOfficeAccess && <Loader2 className="h-4 w-4 animate-spin"/>}
                        </div>
                    )}
                </div>

               <Separator />

              <div>
                <h3 className="text-xl font-semibold mb-1">
                  Permissions for "{selectedMemberName || "..."}" your "{selectedMemberDisplayRole || "..."}"
                </h3>
                <p className="text-sm text-muted-foreground">
                    {isPresidentSelected ? "The Community President has all permissions enabled by default and they cannot be changed." : canSetPermissions ? "Toggle permissions for this team member on or off." : "You do not have permission to edit team member roles."}
                </p>
              </div>
              
              <Card className="border-destructive bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Privileged Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Warning: High-Impact Permissions</AlertTitle>
                        <AlertDescription>
                           Enabling these actions grants significant power and access to sensitive user data. Only grant these permissions to trusted, high-level team members. Misuse may constitute a breach of user privacy.
                        </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {privilegedPermissions.map(perm => {
                             const isLocked = (isPrivateCommunity && lockedPermissionsForPrivateCommunityLeader.includes(perm.key as any) && !canEditLocked) || selectedMember?.isSecondary;
                             return (
                                 <div key={perm.key} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-secondary/50 transition-colors">
                                    <Label htmlFor={perm.key} className={cn("text-sm font-normal flex-1 pr-2", isLocked && "text-muted-foreground")}>{perm.label}</Label>
                                    <Switch
                                        id={perm.key}
                                        checked={permissions[perm.key as keyof typeof permissions]}
                                        onCheckedChange={(checked) => handlePermissionChange(perm.key as keyof typeof permissions, checked)}
                                        disabled={isPresidentSelected || !canSetPermissions || isLocked}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
              </Card>


              {pageAccessGroup && (
                  <div key={pageAccessGroup.title}>
                      <h4 className="text-lg font-semibold mb-4 mt-6">{pageAccessGroup.title}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                          {pageAccessGroup.permissions.map(perm => {
                              const isLocked = (isPrivateCommunity && lockedPermissionsForPrivateCommunityLeader.includes(perm.key as any) && !canEditLocked);
                              const isChecked = permissions[perm.key as keyof typeof permissions];
                              const isDisabled = isPresidentSelected || !canSetPermissions || isLocked;

                              return (
                                <div key={perm.key} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-secondary/50 transition-colors">
                                    <Label htmlFor={perm.key} className={cn("text-sm font-normal flex-1 pr-2", isDisabled && "text-muted-foreground")}>{perm.label}</Label>
                                    <Switch
                                        id={perm.key}
                                        checked={Array.isArray(isChecked) ? isChecked.length > 0 : !!isChecked}
                                        onCheckedChange={(checked) => handlePermissionChange(perm.key as keyof typeof permissions, checked)}
                                        disabled={isDisabled}
                                    />
                                </div>
                              )
                          })}
                      </div>
                  </div>
              )}

              {contentUserGroup && (
                <div key={contentUserGroup.title}>
                  <h4 className="text-lg font-semibold mb-4 mt-6">{contentUserGroup.title}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {contentUserGroup.permissions.map(perm => {
                      if (perm.key === 'viewableReportCategories') {
                        return !permissions.canViewAllCommunityReports && (
                            <div key={perm.key} className="md:col-span-3 lg:col-span-3">
                                <Label className="text-sm font-normal">{perm.label}</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 border p-4 rounded-md">
                                    {communityReportCategories.map((option) => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`cat-${option}`}
                                                checked={(permissions.viewableReportCategories as string[])?.includes(option)}
                                                onCheckedChange={(checked) => handleCategoryPermissionChange(option, !!checked)}
                                                disabled={isPresidentSelected || !canSetPermissions}
                                            />
                                            <Label htmlFor={`cat-${option}`} className="font-normal text-sm">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                      }
                      
                      const isLocked = (isPrivateCommunity && lockedPermissionsForPrivateCommunityLeader.includes(perm.key as any) && !canEditLocked);
                      const isChecked = permissions[perm.key as keyof typeof permissions];
                      const isDisabled = isPresidentSelected || !canSetPermissions || isLocked;
                      return (
                        <div key={perm.key} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-secondary/50 transition-colors">
                          <Label htmlFor={perm.key} className={cn("text-sm font-normal flex-1 pr-2", isDisabled && "text-muted-foreground")}>{perm.label}</Label>
                          <Switch
                            id={perm.key}
                            checked={Array.isArray(isChecked) ? isChecked.length > 0 : !!isChecked}
                            onCheckedChange={(checked) => handlePermissionChange(perm.key as keyof typeof permissions, checked)}
                            disabled={isDisabled}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {actionGroups.map(group => (
                  <div key={group.title}>
                      <h4 className="text-lg font-semibold mb-4 mt-6">{group.title}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                          {group.permissions.map(perm => {
                              const isLocked = (isPrivateCommunity && lockedPermissionsForPrivateCommunityLeader.includes(perm.key as any) && !canEditLocked);
                              const isChecked = permissions[perm.key as keyof typeof permissions];
                              const isDisabled = isPresidentSelected || !canSetPermissions || isLocked;
                              return (
                                <div key={perm.key} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-secondary/50 transition-colors">
                                    <Label htmlFor={perm.key} className={cn("text-sm font-normal flex-1 pr-2", isDisabled && "text-muted-foreground")}>{perm.label}</Label>
                                    <Switch
                                        id={perm.key}
                                        checked={Array.isArray(isChecked) ? isChecked.length > 0 : !!isChecked}
                                        onCheckedChange={(checked) => handlePermissionChange(perm.key as keyof typeof permissions, checked)}
                                        disabled={isDisabled}
                                    />
                                </div>
                              )
                          })}
                      </div>
                  </div>
              ))}
          </CardContent>
          <CardFooter>
              <Button onClick={handleSavePermissions} disabled={isPresidentSelected || !canSetPermissions || isSavingPermissions || selectedMember?.isSecondary}>
                  {isSavingPermissions && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes for {selectedMemberName}
              </Button>
               {selectedMember?.isSecondary && (
                <p className="text-sm text-amber-600 ml-4">Permissions for this role are fixed and cannot be edited.</p>
              )}
          </CardFooter>
      </Card>
      
      <fieldset disabled={!canSetPoliceLiaison}>
        <Card className={cn(!canSetPoliceLiaison && "opacity-60")}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Siren className="h-5 w-5" />
                    Local Police Liaison
                </CardTitle>
                <CardDescription>Configure a dedicated contact for forwarding criminal activity reports. This information is confidential.</CardDescription>
            </CardHeader>
            <CardContent>
                {policeContact.officerId ? (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                         <p><strong>Officer:</strong> {allMembers.find(m => m.id === policeContact.officerId)?.name}</p>
                         <p><strong>Contact:</strong> {allMembers.find(m => m.id === policeContact.officerId)?.email}</p>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-muted-foreground">No police liaison has been set for this community.</p>
                )}
            </CardContent>
            <CardFooter className="gap-2">
                <Dialog open={isPoliceLiaisonDialogOpen} onOpenChange={setIsPoliceLiaisonDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Pencil className="mr-2 h-4 w-4" />
                            {policeContact.officerId ? 'Change Liaison' : 'Appoint Liaison'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Set Police Liaison</DialogTitle>
                            <DialogDescription>
                                Choose a verified officer from your region, or invite a new officer to apply.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="grid gap-2">
                                <Label>Select an Officer from your Region</Label>
                                <Select value={selectedLiaisonId} onValueChange={setSelectedLiaisonId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a verified liaison officer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {liaisonOfficers.length > 0 ? (
                                            liaisonOfficers.map(officer => (
                                                <SelectItem key={officer.id} value={officer.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6"><AvatarImage src={officer.avatar} /><AvatarFallback>{officer.name.charAt(0)}</AvatarFallback></Avatar>
                                                        <span>{officer.name}</span>
                                                        <Badge variant="secondary">Verified Liaison</Badge>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <p className="p-4 text-sm text-muted-foreground">No verified officers available for your region.</p>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator />
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-2">Is the officer not on the list?</p>
                                <Button variant="secondary" asChild>
                                    <Link href="/police-liaison/apply">
                                        Invite Someone to Apply
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPoliceLiaisonDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAssignLiaison} disabled={!selectedLiaisonId || isSavingPoliceContact}>
                                {isSavingPoliceContact && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Assign Liaison
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {policeContact.officerId && (
                    <AlertDialog open={isRemoveLiaisonDialogOpen} onOpenChange={setIsRemoveLiaisonDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <UserX className="mr-2 h-4 w-4" /> Remove Liaison
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will unassign {policeContact.officerName} as the police liaison for your community. They will no longer receive relevant reports.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRemoveLiaison} disabled={isRemoving}>
                                    {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Confirm Removal
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardFooter>
        </Card>
      </fieldset>

      <fieldset disabled={!canSetCommunityBoundary}>
        <Card className={cn(!canSetCommunityBoundary && "opacity-60")}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5" />
                    Community Boundary
                </CardTitle>
                <CardDescription>Define the geographical area your community hub covers. This affects local discovery and targeted announcements.</CardDescription>
            </CardHeader>
            <CardContent>
                <CommunityBoundaryMap disabled={!canSetCommunityBoundary} />
            </CardContent>
        </Card>
      </fieldset>
      
      {loggedInUserIsPresident && (
        <Card className="border-destructive">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <KeyRound className="h-5 w-5" />
                            Leadership &amp; Succession
                        </CardTitle>
                        <CardDescription>
                            Manage the transfer of community leadership. This is a critical action that should be handled with care.
                        </CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:bg-destructive/10">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Leadership Handover Rules</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4 text-sm">
                                <div>
                                    <h4 className="font-semibold">Standard Handover</h4>
                                    <p className="text-muted-foreground">The Community President can only hand over leadership to an appointed Vice President. This ensures a smooth transition and maintains stability. You must first assign the 'Vice President' title to a team member before they will appear in the dropdown.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Resignation</h4>
                                    <p className="text-muted-foreground">Upon handover, your account will be demoted to a 'Personal' account, revoking all leadership permissions. You may be promoted back to a team role by the new President if desired.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Emergency Protocol</h4>
                                    <p className="text-muted-foreground">In the event a Community President is incapacitated or deceased, please contact Platform Administration. An admin can investigate and, if necessary, facilitate the appointment of a new President from the existing leadership team (e.g., the Vice President or other senior member) to ensure the community continues to function.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button>Close</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="successor-select">Nominate Successor (Vice President)</Label>
                    <Select onValueChange={setSuccessorId} value={successorId || ""}>
                        <SelectTrigger id="successor-select" disabled={eligibleSuccessors.length === 0}>
                            <SelectValue placeholder="Select a Vice President..." />
                        </SelectTrigger>
                        <SelectContent>
                            {eligibleSuccessors.length > 0 ? (
                                eligibleSuccessors.map(member => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.name} (Vice President)
                                    </SelectItem>
                                ))
                            ) : (
                                <p className="p-2 text-sm text-muted-foreground">No eligible Vice Presidents found.</p>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
                 <Dialog open={isHandoverDialogOpen} onOpenChange={setIsHandoverDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" disabled={!successorId}>
                             <LogOut className="mr-2 h-4 w-4" />
                            Handover Reins
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Leadership Handover</DialogTitle>
                            <DialogDescription>
                                This is a final confirmation. To proceed, please enter your password. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="handover-password">Your Password</Label>
                            <Input
                                id="handover-password"
                                type="password"
                                value={handoverPassword}
                                onChange={(e) => setHandoverPassword(e.target.value)}
                                placeholder="Enter your password to confirm"
                            />
                        </div>
                        <DialogFooter>
                             <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                             <Button variant="destructive" onClick={handleHandover} disabled={!handoverPassword || isHandingOver}>
                                {isHandingOver ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Handover
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={isResignDialogOpen} onOpenChange={setIsResignDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Resign & Vacate Community
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-destructive">Confirm Resignation & Community Vacation</DialogTitle>
                            <DialogDescription>
                                This action is irreversible and will permanently remove your leadership role from this community. Please read the consequences below carefully.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>Important Consequences</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>You will be logged out to complete the process.</li>
                                        <li>You will lose all leadership and back-office access for this community.</li>
                                        <li>The community will become "leaderless" until a new leader is appointed.</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>

                             <Alert>
                                <DollarSign className="h-4 w-4" />
                                <AlertTitle>Action Required: Stripe Account</AlertTitle>
                                <AlertDescription>
                                    You MUST manually disconnect your Stripe account for this community. The platform <span className="font-bold">cannot</span> do this for you. We are not responsible for any financial activity after you resign.
                                </AlertDescription>
                            </Alert>
                            
                            {eligibleSuccessors.length > 0 && (
                                <Alert>
                                    <Crown className="h-4 w-4" />
                                    <AlertTitle>Consider Handover Instead</AlertTitle>
                                    <AlertDescription>
                                        You have an eligible Vice President. Instead of leaving the community leaderless, consider using the "Handover Reins" option to ensure a smooth transition.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                        <div className="py-2">
                            <Label htmlFor="resign-confirm">To confirm, please type <strong>RESIGN</strong> below.</Label>
                            <Input id="resign-confirm" value={resignConfirmation} onChange={(e) => setResignConfirmation(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" onClick={() => setResignConfirmation('')}>Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleResign} variant="destructive" disabled={resignConfirmation !== 'RESIGN' || isResigning}>
                                {isResigning && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Confirm Resignation
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
      )}
      </div>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingRole ? "Edit" : "Add New"} Platform Role</DialogTitle>
                <DialogDescription>
                    {editingRole ? "Update the details for this role." : "Define a new role for your administrative team."}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                     <Label htmlFor="new-role-name">Role Name</Label>
                    <Input id="new-role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g., Content Manager" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-role-desc">Description</Label>
                    <Textarea id="new-role-desc" value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} placeholder="Briefly describe the responsibilities of this role." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveRole} disabled={isSavingRole || !newRoleName || !newRoleDescription}>
                    {isSavingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Role
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Page() {
    return (
        <Suspense>
            <PlatformSettingsContent />
        </Suspense>
    )
}

    