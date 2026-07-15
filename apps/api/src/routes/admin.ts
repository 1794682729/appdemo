import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { requireAuth, requireAdmin, type AuthVariables } from "../middleware/auth.js";

export const adminRoute = new Hono<{ Variables: AuthVariables }>()
  .get("/admin/users", requireAuth, requireAdmin, async (c) => {
    const rows = await db.select({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt }).from(users);
    return c.json(rows);
  })
  .delete("/admin/users/:id", requireAuth, requireAdmin, async (c) => {
    const targetId = c.req.param("id");
    if (targetId === c.var.userId) {
      return c.json({ error: "不能删除自己" }, 400);
    }
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId)).limit(1);
    if (!rows[0]) return c.json({ error: "用户不存在" }, 404);
    await db.delete(users).where(eq(users.id, targetId));
    return c.json({ ok: true });
  });
