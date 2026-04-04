"use client";

import {
  Target, MessageCircle, BarChart3, Users, Shield, BookOpen, UserCircle,
  ChevronDown, Trophy, Zap, Brain, Gamepad2, Bell, CalendarDays,
  FileText, Video, Award, TrendingUp, Star, CheckCircle2, Flame, Layout, Lock,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [role, setRole] = useState<
    "fellow" | "facilitator" | "guest-facilitator" | "admin"
  >("fellow");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".role-selector")) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const roles = [
    { id: "fellow" as const, label: "Fellow", icon: BookOpen, grad: "from-blue-500 to-indigo-600" },
    { id: "facilitator" as const, label: "Facilitator", icon: Users, grad: "from-cyan-500 to-teal-600" },
    { id: "guest-facilitator" as const, label: "Guest Facilitator", icon: UserCircle, grad: "from-emerald-500 to-teal-700" },
    { id: "admin" as const, label: "Admin", icon: Shield, grad: "from-violet-500 to-purple-600" },
  ];
  const cur = roles.find(r => r.id === role)!;
  const CurIcon = cur.icon;

  const features = [
    { title: "Gamified Learning", icon: Gamepad2, color: "from-violet-500 to-purple-600", items: ["20+ achievements across 4 categories", "Real-time leaderboard with monthly rankings", "Daily streaks with bonus multipliers", "Points for every resource, quiz, and discussion", "Gold, Silver, Bronze medals for top performers"] },
    { title: "Structured Curriculum", icon: BookOpen, color: "from-blue-500 to-cyan-500", items: ["4-month cohort programs with scheduled sessions", "Curated articles with completion tracking", "Video resources with embedded player", "Timed resource unlocks tied to session dates", "Core and optional resource designations"] },
    { title: "Interactive Quizzes", icon: Brain, color: "from-amber-500 to-orange-500", items: ["Live quizzes with real-time participation", "Self-paced quizzes with time limits", "Session, General, and Mega quiz types", "Answer streaks with bonus point multipliers", "Live leaderboard during quiz sessions"] },
    { title: "Community & Chat", icon: MessageCircle, color: "from-emerald-500 to-teal-500", items: ["Real-time cohort chat rooms", "Discussion forums with topic threading", "Instant notifications for all activity", "Resource-linked discussion threads", "Earn points for community participation"] },
    { title: "Facilitator Tools", icon: Users, color: "from-cyan-500 to-blue-600", items: ["Fellow engagement monitoring dashboard", "Low-engagement alerts with severity flags", "Session attendance tracking", "Manual point awards and adjustments", "Resource unlock management"] },
    { title: "Admin Control Center", icon: Shield, color: "from-rose-500 to-pink-600", items: ["User management with role assignment", "Cohort creation and duplication", "Comprehensive platform analytics", "Quiz and achievement management", "Leaderboard and point system controls"] },
  ];

  return (
    <div className="bg-slate-950 text-white overflow-x-hidden">

      {/* ── Fixed background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/photo/landing-page.jpg)",
          backgroundSize: "cover", backgroundPosition: "center 40%",
          filter: "brightness(0.45) saturate(1.1) blur(3px)",
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-slate-950" />
      </div>

      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-5 sm:px-10 justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-xl">
        <span className="font-black text-xl tracking-tight">ATLAS</span>
        <button
          onClick={() => featuresRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="hidden sm:block text-xs font-medium text-white/50 hover:text-white transition-colors uppercase tracking-widest"
        >
          Features
        </button>
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 pt-14 pb-10 text-center">

        {/* eyebrow pill */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70 mb-8">
          <Zap className="w-3 h-3 text-cyan-400" />
          Gamified Learning Platform
        </div>

        {/* headline */}
        <h1 className="font-black tracking-[-0.04em] leading-none mb-4"
          style={{ fontSize: "clamp(4rem, 18vw, 11rem)" }}>
          <span style={{ backgroundImage: "linear-gradient(160deg, #ffffff 0%, #93c5fd 40%, #22d3ee 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ATLAS
          </span>
        </h1>

        {/* tagline */}
        <p className="text-base sm:text-lg text-white/60 max-w-md mb-2 leading-relaxed">
          Accelerating Talent for Leadership &amp; Success
        </p>
        <p className="text-sm text-cyan-400/80 font-medium mb-10">
          THRiVE Hub LaunchPad Fellowship
        </p>

        {/* ── sign-in card ── */}
        <div className="w-full max-w-xs sm:max-w-sm">
          <div className="relative">
            <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${cur.grad} opacity-40 blur-sm`} />
            <div className="relative rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-5 space-y-4">

              {/* role picker */}
              <div className="relative role-selector">
                <button
                  onClick={() => setOpen(!open)}
                  className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3.5 py-3 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cur.grad} flex items-center justify-center shrink-0`}>
                    <CurIcon className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <span className="flex-1 text-left text-sm font-semibold text-white">{cur.label}</span>
                  <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="absolute inset-x-0 top-full mt-1.5 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl overflow-hidden z-50 shadow-2xl">
                    {roles.map(r => {
                      const Ic = r.icon;
                      return (
                        <button key={r.id}
                          onClick={() => { setRole(r.id); setOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 hover:bg-white/8 transition-colors text-left ${role === r.id ? "bg-white/5" : ""}`}
                        >
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${r.grad} flex items-center justify-center shrink-0`}>
                            <Ic className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                          </div>
                          <span className="text-sm font-medium text-white">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push(`/login/${role}`)}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${cur.grad} hover:opacity-90 active:scale-[0.98] transition-all shadow-lg`}
              >
                Sign In as {cur.label}
              </button>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-center">
          {[["20+", "Achievements"], ["3", "Quiz Types"], ["4", "Categories"], ["Live", "Leaderboard"]].map(([v, l]) => (
            <div key={l}>
              <div className="text-2xl font-black text-white">{v}</div>
              <div className="text-[11px] text-white/35 uppercase tracking-wide mt-0.5">{l}</div>
            </div>
          ))}
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/20 animate-bounce">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section ref={featuresRef} className="relative z-10 py-20 sm:py-28 px-5 sm:px-10 bg-slate-950">
        <div className="max-w-6xl mx-auto">

          {/* heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-purple-400 mb-4">
                <Target className="w-3 h-3" /> Platform Features
              </div>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                Everything you need<br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">to succeed</span>
              </h2>
            </div>
            <p className="text-sm text-white/40 max-w-xs sm:text-right leading-relaxed">
              A complete learning ecosystem — gamification, real-time collaboration, and powerful tools.
            </p>
          </div>

          {/* grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((f, i) => {
              const FIcon = f.icon;
              return (
                <div key={i} className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 overflow-hidden p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg shrink-0`}>
                      <FIcon className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-sm font-bold text-white">{f.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {f.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-white/50 leading-snug">
                        <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section className="relative z-10 py-20 sm:py-28 px-5 sm:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              How it{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">works</span>
            </h2>
            <p className="text-sm text-white/40">Your journey from onboarding to mastery</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
            {[
              { n: "01", title: "Join a Cohort", desc: "Structured 4-month curriculum", icon: Users, grad: "from-blue-500 to-indigo-600" },
              { n: "02", title: "Learn & Earn", desc: "Complete resources, earn points", icon: BookOpen, grad: "from-cyan-500 to-blue-600" },
              { n: "03", title: "Engage", desc: "Chats, forums, and live quizzes", icon: MessageCircle, grad: "from-teal-500 to-cyan-600" },
              { n: "04", title: "Rise to the Top", desc: "Climb the leaderboard, become GOAT", icon: Trophy, grad: "from-amber-500 to-orange-600" },
            ].map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center gap-3 relative">
                  {i < 3 && <div className="hidden md:block absolute top-7 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] h-px border-t border-dashed border-white/10" />}
                  <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-xl z-10`}>
                    <SIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center text-[9px] font-black text-white/50">{s.n}</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">{s.title}</h3>
                  <p className="text-[11px] text-white/35 leading-relaxed hidden sm:block">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-5 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-sm font-black text-white/20">ATLAS</span>
        <p className="text-xs text-white/15">&copy; {new Date().getFullYear()} All rights reserved.</p>
      </footer>

    </div>
  );
}
