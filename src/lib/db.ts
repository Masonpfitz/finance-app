import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./env";
import { CATEGORIES } from "./categories";

// node:sqlite ships inside Node itself (22.13 and newer), so there is nothing to compile.
// process.getBuiltinModule keeps the bundler from trying to resolve it.
type Stmt = { all(...p: unknown[]): any[]; get(...p: unknown[]): any; run(...p: unknown[]): { changes: number | bigint } };
export type DB = { exec(sql: string): void; prepare(sql: string): Stmt };

const MODE_FILE = path.join(DATA_DIR, "mode.json");

export function isDemo(): boolean {
  const v = (process.env.DEMO_MODE ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  try {
    return JSON.parse(fs.readFileSync(MODE_FILE, "utf8")).demo === true;
  } catch {
    return false;
  }
}

export function setDemo(on: boolean): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MODE_FILE, JSON.stringify({ demo: on }));
}

/** True when the toggle comes from DEMO_MODE in .env, so the switch on the setup screen cannot change it. */
export function demoForcedByEnv(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.DEMO_MODE ?? "").trim().toLowerCase());
}

const SCHEMA = `
create table if not exists items(id text primary key, institution text, access_token text not null, cursor text, created_at text, last_synced_at text, error text);
create table if not exists accounts(id text primary key, item_id text, name text, mask text, type text, subtype text, balance_cents integer default 0, available_cents integer, currency text default 'USD', updated_at text, hidden integer default 0);
create table if not exists balance_history(date text, account_id text, balance_cents integer, primary key(date, account_id));
create table if not exists categories(id text primary key, name text, kind text, color integer);
create table if not exists transactions(id text primary key, account_id text, date text, name text, merchant text, amount_cents integer, pending integer default 0, plaid_primary text, plaid_detailed text, category_id text, category_source text, excluded integer default 0, created_at text);
create index if not exists tx_date on transactions(date);
create index if not exists tx_cat on transactions(category_id);
create table if not exists merchant_rules(key text primary key, category_id text);
create table if not exists sync_log(id integer primary key autoincrement, started_at text, finished_at text, trigger text, status text, added integer default 0, modified integer default 0, removed integer default 0, categorized integer default 0, message text);
create table if not exists settings(key text primary key, value text);
`;

const g = globalThis as unknown as { __dbs?: Map<string, DB> };

function open(file: string): DB {
  g.__dbs ??= new Map();
  const cached = g.__dbs.get(file);
  if (cached) return cached;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
  const raw = new DatabaseSync(file);
  // node:sqlite returns rows with a null prototype, which React can't pass to client components.
  // Copy each row into a plain object once, here, so nothing downstream has to remember.
  const plain = (r: any) => (r ? { ...r } : r);
  const db: DB = {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => {
      const st = raw.prepare(sql);
      return { all: (...p) => st.all(...p).map(plain), get: (...p) => plain(st.get(...p)), run: (...p) => st.run(...p) };
    },
  };
  db.exec("pragma journal_mode = WAL; pragma foreign_keys = off;");
  db.exec(SCHEMA);
  const ins = db.prepare("insert into categories(id,name,kind,color) values(?,?,?,?) on conflict(id) do update set name=excluded.name,kind=excluded.kind,color=excluded.color");
  for (const c of CATEGORIES) ins.run(c.id, c.name, c.kind, c.color);
  g.__dbs.set(file, db);
  return db;
}

/** The database for the current mode. Demo data lives in its own file, so it never mixes with real data. */
export function db(): DB {
  const file = path.join(DATA_DIR, isDemo() ? "demo.db" : "finance.db");
  const d = open(file);
  if (isDemo()) {
    // Lazy import keeps the seeder out of the live path.
    const { ensureDemoSeed } = require("./demo") as typeof import("./demo");
    ensureDemoSeed(d);
  }
  return d;
}

export function transaction<T>(d: DB, fn: () => T): T {
  d.exec("begin");
  try {
    const r = fn();
    d.exec("commit");
    return r;
  } catch (e) {
    d.exec("rollback");
    throw e;
  }
}

export function getSetting(d: DB, key: string): string | null {
  return d.prepare("select value from settings where key=?").get(key)?.value ?? null;
}
export function setSetting(d: DB, key: string, value: string): void {
  d.prepare("insert into settings(key,value) values(?,?) on conflict(key) do update set value=excluded.value").run(key, value);
}
