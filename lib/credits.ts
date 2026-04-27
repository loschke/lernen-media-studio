import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";

export type SpendResult =
  | { ok: true; remaining: number }
  | { ok: false; remaining: number };

export async function getCredits(sub: string): Promise<number> {
  const rows = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.sub, sub))
    .limit(1);
  return rows[0]?.credits ?? 0;
}

/**
 * Atomarer Decrement. Setzt credits = credits - cost nur, wenn der Saldo
 * mindestens cost beträgt. Race-safe gegen parallele Generate-Calls.
 */
export async function spendCredits(sub: string, cost: number): Promise<SpendResult> {
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error(`invalid cost: ${cost}`);
  }
  const rows = await db
    .update(users)
    .set({
      credits: sql`${users.credits} - ${cost}`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.sub, sub), gte(users.credits, cost)))
    .returning({ credits: users.credits });

  if (rows.length === 0) {
    const remaining = await getCredits(sub);
    return { ok: false, remaining };
  }
  return { ok: true, remaining: rows[0].credits };
}

/**
 * Erstattet Credits zurück, z. B. wenn der Modell-Call nach erfolgtem
 * Pre-Decrement fehlschlägt (Google 429, 5xx, etc.).
 */
export async function refundCredits(sub: string, amount: number): Promise<number> {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`invalid amount: ${amount}`);
  }
  const rows = await db
    .update(users)
    .set({
      credits: sql`${users.credits} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.sub, sub))
    .returning({ credits: users.credits });
  return rows[0]?.credits ?? 0;
}
