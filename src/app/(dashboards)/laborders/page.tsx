"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import RightDrawer from "@/components/shared/RightDrawer";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import {
  LabPriority,
  LabStatus,
  ProviderPatientDirectoryEntry,
  ProviderLabOrder,
  labPriorityVariant,
  labStatusVariant,
} from "@/types";
import {
  createProviderLabOrder,
  getProviderLabOrders,
  updateProviderLabOrder,
} from "@/services/provider-laborders.service";
import {
  formatPatientName,
  getProviderPatientMap,
  getProviderActivePatientOptions,
} from "@/services/provider-patients.service";

export default function LabOrdersPage() {
  const { patientWorkspace } = useProviderUi();
  const [rows, setRows] = useState<ProviderLabOrder[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingRow, setEditingRow] = useState<ProviderLabOrder | null>(null);
  const [patientId, setPatientId] = useState("");
  const [test, setTest] = useState("");
  const [priority, setPriority] = useState<LabPriority>("Routine");
  const [status, setStatus] = useState<LabStatus>("Processing");
  const [resultNote, setResultNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [patientOptions, setPatientOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [patientMap, setPatientMap] = useState<Record<string, ProviderPatientDirectoryEntry>>({});

  useEffect(() => {
    Promise.all([getProviderLabOrders(), getProviderActivePatientOptions(), getProviderPatientMap()]).then(
      ([labOrders, options, map]) => {
        setRows(labOrders);
        setPatientOptions(options);
        setPatientMap(map);
      }
    );
  }, []);

  const visibleRows = patientWorkspace
    ? rows.filter((row) => row.patientId === patientWorkspace.id)
    : rows;

  function closeDrawer() {
    setShowDrawer(false);
    setEditingRow(null);
    setPatientId("");
    setTest("");
    setPriority("Routine");
    setStatus("Processing");
    setResultNote("");
  }

  function openCreateDrawer() {
    setEditingRow(null);
    setPatientId(patientWorkspace?.id || "");
    setTest("");
    setPriority("Routine");
    setStatus("Processing");
    setResultNote("");
    setShowDrawer(true);
  }

  function openEditDrawer(row: ProviderLabOrder) {
    setEditingRow(row);
    setPatientId(row.patientId);
    setTest(row.test);
    setPriority(row.priority);
    setStatus(row.status);
    setResultNote(row.resultNote || "");
    setShowDrawer(true);
  }

  async function handleSave() {
    if (!patientId || !test.trim()) return;
    setSaving(true);
    if (editingRow) {
      const updated = await updateProviderLabOrder({
        id: editingRow.id,
        patientId,
        test,
        priority,
        status,
        resultNote,
      });
      setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } else {
      const created = await createProviderLabOrder({ patientId, test, priority });
      setRows((prev) => [created, ...prev]);
    }
    setSaving(false);
    closeDrawer();
  }

  function downloadFile(row: ProviderLabOrder) {
    if (!row.fileUrl) return;
    if (typeof window !== "undefined") {
      window.open(row.fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)]">
            {patientWorkspace ? `${patientWorkspace.name} Lab Results` : "Lab Orders"}
          </h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">
            {patientWorkspace
              ? "All lab work shown here is tied to the selected patient only."
              : "Create lab orders and update results as they progress."}
          </p>
        </div>
        <Button
          onClick={openCreateDrawer}
          className="w-full sm:w-auto bg-[var(--color-banner-veil)] border border-[var(--color-banner-border)] text-[var(--color-on-primary)] hover:bg-[var(--color-banner-veil-hover)]"
        >
          + New Lab Result
        </Button>
      </div>

      <Card>
        <CardHeader title="Order Tracking" actions={<Badge variant="orange">{visibleRows.filter((r) => r.priority === "Urgent").length} Urgent</Badge>} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Patient", "Test", "Ordered", "Priority", "Status", "Result", "Action"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-5 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {visibleRows.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--color-surface-soft)] transition-colors">
                  <td className="px-5 py-3 font-semibold text-[var(--color-text)] whitespace-nowrap">
                    {formatPatientName(patientMap[o.patientId])}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text)] whitespace-nowrap">{o.test}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{o.ordered}</td>
                  <td className="px-5 py-3">
                    <Badge variant={labPriorityVariant[o.priority]}>{o.priority}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={labStatusVariant[o.status]}>{o.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--color-text-muted)] max-w-[220px]">
                    <div className="space-y-1">
                      <div>{o.resultNote || "—"}</div>
                      {o.fileName && (
                        <div className="text-[11px] font-medium text-[var(--color-primary)]">
                          PDF: {o.fileName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => openEditDrawer(o)}>
                        Edit
                      </Button>
                      {o.fileUrl && (
                        <Button size="sm" variant="outline" onClick={() => downloadFile(o)}>
                          Download PDF
                        </Button>
                      )}
                    </div>
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
        title={editingRow ? "Edit Lab Result" : "New Lab Result"}
        subtitle="Track tests from request to reviewed outcome."
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
              {saving ? "Saving..." : editingRow ? "Save Changes" : "Save Lab Result"}
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
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Test</label>
            <input
              value={test}
              onChange={(e) => setTest(e.target.value)}
              placeholder="Test name"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as LabPriority)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LabStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="Processing">Processing</option>
                <option value="Collected">Collected</option>
                <option value="Result Ready">Result Ready</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Result Note</label>
            <textarea
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
              placeholder="Result note"
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </RightDrawer>
    </div>
  );
}
