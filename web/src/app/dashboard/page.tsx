'use client';

import { WithSearchParams } from '@/components/WithSearchParams';
import DashboardContent from './DashboardContent';

export default function DashboardPage() {
  return (
    <WithSearchParams>
      <DashboardContent />
    </WithSearchParams>
  );
}