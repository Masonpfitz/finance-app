import { db, isDemo } from "./db";
import { runSync, lastScheduled, markScheduled } from "./sync";
import { syncHour, plaidConfigured } from "./env";
import { isoDate } from "./utils";

/**
 * The daily job. It lives inside the running app: once a minute it checks whether the sync
 * hour (6 AM by default, set SYNC_HOUR in .env) has passed today and whether today's sync has
 * run. If the computer was asleep at 6 AM, the sync runs as soon as the app is awake and
 * running. The app has to be running for this to work, which is why the README explains how
 * to keep it running.
 */
const g = globalThis as unknown as { __schedulerStarted?: boolean };

export async function tick(now = new Date()): Promise<"ran" | "skipped"> {
  if (isDemo() || !plaidConfigured()) return "skipped";
  const d = db();
  if (now.getHours() < syncHour()) return "skipped";
  const today = isoDate(now);
  if (lastScheduled(d) === today) return "skipped";
  const hasItems = d.prepare("select count(*) as c from items").get().c > 0;
  if (!hasItems) return "skipped";
  markScheduled(d, today);
  const r = await runSync("daily");
  console.log(`[daily sync] ${r.ok ? "ok" : "error"}: ${r.message}`);
  return "ran";
}

export function startScheduler() {
  if (g.__schedulerStarted) return;
  g.__schedulerStarted = true;
  const safe = () => tick().catch((e) => console.error("[daily sync] failed:", e?.message ?? e));
  setTimeout(safe, 15_000); // catch up shortly after the app starts
  setInterval(safe, 60_000).unref?.();
  console.log(`[daily sync] scheduled for ${syncHour()}:00 local time, checked every minute while the app runs.`);
}
