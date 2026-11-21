import type { AccountRow } from "@/lib/queries";
import { netValue } from "@/lib/queries";
import { usd, timeAgo } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

const GROUPS: { type: string; label: string; icon: IconName }[] = [
  { type: "depository", label: "Cash", icon: "bank" },
  { type: "credit", label: "Credit cards", icon: "credit-card" },
  { type: "loan", label: "Loans", icon: "file-lines" },
  { type: "investment", label: "Investments", icon: "chart-up" },
];

/** Balances grouped by kind. A card or loan shows what you owe, written with a minus. */
export function AccountList({ accounts, compact }: { accounts: AccountRow[]; compact?: boolean }) {
  if (!accounts.length) return <p className="text-body text-ink-2">No accounts yet.</p>;
  const known = new Set(GROUPS.map((g) => g.type));
  const groups = [...GROUPS, { type: "other", label: "Other", icon: "database" as IconName }];
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const rows = accounts.filter((a) => (g.type === "other" ? !known.has(a.type) : a.type === g.type));
        if (!rows.length) return null;
        return (
          <div key={g.type}>
            <div className="mb-1 flex items-center gap-1.5 text-label text-ink-2">
              <Icon name={g.icon} size={13} className="text-ink-3" />
              {g.label}
            </div>
            <ul>
              {rows.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 border-b border-line/70 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-body font-medium">{a.name}</div>
                    <div className="truncate text-[11px] text-ink-2">
                      {[a.institution, a.mask ? `ending ${a.mask}` : null, !compact ? `updated ${timeAgo(a.updated_at)}` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="tnum shrink-0 text-body font-medium">{usd(netValue(a), { cents: !compact })}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
