import { NextResponse } from "next/server";
import { db, isDemo } from "@/lib/db";
import { requirePlaid, plaidErrorMessage } from "@/lib/plaid";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** Swap the one-time token from Plaid Link for a long-lived access token, store it, and pull the first data. */
export async function POST(req: Request) {
  if (isDemo()) return NextResponse.json({ error: "Turn demo mode off before connecting a real bank." }, { status: 409 });
  const body = await req.json().catch(() => ({}));
  const publicToken = String(body.public_token ?? "");
  if (!publicToken) return NextResponse.json({ error: "Missing token from Plaid Link." }, { status: 400 });
  try {
    const plaid = requirePlaid();
    const ex = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    const institution = String(body.institution ?? "").slice(0, 120) || "Your bank";
    db().prepare("insert or replace into items(id,institution,access_token,created_at) values(?,?,?,?)")
      .run(ex.data.item_id, institution, ex.data.access_token, new Date().toISOString());
    const result = await runSync("connect");
    return NextResponse.json({ ok: true, sync: result });
  } catch (err) {
    return NextResponse.json({ error: plaidErrorMessage(err) }, { status: 400 });
  }
}
