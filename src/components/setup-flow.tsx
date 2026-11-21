"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "./button";
import { Icon, Spinner } from "./icon";
import { Panel } from "./page";
import { StatusPill } from "./status-pill";
import { AGENT_PROMPT } from "@/lib/agent-prompt";
import { cn } from "@/lib/utils";

export interface SetupState {
  demo: boolean;
  demoForcedByEnv: boolean;
  configured: boolean;
  plaidEnv: "sandbox" | "production";
  banks: { id: string; institution: string }[];
  llm: boolean;
  syncHourLabel: string;
}

declare global {
  interface Window { Plaid?: { create(cfg: unknown): { open(): void; destroy(): void } } }
}

function loadPlaidScript(): Promise<void> {
  if (window.Plaid) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Plaid's window. Check your internet connection and try again."));
    document.head.appendChild(s);
  });
}

function StepHead({ n, title, done, doneLabel }: { n: number; title: string; done?: boolean; doneLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-pill bg-track text-[13px] font-semibold text-ink-2">{n}</span>
        <h2 className="text-title font-medium">{title}</h2>
      </div>
      {done && <StatusPill tone="done">{doneLabel ?? "Done"}</StatusPill>}
    </div>
  );
}

const P = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("max-w-[68ch] text-body leading-relaxed text-ink-2", className)}>{children}</p>
);

