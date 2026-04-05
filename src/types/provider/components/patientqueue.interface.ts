import { BadgeVariant } from "../../shared/shared.interface";

// ─── Provider Patient Queue ──────────────────────────────────────────────────

export type QueueStatus   = "In Progress" | "Waiting" | "Confirmed" | "No Show";
export type QueueFilter   = "Today" | "Tomorrow" | "Week";

export interface QueuePatient {
  time:   string;
  name:   string;
  age:    number | "—";
  type:   string;
  status: QueueStatus;
  token:  "teal" | "amber" | "blue" | "red" | "purple" | "green";
  date?:  string;
}

export type QueueData = Record<QueueFilter, QueuePatient[]>;

export const queueStatusVariant: Record<QueueStatus, BadgeVariant> = {
  "In Progress": "teal",
  Waiting:       "yellow",
  Confirmed:     "blue",
  "No Show":     "red",
};
