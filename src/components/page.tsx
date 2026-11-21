import * as React from "react";
import { cn } from "@/lib/utils";

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 text-body text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("panel min-w-0", className)}>{children}</section>;
}

export function PanelHeader({ title, note, action }: { title: string; note?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-title font-medium">{title}</h2>
        {note && <p className="mt-0.5 text-[12px] text-ink-2">{note}</p>}
      </div>
      {action}
    </div>
  );
}
