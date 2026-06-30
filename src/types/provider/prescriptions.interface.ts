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
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    patientRecordNumber?: string | null;
  } | null;
  changeRequests?: Array<{
    id: string;
    action: "CONTINUE" | "ADJUST" | "NO_LONGER_TAKING";
    note?: string | null;
    status: "PENDING" | "APPROVED" | "DECLINED";
    physicianNote?: string | null;
    createdAt?: string;
  }>;
}

export const prescriptionStatusVariant: Record<PrescriptionStatus, BadgeVariant> = {
  ACTIVE: "green",
  COMPLETED: "blue",
  CANCELLED: "gray",
  DISCONTINUED: "red",
};
