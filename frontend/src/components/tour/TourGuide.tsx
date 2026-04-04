'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeGetItem, safeSetItem } from '@/lib/safe-local-storage';
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
  Compass,
  CheckCircle,
  User,
  Bell,
  QrCode,
  Sparkles,
} from 'lucide-react';

// ─── Tour step definitions ────────────────────────────────────────────────────

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  cta?: string;
  bg: string;
}

const FELLOW_STEPS: TourStep[] = [
  {
    title: 'Welcome to ATLAS',
    description:
      'ATLAS is your home for the LaunchPad Fellowship. Everything you need — learning resources, quizzes, discussions, and your progress — lives here. Let us take you on a quick tour.',
    icon: Compass,
    bg: 'from-blue-950 via-blue-900 to-indigo-700',
  },
  {
    title: 'Dashboard',
    description:
      'Your daily hub. See your current points, streak, recent activity, upcoming sessions, and announcements from your facilitator all in one place.',
    icon: LayoutDashboard,
    href: '/dashboard/fellow',
    cta: 'Go to Dashboard',
    bg: 'from-indigo-700 to-blue-700',
  },
  {
    title: 'My Cohort',
    description:
      'View your fellow cohort members, see their progress, and stay connected. Your cohort is your community — learn together and grow together.',
    icon: Users,
    href: '/dashboard/fellow/cohorts',
    cta: 'View My Cohort',
    bg: 'from-blue-700 to-cyan-700',
  },
  {
    title: 'Resources',
    description:
      'All your learning materials organised by session. Watch videos, read articles, and complete exercises to earn points and unlock achievements.',
    icon: BookOpen,
    href: '/resources',
    cta: 'Browse Resources',
    bg: 'from-cyan-700 to-blue-700',
  },
  {
    title: 'Quizzes',
    description:
      'Test your knowledge with standard and live quizzes. Every completed quiz earns you points toward the leaderboard. Live quizzes run in real time — do not miss them.',
    icon: FileQuestion,
    href: '/quiz',
    cta: 'View Quizzes',
    bg: 'from-violet-700 to-indigo-700',
  },
  {
    title: 'Discussions',
    description:
      'Share ideas, ask questions, and engage with your fellow fellows. Active participation earns discussion points and builds the community.',
    icon: MessageSquare,
    href: '/dashboard/discussions',
    cta: 'Join Discussions',
    bg: 'from-emerald-700 to-teal-700',
  },
  {
    title: 'Leaderboard',
    description:
      'See how you rank among your cohort. Points from quizzes, resources, and discussions all count. Climb the board and earn leaderboard achievements.',
    icon: Trophy,
    href: '/leaderboard',
    cta: 'See Rankings',
    bg: 'from-amber-600 to-orange-600',
  },
  {
    title: 'Achievements',
    description:
      'ATLAS rewards milestones. Complete resources, maintain streaks, top the leaderboard — each unlocks a unique achievement badge visible on your profile.',
    icon: Award,
    href: '/achievements',
    cta: 'View Achievements',
    bg: 'from-rose-600 to-pink-600',
  },
  {
    title: 'Chat',
    description:
      'Message your facilitator or cohort members directly. Direct messages are private. Group channels are shared with your cohort.',
    icon: MessageCircle,
    href: '/dashboard/chat',
    cta: 'Open Chat',
    bg: 'from-teal-700 to-cyan-700',
  },
  {
    title: 'Notifications',
    description:
      'Stay on top of everything — quiz releases, new resources, leaderboard changes, and messages from your facilitator all arrive as notifications. View your full notification history here.',
    icon: Bell,
    href: '/notifications',
    cta: 'View Notifications',
    bg: 'from-blue-600 to-indigo-600',
  },
  {
    title: 'Feedback',
    description:
      'Have a suggestion, found a bug, or need to raise a concern? Submit it here. The admin team reviews all feedback and will respond with notes.',
    icon: Inbox,
    href: '/dashboard/feedback',
    cta: 'Submit Feedback',
    bg: 'from-slate-700 to-slate-600',
  },
  {
    title: 'Profile & Settings',
    description:
      'Update your name, change your password, manage notification preferences, and re-take this tour anytime — all from your profile settings.',
    icon: User,
    href: '/profile',
    cta: 'Open Settings',
    bg: 'from-blue-950 to-slate-800',
  },
];

