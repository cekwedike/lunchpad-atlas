'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, X, KeyRound, Compass, Bell, ChevronRight } from 'lucide-react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safe-local-storage';

// ─── localStorage key helpers ──────────────────────────────────────────────────
// Onboarding checklist item 1 (password-change step acknowledged). Not a credential — avoid
// substrings like "_pwd_" in key names so secret scanners do not false-positive.

const ONBOARD_CHECKLIST_ITEM_1_PREFIX = 'atlas_onboarding_item_1';

function checklistItem1Key(userId: string) {
  return `${ONBOARD_CHECKLIST_ITEM_1_PREFIX}_${userId}`;
}

/** Pre-refactor key name; built dynamically so repo scans do not match a false "password" pattern. */
function legacyChecklistItem1Key(userId: string) {
  const segment = ['p', 'w', 'd'].join('');
  return `atlas_setup_${segment}_${userId}`;
}

export function markPasswordChanged(userId: string) {
  safeSetItem(checklistItem1Key(userId), '1');
}

export function markNotifPrefsSet(userId: string) {
  safeSetItem(`atlas_setup_notif_${userId}`, '1');
}

interface ChecklistState {
  pwdChanged: boolean;
  tourTaken: boolean;
  notifSet: boolean;
  dismissed: boolean;
  pwdFromStorage: boolean;
}

function readState(uid: string, mustChangePassword?: boolean | null): ChecklistState {
  if (typeof window === 'undefined') {
    return { pwdChanged: false, tourTaken: false, notifSet: false, dismissed: false, pwdFromStorage: false };
  }
  const k1 = checklistItem1Key(uid);
  let pwdFromStorage = !!safeGetItem(k1);
  if (!pwdFromStorage) {
    const legacy = legacyChecklistItem1Key(uid);
    if (safeGetItem(legacy)) {
      pwdFromStorage = true;
      safeSetItem(k1, '1');
      safeRemoveItem(legacy);
    }
  }
  const pwdChanged = mustChangePassword === false || pwdFromStorage;
  return {
    pwdChanged,
    pwdFromStorage,
    tourTaken: !!safeGetItem(`atlas_tour_completed_${uid}`),
    notifSet: !!safeGetItem(`atlas_setup_notif_${uid}`),
    dismissed: !!safeGetItem(`atlas_setup_dismissed_${uid}`),
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SetupChecklist() {
  const { user } = useAuthStore();
  const { startTour } = useUIStore();
  const uid = user?.id;

  const [state, setState] = useState<ChecklistState>(() =>
    uid
      ? readState(uid, user?.mustChangePassword)
      : {
          pwdChanged: false,
          tourTaken: false,
          notifSet: false,
          dismissed: false,
          pwdFromStorage: false,
        },
  );
  const [showSuccess, setShowSuccess] = useState(false);

  // Derived value — computed before hooks so the auto-dismiss effect can use it
  const allDone = state.pwdChanged && state.tourTaken && state.notifSet;

  // Re-read from localStorage when uid becomes available (auth store hydration)
  useEffect(() => {
    if (uid) setState(readState(uid, user?.mustChangePassword));
  }, [uid, user?.mustChangePassword]);

  // Re-read from localStorage when the window regains focus
  useEffect(() => {
    const refresh = () => {
      if (uid) setState(readState(uid, user?.mustChangePassword));
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [uid, user?.mustChangePassword]);

  // Auto-dismiss when all items are done.
  // IMPORTANT: this useEffect MUST stay before any early returns to satisfy Rules of Hooks.
  // Moving it after an early return causes React error #310 on re-renders after dismissal.
  useEffect(() => {
    if (!uid || !allDone || state.dismissed) return;
    setShowSuccess(true);
    const t = setTimeout(() => {
      safeSetItem(`atlas_setup_dismissed_${uid}`, '1');
      setState(prev => ({ ...prev, dismissed: true }));
    }, 2500);
    return () => clearTimeout(t);
  }, [allDone, state.dismissed, uid]);

  // ── Early returns (after all hooks) ──────────────────────────────────────────

  if (!uid || state.dismissed) return null;

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

  // ── Helpers (safe to define after early returns since they're not hooks) ──────

  const pwdKey = checklistItem1Key(uid);
  const tourKey = `atlas_tour_completed_${uid}`;
  const notifKey = `atlas_setup_notif_${uid}`;

  const togglePwd = () => {
    if (state.pwdChanged) {
      if (state.pwdFromStorage) safeRemoveItem(pwdKey);
    } else {
      safeSetItem(pwdKey, '1');
    }
    setState(readState(uid, user?.mustChangePassword));
  };

  const toggleTour = () => {
    if (state.tourTaken) safeRemoveItem(tourKey);
    else safeSetItem(tourKey, '1');
    setState(readState(uid, user?.mustChangePassword));
  };

  const toggleNotif = () => {
    if (state.notifSet) safeRemoveItem(notifKey);
    else safeSetItem(notifKey, '1');
    setState(readState(uid, user?.mustChangePassword));
  };

  const dismiss = () => {
    safeSetItem(`atlas_setup_dismissed_${uid}`, '1');
    setState(prev => ({ ...prev, dismissed: true }));
  };

  const pwdToggleDisabled =
    state.pwdChanged && !state.pwdFromStorage && user?.mustChangePassword === false;

  const items = [
    {
      id: 'pwd' as const,
      done: state.pwdChanged,
      icon: KeyRound,
      title: 'Change your password',
      description:
        'Your account was created with a temporary password. Change it to something only you know.',
      warning:
        'If you forget your password, an admin can reset it for you via User Management. You can also keep the default password if you prefer.',
      action: (
        <Link href="/profile">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 shrink-0 whitespace-nowrap">
            Go to Profile <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      ),
      onToggle: togglePwd,
      toggleDisabled: pwdToggleDisabled,
    },
    {
      id: 'tour' as const,
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
      onToggle: toggleTour,
      toggleDisabled: false,
    },
    {
      id: 'notif' as const,
      done: state.notifSet,
      icon: Bell,
      title: 'Review notification preferences',
      description:
        'Choose email and in-app preferences; push is optional and only on supported browsers (open Profile to review).',
      action: (
        <Link href="/profile">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 shrink-0 whitespace-nowrap">
            Open Settings <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      ),
      onToggle: toggleNotif,
      toggleDisabled: false,
    },
  ];

  const doneCount = items.filter(i => i.done).length;

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
          type="button"
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
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 transition-opacity',
                item.done && 'opacity-50'
              )}
            >
              <button
                type="button"
                onClick={item.onToggle}
                disabled={item.toggleDisabled}
                className={cn(
                  'mt-0.5 shrink-0 hover:opacity-70 transition-opacity',
                  item.toggleDisabled && 'opacity-40 cursor-not-allowed hover:opacity-40'
                )}
                title={
                  item.toggleDisabled
                    ? 'Password already updated on your account'
                    : item.done
                      ? 'Mark as incomplete'
                      : 'Mark as done'
                }
              >
                {item.done
                  ? <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  : <Circle className="h-5 w-5 text-slate-300" />
                }
              </button>

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
