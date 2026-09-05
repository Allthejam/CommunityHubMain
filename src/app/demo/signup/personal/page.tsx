'use client';

import { DemoSignupCard } from '@/components/demo/demo-signup-card';

export default function DemoPersonalSignupPage() {
  return (
    <DemoSignupCard
      accountType="personal"
      title="Create a Personal Account"
      description="Join your community, connect with neighbors, and stay up-to-date."
    />
  );
}
