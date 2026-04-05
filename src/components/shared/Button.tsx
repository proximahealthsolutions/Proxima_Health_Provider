import { cn } from "@/lib/utils";
import { ButtonProps, ButtonVariant, ButtonSize } from "@/types";

const variantStyles: Record<ButtonVariant, string> = {
  primary:   "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] shadow-sm",
  secondary: "bg-[var(--color-surface-soft)] text-[var(--color-text)] hover:bg-[color:var(--color-border)] active:bg-[color:var(--color-border)]",
  ghost:     "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] active:bg-[color:var(--color-border)]",
  danger:    "bg-[var(--color-danger)] text-[var(--color-on-primary)] hover:bg-[var(--color-danger-hover)] active:bg-[var(--color-danger-active)] shadow-sm",
  outline:   "border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-soft)] active:bg-[var(--color-surface-soft)] bg-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-base rounded-xl gap-2.5",
};

export default function Button({
  children,
  variant = "ghost",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
