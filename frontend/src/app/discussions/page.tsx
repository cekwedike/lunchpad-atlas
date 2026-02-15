"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect to the main discussions page under /dashboard/discussions.
 * Preserves any query params (e.g. ?resourceId=...).
 */
export default function DiscussionsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/dashboard/discussions${params ? `?${params}` : ""}`);
  }, [router, searchParams]);

  return null;
}
