'use client';

import { DemoSignupCard } from '@/components/demo/demo-signup-card';

export default function DemoLeaderSignupPage() {
  return (
    <DemoSignupCard
      accountType="leader"
      title="Create a Community Leader Account"
      description="Manage a community hub, moderate content, oversee emergency plans, and earn revenue share."
    />
  );
}
