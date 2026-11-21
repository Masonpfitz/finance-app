import { NextResponse } from "next/server";
import { db, isDemo, demoForcedByEnv } from "@/lib/db";
import { plaidConfigured, plaidEnvName, llmEnabled, syncHour } from "@/lib/env";
import { isSyncing, lastSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = db();
  const items = d.prepare("select id,institution,last_synced_at,error from items").all();
  return NextResponse.json({
    demo: isDemo(),
    demoForcedByEnv: demoForcedByEnv(),
    plaidConfigured: plaidConfigured(),
    plaidEnv: plaidEnvName(),
    banks: items,
    llm: llmEnabled(),
    syncHour: syncHour(),
    syncing: isSyncing(),
    lastSync: lastSync(d),
  });
}
