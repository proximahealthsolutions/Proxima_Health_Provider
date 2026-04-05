import type { LabPriority, LabStatus, ProviderLabOrder } from "@/types";
import { fetchApi } from "@/lib/api";

export async function getProviderLabOrders() {
  const resp = await fetchApi("/providers/clinical/lab-orders");
  return Array.isArray(resp) ? (resp as ProviderLabOrder[]) : [];
}

export async function createProviderLabOrder(input: {
  patientId: string;
  test: string;
  priority: LabPriority;
}) {
  const created = await fetchApi("/providers/clinical/lab-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return created as ProviderLabOrder;
}

export async function updateProviderLabOrder(input: {
  id: string;
  patientId?: string;
  test?: string;
  priority?: LabPriority;
  status: LabStatus;
  resultNote?: string;
}) {
  const updated = await fetchApi(`/providers/clinical/lab-orders/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      patientId: input.patientId,
      test: input.test,
      priority: input.priority,
      status: input.status,
      resultNote: input.resultNote,
    }),
  });
  return updated as ProviderLabOrder;
}
