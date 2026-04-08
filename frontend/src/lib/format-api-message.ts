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
  if (typeof message === 'object' && message) {
    const obj = message as {
      message?: unknown;
      errors?: unknown;
      hint?: unknown;
    };

    // Common NestJS pattern: { message: string | string[] | { message, errors, hint } }
    const base = 'message' in obj ? formatApiErrorMessage(obj.message) : String(message);

    const details: string[] = [];
    if (Array.isArray(obj.errors)) {
      const errs = obj.errors.map((e) => String(e)).filter(Boolean);
      if (errs.length) details.push(errs.join('. '));
    }
    if (typeof obj.hint === 'string' && obj.hint.trim()) {
      details.push(obj.hint.trim());
    }

    return details.length ? `${base}. ${details.join('. ')}` : base;
  }
  return String(message);
}
