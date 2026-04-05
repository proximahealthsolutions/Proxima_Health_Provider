"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import type { AuthPageConfig } from "@/types";
import { fetchApi } from "@/lib/api";

const config: AuthPageConfig = {
  role: "provider",
  dashboardRoute: "/provider",
  icon: "🩺",
  tagline: "Provider Portal",
  features: [
    "Verify your email to continue onboarding",
    "Complete your provider profile",
    "Await admin approval before onboarding patients",
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

export default function ProviderVerifyPage() {
  const router = useRouter();
  const [token, setToken] = useState(
    typeof window !== "undefined" ? localStorage.getItem("verificationToken") || "" : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const resp = await fetchApi("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      localStorage.setItem("token", resp.access_token);
      document.cookie = `token=${resp.access_token}; Path=/; SameSite=Lax`;
      localStorage.removeItem("verificationToken");
      router.push("/complete-profile");
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell config={config}>
      <form onSubmit={handleVerify} className="space-y-4 w-full">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary-soft-border)] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-primary)]">
              Verify Email
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight mb-1.5">
            Enter verification code
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Check your inbox for the verification code we sent.
          </p>
        </div>

        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your verification code"
          required
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-[13px]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
      </form>
    </AuthShell>
  );
}
