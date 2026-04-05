"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import RightDrawer from "@/components/shared/RightDrawer";
import {
  PrescriptionStatus,
  ProviderPatientDirectoryEntry,
  ProviderPrescription,
  prescriptionStatusVariant,
} from "@/types";
import {
  createProviderPrescription,
  getProviderPrescriptions,
  updateProviderPrescription,
} from "@/services/provider-prescriptions.service";
import {
  formatPatientName,
  getProviderPatientMap,
  getProviderActivePatientOptions,
} from "@/services/provider-patients.service";

export default function PrescriptionsPage() {
  const [rows, setRows] = useState<ProviderPrescription[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingRow, setEditingRow] = useState<ProviderPrescription | null>(null);
  const [patientId, setPatientId] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");
  const [status, setStatus] = useState<PrescriptionStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [patientOptions, setPatientOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [patientMap, setPatientMap] = useState<Record<string, ProviderPatientDirectoryEntry>>({});

  useEffect(() => {
    Promise.all([getProviderPrescriptions(), getProviderActivePatientOptions(), getProviderPatientMap()]).then(
      ([prescriptions, options, map]) => {
        setRows(prescriptions);
        setPatientOptions(options);
        setPatientMap(map);
      }
    );
  }, []);

  function closeDrawer() {
    setShowDrawer(false);
    setEditingRow(null);
    setPatientId("");
    setMedication("");
    setDosage("");
    setFrequency("");
    setDuration("");
    setInstructions("");
    setStatus("ACTIVE");
  }

  function openCreateDrawer() {
    setEditingRow(null);
    setPatientId("");
    setMedication("");
    setDosage("");
    setFrequency("");
    setDuration("");
    setInstructions("");
    setStatus("ACTIVE");
    setShowDrawer(true);
  }

  function openEditDrawer(row: ProviderPrescription) {
    setEditingRow(row);
    setPatientId(row.patientId);
    setMedication(row.medication);
    setDosage(row.dosage);
    setFrequency(row.frequency);
    setDuration(row.duration);
    setInstructions(row.instructions || "");
    setStatus(row.status);
    setShowDrawer(true);
  }

  async function handleSave() {
    if (!patientId || !medication.trim() || !dosage || !frequency || !duration) return;
    setSaving(true);
    if (editingRow) {
      const updated = await updateProviderPrescription({
        id: editingRow.id,
        patientId,
        medication,
        dosage,
        frequency,
        duration,
        instructions,
        status,
      });
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } else {
      const created = await createProviderPrescription({
        patientId,
        medication,
        dosage,
        frequency,
        duration,
        instructions,
      });
      setRows((prev) => [created, ...prev]);
    }
    setSaving(false);
    closeDrawer();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)]">Prescriptions</h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">Create and update prescriptions tied to patient records.</p>
        </div>
        <Button
          onClick={openCreateDrawer}
          className="w-full sm:w-auto bg-[var(--color-banner-veil)] border border-[var(--color-banner-border)] text-[var(--color-on-primary)] hover:bg-[var(--color-banner-veil-hover)]"
        >
          + New Prescription
        </Button>
      </div>

      <Card>
        <CardHeader title="Medication List" subtitle={`${rows.length} therapy records`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Patient", "Medication", "Dosage", "Frequency", "Duration", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-5 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-surface-soft)] transition-colors">
                  <td className="px-5 py-3 font-semibold text-[var(--color-text)] whitespace-nowrap">
                    {formatPatientName(patientMap[p.patientId])}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text)] whitespace-nowrap">{p.medication}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.dosage}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.frequency}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.duration}</td>
                  <td className="px-5 py-3">
                    <Badge variant={prescriptionStatusVariant[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Button
                      size="sm"
                      className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
                      onClick={() => openEditDrawer(p)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <RightDrawer
        open={showDrawer}
        onClose={closeDrawer}
        title={editingRow ? "Edit Prescription" : "New Prescription"}
        subtitle="Create and maintain a complete medication plan."
        footer={(
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDrawer}
              className="flex-1 w-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
            >
              {saving ? "Saving..." : editingRow ? "Save Changes" : "Save Prescription"}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Patient</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Select patient</option>
              {patientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Medication</label>
            <input
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="Medication name"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Dosage</label>
              <input
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 500mg"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Frequency</label>
              <input
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g. Twice daily"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Duration</label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 14 days"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PrescriptionStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Optional instructions"
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </RightDrawer>
    </div>
  );
}

