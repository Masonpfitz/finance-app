import * as React from "react";
import { isDemo, db } from "@/lib/db";
import { lastSync } from "@/lib/sync";
import { timeAgo } from "@/lib/utils";
import { Icon } from "./icon";
import { NavLinks } from "./nav-links";
import { SyncButton } from "./sync-button";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const demo = isDemo();
  const last = lastSync(db()) as { finished_at: string | null; status: string } | null;
  return (
    <div className="flex min-h-screen flex-col lg:flex-row lg:gap-4 lg:p-3">
      {/* Phone and narrow windows: a slim top bar instead of the sidebar. */}
      <header className="flex items-center gap-3 px-4 py-3 lg:hidden">
        <Brand />
        <div className="scroll-x ml-auto"><NavLinks horizontal /></div>
      </header>

      <aside className="hidden w-[248px] shrink-0 flex-col justify-between px-2 py-3 lg:flex lg:sticky lg:top-3 lg:h-[calc(100vh-24px)]">
        <div className="flex flex-col gap-6">
          <Brand />
          <NavLinks />
        </div>
        <div className="flex flex-col gap-3">
          {demo && (
            <div className="rounded-control bg-st-pending-bg px-3 py-2 text-[12px] font-medium text-st-pending">
              Demo mode: everything here is made up.
            </div>
          )}
          <div className="tray-inset flex flex-col gap-2 p-3">
            <div className="text-[12px] text-ink-2">
              {demo ? "Demo data" : last?.finished_at ? `Last synced ${timeAgo(last.finished_at)}` : "Not synced yet"}
            </div>
            <SyncButton />
          </div>
          <ThemeToggle />
        </div>
      </aside>

      <main className="surface min-w-0 flex-1 lg:min-h-[calc(100vh-24px)]">
        <div className="shell">{children}</div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="brand-mark grid size-9 place-items-center rounded-control">
        <Icon name="cash" size={20} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Finance App</span>
    </div>
  );
}
