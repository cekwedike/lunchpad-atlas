"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, ArrowLeft, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { useLogin } from "@/hooks/api/useAuth";
import { loginSchema } from "@/lib/validations/auth";
import type { LoginRequest } from "@/types/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginRequest) => {
    login(data, {
      onSuccess: (response) => {
        setTimeout(() => {
          router.replace('/dashboard/admin');
        }, 150);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b45] via-green-900 to-[#0b0b45] flex flex-col items-center justify-center p-8" suppressHydrationWarning>
      {/* Back Button */}
      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 text-white/80 hover:text-white flex items-center gap-2 transition-colors"
        suppressHydrationWarning
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Home</span>
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md" suppressHydrationWarning>
        {/* Logo & Role Badge */}
        <div className="flex justify-center mb-8" suppressHydrationWarning>
          <div className="flex flex-col items-center gap-3" suppressHydrationWarning>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center" suppressHydrationWarning>
                <span className="text-[#0b0b45] font-bold text-2xl">A</span>
              </div>
              <span className="text-white font-bold text-2xl">ATLAS</span>
            </div>
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-400/30">
              <Shield className="w-4 h-4 text-green-300" />
              <span className="text-green-300 font-semibold text-sm">Admin Portal</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20" suppressHydrationWarning>
          <div className="mb-6 text-center" suppressHydrationWarning>
            <h1 className="text-2xl font-bold text-white mb-2">Administrator Access</h1>
            <p className="text-white/90 text-sm">Sign in to access platform administration</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" suppressHydrationWarning>
            <div suppressHydrationWarning>
              <label htmlFor="email" className="block text-white/90 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                {...register("email")}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="admin@example.com"
                disabled={isPending}
                suppressHydrationWarning
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
              )}
            </div>

            <div suppressHydrationWarning>
              <label htmlFor="password" className="block text-white/90 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative" suppressHydrationWarning>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  {...register("password")}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 pr-12"
                  placeholder="Enter your password"
                  disabled={isPending}
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              suppressHydrationWarning
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-white/60 text-center text-sm mt-6">
          Unauthorized access is strictly prohibited.
        </p>
      </div>
    </div>
  );
}
