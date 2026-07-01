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

  // We need chronological order for the trend chart (oldest to newest)
  const chronologicalSnapshots = [...snapshots].reverse();

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

      {/* Visual Trends Section */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3">Visual Trends</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TrendCard
            label="Blood Pressure"
            value={patient.patientVitals?.bloodPressure || "--"}
            points={chronologicalSnapshots.map((row) => parseSystolic(row.bloodPressure ?? undefined))}
            unit="systolic"
            accent="#2563eb"
          />
          <TrendCard
            label="Pulse"
            value={patient.patientVitals?.pulseRate ? `${patient.patientVitals.pulseRate} bpm` : "--"}
            points={chronologicalSnapshots.map((row) => toNumber(row.pulseRate ?? undefined))}
            unit="bpm"
            accent="#dc2626"
          />
          <TrendCard
            label="Weight"
            value={patient.patientVitals?.weight ? `${patient.patientVitals.weight} kg` : "--"}
            points={chronologicalSnapshots.map((row) => toNumber(row.weight ?? undefined))}
            unit="kg"
            accent="#0f766e"
          />
        </div>
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

function TrendCard({
  label,
  value,
  points,
  unit,
  accent,
}: {
  label: string;
  value: string;
  points: Array<number | null>;
  unit: string;
  accent: string;
}) {
  const chartPoints = points.filter((point): point is number => typeof point === "number").slice(-8);
  const hasTrend = chartPoints.length > 1;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
          <div className="font-semibold text-[var(--color-text)] mt-1">{value}</div>
        </div>
        <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)]">
          {unit}
        </span>
      </div>

      <div className="mt-4 h-24 rounded-lg bg-[var(--color-surface-soft)] p-3">
        {hasTrend ? (
          <svg viewBox="0 0 220 72" className="h-full w-full" role="img" aria-label={`${label} trend chart`}>
            <polyline
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={buildTrendPoints(chartPoints)}
            />
            {chartPoints.map((point, index) => {
              const [cx, cy] = buildPointCoordinate(chartPoints, index);
              return <circle key={`${point}-${index}`} cx={cx} cy={cy} r="4" fill={accent} />;
            })}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
            Add more vitals to see a trend.
          </div>
        )}
      </div>
    </div>
  );
}

function buildTrendPoints(points: number[]) {
  return points.map((_, index) => buildPointCoordinate(points, index).join(",")).join(" ");
}

function buildPointCoordinate(points: number[], index: number) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const x = points.length === 1 ? 110 : (index / (points.length - 1)) * 220;
  const y = 64 - ((points[index] - min) / range) * 56;
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

function toNumber(value?: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseSystolic(value?: string) {
  if (!value) return null;
  return toNumber(value.split("/")[0]);
}
