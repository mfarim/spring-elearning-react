/**
 * Message of a failed API call. For a validation failure (400 with field errors in `data`) the first field
 * error is returned, because the generic "Validation failed" does not tell the user what to fix.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: { message?: string; data?: unknown } } })?.response?.data;
  const fieldErrors = body?.data;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const first = Object.values(fieldErrors as Record<string, unknown>).find((value) => typeof value === 'string');
    if (typeof first === 'string' && first) return first;
  }
  return body?.message || fallback;
}
