"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhoneForDisplay, normalizePhoneForApi } from "@/lib/phone";

type ContactMethod = "email" | "phone";

export default function LoginForm({ onSubmit, loading: parentLoading, error: parentError }: any) {
  const router = useRouter();
  const [method, setMethod] = useState<ContactMethod>("phone");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const normalizedContact =
        method === "email"
          ? contact.trim().toLowerCase()
          : normalizePhoneForApi(contact);

      const body =
        method === "email"
          ? { email: normalizedContact }
          : { phone: normalizedContact };

      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || "Failed to send OTP. Make sure your account is registered.",
        );
      }
      router.push(`/otp-login?${method}=${encodeURIComponent(normalizedContact)}`);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
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
          Sign in password-free using a one-time verification code.
        </p>
      </div>

      <form onSubmit={handleSendOtp} className="space-y-4 w-full">
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
            {method === "phone" && (
              <span className="pointer-events-none absolute inset-y-0 left-10 flex items-center border-l border-[var(--color-border)] pl-3 text-sm font-semibold text-[var(--color-text)]">
                +234
              </span>
            )}
            <input
              type={method === "email" ? "email" : "tel"}
              value={contact}
              onChange={(e) =>
                setContact(
                  method === "email"
                    ? e.target.value
                    : formatPhoneForDisplay(e.target.value),
                )
              }
              placeholder={
                method === "email" ? "doctor@proximahealth.com" : "80 0000 0000"
              }
              required
              autoComplete={method === "email" ? "email" : "tel"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode={method === "email" ? "email" : "tel"}
              enterKeyHint="next"
              className={`w-full ${
                method === "phone" ? "pl-24" : "pl-10"
              } pr-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors`}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--color-danger-soft)] border border-[color:var(--color-danger-soft-border)]">
            <svg className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[var(--color-danger)] text-[13px]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
        >
          {loading ? (
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
    </div>
  );
}
