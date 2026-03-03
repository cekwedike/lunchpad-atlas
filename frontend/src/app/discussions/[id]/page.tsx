"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect to the main discussion thread under /dashboard/discussions/[id].
 */
export default function DiscussionThreadRedirect() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (params.id) router.replace(`/dashboard/discussions/${params.id}`);
  }, [router, params.id]);

  return null;
}
