import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-600 mt-2 text-center max-w-md">
        That link doesn&apos;t match anything on ATLAS. Check the URL or go back
        home.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
