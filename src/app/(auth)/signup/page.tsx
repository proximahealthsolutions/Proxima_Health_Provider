"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import type { AuthPageConfig } from "@/types";
import { fetchApi } from "@/lib/api";

const config: AuthPageConfig = {
  role: "provider",
  dashboardRoute: "/provider",
  icon: "MD",
  tagline: "Physician Portal",
  features: [
    "Verify your email to start onboarding",
    "Complete your physician profile",
    "Access your dashboard right after verification",
    "Manage patient bookings immediately",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

      await fetchApi("/auth/providers/signup", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });
      router.push(`/verify?email=${encodeURIComponent(form.email.trim())}`);
    } catch (err: any) {
      setError(err?.message || "Unable to create physician account.");
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
              Create Physician Account
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight mb-1.5">
            Join the Proxima network
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Create your account to verify your email and start using the physician portal.
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
        <div className="relative">
          <input
            value={form.password}
            onChange={update("password")}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
          />
          <button
            type="button"
            title={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showPassword ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
        <div className="relative">
          <input
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            required
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
          />
          <button
            type="button"
            title={showConfirmPassword ? "Hide password" : "Show password"}
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showConfirmPassword ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>

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
