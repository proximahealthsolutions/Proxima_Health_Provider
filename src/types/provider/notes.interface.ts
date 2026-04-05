import { BadgeVariant } from "../shared/shared.interface";

export interface ProviderNote {
  id: string;
  patientId: string;
  date: string;
  summary: string;
  tag: string;
}

export const noteTagVariant: Record<string, BadgeVariant> = {
  Progress: "purple",
  Cardiology: "blue",
  Lifestyle: "teal",
  FollowUp: "green",
  General: "gray",
};
