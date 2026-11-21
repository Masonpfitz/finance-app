import * as React from "react";
import { cn } from "@/lib/utils";

/** Icons are static SVG files in public/icons, drawn through a CSS mask so they take the
 *  colour of the text around them. */
export type IconName =
  | "arrow-right" | "ban" | "bank" | "calendar" | "cash" | "chart-down" | "chart-up" | "check"
  | "chevron-down" | "chevron-right" | "close" | "credit-card" | "dashboard" | "database" | "eye"
  | "file-lines" | "gear" | "info" | "link" | "magnifier" | "pie-chart" | "plus" | "receipt"
  | "refresh" | "sparkle" | "sync" | "tag" | "trash" | "user" | "warning" | "wand" | "chat"
  | "download" | "question";

/** A spinner is motion, not a mark, so it is drawn rather than pulled from the icon files. */
export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={cn("shrink-0 animate-spin", className)} aria-hidden>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Icon({ name, size = 16, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  const url = `url(/icons/${name}.svg)`;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        width: size,
        height: size,
        maskImage: url,
        WebkitMaskImage: url,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
