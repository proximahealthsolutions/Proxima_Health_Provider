import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely, resolving conflicts.
 * Usage: cn("px-2 py-1", condition && "bg-[var(--color-info)]", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}