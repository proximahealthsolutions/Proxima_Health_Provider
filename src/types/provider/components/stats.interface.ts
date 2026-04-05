// ─── Provider Stats ──────────────────────────────────────────────────────────

export type ProviderStatToken = "purple" | "red" | "green" | "blue";

export interface ProviderStatCard {
  icon:   string;
  token:  ProviderStatToken;
  value:  string;
  label:  string;
  delta:  string;
  up:     boolean | null;
}