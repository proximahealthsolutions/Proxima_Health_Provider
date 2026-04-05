"use client";

import Image from "next/image";
import Link from "next/link";
import type { AuthPageConfig } from "@/types";

interface AuthShellProps {
  config: AuthPageConfig;
  children: React.ReactNode;
}

export default function AuthShell({ config, children }: AuthShellProps) {
  const { accentColor: a, features, icon, tagline } = config;

  return (
    <div className="min-h-dvh w-full overflow-x-hidden lg:flex bg-[var(--color-surface)]">

      {/* ── Left panel — branding (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-1/2 relative flex-col items-center justify-center p-16 overflow-hidden flex-shrink-0 bg-[var(--color-surface)] border-r border-[color:var(--color-primary-soft-border)]">

        {/* Glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className={`absolute top-0 left-0 w-[500px] h-[500px] rounded-full ${a.glow} blur-[120px]`} />
          <div className={`absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full ${a.glow} opacity-40 blur-[100px]`} />
          <div
            className="absolute inset-0 opacity-[.04]"
            style={{
              backgroundImage:
                "linear-gradient(color-mix(in srgb, var(--color-primary) 18%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 18%, transparent) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
          {/* Logo */}
          <Link href="/" className="opacity-95 hover:opacity-100 transition-opacity">
            <Image src="/logo.png" alt="Proxima Health" width={140} height={90} style={{ height: 90, width: "auto", objectFit: "contain" }} priority />
          </Link>

          {/* Icon + heading */}
          <div className="mt-12 mb-8 w-full">
            <div className={`w-20 h-20 rounded-2xl ${a.iconBg} border ${a.border} flex items-center justify-center mx-auto mb-7 text-4xl`}>
              {icon}
            </div>
            <h2 className="text-3xl font-extrabold text-[var(--color-primary)] tracking-tight mb-3">
              {tagline}
            </h2>
            <p className="text-[var(--color-primary-muted)] text-sm leading-relaxed">
              Secure access to the Proxima Health platform. Your data is encrypted end-to-end.
            </p>
          </div>

          {/* Feature list */}
          <div className="w-full space-y-3">
            {features.map((item) => (
              <div key={item} className="flex items-center gap-3 text-left">
                <span className={`w-5 h-5 rounded-full ${a.checkBg} border ${a.checkBorder} flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-2.5 h-2.5 ${a.checkText}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </span>
                <span className="text-[var(--color-primary-muted-strong)] text-[13px]">{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-14 text-[11px] text-[var(--color-primary-faint)] tracking-widest uppercase">
            Secure · HIPAA Compliant · v2.4.0
          </p>
        </div>
      </div>

      {/* ── Right panel — form area ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-12 overflow-y-auto relative">

        {/* Subtle glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full bg-[var(--color-accent-soft)] blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-[420px] pt-4 sm:pt-2 lg:pt-0">

          {/* Mobile logo */}
          <div className="flex justify-center mb-6 sm:mb-8 lg:hidden">
            <Link href="/">
              <Image src="/logo.png" alt="Proxima Health" width={110} height={70} style={{ height: 70, width: "auto", objectFit: "contain" }} priority />
            </Link>
          </div>

          {/* Form slot */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-4 sm:p-6 lg:p-7">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}
