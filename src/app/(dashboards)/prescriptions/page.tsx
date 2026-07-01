"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import RightDrawer from "@/components/shared/RightDrawer";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import { cn } from "@/lib/utils";
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
  reviewMedicationChangeRequest,
} from "@/services/provider-prescriptions.service";
import {
  formatPatientName,
  getProviderPatientMap,
  getProviderActivePatientOptions,
} from "@/services/provider-patients.service";

export default function PrescriptionsPage() {
  const { patientWorkspace, notify } = useProviderUi();
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

  // Tabs: ACTIVE vs HISTORY (DISCONTINUED, CANCELLED, COMPLETED)
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  // Review Drawer state
  const [reviewRequest, setReviewRequest] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "DECLINED" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    Promise.all([getProviderPrescriptions(), getProviderActivePatientOptions(), getProviderPatientMap()]).then(
      ([prescriptions, options, map]) => {
        setRows(prescriptions);
        setPatientOptions(options);
        setPatientMap(map);
      }
    );
  }, []);

  // Filter rows based on workspace patient and active tab
  const visibleRows = patientWorkspace
    ? rows.filter((row) => row.patientId === patientWorkspace.id && row.status === "ACTIVE")
    : rows.filter((row) => {
        if (activeTab === "ACTIVE") return row.status === "ACTIVE";
        return row.status !== "ACTIVE";
      });

  // Extract pending change requests
  const pendingRequests = rows.flatMap((prescription) => {
    if (patientWorkspace && prescription.patientId !== patientWorkspace.id) {
      return [];
    }
    return (prescription.changeRequests ?? [])
      .filter((req) => req.status === "PENDING")
      .map((req) => ({
        ...req,
        prescriptionId: prescription.id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        patientName: formatPatientName(patientMap[prescription.patientId]) || "Patient",
      }));
  });

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
    setPatientId(patientWorkspace?.id || "");
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
    try {
      if (editingRow) {
        const pendingReq = editingRow.changeRequests?.find((r) => r.status === "PENDING");
        if (pendingReq) {
          await reviewMedicationChangeRequest(pendingReq.id, {
            status: "APPROVED",
            physicianNote: `Adjusted by provider to: ${dosage} · ${frequency} · ${duration}`,
          });
        }

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
        const refreshed = await getProviderPrescriptions();
        setRows(refreshed);
        notify("Prescription updated.");
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
        notify("Prescription created.");
      }
      closeDrawer();
    } catch {
      notify("Failed to save prescription.");
    } finally {
      setSaving(false);
    }
  }

  function openReviewDialog(req: any, status: "APPROVED" | "DECLINED") {
    setReviewRequest(req);
    setReviewStatus(status);
    setReviewNote("");
  }

  async function handleReviewSubmit() {
    if (!reviewRequest || !reviewStatus) return;
    setSubmittingReview(true);
    try {
      await reviewMedicationChangeRequest(reviewRequest.id, {
        status: reviewStatus,
        physicianNote: reviewNote.trim() || undefined,
      });
      notify(
        reviewStatus === "APPROVED"
          ? "Medication change approved."
          : "Medication change request declined."
      );
      
      const refreshed = await getProviderPrescriptions();
      setRows(refreshed);
      setReviewRequest(null);
      setReviewStatus(null);
      setReviewNote("");
    } catch {
      notify("Failed to submit review decision.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleReviewAction(
    requestId: string,
    p: ProviderPrescription,
    choice: "CONTINUE" | "ADJUST" | "DISCONTINUE"
  ) {
    if (choice === "CONTINUE") {
      try {
        await reviewMedicationChangeRequest(requestId, {
          status: "DECLINED",
          physicianNote: "Plan continued by provider.",
        });
        notify("Medication plan continued.");
        const refreshed = await getProviderPrescriptions();
        setRows(refreshed);
      } catch {
        notify("Failed to continue medication plan.");
      }
    } else if (choice === "DISCONTINUE") {
      try {
        // Approve change request to mark it reviewed
        await reviewMedicationChangeRequest(requestId, {
          status: "APPROVED",
          physicianNote: "Discontinued by provider.",
        });
        // Discontinue the prescription status itself
        await updateProviderPrescription({
          id: p.id,
          patientId: p.patientId,
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions || undefined,
          status: "DISCONTINUED",
        });
        notify("Medication discontinued.");
        const refreshed = await getProviderPrescriptions();
        setRows(refreshed);
      } catch {
        notify("Failed to discontinue medication plan.");
      }
    } else if (choice === "ADJUST") {
      openEditDrawer(p);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)]">
            {patientWorkspace ? `${patientWorkspace.name} Prescriptions` : "Prescriptions"}
          </h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">
            {patientWorkspace
              ? "You are working inside one patient record only."
              : "Create and update prescriptions tied to patient records."}
          </p>
        </div>
        <Button
          onClick={openCreateDrawer}
          className="w-full sm:w-auto bg-[var(--color-banner-veil)] border border-[var(--color-banner-border)] text-[var(--color-on-primary)] hover:bg-[var(--color-banner-veil-hover)]"
        >
          + New Prescription
        </Button>
      </div>

      {/* Pending Change Requests Alerts */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader
            title="Medication Change Requests Pending Review"
            subtitle={`There are ${pendingRequests.length} requests from your patients requiring clinical decision.`}
          />
          <div className="px-5 pb-5 space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{req.patientName}</span>
                    <Badge variant="yellow">{req.action.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-slate-700">
                    Request for <strong className="text-teal-700">{req.medication}</strong> ({req.dosage} · {req.frequency})
                  </p>
                  {req.note && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                      <strong>Patient Reason:</strong> {req.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={() => openReviewDialog(req, "APPROVED")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-500 text-white"
                    onClick={() => openReviewDialog(req, "DECLINED")}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Medication List Section */}
      {patientWorkspace ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--color-text)]">Medications</h3>
          </div>

          {visibleRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">
              No medications found in this view.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleRows.map((p) => {
                const pendingReq = p.changeRequests?.find((req) => req.status === "PENDING");
                if (pendingReq) {
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border-2 border-rose-500 bg-[var(--color-surface)] p-5 shadow-md flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                            Update medication plan
                          </span>
                          <Badge variant="red">{p.status}</Badge>
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-[var(--color-text)]">{p.medication}</h4>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)] font-medium">
                            {p.dosage} · {p.frequency} · {p.duration}
                          </p>
                        </div>
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-xs text-[var(--color-text)] font-semibold leading-relaxed">
                          Patient reports: {pendingReq.action === "NO_LONGER_TAKING" ? "no longer taking this medication." : pendingReq.action === "ADJUST" ? "need to adjust this medication." : "want to continue this medication."}
                          {pendingReq.note && (
                            <div className="mt-2 text-[var(--color-text-muted)] font-normal italic">
                              &quot;{pendingReq.note}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]/50">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex-1"
                          onClick={() => handleReviewAction(pendingReq.id, p, "CONTINUE")}
                        >
                          Continue
                        </Button>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold flex-1"
                          onClick={() => handleReviewAction(pendingReq.id, p, "ADJUST")}
                        >
                          Adjust
                        </Button>
                        <Button
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold flex-1"
                          onClick={() => handleReviewAction(pendingReq.id, p, "DISCONTINUE")}
                        >
                          Discontinue
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-[var(--color-text)]">{p.medication}</h4>
                        <Badge variant={prescriptionStatusVariant[p.status]}>{p.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)] font-medium">
                        {p.dosage} · {p.frequency} · {p.duration}
                      </p>
                      {p.instructions && (
                        <p className="mt-3 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] p-2.5 rounded-lg border border-[var(--color-border)] italic leading-relaxed">
                          {p.instructions}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]/50">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDrawer(p)}
                        className="w-full justify-center"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader
            title="Medication List"
            subtitle={`${visibleRows.length} therapy records`}
            actions={
              <div className="flex gap-1.5 bg-[var(--color-surface-soft)] p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    activeTab === "ACTIVE"
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab("HISTORY")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    activeTab === "HISTORY"
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  )}
                >
                  History
                </button>
              </div>
            }
          />
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
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
                      No medications found in this view.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--color-surface-soft)] transition-colors">
                      <td className="px-5 py-3 font-semibold text-[var(--color-text)] whitespace-nowrap">
                        {formatPatientName(patientMap[p.patientId])}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-text)] whitespace-nowrap">{p.medication}</td>
                      <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.dosage}</td>
                      <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.frequency}</td>
                      <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.duration}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={prescriptionStatusVariant[p.status]}>{p.status}</Badge>
                          {(p.changeRequests ?? []).some((req) => req.status === "PENDING") && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Review Pending
                            </span>
                          )}
                        </div>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Creation & Editing Prescription Drawer */}
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
              disabled={Boolean(patientWorkspace)}
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
                <option value="DISCONTINUED">Discontinued</option>
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

      {/* Medication Change Request Review Drawer */}
      <RightDrawer
        open={Boolean(reviewRequest)}
        onClose={() => setReviewRequest(null)}
        title={reviewStatus === "APPROVED" ? "Approve Change Request" : "Decline Change Request"}
        subtitle={reviewRequest ? `Reviewing request for ${reviewRequest.patientName}` : ""}
        footer={(
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewRequest(null)}
              className="flex-1 w-full"
            >
              Cancel
            </Button>
            <Button
              className={cn(
                "flex-1 w-full text-white",
                reviewStatus === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
              )}
              disabled={submittingReview}
              onClick={handleReviewSubmit}
            >
              {submittingReview ? "Submitting..." : reviewStatus === "APPROVED" ? "Confirm Approval" : "Confirm Decline"}
            </Button>
          </div>
        )}
      >
        {reviewRequest && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request Details</div>
              <div className="text-sm font-semibold text-slate-700">Action: {reviewRequest.action.replaceAll("_", " ")}</div>
              <div className="text-sm text-slate-600">Medication: {reviewRequest.medication}</div>
              {reviewRequest.note && <div className="text-xs text-slate-500">Patient Reason: &quot;{reviewRequest.note}&quot;</div>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Physician note / Reason (Optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={reviewStatus === "APPROVED" ? "Add instructions or notes..." : "Enter reason for declining..."}
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
}
