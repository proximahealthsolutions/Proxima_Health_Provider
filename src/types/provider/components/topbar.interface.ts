// ─── Provider Topbar ─────────────────────────────────────────────────────────

export type ProviderPage =
  | "overview"
  | "patients"
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
  profile?: ProviderProfileSummary | null;
}
