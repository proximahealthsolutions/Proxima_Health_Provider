"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import type { AuthPageConfig } from "@/types";
import { fetchApi } from "@/lib/api";

const config: AuthPageConfig = {
  role: "provider",
  dashboardRoute: "/provider",
  icon: "MD",
  tagline: "Physician Portal",
  features: [
    "Verify your email from your inbox",
    "Complete your physician profile",
    "Access your dashboard right away",
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

function ProviderVerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email") || "";
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token ? "verifying" : "idle"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function verify() {
      try {
        const resp = await fetchApi("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        localStorage.setItem("token", resp.access_token);
        document.cookie = `token=${resp.access_token}; Path=/; SameSite=Lax`;
        setStatus("success");
        window.setTimeout(() => router.push("/complete-profile"), 1200);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Verification failed. Please try the email link again.");
        setStatus("error");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <AuthShell config={config}>
      <div className="space-y-4 w-full">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary-soft-border)] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-primary)]">
              Verify Email
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight mb-1.5">
            {token ? "Verifying your email" : "Check your inbox"}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            {token
              ? "We are confirming your physician account now."
              : `We sent a verification email${email ? ` to ${email}` : ""}. Open it and click the link to continue.`}
          </p>
        </div>

        {!token && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-[var(--color-text-muted)]">
            The email link will verify your account and take you straight into profile completion.
          </div>
        )}

        {status === "verifying" && (
          <div className="rounded-2xl border border-[var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] px-5 py-4 text-sm text-[var(--color-primary)]">
            Verifying your account...
          </div>
        )}

        {status === "success" && (
          <div className="rounded-2xl border border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)] px-5 py-4 text-sm text-[var(--color-primary)]">
            Email verified. Redirecting you now.
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-[color:var(--color-danger-soft-border)] bg-[var(--color-danger-soft)] px-5 py-4 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
      </div>
    </AuthShell>
  );
}

export default function ProviderVerifyPage() {
  return (
    <Suspense fallback={null}>
      <ProviderVerifyPageContent />
    </Suspense>
  );
}
