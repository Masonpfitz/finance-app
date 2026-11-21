import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/db";
import {
  getAccounts, totals, monthToDate, monthlySeries, categoryTotals, monthBounds, netWorthSeries,
  listTransactions, incomeBetween, hasData,
} from "@/lib/queries";
import { monthKey, shiftMonth, monthLabel, usd } from "@/lib/utils";
import { StatCard, StatRow } from "@/components/stat-card";
import { AreaChart } from "@/components/chart";
import { CategoryChip } from "@/components/category-chip";
import { Icon } from "@/components/icon";
import { PageTitle, Panel, PanelHeader } from "@/components/page";
import { AccountList } from "@/components/account-list";
import { TxnLedger } from "@/components/txn-ledger";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  if (!isDemo() && !hasData()) redirect("/setup");

  const now = new Date();
  const key = monthKey(now);
  const prev = shiftMonth(key, -1);
  const dd = String(now.getDate()).padStart(2, "0");
  const accounts = getAccounts();
  const t = totals(accounts);
  const mtd = monthToDate();
  const series = monthlySeries(6);
  const thisMonth = series[series.length - 1];
  const lastMonth = series[series.length - 2];
  const incomeMtd = incomeBetween(`${key}-01`, `${key}-${dd}`);
  const incomePrevMtd = incomeBetween(`${prev}-01`, `${prev}-${dd}`);
  const incomeDelta = incomePrevMtd > 0 ? ((incomeMtd - incomePrevMtd) / incomePrevMtd) * 100 : null;
  const b = monthBounds(key);
  const cats = categoryTotals(b.from, b.to);
  const catTotal = cats.reduce((s, c) => s + c.cents, 0);

  // Net worth: only show a shape when there really is history to show.
  const nw = netWorthSeries();
  const nwPoints = nw.length >= 2 ? nw.slice(-60).map((p) => p.cents / 100) : null;
  const monthAgo = nw.find((p) => p.date >= new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10));
  const nwDelta = monthAgo && monthAgo.cents !== 0 && nw.length >= 2 ? ((t.net - monthAgo.cents) / Math.abs(monthAgo.cents)) * 100 : null;
  const nwInsight = monthAgo && nw.length >= 2
    ? `${t.net >= monthAgo.cents ? "Up" : "Down"} ${usd(Math.abs(t.net - monthAgo.cents))} since ${new Date(monthAgo.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
    : "The shape fills in as the app syncs each day.";

  // A trend line needs a few real months behind it; a flat run of zeros then a jump says nothing.
  const shape = (v: number[]) => (v.filter((x) => x !== 0).length >= 3 ? v : null);
  const saved = thisMonth.income - thisMonth.spend;
  const keptPct = thisMonth.income > 0 ? Math.round((saved / thisMonth.income) * 100) : null;
  const recent = listTransactions({ limit: 8 }).rows;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Dashboard" description={`Where your money stands today and where it went in ${monthLabel(key)}.`} />

      <StatRow>
        <StatCard
          label="Net worth"
          icon="bank"
          value={usd(t.net)}
          delta={nwDelta}
          deltaLabel="vs 30 days ago"
          series={nwPoints}
          insight={nwInsight}
        />
        <StatCard
          label={`Spent in ${monthLabel(key, false)}`}
          icon="credit-card"
          value={usd(thisMonth.spend)}
          delta={mtd.deltaPct}
          deltaLabel={`vs ${monthLabel(prev, false)} so far`}
          series={shape(series.map((s) => s.spend / 100))}
          insight={mtd.sentence ?? "No spending recorded this month yet."}
        />
        <StatCard
          label={`Income in ${monthLabel(key, false)}`}
          icon="cash"
          value={usd(thisMonth.income)}
          delta={incomeDelta}
          deltaLabel={`vs ${monthLabel(prev, false)} so far`}
          series={shape(series.map((s) => s.income / 100))}
          insight={lastMonth && lastMonth.income > 0 ? `${monthLabel(prev, false)} brought in ${usd(lastMonth.income)} in total.` : undefined}
        />
        <StatCard
          label="Kept this month"
          icon="chart-up"
          value={usd(saved)}
          series={shape(series.map((s) => (s.income - s.spend) / 100))}
          insight={keptPct !== null ? `${keptPct >= 0 ? `You kept ${keptPct}% of what came in.` : `You spent ${Math.abs(keptPct)}% more than came in.`} Card payments and transfers don't count.` : "Income shows up here once a paycheck lands."}
        />
      </StatRow>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <PanelHeader title="Spent against income" note="Last six months. The dashed line is income." />
          <AreaChart
            series={series.map((s) => s.spend / 100)}
            compare={series.map((s) => s.income / 100)}
            labels={series.map((s) => monthLabel(s.key, false))}
            height={200}
          />
        </Panel>
        <Panel className="xl:col-span-2">
          <PanelHeader title={`Where it went in ${monthLabel(key, false)}`} action={<Link href="/spending" className="text-[12px] font-medium text-brand-text hover:underline">All categories</Link>} />
          {cats.length === 0 ? (
            <Empty text="No spending recorded this month yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {cats.slice(0, 6).map((c) => (
                <li key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <CategoryChip name={c.name} color={c.color} />
                    <span className="tnum text-body font-medium">{usd(c.cents)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-track">
                    <div className="h-full rounded-pill bg-brand" style={{ width: `${Math.max(2, (c.cents / catTotal) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Accounts" action={<Link href="/accounts" className="text-[12px] font-medium text-brand-text hover:underline">Manage</Link>} />
          <AccountList accounts={accounts} compact />
          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-body">
            <span className="text-ink-2">Cash on hand</span>
            <span className="tnum font-medium">{usd(t.cash)}</span>
          </div>
          {t.debt > 0 && (
            <div className="mt-1.5 flex items-center justify-between text-body">
              <span className="text-ink-2">Owed on cards and loans</span>
              <span className="tnum font-medium">{usd(t.debt)}</span>
            </div>
          )}
        </Panel>
        <Panel className="xl:col-span-3">
          <PanelHeader title="Recent transactions" action={<Link href="/transactions" className="text-[12px] font-medium text-brand-text hover:underline">See all</Link>} />
          <TxnLedger rows={recent} />
        </Panel>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-section border border-dashed border-line px-4 py-8 text-center">
      <span className="grid size-9 place-items-center rounded-pill bg-track text-ink-3"><Icon name="info" size={16} /></span>
      <p className="text-body text-ink-2">{text}</p>
    </div>
  );
}
