import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/db";
import { hasData, listTransactions, categoriesList } from "@/lib/queries";
import { monthKey, shiftMonth, monthLabel } from "@/lib/utils";
import { PageTitle, Panel } from "@/components/page";
import { TxnTable } from "@/components/txn-table";
import { Button } from "@/components/button";

export const dynamic = "force-dynamic";
const PAGE = 50;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!isDemo() && !hasData()) redirect("/setup");
  const sp = await searchParams;
  const month = sp.month === "all" ? undefined : /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month : monthKey();
  const category = sp.category || undefined;
  const q = (sp.q ?? "").trim() || undefined;
  const page = Math.max(0, Number(sp.page) || 0);
  const { rows, total } = listTransactions({ month, category, q, limit: PAGE, offset: page * PAGE });
  const cats = categoriesList();
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(monthKey(), -i));

  const link = (p: number) => {
    const u = new URLSearchParams();
    u.set("month", month ?? "all");
    if (category) u.set("category", category);
    if (q) u.set("q", q);
    if (p) u.set("page", String(p));
    return `/transactions?${u}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Transactions" description="Every purchase and deposit. Change a category and the app remembers it for that merchant." />
      <Panel>
        <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
          <input
            name="q" defaultValue={q ?? ""} placeholder="Search by name"
            className="h-9 min-w-[200px] flex-1 rounded-control border border-line bg-card px-3 text-body placeholder:text-ink-3"
          />
          <select name="month" defaultValue={month ?? "all"} className="h-9 rounded-control border border-line bg-card px-3 text-body" aria-label="Month">
            <option value="all">All time</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <select name="category" defaultValue={category ?? ""} className="h-9 rounded-control border border-line bg-card px-3 text-body" aria-label="Category">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button type="submit" variant="outline">Apply</Button>
        </form>
        {rows.length === 0 ? (
          <div className="rounded-section border border-dashed border-line px-4 py-10 text-center text-body text-ink-2">Nothing matches those filters.</div>
        ) : (
          <TxnTable rows={rows} cats={cats} />
        )}
        <div className="mt-4 flex items-center justify-between text-[12px] text-ink-2">
          <span>{total === 0 ? "" : `${page * PAGE + 1} to ${Math.min(total, (page + 1) * PAGE)} of ${total}`}</span>
          <span className="flex gap-3">
            {page > 0 && <Link className="font-medium text-brand-text hover:underline" href={link(page - 1)}>Newer</Link>}
            {(page + 1) * PAGE < total && <Link className="font-medium text-brand-text hover:underline" href={link(page + 1)}>Older</Link>}
          </span>
        </div>
      </Panel>
    </div>
  );
}
