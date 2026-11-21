import { NextResponse } from "next/server";
import { createLinkToken, plaidErrorMessage } from "@/lib/plaid";
import { isDemo } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  if (isDemo()) return NextResponse.json({ error: "Turn demo mode off before connecting a real bank." }, { status: 409 });
  try {
    return NextResponse.json({ link_token: await createLinkToken() });
  } catch (err) {
    return NextResponse.json({ error: plaidErrorMessage(err) }, { status: 400 });
  }
}
