'use client';

import { 
    LayoutDashboard, 
    Loader2, 
    Sparkles, 
    ShieldCheck, 
    Crown, 
    Radio, 
    Siren, 
    CalendarPlus, 
    Building2, 
    Settings,
    ChevronRight,
    MapPin
} from "lucide-react";
import { BusinessesCard } from "@/components/leader-dashboard/businesses-card";
import { EventsCard } from "@/components/leader-dashboard/events-card";
import { NotificationsCard } from "@/components/leader-dashboard/notifications-card";
import { MembersCard } from "@/components/leader-dashboard/members-card";
import { NewsCard } from "@/components/leader-dashboard/news-card";
import { ReportsCard } from "@/components/leader-dashboard/reports-card";
import { EmergencyPlanCard } from "@/components/leader-dashboard/emergency-card";
import { ActivityChart } from "@/components/leader-dashboard/activity-chart";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LeaderDashboardPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const impersonating = (userProfile as any)?.impersonating;
    const communityId = impersonating?.communityId || userProfile?.communityId;
    const communityName = impersonating?.communityName || userProfile?.communityName;
    const communityRoleData = communityId ? userProfile?.communityRoles?.[communityId] : null;

    const permissions = communityRoleData?.permissions || userProfile?.permissions || {};
    const activeRole = communityRoleData?.role || userProfile?.role || 'Leader';
    
    // President/admin should see all by default. Platform owner/admin account types get full access too.
    const isAdminOrPresident = ['president', 'owner', 'admin'].includes(activeRole) ||
        ['owner', 'admin', 'administrator'].includes((userProfile as any)?.accountType);

    const hasAccess = (permissionKey: keyof typeof permissions) => {
        if (isAdminOrPresident) return true;
        return !!permissions[permissionKey];
    }
    
    const isLoading = isUserLoading || profileLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            
            {/* Hero Leader Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 p-6 sm:p-8 shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1 text-xs gap-1.5 shadow-xs">
                                <Crown className="h-3.5 w-3.5" />
                                {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Console
                            </Badge>
                            {communityName && (
                                <Badge variant="outline" className="bg-background/80 text-foreground border-border text-xs font-semibold gap-1 py-1">
                                    <MapPin className="h-3 w-3 text-primary" />
                                    {communityName}
                                </Badge>
                            )}
                            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live Hub Active
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-headline text-foreground">
                            Welcome back, {userProfile?.name || 'Community Leader'}
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Here is the live operational overview, resilience status, and civic activity for <strong className="text-foreground">{communityName || 'your community'}</strong>.
                        </p>
                    </div>

                    {/* Quick Action Shortcuts */}
                    <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
                        <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs text-xs">
                            <Link href="/leader/emergency-plan">
                                <Siren className="mr-1.5 h-3.5 w-3.5" /> Emergency Plan
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="font-semibold text-xs bg-background/80 hover:bg-muted">
                            <Link href="/leader/events/create">
                                <CalendarPlus className="mr-1.5 h-3.5 w-3.5 text-sky-600" /> Post New Event
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="font-semibold text-xs bg-background/80 hover:bg-muted">
                            <Link href="/leader/settings">
                                <Settings className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Hub Settings
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Decorative background glow */}
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Dashboard Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {hasAccess('viewDashboard') && <ActivityChart communityId={communityId} />}
                <EmergencyPlanCard />
                {hasAccess('viewUsers') && <MembersCard />}
                {hasAccess('viewBusinesses') && <BusinessesCard />}
                {hasAccess('viewEvents') && <EventsCard />}
                {hasAccess('viewNewsManagement') && <NewsCard />}
                {hasAccess('viewReports') && <ReportsCard />}
                {hasAccess('viewNotifications') && <NotificationsCard />}
            </div>
        </div>
    );
}