const FACILITATOR_STEPS: TourStep[] = [
  {
    title: 'Welcome to ATLAS',
    description:
      'As a facilitator, ATLAS gives you the tools to manage your cohort, track fellow progress, deliver sessions, and keep everything running smoothly.',
    icon: Compass,
    bg: 'from-blue-950 via-blue-900 to-indigo-700',
  },
  {
    title: 'Dashboard',
    description:
      'Your dashboard surfaces cohort health at a glance — fellow engagement, upcoming sessions, and attention-needed alerts so you always know where to focus.',
    icon: LayoutDashboard,
    href: '/dashboard/facilitator',
    cta: 'Go to Dashboard',
    bg: 'from-indigo-700 to-blue-700',
  },
  {
    title: 'Cohort Management',
    description:
      'View all fellows in your cohort, their points and attendance, and manage their status. You can suspend access for a fellow if needed.',
    icon: Users,
    href: '/dashboard/facilitator/cohorts',
    cta: 'Manage Cohort',
    bg: 'from-blue-700 to-cyan-700',
  },
  {
    title: 'Sessions',
    description:
      'Log attendance for each session, see who attended, and track participation rates across your cohort. Session data feeds directly into analytics.',
    icon: Calendar,
    href: '/dashboard/facilitator/sessions',
    cta: 'View Sessions',
    bg: 'from-violet-700 to-indigo-700',
  },
  {
    title: 'Session Analytics',
    description:
      'AI-powered session insights. Upload a session transcript to get an automatic summary, key takeaways, and engagement analysis — saving you hours of manual review.',
    icon: Sparkles,
    href: '/session-analytics',
    cta: 'Open Analytics',
    bg: 'from-purple-700 to-violet-700',
  },
  {
    title: 'Attendance Tracking',
    description:
      'Generate QR codes for session check-ins. Fellows scan the code on arrival, recording their attendance instantly. View attendance reports per session and cohort.',
    icon: QrCode,
    href: '/dashboard/attendance',
    cta: 'Manage Attendance',
    bg: 'from-emerald-700 to-green-700',
  },
  {
    title: 'Resource Management',
    description:
      'Upload and manage learning resources for your cohort. Add videos, articles, or exercises and assign them to sessions.',
    icon: BookOpen,
    href: '/dashboard/facilitator/resources',
    cta: 'Manage Resources',
    bg: 'from-emerald-700 to-teal-700',
  },
  {
    title: 'Quizzes',
    description:
      'Create and schedule quizzes for your cohort. You can also run live quizzes in real time during sessions for maximum engagement.',
    icon: FileQuestion,
    href: '/dashboard/facilitator/quizzes',
    cta: 'Manage Quizzes',
    bg: 'from-amber-600 to-orange-600',
  },
  {
    title: 'Discussions',
    description:
      'Participate in and moderate cohort discussions. Encourage fellows to engage and stay active in the community.',
    icon: MessageSquare,
    href: '/dashboard/discussions',
    cta: 'View Discussions',
    bg: 'from-rose-600 to-pink-600',
  },
  {
    title: 'Leaderboard',
    description:
      'Monitor cohort performance on the leaderboard. See who is excelling and identify fellows who may need extra encouragement.',
    icon: Trophy,
    href: '/leaderboard',
    cta: 'See Rankings',
    bg: 'from-amber-600 to-yellow-600',
  },
  {
    title: 'Chat',
    description:
      'Message fellows directly or use group channels to broadcast announcements to your whole cohort.',
    icon: MessageCircle,
    href: '/dashboard/chat',
    cta: 'Open Chat',
    bg: 'from-teal-700 to-cyan-700',
  },
  {
    title: 'Notifications',
    description:
      'Receive alerts for fellow activity, session reminders, and feedback responses. Your full notification history is always accessible from the notifications page.',
    icon: Bell,
    href: '/notifications',
    cta: 'View Notifications',
    bg: 'from-blue-600 to-indigo-600',
  },
  {
    title: 'Feedback',
    description:
      'Submit your own feedback or suggestions to the admin team. Your insight as a facilitator helps improve the platform for everyone.',
    icon: Inbox,
    href: '/dashboard/feedback',
    cta: 'Submit Feedback',
    bg: 'from-slate-700 to-slate-600',
  },
  {
    title: 'Profile & Settings',
    description:
      'Manage your account, change your password, set notification preferences, and re-take this tour anytime from your profile.',
    icon: User,
    href: '/profile',
    cta: 'Open Settings',
    bg: 'from-blue-950 to-slate-800',
  },
];

