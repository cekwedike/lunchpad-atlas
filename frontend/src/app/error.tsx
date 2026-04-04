"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="text-slate-600 mt-2 text-center max-w-md">
        An unexpected error occurred. You can try again or return home.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
