'use client';

import { WithSearchParams } from '@/components/WithSearchParams';
import ResetPasswordContent from './ResetPasswordContent';

export default function ResetPasswordPage() {
  return (
    <WithSearchParams>
      <ResetPasswordContent />
    </WithSearchParams>
  );
}