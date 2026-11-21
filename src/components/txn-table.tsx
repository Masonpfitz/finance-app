"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn, usd } from "@/lib/utils";
import { swatch } from "@/lib/categories";
import { Icon } from "./icon";

export interface Row {
  id: string; date: string; name: string; merchant: string | null; amount_cents: number; pending: number;
  excluded: number; category_id: string; category_source: string; account_name: string;
}
export interface Cat { id: string; name: string; kind: string; color: number }

const SOURCE_LABEL: Record<string, string> = { user: "You chose this", rule: "Built-in rule", plaid: "From Plaid", llm: "AI guess", fallback: "No match found" };

/** The editable ledger. Pick a different category and it is remembered for that merchant. */
export function TxnTable({ rows, cats }: { rows: Row[]; cats: Cat[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setNote(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (j.alsoUpdated > 0) setNote(`Saved. ${j.alsoUpdated} other transaction${j.alsoUpdated === 1 ? "" : "s"} from the same merchant moved too, and future ones will land there.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const ordered = [...cats].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "expense" ? -1 : 1));

  return (
    <div>
      {note && <p role="status" className="mb-3 rounded-control bg-st-info-bg px-3 py-2 text-[12px] text-st-info">{note}</p>}
      <div className="scroll-x">
        <div className="min-w-[760px]">
          <div className="ledger-head grid-cols-[64px_1fr_190px_110px_32px]">
            <span>Date</span><span>Description</span><span>Category</span><span className="text-right">Amount</span><span />
          </div>
          {rows.map((t) => {
            const s = swatch(cats.find((c) => c.id === t.category_id)?.color ?? -1);
            return (
              <div key={t.id} className={cn("ledger-row grid-cols-[64px_1fr_190px_110px_32px]", (t.pending || t.excluded) && "ledger-row-muted")}>
                <span className="text-[12px] text-ink-2">{new Date(t.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{t.merchant || t.name}</span>
                  <span className="block truncate text-[11px] text-ink-2">
                    {t.account_name}{t.pending ? " · pending" : ""}{t.excluded ? " · left out of totals" : ""}
                  </span>
                </span>
                <span className="relative inline-flex items-center" title={SOURCE_LABEL[t.category_source] ?? ""}>
                  <span aria-hidden className="pointer-events-none absolute left-2.5 size-2 rounded-pill" style={{ background: s.base }} />
                  <select
                    aria-label={`Category for ${t.merchant || t.name}`}
                    value={t.category_id}
                    disabled={busy === t.id}
                    onChange={(e) => patch(t.id, { category_id: e.target.value })}
                    className="h-8 w-full appearance-none rounded-control border border-line bg-card pl-6 pr-7 text-[12px] font-medium text-ink hover:bg-hover-fill disabled:opacity-50"
                  >
                    {ordered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Icon name="chevron-down" size={12} className="pointer-events-none absolute right-2.5 text-ink-3" />
                </span>
                <span className={cn("tnum text-right font-medium text-ink", t.excluded && "line-through")}>
                  {t.amount_cents > 0 ? "+" : ""}{usd(t.amount_cents, { cents: true })}
                </span>
                <button
                  onClick={() => patch(t.id, { excluded: !t.excluded })}
                  disabled={busy === t.id}
                  title={t.excluded ? "Count this transaction again" : "Leave this out of the totals"}
                  aria-label={t.excluded ? "Count this transaction again" : "Leave this out of the totals"}
                  className="grid size-8 place-items-center rounded-control text-ink-3 hover:bg-hover-fill hover:text-ink"
                >
                  <Icon name={t.excluded ? "eye" : "ban"} size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
