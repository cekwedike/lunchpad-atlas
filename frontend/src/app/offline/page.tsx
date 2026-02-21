import type { Metadata } from 'next';
import { RetryButton } from './RetryButton';

export const metadata: Metadata = {
  title: 'You are offline — ATLAS',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        {/* Wifi-off icon (inline SVG — no external dependency) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-400"
          aria-hidden="true"
        >
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
          <path d="M5 12.97A10 10 0 0 1 8 9" />
          <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
        </svg>

        <h1 className="text-2xl font-semibold text-white">You are offline</h1>
        <p className="text-slate-400 max-w-sm">
          Check your internet connection and try again. Your progress is safe.
        </p>
      </div>

      <RetryButton />
    </div>
  );
}
