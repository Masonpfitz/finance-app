import { swatch } from "@/lib/categories";

/** A filled category pill in the category's own hue. Pills are never the accent, so they never read as buttons. */
export function CategoryChip({ name, color }: { name: string; color: number }) {
  const s = swatch(color);
  return (
    <span
      className="cat-chip"
      data-cat-tag
      style={{ color: s.ink, background: `linear-gradient(180deg, ${s.hi} 0%, ${s.base} 55%, ${s.lo} 100%)` }}
    >
      {name}
    </span>
  );
}
