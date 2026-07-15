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
    const rows = await db.select({ count: count() }).from(users);
    return c.json({ hasUser: rows[0].count > 0 });
  })

  // Open registration — no longer blocks after first user
  .post("/auth/setup", async (c) => {
    const body = await c.req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

    const { username, password } = parsed.data;

    // Check username uniqueness
    const existingRows = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existingRows[0]) return c.json({ error: "用户名已被注册" }, 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = newId("u");
    const now = nowIso();

    // First user is admin, rest are regular users
    const totalRows = await db.select({ count: count() }).from(users);
    const role = totalRows[0].count === 0 ? "admin" : "user";

    await db.insert(users).values({ id: userId, username, passwordHash, role, createdAt: now });
    return c.json({ id: userId, username, role }, 201);
  })

  .post("/auth/login", loginRateLimit, async (c) => {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

    const { username, password } = parsed.data;
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = rows[0];
    if (!user) return c.json({ error: "用户名或密码错误" }, 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return c.json({ error: "用户名或密码错误" }, 401);

    const sessionId = newId("sess");
    const now = nowIso();
    const expiresAt = daysFromNowIso(SESSION_DAYS);

    await db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt, createdAt: now });

    setCookie(c, SESSION_COOKIE, sessionId, {
      path: "/", httpOnly: true, secure: false, sameSite: "Lax", maxAge: SESSION_DAYS * 86400,
    });
    return c.json({ id: user.id, username: user.username, role: user.role }, 200);
  })

  .post("/auth/logout", async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      deleteCookie(c, SESSION_COOKIE, { path: "/" });
    }
    return c.json({ ok: true });
  })

  .get("/auth/me", requireAuth, (c) => {
    return c.json({ id: c.var.userId, username: c.var.username, role: c.var.role });
  });
