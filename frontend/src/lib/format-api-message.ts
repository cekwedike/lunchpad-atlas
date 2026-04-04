/**
 * Normalizes API `message` fields (string, string[], or nested) for UI copy.
 */
export function formatApiErrorMessage(message: unknown): string {
  if (message == null) return 'Something went wrong';
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    const parts = message.map((m) => String(m)).filter(Boolean);
    return parts.length ? parts.join('. ') : 'Something went wrong';
  }
  if (typeof message === 'object' && 'message' in (message as object)) {
    return formatApiErrorMessage(
      (message as { message: unknown }).message
    );
  }
  return String(message);
}
