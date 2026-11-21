import { NextResponse } from "next/server";
import { db, transaction } from "@/lib/db";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { merchantKey } from "@/lib/categorize";

export const dynamic = "force-dynamic";

/** Change a transaction's category (and remember it for that merchant), or exclude it from the totals. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const d = db();
  const t = d.prepare("select id,name,merchant from transactions where id=?").get(id);
  if (!t) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  let alsoUpdated = 0;
  transaction(d, () => {
    if (typeof body.category_id === "string") {
      if (!CATEGORY_BY_ID.has(body.category_id)) throw new Error("Unknown category.");
      d.prepare("update transactions set category_id=?, category_source='user' where id=?").run(body.category_id, id);
      const key = merchantKey(t.name, t.merchant);
      if (key) {
        d.prepare("insert into merchant_rules(key,category_id) values(?,?) on conflict(key) do update set category_id=excluded.category_id").run(key, body.category_id);
        // Apply the same choice to that merchant's other transactions you have not set by hand.
        const others = d.prepare("select id,name,merchant from transactions where category_source!='user' and id!=?").all(id);
        const upd = d.prepare("update transactions set category_id=?, category_source='user' where id=?");
        for (const o of others) if (merchantKey(o.name, o.merchant) === key) { upd.run(body.category_id, o.id); alsoUpdated++; }
      }
    }
    if (typeof body.excluded === "boolean") d.prepare("update transactions set excluded=? where id=?").run(body.excluded ? 1 : 0, id);
  });
  return NextResponse.json({ ok: true, alsoUpdated });
}
