'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, X, KeyRound, Compass, Bell, ChevronRight } from 'lucide-react';

// ─── localStorage key helpers ──────────────────────────────────────────────────

export function markPasswordChanged(userId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`atlas_setup_pwd_${userId}`, '1');
  }
}

export function markNotifPrefsSet(userId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`atlas_setup_notif_${userId}`, '1');
  }
}

interface ChecklistState {
  pwdChanged: boolean;
  tourTaken: boolean;
  notifSet: boolean;
  dismissed: boolean;
}

function readState(uid: string): ChecklistState {
  if (typeof window === 'undefined') {
    return { pwdChanged: false, tourTaken: false, notifSet: false, dismissed: false };
  }
  return {
    pwdChanged: !!localStorage.getItem(`atlas_setup_pwd_${uid}`),
    // TourGuide writes atlas_tour_completed_{uid} when tour is finished
    tourTaken: !!localStorage.getItem(`atlas_tour_completed_${uid}`),
    notifSet: !!localStorage.getItem(`atlas_setup_notif_${uid}`),
    dismissed: !!localStorage.getItem(`atlas_setup_dismissed_${uid}`),
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SetupChecklist() {
  const { user } = useAuthStore();
  const { startTour } = useUIStore();
  const uid = user?.id;

  const [state, setState] = useState<ChecklistState>(() =>
    uid ? readState(uid) : { pwdChanged: false, tourTaken: false, notifSet: false, dismissed: false }
  );
  const [showSuccess, setShowSuccess] = useState(false);

  // Re-read from localStorage when the window regains focus (e.g. user opened
  // /profile in same tab, changed password, then navigated back)
  useEffect(() => {
    const refresh = () => { if (uid) setState(readState(uid)); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [uid]);

  if (!uid || state.dismissed) return null;

  const mark = (key: string) => {
    localStorage.setItem(key, '1');
    setState(readState(uid));
  };

  const dismiss = () => {
    localStorage.setItem(`atlas_setup_dismissed_${uid}`, '1');
    setState(prev => ({ ...prev, dismissed: true }));
  };

  const items = [
    {
      id: 'pwd',
      done: state.pwdChanged,
      icon: KeyRound,
      title: 'Change your password',
      description:
        'Your account was created with a temporary password. Change it to something only you know.',
      warning:
        'If you change your password and forget the new one, an admin will need to reset it for you — there is no self-service password reset. Keep it somewhere safe.',
      action: (
        <Link href="/profile">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 shrink-0 whitespace-nowrap">
            Go to Profile <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      ),
      onToggle: () => mark(`atlas_setup_pwd_${uid}`),
    },
    {
      id: 'tour',
      done: state.tourTaken,
      icon: Compass,
      title: 'Take the platform tour',
      description: 'Get a 2-minute walkthrough of all key features in ATLAS.',
      action: (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs h-7 shrink-0 whitespace-nowrap"
          onClick={() => startTour()}
        >
          Start Tour <ChevronRight className="h-3 w-3" />
        </Button>
      ),
      onToggle: () => mark(`atlas_tour_completed_${uid}`),
    },
    {
      id: 'notif',
      done: state.notifSet,
      icon: Bell,
      title: 'Review notification preferences',
      description: 'Choose how ATLAS notifies you about quizzes, resources, and updates.',
      action: (
        <Link href="/profile">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 shrink-0 whitespace-nowrap">
            Open Settings <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      ),
      onToggle: () => mark(`atlas_setup_notif_${uid}`),
    },
  ];

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  // When all items are done: flash a success banner then auto-dismiss
  useEffect(() => {
    if (allDone && !state.dismissed) {
      setShowSuccess(true);
      const t = setTimeout(() => dismiss(), 2500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  if (showSuccess) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <p className="text-sm font-semibold text-green-800">
          You're all set — your account is ready to go.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-blue-950">Getting started</span>
          <span className="text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
            {doneCount} of {items.length} done
          </span>
        </div>
        <button
          onClick={dismiss}
          className="h-6 w-6 rounded-full hover:bg-blue-100 flex items-center justify-center text-blue-400 hover:text-blue-700 transition-colors"
          title="Dismiss checklist"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-blue-100">
        <div
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-100">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 transition-opacity',
                item.done && 'opacity-50'
              )}
            >
              {/* Toggle checkbox */}
              <button
                onClick={item.onToggle}
                className="mt-0.5 shrink-0 hover:opacity-70 transition-opacity"
                title={item.done ? 'Mark as incomplete' : 'Mark as done'}
              >
                {item.done
                  ? <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  : <Circle className="h-5 w-5 text-slate-300" />
                }
              </button>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-semibold leading-snug',
                  item.done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'
                )}>
                  {item.title}
                </p>
                {!item.done && (
                  <>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                    {'warning' in item && item.warning && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1.5 leading-relaxed">
                        {item.warning}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Action */}
              {!item.done && (
                <div className="shrink-0 mt-0.5">{item.action}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
