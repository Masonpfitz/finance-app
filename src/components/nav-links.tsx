"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/transactions", label: "Transactions", icon: "receipt" },
  { href: "/spending", label: "Spending", icon: "pie-chart" },
  { href: "/accounts", label: "Accounts", icon: "bank" },
  { href: "/setup", label: "Setup", icon: "gear" },
];

export function NavLinks({ horizontal }: { horizontal?: boolean }) {
  const path = usePathname();
  return (
    <nav className={cn("flex gap-1", horizontal ? "flex-row" : "flex-col")} aria-label="Main">
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-control px-3 text-body font-medium transition-[background-color,color,box-shadow] duration-[var(--dur-fast)]",
              horizontal && "whitespace-nowrap",
              active ? "bg-card text-ink shadow-raised" : "text-ink-2 hover:bg-hover-fill hover:text-ink",
            )}
          >
            <Icon name={n.icon} size={16} className={active ? "text-ink" : "text-ink-3"} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
