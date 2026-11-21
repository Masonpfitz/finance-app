"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Charts are hand-built SVG with no library: hatched area fills, a dashed comparison line, one bar picked out. */

const HATCH_ID = "hatch-sage";

function Hatch() {
  return (
    <defs>
      <pattern id={HATCH_ID} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--sage))" strokeWidth="1.4" opacity="0.85" />
      </pattern>
    </defs>
  );
}

function path(points: number[], w: number, h: number, min: number, max: number, pad = 4) {
  const span = max - min || 1;
  return points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w;
    const y = h - pad - ((p - min) / span) * (h - pad * 2);
    return { x, y };
  });
}

/** Smooth-ish line through the points. Monotone-ish, so it never overshoots a value. */
function toPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[i - 1];
    const cx = (q.x + p.x) / 2;
    d += ` C${cx.toFixed(1)} ${q.y.toFixed(1)}, ${cx.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

/** A line with a hatched area beneath it, and an optional dashed comparison series. */
export function AreaChart({
  series,
  compare,
  labels,
  height = 180,
  className,
  valueFormat = (n) => `$${Math.round(n).toLocaleString()}`,
}: {
  series: number[];
  /** Rendered as a dashed line with no fill — last month, last year, a target. */
  compare?: number[];
  labels?: string[];
  height?: number;
  className?: string;
  valueFormat?: (n: number) => string;
}) {
  const w = 600;
  const h = height;
  const [hover, setHover] = React.useState<number | null>(null);

  const all = [...series, ...(compare ?? [])];
  const min = Math.min(0, ...all);
  const max = Math.max(...all) * 1.08;

  const pts = path(series, w, h, min, max);
  const cmp = compare ? path(compare, w, h, min, max) : null;
  const area = `${toPath(pts)} L${w} ${h} L0 ${h} Z`;

  const active = hover != null ? pts[hover] : null;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - r.left) / r.width) * (series.length - 1);
          setHover(Math.max(0, Math.min(series.length - 1, Math.round(rel))));
        }}
      >
        <Hatch />

        {/* Gridlines, barely there. */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="rgb(var(--line))" strokeWidth="1" />
        ))}

        <path d={area} fill={`url(#${HATCH_ID})`} />

        {cmp && (
          <path
            d={toPath(cmp)}
            fill="none"
            stroke="rgb(var(--ink-2))"
            strokeWidth="1.9"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
        )}

        {/* The accent's TEXT colour, not its fill: a 2px line needs the contrast that
            the lighter dark-mode tint gives it on a dark card. */}
        <path d={toPath(pts)} fill="none" stroke="rgb(var(--accent-text))" strokeWidth="2.2" strokeLinecap="round" />

        {active && (
          <>
            <line
              x1={active.x}
              y1="0"
              x2={active.x}
              y2={h}
              stroke="rgb(var(--ink-3))"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={active.x} cy={active.y} r="4.5" fill="rgb(var(--card))" stroke="rgb(var(--accent-text))" strokeWidth="2.2" />
          </>
        )}
      </svg>

      {/* Dark tooltip pill. */}
      {hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-control bg-tooltip px-2.5 py-1.5 text-[11px] font-medium text-tooltip-ink shadow-pop"
          style={{ left: `${(hover / Math.max(1, series.length - 1)) * 100}%`, top: 0 }}
        >
          {labels?.[hover] && <span className="mr-1.5 opacity-60">{labels[hover]}</span>}
          <span className="tnum">{valueFormat(series[hover])}</span>
        </div>
      )}

      {labels && (
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-2">
          {labels.map((l, i) => (
            <span key={i} className={cn(i === hover && "text-ink")}>
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pale bars with one picked out, a dark tooltip on hover. */
export function BarChart({
  data,
  height = 170,
  className,
  valueFormat = (n) => `$${Math.round(n).toLocaleString()}`,
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  valueFormat?: (n: number) => string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value)) || 1;
  // With nothing hovered, the largest bar carries the emphasis.
  const focus = hover ?? data.reduce((b, d, i) => (d.value > data[b].value ? i : b), 0);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const on = i === focus;
          return (
            <button
              key={d.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="group relative flex-1 rounded-t-control"
              style={{ height: "100%" }}
              aria-label={`${d.label}: ${valueFormat(d.value)}`}
            >
              <span
                className={cn(
                  "absolute bottom-0 left-0 right-0 rounded-t-control transition-colors duration-[var(--dur-fast)]",
                  on ? "bg-brand" : "bg-sage-pale group-hover:bg-sage",
                )}
                style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
              />
              {on && (
                <span
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-control bg-tooltip px-2.5 py-1.5 text-[11px] font-medium text-tooltip-ink shadow-pop"
                  style={{ bottom: `calc(${Math.max(2, (d.value / max) * 100)}% + 8px)` }}
                >
                  <span className="mr-1.5 opacity-60">{d.label}</span>
                  <span className="tnum">{valueFormat(d.value)}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 text-[11px] text-ink-2">
        {data.map((d, i) => (
          <span key={d.label} className={cn("flex-1 text-center", i === focus && "text-ink")}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A bare trend line for stat cards. */
export function Sparkline({ points, width = 72, height = 26, color = "rgb(var(--accent-text))" }: { points: number[]; width?: number; height?: number; color?: string }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pts = path(points, width, height, min, max, 2);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden>
      <Hatch />
      <path d={`${toPath(pts)} L${width} ${height} L0 ${height} Z`} fill={`url(#${HATCH_ID})`} opacity="0.7" />
      <path d={toPath(pts)} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
