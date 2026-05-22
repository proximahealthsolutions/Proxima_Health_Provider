import { PatientRow } from "./patients.interface";
import { ProviderPage } from "./components/topbar.interface";

// ─── Provider Layout / Shell ─────────────────────────────────────────────────

export interface ProviderPageContentProps {
  activePage: ProviderPage;
  patientWorkspace?: PatientRow | null;
}
