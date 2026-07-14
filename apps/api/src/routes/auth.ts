import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { loginSchema, setupSchema } from "@liushui/shared";
import { db } from "../db/client.js";
import { users, sessions } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { nowIso, daysFromNowIso } from "../lib/time.js";
import { requireAuth, SESSION_COOKIE, type AuthVariables } from "../middleware/auth.js";
import { loginRateLimit } from "../middleware/rateLimit.js";

const SESSION_DAYS = 7;

export const authRoute = new Hono<{ Variables: AuthVariables }>()
  .get("/auth/status", async (c) => {
    const rows = await db.select({ count: count() }).from(users).all();
    return c.json({ hasUser: rows[0].count > 0 });
  })

  .post("/auth/setup", async (c) => {
    const rows = await db.select({ count: count() }).from(users).all();
    if (rows[0].count > 0) {
      return c.json({ error: "已初始化过" }, 403);
    }
    const body = await c.req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

    const { username, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = newId("u");
    const now = nowIso();

    await db.insert(users).values({ id: userId, username, passwordHash, createdAt: now }).run();
    return c.json({ id: userId, username }, 201);
  })

  .post("/auth/login", loginRateLimit, async (c) => {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

    const { username, password } = parsed.data;
    const user = await db.select().from(users).where(eq(users.username, username)).get();
    if (!user) return c.json({ error: "用户名或密码错误" }, 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return c.json({ error: "用户名或密码错误" }, 401);

    const sessionId = newId("sess");
    const now = nowIso();
    const expiresAt = daysFromNowIso(SESSION_DAYS);

    await db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt, createdAt: now }).run();

    setCookie(c, SESSION_COOKIE, sessionId, {
      path: "/", httpOnly: true, secure: false, sameSite: "Lax", maxAge: SESSION_DAYS * 86400,
    });
    return c.json({ id: user.id, username: user.username }, 200);
  })

  .post("/auth/logout", async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId)).run();
      deleteCookie(c, SESSION_COOKIE, { path: "/" });
    }
    return c.json({ ok: true });
  })

  .get("/auth/me", requireAuth, (c) => {
    return c.json({ id: c.var.userId, username: c.var.username });
  });
