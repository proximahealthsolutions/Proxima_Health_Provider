"use client";

import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import type { AuthPageConfig } from "@/types";

const config: AuthPageConfig = {
  role: "provider",
  dashboardRoute: "/provider",
  icon: "🩺",
  tagline: "Physician Portal",
  features: [
    "Your account is under review",
    "Admins will verify your credentials",
    "We will notify you once approved",
  ],
  accentColor: {
    glow: "bg-[var(--color-accent-soft)]",
    border: "border-[color:var(--color-primary-soft-border)]",
    badgeBg: "bg-[var(--color-primary-soft)]",
    badgeBorder: "border-[color:var(--color-primary-soft-border)]",
    badgeText: "text-[var(--color-primary)]",
    dot: "bg-[var(--color-accent)]",
    iconBg: "bg-[var(--color-primary-soft)]",
    iconText: "text-[var(--color-primary)]",
    checkBg: "bg-[var(--color-accent-soft)]",
    checkBorder: "border-[color:var(--color-accent-soft-border)]",
    checkText: "text-[var(--color-primary)]",
    button: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
    buttonHover: "hover:bg-[var(--color-primary-hover)]",
    buttonText: "text-[var(--color-on-primary)]",
    inputFocus: "focus:border-[var(--color-primary)]",
    link: "text-[var(--color-primary-muted)]",
    linkHover: "hover:text-[var(--color-primary-hover)]",
  },
};

export default function ProviderUnderReviewPage() {
  const router = useRouter();

  return (
    <AuthShell config={config}>
      <div className="space-y-6 w-full">
        <div className="rounded-2xl border border-[var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] px-5 py-6 text-center">
          <div className="text-3xl mb-3">🕒</div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text)]">Account Under Review</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-2">
            Your physician profile is awaiting admin approval. You will be able to access the dashboard once approved.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
          >
            Return to login
          </button>
          <button
            onClick={() => router.push("/complete-profile")}
            className="w-full py-3 rounded-xl text-sm font-semibold border border-[var(--color-border)] text-[var(--color-text)]"
          >
            Edit profile details
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
