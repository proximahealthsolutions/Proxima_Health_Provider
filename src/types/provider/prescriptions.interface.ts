import { BadgeVariant } from "../shared/shared.interface";

export type PrescriptionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISCONTINUED";

export interface ProviderPrescription {
  id: string;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  status: PrescriptionStatus;
  changeRequests?: Array<{
    id: string;
    action: "CONTINUE" | "ADJUST" | "NO_LONGER_TAKING";
    note?: string | null;
    status: "PENDING" | "APPROVED" | "DECLINED";
    createdAt?: string;
  }>;
}

export const prescriptionStatusVariant: Record<PrescriptionStatus, BadgeVariant> = {
  ACTIVE: "green",
  COMPLETED: "blue",
  CANCELLED: "gray",
  DISCONTINUED: "red",
};
