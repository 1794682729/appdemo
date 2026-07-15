import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { nowIso } from "../lib/time.js";

export type AuthVariables = {
  userId: string;
  username: string;
  role: string;
};

export const SESSION_COOKIE = "liushui_session";

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (!sessionId) {
      return c.json({ error: "未登录" }, 401);
    }

    const rows = await db
      .select({
        userId: sessions.userId,
        username: users.username,
        role: users.role,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, nowIso())))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return c.json({ error: "登录已失效" }, 401);
    }

    c.set("userId", row.userId);
    c.set("username", row.username);
    c.set("role", row.role);
    await next();
  },
);

/** Must come after requireAuth — checks user is admin */
export const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    if (c.var.role !== "admin") {
      return c.json({ error: "仅管理员可用" }, 403);
    }
    await next();
  },
);
