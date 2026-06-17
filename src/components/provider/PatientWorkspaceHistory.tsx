"use client";

import { useEffect, useMemo, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import type { PatientRow, ProviderBooking } from "@/types";
import { bookingStatusVariant } from "@/types";
import { getProviderBookings } from "@/services/provider-bookings.service";

export default function PatientWorkspaceHistory({ patient }: { patient?: PatientRow | null }) {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);

  useEffect(() => {
    if (!patient?.id) return;
    getProviderBookings()
      .then((rows) => setBookings(rows.filter((row) => row.patientId === patient.id)))
      .catch(() => setBookings([]));
  }, [patient?.id]);

  const historyRows = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => new Date(b.startAt ?? 0).getTime() - new Date(a.startAt ?? 0).getTime()),
    [bookings]
  );

  if (!patient) {
    return (
      <Card>
        <CardHeader title="Patient History" subtitle="Select a patient to view history." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Medical History" subtitle={`Background for ${patient.name}`} />
        <div className="p-5">
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
              Allergy history
            </div>
            <div className="mt-2 text-sm font-semibold text-red-950">
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

      <Card>
        <CardHeader title="Visit History" subtitle={`${historyRows.length} appointment records`} />
        <div className="divide-y divide-[var(--color-border)]">
          {historyRows.length === 0 ? (
            <div className="p-5 text-sm text-[var(--color-text-muted)]">No visits recorded yet for this patient.</div>
          ) : (
            historyRows.map((booking) => (
              <div key={booking.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{booking.reason}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {booking.preferredDate} · {booking.preferredTime}
                    {booking.endTime ? ` - ${booking.endTime}` : ""}
                  </div>
                </div>
                <Badge variant={bookingStatusVariant[booking.status]}>{booking.status}</Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
