import Link from "next/link";
import { redirect } from "next/navigation";
import { db, isDemo } from "@/lib/db";
import { getAccounts, totals, hasData, recentSync } from "@/lib/queries";
import { timeAgo, usd } from "@/lib/utils";
import { syncHour } from "@/lib/env";
import { PageTitle, Panel, PanelHeader } from "@/components/page";
import { AccountList } from "@/components/account-list";
import { StatusPill } from "@/components/status-pill";
import { DisconnectButton } from "@/components/disconnect-button";
import { LinkButton } from "@/components/button";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  if (!isDemo() && !hasData()) redirect("/setup");
  const accounts = getAccounts();
  const t = totals(accounts);
  const banks = db().prepare("select id,institution,last_synced_at,error from items").all() as { id: string; institution: string; last_synced_at: string | null; error: string | null }[];
  const log = recentSync();
  const hour = syncHour();
  const at = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? "AM" : "PM"}`;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Accounts" description={`Net worth ${usd(t.net)}. Balances refresh every day at ${at} while the app is running, and any time you press Sync now.`} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <PanelHeader title="Balances" />
          <AccountList accounts={accounts} />
        </Panel>
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Panel>
            <PanelHeader title="Connected banks" action={!isDemo() ? <LinkButton href="/setup" size="sm">Connect another</LinkButton> : undefined} />
            {banks.length === 0 ? <p className="text-body text-ink-2">No banks connected.</p> : (
              <ul>
                {banks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate text-body font-medium">{b.institution}</div>
                      <div className="text-[11px] text-ink-2">{b.last_synced_at ? `Synced ${timeAgo(b.last_synced_at)}` : "Not synced yet"}</div>
                      {b.error && <div className="mt-1 text-[11px] text-rust">{b.error}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={b.error ? "alert" : "done"}>{b.error ? "Needs attention" : "Connected"}</StatusPill>
                      {!isDemo() && <DisconnectButton id={b.id} name={b.institution} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-ink-2">Plaid can read balances and transactions only. It has no way to move money from here.</p>
          </Panel>
          <Panel>
            <PanelHeader title="Sync history" note="Each run of the daily job and each press of Sync now." />
            {log.length === 0 ? <p className="text-body text-ink-2">No syncs yet.</p> : (
              <ul>
                {log.map((l) => (
                  <li key={l.id} className="border-b border-line/70 py-2 last:border-b-0">
                    <div className="flex items-center justify-between gap-2 text-body">
                      <span className="font-medium">{l.trigger === "daily" ? "Daily job" : l.trigger === "manual" ? "Sync now" : l.trigger === "connect" ? "First sync" : "Command line"}</span>
                      <span className="text-[11px] text-ink-2">{timeAgo(l.finished_at ?? l.started_at)}</span>
                    </div>
                    <div className={l.status === "ok" ? "text-[11px] text-ink-2" : "text-[11px] text-rust"}>{l.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <p className="text-[12px] text-ink-2"><Link href="/setup" className="font-medium text-brand-text hover:underline">Setup</Link> has the keys, demo mode and the agent prompt.</p>
    </div>
  );
}
