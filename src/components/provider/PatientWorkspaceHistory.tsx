"use client";

import { useEffect, useMemo, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import type { PatientRow, ProviderBooking } from "@/types";
import { bookingStatusVariant } from "@/types";
import { getProviderBookings } from "@/services/provider-bookings.service";
import { fetchApi } from "@/lib/api";

type HistoryTimelineItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
  badgeText: string;
  badgeVariant: "gray" | "blue" | "green" | "yellow" | "red" | "purple" | "orange" | "teal";
};

export default function PatientWorkspaceHistory({
  patient,
  type,
}: {
  patient?: PatientRow | null;
  type: "medical" | "general";
}) {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    if (!patient?.id) return;
    
    // Load bookings
    getProviderBookings()
      .then((rows) => setBookings(rows.filter((row) => row.patientId === patient.id)))
      .catch(() => setBookings([]));

    // Load prescriptions to construct discontinued history and reviewed change requests history
    fetchApi("/providers/prescriptions")
      .then((rows) => setPrescriptions(Array.isArray(rows) ? rows.filter((row) => row.patientId === patient.id) : []))
      .catch(() => setPrescriptions([]));
  }, [patient?.id]);

  const timelineItems = useMemo(() => {
    if (type !== "general") return [];

    // 1. Visit logs (bookings)
    const visits = bookings.map((b) => ({
      id: `visit-${b.id}`,
      title: b.reason || "Appointment Visit",
      detail: `${b.preferredDate} · ${b.preferredTime}${b.endTime ? ` - ${b.endTime}` : ""}`,
      date: b.startAt || b.preferredDate || new Date().toISOString(),
      badgeText: b.status,
      badgeVariant: (bookingStatusVariant[b.status] || "gray") as any,
    }));

    // 2. Discontinued prescriptions
    const discontinued = prescriptions
      .filter((p) => p.status === "DISCONTINUED")
      .map((p) => ({
        id: `discontinued-${p.id}`,
        title: `Discontinued: ${p.medication}`,
        detail: `${p.dosage} · ${p.frequency} · ${p.duration}`,
        date: p.updatedAt || p.createdAt || new Date().toISOString(),
        badgeText: "Discontinued",
        badgeVariant: "red" as const,
      }));

    // 3. Approved/Declined medication change requests
    const changeReviews = prescriptions.flatMap((p) =>
      (p.changeRequests ?? [])
        .filter((req: any) => req.status === "APPROVED" || req.status === "DECLINED")
        .map((req: any) => ({
          id: `req-review-${req.id}`,
          title: `Medication request ${req.status.toLowerCase()}: ${p.medication}`,
          detail: `Action requested: ${req.action.toLowerCase().replaceAll("_", " ")}${
            req.physicianNote ? ` · Physician Note: ${req.physicianNote}` : ""
          }`,
          date: req.updatedAt || req.createdAt || p.updatedAt || new Date().toISOString(),
          badgeText: req.status === "APPROVED" ? "Approved" : "Declined",
          badgeVariant: req.status === "APPROVED" ? ("green" as const) : ("red" as const),
        }))
    );

    return [...visits, ...discontinued, ...changeReviews].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [bookings, prescriptions, type]);

  if (!patient) {
    return (
      <Card>
        <CardHeader title="Patient History" subtitle="Select a patient to view history." />
      </Card>
    );
  }

  if (type === "medical") {
    return (
      <Card>
        <CardHeader title="Medical History" subtitle={`Background for ${patient.name}`} />
        <div className="p-5">
          <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
              Allergy history
            </div>
            <div className="mt-2 text-sm font-semibold text-[var(--color-text)]">
              {patient.patientHistory?.allergyHistory || "No allergies recorded"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 md:grid-cols-2">
          {[
            { label: "Medical history", value: patient.patientHistory?.medicalHistory || "Not provided" },
            { label: "Surgical history", value: patient.patientHistory?.surgicalHistory || "Not provided" },
            { label: "Family history", value: patient.patientHistory?.familyHistory || "Not provided" },
            { label: "Social history", value: patient.patientHistory?.socialHistory || "Not provided" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {item.label}
              </div>
              <div className="mt-2 text-sm text-[var(--color-text)]">{item.value}</div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="General History" subtitle={`${timelineItems.length} records`} />
      <div className="divide-y divide-[var(--color-border)]">
        {timelineItems.length === 0 ? (
          <div className="p-5 text-sm text-[var(--color-text-muted)]">No general history records found.</div>
        ) : (
          timelineItems.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--color-text)]">{item.title}</div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {item.detail}
                </div>
                <div className="mt-1 text-[10px] text-[var(--color-text-muted)] opacity-80">
                  {new Date(item.date).toLocaleString()}
                </div>
              </div>
              <Badge variant={item.badgeVariant}>{item.badgeText}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
