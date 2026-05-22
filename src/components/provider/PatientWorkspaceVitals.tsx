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
    { label: "Blood Pressure", value: patient.patientVitals?.bloodPressure || "Not provided" },
    { label: "Pulse Rate", value: patient.patientVitals?.pulseRate ? `${patient.patientVitals.pulseRate} bpm` : "Not provided" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-[var(--color-surface)] p-6 shadow-sm border border-[var(--color-border)]">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Vital Trends</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Current recorded vitals for {patient.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
    </div>
  );
}
