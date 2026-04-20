// ─── Provider Topbar ─────────────────────────────────────────────────────────

export type ProviderPage =
  | "overview"
  | "patients"
  | "notifications"
  | "bookings"
  | "schedule"
  | "notes"
  | "prescriptions"
  | "laborders"
  | "messages"
  | "settings";

export interface ProviderProfileSummary {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
}

export interface ProviderTopbarProps {
  activePage:   ProviderPage;
  onMenuToggle: () => void;
  onOpenNotifications: () => void;
  profile?: ProviderProfileSummary | null;
}
