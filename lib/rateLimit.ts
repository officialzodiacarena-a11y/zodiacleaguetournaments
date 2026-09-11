// In-memory sliding-window rate limiter. No Redis/Upstash is configured in
// this project (see .env.local) — fine for a single-instance Next.js server,
// which is what this Sept 23 demo runs on. If this app ever scales to
// multiple server instances, swap the Map below for a shared store (Upstash
// Redis, etc.) since counters here don't sync across instances.
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const retryAfterSeconds = Math.ceil((timestamps[0] + windowMs - now) / 1000);
    hits.set(key, timestamps);
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: true, remaining: limit - timestamps.length, retryAfterSeconds: 0 };
}
