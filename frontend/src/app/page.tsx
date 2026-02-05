"use client";

import { Target, MessageCircle, BarChart3, Users, Shield, BookOpen, ArrowRight, Sparkles, GraduationCap, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 overflow-x-hidden">
      {/* Background Image with Parallax */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
          backgroundImage: 'url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/90 to-purple-900/95" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/30 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">A</span>
              </div>
              <div>
                <span className="text-white font-bold text-xl block">ATLAS</span>
                <span className="text-blue-300 text-xs">THRiVE Hub LaunchPad</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-6 pt-24">
          <div 
            className="max-w-6xl w-full text-center space-y-8"
            style={{
              transform: `translateY(${scrollY * 0.15}px)`,
              opacity: 1 - scrollY / 700,
            }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-400/30 mb-4">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">Empowering the Next Generation</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                ATLAS
              </span>
            </h1>
            
            <p className="text-3xl md:text-4xl text-white font-semibold max-w-4xl mx-auto leading-tight">
              Accelerating Talent for Leadership & Success
            </p>
            
            <p className="text-xl md:text-2xl text-blue-200 max-w-3xl mx-auto">
              Empowering African Youth For Global Opportunities
            </p>

            <div className="flex items-center justify-center gap-4 pt-8">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-900 bg-gradient-to-br from-blue-400 to-purple-500" />
                ))}
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">500+ Fellows</p>
                <p className="text-blue-300 text-sm">Transforming Lives</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6">
          <div 
            className="max-w-7xl mx-auto"
            style={{ transform: `translateY(${(scrollY - 300) * 0.1}px)` }}
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Why Choose ATLAS?
              </h2>
              <p className="text-xl text-blue-200">
                A comprehensive platform designed for excellence
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Gamified Learning",
                  description: "Earn points, unlock achievements, and compete on leaderboards",
                  gradient: "from-blue-500 to-cyan-500"
                },
                {
                  icon: MessageCircle,
                  title: "Social Learning",
                  description: "Engage in discussions, chat with peers, and learn together",
                  gradient: "from-purple-500 to-pink-500"
                },
                {
                  icon: BarChart3,
                  title: "Track Progress",
                  description: "Monitor your learning journey with detailed analytics",
                  gradient: "from-orange-500 to-red-500"
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-blue-200">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Role Selection Section */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Select Your Role to Sign In
              </h2>
              <p className="text-xl text-blue-200">
                Choose your portal and start your journey
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Fellow */}
              <a
                href="/login/fellow"
                className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-lg rounded-3xl p-10 border-2 border-blue-400/20 hover:border-blue-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 rounded-3xl transition-all" />
                
                <div className="relative flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2">Fellow</h3>
                    <p className="text-blue-200 text-sm mb-6">
                      Access your learning resources and track progress
                    </p>
                  </div>

                  <div className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-500/50 transition-all">
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>

              {/* Facilitator */}
              <a
                href="/login/facilitator"
                className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg rounded-3xl p-10 border-2 border-purple-400/20 hover:border-purple-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 rounded-3xl transition-all" />
                
                <div className="relative flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/50 transition-shadow">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2">Facilitator</h3>
                    <p className="text-purple-200 text-sm mb-6">
                      Manage cohorts and monitor fellow progress
                    </p>
                  </div>

                  <div className="w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-purple-500/50 transition-all">
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>

              {/* Admin */}
              <a
                href="/login/admin"
                className="group relative bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-lg rounded-3xl p-10 border-2 border-emerald-400/20 hover:border-emerald-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/10 group-hover:to-teal-500/10 rounded-3xl transition-all" />
                
                <div className="relative flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/50 transition-shadow">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2">Admin</h3>
                    <p className="text-emerald-200 text-sm mb-6">
                      Platform administration and user management
                    </p>
                  </div>

                  <div className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-emerald-500/50 transition-all">
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 px-6 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { icon: GraduationCap, value: "500+", label: "Active Fellows" },
                { icon: Users, value: "50+", label: "Facilitators" },
                { icon: Target, value: "91", label: "Resources" },
                { icon: TrendingUp, value: "95%", label: "Success Rate" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4">
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                  <p className="text-blue-200">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-white/10">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-blue-200 mb-4">
              Built with care for the next generation of African talent.
            </p>
            <p className="text-blue-300/60 text-sm">
              © 2026 ATLAS - THRiVE Hub LaunchPad Fellowship. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
