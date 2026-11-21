#!/usr/bin/env node
// Runs one sync through the running app. Handy if you'd rather trigger the daily job from your
// computer's own scheduler (cron on Mac, Task Scheduler on Windows) than rely on the app's built-in one.
// The app must be running. Usage: npm run sync

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let port = Number(process.env.PORT) || 0;
if (!port) {
  try {
    const m = fs.readFileSync(path.join(root, ".env"), "utf8").match(/^PORT=(\d+)/m);
    if (m) port = Number(m[1]);
  } catch { /* no .env yet */ }
}
port ||= 3000;

try {
  const res = await fetch(`http://127.0.0.1:${port}/api/sync`, {
    method: "POST",
    // The app only accepts JSON writes that say they come from its own address.
    headers: { "content-type": "application/json", origin: `http://127.0.0.1:${port}` },
    body: "{}",
  });
  const r = await res.json();
  console.log(r.ok ? "Sync finished." : "Sync did not finish cleanly.", r.message);
  process.exit(r.ok ? 0 : 1);
} catch {
  console.error(`Couldn't reach the app on port ${port}. Start it with "npm start" first.`);
  process.exit(1);
}
