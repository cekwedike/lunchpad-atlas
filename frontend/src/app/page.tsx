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
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<"fellow" | "facilitator" | "admin">("fellow");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".role-selector")) setIsDropdownOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const roles = [
    { id: "fellow" as const, name: "Fellow", icon: BookOpen, description: "Access learning resources and track your progress", color: "blue" },
    { id: "facilitator" as const, name: "Facilitator", icon: Users, description: "Manage cohorts and guide fellow development", color: "cyan" },
    { id: "admin" as const, name: "Admin", icon: Shield, description: "Platform administration and oversight", color: "emerald" },
  ];

  const currentRole = roles.find((r) => r.id === selectedRole)!;
  const CurrentIcon = currentRole.icon;

  const handleSignIn = () => router.push(`/login/${selectedRole}`);
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: "smooth" });

  const featureCategories = [
    {
      title: "Gamified Learning",
      subtitle: "Earn points, unlock achievements, climb the leaderboard",
      icon: Gamepad2,
      color: "from-violet-500 to-purple-600",
      glow: "group-hover:shadow-violet-500/20",
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
      glow: "group-hover:shadow-blue-500/20",
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
      glow: "group-hover:shadow-amber-500/20",
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
      glow: "group-hover:shadow-emerald-500/20",
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
      glow: "group-hover:shadow-cyan-500/20",
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
      glow: "group-hover:shadow-rose-500/20",
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
    { value: "4", label: "Categories" },
    { value: "Live", label: "Leaderboard" },
  ];

  const steps = [
    { step: "01", title: "Join a Cohort", desc: "Get assigned to a cohort with a structured 4-month curriculum", icon: Users, color: "text-blue-400", bg: "from-blue-500/20 to-blue-600/20", border: "border-blue-500/30" },
    { step: "02", title: "Learn & Earn", desc: "Complete resources and quizzes to earn points and unlock achievements", icon: BookOpen, color: "text-cyan-400", bg: "from-cyan-500/20 to-cyan-600/20", border: "border-cyan-500/30" },
    { step: "03", title: "Engage & Discuss", desc: "Participate in chats, forums, and live quiz sessions", icon: MessageCircle, color: "text-teal-400", bg: "from-teal-500/20 to-teal-600/20", border: "border-teal-500/30" },
    { step: "04", title: "Rise to the Top", desc: "Climb the leaderboard, maintain streaks, and become The GOAT", icon: Trophy, color: "text-amber-400", bg: "from-amber-500/20 to-amber-600/20", border: "border-amber-500/30" },
  ];

  const roleGradient =
    currentRole.color === "blue" ? "from-blue-500 to-blue-600 shadow-blue-500/30"
    : currentRole.color === "cyan" ? "from-cyan-500 to-cyan-600 shadow-cyan-500/30"
    : "from-emerald-500 to-emerald-600 shadow-emerald-500/30";

  const roleIconGradient =
    currentRole.color === "blue" ? "from-blue-400 to-blue-600"
    : currentRole.color === "cyan" ? "from-cyan-400 to-cyan-600"
    : "from-emerald-400 to-emerald-600";

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden" suppressHydrationWarning>

      {/* ── Parallax background ── */}
      <div className="fixed inset-0 z-0" suppressHydrationWarning>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/photo/landing-page.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `translateY(${scrollY * 0.3}px)`,
            filter: "brightness(0.25)",
            willChange: "transform",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950" />
      </div>

      {/* ── Ambient orbs ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-1/4 -left-16 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10">

        {/* ── Header ── */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-9 h-9 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-lg items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">ATLAS</span>
            </div>
            <button
              onClick={scrollToFeatures}
              className="hidden sm:flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm group"
            >
              Explore Features
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </header>

        {/* ══════════════ HERO ══════════════ */}
        <section className="min-h-screen flex items-center justify-center px-4 sm:px-8 pt-24 sm:pt-28 pb-16">
          <div className="max-w-6xl w-full">

            {/* Sign-in card — full width on mobile, right col on desktop */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">

              {/* Right col: Sign-in card (shows first on mobile) */}
              <div className="order-first lg:order-last w-full max-w-md mx-auto lg:mx-0 lg:ml-auto mb-10 lg:mb-0">
                {/* Outer glow ring */}
                <div className="relative">
                  <div className={`absolute -inset-0.5 bg-gradient-to-br ${roleGradient} rounded-3xl blur opacity-30 transition-all duration-500`} />
                  <div
                    className="relative bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl"
                    suppressHydrationWarning
                  >
                    <div className="text-center space-y-1">
                      <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                      <p className="text-slate-400 text-sm">Select your role to continue</p>
                    </div>

                    {/* Role Selector */}
                    <div className="relative role-selector" suppressHydrationWarning>
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center justify-between hover:bg-white/8 hover:border-white/20 transition-all cursor-pointer"
                        suppressHydrationWarning
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleIconGradient} flex items-center justify-center shadow-lg shrink-0`}>
                            <CurrentIcon className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-white font-semibold text-sm">{currentRole.name}</div>
                            <div className="text-slate-400 text-xs truncate">{currentRole.description}</div>
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-2 ${isDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isDropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-2 bg-slate-900/98 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl shadow-black/40"
                          suppressHydrationWarning
                        >
                          {roles.map((role) => {
                            const RoleIcon = role.icon;
                            const iconG = role.color === "blue" ? "from-blue-400 to-blue-600" : role.color === "cyan" ? "from-cyan-400 to-cyan-600" : "from-emerald-400 to-emerald-600";
                            return (
                              <button
                                key={role.id}
                                onClick={() => { setSelectedRole(role.id); setIsDropdownOpen(false); }}
                                className={`w-full p-3.5 flex items-center gap-3 hover:bg-white/8 transition-all text-left ${selectedRole === role.id ? "bg-white/5" : ""}`}
                                suppressHydrationWarning
                              >
                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${iconG} flex items-center justify-center flex-shrink-0`}>
                                  <RoleIcon className="w-4 h-4 text-white" strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-medium text-sm">{role.name}</div>
                                  <div className="text-slate-400 text-xs truncate">{role.description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSignIn}
                      className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg bg-gradient-to-r ${roleGradient} hover:scale-[1.01] active:scale-[0.99]`}
                      suppressHydrationWarning
                    >
                      Continue as {currentRole.name}
                    </button>
                  </div>
                </div>
              </div>

              {/* Left col: Hero text */}
              <div className="order-last lg:order-first space-y-6 sm:space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
                  <span className="text-blue-300 text-xs sm:text-sm font-medium">Gamified Learning Platform</span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none">
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent drop-shadow-lg">
                      ATLAS
                    </span>
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
                    Accelerating Talent for Leadership &amp; Success. A gamified learning management
                    system built for the{" "}
                    <span className="text-cyan-400 font-semibold">THRiVE Hub LaunchPad Fellowship</span>.
                  </p>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-6">
                  {stats.map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-center min-w-[70px]">
                      <div className="text-lg sm:text-2xl font-bold text-white leading-none">{stat.value}</div>
                      <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={scrollToFeatures}
                  className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-all group"
                >
                  <span className="text-sm">Discover all features</span>
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════ FEATURES ══════════════ */}
        <section ref={featuresRef} className="py-20 sm:py-32 px-4 sm:px-8">
          {/* Section backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">Platform Features</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                Everything You Need to{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Succeed
                </span>
              </h2>
              <p className="text-base sm:text-lg max-w-2xl mx-auto text-slate-300">
                A complete learning ecosystem with gamification, real-time collaboration, and powerful management tools.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {featureCategories.map((category, i) => {
                const CategoryIcon = category.icon;
                return (
                  <div
                    key={i}
                    className={`group relative rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-white/20 transition-all duration-500 overflow-hidden shadow-lg hover:shadow-2xl ${category.glow}`}
                  >
                    <div className={`h-0.5 bg-gradient-to-r ${category.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start gap-4 mb-5">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg shrink-0`}>
                          <CategoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">{category.title}</h3>
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{category.subtitle}</p>
                        </div>
                      </div>
                      <ul className="space-y-2.5">
                        {category.features.map((feature, j) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <li key={j} className="flex items-start gap-2.5">
                              <FeatureIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
                              <span className="text-sm leading-snug text-slate-300">{feature.text}</span>
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

        {/* ══════════════ HOW IT WORKS ══════════════ */}
        <section className="py-20 sm:py-32 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12 sm:mb-16 space-y-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                How It{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Works</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-300">Your journey from onboarding to mastery</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
              {steps.map((item, i) => {
                const StepIcon = item.icon;
                return (
                  <div key={i} className="relative flex flex-col items-center text-center space-y-3">
                    {/* Connector line — desktop only */}
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px bg-gradient-to-r from-white/20 to-white/5" />
                    )}
                    {/* Icon circle */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.bg} border ${item.border} flex items-center justify-center relative z-10`}>
                      <StepIcon className={`w-7 h-7 ${item.color}`} strokeWidth={1.5} />
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest">STEP {item.step}</div>
                    <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">{item.title}</h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-400 hidden sm:block">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════ FOOTER ══════════════ */}
        <footer className="py-10 px-4 sm:px-8 border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex w-8 h-8 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-lg items-center justify-center shadow-md shadow-blue-500/20">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="text-slate-500 text-sm font-medium">ATLAS</span>
            </div>
            <p className="text-slate-600 text-xs sm:text-sm">
              &copy; {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
