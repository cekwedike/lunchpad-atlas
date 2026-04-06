/**
 * Detect PWA / mobile browser context for tailored UX (iOS vs Android, installed vs tab).
 */

/** True for iPhone, iPod, iPad, or iPadOS reporting as Mac with touch. */
export function isLikelyIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ may report as Macintosh with touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * True when the app runs as an installed PWA (home screen), not a normal browser tab.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    /* ignore */
  }
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Short guidance shown on iOS when not yet installed as a home-screen app. */
export const IOS_ADD_TO_HOME_SHORT =
  'Tap Share, then “Add to Home Screen” for a full-screen app and more reliable alerts.';

/** Longer note for settings / banners (mentions push requirements on newer iOS). */
export const IOS_PWA_PROFILE_NOTE =
  'On iPhone and iPad, add ATLAS to your Home Screen (Share → Add to Home Screen) for the best experience. Push alerts from the browser tab are limited; on iOS 16.4 or later, after installing to the Home Screen you can turn on push in Profile.';

/** In-browser vibration is often missing on iOS Safari even when the Vibration API exists elsewhere. */
export const IOS_VIBRATION_IN_BROWSER_NOTE =
  'Vibration may be unavailable in Safari; add ATLAS to the Home Screen for push alerts.';
