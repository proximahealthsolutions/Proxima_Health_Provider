"use client";

import { useState } from "react";
import Link from "next/link";
import type { LoginFormProps } from "@/types";

export default function LoginForm({ onSubmit, loading, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [localError, setLocalError] = useState("");

  const activeError = localError || error;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (sendingOtp || loading) return;
    setSendingOtp(true);
    setLocalError("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to send OTP. Make sure your email is registered.");
      }
      setStep("otp");
    } catch (err: any) {
      setLocalError(err.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLocalError("");
    await onSubmit({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    });
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary-soft)] border border-[color:var(--color-primary-soft-border)] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-primary)]">
            Physician Access
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight mb-1.5">
          Welcome back
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          {step === "email"
            ? "Sign in password-free using a one-time verification code."
            : "Enter the code sent to your inbox to sign in."}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-4 w-full">
          <div>
            <label className="block text-[11px] font-bold tracking-widest uppercase text-[var(--color-text-muted)] mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@proximahealth.com"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                enterKeyHint="next"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>

          {activeError && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--color-danger-soft)] border border-[color:var(--color-danger-soft-border)]">
              <svg className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[var(--color-danger)] text-[13px]">{activeError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={sendingOtp || loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
          >
            {sendingOtp ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Sending OTP...
              </span>
            ) : (
              "Send Verification Code"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
                Verification Code
              </label>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setLocalError("");
                }}
                className="text-[12px] text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-semibold transition-colors"
              >
                Change Email
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                required
                maxLength={6}
                pattern="\d{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-all tracking-[0.2em] font-mono text-center"
              />
            </div>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-2">
              Sent to: <span className="font-semibold text-[var(--color-text)]">{email}</span>
            </p>
          </div>

          {activeError && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--color-danger-soft)] border border-[color:var(--color-danger-soft-border)]">
              <svg className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[var(--color-danger)] text-[13px]">{activeError}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <button
              type="button"
              disabled={sendingOtp || loading}
              onClick={handleSendOtp}
              className="w-full py-2.5 rounded-xl text-xs font-semibold border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text)] transition-colors mt-1"
            >
              {sendingOtp ? "Resending..." : "Resend Verification Code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
