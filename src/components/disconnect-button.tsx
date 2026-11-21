"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

export function DisconnectButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Disconnect ${name}? Its accounts and transactions will be deleted from this computer. You can connect it again later.`)) return;
        setBusy(true);
        await fetch("/api/plaid/disconnect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item_id: id }) });
        setBusy(false);
        router.refresh();
      }}
    >
      Disconnect
    </Button>
  );
}
