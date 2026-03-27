
'use client';

import { LayoutDashboard, Loader2 } from "lucide-react";
import { BusinessesCard } from "@/components/leader-dashboard/businesses-card";
import { EventsCard } from "@/components/leader-dashboard/events-card";
import { NotificationsCard } from "@/components/leader-dashboard/notifications-card";
import { MembersCard } from "@/components/leader-dashboard/members-card";
import { NewsCard } from "@/components/leader-dashboard/news-card";
import { ReportsCard } from "@/components/leader-dashboard/reports-card";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';

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
    const activeRole = communityRoleData?.role || userProfile?.role;
    
    // President/admin should see all by default.
    const isAdminOrPresident = ['president', 'owner', 'admin'].includes(activeRole);

    const hasAccess = (permissionKey: keyof typeof permissions) => {
        if (isAdminOrPresident) return true;
        return !!permissions[permissionKey];
    }
    
    const isLoading = isUserLoading || profileLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
        );
    }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Leader Dashboard
        </h1>
        <p className="text-muted-foreground">
            Welcome, {userProfile?.name || 'Leader'}. Here's an overview of your community, {communityName || ''}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
