"use client";

import { Target, MessageCircle, BarChart3, Users, Shield, BookOpen, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [selectedRole, setSelectedRole] = useState<'fellow' | 'facilitator' | 'admin'>('fellow');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.role-selector')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const roles = [
    {
      id: 'fellow' as const,
      name: 'Fellow',
      icon: BookOpen,
      description: 'Access learning resources and track your progress',
      color: 'blue',
    },
    {
      id: 'facilitator' as const,
      name: 'Facilitator',
      icon: Users,
      description: 'Manage cohorts and guide fellow development',
      color: 'cyan',
    },
    {
      id: 'admin' as const,
      name: 'Admin',
      icon: Shield,
      description: 'Platform administration and oversight',
      color: 'emerald',
    },
  ];

  const currentRole = roles.find(r => r.id === selectedRole)!;
  const CurrentIcon = currentRole.icon;

  const handleSignIn = () => {
    router.push(`/login/${selectedRole}`);
  };

  return (
    <div className="min-h-screen bg-slate-950" suppressHydrationWarning>
      {/* Background - Fixed */}
      <div className="fixed inset-0 z-0" suppressHydrationWarning>
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            filter: 'brightness(0.4)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" suppressHydrationWarning />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <div className="text-white font-semibold text-lg tracking-tight">ATLAS</div>
                <div className="text-slate-400 text-xs tracking-wide">THRiVE Hub LaunchPad</div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section with Login */}
        <section className="min-h-screen flex items-center justify-center px-8 pt-32 pb-20">
          <div className="max-w-2xl w-full space-y-16 overflow-visible">
            <div className="space-y-6 text-center">
              <h1 
                className="text-7xl md:text-9xl font-black tracking-tighter"
                style={{
                  transform: `translateY(${scrollY * -0.1}px)`,
                }}
              >
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  ATLAS
                </span>
              </h1>
            </div>

            {/* Sign In Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Sign In</h2>
                <p className="text-slate-400 text-sm">Select your role to continue</p>
              </div>

              {/* Role Selector */}
              <div className="relative role-selector">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      currentRole.color === 'blue' ? 'from-blue-400 to-blue-600' :
                      currentRole.color === 'cyan' ? 'from-cyan-400 to-cyan-600' :
                      'from-emerald-400 to-emerald-600'
                    } flex items-center justify-center`}>
                      <CurrentIcon className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-semibold">{currentRole.name}</div>
                      <div className="text-slate-400 text-sm">{currentRole.description}</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50">
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
                            selectedRole === role.id ? 'bg-white/5' : ''
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                            role.color === 'blue' ? 'from-blue-400 to-blue-600' :
                            role.color === 'cyan' ? 'from-cyan-400 to-cyan-600' :
                            'from-emerald-400 to-emerald-600'
                          } flex items-center justify-center flex-shrink-0`}>
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

              {/* Sign In Button */}
              <button
                onClick={handleSignIn}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all bg-gradient-to-r ${
                  currentRole.color === 'blue' ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' :
                  currentRole.color === 'cyan' ? 'from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700' :
                  'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                }`}
              >
                Continue as {currentRole.name}
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-32 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Gamified Learning",
                  description: "Track progress through interactive challenges and milestones",
                },
                {
                  icon: MessageCircle,
                  title: "Collaborative",
                  description: "Connect with peers and mentors in real-time discussions",
                },
                {
                  icon: BarChart3,
                  title: "Data-Driven",
                  description: "Comprehensive analytics for continuous improvement",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500"
                >
                  <feature.icon className="w-12 h-12 text-blue-400 mb-6" strokeWidth={1.5} />
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto text-center space-y-4">
            <p className="text-slate-500 text-sm">
              © 2026 ATLAS - THRiVE Hub LaunchPad Fellowship
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
