#!/usr/bin/env node
// Starts the app. Works the same on Mac, Windows and Linux: plain Node, no bash or PowerShell.
//
//   npm start            build if needed, then start on http://localhost:3000 and open it
//   npm run demo         same, with made-up demo data switched on for this run
//   npm run dev          development mode (slower, reloads when you edit code)
//
// Options: --dev, --demo, --no-open

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const args = new Set(process.argv.slice(2));

// 1. Node version. The app stores data with the SQLite built into Node 22.13 and newer.
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`\nThis app needs Node 22.13 or newer, and you have ${process.versions.node}.`);
  console.error("Install the current LTS version from https://nodejs.org, then open a new terminal and try again.\n");
  process.exit(1);
}

// 2. .env: create it from the example the first time.
const envPath = path.join(root, ".env");
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(root, ".env.example"), envPath);
  try { fs.chmodSync(envPath, 0o600); } catch { /* Windows has no chmod */ }
  console.log("Created your .env file from .env.example.");
}
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const port = Number(process.env.PORT || env.PORT) || 3000;

// 3. Dependencies.
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) {
  console.log("Installing the app's dependencies (one time, a minute or two)...");
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install"], { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) { console.error("npm install failed. Scroll up for the reason."); process.exit(1); }
}

const dev = args.has("--dev");
const childEnv = { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" };
if (args.has("--demo")) childEnv.DEMO_MODE = "1";

// 4. Build once for the fast production start. Rebuild if any source file is newer than the last build.
if (!dev) {
  const stamp = path.join(root, ".next", "BUILD_ID");
  const newest = (dir) => {
    let t = 0;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
    }
    return t;
  };
  const sources = Math.max(newest(path.join(root, "src")), fs.statSync(path.join(root, "package.json")).mtimeMs);
  if (!fs.existsSync(stamp) || fs.statSync(stamp).mtimeMs < sources) {
    console.log("Building the app (one time, about a minute)...");
    const r = spawnSync(process.execPath, [nextBin, "build"], { stdio: "inherit", env: childEnv });
    if (r.status !== 0) { console.error("The build failed. Scroll up for the reason."); process.exit(1); }
  }
}

// 5. Start, listening on this computer only.
const server = spawn(process.execPath, [nextBin, dev ? "dev" : "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "inherit", env: childEnv });
server.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.kill(sig));

// 6. Open the browser once the server answers.
const url = `http://localhost:${port}/`;
if (!args.has("--no-open")) {
  const open = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  const tryOpen = async () => {
    for (let i = 0; i < 120; i++) {
      try { await fetch(url, { signal: AbortSignal.timeout(1500) }); break; } catch { await new Promise((r) => setTimeout(r, 1000)); }
    }
    try { spawn(open[0], open[1], { stdio: "ignore", detached: true }).on("error", () => {}).unref(); } catch { /* the URL is printed below */ }
  };
  tryOpen();
}
console.log(`\nFinance App is starting at ${url}\nLeave this window open while you use it. Press Ctrl+C to stop.\n`);
