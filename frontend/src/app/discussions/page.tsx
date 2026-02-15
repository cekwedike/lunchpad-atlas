"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function DiscussionsRedirect() {
  return (
    <Suspense fallback={null}>
      <DiscussionsRedirectContent />
    </Suspense>
  );
}

function DiscussionsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/dashboard/discussions${params ? `?${params}` : ""}`);
  }, [router, searchParams]);

  return null;
}
