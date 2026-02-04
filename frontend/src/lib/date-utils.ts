import { format, formatDistance, formatRelative, subDays, addDays, differenceInDays, differenceInHours, differenceInMinutes, isPast, isFuture } from 'date-fns';

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
