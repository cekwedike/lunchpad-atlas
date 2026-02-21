import {
  format,
  formatDistance,
  formatRelative,
  formatDistanceToNowStrict,
  subDays,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isPast,
  isFuture,
} from 'date-fns';

// ─── Timezone helpers ─────────────────────────────────────────────────────────

/**
 * Returns the viewer's IANA timezone string detected from the browser.
 * Falls back to 'UTC' in environments where Intl is unavailable (e.g. old SSR).
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Returns the short timezone abbreviation for the viewer's current timezone
 * (e.g. "WAT", "EST", "GMT+5:30").
 * Pass a specific `date` when DST matters (summer vs winter offset).
 */
export function getTimezoneAbbr(date?: Date | string): string {
  try {
    const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: 'short',
    }).formatToParts(d);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

// ─── Primary formatting functions ────────────────────────────────────────────

/**
 * Formats a timestamp in the viewer's local timezone, including a short
 * timezone label so the user always knows which timezone is being shown.
 *
 * Example outputs (same UTC instant, different viewers):
 *   "Feb 7, 2026, 3:45 PM WAT"   (Lagos)
 *   "Feb 7, 2026, 10:45 AM EST"  (New York)
 *   "Feb 8, 2026, 12:45 AM SGT"  (Singapore)
 */
export function formatLocalTimestamp(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(dateObj);
  } catch {
    return dateObj.toLocaleString();
  }
}

/**
 * Formats a timestamp with a custom date-fns format string, appending the
 * viewer's timezone abbreviation.
 * (Replaces the former `formatToWAT` which was hardcoded to Africa/Lagos.)
 *
 * Example: formatTimestamp(date, 'MMM d, yyyy h:mm a') → "Feb 7, 2026 3:45 PM WAT"
 */
export function formatTimestamp(
  date: Date | string,
  formatStr: string = 'MMM d, yyyy h:mm a',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    const tzAbbr = getTimezoneAbbr(dateObj);
    return format(dateObj, formatStr) + (tzAbbr ? ` ${tzAbbr}` : '');
  } catch {
    return format(dateObj, formatStr);
  }
}

/**
 * @deprecated Use `formatTimestamp` instead.
 * Kept for backward compatibility — now uses the viewer's local timezone
 * instead of the previously hardcoded WAT (Africa/Lagos).
 */
export function formatToWAT(date: Date | string, formatStr: string = 'MMM d, yyyy h:mm a'): string {
  return formatTimestamp(date, formatStr);
}

// ─── Relative time functions ──────────────────────────────────────────────────

/**
 * Returns a human-readable relative time string ("2 hours ago", "in 3 days").
 * Relative time is timezone-agnostic — it always computes from the real UTC now.
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * @deprecated Use `formatRelativeTime` instead.
 * Previously converted to WAT before computing distance (which was a bug —
 * `toZonedTime` shifts the internal UTC value, making relative times off by
 * the UTC offset). Now correctly computes relative time from the raw UTC
 * timestamp and shows the label in the viewer's local timezone.
 */
export function formatRelativeTimeWAT(date: Date | string): string {
  return formatRelativeTime(date);
}

/**
 * Returns "X ago • Feb 7, 2026, 3:45 PM WAT" — combined relative + absolute
 * timestamp in the viewer's local timezone.
 * (Replaces `formatRelativeTimeWATDetailed`.)
 */
export function formatRelativeTimestampDetailed(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const relative = formatDistanceToNowStrict(dateObj, { addSuffix: true });
  const absolute = formatLocalTimestamp(dateObj);
  return `${relative} • ${absolute}`;
}

/**
 * @deprecated Use `formatRelativeTimestampDetailed` instead.
 */
export function formatRelativeTimeWATDetailed(date: Date | string): string {
  return formatRelativeTimestampDetailed(date);
}

// ─── Generic date formatting ──────────────────────────────────────────────────

/**
 * Format a date to a readable string using a date-fns format string.
 * Uses the viewer's local timezone (via the browser's Date object).
 */
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date to relative format (e.g., "today at 3:00 PM", "yesterday at 5:00 PM").
 * Uses the viewer's local timezone.
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatRelative(dateObj, new Date());
}

// ─── Resource / session logic ─────────────────────────────────────────────────

/** Calculate the unlock date: 8 days before the session date. */
export function calculateUnlockDate(sessionDate: Date | string): Date {
  const dateObj = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate;
  return subDays(dateObj, 8);
}

/** Returns true if the resource has passed its unlock date. */
export function isResourceUnlocked(sessionDate: Date | string): boolean {
  return isPast(calculateUnlockDate(sessionDate));
}

/** Days remaining until the session (0 if already past). */
export function getDaysUntilSession(sessionDate: Date | string): number {
  const dateObj = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate;
  const days = differenceInDays(dateObj, new Date());
  return days > 0 ? days : 0;
}

/** Hours remaining until a date (0 if already past). */
export function getHoursUntil(date: Date | string): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return Math.max(0, differenceInHours(dateObj, new Date()));
}

/** Minutes remaining until a date (0 if already past). */
export function getMinutesUntil(date: Date | string): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return Math.max(0, differenceInMinutes(dateObj, new Date()));
}

/** Days remaining until the resource unlock date (0 if already unlocked). */
export function getDaysUntilUnlock(sessionDate: Date | string): number {
  return getDaysUntilSession(calculateUnlockDate(sessionDate));
}

// ─── Boolean date predicates ──────────────────────────────────────────────────

export function isDatePast(date: Date | string): boolean {
  return isPast(typeof date === 'string' ? new Date(date) : date);
}

export function isDateFuture(date: Date | string): boolean {
  return isFuture(typeof date === 'string' ? new Date(date) : date);
}

// ─── Countdown ────────────────────────────────────────────────────────────────

/**
 * Returns a compact countdown string: "2d 5h", "3h 20m", "45m", or "Expired".
 */
export function formatCountdown(targetDate: Date | string): string {
  const dateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  if (isPast(dateObj)) return 'Expired';

  const now = new Date();
  const days = differenceInDays(dateObj, now);
  const hours = differenceInHours(dateObj, now) % 24;
  const minutes = differenceInMinutes(dateObj, now) % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ─── Role display helpers ─────────────────────────────────────────────────────

export function getRoleBadgeColor(role: string): string {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'FACILITATOR':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'FELLOW':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getRoleDisplayName(role: string): string {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return 'Admin';
    case 'FACILITATOR':
      return 'Facilitator';
    case 'FELLOW':
      return 'Fellow';
    default:
      return role || 'User';
  }
}
