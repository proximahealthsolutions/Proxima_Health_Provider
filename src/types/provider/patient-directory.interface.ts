export interface ProviderPatientDirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  gender: "M" | "F" | "Other" | "—";
  age?: number | null;
  dateOfBirth: string;
  phone: string;
  email: string;
  primaryCondition: string;
  patientVitals?: {
    weight?: string;
    height?: string;
    bloodPressure?: string;
    pulseRate?: string;
  } | null;
  patientHistory?: {
    medicalHistory?: string;
    surgicalHistory?: string;
    familyHistory?: string;
    socialHistory?: string;
  } | null;
}