export function SetupFlow({ state }: { state: SetupState }) {
  const router = useRouter();
  const [demoBusy, setDemoBusy] = React.useState(false);
  const [demoErr, setDemoErr] = React.useState<string | null>(null);

  const [env, setEnv] = React.useState<"sandbox" | "production">(state.plaidEnv);
  const [clientId, setClientId] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [keyMsg, setKeyMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const [linking, setLinking] = React.useState(false);
  const [linkMsg, setLinkMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const [copied, setCopied] = React.useState(false);

  async function toggleDemo() {
    setDemoBusy(true);
    setDemoErr(null);
    const res = await fetch("/api/setup/mode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: !state.demo }) });
    const j = await res.json();
    if (!j.ok) setDemoErr(j.error);
    setDemoBusy(false);
    router.refresh();
  }

  async function saveKeys(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setKeyMsg(null);
    const res = await fetch("/api/setup/plaid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId, secret, env }) });
    const j = await res.json();
    setSaving(false);
    if (j.ok) {
      setClientId("");
      setSecret("");
      setKeyMsg({ ok: true, text: "Plaid accepted the keys and they're saved to your .env file." });
      router.refresh();
    } else setKeyMsg({ ok: false, text: j.error });
  }

  async function connect() {
    setLinking(true);
    setLinkMsg(null);
    try {
      const t = await fetch("/api/plaid/link-token", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.json());
      if (!t.link_token) throw new Error(t.error || "Plaid didn't give the app a link token.");
      await loadPlaidScript();
      const handler = window.Plaid!.create({
        token: t.link_token,
        onSuccess: async (publicToken: string, metadata: { institution?: { name?: string } }) => {
          setLinkMsg({ ok: true, text: "Connected. Pulling your balances and transactions now. This can take up to a minute." });
          const r = await fetch("/api/plaid/exchange", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ public_token: publicToken, institution: metadata?.institution?.name }) }).then((x) => x.json());
          if (r.ok) {
            setLinkMsg({ ok: !!r.sync?.ok, text: r.sync?.message ?? "Connected." });
            router.refresh();
          } else setLinkMsg({ ok: false, text: r.error ?? "Something went wrong saving the connection." });
          setLinking(false);
        },
        onExit: () => setLinking(false),
      });
      handler.open();
    } catch (err) {
      setLinkMsg({ ok: false, text: (err as Error).message });
      setLinking(false);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the text is selectable in the box */ }
  }

  const connected = state.banks.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Demo mode */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-title font-medium">Try it with made-up data first</h2>
            <P className="mt-1">
              Demo mode fills the app with fake accounts and about six months of fake transactions, so you can click around before you connect anything.
              It keeps the fake data in its own file, so your real data never mixes with it. Turn it off whenever you're ready.
            </P>
            {demoErr && <p role="alert" className="mt-2 text-[12px] text-rust">{demoErr}</p>}
            {state.demoForcedByEnv && <p className="mt-2 text-[12px] text-ink-2">Demo mode is switched on by <code className="font-mono">DEMO_MODE</code> in your .env file.</p>}
          </div>
          <div className="flex items-center gap-2">
            {state.demo && <LinkButton href="/" variant="outline">Open the dashboard</LinkButton>}
            <Button variant={state.demo ? "outline" : "primary"} onClick={toggleDemo} disabled={demoBusy || state.demoForcedByEnv}>
              {demoBusy && <Spinner />}
              {state.demo ? "Turn off demo mode" : "Turn on demo mode"}
            </Button>
          </div>
        </div>
      </Panel>

      {/* Step 1 */}
      <Panel>
        <StepHead n={1} title="Make a free Plaid account" />
        <P>
          Plaid is the service that lets this app see your bank. It can read your balances and your transactions. It can't move money, and this app never asks it to.
          Plaid's free Trial plan lets you connect up to 10 bank connections, which is plenty for one person. Removing a connection later doesn't give its slot back.
        </P>
        <P className="mt-2">
          Sign up with your email, then fill out the short application Plaid shows you. The Trial plan is for new Plaid accounts in the US and Canada, and approval can take a little while, so do this first.
          The Sandbox keys work right away, so you can finish the other steps while you wait.
        </P>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="https://dashboard.plaid.com/signup" external variant="primary">Create a Plaid account <Icon name="arrow-right" size={14} /></LinkButton>
          <LinkButton href="https://plaid.com/docs/account/billing/" external>How the Trial plan works</LinkButton>
        </div>
      </Panel>

      {/* Step 2 */}
      <Panel>
        <StepHead n={2} title="Paste your Plaid keys" done={state.configured} doneLabel={`Saved (${state.plaidEnv === "production" ? "Production" : "Sandbox"})`} />
        <P>
          In the Plaid dashboard, open the Keys page and copy your client ID and your secret. Pick Sandbox if you want to test with fake banks, or Production for your real bank, and use the secret that matches.
          When you save, the app checks the keys with Plaid and writes them to a file called <code className="font-mono">.env</code> on this computer. They aren't sent anywhere else.
        </P>
        <form onSubmit={saveKeys} className="mt-4 grid max-w-[560px] gap-3">
          <div role="radiogroup" aria-label="Environment" className="inline-flex h-10 w-fit items-center gap-0.5 rounded-pill bg-track p-1">
            {(["sandbox", "production"] as const).map((v) => (
              <button
                type="button" key={v} role="radio" aria-checked={env === v} onClick={() => setEnv(v)}
                className={cn("h-8 rounded-pill px-3.5 text-body font-medium", env === v ? "bg-track-on text-ink shadow-raised" : "text-ink-2 hover:text-ink")}
              >
                {v === "sandbox" ? "Sandbox (fake banks)" : "Production (real bank)"}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-label">
            Client ID
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" spellCheck={false} placeholder={state.configured ? "Saved. Paste a new one to replace it." : "From Plaid's Keys page"} className="h-9 rounded-control border border-line bg-card px-3 font-mono text-body text-ink placeholder:font-sans placeholder:text-ink-3" />
          </label>
          <label className="grid gap-1 text-label">
            Secret
            <input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder={state.configured ? "Saved. Paste a new one to replace it." : "The secret for the environment you picked"} className="h-9 rounded-control border border-line bg-card px-3 font-mono text-body text-ink placeholder:font-sans placeholder:text-ink-3" />
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={saving || !clientId || !secret}>{saving && <Spinner />}Check and save keys</Button>
            {keyMsg && <span role="status" className={cn("text-[12px]", keyMsg.ok ? "text-ink-2" : "text-rust")}>{keyMsg.text}</span>}
          </div>
        </form>
      </Panel>

      {/* Step 3 */}
      <Panel>
        <StepHead n={3} title="Connect your bank" done={connected} doneLabel={connected ? `${state.banks.length} connected` : undefined} />
        <P>
          Click the button and Plaid's window opens. You log in to your bank inside that window, so your bank login goes to Plaid and never touches this app.
          {state.plaidEnv === "sandbox" && <> In Sandbox, pick any bank and sign in with the fake login <code className="font-mono">user_good</code> and password <code className="font-mono">pass_good</code>.</>}
        </P>
        <P className="mt-2">Right after you connect, the app pulls your balances and your last two years of transactions and sorts them into categories. Big accounts can take a minute.</P>
        {connected && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {state.banks.map((b) => <li key={b.id}><StatusPill tone="done">{b.institution}</StatusPill></li>)}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={connect} disabled={!state.configured || state.demo || linking}>
            {linking ? <Spinner /> : <Icon name="link" size={15} />}
            {connected ? "Connect another bank" : "Connect a bank"}
          </Button>
          {connected && <LinkButton href="/">Open the dashboard</LinkButton>}
          {!state.configured && <span className="text-[12px] text-ink-2">Save your keys in step 2 first.</span>}
          {state.demo && state.configured && <span className="text-[12px] text-ink-2">Turn off demo mode to connect a real bank.</span>}
          {linkMsg && <span role="status" className={cn("text-[12px]", linkMsg.ok ? "text-ink-2" : "text-rust")}>{linkMsg.text}</span>}
        </div>
      </Panel>

      {/* Agent */}
      <Panel>
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-7 place-items-center rounded-pill bg-track text-ink-2"><Icon name="wand" size={14} /></span>
          <h2 className="text-title font-medium">Prefer an agent? Paste this into Claude Code or Codex</h2>
        </div>
        <P>
          Put this repo's link where it says <code className="font-mono">PASTE_THE_GITHUB_LINK_HERE</code>. The agent follows <code className="font-mono">AGENT_SETUP.md</code> in the repo: it installs what's missing, starts the app, and walks you through the same steps you see on this page.
        </P>
        <div className="mt-3 rounded-section border border-line bg-inset-soft p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-ink">{AGENT_PROMPT}</pre>
        </div>
        <div className="mt-3">
          <Button onClick={copyPrompt}>{copied ? <Icon name="check" size={15} /> : <Icon name="chat" size={15} />}{copied ? "Copied" : "Copy the prompt"}</Button>
        </div>
      </Panel>

      {/* After */}
      <Panel>
        <h2 className="mb-2 text-title font-medium">After setup</h2>
        <P>
          A daily job runs at {state.syncHourLabel} while the app is open. It pulls your balances, pulls new transactions, and puts each one in a category.
          If your computer was asleep at that time, it catches up as soon as the app is awake. You can also press Sync now in the sidebar whenever you like.
          To change the time, set <code className="font-mono">SYNC_HOUR</code> in your <code className="font-mono">.env</code> file.
        </P>
        <P className="mt-2">
          The app has to be running for any of that to happen. Next time, open a terminal in the app's folder and type <code className="font-mono">npm start</code>, or double-click <code className="font-mono">Start Finance App</code> on a Mac or <code className="font-mono">Start Finance App.bat</code> on Windows. The README has the plain steps.
        </P>
        <P className="mt-2">
          Categories come from built-in rules and Plaid's own labels, and the app works fully with just those. {state.llm ? "The optional AI step is on: it only looks at transactions the rules couldn't place." : <>If you want an AI pass too, put an <code className="font-mono">ANTHROPIC_API_KEY</code> in your .env file. It's optional, and it only sees transactions the rules couldn't place.</>}
        </P>
        <p className="mt-3 text-[12px] text-ink-2"><Link href="/accounts" className="font-medium text-brand-text hover:underline">Accounts</Link> shows what's connected and the history of every sync.</p>
      </Panel>
    </div>
  );
}
