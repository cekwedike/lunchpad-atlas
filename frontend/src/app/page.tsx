"use client";

import {
  Target,
  MessageCircle,
  BarChart3,
  Users,
  Shield,
  BookOpen,
  ChevronDown,
  Trophy,
  Zap,
  Brain,
  Gamepad2,
  Bell,
  CalendarDays,
  FileText,
  Video,
  Award,
  TrendingUp,
  Star,
  ArrowRight,
  CheckCircle2,
  Flame,
  Layout,
  Lock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [selectedRole, setSelectedRole] = useState<"fellow" | "facilitator" | "admin">("fellow");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".role-selector")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const roles = [
    {
      id: "fellow" as const,
      name: "Fellow",
      icon: BookOpen,
      description: "Access learning resources and track your progress",
      color: "blue",
    },
    {
      id: "facilitator" as const,
      name: "Facilitator",
      icon: Users,
      description: "Manage cohorts and guide fellow development",
      color: "cyan",
    },
    {
      id: "admin" as const,
      name: "Admin",
      icon: Shield,
      description: "Platform administration and oversight",
      color: "emerald",
    },
  ];

  const currentRole = roles.find((r) => r.id === selectedRole)!;
  const CurrentIcon = currentRole.icon;

  const handleSignIn = () => {
    router.push(`/login/${selectedRole}`);
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const featureCategories = [
    {
      title: "Gamified Learning",
      subtitle: "Earn points, unlock achievements, climb the leaderboard",
      icon: Gamepad2,
      color: "from-violet-500 to-purple-600",
      features: [
        { icon: Trophy, text: "20+ Achievements across 4 categories" },
        { icon: TrendingUp, text: "Real-time leaderboard with monthly rankings" },
        { icon: Flame, text: "Daily streaks with bonus multipliers" },
        { icon: Star, text: "Points for every resource, quiz, and discussion" },
        { icon: Award, text: "Gold, Silver, Bronze medals for top performers" },
      ],
    },
    {
      title: "Structured Curriculum",
      subtitle: "Month-by-month learning paths with curated resources",
      icon: BookOpen,
      color: "from-blue-500 to-cyan-500",
      features: [
        { icon: CalendarDays, text: "4-month cohort programs with scheduled sessions" },
        { icon: FileText, text: "Curated articles with completion tracking" },
        { icon: Video, text: "Video resources with embedded player" },
        { icon: Lock, text: "Timed resource unlocks tied to session dates" },
        { icon: CheckCircle2, text: "Core and optional resource designations" },
      ],
    },
    {
      title: "Interactive Quizzes",
      subtitle: "Test knowledge with self-paced and live quiz formats",
      icon: Brain,
      color: "from-amber-500 to-orange-500",
      features: [
        { icon: Zap, text: "Live quizzes with real-time participation" },
        { icon: Target, text: "Self-paced quizzes with time limits" },
        { icon: TrendingUp, text: "Session, General, and Mega quiz types" },
        { icon: Flame, text: "Answer streaks with bonus point multipliers" },
        { icon: Trophy, text: "Live leaderboard during quiz sessions" },
      ],
    },
    {
      title: "Community & Collaboration",
      subtitle: "Connect, discuss, and grow together",
      icon: MessageCircle,
      color: "from-emerald-500 to-teal-500",
      features: [
        { icon: MessageCircle, text: "Real-time cohort chat rooms" },
        { icon: Users, text: "Discussion forums with topic threading" },
        { icon: Bell, text: "Instant notifications for all activity" },
        { icon: BookOpen, text: "Resource-linked discussion threads" },
        { icon: Star, text: "Earn points for community participation" },
      ],
    },
    {
      title: "Facilitator Tools",
      subtitle: "Monitor, guide, and support fellow growth",
      icon: Users,
      color: "from-cyan-500 to-blue-500",
      features: [
        { icon: BarChart3, text: "Fellow engagement monitoring dashboard" },
        { icon: Bell, text: "Low-engagement alerts with severity flags" },
        { icon: CalendarDays, text: "Session attendance tracking" },
        { icon: Award, text: "Manual point awards and adjustments" },
        { icon: Lock, text: "Resource unlock management" },
      ],
    },
    {
      title: "Admin Control Center",
      subtitle: "Full platform management and analytics",
      icon: Shield,
      color: "from-rose-500 to-pink-500",
      features: [
        { icon: Users, text: "User management with role assignment" },
        { icon: Layout, text: "Cohort creation and duplication" },
        { icon: BarChart3, text: "Comprehensive platform analytics" },
        { icon: Brain, text: "Quiz and achievement management" },
        { icon: TrendingUp, text: "Leaderboard and point system controls" },
      ],
    },
  ];

  const stats = [
    { value: "20+", label: "Achievements" },
    { value: "3", label: "Quiz Types" },
    { value: "4", label: "Achievement Categories" },
    { value: "Real-time", label: "Leaderboard" },
  ];

  return (
    <div className="min-h-screen bg-slate-950" suppressHydrationWarning>
      {/* Background - Fixed with parallax */}
      <div className="fixed inset-0 z-0" suppressHydrationWarning>
        <div
          className="absolute inset-0"
          suppressHydrationWarning
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            filter: "brightness(0.35)",
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/70 to-slate-950"
          suppressHydrationWarning
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <div className="text-white font-semibold text-lg tracking-tight">ATLAS</div>
                <div className="text-slate-400 text-xs tracking-wide">THRiVE Hub LaunchPad</div>
              </div>
            </div>
            <button
              onClick={scrollToFeatures}
              className="hidden sm:flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              Explore Features
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ═══════════ HERO SECTION ═══════════ */}
        <section className="min-h-screen flex items-center justify-center px-4 sm:px-8 pt-32 pb-20">
          <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Hero Text */}
            <div
              className="space-y-8"
              style={{ transform: `translateY(${scrollY * -0.08}px)` }}
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 text-sm font-medium">
                    Gamified Learning Platform
                  </span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    ATLAS
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-lg">
                  Accelerating Talent for Leadership & Success. A gamified learning management
                  system built for the{" "}
                  <span className="text-cyan-400 font-semibold">
                    THRiVE Hub LaunchPad Fellowship
                  </span>
                  .
                </p>
              </div>

              <div className="flex flex-wrap gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={scrollToFeatures}
                className="group flex items-center gap-3 text-slate-400 hover:text-white transition-all"
              >
                <span className="text-sm">Discover all features</span>
                <ChevronDown className="w-5 h-5 animate-bounce" />
              </button>
            </div>

            {/* Right: Sign In Card */}
            <div
              className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
              style={{ transform: `translateY(${scrollY * -0.04}px)` }}
            >
              <div
                className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl shadow-black/20"
                suppressHydrationWarning
              >
                <div className="text-center space-y-2" suppressHydrationWarning>
                  <h2 className="text-2xl font-bold text-white" style={{ color: "#ffffff" }}>
                    Sign In
                  </h2>
                  <p className="text-slate-400 text-sm">Select your role to continue</p>
                </div>

                {/* Role Selector */}
                <div className="relative role-selector" suppressHydrationWarning>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer"
                    suppressHydrationWarning
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                          currentRole.color === "blue"
                            ? "from-blue-400 to-blue-600"
                            : currentRole.color === "cyan"
                              ? "from-cyan-400 to-cyan-600"
                              : "from-emerald-400 to-emerald-600"
                        } flex items-center justify-center shadow-lg`}
                      >
                        <CurrentIcon className="w-6 h-6 text-white" strokeWidth={2} />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-semibold">{currentRole.name}</div>
                        <div className="text-slate-400 text-sm">{currentRole.description}</div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50"
                      suppressHydrationWarning
                    >
                      {roles.map((role) => {
                        const RoleIcon = role.icon;
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              setSelectedRole(role.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full p-4 flex items-center gap-4 hover:bg-white/10 transition-all ${
                              selectedRole === role.id ? "bg-white/5" : ""
                            }`}
                            suppressHydrationWarning
                          >
                            <div
                              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                                role.color === "blue"
                                  ? "from-blue-400 to-blue-600"
                                  : role.color === "cyan"
                                    ? "from-cyan-400 to-cyan-600"
                                    : "from-emerald-400 to-emerald-600"
                              } flex items-center justify-center flex-shrink-0`}
                            >
                              <RoleIcon className="w-5 h-5 text-white" strokeWidth={2} />
                            </div>
                            <div className="text-left">
                              <div className="text-white font-medium text-sm">{role.name}</div>
                              <div className="text-slate-400 text-xs">{role.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSignIn}
                  className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg bg-gradient-to-r ${
                    currentRole.color === "blue"
                      ? "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25"
                      : currentRole.color === "cyan"
                        ? "from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-cyan-500/25"
                        : "from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25"
                  }`}
                  suppressHydrationWarning
                >
                  Continue as {currentRole.name}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ FEATURES SECTION ═══════════ */}
        <section ref={featuresRef} className="py-32 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div
              className="text-center mb-20 space-y-4"
              style={{
                opacity: Math.min(1, Math.max(0, (scrollY - 400) / 300)),
                transform: `translateY(${Math.max(0, 40 - (scrollY - 400) * 0.1)}px)`,
              }}
            >
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">Platform Features</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold" style={{ color: "#ffffff" }}>
                Everything You Need to{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Succeed
                </span>
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "#e2e8f0" }}>
                A complete learning ecosystem with gamification, real-time collaboration, and
                powerful management tools.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCategories.map((category, i) => {
                const CategoryIcon = category.icon;
                return (
                  <div
                    key={i}
                    className="group relative rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15 transition-all duration-500 overflow-hidden"
                    style={{
                      opacity: Math.min(1, Math.max(0, (scrollY - 500 - i * 60) / 300)),
                      transform: `translateY(${Math.max(0, 30 - (scrollY - 500 - i * 60) * 0.08)}px)`,
                    }}
                  >
                    {/* Gradient top bar */}
                    <div
                      className={`h-1 bg-gradient-to-r ${category.color} opacity-60 group-hover:opacity-100 transition-opacity`}
                    />

                    <div className="p-7">
                      {/* Category Header */}
                      <div className="flex items-center gap-4 mb-5">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}
                        >
                          <CategoryIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold" style={{ color: "#ffffff" }}>{category.title}</h3>
                          <p className="text-xs" style={{ color: "#cbd5e1" }}>{category.subtitle}</p>
                        </div>
                      </div>

                      {/* Feature List */}
                      <ul className="space-y-3">
                        {category.features.map((feature, j) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <li key={j} className="flex items-start gap-3">
                              <FeatureIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#94a3b8" }} />
                              <span className="text-sm leading-snug" style={{ color: "#cbd5e1" }}>
                                {feature.text}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section className="py-32 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div
              className="text-center mb-16 space-y-4"
              style={{
                opacity: Math.min(1, Math.max(0, (scrollY - 1600) / 300)),
                transform: `translateY(${Math.max(0, 40 - (scrollY - 1600) * 0.1)}px)`,
              }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                How It{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Works
                </span>
              </h2>
              <p className="text-slate-400 text-lg">Your journey from onboarding to mastery</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Join a Cohort",
                  desc: "Get assigned to a cohort with a structured 4-month curriculum",
                  icon: Users,
                  color: "text-blue-400",
                },
                {
                  step: "02",
                  title: "Learn & Earn",
                  desc: "Complete resources and quizzes to earn points and unlock achievements",
                  icon: BookOpen,
                  color: "text-cyan-400",
                },
                {
                  step: "03",
                  title: "Engage & Discuss",
                  desc: "Participate in chats, forums, and live quiz sessions",
                  icon: MessageCircle,
                  color: "text-teal-400",
                },
                {
                  step: "04",
                  title: "Rise to the Top",
                  desc: "Climb the leaderboard, maintain streaks, and become The GOAT",
                  icon: Trophy,
                  color: "text-amber-400",
                },
              ].map((item, i) => {
                const StepIcon = item.icon;
                return (
                  <div
                    key={i}
                    className="text-center space-y-4"
                    style={{
                      opacity: Math.min(
                        1,
                        Math.max(0, (scrollY - 1800 - i * 100) / 300),
                      ),
                      transform: `translateY(${Math.max(0, 30 - (scrollY - 1800 - i * 100) * 0.08)}px)`,
                    }}
                  >
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <StepIcon className={`w-7 h-7 ${item.color}`} strokeWidth={1.5} />
                    </div>
                    <div className="text-xs font-bold text-slate-400 tracking-widest">
                      STEP {item.step}
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: "#ffffff" }}>{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════ CTA SECTION ═══════════ */}
        <section className="py-32 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div
              className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-white/10 rounded-3xl p-12 md:p-16 space-y-8"
              style={{
                opacity: Math.min(1, Math.max(0, (scrollY - 2400) / 300)),
              }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white">
                Ready to Start Your Journey?
              </h2>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                Join the LaunchPad Fellowship and accelerate your career with gamified learning,
                real-time collaboration, and a supportive community.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25"
              >
                Sign In Now
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════ FOOTER ═══════════ */}
        <footer className="py-16 px-4 sm:px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-slate-500 text-sm">
                ATLAS - THRiVE Hub LaunchPad Fellowship
              </span>
            </div>
            <p className="text-slate-600 text-sm">
              &copy; {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
