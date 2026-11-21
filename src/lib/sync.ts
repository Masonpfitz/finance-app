import { db, transaction, getSetting, setSetting, isDemo, type DB } from "./db";
import { requirePlaid, plaidErrorMessage } from "./plaid";
import { categorize, llmCategorize } from "./categorize";
import { isoDate } from "./utils";
import { plaidConfigured } from "./env";
import type { Transaction as PlaidTxn, AccountBase } from "plaid";

export interface SyncResult { ok: boolean; message: string; added: number; modified: number; removed: number; categorized: number }

const g = globalThis as unknown as { __syncing?: Promise<SyncResult> };

const dollarsToCents = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100));

function upsertAccounts(d: DB, itemId: string, accounts: AccountBase[]) {
  const up = d.prepare(
    `insert into accounts(id,item_id,name,mask,type,subtype,balance_cents,available_cents,currency,updated_at)
     values(?,?,?,?,?,?,?,?,?,?)
     on conflict(id) do update set item_id=excluded.item_id,name=excluded.name,mask=excluded.mask,type=excluded.type,
       subtype=excluded.subtype,balance_cents=excluded.balance_cents,available_cents=excluded.available_cents,
       currency=excluded.currency,updated_at=excluded.updated_at`,
  );
  const hist = d.prepare("insert into balance_history(date,account_id,balance_cents) values(?,?,?) on conflict(date,account_id) do update set balance_cents=excluded.balance_cents");
  const now = new Date().toISOString();
  const today = isoDate();
  for (const a of accounts) {
    const cur = dollarsToCents(a.balances.current) ?? 0;
    up.run(a.account_id, itemId, a.official_name || a.name, a.mask ?? null, String(a.type), a.subtype ? String(a.subtype) : null, cur, dollarsToCents(a.balances.available), a.balances.iso_currency_code ?? "USD", now);
    hist.run(today, a.account_id, cur);
  }
}

