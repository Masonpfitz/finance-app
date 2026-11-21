import type { TxnRow } from "@/lib/queries";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { usd, cn } from "@/lib/utils";
import { CategoryChip } from "./category-chip";

export function fmtDate(iso: string) {
  return new Date(iso + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** A plain, read-only ledger: used on the dashboard. The Transactions page uses the editable one. */
export function TxnLedger({ rows }: { rows: TxnRow[] }) {
  if (!rows.length) return <p className="text-body text-ink-2">No transactions yet.</p>;
  return (
    <div className="scroll-x">
      <div className="min-w-[460px]">
        {rows.map((t) => {
          const c = CATEGORY_BY_ID.get(t.category_id);
          return (
            <div key={t.id} className={cn("ledger-row grid-cols-[56px_1fr_auto_88px]", t.pending && "ledger-row-muted")}>
              <span className="text-[12px] text-ink-2">{fmtDate(t.date)}</span>
              <span className="truncate font-medium text-ink">{t.merchant || t.name}{t.pending ? <span className="ml-2 text-[11px] font-normal text-ink-2">pending</span> : null}</span>
              <CategoryChip name={c?.name ?? t.category_name} color={c?.color ?? -1} />
              <span className="tnum text-right font-medium text-ink">{t.amount_cents > 0 ? "+" : ""}{usd(t.amount_cents, { cents: true })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
