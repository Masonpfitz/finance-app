import { NextResponse } from "next/server";
import { writeEnv } from "@/lib/env";
import { createLinkToken, plaidErrorMessage } from "@/lib/plaid";

export const dynamic = "force-dynamic";

/** Check the keys with Plaid first, then save them to .env. Nothing is saved if Plaid rejects them. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const clientId = String(body.clientId ?? "").trim();
  const secret = String(body.secret ?? "").trim();
  const env = body.env === "production" ? "production" : "sandbox";
  if (!/^[a-f0-9]{16,40}$/i.test(clientId)) return NextResponse.json({ ok: false, error: "The client ID looks wrong. It is a string of letters and numbers from Plaid's Keys page, with no spaces." }, { status: 400 });
  if (!/^[a-f0-9]{16,64}$/i.test(secret)) return NextResponse.json({ ok: false, error: "The secret looks wrong. Copy the one for the environment you picked (Sandbox or Production) from Plaid's Keys page." }, { status: 400 });
  try {
    await createLinkToken({ clientId, secret, env });
  } catch (err) {
    return NextResponse.json({ ok: false, error: plaidErrorMessage(err) }, { status: 400 });
  }
  writeEnv({ PLAID_CLIENT_ID: clientId, PLAID_SECRET: secret, PLAID_ENV: env });
  return NextResponse.json({ ok: true });
}
