'use client';

import { DemoSignupCard } from '@/components/demo/demo-signup-card';

export default function DemoEnterpriseSignupPage() {
  return (
    <DemoSignupCard
      accountType="enterprise"
      title="Create an Enterprise Account"
      description="For multi-branch organizations and regional enterprise groups."
    />
  );
}
