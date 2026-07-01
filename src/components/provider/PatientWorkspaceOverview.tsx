"use client";

import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import type { PatientRow } from "@/types";
import { patientStatusVariant, riskVariant } from "@/types";
import { useProviderUi } from "@/components/provider/ProviderUiContext";

export default function PatientWorkspaceOverview({ patient }: { patient?: PatientRow | null }) {
  const { navigateTo, closePatientWorkspace } = useProviderUi();

  if (!patient) {
    return (
      <Card>
        <CardHeader title="Patient Workspace" subtitle="Select a patient from My Patients to begin." />
      </Card>
    );
  }

  const summaryCards = [
    { label: "Primary condition", value: patient.condition || "General" },
    { label: "Next visit", value: patient.nextVisit || "Not scheduled" },
    { label: "Email", value: patient.email || "Not provided" },
    { label: "Phone", value: patient.phone || "Not provided" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-primary-contrast-soft)]">
              Patient workspace
            </div>
            <h2 className="mt-2 text-2xl font-bold text-[var(--color-on-primary)]">{patient.name}</h2>
            <p className="mt-2 text-sm text-[var(--color-primary-contrast-soft)]">
              Work only on this patient&apos;s records, messages, prescriptions, lab results, vitals, and history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="gray" className="border border-white/20 bg-white/15 text-[var(--color-on-primary)]">
              {patient.age ?? "—"}y / {patient.gender}
            </Badge>
            <Badge variant={patientStatusVariant[patient.status]}>{patient.status}</Badge>
            <Badge variant={riskVariant[patient.risk]}>{patient.risk} risk</Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-white/25 bg-white/10 text-[var(--color-on-primary)] hover:bg-white/20"
              onClick={closePatientWorkspace}
            >
              Exit patient
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {card.label}
              </div>
              <div className="mt-3 text-base font-semibold text-[var(--color-text)]">{card.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Patient Snapshot" subtitle={patient.patientRecordNumber || "Patient profile"} />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="text-xs text-[var(--color-text-muted)]">Weight</div>
              <div className="mt-2 font-semibold text-[var(--color-text)]">
                {patient.patientVitals?.weight ? `${patient.patientVitals.weight} kg` : "Not provided"}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="text-xs text-[var(--color-text-muted)]">Blood Pressure</div>
              <div className="mt-2 font-semibold text-[var(--color-text)]">
                {patient.patientVitals?.bloodPressure || "Not provided"}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="text-xs text-[var(--color-text-muted)]">Pulse</div>
              <div className="mt-2 font-semibold text-[var(--color-text)]">
                {patient.patientVitals?.pulseRate ? `${patient.patientVitals.pulseRate} bpm` : "Not provided"}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="text-xs text-[var(--color-text-muted)]">History</div>
              <div className="mt-2 font-semibold text-[var(--color-text)]">
                {patient.patientHistory?.medicalHistory || "No medical history recorded"}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Workspace Actions" subtitle="Jump straight into this patient&apos;s workflow." />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {[
              { label: "Messages", page: "patient-messages" as const },
              { label: "Patient Notes", page: "patient-notes" as const },
              { label: "Prescriptions", page: "patient-prescriptions" as const },
              { label: "Lab Results", page: "patient-laborders" as const },
              { label: "Vital Trends", page: "patient-vitals" as const },
              { label: "Medical History", page: "patient-medical-history" as const },
              { label: "General History", page: "patient-general-history" as const },
            ].map((action) => (
              <Button
                key={action.page}
                variant="outline"
                className="justify-start rounded-xl px-4 py-3 text-sm font-semibold"
                onClick={() => navigateTo(action.page)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
