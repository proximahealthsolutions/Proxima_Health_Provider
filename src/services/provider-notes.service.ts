import type { ProviderNote } from "@/types";
import { fetchApi } from "@/lib/api";

export async function getProviderNotes() {
  const resp = await fetchApi("/providers/clinical/notes");
  return Array.isArray(resp) ? (resp as ProviderNote[]) : [];
}

export async function createProviderNote(input: {
  patientId: string;
  summary: string;
  tag: string;
}) {
  const row = await fetchApi("/providers/clinical/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return row as ProviderNote;
}

export async function updateProviderNote(input: {
  id: string;
  patientId: string;
  summary: string;
  tag: string;
}) {
  const updated = await fetchApi(`/providers/clinical/notes/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return updated as ProviderNote;
}
