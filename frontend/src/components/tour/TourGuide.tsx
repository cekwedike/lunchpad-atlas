'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { UserRole } from '@/types/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  MessageSquare,
  Trophy,
  Award,
  MessageCircle,
  Inbox,
  Users,
  Calendar,
  BarChart3,
  GraduationCap,
  Lock,
  Compass,
  CheckCircle,
} from 'lucide-react';

// ─── Tour step definitions ────────────────────────────────────────────────────

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  cta?: string;
  color: string;
  bg: string;
}

const FELLOW_STEPS: TourStep[] = [
  {
    title: 'Welcome to ATLAS',
    description:
      'ATLAS is your home for the LaunchPad Fellowship. Everything you need — learning resources, quizzes, discussions, and your progress — lives here. Let us take you on a quick tour.',
    icon: Compass,
    color: 'text-blue-700',
    bg: 'from-blue-950 via-blue-900 to-indigo-700',
  },
  {
    title: 'Your Dashboard',
    description:
      'Your dashboard shows your current points, streak, recent activity, and any announcements from your facilitator. It is your starting point every day.',
    icon: LayoutDashboard,
    href: '/dashboard/fellow',
    cta: 'Go to Dashboard',
    color: 'text-indigo-700',
    bg: 'from-indigo-700 to-blue-700',
  },
  {
    title: 'Resources',
    description:
      'All your learning materials are organised by session here. Watch videos, read articles, and complete exercises to earn points and unlock achievements.',
    icon: BookOpen,
    href: '/resources',
    cta: 'Browse Resources',
    color: 'text-cyan-700',
    bg: 'from-cyan-700 to-blue-700',
  },
  {
    title: 'Quizzes',
    description:
      'Test your knowledge with standard and live quizzes. Every quiz you complete earns you points toward the leaderboard. Live quizzes happen in real time — do not miss them.',
    icon: FileQuestion,
    href: '/quiz',
    cta: 'View Quizzes',
    color: 'text-violet-700',
    bg: 'from-violet-700 to-indigo-700',
  },
  {
    title: 'Discussions',
    description:
      'Share ideas, ask questions, and engage with your fellow fellows. Active participation earns you discussion points and keeps the community alive.',
    icon: MessageSquare,
    href: '/dashboard/discussions',
    cta: 'Join Discussions',
    color: 'text-emerald-700',
    bg: 'from-emerald-700 to-teal-700',
  },
  {
    title: 'Leaderboard',
    description:
      'See how you rank among your cohort. Points from quizzes, resources, and discussions all count. Climb the board and earn leaderboard achievements.',
    icon: Trophy,
    href: '/leaderboard',
    cta: 'See Rankings',
    color: 'text-amber-700',
    bg: 'from-amber-600 to-orange-600',
  },
  {
    title: 'Achievements',
    description:
      'ATLAS rewards milestones. Complete resources, maintain streaks, top the leaderboard — each unlocks a unique achievement badge. Check what you have earned and what is next.',
    icon: Award,
    href: '/achievements',
    cta: 'View Achievements',
    color: 'text-rose-700',
    bg: 'from-rose-600 to-pink-600',
  },
  {
    title: 'Chat',
    description:
      'Message your facilitator or cohort members directly. Direct messages are private; group channels are visible to your cohort.',
    icon: MessageCircle,
    href: '/dashboard/chat',
    cta: 'Open Chat',
    color: 'text-teal-700',
    bg: 'from-teal-700 to-cyan-700',
  },
  {
    title: 'Feedback',
    description:
      'Have a suggestion, found a bug, or need to raise a concern? Submit feedback here and the admin team will review and respond to it.',
    icon: Inbox,
    href: '/dashboard/feedback',
    cta: 'Submit Feedback',
    color: 'text-slate-700',
    bg: 'from-slate-700 to-slate-600',
  },
];

