import { db } from "./db";
import { isoDate, monthKey, shiftMonth, monthLabel, usd } from "./utils";
import { CATEGORY_BY_ID } from "./categories";

/*
 * Counting rules, defined once:
 * - Spending is money out of "expense" categories, minus refunds in the same categories.
 * - Income is money in under the "income" category.
 * - Transfers and card payments (kind "transfer") are never spending or income.
 * - A transaction you exclude never counts. Pending transactions do count.
 */
const COUNTED = "t.excluded=0";
const SPEND_KIND = "c.kind='expense'";

export interface AccountRow { id: string; name: string; mask: string | null; type: string; subtype: string | null; balance_cents: number; available_cents: number | null; updated_at: string | null; institution: string | null }

export function getAccounts(): AccountRow[] {
  return db().prepare(
    `select a.*, i.institution from accounts a left join items i on i.id=a.item_id where a.hidden=0
     order by case a.type when 'depository' then 0 when 'credit' then 1 when 'investment' then 2 else 3 end, a.name`,
  ).all();
}

/** What an account is worth to you: credit and loan balances are debts, so they count negative. */
export function netValue(a: { type: string; balance_cents: number }): number {
  return a.type === "credit" || a.type === "loan" ? -a.balance_cents : a.balance_cents;
}

export function totals(accounts: AccountRow[]) {
  const net = accounts.reduce((s, a) => s + netValue(a), 0);
  const cash = accounts.filter((a) => a.type === "depository").reduce((s, a) => s + a.balance_cents, 0);
  const debt = accounts.filter((a) => a.type === "credit" || a.type === "loan").reduce((s, a) => s + a.balance_cents, 0);
  return { net, cash, debt };
}

export function spendBetween(from: string, to: string): number {
  const r = db().prepare(
    `select coalesce(sum(-t.amount_cents),0) as v from transactions t join categories c on c.id=t.category_id
     where ${COUNTED} and ${SPEND_KIND} and t.date>=? and t.date<=?`,
  ).get(from, to);
  return r.v;
}

export function incomeBetween(from: string, to: string): number {
  const r = db().prepare(
    `select coalesce(sum(t.amount_cents),0) as v from transactions t join categories c on c.id=t.category_id
     where ${COUNTED} and c.kind='income' and t.date>=? and t.date<=?`,
  ).get(from, to);
  return r.v;
}

export function monthBounds(key: string) {
  return { from: `${key}-01`, to: `${key}-31` };
}

export interface CategoryTotal { id: string; name: string; color: number; cents: number; count: number }

export function categoryTotals(from: string, to: string): CategoryTotal[] {
  return db().prepare(
    `select c.id, c.name, c.color, coalesce(sum(-t.amount_cents),0) as cents, count(*) as count
     from transactions t join categories c on c.id=t.category_id
     where ${COUNTED} and ${SPEND_KIND} and t.date>=? and t.date<=?
     group by c.id having cents>0 order by cents desc`,
  ).all(from, to);
}

export function monthlySeries(months: number, endKey = monthKey()): { key: string; spend: number; income: number }[] {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = shiftMonth(endKey, -i);
    const { from, to } = monthBounds(key);
    out.push({ key, spend: spendBetween(from, to), income: incomeBetween(from, to) });
  }
  return out;
}

export function topMerchants(from: string, to: string, limit = 6) {
  return db().prepare(
    `select coalesce(t.merchant, t.name) as name, sum(-t.amount_cents) as cents, count(*) as count
     from transactions t join categories c on c.id=t.category_id
     where ${COUNTED} and ${SPEND_KIND} and t.date>=? and t.date<=?
     group by coalesce(t.merchant, t.name) having cents>0 order by cents desc limit ?`,
  ).all(from, to, limit) as { name: string; cents: number; count: number }[];
}

export interface TxnRow { id: string; date: string; name: string; merchant: string | null; amount_cents: number; pending: number; excluded: number; category_id: string; category_source: string; account_name: string; category_name: string; kind: string }

