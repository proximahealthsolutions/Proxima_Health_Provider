"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { fetchApi } from "@/lib/api";

const config = {
  role: "provider" as const,
  dashboardRoute: "/provider",
  icon: "MD",
  tagline: "Physician Portal",
  features: [
    "Manage your patient queue",
    "Write & store clinical notes",
    "Order labs & prescriptions",
    "Streamlined daily workflow",
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

function ProviderOtpLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");
  const identifier = email || phone || "";
  const isEmail = Boolean(email);

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index: number, val: string) => {
    const numeric = val.replace(/\D/g, "");
    if (!numeric) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = numeric[0];
    setDigits(nextDigits);

    if (index < 5 && numeric[0]) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      setDigits(nextDigits);
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length > 0) {
      const nextDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        nextDigits[i] = pastedData[i] || "";
      }
      setDigits(nextDigits);
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs[focusIndex].current?.focus();
    }
  };

  const codeString = digits.join("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (codeString.length !== 6 || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          ...(isEmail
            ? { email: email?.trim().toLowerCase() }
            : { phone: phone?.trim() }),
          code: codeString,
        }),
      });

      if (resp.user?.role !== "PROVIDER") {
        localStorage.removeItem("token");
        document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
        throw new Error("This account belongs to the patient portal. Please sign in on the patient app.");
      }

      localStorage.setItem("token", resp.access_token);
      document.cookie = `token=${resp.access_token}; Path=/; SameSite=Lax`;

      if (!resp.user?.profileCompleted) {
        window.location.href = "/complete-profile";
        return;
      }

      if (resp.user?.providerApprovalStatus !== "APPROVED") {
        window.location.href = "/under-review";
        return;
      }

      window.location.href = config.dashboardRoute;
    } catch (err: any) {
      setError(err?.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending || loading) return;
    setResending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEmail
            ? { email: email?.trim().toLowerCase() }
            : { phone: phone?.trim() },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to resend OTP.");
      }
      setSuccess(
        isEmail
          ? "A new verification code has been sent to your email."
          : "A new verification code has been sent to your phone.",
      );
      setDigits(["", "", "", "", "", ""]);
      inputRefs[0].current?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (codeString.length === 6) {
      const mockEvent = { preventDefault: () => {} } as React.FormEvent;
      void handleVerify(mockEvent);
    }
  }, [codeString]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary-soft)] border border-[color:var(--color-primary-soft-border)] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-primary)]">
            Security Verification
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight mb-1.5">
          Enter verification code
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
          We sent a 6-digit code to <span className="font-semibold text-[var(--color-text)]">{identifier}</span>.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-6 w-full">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[11px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
              Verification Code
            </label>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-[12px] text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-semibold transition-colors bg-transparent border-0 cursor-pointer"
            >
              Change contact
            </button>
          </div>

          <div className="flex gap-2 justify-between max-w-sm mx-auto my-4">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-sm"
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ))}
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

        {success && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-green-400 text-[13px]">{success}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading || codeString.length !== 6}
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
            disabled={resending || loading}
            onClick={handleResend}
            className="w-full py-2.5 rounded-xl text-xs font-semibold border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text)] transition-colors mt-1"
          >
            {resending ? "Resending..." : "Resend Verification Code"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProviderOtpLoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthShell config={config}>
        <ProviderOtpLoginPageContent />
      </AuthShell>
    </Suspense>
  );
}
