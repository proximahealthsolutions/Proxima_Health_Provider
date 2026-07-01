import type { PrescriptionStatus, ProviderPrescription } from "@/types";
import { fetchApi } from "@/lib/api";

export async function getProviderPrescriptions() {
  const resp = await fetchApi("/providers/prescriptions");
  return Array.isArray(resp) ? (resp as ProviderPrescription[]) : [];
}

export async function createProviderPrescription(input: {
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}) {
  const { patientId, medication, dosage, frequency, duration, instructions } = input;
  const created = await fetchApi("/providers/prescriptions", {
    method: "POST",
    body: JSON.stringify({
      patientId,
      medication,
      dosage,
      frequency,
      duration,
      instructions,
    }),
  });
  return created as ProviderPrescription;
}

export async function updatePrescriptionStatus(input: {
  id: string;
  status: PrescriptionStatus;
}) {
  const updated = await fetchApi(`/providers/prescriptions/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: input.status }),
  });
  return updated as ProviderPrescription;
}

export async function updateProviderPrescription(input: {
  id: string;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  status?: PrescriptionStatus;
}) {
  const { id, patientId, medication, dosage, frequency, duration, instructions, status } = input;
  const updated = await fetchApi(`/providers/prescriptions/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      patientId,
      medication,
      dosage,
      frequency,
      duration,
      instructions,
      status,
    }),
  });
  return updated as ProviderPrescription;
}

export async function reviewMedicationChangeRequest(
  requestId: string,
  input: {
    status: "APPROVED" | "DECLINED";
    physicianNote?: string;
  }
) {
  const updated = await fetchApi(`/providers/prescriptions/change-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return updated;
}
