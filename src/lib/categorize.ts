import type { DB } from "./db";
import { CATEGORY_BY_ID } from "./categories";
import { llmEnabled } from "./env";

export type Source = "user" | "rule" | "plaid" | "llm" | "fallback";
export interface TxnInput {
  name: string;
  merchant?: string | null;
  plaidPrimary?: string | null;
  plaidDetailed?: string | null;
  /** Negative = money out. */
  amountCents: number;
}

/** A stable key for "the same merchant": lower case, no store numbers or punctuation, first two words. */
export function merchantKey(name: string, merchant?: string | null): string {
  const base = (merchant || name || "").toLowerCase();
  const words = base
    .replace(/[0-9#*_\-./\\]+/g, " ")
    .replace(/[^a-z& ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !["the", "inc", "llc", "co", "pos", "debit", "purchase", "payment", "card", "online"].includes(w));
  return words.slice(0, 2).join(" ");
}

/** Built-in rules, checked in order. They run before Plaid's own category because a few
 *  things (subscriptions, card payments) are clearer from the name than from Plaid's guess. */
const RULES: Array<[RegExp, string]> = [
  [/\b(payment (to|-)?\s*(credit card|card)|autopay|payment thank you|credit card payment|online transfer|zelle|venmo cashout|transfer (to|from))\b/i, "transfer"],
  [/\b(payroll|direct dep|salary|paycheck|interest paid|interest earned)\b/i, "income"],
  [/\b(netflix|spotify|hulu|disney\+?|disney plus|max\.com|hbo|apple\.com\/bill|icloud|youtube ?(premium|tv)|prime video|patreon|substack|dropbox|notion|openai|chatgpt|anthropic|claude\.ai|github|adobe|1password|nordvpn|audible|kindle unlimited|duolingo|peloton|membership)\b/i, "subscriptions"],
  [/\b(whole foods|trader joe|kroger|safeway|publix|aldi|costco|wegmans|h-e-b|heb |sprouts|food lion|giant|stop & shop|market basket|instacart|grocery|supermarket)\b/i, "groceries"],
  [/\b(starbucks|dunkin|chipotle|mcdonald|chick-fil-a|taco bell|wendy|burger king|subway|panera|domino|pizza|doordash|uber ?eats|grubhub|restaurant|cafe|coffee|diner|grill|kitchen|bakery|bar &|tavern|sushi|taqueria|deli)\b/i, "dining"],
  [/\b(uber|lyft|shell|chevron|exxon|bp |sunoco|wawa|gas station|fuel|parking|metro|transit|mta|amtrak|toll|ez ?pass)\b/i, "transport"],
  [/\b(delta air|united air|american air|southwest|jetblue|airbnb|marriott|hilton|hyatt|expedia|booking\.com|hotel|airlines?)\b/i, "travel"],
  [/\b(rent|mortgage|hoa|property management)\b/i, "housing"],
  [/\b(electric|energy|water|sewer|gas bill|internet|comcast|xfinity|spectrum|verizon|at&t|t-mobile|insurance|geico|progressive|state farm)\b/i, "bills"],
  [/\b(cvs|walgreens|pharmacy|clinic|hospital|dental|dentist|doctor|medical|urgent care|labcorp|quest diag|optical)\b/i, "health"],
  [/\b(amazon|amzn|target|walmart|best buy|ikea|home depot|lowe's|lowes|etsy|ebay|nike|apple store|old navy|h&m|zara|nordstrom|tj maxx|marshalls)\b/i, "shopping"],
  [/\b(amc|regal|cinema|theatre|theater|ticketmaster|steam|playstation|xbox|nintendo|concert|museum|bowling)\b/i, "entertainment"],
  [/\b(salon|barber|spa|nail|sephora|ulta|gym|fitness|planet fitness|massage)\b/i, "personal"],
  [/\b(overdraft|atm fee|service fee|monthly fee|late fee|finance charge|interest charge|annual fee)\b/i, "fees"],
  [/\b(donation|charity|red cross|gofundme|church|unicef)\b/i, "gifts"],
];

/** Map Plaid's personal_finance_category onto our categories. */
export function fromPlaid(primary?: string | null, detailed?: string | null): string | null {
  if (!primary) return null;
  const d = detailed ?? "";
  switch (primary) {
    case "INCOME": return "income";
    case "TRANSFER_IN":
    case "TRANSFER_OUT": return "transfer";
    // A card payment just moves money you already spent; a mortgage or car payment is a real cost.
    case "LOAN_PAYMENTS": return !d || d.includes("CREDIT_CARD") ? "transfer" : d.includes("MORTGAGE") ? "housing" : "bills";
    case "BANK_FEES": return "fees";
    case "ENTERTAINMENT": return "entertainment";
    case "FOOD_AND_DRINK": return d.includes("GROCER") ? "groceries" : "dining";
    case "GENERAL_MERCHANDISE": return "shopping";
    case "HOME_IMPROVEMENT": return "shopping";
    case "MEDICAL": return "health";
    case "PERSONAL_CARE": return "personal";
    case "GENERAL_SERVICES": return "bills";
    case "GOVERNMENT_AND_NON_PROFIT": return d.includes("DONATION") ? "gifts" : "bills";
    case "TRANSPORTATION": return "transport";
    case "TRAVEL": return "travel";
    case "RENT_AND_UTILITIES": return d === "RENT_AND_UTILITIES_RENT" ? "housing" : "bills";
    default: return null;
  }
}

/** Decide a category without any network call. Order: what you taught it, built-in rules, Plaid, Other. */
export function categorize(d: DB, t: TxnInput): { categoryId: string; source: Source } {
  const key = merchantKey(t.name, t.merchant);
  if (key) {
    const learned = d.prepare("select category_id from merchant_rules where key=?").get(key);
    if (learned && CATEGORY_BY_ID.has(learned.category_id)) return { categoryId: learned.category_id, source: "user" };
  }
  const text = `${t.name} ${t.merchant ?? ""}`;
  for (const [re, cat] of RULES) if (re.test(text)) {
    // A deposit that looks like a purchase (a refund) stays out of income and transfers rules above.
    return { categoryId: cat, source: "rule" };
  }
  const p = fromPlaid(t.plaidPrimary, t.plaidDetailed);
  if (p) return { categoryId: p, source: "plaid" };
  if (t.amountCents > 0) return { categoryId: "income", source: "fallback" };
  return { categoryId: "other", source: "fallback" };
}

/** Optional: ask Claude to place transactions the rules and Plaid could not. Only runs when
 *  ANTHROPIC_API_KEY is set. A failure here never breaks a sync. Returns how many it placed. */
export async function llmCategorize(d: DB, limit = 80): Promise<number> {
  if (!llmEnabled()) return 0;
  const rows = d
    .prepare("select id,name,merchant,amount_cents from transactions where category_source='fallback' and category_id='other' limit ?")
    .all(limit);
  if (!rows.length) return 0;
  const allowed = [...CATEGORY_BY_ID.values()].map((c) => `${c.id} (${c.name})`).join(", ");
  const list = rows.map((r) => `${r.id}\t${r.merchant || r.name}\t${(r.amount_cents / 100).toFixed(2)}`).join("\n");
  const prompt =
    `Assign each bank transaction to exactly one category id from: ${allowed}.\n` +
    `Negative amounts are money out. Reply with only a JSON object mapping each transaction id to a category id.\n\n${list}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return 0;
    const json = await res.json();
    const text: string = json?.content?.[0]?.text ?? "";
    const map = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, string>;
    const upd = d.prepare("update transactions set category_id=?, category_source='llm' where id=? and category_source='fallback'");
    let n = 0;
    for (const r of rows) {
      const c = map[r.id];
      if (c && c !== "other" && CATEGORY_BY_ID.has(c)) { upd.run(c, r.id); n++; }
    }
    return n;
  } catch {
    return 0;
  }
}
