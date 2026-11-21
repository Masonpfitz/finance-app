import fs from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const ENV_PATH = path.join(ROOT, ".env");
export const DATA_DIR = path.join(ROOT, "data");

/** Write (or update) KEY=value lines in .env, keep every other line, and apply the values to
 *  the running process so the app does not need a restart. */
export function writeEnv(values: Record<string, string>): void {
  let lines: string[] = [];
  if (fs.existsSync(ENV_PATH)) lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  else if (fs.existsSync(path.join(ROOT, ".env.example"))) lines = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8").split(/\r?\n/);
  for (const [key, raw] of Object.entries(values)) {
    const value = String(raw).replace(/[\r\n]/g, "");
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
    process.env[key] = value;
  }
  fs.writeFileSync(ENV_PATH, lines.join("\n").replace(/\n*$/, "\n"), { mode: 0o600 });
}

const PLACEHOLDERS = new Set(["", "your_client_id_here", "your_secret_here"]);

export function plaidConfigured(): boolean {
  return !PLACEHOLDERS.has(process.env.PLAID_CLIENT_ID ?? "") && !PLACEHOLDERS.has(process.env.PLAID_SECRET ?? "");
}

export function plaidEnvName(): "sandbox" | "production" {
  return process.env.PLAID_ENV === "production" ? "production" : "sandbox";
}

export function syncHour(): number {
  const n = Number(process.env.SYNC_HOUR);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : 6;
}

export function llmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}
