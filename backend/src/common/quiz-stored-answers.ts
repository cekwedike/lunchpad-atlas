/**
 * Read the answer for a question from stored JSON.
 * If the quiz was edited and question IDs changed, keys may not match current ids;
 * when the number of stored entries equals the number of questions, fall back to
 * positional alignment (insertion order of JSON keys is stable for object literals).
 */
export function resolveStoredAnswerForQuestion(
  questions: { id: string; order: number }[],
  questionIndex: number,
  questionId: string,
  stored: Record<string, string> | null | undefined,
): string | null {
  const raw = stored || {};
  if (Object.prototype.hasOwnProperty.call(raw, questionId)) {
    const v = raw[questionId];
    return v == null ? null : String(v);
  }
  const vals = Object.values(raw);
  if (vals.length !== questions.length) return null;
  const v = vals[questionIndex];
  return v == null ? null : String(v);
}
