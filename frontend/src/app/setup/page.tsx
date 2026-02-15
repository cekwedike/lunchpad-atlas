"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useSetupStatus, useSetupAdmin } from "@/hooks/api/useAuth";
import { PasswordTracker } from "@/components/PasswordTracker";

export default function SetupPage() {
  const router = useRouter();
  const { data: setupStatus, isLoading: statusLoading } = useSetupStatus();
  const setupAdmin = useSetupAdmin();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!statusLoading && setupStatus && !setupStatus.needsSetup) {
      router.replace("/login");
    }
  }, [setupStatus, statusLoading, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "A valid email address is required";
    }
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await setupAdmin.mutateAsync({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: typeof form.confirmPassword === "string" ? form.confirmPassword : "",
      });
      router.replace("/dashboard/admin");
    } catch {
      // error handled by hook
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b0b45] via-[#1a1a6e] to-[#0b0b45] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b45] via-[#1a1a6e] to-[#0b0b45] flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#0b0b45] font-bold text-2xl">A</span>
            </div>
            <span className="text-white font-bold text-2xl">ATLAS</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ color: '#ffffff' }}>Initial Setup</h1>
            <p className="text-white/70 text-sm">
              No admin account exists yet. Create one to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="e.g. Jane Doe"
                disabled={setupAdmin.isPending}
              />
              {errors.name && <p className="mt-1 text-sm text-red-300">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="admin@example.com"
                disabled={setupAdmin.isPending}
              />
              {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 pr-12"
                  placeholder="Min. 8 characters"
                  disabled={setupAdmin.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-300">{errors.password}</p>}
              <PasswordTracker password={form.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 pr-12"
                  placeholder="Re-enter password"
                  disabled={setupAdmin.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-300">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={setupAdmin.isPending}
              className="w-full px-4 py-3 bg-white text-[#0b0b45] rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {setupAdmin.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating admin account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Create Admin Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-white/60 text-center text-sm mt-6">
          This page is only accessible when no admin accounts exist.
        </p>
      </div>
    </div>
  );
}
