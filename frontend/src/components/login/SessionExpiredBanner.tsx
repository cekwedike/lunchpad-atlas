'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SessionExpiredBannerInner() {
  const searchParams = useSearchParams();
  if (searchParams.get('session') !== 'expired') return null;
  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-center text-sm text-amber-100"
    >
      Your session expired. Please sign in again.
    </div>
  );
}

export function SessionExpiredBanner() {
  return (
    <Suspense fallback={null}>
      <SessionExpiredBannerInner />
    </Suspense>
  );
}
