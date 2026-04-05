import { ButtonHTMLAttributes, ReactNode } from "react";

// ─── Avatar ──────────────────────────────────────────────────────────────────

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AvatarColor =
  | "slate"
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "purple"
  | "teal"
  | "orange";

export interface AvatarProps {
  initials: string;
  color?: AvatarColor;
  size?: AvatarSize;
  rounded?: boolean;
  imageUrl?: string;
  className?: string;
}

// ─── Button ──────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | "ghost"
  | "primary"
  | "secondary"
  | "danger"
  | "outline";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "gray"
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "orange"
  | "teal";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

// ─── Card ────────────────────────────────────────────────────────────────────

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}
