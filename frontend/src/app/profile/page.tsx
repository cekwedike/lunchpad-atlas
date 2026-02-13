"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  User, Settings, FileText, MessageSquare,
  ClipboardCheck, Trophy, Edit2, Save, X, Lock, Loader2,
  Calendar, Users, Eye, EyeOff, CheckCircle2, Shield,
  GraduationCap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useProfile, useUserStats } from "@/hooks/api/useProfile";
import { useUpdateProfile, useChangePassword } from "@/hooks/api/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "At least 6 characters"),
    newPassword: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(6, "At least 6 characters"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_CFG: Record<string, {
  label: string; badgeBg: string; badgeText: string;
  headerGrad: string; icon: React.ComponentType<{ className?: string }>;
}> = {
  FELLOW:      { label: "Fellow",      badgeBg: "bg-blue-100",   badgeText: "text-blue-800",  headerGrad: "from-blue-600 to-cyan-500",     icon: User },
  FACILITATOR: { label: "Facilitator", badgeBg: "bg-green-100",  badgeText: "text-green-800", headerGrad: "from-green-600 to-teal-500",    icon: GraduationCap },
  ADMIN:       { label: "Admin",       badgeBg: "bg-red-100",    badgeText: "text-red-800",   headerGrad: "from-red-600 to-rose-500",      icon: Shield },
};

// ─── Password field with show/hide toggle ─────────────────────────────────────
function PasswordInput({ label, error, defaultShow = false, ...props }: { label: string; error?: string; defaultShow?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(defaultShow);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Input
          {...props}
          type={show ? "text" : "password"}
          className="pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-2.5 flex items-center text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Change Password form (shared across roles) ───────────────────────────────
function ChangePasswordSection() {
  const changePassword = useChangePassword();
  const [succeeded, setSucceeded] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordData) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      reset();
      setSucceeded(true);
      setTimeout(() => setSucceeded(false), 4000);
    } catch {
      // toast shown by hook
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900">Change Password</h3>
        <p className="text-sm text-gray-500 mt-0.5">Your password must be at least 6 characters.</p>
      </div>

      {succeeded && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Password updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <PasswordInput
          label="Current Password"
          placeholder="Enter your current password"
          error={errors.currentPassword?.message}
          defaultShow={true}
          {...register("currentPassword")}
        />
        <PasswordInput
          label="New Password"
          placeholder="Choose a new password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <PasswordInput
          label="Confirm New Password"
          placeholder="Repeat your new password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" size="sm" disabled={changePassword.isPending} className="gap-1.5">
          {changePassword.isPending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…</>
            : <><Lock className="h-3.5 w-3.5" /> Update Password</>
          }
        </Button>
      </form>
    </div>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────
function ProfilePageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "profile");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const { data: profile, isLoading, error, refetch } = useProfile();
  const { data: stats, isLoading: loadingStats } = useUserStats();
  const updateProfile = useUpdateProfile();

  const { register, handleSubmit, formState: { errors }, reset: resetProfile } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    values: profile ? { name: profile.name || "" } : undefined,
  });

  const onProfileSubmit = async (data: ProfileData) => {
    await updateProfile.mutateAsync({ name: data.name });
    await refetch();
    setIsEditing(false);
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout>
        <ErrorMessage title="Failed to load profile" message={error instanceof Error ? error.message : "An error occurred"} />
        <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
      </DashboardLayout>
    );
  }

  const role = profile.role as string;
  const roleCfg = ROLE_CFG[role] ?? ROLE_CFG.FELLOW;
  const RoleIcon = roleCfg.icon;
  const isFellow = role === "FELLOW";
  const cohort = (profile as any).cohort;
  const facilitatedCohorts: any[] = (profile as any).facilitatedCohorts ?? [];
  const memberSince = profile.createdAt
    ? formatDistanceToNow(new Date(profile.createdAt as any), { addSuffix: true })
    : null;
  const initials = profile.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  // Role-based tabs
  const TABS = [
    { key: "profile",  label: "Profile Info", icon: User },
    { key: "settings", label: "Settings",     icon: Settings },
  ];

  // ── Info rows for profile view ─────────────────────────────────────────────
  const infoRows = [
    { label: "Full Name", value: profile.name },
    { label: "Email Address", value: profile.email },
    { label: "Role", value: roleCfg.label },
    ...(isFellow && cohort ? [{ label: "Cohort", value: cohort.name }] : []),
    ...(facilitatedCohorts.length > 0 ? [{ label: "Facilitates", value: facilitatedCohorts.map((c) => c.name).join(", ") }] : []),
    ...(memberSince ? [{ label: "Member Since", value: `Joined ${memberSince}` }] : []),
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ═══ PROFILE HEADER ════════════════════════════════════════════════ */}
        <div className={cn("rounded-2xl bg-gradient-to-br p-px", roleCfg.headerGrad)}>
          <div className="rounded-[15px] bg-white p-6 sm:p-8">
            <div className="flex items-start gap-5 flex-wrap">
              {/* Avatar */}
              <div className={cn(
                "relative w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br",
                roleCfg.headerGrad,
              )}>
                <span className="text-white font-bold text-2xl select-none">{initials}</span>
                <div className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-1 shadow">
                  <RoleIcon className="h-3.5 w-3.5 text-gray-700" />
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{profile.name}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{profile.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <Badge className={cn("text-xs font-semibold px-2.5", roleCfg.badgeBg, roleCfg.badgeText)}>
                        {roleCfg.label}
                      </Badge>
                      {isFellow && cohort && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <Users className="h-3 w-3" /> {cohort.name}
                        </span>
                      )}
                      {facilitatedCohorts.map((c) => (
                        <span key={c.id} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <GraduationCap className="h-3 w-3" /> {c.name}
                        </span>
                      ))}
                      {memberSince && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" /> Joined {memberSince}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      onClick={() => { setIsEditing(true); setActiveTab("profile"); }}
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FELLOW STATS ═════════════════════════════════════════════════ */}
        {isFellow && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Trophy,        label: "Total Points",        value: (stats as any)?.totalPoints ?? 0,        color: "text-amber-600",  bg: "bg-amber-50",  ring: "ring-amber-200" },
              { icon: FileText,      label: "Resources Done",      value: (stats as any)?.resourcesCompleted ?? 0, color: "text-blue-600",   bg: "bg-blue-50",   ring: "ring-blue-200" },
              { icon: MessageSquare, label: "Discussions",         value: (stats as any)?.discussionsPosted ?? 0,  color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-200" },
              { icon: ClipboardCheck,label: "Quizzes Taken",       value: (stats as any)?.quizzesTaken ?? 0,       color: "text-green-600",  bg: "bg-green-50",  ring: "ring-green-200" },
            ].map(({ icon: Icon, label, value, color, bg, ring }) => (
              <div key={label} className={cn("rounded-xl p-4 ring-1 flex flex-col gap-1", bg, ring)}>
                {loadingStats ? (
                  <div className="h-7 w-12 rounded bg-gray-200 animate-pulse" />
                ) : (
                  <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
                )}
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", color)} />
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TABS ════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); if (key !== "profile") setIsEditing(false); }}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2",
                  activeTab === key
                    ? "border-blue-600 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ── PROFILE INFO ──────────────────────────────────────────── */}
            {activeTab === "profile" && (
              isEditing ? (
                <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-5 max-w-sm">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-0.5">Edit your name</h3>
                    <p className="text-sm text-gray-500">Your email address cannot be changed here.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <Input {...register("name")} placeholder="Your name" />
                    {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={updateProfile.isPending} className="gap-1.5">
                      {updateProfile.isPending
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                        : <><Save className="h-3.5 w-3.5" /> Save Changes</>
                      }
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5"
                      onClick={() => { resetProfile(); setIsEditing(false); }}>
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Personal Information</h3>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
                    {infoRows.map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-gray-500 shrink-0 mr-4">{label}</span>
                        <span className="font-medium text-gray-900 text-right break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* ── SETTINGS ──────────────────────────────────────────────── */}
            {activeTab === "settings" && (
              <ChangePasswordSection />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Page (Suspense for useSearchParams) ──────────────────────────────────────
export default function ProfilePage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    }>
      <ProfilePageInner />
    </Suspense>
  );
}
