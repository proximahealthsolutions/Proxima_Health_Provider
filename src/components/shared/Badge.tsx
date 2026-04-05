import { cn } from "@/lib/utils";
import { BadgeProps, BadgeVariant } from "@/types";

const variantStyles: Record<BadgeVariant, string> = {
  gray:   "bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]",
  blue:   "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  green:  "bg-[var(--color-success-soft)] text-[var(--color-success-strong)]",
  yellow: "bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]",
  red:    "bg-[var(--color-danger-soft)]   text-[var(--color-danger)]",
  purple: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  orange: "bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]",
  teal:   "bg-[var(--color-info-soft)]  text-[var(--color-info-strong)]",
};

export default function Badge({
  children,
  variant = "gray",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
