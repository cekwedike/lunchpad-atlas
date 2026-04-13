/** Normalize free-text quiz answers for stable comparison (trim, collapse whitespace). */
export function normalizeQuizAnswer(value: string | undefined | null): string {
  if (value == null) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}
