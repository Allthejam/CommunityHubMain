
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import LeaderHeader from '@/components/layout/leader-header';
import Footer from '@/components/layout/footer';
import { Loader2 } from 'lucide-react';
import { BackToTopButton } from '@/components/ui/back-to-top-button';

export default function LeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const hasAccess = (permissions: any, activeRole: string, permissionKey: string) => {
    if (
      ['president', 'owner', 'admin', 'administrator'].includes(activeRole) ||
      ['owner', 'admin', 'administrator'].includes(userProfile?.accountType)
    ) {
        return true;
    }
    return !!permissions[permissionKey];
  };

  React.useEffect(() => {
    if (isUserLoading || profileLoading) {
      return;
    }

    if (!user) {
      router.replace('/');
      return;
    }

    if (userProfile) {
      const impersonating = (userProfile as any)?.impersonating;
      const communityId = impersonating?.communityId || userProfile.communityId;
      const communityRoleData = communityId ? userProfile.communityRoles?.[communityId] : null;
      
      const permissions = communityRoleData?.permissions || userProfile.permissions || {};
      const activeRole = communityRoleData?.role || userProfile.role;

      // Define all roles that should have access to the leader back office.
      const leaderRoles = [
        'president', 
        'owner', 
        'admin', 
        'administrator', 
        'vice-president', 
        'moderator',
        'editor',
        'reporter',
        'broadcaster'
      ];
      // Check if user has ANY leader-like role, primary or secondary, OR is platform owner/admin.
      let hasAnyLeaderRole = leaderRoles.includes(userProfile.role) || ['owner', 'admin', 'administrator'].includes(userProfile.accountType);
      if (!hasAnyLeaderRole && userProfile.communityRoles) {
        hasAnyLeaderRole = Object.values(userProfile.communityRoles).some((roleData: any) => leaderRoles.includes(roleData.role));
      }
      
      // Check for the back-office permission flag in primary or any secondary role.
      const hasPrimaryPermissionFlag = userProfile.permissions?.hasBackOfficeAccess === true;
      const hasSecondaryPermissionFlag = userProfile.communityRoles 
        ? Object.values(userProfile.communityRoles).some((roleData: any) => roleData.permissions?.hasBackOfficeAccess === true) 
        : false;

      // If user has no qualifying role OR permission flag, deny access.
      if (!hasAnyLeaderRole && !hasPrimaryPermissionFlag && !hasSecondaryPermissionFlag) {
        router.replace('/home');
        return;
      }
      
      if (pathname === '/leader/dashboard' && !hasAccess(permissions, activeRole, 'viewDashboard')) {
          const fallbackRoutes = [
              { path: '/leader/reports', permission: 'viewReports' },
              { path: '/leader/members', permission: 'viewUsers' },
              { path: '/leader/news', permission: 'viewNewsManagement' },
          ];

          for (const route of fallbackRoutes) {
              if (hasAccess(permissions, activeRole, route.permission)) {
                  router.replace(route.path);
                  return;
              }
          }
           router.replace('/home');
      }
    }
  }, [user, userProfile, isUserLoading, profileLoading, router, pathname]);

  const isLoading = isUserLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col">
        <LeaderHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!userProfile) {
      return (
         <div className="flex h-screen w-full flex-col">
          <LeaderHeader />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </main>
          <Footer />
        </div>
      );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <LeaderHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <BackToTopButton />
    </div>
  );
}
