"use client";

import Avatar from "@/components/shared/Avatar";
import Icon from "@/components/shared/Icon";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { ProviderTopbarProps, ProviderPage } from "@/types";

const pageTitles: Record<ProviderPage, string> = {
  overview:      "Dashboard",
  patients:      "My Patients",
  notifications: "Notifications",
  bookings:      "Bookings",
  schedule:      "Schedule",
  notes:         "Patient Notes",
  prescriptions: "Prescriptions",
  laborders:     "Lab Orders",
  messages:      "Messages",
  settings:      "Profile",
};

function initialsFromProfile(firstName?: string | null, lastName?: string | null) {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((part) => String(part).trim()[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return initials || "PR";
}

export default function ProviderTopbar({
  activePage,
  onMenuToggle,
  onOpenNotifications,
  profile,
}: ProviderTopbarProps) {
  const initials = initialsFromProfile(profile?.firstName, profile?.lastName);
  const displayName =
    profile?.firstName || profile?.lastName
      ? `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim()
      : "Physician";

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/92 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/82 sm:px-4 [padding-top:calc(env(safe-area-inset-top)+0.75rem)]">
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] text-lg transition-colors"
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <div className="flex min-w-0 items-baseline gap-2 mr-auto">
        <span className="font-bold text-[var(--color-text)] text-sm sm:text-base truncate">
          {pageTitles[activePage] ?? "Dashboard"}
        </span>
        <span className="text-[var(--color-text-muted)] text-sm hidden sm:inline">— Physician Portal</span>
      </div>
      <button
        type="button"
        onClick={onOpenNotifications}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[var(--color-surface-soft)] transition-colors text-[var(--color-text)]"
        aria-label="Open notifications"
      >
        <Icon name="bell" className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-primary)] rounded-full" />
      </button>
      <button className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[var(--color-surface-soft)] transition-colors text-[var(--color-text)]">
        <Icon name="clipboard" className="w-5 h-5" />
      </button>

      <div className="hidden sm:block">
        <ThemeToggle />
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <div className="text-right">
          <div className="text-xs font-semibold text-[var(--color-text)] leading-tight truncate max-w-[140px]">
            {displayName}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[140px]">
            {profile?.email ?? "Signed in"}
          </div>
        </div>
        <Avatar initials={initials} color="purple" size="md" rounded />
      </div>
      <div className="sm:hidden">
        <Avatar initials={initials} color="purple" size="md" rounded />
      </div>
    </header>
  );
}
