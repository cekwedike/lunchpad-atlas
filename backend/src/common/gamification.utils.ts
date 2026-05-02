/**
 * gamification.utils.ts
 *
 * Shared utility functions for cohort-duration-aware gamification.
 *
 * Monthly earning cap: 20,000 points per fellow per calendar month for all cohorts.
 *
 * Total-target scaling by cohort length (used for LEADERBOARD achievement thresholds only):
 *   Point Starter      ≈   400 pts  (first session)
 *   Point Collector    ≈ 2,500 pts  (early month 1)
 *   Point Accumulator  ≈ 6,000 pts  (mid month 1)
 *   Point Hoarder      ≈12,000 pts  (end of month 1 for dedicated fellows)
 *   Point Enthusiast   ≈20,000 pts  (month 2)
 *   Point Expert       ≈32,000 pts  (month 2–3)
 *   Point Legend       ≈44,000 pts  (month 3)
 *   Point Elite        ≈58,000 pts  (month 3–4)
 *   Living Legend      ≈68,000 pts  (month 4, dedicated fellows only)
 *   The GOAT           ≈76,000 pts  (near-perfect performance all 4 months)
 */

/** Maximum points earnable per fellow per calendar month (same for every cohort length). */
export const MONTHLY_POINTS_CAP = 20000;

const TOTAL_TARGET_BY_MONTHS: Record<number, number> = {
  1: 10000,
  2: 22000,
  3: 45000,
  4: 80000,
  5: 120000,
};

const DEFAULT_TOTAL_TARGET = 160000;

/**
 * Compute cohort duration in whole calendar months from startDate to endDate.
 * e.g. startDate = Jan 1, endDate = May 1 → 4 months.
 * Always returns at least 1.
 */
export function getCohortDurationMonths(start: Date, end: Date): number {
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return Math.max(1, months);
}

/**
 * Monthly point-earning cap. Same for all cohort durations (20,000).
 * @param _months retained for call-site compatibility; ignored.
 */
export function getMonthlyCapForDuration(_months?: number): number {
  return MONTHLY_POINTS_CAP;
}

/** Total point target (all sources) for a cohort of the given duration. */
export function getTotalTargetForDuration(months: number): number {
  return TOTAL_TARGET_BY_MONTHS[months] ?? DEFAULT_TOTAL_TARGET;
}

/**
 * Leaderboard achievement thresholds as a fraction of the cohort total target.
 * Deliberately demanding — only dedicated fellows who consistently hit the
 * monthly cap will reach the upper tiers.
 */
const LEADERBOARD_PCT: Record<string, number> = {
  'Point Starter':     0.005,    // ~4-month:  400 pts  (first session)
  'Point Collector':   0.03125,  // ~4-month:  2,500 pts
  'Point Accumulator': 0.075,    // ~4-month:  6,000 pts
  'Point Hoarder':     0.15,     // ~4-month: 12,000 pts
  'Point Enthusiast':  0.25,     // ~4-month: 20,000 pts
  'Point Expert':      0.40,     // ~4-month: 32,000 pts
  'Point Legend':      0.55,     // ~4-month: 44,000 pts
  'Point Elite':       0.725,    // ~4-month: 58,000 pts
  'Living Legend':     0.85,     // ~4-month: 68,000 pts
  'The GOAT':          0.95,     // ~4-month: 76,000 pts (near-perfect all months)
};

/**
 * Returns the scaled totalPoints threshold for a named LEADERBOARD achievement
 * relative to the cohort's total target.
 *
 * Falls back to `fallbackDbValue` for any achievement name not in the table
 * (e.g. future additions).
 */
export function getScaledLeaderboardThreshold(
  name: string,
  cohortTotalTarget: number,
  fallbackDbValue: number,
): number {
  const pct = LEADERBOARD_PCT[name];
  if (pct == null) return fallbackDbValue;
  return Math.round(pct * cohortTotalTarget);
}
