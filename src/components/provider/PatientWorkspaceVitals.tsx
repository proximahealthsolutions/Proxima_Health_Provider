"use client";

import Card, { CardHeader } from "@/components/shared/Card";
import type { PatientRow } from "@/types";

export default function PatientWorkspaceVitals({ patient }: { patient?: PatientRow | null }) {
  if (!patient) {
    return (
      <Card>
        <CardHeader title="Vital Trends" subtitle="Select a patient to view vitals." />
      </Card>
    );
  }

  const metrics = [
    { label: "Weight", value: patient.patientVitals?.weight ? `${patient.patientVitals.weight} kg` : "Not provided" },
    { label: "Height", value: patient.patientVitals?.height ? `${patient.patientVitals.height} cm` : "Not provided" },
    { label: "BMI", value: typeof patient.patientVitals?.bmi === "number" ? String(patient.patientVitals.bmi) : "Not provided" },
    { label: "Blood Pressure", value: patient.patientVitals?.bloodPressure || "Not provided" },
    { label: "Pulse Rate", value: patient.patientVitals?.pulseRate ? `${patient.patientVitals.pulseRate} bpm` : "Not provided" },
  ];
  const snapshots = [...(patient.patientVitalSnapshots ?? [])].sort(
    (a, b) =>
      new Date(b.recordedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.recordedAt ?? a.createdAt ?? 0).getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-[var(--color-surface)] p-6 shadow-sm border border-[var(--color-border)]">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Vital Trends</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Current recorded vitals for {patient.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {metric.label}
              </div>
              <div className="mt-3 text-xl font-bold text-[var(--color-text)]">{metric.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Historical Vitals" subtitle={`${snapshots.length} recorded update${snapshots.length === 1 ? "" : "s"}`} />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Blood pressure</th>
                <th className="px-5 py-3">Heart rate</th>
                <th className="px-5 py-3">Weight</th>
                <th className="px-5 py-3">BMI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[var(--color-text-muted)]">
                    No historical vitals recorded yet.
                  </td>
                </tr>
              ) : (
                snapshots.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">
                      {new Date(row.recordedAt ?? row.createdAt ?? Date.now()).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text)]">{row.bloodPressure || "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text)]">{row.pulseRate ? `${row.pulseRate} bpm` : "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text)]">{row.weight ? `${row.weight} kg` : "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text)]">{typeof row.bmi === "number" ? row.bmi : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