function upsertTxn(d: DB, t: PlaidTxn) {
  const amountCents = -Math.round(t.amount * 100); // Plaid: positive = money out. Ours: negative = money out.
  const existing = d.prepare("select category_source from transactions where id=?").get(t.transaction_id);
  const merchant = t.merchant_name ?? null;
  const pfc = t.personal_finance_category;
  if (existing) {
    d.prepare("update transactions set date=?,name=?,merchant=?,amount_cents=?,pending=?,plaid_primary=?,plaid_detailed=? where id=?")
      .run(t.date, t.name, merchant, amountCents, t.pending ? 1 : 0, pfc?.primary ?? null, pfc?.detailed ?? null, t.transaction_id);
    if (existing.category_source !== "user") {
      const c = categorize(d, { name: t.name, merchant, plaidPrimary: pfc?.primary, plaidDetailed: pfc?.detailed, amountCents });
      d.prepare("update transactions set category_id=?, category_source=? where id=?").run(c.categoryId, c.source, t.transaction_id);
    }
    return "modified" as const;
  }
  const c = categorize(d, { name: t.name, merchant, plaidPrimary: pfc?.primary, plaidDetailed: pfc?.detailed, amountCents });
  d.prepare(
    `insert into transactions(id,account_id,date,name,merchant,amount_cents,pending,plaid_primary,plaid_detailed,category_id,category_source,created_at)
     values(?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(t.transaction_id, t.account_id, t.date, t.name, merchant, amountCents, t.pending ? 1 : 0, pfc?.primary ?? null, pfc?.detailed ?? null, c.categoryId, c.source, new Date().toISOString());
  return "added" as const;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function syncItem(d: DB, item: { id: string; access_token: string; cursor: string | null }) {
  const plaid = requirePlaid();
  const startCursor = item.cursor ?? undefined;
  const counts = { added: 0, modified: 0, removed: 0 };
  let attempts = 0;
  for (;;) {
    try {
      const staged = { added: [] as PlaidTxn[], modified: [] as PlaidTxn[], removed: [] as string[] };
      let next = startCursor;
      let accounts: AccountBase[] = [];
      let more = true;
      while (more) {
        const res = await plaid.transactionsSync({ access_token: item.access_token, cursor: next, count: 500 });
        staged.added.push(...res.data.added);
        staged.modified.push(...res.data.modified);
        staged.removed.push(...res.data.removed.map((r) => r.transaction_id!).filter(Boolean));
        accounts = res.data.accounts;
        next = res.data.next_cursor;
        more = res.data.has_more;
      }
      // Balances: try the live balance call first, fall back to the cached ones that came with the sync.
      try {
        const b = await plaid.accountsBalanceGet({ access_token: item.access_token });
        accounts = b.data.accounts;
      } catch { /* cached balances from transactionsSync are fine */ }
      transaction(d, () => {
        upsertAccounts(d, item.id, accounts);
        for (const t of staged.added) counts[upsertTxn(d, t)]++;
        for (const t of staged.modified) { upsertTxn(d, t); counts.modified++; }
        const del = d.prepare("delete from transactions where id=?");
        for (const id of staged.removed) { del.run(id); counts.removed++; }
        d.prepare("update items set cursor=?, last_synced_at=?, error=null where id=?").run(next ?? null, new Date().toISOString(), item.id);
      });
      return counts;
    } catch (err: any) {
      const code = err?.response?.data?.error_code;
      if (code === "PRODUCT_NOT_READY" && attempts++ < 8) { await sleep(3000); continue; }
      if (code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" && attempts++ < 3) continue;
      throw err;
    }
  }
}

async function run(trigger: string): Promise<SyncResult> {
  const d = db();
  const started = new Date().toISOString();
  d.prepare("insert into sync_log(started_at,trigger,status) values(?,?, 'running')").run(started, trigger);
  const logId = d.prepare("select max(id) as id from sync_log").get().id;
  const finish = (r: SyncResult) => {
    d.prepare("update sync_log set finished_at=?,status=?,added=?,modified=?,removed=?,categorized=?,message=? where id=?")
      .run(new Date().toISOString(), r.ok ? "ok" : "error", r.added, r.modified, r.removed, r.categorized, r.message, logId);
    return r;
  };
  const none = { added: 0, modified: 0, removed: 0, categorized: 0 };
  if (isDemo()) return finish({ ok: true, message: "Demo mode: the made-up data has nothing to pull. Turn demo mode off to sync a real bank.", ...none });
  if (!plaidConfigured()) return finish({ ok: false, message: "Plaid keys are not set. Open Setup and add them.", ...none });
  const items = d.prepare("select id,institution,access_token,cursor from items").all();
  if (!items.length) return finish({ ok: false, message: "No bank is connected yet. Open Setup and connect one.", ...none });
  const total = { added: 0, modified: 0, removed: 0 };
  const errors: string[] = [];
  for (const item of items) {
    try {
      const c = await syncItem(d, item);
      total.added += c.added; total.modified += c.modified; total.removed += c.removed;
    } catch (err) {
      const msg = plaidErrorMessage(err);
      errors.push(`${item.institution ?? "A bank"}: ${msg}`);
      d.prepare("update items set error=? where id=?").run(msg, item.id);
    }
  }
  const categorized = await llmCategorize(d);
  const ok = errors.length === 0;
  const message = ok
    ? `Pulled ${total.added} new, ${total.modified} changed and ${total.removed} deleted transactions.${categorized ? ` The AI step placed ${categorized}.` : ""}`
    : errors.join(" | ");
  return finish({ ok, message, ...total, categorized });
}

/** Run one sync at a time. A second call while one is running waits for the same result. */
export function runSync(trigger: "manual" | "daily" | "connect" | "cli"): Promise<SyncResult> {
  if (g.__syncing) return g.__syncing;
  const p = run(trigger).finally(() => { g.__syncing = undefined; });
  g.__syncing = p;
  return p;
}

export function isSyncing(): boolean {
  return !!g.__syncing;
}

export function lastSync(d: DB = db()) {
  return d.prepare("select * from sync_log where status!='running' order by id desc limit 1").get() ?? null;
}

/** Used by the daily scheduler so a missed run catches up the next time the app is open. */
export function markScheduled(d: DB, date: string) { setSetting(d, "last_scheduled_date", date); }
export function lastScheduled(d: DB) { return getSetting(d, "last_scheduled_date"); }
