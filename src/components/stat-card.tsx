import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";
import { Sparkline } from "./chart";

/**
 * A stat card carries a figure, how it moved against a baseline, the shape of the recent
 * series and one plain sentence about what it means. Each of the last three is optional
 * only because the data may not exist yet. Never invent one: with no history, omit it.
 */
export function StatCard({
  label,
  icon,
  value,
  delta,
  deltaLabel = "vs last month",
  series,
  insight,
  className,
}: {
  label: string;
  icon: IconName;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  series?: number[] | null;
  insight?: React.ReactNode;
  className?: string;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const down = hasDelta && delta! < 0;
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-panel border border-transparent bg-card shadow-card", className)}>
      <div className="flex items-center justify-between gap-2 bg-tray-2 px-4 py-2.5">
        <span className="text-label text-ink-2">{label}</span>
        <Icon name={icon} size={14} className="text-ink-3" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="figure-sm text-ink">{value}</div>
            {hasDelta && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-2">
                <Icon name={down ? "chart-down" : "chart-up"} size={11} className="shrink-0 text-ink-3" />
                <span className="tnum">{formatDelta(delta!)}</span>
                <span className="truncate">{deltaLabel}</span>
              </div>
            )}
          </div>
          {series && series.length > 1 && <Sparkline points={series} />}
        </div>
        {insight && <p className="mt-auto border-t border-line/70 pt-2.5 text-[11px] leading-relaxed text-ink-2">{insight}</p>}
      </div>
    </div>
  );
}

/** Past 10x a percentage stops communicating, so it becomes a multiplier. */
export function formatDelta(pct: number): string {
  const sign = pct < 0 ? "−" : "+";
  const abs = Math.abs(pct);
  if (abs >= 1000) return `${sign}${Math.round(abs / 100)}×`;
  if (abs >= 100) return `${sign}${Math.round(abs)}%`;
  return `${sign}${abs.toFixed(1)}%`;
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
