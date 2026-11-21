"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { Icon, Spinner } from "./icon";

/** "Sync now": pulls balances and new transactions, categorizes them, then refreshes the page. */
export function SyncButton({ size = "sm", variant = "outline" }: { size?: "sm" | "md"; variant?: "outline" | "primary" }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const r = await res.json();
      setMsg({ ok: !!r.ok, text: r.message });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Could not reach the app. Is it still running?" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={go} disabled={busy} size={size} variant={variant} className="w-full">
        {busy ? <Spinner /> : <Icon name="sync" size={15} />}
        {busy ? "Syncing" : "Sync now"}
      </Button>
      {msg && <p role="status" className={msg.ok ? "text-[11px] leading-snug text-ink-2" : "text-[11px] leading-snug text-rust"}>{msg.text}</p>}
    </div>
  );
}
