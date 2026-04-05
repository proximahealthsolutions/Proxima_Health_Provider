"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
}

export default function RightDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClassName = "sm:w-[460px]",
}: RightDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 transition-opacity duration-200",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full z-50",
          maxWidthClassName,
          "bg-[var(--color-surface)] border-l border-[var(--color-border)]",
          "shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[var(--color-text)] truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] transition-colors"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">{children}</div>

          {footer && (
            <div className="w-full px-4 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-[var(--color-border)]">
              {footer}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
