import { BadgeVariant } from "../shared/shared.interface";

export type LabPriority = "Urgent" | "Routine";
export type LabStatus = "Processing" | "Collected" | "Result Ready";

export interface ProviderLabOrder {
  id: string;
  patientId: string;
  test: string;
  ordered: string;
  priority: LabPriority;
  status: LabStatus;
  resultNote?: string;
}

export const labPriorityVariant: Record<LabPriority, BadgeVariant> = {
  Urgent: "red",
  Routine: "gray",
};

export const labStatusVariant: Record<LabStatus, BadgeVariant> = {
  Processing: "blue",
  Collected: "yellow",
  "Result Ready": "green",
};
