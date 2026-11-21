import type { DB } from "./db";
import { getSetting, setSetting, transaction } from "./db";
import { categorize } from "./categorize";
import { isoDate } from "./utils";

/**
 * Demo mode: made-up accounts and about six months of made-up transactions. Nothing here is
 * real. The numbers come from a fixed random seed, so the demo looks the same every time;
 * only the dates move so it always ends today.
 */

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Seed { id: string; account: string; date: string; name: string; merchant?: string; cents: number; primary?: string; detailed?: string; pending?: boolean }

const DAYS = 185;

function addDays(base: Date, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }

export function buildDemoTransactions(today = new Date()): { txns: Seed[]; opening: Record<string, number> } {
  const r = rng(20260101);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const between = (lo: number, hi: number) => Math.round((lo + r() * (hi - lo)) * 100);
  const txns: Seed[] = [];
  let n = 0;
  const add = (account: string, date: Date, name: string, cents: number, extra: Partial<Seed> = {}) =>
    txns.push({ id: `demo-${++n}`, account, date: isoDate(date), name, cents, ...extra });

  const start = addDays(today, -DAYS);
  const spendCard = "demo-card";
  const checking = "demo-checking";
  const savings = "demo-savings";
  let cardOwed = 0;

  for (let i = 0; i <= DAYS; i++) {
    const d = addDays(start, i);
    const dom = d.getDate();
    const dow = d.getDay();
    // Income every second Friday.
    if (dow === 5 && Math.floor(i / 7) % 2 === 0) add(checking, d, "BRIGHTSIDE STUDIO PAYROLL", 315000, { primary: "INCOME", detailed: "INCOME_WAGES" });
    if (dom === 1) add(checking, d, "MAPLE COURT APARTMENTS RENT", -185000, { primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_RENT" });
    if (dom === 4) add(checking, d, "CITY POWER AND LIGHT", -between(88, 142), { primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY" });
    if (dom === 9) add(checking, d, "SPECTRUM INTERNET", -6500, { primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_INTERNET_AND_CABLE" });
    if (dom === 12) add(checking, d, "NORTHSTAR MOBILE", -5500, { primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_TELEPHONE" });
    if (dom === 6) add(spendCard, d, "NETFLIX.COM", -1549, { primary: "ENTERTAINMENT" });
    if (dom === 8) add(spendCard, d, "SPOTIFY USA", -1199, { primary: "ENTERTAINMENT" });
    if (dom === 14) add(spendCard, d, "APPLE.COM/BILL", -299);
    if (dom === 17) add(spendCard, d, "OPENAI CHATGPT SUBSCR", -2000);
    if (dom === 20) add(spendCard, d, "IRONWORKS FITNESS MEMBERSHIP", -3999, { primary: "PERSONAL_CARE", detailed: "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS" });
    if (dom === 3) add(checking, d, "TRANSFER TO HIGH-YIELD SAVINGS", -90000, { primary: "TRANSFER_OUT" }), add(savings, d, "TRANSFER FROM EVERYDAY CHECKING", 90000, { primary: "TRANSFER_IN" });
    if (dom === 28) add(savings, d, "INTEREST PAID", between(21, 33), { primary: "INCOME", detailed: "INCOME_INTEREST_EARNED" });

    if (dom === 15) {
      // Pay the card off in full from checking, the way the statement works.
      const pay = Math.max(0, cardOwed);
      if (pay > 0) {
        add(checking, d, "PAYMENT TO REWARDS VISA", -pay, { primary: "LOAN_PAYMENTS", detailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" });
        add(spendCard, d, "PAYMENT THANK YOU", pay, { primary: "LOAN_PAYMENTS", detailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" });
        cardOwed = 0;
      }
    }

    const card = (name: string, cents: number, extra: Partial<Seed> = {}) => { add(spendCard, d, name, cents, extra); cardOwed += -cents; };

    if (r() < 0.38) card(pick(["WHOLE FOODS MARKET", "TRADER JOE'S #512", "KROGER #0481", "ALDI 63021"]), -between(32, 128), { primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_GROCERIES" });
    const dines = r() < 0.55 ? 1 : 0;
    for (let k = 0; k < dines + (dow >= 5 && r() < 0.6 ? 1 : 0); k++) {
      const spot = pick(["STARBUCKS STORE 8821", "CHIPOTLE 2210", "BLUE DOOR BISTRO", "SQ *CORNER BAKERY", "DOORDASH*THAI GARDEN", "PIZZERIA NAPOLI", "SWEETGREEN", "HARBOR TAVERN"]);
      const big = /BISTRO|TAVERN|DOORDASH|NAPOLI/.test(spot);
      card(spot, -between(big ? 24 : 6, big ? 78 : 18), { primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_RESTAURANT" });
    }
    if (r() < 0.2) card(pick(["UBER TRIP", "LYFT RIDE", "SHELL OIL 5742", "CITY PARKING GARAGE"]), -between(7, 52), { primary: "TRANSPORTATION" });
    if (r() < 0.26) card(pick(["AMAZON.COM*2K4LP", "AMZN MKTP US", "TARGET 00012", "BEST BUY 0231", "ETSY.COM"]), -between(12, 140), { primary: "GENERAL_MERCHANDISE" });
    if (r() < 0.05) card(pick(["CVS/PHARMACY #4410", "BRIGHT SMILE DENTAL", "WALGREENS #2210"]), -between(9, 120), { primary: "MEDICAL" });
    if (r() < 0.04) card(pick(["AMC THEATRES 0932", "TICKETMASTER", "LANEWAY BOWLING"]), -between(18, 90), { primary: "ENTERTAINMENT" });
    if (r() < 0.025) card(pick(["SQ *J AND D LLC", "PAYPAL *DESIGNCO", "ACH WEBPMT 55120"]), -between(15, 95));
    if (r() < 0.03) card("ATM CASH ADVANCE FEE", -350, { primary: "BANK_FEES" });
  }
  // One trip about two months ago.
  const trip = addDays(today, -62);
  const tripCard = (day: number, name: string, cents: number, p?: string) => { add(spendCard, addDays(trip, day), name, cents, p ? { primary: p } : {}); };
  tripCard(0, "DELTA AIR LINES 0062391", -41800, "TRAVEL");
  tripCard(1, "AIRBNB * HM4K2", -62500, "TRAVEL");
  tripCard(3, "COASTLINE SEAFOOD HOUSE", -9400, "FOOD_AND_DRINK");
  tripCard(4, "DELTA AIR LINES 0062412", -41800, "TRAVEL");
  // Today and yesterday: a couple still pending.
  txns.push({ id: `demo-${++n}`, account: spendCard, date: isoDate(today), name: "STARBUCKS STORE 8821", cents: -645, primary: "FOOD_AND_DRINK", pending: true });
  txns.push({ id: `demo-${++n}`, account: spendCard, date: isoDate(addDays(today, -1)), name: "WHOLE FOODS MARKET", cents: -8412, primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_GROCERIES", pending: true });

  return { txns, opening: { [checking]: 150000, [savings]: 1160000, [spendCard]: 0, "demo-brokerage": 1824000 } };
}

export function ensureDemoSeed(d: DB, today = new Date()): void {
  const stamp = isoDate(today);
  if (getSetting(d, "seeded_on") === stamp && d.prepare("select count(*) as c from accounts").get().c > 0) return;
  const { txns, opening } = buildDemoTransactions(today);
  transaction(d, () => {
    for (const t of ["transactions", "accounts", "balance_history", "items", "merchant_rules", "sync_log"]) d.exec(`delete from ${t}`);
    const now = new Date().toISOString();
    d.prepare("insert into items(id,institution,access_token,created_at,last_synced_at) values('demo-item','Demo Bank','demo',?,?)").run(now, now);
    const insT = d.prepare(
      `insert into transactions(id,account_id,date,name,merchant,amount_cents,pending,plaid_primary,plaid_detailed,category_id,category_source,created_at)
       values(?,?,?,?,?,?,?,?,?,?,?,?)`,
    );
    for (const t of txns) {
      const c = categorize(d, { name: t.name, merchant: t.merchant, plaidPrimary: t.primary, plaidDetailed: t.detailed, amountCents: t.cents });
      insT.run(t.id, t.account, t.date, t.name, t.merchant ?? null, t.cents, t.pending ? 1 : 0, t.primary ?? null, t.detailed ?? null, c.categoryId, c.source, now);
    }
    // Balances = opening balance plus everything that happened since. Credit balances are what is owed.
    const sum = (acct: string) => txns.filter((t) => t.account === acct).reduce((s, t) => s + t.cents, 0);
    const defs = [
      { id: "demo-checking", name: "Everyday Checking", mask: "4821", type: "depository", subtype: "checking" },
      { id: "demo-savings", name: "High-Yield Savings", mask: "9034", type: "depository", subtype: "savings" },
      { id: "demo-card", name: "Rewards Visa", mask: "1177", type: "credit", subtype: "credit card" },
      { id: "demo-brokerage", name: "Brokerage", mask: "5520", type: "investment", subtype: "brokerage" },
    ];
    const insA = d.prepare("insert into accounts(id,item_id,name,mask,type,subtype,balance_cents,available_cents,currency,updated_at) values(?,?,?,?,?,?,?,?,'USD',?)");
    const insH = d.prepare("insert into balance_history(date,account_id,balance_cents) values(?,?,?)");
    for (const a of defs) {
      const credit = a.type === "credit";
      const current = credit ? -sum(a.id) : (opening[a.id] ?? 0) + sum(a.id);
      insA.run(a.id, "demo-item", a.name, a.mask, a.type, a.subtype, current, credit ? null : current, now);
      // History, walked backwards from today.
      const byDate = new Map<string, number>();
      for (const t of txns.filter((x) => x.account === a.id)) byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.cents);
      let bal = current;
      for (let i = 0; i <= DAYS; i++) {
        const day = isoDate(addDays(today, -i));
        insH.run(day, a.id, bal);
        const delta = byDate.get(day) ?? 0;
        bal = credit ? bal + delta : bal - delta; // undo that day's activity to get the previous close
      }
    }
    d.prepare("insert into sync_log(started_at,finished_at,trigger,status,added,message) values(?,?, 'daily','ok',?, 'Demo data loaded. Nothing here is real.')").run(now, now, txns.length);
    setSetting(d, "seeded_on", stamp);
  });
}
