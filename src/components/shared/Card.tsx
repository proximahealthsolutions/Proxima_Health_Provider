import { cn } from "@/lib/utils";
import {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
} from "@/types";

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── CardHeader ──────────────────────────────────────────────────────────────

export function CardHeader({
  title,
  subtitle,
  actions,
  className = "",
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-[var(--color-border)]",
        className
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--color-text)] truncate">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{subtitle}</div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── CardBody ────────────────────────────────────────────────────────────────

export function CardBody({ children, className = "" }: CardBodyProps) {
  return (
    <div className={cn("px-5 py-4", className)}>
      {children}
    </div>
  );
}

// ─── CardFooter ──────────────────────────────────────────────────────────────

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-5 py-3 border-t border-[var(--color-border)] flex items-center gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}