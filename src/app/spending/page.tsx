import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/db";
import { hasData, categoryTotals, monthBounds, monthlySeries, topMerchants } from "@/lib/queries";
import { monthKey, shiftMonth, monthLabel, usd } from "@/lib/utils";
import { PageTitle, Panel, PanelHeader } from "@/components/page";
import { CategoryChip } from "@/components/category-chip";
import { BarChart } from "@/components/chart";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

export default async function SpendingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!isDemo() && !hasData()) redirect("/setup");
  const sp = await searchParams;
  const nowKey = monthKey();
  const key = /^\d{4}-\d{2}$/.test(sp.month ?? "") && sp.month! <= nowKey ? sp.month! : nowKey;
  const prev = shiftMonth(key, -1);
  const b = monthBounds(key);
  const pb = monthBounds(prev);
  const cats = categoryTotals(b.from, b.to);
  const prevMap = new Map(categoryTotals(pb.from, pb.to).map((c) => [c.id, c.cents]));
  const total = cats.reduce((s, c) => s + c.cents, 0);
  const merchants = topMerchants(b.from, b.to, 8);
  const year = monthlySeries(12, nowKey);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Spending"
        description="Money out by category. Transfers, card payments and anything you left out aren't counted."
        action={
          <div className="flex items-center gap-1 rounded-pill bg-track p-1">
            <Link href={`/spending?month=${prev}`} className="grid size-8 place-items-center rounded-pill hover:bg-track-on" aria-label="Previous month"><Icon name="chevron-down" size={14} className="rotate-90" /></Link>
            <span className="min-w-[132px] text-center text-body font-medium">{monthLabel(key)}</span>
            {key < nowKey
              ? <Link href={`/spending?month=${shiftMonth(key, 1)}`} className="grid size-8 place-items-center rounded-pill hover:bg-track-on" aria-label="Next month"><Icon name="chevron-down" size={14} className="-rotate-90" /></Link>
              : <span className="grid size-8 place-items-center text-ink-3" aria-hidden><Icon name="chevron-down" size={14} className="-rotate-90" /></span>}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <PanelHeader title="By category" note={`${usd(total)} in ${monthLabel(key)}`} />
          {cats.length === 0 ? (
            <div className="rounded-section border border-dashed border-line px-4 py-10 text-center text-body text-ink-2">No spending recorded for {monthLabel(key)}.</div>
          ) : (
            <div className="scroll-x">
              <div className="min-w-[520px]">
                <div className="ledger-head grid-cols-[190px_1fr_88px_110px]">
                  <span>Category</span><span>Share</span><span className="text-right">Amount</span><span className="text-right">vs {monthLabel(prev, false)}</span>
                </div>
                {cats.map((c) => {
                  const was = prevMap.get(c.id) ?? 0;
                  const diff = c.cents - was;
                  return (
                    <div key={c.id} className="ledger-row grid-cols-[190px_1fr_88px_110px]">
                      <span><CategoryChip name={c.name} color={c.color} /></span>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-track"><span className="block h-full rounded-pill bg-brand" style={{ width: `${Math.max(2, (c.cents / total) * 100)}%` }} /></span>
                        <span className="tnum w-9 text-right text-[12px] text-ink-2">{Math.round((c.cents / total) * 100)}%</span>
                      </span>
                      <span className="tnum text-right font-medium">{usd(c.cents)}</span>
                      <span className="tnum text-right text-[12px] text-ink-2">{was === 0 ? "new" : diff === 0 ? "no change" : `${diff > 0 ? "+" : "−"}${usd(Math.abs(diff))}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader title="Top merchants" note={monthLabel(key)} />
          {merchants.length === 0 ? <p className="text-body text-ink-2">Nothing yet.</p> : (
            <ul>
              {merchants.map((m) => (
                <li key={m.name} className="flex items-center justify-between gap-3 border-b border-line/70 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-body font-medium">{m.name}</div>
                    <div className="text-[11px] text-ink-2">{m.count} purchase{m.count === 1 ? "" : "s"}</div>
                  </div>
                  <span className="tnum text-body font-medium">{usd(m.cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Last twelve months" note="Total spending each month. The tallest month is picked out." />
        <BarChart data={year.map((y) => ({ label: monthLabel(y.key, false).slice(0, 3), value: y.spend / 100 }))} />
      </Panel>
    </div>
  );
}
