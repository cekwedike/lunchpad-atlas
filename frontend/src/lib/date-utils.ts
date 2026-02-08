import { format, formatDistance, formatRelative, formatDistanceToNowStrict, subDays, addDays, differenceInDays, differenceInHours, differenceInMinutes, isPast, isFuture } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const WAT_TIMEZONE = 'Africa/Lagos';

/**
 * Format date to WAT timezone with timestamp
 * @param date - Date to format
 * @param formatStr - Format string (default shows like: 'Feb 7, 2026 3:45 PM WAT')
 */
export function formatToWAT(date: Date | string, formatStr: string = 'MMM d, yyyy h:mm a'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    const watDate = toZonedTime(dateObj, WAT_TIMEZONE);
    return format(watDate, formatStr) + ' WAT';
  } catch (error) {
    // Fallback if timezone conversion fails
    return format(dateObj, formatStr) + ' WAT';
  }
}

/**
 * Format relative time in WAT (e.g., "2 hours ago")
 */
export function formatRelativeTimeWAT(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    const watDate = toZonedTime(dateObj, WAT_TIMEZONE);
    return formatDistance(watDate, new Date(), { addSuffix: true });
  } catch (error) {
    // Fallback
    return formatDistance(dateObj, new Date(), { addSuffix: true });
  }
}

/**
 * Format relative time with exact WAT timestamp (e.g., "2 minutes ago • Feb 7, 2026 3:45 PM WAT")
 */
export function formatRelativeTimeWATDetailed(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    const watDate = toZonedTime(dateObj, WAT_TIMEZONE);
    const relative = formatDistanceToNowStrict(watDate, { addSuffix: true });
    return `${relative} • ${formatToWAT(watDate)}`;
  } catch (error) {
    const relative = formatDistanceToNowStrict(dateObj, { addSuffix: true });
    return `${relative} • ${formatToWAT(dateObj)}`;
  }
}

/**
 * Format a timestamp in the viewer's local timezone (no relative prefix)
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
    }).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleString();
  }
}

/**
 * Format date to relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Format date to a readable string
 */
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date to relative format (e.g., "today at 3:00 PM", "yesterday at 5:00 PM")
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatRelative(dateObj, new Date());
}

/**
 * Calculate unlock date (8 days before session date)
 */
export function calculateUnlockDate(sessionDate: Date | string): Date {
  const dateObj = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate;
  return subDays(dateObj, 8);
}

/**
 * Check if a resource is unlocked based on session date
 */
export function isResourceUnlocked(sessionDate: Date | string): boolean {
  const unlockDate = calculateUnlockDate(sessionDate);
  return isPast(unlockDate);
}

/**
 * Get days until a session
 */
export function getDaysUntilSession(sessionDate: Date | string): number {
  const dateObj = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate;
  const days = differenceInDays(dateObj, new Date());
  return days > 0 ? days : 0;
}

/**
 * Get hours until a date
 */
export function getHoursUntil(date: Date | string): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const hours = differenceInHours(dateObj, new Date());
  return hours > 0 ? hours : 0;
}

/**
 * Get minutes until a date
 */
export function getMinutesUntil(date: Date | string): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const minutes = differenceInMinutes(dateObj, new Date());
  return minutes > 0 ? minutes : 0;
}

/**
 * Check if date is in the past
 */
export function isDatePast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isPast(dateObj);
}

/**
 * Check if date is in the future
 */
export function isDateFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isFuture(dateObj);
}

/**
 * Get role badge color classes for Tailwind
 */
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

/**
 * Get role display name
 */
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

/**
 * Format countdown display (e.g., "2d 5h 30m")
 */
export function formatCountdown(targetDate: Date | string): string {
  const dateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  
  if (isPast(dateObj)) {
    return 'Expired';
  }
  
  const days = differenceInDays(dateObj, now);
  const hours = differenceInHours(dateObj, now) % 24;
  const minutes = differenceInMinutes(dateObj, now) % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Get days until resource unlock
 */
export function getDaysUntilUnlock(sessionDate: Date | string): number {
  const unlockDate = calculateUnlockDate(sessionDate);
  return getDaysUntilSession(unlockDate);
}
