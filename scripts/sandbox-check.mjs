#!/usr/bin/env node
// Tries the whole connect-and-sync path against Plaid's Sandbox (fake banks), without opening Plaid Link.
// Needs: the app running (npm start), and your SANDBOX client ID and secret saved on the Setup page
// (Sandbox selected). It makes a fake "First Platypus Bank" connection with the login user_good, runs
// the first sync, runs Sync now, then disconnects it again. Usage: npm run sandbox-check

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
try {
  for (const l of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch { /* handled below */ }
const port = Number(process.env.PORT || env.PORT) || 3000;
const base = `http://127.0.0.1:${port}`;
const say = (ok, msg) => console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
const post = (p, body = {}) =>
  fetch(base + p, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(body) }).then((r) => r.json());

if (env.PLAID_ENV !== "sandbox" || !env.PLAID_CLIENT_ID || /your_/.test(env.PLAID_CLIENT_ID)) {
  console.error("Save your Sandbox keys on the Setup page first (pick Sandbox), then run this again.");
  process.exit(2);
}
try { await fetch(base + "/api/status"); } catch {
  console.error(`Couldn't reach the app on port ${port}. Start it with "npm start" first.`);
  process.exit(2);
}

// Plaid's own Sandbox shortcut for a bank connection, using the app's saved keys (never printed).
const pt = await fetch("https://sandbox.plaid.com/sandbox/public_token/create", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    client_id: env.PLAID_CLIENT_ID, secret: env.PLAID_SECRET, institution_id: "ins_109508",
    initial_products: ["transactions"], options: { override_username: "user_good", override_password: "pass_good" },
  }),
}).then((r) => r.json());
say(!!pt.public_token, "Plaid Sandbox gave a test bank connection");
if (!pt.public_token) { console.error(pt.error_message || "Plaid refused. Check that these are Sandbox keys."); process.exit(1); }

const ex = await post("/api/plaid/exchange", { public_token: pt.public_token, institution: "First Platypus Bank" });
say(ex.ok && ex.sync?.ok, `First sync: ${ex.sync?.message ?? ex.error}`);
const again = await post("/api/sync");
say(again.ok, `Sync now: ${again.message}`);
const status = await fetch(base + "/api/status").then((r) => r.json());
const item = status.banks.find((b) => b.institution === "First Platypus Bank");
if (item) {
  const gone = await post("/api/plaid/disconnect", { item_id: item.id });
  say(gone.ok, "Disconnected the test bank and removed its data");
}
process.exit(ex.ok && ex.sync?.ok && again.ok ? 0 : 1);