export function listTransactions(opts: { month?: string; category?: string; q?: string; limit?: number; offset?: number }) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.month) { const b = monthBounds(opts.month); where.push("t.date>=? and t.date<=?"); args.push(b.from, b.to); }
  if (opts.category) { where.push("t.category_id=?"); args.push(opts.category); }
  if (opts.q) { where.push("(t.name like ? or t.merchant like ?)"); args.push(`%${opts.q}%`, `%${opts.q}%`); }
  const w = where.length ? `where ${where.join(" and ")}` : "";
  const base = `from transactions t join categories c on c.id=t.category_id left join accounts a on a.id=t.account_id ${w}`;
  const total = db().prepare(`select count(*) as n ${base}`).get(...args).n as number;
  const rows = db().prepare(
    `select t.id,t.date,t.name,t.merchant,t.amount_cents,t.pending,t.excluded,t.category_id,t.category_source,
            coalesce(a.name,'') as account_name, c.name as category_name, c.kind
     ${base} order by t.date desc, t.created_at desc, t.id limit ? offset ?`,
  ).all(...args, opts.limit ?? 60, opts.offset ?? 0) as TxnRow[];
  return { rows, total };
}

export function netWorthSeries(): { date: string; cents: number }[] {
  const rows = db().prepare(
    `select h.date, sum(case when a.type in ('credit','loan') then -h.balance_cents else h.balance_cents end) as cents,
            count(*) as n
     from balance_history h join accounts a on a.id=h.account_id where a.hidden=0
     group by h.date order by h.date`,
  ).all() as { date: string; cents: number; n: number }[];
  const full = Math.max(0, ...rows.map((r) => r.n));
  return rows.filter((r) => r.n === full).map(({ date, cents }) => ({ date, cents }));
}

export function hasData(): boolean {
  return db().prepare("select count(*) as c from accounts").get().c > 0;
}

export interface Insight { spendNow: number; spendPrev: number; deltaPct: number | null; topCategory: string | null; sentence: string | null }

/** Month so far against the same stretch of last month, so a half-finished month is not compared with a whole one. */
export function monthToDate(): Insight {
  const now = new Date();
  const key = monthKey(now);
  const prev = shiftMonth(key, -1);
  const day = now.getDate();
  const dd = String(day).padStart(2, "0");
  const spendNow = spendBetween(`${key}-01`, `${key}-${dd}`);
  const spendPrev = spendBetween(`${prev}-01`, `${prev}-${dd}`);
  const deltaPct = spendPrev > 0 ? ((spendNow - spendPrev) / spendPrev) * 100 : null;
  const cur = categoryTotals(`${key}-01`, `${key}-${dd}`);
  const old = new Map(categoryTotals(`${prev}-01`, `${prev}-${dd}`).map((c) => [c.id, c.cents]));
  let sentence: string | null = null;
  const top = cur[0] ?? null;
  if (top) {
    const was = old.get(top.id) ?? 0;
    const diff = top.cents - was;
    sentence = `${top.name} is your biggest category at ${usd(top.cents)}` + (was > 0 ? (diff === 0 ? `, the same as this point in ${monthLabel(prev, false)}.` : `, ${diff > 0 ? "up" : "down"} ${usd(Math.abs(diff))} from this point in ${monthLabel(prev, false)}.`) : ".");
  }
  return { spendNow, spendPrev, deltaPct, topCategory: top?.name ?? null, sentence };
}

export function recentSync() {
  return db().prepare("select * from sync_log where status!='running' order by id desc limit 8").all() as {
    id: number; started_at: string; finished_at: string | null; trigger: string; status: string; added: number; modified: number; removed: number; categorized: number; message: string | null;
  }[];
}

export function categoriesList() {
  return db().prepare("select id,name,kind,color from categories order by kind desc, name").all() as { id: string; name: string; kind: string; color: number }[];
}

export function categoryName(id: string) { return CATEGORY_BY_ID.get(id)?.name ?? id; }

export { isoDate };
