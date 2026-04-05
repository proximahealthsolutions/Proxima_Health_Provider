import { BadgeVariant } from "../shared/shared.interface";

export type PrescriptionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface ProviderPrescription {
  id: string;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  status: PrescriptionStatus;
}

export const prescriptionStatusVariant: Record<PrescriptionStatus, BadgeVariant> = {
  ACTIVE: "green",
  COMPLETED: "blue",
  CANCELLED: "gray",
};
