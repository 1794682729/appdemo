import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { merchantRules } from "../db/schema.js";
import { newId } from "./id.js";
import { nowIso } from "./time.js";

/** Save merchant→category rule for future auto-matching. Fire-and-forget safe. */
export async function saveMerchantRule(userId: string, note: string, categoryId: string) {
  if (note.length === 0 || note.length > 50) return;
  const keyword = note.trim();
  if (keyword.length < 2) return;

  try {
    const existing = await db.select().from(merchantRules)
      .where(and(eq(merchantRules.userId, userId), eq(merchantRules.keyword, keyword)))
      .limit(1);
    if (existing[0]) {
      await db.update(merchantRules).set({ categoryId })
        .where(eq(merchantRules.id, existing[0].id));
    } else {
      await db.insert(merchantRules).values({
        id: newId("mr"), userId, keyword, categoryId, createdAt: nowIso(),
      });
    }
  } catch {
    /* non-critical */
  }
}

/** Find matching category from merchant rules for a given note (merchant name). */
export async function findMerchantRuleCategory(userId: string, note: string): Promise<string | null> {
  if (note.length === 0) return null;
  const rules = await db.select().from(merchantRules)
    .where(eq(merchantRules.userId, userId));
  const matched = rules.find((r) => note.includes(r.keyword));
  return matched?.categoryId ?? null;
}
