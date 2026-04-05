import type { BookingDecision, CareActionKey, ProviderBooking } from "@/types";
import { fetchApi } from "@/lib/api";

type AppointmentRecord = {
  id: string;
  startAt: string;
  endAt: string;
  status:
    | "REQUESTED"
    | "ACCEPTED"
    | "REJECTED"
    | "IN_PROGRESS"
    | "ENDED_BY_PROVIDER"
    | "CONFIRMED"
    | "DISPUTED"
    | "RESOLVED"
    | "CANCELLED";
  type?: "VIDEO" | "AUDIO";
  chatEnabled?: boolean;
  reason?: string | null;
  rejectionReason?: string | null;
  patientId: string;
  patient?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
    email?: string | null;
    phone?: string | null;
    profileImageUrl?: string | null;
  } | null;
};

const emptyCareActions: Record<CareActionKey, boolean> = {
  clinical_note: false,
  lab_order: false,
  prescription: false,
  follow_up: false,
};

function mapAppointment(appointment: AppointmentRecord): ProviderBooking {
  const date = new Date(appointment.startAt);
  const endDate = new Date(appointment.endAt);
  const statusMap: Record<AppointmentRecord["status"], ProviderBooking["status"]> = {
    REQUESTED: "requested",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    IN_PROGRESS: "in_progress",
    ENDED_BY_PROVIDER: "ended",
    CONFIRMED: "ended",
    DISPUTED: "disputed",
    RESOLVED: "ended",
    CANCELLED: "cancelled",
  };
  const patient = appointment.patient;
  const patientName = patient
    ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim()
    : "Patient";
  return {
    id: appointment.id,
    rawStatus: appointment.status,
    patientId: appointment.patientId,
    patientName,
    patientEmail: patient?.email ?? "",
    patientPhone: patient?.phone ?? "",
    patientAvatarUrl: patient?.profileImageUrl ?? null,
    age: patient?.age ?? 0,
    gender: "M",
    condition: appointment.reason || "General Consultation",
    reason: appointment.reason || "General Consultation",
    preferredDate: date.toLocaleDateString(),
    preferredTime: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    endTime: endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: statusMap[appointment.status],
    decisionNote: appointment.rejectionReason || "",
    careActions: { ...emptyCareActions },
    visitType: appointment.type,
    chatEnabled: appointment.chatEnabled,
  };
}

export async function getProviderBookings(): Promise<ProviderBooking[]> {
  const resp = await fetchApi("/providers/appointments");
  const rows = Array.isArray(resp) ? resp : [];
  return rows.map(mapAppointment);
}

export async function decideProviderBooking(params: {
  bookingId: string;
  decision: BookingDecision;
  decisionNote?: string;
}): Promise<ProviderBooking> {
  const { bookingId, decision, decisionNote } = params;
  if (decision === "accepted") {
    const updated = await fetchApi(`/providers/appointments/${bookingId}/accept`, {
      method: "PATCH",
    });
    return mapAppointment(updated);
  }

  const updated = await fetchApi(`/providers/appointments/${bookingId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason: decisionNote }),
  });
  return mapAppointment(updated);
}

export async function startProviderBooking(bookingId: string): Promise<ProviderBooking> {
  const updated = await fetchApi(`/providers/appointments/${bookingId}/start`, {
    method: "PATCH",
  });
  return mapAppointment(updated);
}

export async function endProviderBooking(bookingId: string): Promise<ProviderBooking> {
  const updated = await fetchApi(`/providers/appointments/${bookingId}/end`, {
    method: "PATCH",
  });
  return mapAppointment(updated);
}

export async function toggleCareAction(params: {
  bookingId: string;
  action: CareActionKey;
}): Promise<ProviderBooking> {
  const { bookingId, action } = params;
  const all = await getProviderBookings();
  const booking = all.find((row) => row.id === bookingId);
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "accepted" && booking.status !== "in_progress") return booking;
  return {
    ...booking,
    careActions: {
      ...booking.careActions,
      [action]: !booking.careActions[action],
    },
  };
}

export async function getAcceptedProviderBookings(): Promise<ProviderBooking[]> {
  const all = await getProviderBookings();
  return all.filter((booking) => booking.status === "accepted");
}
