import { ProviderPage, ProviderProfileSummary } from "./topbar.interface";

// ─── Provider Sidebar ────────────────────────────────────────────────────────

export interface ProviderNavItem {
  icon:    string;
  label:   string;
  page:    ProviderPage;
  badge?:  string;
  urgent?: boolean;
}

export interface ProviderNavSection {
  label: string;
  items: ProviderNavItem[];
}

export interface ProviderSidebarProps {
  activePage:  ProviderPage;
  onNavigate:  (page: ProviderPage) => void;
  isOpen:      boolean;
  onClose:     () => void;
  profile?:    ProviderProfileSummary | null;
}
