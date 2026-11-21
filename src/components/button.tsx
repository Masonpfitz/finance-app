import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "btn btn-primary",
  outline: "btn btn-secondary",
  ghost: "btn btn-ghost",
  danger: "btn btn-secondary text-rust",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-[18px] text-[14.5px]",
  lg: "h-11 px-[22px] text-[15.5px]",
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ className, variant = "outline", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:pointer-events-none", VARIANT[variant], SIZE[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export function LinkButton({ href, children, variant = "outline", size = "md", className, external }: { href: string; children: React.ReactNode; variant?: Variant; size?: Size; className?: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap", VARIANT[variant], SIZE[size], className)}
    >
      {children}
    </a>
  );
}