const FACILITATOR_STEPS: TourStep[] = [
  {
    title: 'Welcome to ATLAS',
    description:
      'As a facilitator, ATLAS gives you the tools to manage your cohort, track fellow progress, deliver sessions, and keep everything running smoothly.',
    icon: Compass,
    color: 'text-cyan-700',
    bg: 'from-blue-950 via-blue-900 to-indigo-700',
  },
  {
    title: 'Your Dashboard',
    description:
      'Your dashboard surfaces cohort health at a glance — fellow engagement, upcoming sessions, and any attention-needed alerts so you always know where to focus.',
    icon: LayoutDashboard,
    href: '/dashboard/facilitator',
    cta: 'Go to Dashboard',
    color: 'text-indigo-700',
    bg: 'from-indigo-700 to-blue-700',
  },
  {
    title: 'Cohort Management',
    description:
      'View all fellows in your cohort, their points and attendance, and manage their status. You can suspend a fellow\'s access if needed.',
    icon: Users,
    href: '/dashboard/facilitator/cohorts',
    cta: 'Manage Cohort',
    color: 'text-blue-700',
    bg: 'from-blue-700 to-cyan-700',
  },
  {
    title: 'Sessions',
    description:
      'Log attendance for each session, see who attended, and track participation rates across your cohort. Session data feeds directly into the analytics.',
    icon: Calendar,
    href: '/dashboard/facilitator/sessions',
    cta: 'View Sessions',
    color: 'text-violet-700',
    bg: 'from-violet-700 to-indigo-700',
  },
  {
    title: 'Resource Management',
    description:
      'Upload and manage learning resources for your cohort. Add videos, articles, or exercises and assign them to sessions.',
    icon: BookOpen,
    href: '/dashboard/facilitator/resources',
    cta: 'Manage Resources',
    color: 'text-emerald-700',
    bg: 'from-emerald-700 to-teal-700',
  },
  {
    title: 'Quizzes',
    description:
      'Create and schedule quizzes for your cohort. You can also run live quizzes in real time during sessions for maximum engagement.',
    icon: FileQuestion,
    href: '/dashboard/facilitator/quizzes',
    cta: 'Manage Quizzes',
    color: 'text-amber-700',
    bg: 'from-amber-600 to-orange-600',
  },
  {
    title: 'Discussions',
    description:
      'Participate in and moderate cohort discussions. Encourage fellows to engage and respond to questions to keep the community active.',
    icon: MessageSquare,
    href: '/dashboard/discussions',
    cta: 'View Discussions',
    color: 'text-rose-700',
    bg: 'from-rose-600 to-pink-600',
  },
  {
    title: 'Feedback',
    description:
      'Submit your own feedback or suggestions to the admin team. Your insight as a facilitator helps improve the platform for everyone.',
    icon: Inbox,
    href: '/dashboard/feedback',
    cta: 'Submit Feedback',
    color: 'text-slate-700',
    bg: 'from-slate-700 to-slate-600',
  },
];

const ADMIN_STEPS: TourStep[] = [
  {
    title: 'Welcome to ATLAS',
    description:
      'As an admin, you have full control of the platform. Manage users, cohorts, content, and monitor platform health from one place.',
    icon: Compass,
    color: 'text-emerald-700',
    bg: 'from-blue-950 via-blue-900 to-indigo-700',
  },
  {
    title: 'Admin Dashboard',
    description:
      'Your dashboard shows platform-wide metrics — active fellows, session attendance rates, and any attention-needed flags that need your action.',
    icon: LayoutDashboard,
    href: '/dashboard/admin',
    cta: 'Go to Dashboard',
    color: 'text-indigo-700',
    bg: 'from-indigo-700 to-blue-700',
  },
  {
    title: 'User Management',
    description:
      'View and manage every user on the platform. Assign roles, change cohort assignments, suspend accounts, and monitor last activity.',
    icon: Users,
    href: '/dashboard/admin/users',
    cta: 'Manage Users',
    color: 'text-blue-700',
    bg: 'from-blue-700 to-cyan-700',
  },
  {
    title: 'Cohort Management',
    description:
      'Create and configure cohorts, assign facilitators, set start/end dates, and transition cohort states as the programme progresses.',
    icon: GraduationCap,
    href: '/dashboard/admin/cohorts',
    cta: 'Manage Cohorts',
    color: 'text-cyan-700',
    bg: 'from-cyan-700 to-teal-700',
  },
  {
    title: 'Sessions & Attendance',
    description:
      'Track session-level attendance across all cohorts, mark sessions complete, and generate attendance reports for accountability.',
    icon: Calendar,
    href: '/dashboard/admin/sessions',
    cta: 'View Sessions',
    color: 'text-violet-700',
    bg: 'from-violet-700 to-indigo-700',
  },
  {
    title: 'Resource Management',
    description:
      'Add, edit, and organise all learning content on the platform. Assign resources to sessions and control access per cohort.',
    icon: BookOpen,
    href: '/dashboard/admin/resources',
    cta: 'Manage Resources',
    color: 'text-emerald-700',
    bg: 'from-emerald-700 to-teal-700',
  },
  {
    title: 'Quizzes',
    description:
      'Manage all quizzes across the platform, including live quiz creation. Set point values, passing thresholds, and scheduling.',
    icon: FileQuestion,
    href: '/dashboard/admin/quizzes',
    cta: 'Manage Quizzes',
    color: 'text-amber-700',
    bg: 'from-amber-600 to-orange-600',
  },
  {
    title: 'Analytics',
    description:
      'Deep-dive into platform engagement — quiz scores, resource completion rates, discussion activity, and cohort comparison charts.',
    icon: BarChart3,
    href: '/dashboard/admin/analytics',
    cta: 'View Analytics',
    color: 'text-rose-700',
    bg: 'from-rose-600 to-pink-600',
  },
  {
    title: 'Feedback Inbox',
    description:
      'Review all feedback submitted by fellows and facilitators. Accept, decline, or respond with notes. Submitters are notified by email.',
    icon: Inbox,
    href: '/dashboard/admin/feedback',
    cta: 'Open Inbox',
    color: 'text-slate-700',
    bg: 'from-slate-700 to-slate-600',
  },
];