const ADMIN_STEPS: TourStep[] = [
  {
    title: 'Welcome to ATLAS',
    description:
      'As an admin, you have full control of the platform. Manage users, cohorts, content, and monitor platform health all from one place.',
    icon: Compass,
    bg: 'from-blue-950 via-blue-900 to-indigo-700',
  },
  {
    title: 'Admin Dashboard',
    description:
      'Platform-wide metrics at a glance — active fellows, session attendance rates, engagement health, and attention-needed flags that require your action.',
    icon: LayoutDashboard,
    href: '/dashboard/admin',
    cta: 'Go to Dashboard',
    bg: 'from-indigo-700 to-blue-700',
  },
  {
    title: 'User Management',
    description:
      'View and manage every user. Assign roles, change cohort assignments, suspend accounts, reset passwords, and monitor last activity.',
    icon: Users,
    href: '/dashboard/admin/users',
    cta: 'Manage Users',
    bg: 'from-blue-700 to-cyan-700',
  },
  {
    title: 'Cohort Management',
    description:
      'Create and configure cohorts, assign facilitators, set start/end dates, and transition cohort states as the programme progresses.',
    icon: GraduationCap,
    href: '/dashboard/admin/cohorts',
    cta: 'Manage Cohorts',
    bg: 'from-cyan-700 to-teal-700',
  },
  {
    title: 'Sessions & Attendance',
    description:
      'Track session-level attendance across all cohorts, mark sessions complete, and review attendance records for any cohort.',
    icon: Calendar,
    href: '/dashboard/admin/sessions',
    cta: 'View Sessions',
    bg: 'from-violet-700 to-indigo-700',
  },
  {
    title: 'Resource Management',
    description:
      'Add, edit, and organise all learning content. Assign resources to sessions and control availability per cohort.',
    icon: BookOpen,
    href: '/dashboard/admin/resources',
    cta: 'Manage Resources',
    bg: 'from-emerald-700 to-teal-700',
  },
  {
    title: 'Quizzes',
    description:
      'Manage all quizzes across the platform, including live quiz creation. Set point values, passing thresholds, and scheduling windows.',
    icon: FileQuestion,
    href: '/dashboard/admin/quizzes',
    cta: 'Manage Quizzes',
    bg: 'from-amber-600 to-orange-600',
  },
  {
    title: 'Analytics',
    description:
      'Deep-dive into platform engagement — quiz scores, resource completion rates, discussion activity, and cohort comparison charts.',
    icon: BarChart3,
    href: '/dashboard/admin/analytics',
    cta: 'View Analytics',
    bg: 'from-rose-600 to-pink-600',
  },
  {
    title: 'Session Analytics',
    description:
      'AI-powered session insights. Upload session transcripts to automatically generate summaries, key takeaways, and engagement analysis across any cohort.',
    icon: Sparkles,
    href: '/session-analytics',
    cta: 'Open Session Analytics',
    bg: 'from-purple-700 to-violet-700',
  },
  {
    title: 'Discussions',
    description:
      'View and moderate discussions across all cohorts. Keep conversations constructive and on-topic.',
    icon: MessageSquare,
    href: '/dashboard/discussions',
    cta: 'View Discussions',
    bg: 'from-emerald-700 to-green-700',
  },
  {
    title: 'Leaderboard',
    description:
      'View rankings across cohorts. Monitor top performers and identify cohorts with low engagement.',
    icon: Trophy,
    href: '/leaderboard',
    cta: 'See Rankings',
    bg: 'from-amber-600 to-yellow-600',
  },
  {
    title: 'Achievements',
    description:
      'Create and manage achievement definitions. Control what milestones are rewarded and what badges fellows can unlock.',
    icon: Award,
    href: '/dashboard/admin/achievements',
    cta: 'Manage Achievements',
    bg: 'from-pink-600 to-rose-600',
  },
  {
    title: 'Feedback Inbox',
    description:
      'Review all feedback submitted by fellows and facilitators. Accept, decline, or respond with notes. Submitters are notified by email.',
    icon: Inbox,
    href: '/dashboard/admin/feedback',
    cta: 'Open Inbox',
    bg: 'from-slate-700 to-slate-600',
  },
  {
    title: 'Notifications',
    description:
      'Monitor platform notifications. Admin actions such as suspensions, quiz releases, and feedback responses generate notifications that keep all users informed.',
    icon: Bell,
    href: '/notifications',
    cta: 'View Notifications',
    bg: 'from-blue-600 to-indigo-600',
  },
  {
    title: 'Profile & Settings',
    description:
      'Manage your admin account, update your password, and set notification preferences.',
    icon: User,
    href: '/profile',
    cta: 'Open Settings',
    bg: 'from-blue-950 to-slate-800',
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
  const router = useRouter();
  const { user } = useAuthStore();
  const { tourOpen, tourStep, setTourOpen, setTourStep, startTour } = useUIStore();
  const [closing, setClosing] = useState(false);

  const steps = getSteps(user?.role);
  // Clamp step in case role changed or steps array shrank
  const step = Math.min(tourStep, steps.length - 1);
  const current = steps[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  // Auto-trigger for first-time users — skip if tour is already open (e.g. after
  // a router.push CTA navigation where the component remounts but tourOpen is still true)
  useEffect(() => {
    if (!user?.id || tourOpen) return;
    const key = tourStorageKey(user.id);
    if (!safeGetItem(key)) {
      const t = setTimeout(() => startTour(), 800);
      return () => clearTimeout(t);
    }
  }, [user?.id, tourOpen, startTour]);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setTourOpen(false);
      setClosing(false);
      if (user?.id) {
        safeSetItem(tourStorageKey(user.id), '1');
      }
    }, 200);
  };

  const next = () => {
    if (isLast) {
      close();
    } else {
      setTourStep(step + 1);
    }
  };

  const prev = () => setTourStep(Math.max(0, step - 1));

  const goTo = (i: number) => setTourStep(i);

  if (!tourOpen) return null;

  return (
    <>
      {/* Backdrop — no blur so the page remains readable behind the modal */}
      <div
        className={cn(
          'fixed inset-0 z-[9999] bg-slate-950/60 transition-opacity duration-200',
          closing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={close}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
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
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center ring-2 ring-white/30">
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
            <div className="flex items-center justify-center gap-1.5 py-1 flex-wrap">
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

            {/* Restart hint on last step */}
            {isLast && (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center leading-relaxed">
                You can restart this tour anytime from the <strong className="text-slate-700">avatar menu (top right) → Start Platform Tour</strong>, or from <strong className="text-slate-700">Profile → Settings</strong>.
              </div>
            )}

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
                    onClick={() => {
                      // Client-side navigation keeps zustand in-memory state alive.
                      // tourOpen stays true; the remounted TourGuide reads it from the store.
                      router.push(current.href!);
                    }}
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
                    <><CheckCircle className="h-4 w-4" /> Done</>
                  ) : (
                    <>Next <ChevronRight className="h-4 w-4" /></>
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
