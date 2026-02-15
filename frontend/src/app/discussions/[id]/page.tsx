"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect to the main discussion thread under /dashboard/discussions/[id].
 */
export default function DiscussionThreadRedirect({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/discussions/${params.id}`);
  }, [router, params.id]);

  return null;
}
