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
    "Verify your email to start onboarding",
    "Complete your provider profile",
    "Get approved by admins before going live",
    "Manage patient bookings once approved",
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

export default function ProviderSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  function update(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || submitting) return;
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setLoading(true);
    try {

      const resp = await fetchApi("/auth/providers/signup", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });
      if (resp.verificationToken) {
        localStorage.setItem("verificationToken", resp.verificationToken);
      }
      router.push("/verify");
    } catch (err: any) {
      setError(err?.message || "Unable to create provider account.");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell config={config}>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary-soft-border)] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-primary)]">
              Create Provider Account
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight mb-1.5">
            Join the Proxima network
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Enter your details so admins can review and approve your profile.
          </p>
        </div>

        <input
          value={form.email}
          onChange={update("email")}
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          enterKeyHint="next"
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />
        <input
          value={form.password}
          onChange={update("password")}
          type="password"
          placeholder="Password"
          required
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />
        <input
          value={form.confirmPassword}
          onChange={update("confirmPassword")}
          type="password"
          placeholder="Confirm password"
          required
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-[13px]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || submitting}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
        >
          {loading || submitting ? "Creating account..." : "Create account"}
        </button>
        <div className="text-sm text-[var(--color-text-muted)] text-center leading-relaxed">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-semibold"
          >
            Back to login
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
