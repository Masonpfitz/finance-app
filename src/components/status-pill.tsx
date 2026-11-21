import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "idle" | "pending" | "info" | "done" | "alert";
const TONE: Record<Tone, string> = {
  idle: "bg-st-idle-bg text-st-idle",
  pending: "bg-st-pending-bg text-st-pending",
  info: "bg-st-info-bg text-st-info",
  done: "bg-st-done-bg text-st-done",
  alert: "bg-st-alert-bg text-st-alert",
};

/** Pale same-hue fill, with a glyph whose shape (not just colour) carries the state. */
export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 text-[12px] font-medium", TONE[tone])}>
      <Glyph tone={tone} />
      {children}
    </span>
  );
}

function Glyph({ tone }: { tone: Tone }) {
  const c = { width: 12, height: 12, viewBox: "0 0 12 12", "aria-hidden": true } as const;
  if (tone === "done") return <svg {...c}><circle cx="6" cy="6" r="5" fill="currentColor" /><path d="M3.6 6.2 5.2 7.8 8.4 4.4" stroke="rgb(var(--card))" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (tone === "alert") return <svg {...c}><circle cx="6" cy="6" r="5" fill="currentColor" /><path d="M6 3.4v3" stroke="rgb(var(--card))" strokeWidth="1.4" strokeLinecap="round" /><circle cx="6" cy="8.5" r=".8" fill="rgb(var(--card))" /></svg>;
  if (tone === "pending") return <svg {...c}><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.4 2" /></svg>;
  if (tone === "info") return <svg {...c}><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M6 6v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><circle cx="6" cy="3.9" r=".7" fill="currentColor" /></svg>;
  return <svg {...c}><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.4 2" /></svg>;
}
