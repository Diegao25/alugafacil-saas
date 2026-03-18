'use client';

import { WithSearchParams } from '@/components/WithSearchParams';
import LandingContent from './LandingContent';

export default function LandingPage() {
  return (
    <WithSearchParams>
      <LandingContent />
    </WithSearchParams>
  );
}