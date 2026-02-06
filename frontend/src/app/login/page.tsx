"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLogin } from "@/hooks/api/useAuth";
import { loginSchema } from "@/lib/validations/auth";
import type { LoginRequest } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [showPassword, setShowPassword] = useState(false);
  const { enterGuestMode } = useAuth();
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
        // Navigate based on user role
        const dashboardRoute = `/dashboard/${response.user.role.toLowerCase()}`;
        // Use replace and add delay to ensure state is updated
        setTimeout(() => {
          router.replace(dashboardRoute);
        }, 150);
      },
    });
  };

  const handleGuestMode = () => {
    enterGuestMode();
    router.push("/dashboard/fellow");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b45] via-[#1a1a6e] to-[#0b0b45] flex flex-col items-center justify-center p-8" suppressHydrationWarning>
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
        {/* Logo */}
        <div className="flex justify-center mb-8" suppressHydrationWarning>
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center" suppressHydrationWarning>
              <span className="text-[#0b0b45] font-bold text-2xl">A</span>
            </div>
            <span className="text-white font-bold text-2xl">ATLAS</span>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20" suppressHydrationWarning>
          <div className="mb-6 text-center" suppressHydrationWarning>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ color: '#ffffff' }}>Welcome Back</h1>
            <p className="text-white/70 text-sm">Sign in to continue your learning journey</p>
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
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="you@example.com"
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
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 pr-12"
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
              className="w-full px-4 py-3 bg-white text-[#0b0b45] rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-6 text-center" suppressHydrationWarning>
            <button
              onClick={handleGuestMode}
              className="text-white/70 hover:text-white text-sm transition-colors"
              disabled={isPending}
              suppressHydrationWarning
            >
              Continue as Guest
            </button>
          </div>
        </div>

        <p className="text-white/60 text-center text-sm mt-6" suppressHydrationWarning>
          Need an account? Contact your program administrator.
        </p>
      </div>
    </div>
  );
}
