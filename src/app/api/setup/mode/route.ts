import { NextResponse } from "next/server";
import { setDemo, demoForcedByEnv } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (demoForcedByEnv()) return NextResponse.json({ ok: false, error: "Demo mode is set by DEMO_MODE in your .env file. Clear it there to use this switch." }, { status: 409 });
  setDemo(body.demo === true);
  return NextResponse.json({ ok: true, demo: body.demo === true });
}
