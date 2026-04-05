"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import RightDrawer from "@/components/shared/RightDrawer";
import { ProviderNote, noteTagVariant, ProviderPatientDirectoryEntry } from "@/types";
import { createProviderNote, getProviderNotes, updateProviderNote } from "@/services/provider-notes.service";
import {
  formatPatientName,
  getProviderPatientMap,
  getProviderActivePatientOptions,
} from "@/services/provider-patients.service";

const templates = ["Routine Follow-up", "Medication Update", "Discharge Summary", "Post-op Review"];

export default function NotesPage() {
  const [notes, setNotes] = useState<ProviderNote[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingNote, setEditingNote] = useState<ProviderNote | null>(null);
  const [patientId, setPatientId] = useState("");
  const [summary, setSummary] = useState("");
  const [tag, setTag] = useState("General");
  const [saving, setSaving] = useState(false);
  const [patientOptions, setPatientOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [patientMap, setPatientMap] = useState<Record<string, ProviderPatientDirectoryEntry>>({});

  useEffect(() => {
    Promise.all([getProviderNotes(), getProviderActivePatientOptions(), getProviderPatientMap()]).then(
      ([rows, options, map]) => {
        setNotes(rows);
        setPatientOptions(options);
        setPatientMap(map);
      }
    );
  }, []);

  function closeDrawer() {
    setShowDrawer(false);
    setEditingNote(null);
    setPatientId("");
    setSummary("");
    setTag("General");
  }

  function openCreateDrawer(prefillSummary = "") {
    setEditingNote(null);
    setPatientId("");
    setSummary(prefillSummary);
    setTag("General");
    setShowDrawer(true);
  }

  function openEditDrawer(note: ProviderNote) {
    setEditingNote(note);
    setPatientId(note.patientId);
    setSummary(note.summary);
    setTag(note.tag);
    setShowDrawer(true);
  }

  async function submitNote() {
    if (!patientId || !summary.trim()) return;
    setSaving(true);
    if (editingNote) {
      const updated = await updateProviderNote({ id: editingNote.id, patientId, summary, tag });
      setNotes((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } else {
      const row = await createProviderNote({ patientId, summary, tag });
      setNotes((prev) => [row, ...prev]);
    }
    setSaving(false);
    closeDrawer();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)]">Patient Notes</h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">Create and store clinical notes tied to patient records.</p>
        </div>
        <Button
          onClick={() => openCreateDrawer()}
          className="bg-[var(--color-banner-veil)] border border-[var(--color-banner-border)] text-[var(--color-on-primary)] hover:bg-[var(--color-banner-veil-hover)]"
        >
          + New Note
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Recent Notes" subtitle={`${notes.length} records`} />
            <div className="divide-y divide-[var(--color-border)]">
              {notes.map((n) => (
                <div key={n.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="sm:min-w-44">
                    <p className="font-semibold text-[var(--color-text)]">{formatPatientName(patientMap[n.patientId])}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{n.date}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[var(--color-text-muted)] text-sm">{n.summary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={noteTagVariant[n.tag] || "gray"}>{n.tag}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => openEditDrawer(n)}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Quick Templates" />
          <div className="px-5 pb-5 space-y-2">
            {templates.map((template) => (
              <button
                key={template}
                onClick={() => openCreateDrawer(template)}
                className="w-full text-left px-3 py-2 rounded-lg bg-[var(--color-surface-soft)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:border-[color:var(--color-primary-soft-border)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <RightDrawer
        open={showDrawer}
        onClose={closeDrawer}
        title={editingNote ? "Edit Note" : "New Note"}
        subtitle="Capture clear clinical context for future visits."
        footer={(
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDrawer}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submitNote}
              disabled={saving}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
            >
              {saving ? "Saving..." : editingNote ? "Save Changes" : "Save Note"}
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
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Tag</label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Progress, Follow-up..."
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Clinical note summary..."
              rows={7}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </RightDrawer>
    </div>
  );
}

