import { createMiddleware } from "hono/factory";

/** Simple in-memory rate limiter. Tracks attempts per key within a time window. */
function createRateLimiter({
  windowMs,
  maxAttempts,
}: {
  windowMs: number;
  maxAttempts: number;
}) {
  const store = new Map<string, { count: number; resetAt: number }>();

  // Periodic cleanup every 5 minutes
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000);
  // Allow garbage collection if module is reloaded
  if (cleanup.unref) cleanup.unref();

  return {
    consume(key: string): { allowed: boolean; remaining: number } {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxAttempts - 1 };
      }
      entry.count += 1;
      if (entry.count > maxAttempts) {
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: maxAttempts - entry.count };
    },
  };
}

/** 5 failed attempts per 15 minutes per key */
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxAttempts: 5,
});

export const loginRateLimit = createMiddleware(async (c, next) => {
  await next();

  // Only intercept failed login responses (401)
  if (c.res.status === 401) {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";

    const { allowed, remaining } = loginLimiter.consume(ip);

    if (!allowed) {
      c.res = c.json(
        { error: "尝试次数过多，请15分钟后再试" },
        429,
      );
      return;
    }

    c.res.headers.set("X-RateLimit-Remaining", String(remaining));
  }
});
