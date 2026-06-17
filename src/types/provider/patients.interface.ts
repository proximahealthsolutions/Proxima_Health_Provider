import { AvatarColor, BadgeVariant } from "../shared/shared.interface";

// ─── Provider Patients Page ──────────────────────────────────────────────────

export type RiskLevel       = "Low" | "Medium" | "High";
export type PatientStatus   = "Active" | "Inactive" | "Discharged" | "Ended";
export type PatientFilter   = "All" | "Active" | "High Risk" | "Recent";

export interface PatientRow {
  id?:      string;
  patientRecordNumber?: string;
  init:      string;
  color:     AvatarColor;
  name:      string;
  age:       number | null;
  gender:    "M" | "F" | "Other" | "—";
  condition: string;
  lastVisit: string;
  nextVisit: string;
  status:    PatientStatus;
  risk:      RiskLevel;
  patientVitals?: {
    weight?: string;
    height?: string;
    bloodPressure?: string;
    pulseRate?: string;
    bmi?: number | null;
  } | null;
  patientHistory?: {
    medicalHistory?: string;
    surgicalHistory?: string;
    familyHistory?: string;
    socialHistory?: string;
    allergyHistory?: string;
  } | null;
  patientVitalSnapshots?: Array<{
    id: string;
    weight?: string | null;
    height?: string | null;
    bloodPressure?: string | null;
    pulseRate?: string | null;
    bmi?: number | null;
    recordedAt?: string;
    createdAt?: string;
  }>;
  email?: string;
  phone?: string;
}

export const riskVariant: Record<RiskLevel, BadgeVariant> = {
  Low:    "green",
  Medium: "yellow",
  High:   "red",
};

export const patientStatusVariant: Record<PatientStatus, BadgeVariant> = {
  Active:     "green",
  Inactive:   "gray",
  Discharged: "blue",
  Ended:      "gray",
};
