import { fetchApi } from "@/lib/api";
import type { PatientRow } from "@/types";

export type ProviderNotificationItem = {
  id: string;
  title: string;
  detail: string;
  kind: "booking" | "lab" | "message" | "prescription";
  target: "bookings" | "laborders" | "messages" | "prescriptions";
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  patientRecordNumber?: string | null;
  reason?: string | null;
  requestAction?: "CONTINUE" | "ADJUST" | "NO_LONGER_TAKING";
  createdAt?: string | null;
};

type MessageThread = {
  id: string;
  patientId?: string | null;
  patientName: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  status: string;
};

type LabOrder = {
  id: string;
  test: string;
  ordered: string;
  uploadedBy?: "patient" | "provider" | null;
  fileName?: string | null;
};

type ProviderPrescription = {
  id: string;
  medication: string;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    patientRecordNumber?: string | null;
  } | null;
  changeRequests?: Array<{
    id: string;
    action: "CONTINUE" | "ADJUST" | "NO_LONGER_TAKING";
    note?: string | null;
    status: "PENDING" | "APPROVED" | "DECLINED";
    createdAt?: string | null;
  }>;
};

export async function loadProviderNotificationItems() {
  const [appointments, labOrders, threads, prescriptions] = await Promise.all([
    fetchApi("/providers/appointments"),
    fetchApi("/providers/clinical/lab-orders"),
    fetchApi("/providers/messages/threads"),
    fetchApi("/providers/prescriptions"),
  ]);

  const bookingNotifications: ProviderNotificationItem[] = (Array.isArray(appointments) ? appointments : [])
    .filter((row) => row?.status === "REQUESTED")
    .map((row) => {
      const patientName = `${row?.patient?.firstName ?? "Patient"} ${row?.patient?.lastName ?? ""}`.trim();
      return {
        id: `booking-${row.id}`,
        title: "New booking request",
        detail: patientName || "A patient requested a booking.",
        kind: "booking",
        target: "bookings",
        appointmentId: row.id,
        patientId: row?.patient?.id ?? row?.patientId,
        patientName,
        patientRecordNumber: row?.patient?.patientRecordNumber ?? null,
        createdAt: row?.createdAt ?? row?.startAt ?? null,
      };
    });

  const labNotifications: ProviderNotificationItem[] = (Array.isArray(labOrders) ? labOrders : [])
    .filter((row: LabOrder) => row?.uploadedBy === "patient")
    .map((row: LabOrder) => ({
      id: `lab-${row.id}`,
      title: "Patient uploaded a lab result",
      detail: row.fileName ? `${row.test} - ${row.fileName}` : row.test,
      kind: "lab",
      target: "laborders",
      createdAt: row.ordered,
    }));

  const messageNotifications: ProviderNotificationItem[] = (Array.isArray(threads) ? threads : [])
    .filter((row: MessageThread) => Boolean(row?.lastMessage))
    .map((row: MessageThread) => ({
      id: `message-${row.id}`,
      title: "New message update",
      detail: `${row.patientName}: ${row.lastMessage}`,
      kind: "message",
      target: "messages",
      appointmentId: row.id,
      patientId: row.patientId ?? undefined,
      patientName: row.patientName,
      createdAt: row.lastMessageAt ?? null,
    }));

  const prescriptionNotifications: ProviderNotificationItem[] = (Array.isArray(prescriptions) ? prescriptions : []).flatMap(
    (prescription: ProviderPrescription) => {
      const patientName =
        `${prescription.patient?.firstName ?? ""} ${prescription.patient?.lastName ?? ""}`.trim() ||
        "Patient";

      return (prescription.changeRequests ?? [])
        .filter((request) => request.status === "PENDING")
        .map((request) => ({
          id: `prescription-${request.id}`,
          title: "Medication request needs review",
          detail: `${patientName} requested ${formatMedicationAction(request.action)} for ${prescription.medication}.`,
          kind: "prescription" as const,
          target: "prescriptions" as const,
          patientId: prescription.patient?.id,
          patientName,
          patientRecordNumber: prescription.patient?.patientRecordNumber ?? null,
          reason: request.note,
          requestAction: request.action,
          createdAt: request.createdAt ?? null,
        }));
    },
  );

  return [...bookingNotifications, ...labNotifications, ...messageNotifications, ...prescriptionNotifications].sort(
    (a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    },
  );
}

export function notificationPatient(item: ProviderNotificationItem): PatientRow | null {
  if (!item.patientId) return null;
  const [first = "Patient", last = ""] = (item.patientName || "Patient").split(" ");
  return {
    id: item.patientId,
    patientRecordNumber: item.patientRecordNumber || "",
    init: `${first[0] ?? "P"}${last[0] ?? ""}`.toUpperCase(),
    color: "teal",
    name: item.patientName || "Patient",
    age: null,
    gender: "—",
    condition: "General",
    lastVisit: "-",
    nextVisit: "-",
    status: "Active",
    risk: "Low",
  };
}

export function formatMedicationAction(action: string) {
  if (action === "NO_LONGER_TAKING") return "no longer taking";
  return action.toLowerCase();
}

