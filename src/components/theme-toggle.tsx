"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** In-page Light/Dark switch. The choice is saved in this browser only. */
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark" | null>(null);
  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const set = (t: "light" | "dark") => {
    setTheme(t);
    const r = document.documentElement;
    r.setAttribute("data-theme", t);
    r.classList.toggle("dark", t === "dark");
    r.style.colorScheme = t;
    try { localStorage.setItem("theme", t); } catch { /* private window: the choice just won't persist */ }
  };
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex h-8 items-center gap-0.5 rounded-pill bg-track p-0.5">
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          role="radio"
          aria-checked={theme === t}
          onClick={() => set(t)}
          className={cn(
            "h-7 rounded-pill px-3 text-body font-medium capitalize transition-[background-color,color,box-shadow] duration-[var(--dur-fast)]",
            theme === t ? "bg-track-on text-ink shadow-raised" : "text-ink-2 hover:text-ink",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
