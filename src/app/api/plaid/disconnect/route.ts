import { NextResponse } from "next/server";
import { db, transaction } from "@/lib/db";
import { requirePlaid } from "@/lib/plaid";

export const dynamic = "force-dynamic";

/** Disconnect a bank: tell Plaid to drop the connection, then delete its accounts and transactions from this computer. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.item_id ?? "");
  const d = db();
  const item = d.prepare("select id,access_token from items where id=?").get(id);
  if (!item) return NextResponse.json({ error: "That bank is not connected." }, { status: 404 });
  try { await requirePlaid().itemRemove({ access_token: item.access_token }); } catch { /* already gone on Plaid's side is fine */ }
  transaction(d, () => {
    const accts = d.prepare("select id from accounts where item_id=?").all(id).map((a) => a.id);
    for (const a of accts) {
      d.prepare("delete from transactions where account_id=?").run(a);
      d.prepare("delete from balance_history where account_id=?").run(a);
      d.prepare("delete from accounts where id=?").run(a);
    }
    d.prepare("delete from items where id=?").run(id);
  });
  return NextResponse.json({ ok: true });
}
