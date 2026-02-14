/**
 * gamification.utils.ts
 *
 * Shared utility functions for cohort-duration-aware gamification.
 *
 * Monthly cap and total-target targets:
 *   1 month  → 10,000/mo cap  (10,000 total)
 *   2 months → 11,000/mo cap  (22,000 total)
 *   3 months → 15,000/mo cap  (45,000 total)
 *   4 months → 20,000/mo cap  (80,000 total)
 *   5 months → 24,000/mo cap  (120,000 total)
 *   6+ months→ 26,667/mo cap  (160,000 total)
 */

const MONTHLY_CAP_BY_MONTHS: Record<number, number> = {
  1: 10000,
  2: 11000,
  3: 15000,
  4: 20000,
  5: 24000,
};

const TOTAL_TARGET_BY_MONTHS: Record<number, number> = {
  1: 10000,
  2: 22000,
  3: 45000,
  4: 80000,
  5: 120000,
};

const DEFAULT_MONTHLY_CAP = 26667;  // Math.round(160_000 / 6)
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

/** Monthly point-earning cap for a cohort of the given duration. */
export function getMonthlyCapForDuration(months: number): number {
  return MONTHLY_CAP_BY_MONTHS[months] ?? DEFAULT_MONTHLY_CAP;
}

/** Total point target (all sources) for a cohort of the given duration. */
export function getTotalTargetForDuration(months: number): number {
  return TOTAL_TARGET_BY_MONTHS[months] ?? DEFAULT_TOTAL_TARGET;
}

/**
 * Leaderboard achievement thresholds expressed as a fraction of the cohort
 * total target. Spread so that early tiers unlock in month 1 and The GOAT
 * requires dedicated effort through the final month.
 *
 * Reference values for a 4-month cohort (total = 80,000):
 *   Point Starter     ≈     100 pts  (month 1, first week)
 *   Point Collector   ≈     500 pts  (month 1)
 *   Point Accumulator ≈   1,000 pts  (month 1)
 *   Point Hoarder     ≈   3,000 pts  (month 1 end)
 *   Point Enthusiast  ≈   5,000 pts  (month 2 start)
 *   Point Expert      ≈  12,000 pts  (month 2 mid)
 *   Point Legend      ≈  20,000 pts  (month 2 end)
 *   Point Elite       ≈  35,000 pts  (month 3)
 *   Living Legend     ≈  55,000 pts  (month 3 end)
 *   The GOAT          ≈  72,000 pts  (month 4, dedicated fellows only)
 */
const LEADERBOARD_PCT: Record<string, number> = {
  'Point Starter':     0.00125,
  'Point Collector':   0.00625,
  'Point Accumulator': 0.0125,
  'Point Hoarder':     0.0375,
  'Point Enthusiast':  0.0625,
  'Point Expert':      0.15,
  'Point Legend':      0.25,
  'Point Elite':       0.4375,
  'Living Legend':     0.6875,
  'The GOAT':          0.90,
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
