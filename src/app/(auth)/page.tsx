"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import type { AuthPageConfig, LoginData } from "@/types";
import { fetchApi } from "@/lib/api";

const config: AuthPageConfig = {
  role: "provider",
  dashboardRoute: "/provider",
  icon: "🩺",
  tagline: "Provider Portal",
  features: [
    "Manage your patient queue",
    "Write & store clinical notes",
    "Order labs & prescriptions",
    "Streamlined daily workflow",
  ],
  accentColor: {
    glow:        "bg-[var(--color-accent-soft)]",
    border:      "border-[color:var(--color-primary-soft-border)]",
    badgeBg:     "bg-[var(--color-primary-soft)]",
    badgeBorder: "border-[color:var(--color-primary-soft-border)]",
    badgeText:   "text-[var(--color-primary)]",
    dot:         "bg-[var(--color-accent)]",
    iconBg:      "bg-[var(--color-primary-soft)]",
    iconText:    "text-[var(--color-primary)]",
    checkBg:     "bg-[var(--color-accent-soft)]",
    checkBorder: "border-[color:var(--color-accent-soft-border)]",
    checkText:   "text-[var(--color-primary)]",
    button:      "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
    buttonHover: "hover:bg-[var(--color-primary-hover)]",
    buttonText:  "text-[var(--color-on-primary)]",
    inputFocus:  "focus:border-[var(--color-primary)]",
    link:        "text-[var(--color-primary-muted)]",
    linkHover:   "hover:text-[var(--color-primary-hover)]",
  },
};

export default function ProviderAuthPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(data: LoginData) {
    setError("");
    setLoading(true);
    try {
      const resp = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      localStorage.setItem("token", resp.access_token);
      document.cookie = `token=${resp.access_token}; Path=/; SameSite=Lax`;
      if (resp.user?.providerApprovalStatus && resp.user.providerApprovalStatus !== "APPROVED") {
        router.push("/under-review");
        return;
      }
      router.push(config.dashboardRoute);
    } catch (err: any) {
      const message = err?.message || "Invalid credentials.";
      if (message.toLowerCase().includes("validation") || message.toLowerCase().includes("approved")) {
        router.push("/under-review");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell config={config}>
      <div className="space-y-6 w-full">
        <LoginForm onSubmit={handleLogin} loading={loading} error={error} />
        <div className="text-sm text-[var(--color-text-muted)] text-center">
          New here?{" "}
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-semibold"
          >
            Create a provider account
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
