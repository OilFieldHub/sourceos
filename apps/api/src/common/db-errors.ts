/**
 * Unique-constraint violation, detected across both drivers this project runs
 * on: Postgres (error code 23505) and sql.js/sqlite (message-based, no code).
 */
export function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === '23505') return true;

  const message = (err as { message?: string })?.message ?? '';
  return /UNIQUE constraint failed/i.test(message);
}
