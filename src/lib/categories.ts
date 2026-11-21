export type Kind = "expense" | "income" | "transfer";
export interface Category { id: string; name: string; kind: Kind; color: number }

/** color is an index into CATEGORY_PALETTE (12 hues) or -1 for the neutral slate. */
export const CATEGORIES: Category[] = [
  { id: "groceries", name: "Groceries", kind: "expense", color: 10 },
  { id: "dining", name: "Dining", kind: "expense", color: 7 },
  { id: "transport", name: "Transport", kind: "expense", color: 1 },
  { id: "shopping", name: "Shopping", kind: "expense", color: 5 },
  { id: "subscriptions", name: "Subscriptions", kind: "expense", color: 3 },
  { id: "housing", name: "Rent and mortgage", kind: "expense", color: 2 },
  { id: "bills", name: "Bills and utilities", kind: "expense", color: 0 },
  { id: "health", name: "Health", kind: "expense", color: 6 },
  { id: "travel", name: "Travel", kind: "expense", color: 4 },
  { id: "entertainment", name: "Entertainment", kind: "expense", color: 9 },
  { id: "personal", name: "Personal care", kind: "expense", color: 8 },
  { id: "fees", name: "Fees and interest", kind: "expense", color: 11 },
  { id: "gifts", name: "Gifts and donations", kind: "expense", color: 5 },
  { id: "other", name: "Other", kind: "expense", color: -1 },
  { id: "income", name: "Income", kind: "income", color: 10 },
  { id: "transfer", name: "Transfers", kind: "transfer", color: -1 },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** The category palette: distinct hues, each with a gradient (hi, base, lo) and a text colour
 *  that clears 4.5:1 on every stop. Identity colours are the same in light and dark. */
export const CATEGORY_PALETTE = [
  { hi: "#3994a9", base: "#3090a6", lo: "#2b8ca2", ink: "#14171a" },
  { hi: "#3b67af", base: "#305da6", lo: "#26539b", ink: "#ffffff" },
  { hi: "#3f3daf", base: "#3730a6", lo: "#30249b", ink: "#ffffff" },
  { hi: "#743daf", base: "#6b30a6", lo: "#61249b", ink: "#ffffff" },
  { hi: "#a83faf", base: "#9e30a6", lo: "#93239b", ink: "#ffffff" },
  { hi: "#b03e85", base: "#a6307b", lo: "#9b2471", ink: "#ffffff" },
  { hi: "#b03d51", base: "#a63047", lo: "#9a243e", ink: "#ffffff" },
  { hi: "#b0583c", base: "#a64d30", lo: "#9b4326", ink: "#ffffff" },
  { hi: "#a98439", base: "#a68030", lo: "#a27c2b", ink: "#14171a" },
  { hi: "#a3b142", base: "#99a630", lo: "#8f9b21", ink: "#14171a" },
  { hi: "#71b041", base: "#65a630", lo: "#5b9b22", ink: "#14171a" },
  { hi: "#44b040", base: "#32a630", lo: "#239b23", ink: "#14171a" },
];
export const NEUTRAL_SWATCH = { hi: "#617075", base: "#57666b", lo: "#4e5c61", ink: "#ffffff" };

export function swatch(color: number) {
  return color >= 0 ? CATEGORY_PALETTE[color % CATEGORY_PALETTE.length] : NEUTRAL_SWATCH;
}
