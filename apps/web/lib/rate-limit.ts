/**
 * Best-effort in-memory rate limiter for the unauthenticated public API
 * routes (/api/market, /api/news). This is defense-in-depth, not the
 * primary quota protection — both routes already cache their upstream
 * fetch via Next's `next: { revalidate }`, so the real Twelve Data/NewsAPI
 * call only happens once per window regardless of how many times this
 * route is hit. This guards against hitting the *route* itself for
 * abuse/DoS purposes, and against a caching-layer failure.
 *
 * Honest caveat: in-memory state doesn't survive a serverless cold start,
 * so on a platform that recycles function instances aggressively this is
 * weaker than a real shared store (Redis, etc.) would be — good enough for
 * a pre-launch/testing deployment, not a substitute for one at real scale.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

const hits = new Map<string, number[]>();

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
