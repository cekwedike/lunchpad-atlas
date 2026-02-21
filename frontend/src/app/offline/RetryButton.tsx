'use client';

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="mt-2 px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
    >
      Try again
    </button>
  );
}
