import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows its own text-* sizes and would treat our custom ones as colours,
// silently deleting a size when a colour class sits beside it. Teach it our scales.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["label", "body", "lead", "title", "figure", "figure-sm"] }],
      rounded: [{ rounded: ["surface", "panel", "section", "control", "pill"] }],
      shadow: [{ shadow: ["card", "raised", "pop"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Cents to a dollar string. Sign is written as a minus; callers decide about a plus. */
export function usd(cents: number, opts: { cents?: boolean } = {}): string {
  const abs = Math.abs(cents) / 100;
  const s = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
  return cents < 0 ? `−${s}` : s;
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isoDate(d = new Date()): string {
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(key: string, long = true): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: long ? "long" : "short", year: long ? "numeric" : undefined });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
