#!/usr/bin/env node
// Checks that the running app refuses writes it shouldn't accept. Start the app first (npm start),
// then run: npm run check:security
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let port = Number(process.env.PORT) || 0;
if (!port) {
  try { const m = fs.readFileSync(path.join(root, ".env"), "utf8").match(/^PORT=(\d+)/m); if (m) port = Number(m[1]); } catch { /* no .env */ }
}
port ||= 3000;
const base = `http://127.0.0.1:${port}`;
const own = base;
const json = { "content-type": "application/json" };
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`); };
// A harmless write: demo-mode switch to its current value is not needed, so use a path that reads nothing.
const WRITE = "/api/setup/mode";
const post = (headers, body = "{}") => fetch(base + WRITE, { method: "POST", headers, body });

try {
  const before = await fetch(base + "/api/status").then((r) => r.json());
  let r;
  r = await post({ ...json, origin: "http://localhost:9999" });
  check("write from http://localhost:9999 is refused", r.status === 403, `status ${r.status}`);
  r = await post({ ...json, origin: "http://127.0.0.1:9999" });
  check("write from another 127.0.0.1 port is refused", r.status === 403, `status ${r.status}`);
  r = await post({ ...json, origin: "https://evil.example.com" });
  check("write from another website is refused", r.status === 403, `status ${r.status}`);
  r = await post({ ...json });
  check("write with no Origin and no Sec-Fetch-Site is refused", r.status === 403, `status ${r.status}`);
  r = await post({ "content-type": "text/plain", origin: own });
  check("write that isn't JSON is refused", r.status === 415, `status ${r.status}`);
  r = await fetch(base + WRITE, { method: "OPTIONS", headers: { origin: "http://localhost:9999", "access-control-request-method": "POST", "access-control-request-headers": "content-type" } });
  check("preflight from another origin is refused and sends no CORS headers", r.status === 403 && !r.headers.get("access-control-allow-origin"), `status ${r.status}`);
  r = await fetch(base + "/api/status", { headers: { origin: "http://localhost:9999" } });
  check("no read response carries Access-Control-Allow-Origin", !r.headers.get("access-control-allow-origin"));
  // fetch() won't let a script change the Host header, so use a raw request for this one.
  const hostStatus = await new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port, path: "/api/status", headers: { Host: "evil.example.com" } }, (res) => { res.resume(); resolve(res.statusCode); });
    req.on("error", () => resolve(0));
    req.end();
  });
  check("foreign Host header is refused", hostStatus === 403, `status ${hostStatus}`);
  r = await post({ ...json, origin: own }, JSON.stringify({ demo: before.demo }));
  check("write from the app's own origin is accepted", r.status === 200 || r.status === 409, `status ${r.status}`);
  r = await post({ ...json, "sec-fetch-site": "same-origin" }, JSON.stringify({ demo: before.demo }));
  check("write the browser marks same-origin is accepted", r.status === 200 || r.status === 409, `status ${r.status}`);
} catch {
  console.error(`Couldn't reach the app on port ${port}. Start it with "npm start" first.`);
  process.exit(2);
}
process.exit(failed ? 1 : 0);
