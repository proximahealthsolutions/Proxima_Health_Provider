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
    "Verify your email or phone to start onboarding",
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
  const [method, setMethod] = useState<"email" | "phone">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || submitting) return;
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim().replace(/[^+0-9]/g, "");

    if (method === "email" && !normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (method === "phone" && !normalizedPhone) {
      setError("Please enter your phone number.");
      return;
    }

    setSubmitting(true);
    setLoading(true);
    try {
      await fetchApi("/auth/providers/signup", {
        method: "POST",
        body: JSON.stringify({
          email: method === "email" ? normalizedEmail : undefined,
          phone: method === "phone" ? normalizedPhone : undefined,
        }),
      });
      if (method === "email") {
        router.push(`/verify?email=${encodeURIComponent(normalizedEmail)}`);
      } else {
        router.push(`/otp-login?phone=${encodeURIComponent(normalizedPhone)}`);
      }
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
            Create your account to verify your contact and start using the physician portal.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setMethod("phone")}
            className={`px-3 py-2 rounded-full border transition ${
              method === "phone"
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]"
                : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
            }`}
          >
            Phone
          </button>
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`px-3 py-2 rounded-full border transition ${
              method === "email"
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]"
                : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
            }`}
          >
            Email
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-bold tracking-widest uppercase text-[var(--color-text-muted)] mb-2">
            {method === "email" ? "Email Address" : "Phone Number"}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {method === "email" ? (
                  <>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </>
                ) : (
                  <>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.12 1.05.32 2.06.6 3.03a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.05-1.05a2 2 0 0 1 2.11-.45c.97.28 1.98.48 3.03.6A2 2 0 0 1 22 16.92z" />
                  </>
                )}
              </svg>
            </div>
            <input
              type={method === "email" ? "email" : "tel"}
              value={method === "email" ? email : phone}
              onChange={(e) => (method === "email" ? setEmail(e.target.value) : setPhone(e.target.value))}
              placeholder={method === "email" ? "doctor@proximahealth.com" : "+234 800 000 0000"}
              required
              autoComplete={method === "email" ? "email" : "tel"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode={method === "email" ? "email" : "tel"}
              enterKeyHint="next"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
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
