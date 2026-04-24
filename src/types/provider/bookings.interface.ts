import { BadgeVariant } from "../shared/shared.interface";

export type BookingStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "ended"
  | "confirmed"
  | "disputed"
  | "resolved"
  | "cancelled";
export type BookingDecision = "accepted" | "rejected";
export type BookingStageAction = "start" | "end";
export type CareActionKey = "clinical_note" | "lab_order" | "prescription" | "follow_up";

export interface ProviderBooking {
  id: string;
  rawStatus?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  patientId: string;
  startAt?: string;
  endAtIso?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  patientAvatarUrl?: string | null;
  age: number;
  gender: "M" | "F";
  condition: string;
  reason: string;
  preferredDate: string;
  preferredTime: string;
  endTime?: string;
  status: BookingStatus;
  decisionNote?: string;
  careActions: Record<CareActionKey, boolean>;
  visitType?: "VIDEO" | "AUDIO";
  chatEnabled?: boolean;
}

export const bookingStatusVariant: Record<BookingStatus, BadgeVariant> = {
  requested: "yellow",
  accepted: "green",
  rejected: "red",
  in_progress: "blue",
  ended: "blue",
  confirmed: "green",
  disputed: "red",
  resolved: "green",
  cancelled: "red",
};

export const careActionLabel: Record<CareActionKey, string> = {
  clinical_note: "Clinical Note",
  lab_order: "Lab Order",
  prescription: "Prescription",
  follow_up: "Follow-up Plan",
};
