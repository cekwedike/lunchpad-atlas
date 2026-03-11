"use client";

import {
  Target, MessageCircle, BarChart3, Users, Shield, BookOpen,
  ChevronDown, Trophy, Zap, Brain, Gamepad2, Bell, CalendarDays,
  FileText, Video, Award, TrendingUp, Star, ArrowRight, CheckCircle2,
  Flame, Layout, Lock,
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
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".role-selector")) setIsDropdownOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const roles = [
    { id: "fellow" as const, name: "Fellow", icon: BookOpen, description: "Access learning resources and track your progress", accent: "from-blue-400 to-indigo-500", glow: "shadow-blue-500/40" },
    { id: "facilitator" as const, name: "Facilitator", icon: Users, description: "Manage cohorts and guide fellow development", accent: "from-cyan-400 to-teal-500", glow: "shadow-cyan-500/40" },
    { id: "admin" as const, name: "Admin", icon: Shield, description: "Platform administration and oversight", accent: "from-emerald-400 to-green-600", glow: "shadow-emerald-500/40" },
  ];
  const currentRole = roles.find((r) => r.id === selectedRole)!;
  const CurrentIcon = currentRole.icon;

  const handleSignIn = () => router.push(`/login/${selectedRole}`);
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: "smooth" });

  const features = [
    { title: "Gamified Learning", subtitle: "Earn points, unlock achievements, climb the leaderboard", icon: Gamepad2, color: "from-violet-500 to-purple-600", items: [{ icon: Trophy, text: "20+ Achievements across 4 categories" }, { icon: TrendingUp, text: "Real-time leaderboard with monthly rankings" }, { icon: Flame, text: "Daily streaks with bonus multipliers" }, { icon: Star, text: "Points for every resource, quiz, and discussion" }, { icon: Award, text: "Gold, Silver, Bronze medals for top performers" }] },
    { title: "Structured Curriculum", subtitle: "Month-by-month learning paths with curated resources", icon: BookOpen, color: "from-blue-500 to-cyan-500", items: [{ icon: CalendarDays, text: "4-month cohort programs with scheduled sessions" }, { icon: FileText, text: "Curated articles with completion tracking" }, { icon: Video, text: "Video resources with embedded player" }, { icon: Lock, text: "Timed resource unlocks tied to session dates" }, { icon: CheckCircle2, text: "Core and optional resource designations" }] },
    { title: "Interactive Quizzes", subtitle: "Test knowledge with self-paced and live quiz formats", icon: Brain, color: "from-amber-500 to-orange-500", items: [{ icon: Zap, text: "Live quizzes with real-time participation" }, { icon: Target, text: "Self-paced quizzes with time limits" }, { icon: TrendingUp, text: "Session, General, and Mega quiz types" }, { icon: Flame, text: "Answer streaks with bonus point multipliers" }, { icon: Trophy, text: "Live leaderboard during quiz sessions" }] },
    { title: "Community & Collaboration", subtitle: "Connect, discuss, and grow together", icon: MessageCircle, color: "from-emerald-500 to-teal-500", items: [{ icon: MessageCircle, text: "Real-time cohort chat rooms" }, { icon: Users, text: "Discussion forums with topic threading" }, { icon: Bell, text: "Instant notifications for all activity" }, { icon: BookOpen, text: "Resource-linked discussion threads" }, { icon: Star, text: "Earn points for community participation" }] },
    { title: "Facilitator Tools", subtitle: "Monitor, guide, and support fellow growth", icon: Users, color: "from-cyan-500 to-blue-500", items: [{ icon: BarChart3, text: "Fellow engagement monitoring dashboard" }, { icon: Bell, text: "Low-engagement alerts with severity flags" }, { icon: CalendarDays, text: "Session attendance tracking" }, { icon: Award, text: "Manual point awards and adjustments" }, { icon: Lock, text: "Resource unlock management" }] },
    { title: "Admin Control Center", subtitle: "Full platform management and analytics", icon: Shield, color: "from-rose-500 to-pink-500", items: [{ icon: Users, text: "User management with role assignment" }, { icon: Layout, text: "Cohort creation and duplication" }, { icon: BarChart3, text: "Comprehensive platform analytics" }, { icon: Brain, text: "Quiz and achievement management" }, { icon: TrendingUp, text: "Leaderboard and point system controls" }] },
  ];

  const steps = [
    { n: "01", title: "Join a Cohort", desc: "Get assigned to a cohort with a structured 4-month curriculum", icon: Users, grad: "from-blue-500 to-indigo-600" },
    { n: "02", title: "Learn & Earn", desc: "Complete resources and quizzes to earn points and unlock achievements", icon: BookOpen, grad: "from-cyan-500 to-blue-600" },
    { n: "03", title: "Engage & Discuss", desc: "Participate in chats, forums, and live quiz sessions", icon: MessageCircle, grad: "from-teal-500 to-cyan-600" },
    { n: "04", title: "Rise to the Top", desc: "Climb the leaderboard, maintain streaks, and become The GOAT", icon: Trophy, grad: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-x-hidden" suppressHydrationWarning>

      {/* ─── Parallax background ─── */}
      <div className="fixed inset-0 z-0" suppressHydrationWarning>
        <div
          style={{
            position: "absolute", inset: "-20%",
            backgroundImage: "url(/photo/landing-page.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            transform: `translateY(${scrollY * 0.25}px)`,
            filter: "brightness(0.45) saturate(1.1)",
            willChange: "transform",
          }}
        />
        {/* layered gradients for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/20" />
      </div>

      {/* ─── Header ─── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.07] backdrop-blur-2xl bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center shadow-lg shadow-blue-600/40">
              <span className="text-white font-black text-sm leading-none">A</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight">ATLAS</span>
          </div>
          <button onClick={scrollToFeatures} className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors group">
            Features <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <div className="relative z-10">

        {/* ════════════════ HERO ════════════════ */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-8 pt-16">
          <div className="w-full max-w-6xl mx-auto py-16 sm:py-24 grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-20 items-center">

            {/* ── Left: copy ── */}
            <div className="space-y-8 text-center lg:text-left order-last lg:order-first">

              {/* eyebrow */}
              <div className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.06] backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold text-blue-300 tracking-wide uppercase">
                <Zap className="w-3 h-3" /> Gamified Learning Platform
              </div>

              {/* headline */}
              <div>
                <h1 className="text-[clamp(3.5rem,12vw,7rem)] font-black tracking-[-0.03em] leading-none">
                  <span
                    className="inline-block bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg, #93c5fd 0%, #67e8f9 40%, #5eead4 100%)" }}
                  >
                    ATLAS
                  </span>
                </h1>
                <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Accelerating Talent for Leadership &amp; Success. The gamified LMS built for the{" "}
                  <span className="text-cyan-300 font-semibold">THRiVE Hub LaunchPad Fellowship</span>.
                </p>
              </div>

              {/* stat pills */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                {[
                  { v: "20+", l: "Achievements" },
                  { v: "3", l: "Quiz Types" },
                  { v: "4", l: "Categories" },
                  { v: "Live", l: "Leaderboard" },
                ].map((s) => (
                  <div key={s.l} className="border border-white/10 bg-white/[0.05] backdrop-blur-sm rounded-2xl px-4 py-2.5 text-center">
                    <div className="text-lg sm:text-xl font-black text-white leading-none">{s.v}</div>
                    <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">{s.l}</div>
                  </div>
                ))}
              </div>

              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors group text-sm">
                Explore all features <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            </div>

            {/* ── Right: sign-in card ── */}
            <div className="order-first lg:order-last w-full">
              <div className="relative">
                {/* glow halo */}
                <div
                  className="absolute -inset-3 rounded-[2rem] blur-2xl opacity-30 transition-all duration-700"
                  style={{ backgroundImage: `linear-gradient(135deg, var(--glow-a), var(--glow-b))`,
                    ['--glow-a' as string]: currentRole.id === 'fellow' ? '#3b82f6' : currentRole.id === 'facilitator' ? '#06b6d4' : '#10b981',
                    ['--glow-b' as string]: currentRole.id === 'fellow' ? '#6366f1' : currentRole.id === 'facilitator' ? '#14b8a6' : '#059669',
                  }}
                />
                {/* card */}
                <div className="relative rounded-3xl border border-white/10 bg-white/[0.07] backdrop-blur-3xl p-6 sm:p-8 shadow-2xl shadow-black/40" suppressHydrationWarning>
                  <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold text-white">Welcome to ATLAS</h2>
                    <p className="text-sm text-white/50 mt-1">Sign in to your dashboard</p>
                  </div>

                  {/* role selector */}
                  <div className="relative role-selector mb-4" suppressHydrationWarning>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full border border-white/10 bg-white/[0.05] hover:bg-white/10 rounded-xl p-3.5 flex items-center gap-3 transition-all"
                      suppressHydrationWarning
                    >
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${currentRole.accent} shadow-lg shrink-0 flex items-center justify-center`}>
                        <CurrentIcon className="w-4.5 h-4.5 text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-semibold text-white">{currentRole.name}</div>
                        <div className="text-xs text-white/40 truncate">{currentRole.description}</div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/30 transition-transform shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute inset-x-0 top-full mt-2 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-50" suppressHydrationWarning>
                        {roles.map((r) => {
                          const Ic = r.icon;
                          return (
                            <button key={r.id}
                              onClick={() => { setSelectedRole(r.id); setIsDropdownOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-all text-left ${selectedRole === r.id ? "bg-white/5" : ""}`}
                              suppressHydrationWarning
                            >
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${r.accent} flex items-center justify-center shrink-0`}>
                                <Ic className="w-4 h-4 text-white" strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white">{r.name}</div>
                                <div className="text-xs text-white/40 truncate">{r.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handleSignIn}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${currentRole.accent} shadow-lg ${currentRole.glow} hover:opacity-90 active:scale-[0.98] transition-all`}
                    suppressHydrationWarning
                  >
                    Continue as {currentRole.name} &rarr;
                  </button>

                  <p className="mt-4 text-center text-xs text-white/25">Authorised personnel only</p>
                </div>
              </div>
            </div>
          </div>

          {/* scroll cue */}
          <div className="pb-12 flex flex-col items-center gap-2 text-white/30">
            <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
            <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </section>

        {/* ════════════════ FEATURES ════════════════ */}
        <section ref={featuresRef} className="relative py-24 sm:py-32 px-4 sm:px-8">
          {/* section tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto">
            {/* heading */}
            <div className="max-w-2xl mx-auto text-center mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 border border-purple-500/30 bg-purple-500/10 rounded-full px-4 py-1.5 text-xs font-semibold text-purple-300 uppercase tracking-wide">
                <Target className="w-3 h-3" /> Platform Features
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
                Everything you need to{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">succeed</span>
              </h2>
              <p className="text-base sm:text-lg text-white/60">
                A complete learning ecosystem — gamification, real-time collaboration, and powerful management tools.
              </p>
            </div>

            {/* cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {features.map((f, i) => {
                const FIcon = f.icon;
                return (
                  <div key={i} className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/15 hover:bg-white/[0.06] transition-all duration-400 overflow-hidden">
                    {/* top accent */}
                    <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${f.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    <div className="p-5 sm:p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg shrink-0`}>
                          <FIcon className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-white">{f.title}</h3>
                          <p className="text-[11px] text-white/40 leading-snug mt-0.5">{f.subtitle}</p>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {f.items.map((item, j) => {
                          const IIcon = item.icon;
                          return (
                            <li key={j} className="flex items-start gap-2">
                              <IIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/30" />
                              <span className="text-xs sm:text-sm text-white/60 leading-snug">{item.text}</span>
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

        {/* ════════════════ HOW IT WORKS ════════════════ */}
        <section className="relative py-24 sm:py-32 px-4 sm:px-8 overflow-hidden">
          {/* subtle bg tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950/10 to-slate-950 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto">
            <div className="text-center mb-14 sm:mb-20 space-y-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
                How it{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">works</span>
              </h2>
              <p className="text-base sm:text-lg text-white/50">Your journey from onboarding to mastery</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
              {steps.map((s, i) => {
                const SIcon = s.icon;
                return (
                  <div key={i} className="relative flex flex-col items-center text-center gap-4">
                    {/* connector */}
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] h-px bg-gradient-to-r from-white/15 to-transparent" />
                    )}
                    {/* step circle */}
                    <div className={`relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-xl`}>
                      <SIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center">
                        <span className="text-[9px] font-black text-white/60">{s.n}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{s.title}</h3>
                      <p className="text-xs text-white/40 leading-relaxed mt-1 hidden sm:block">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════════ FOOTER ════════════════ */}
        <footer className="border-t border-white/[0.06] py-8 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center">
                <span className="text-white font-black text-xs">A</span>
              </div>
              <span className="text-white/30 text-sm font-semibold">ATLAS</span>
            </div>
            <p className="text-white/20 text-xs">&copy; {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
