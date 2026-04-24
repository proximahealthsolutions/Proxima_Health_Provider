import type { ProviderPatientDirectoryEntry } from "@/types";
import { fetchApi } from "@/lib/api";

function fullName(patient: ProviderPatientDirectoryEntry) {
  return `${patient.firstName} ${patient.lastName}`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getProviderPatients() {
  const resp = await fetchApi("/providers/patients");
  const rows = Array.isArray(resp) ? resp : [];
  return rows.map((row: any) => ({
    id: row.id,
    patientRecordNumber: row.patientRecordNumber || "",
    firstName: row.firstName || "Patient",
    lastName: row.lastName || "",
    gender: row.gender || "—",
    age: typeof row.age === "number" ? row.age : null,
    dateOfBirth: row.dateOfBirth || "",
    phone: row.phone || "",
    email: row.email || "",
    createdAt: row.createdAt || "",
    primaryCondition: "General",
    patientVitals: row.patientVitals ?? null,
    patientHistory: row.patientHistory ?? null,
  })) as ProviderPatientDirectoryEntry[];
}

export async function getProviderPatientMap() {
  const rows = await getProviderPatients();
  return rows.reduce<Record<string, ProviderPatientDirectoryEntry>>((acc, row) => {
    acc[row.id] = row;
    return acc;
  }, {});
}

export async function resolvePatientIdByName(name: string) {
  const target = normalizeName(name);
  const rows = await getProviderPatients();
  const found = rows.find((row) => normalizeName(fullName(row)) === target);
  return found?.id || null;
}

export function formatPatientName(patient: ProviderPatientDirectoryEntry | undefined) {
  if (!patient) return "Unknown Patient";
  return fullName(patient);
}

export async function getProviderPatientOptions() {
  const rows = await getProviderPatients();
  return rows.map((row) => ({
    value: row.id,
    label: `${fullName(row)} (${row.primaryCondition})`,
  }));
}

export async function getProviderActivePatientOptions() {
  const [rows, appts] = await Promise.all([
    getProviderPatients(),
    fetchApi("/providers/appointments"),
  ]);
  const activeStatuses = new Set(["REQUESTED", "ACCEPTED", "IN_PROGRESS"]);
  const activePatientIds = new Set(
    (Array.isArray(appts) ? appts : [])
      .filter((appt: any) => activeStatuses.has(appt?.status))
      .map((appt: any) => appt?.patient?.id ?? appt?.patientId)
      .filter(Boolean)
  );
  return rows
    .filter((row) => activePatientIds.has(row.id))
    .map((row) => ({
      value: row.id,
      label: `${fullName(row)} (${row.primaryCondition})`,
    }));
}