function getSteps(role?: string): TourStep[] {
  if (role === UserRole.ADMIN) return ADMIN_STEPS;
  if (role === UserRole.FACILITATOR) return FACILITATOR_STEPS;
  return FELLOW_STEPS;
}

function tourStorageKey(userId: string) {
  return `atlas_tour_completed_${userId}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TourGuide() {
  const { user } = useAuthStore();
  const { tourOpen, setTourOpen } = useUIStore();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  const steps = getSteps(user?.role);
  const current = steps[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  // Auto-trigger for first-time users
  useEffect(() => {
    if (!user?.id) return;
    const key = tourStorageKey(user.id);
    if (!localStorage.getItem(key)) {
      // Slight delay so layout is fully mounted
      const t = setTimeout(() => setTourOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [user?.id, setTourOpen]);

  // Reset step when opened
  useEffect(() => {
    if (tourOpen) {
      setStep(0);
      setClosing(false);
    }
  }, [tourOpen]);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setTourOpen(false);
      setClosing(false);
      if (user?.id) {
        localStorage.setItem(tourStorageKey(user.id), '1');
      }
    }, 200);
  };

  const next = () => {
    if (isLast) {
      close();
    } else {
      setStep((s) => s + 1);
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const goTo = (i: number) => setStep(i);

  const handleCta = () => {
    if (current.href) {
      router.push(current.href);
    }
    next();
  };

  if (!tourOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200',
          closing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={close}
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none',
        )}
      >
        <div
          className={cn(
            'pointer-events-auto w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 transition-all duration-200 overflow-hidden',
            closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          )}
        >
          {/* Gradient top banner */}
          <div className={`relative h-32 bg-gradient-to-br ${current.bg} flex items-center justify-center`}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                <Icon className="h-7 w-7 text-white" />
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Step counter */}
            <span className="absolute top-3 left-4 text-xs font-semibold text-white/80 bg-white/20 rounded-full px-2.5 py-0.5">
              {step + 1} / {steps.length}
            </span>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{current.title}</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{current.description}</p>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-200',
                    i === step
                      ? 'w-6 bg-blue-600'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={prev}
                disabled={isFirst}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>

              <div className="flex-1 flex justify-end gap-2">
                {current.href && current.cta && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(current.href!)}
                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    {current.cta}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={next}
                  className="bg-blue-950 hover:bg-blue-900 text-white gap-1"
                >
                  {isLast ? (
                    <>
                      <CheckCircle className="h-4 w-4" /> Done
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Skip link */}
            {!isLast && (
              <div className="text-center">
                <button
                  onClick={close}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  Skip tour
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
