"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import RightDrawer from "@/components/shared/RightDrawer";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import { ProviderNote, noteTagVariant, ProviderPatientDirectoryEntry } from "@/types";
import { createProviderNote, getProviderNotes, updateProviderNote } from "@/services/provider-notes.service";
import {
  formatPatientName,
  getProviderPatientMap,
  getProviderActivePatientOptions,
} from "@/services/provider-patients.service";
import { clinicalNotePreview, sanitizeClinicalNoteHtml } from "@/lib/note-format";

const templates = [
  {
    label: "Routine Follow-up",
    tag: "Progress",
    body:
      "<h2>Routine Follow-up</h2><p><strong>Subjective:</strong> Patient reports steady progress since the last visit.</p><p><strong>Assessment:</strong> Current management plan remains appropriate.</p><p><strong>Plan:</strong></p><ul><li>Continue current treatment plan.</li><li>Review response at the next appointment.</li></ul>",
  },
  {
    label: "Medication Update",
    tag: "Medication",
    body:
      "<h2>Medication Update</h2><p><strong>Medication review:</strong> Treatment reviewed with patient.</p><p><strong>Instructions:</strong></p><ul><li>Discussed dose, frequency, and expected effects.</li><li>Advised patient to report concerning symptoms promptly.</li></ul>",
  },
  {
    label: "Discharge Summary",
    tag: "Summary",
    body:
      "<h2>Discharge Summary</h2><p><strong>Clinical status:</strong> Patient is stable for discharge from this episode of care.</p><p><strong>Follow-up:</strong> Continue home care guidance and schedule follow-up as needed.</p>",
  },
  {
    label: "Post-op Review",
    tag: "FollowUp",
    body:
      "<h2>Post-op Review</h2><p><strong>Recovery:</strong> Post-procedure recovery reviewed.</p><p><strong>Findings:</strong></p><ul><li>Wound/site reviewed where applicable.</li><li>No urgent concerns documented during this review.</li></ul>",
  },
];

const fontFamilies = [
  { label: "Inter", value: "Inter, Arial, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "'Courier New', monospace" },
];

const fontSizes = [
  { label: "Small", value: "13px" },
  { label: "Normal", value: "15px" },
  { label: "Large", value: "18px" },
  { label: "Title", value: "24px" },
];

export default function NotesPage() {
  const { patientWorkspace } = useProviderUi();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [notes, setNotes] = useState<ProviderNote[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingNote, setEditingNote] = useState<ProviderNote | null>(null);
  const [patientId, setPatientId] = useState("");
  const [summary, setSummary] = useState("");
  const [editorSeed, setEditorSeed] = useState("");
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

  useEffect(() => {
    if (showDrawer && editorRef.current) {
      editorRef.current.innerHTML = sanitizeClinicalNoteHtml(editorSeed);
    }
  }, [showDrawer, editorSeed]);

  const visibleNotes = patientWorkspace
    ? notes.filter((note) => note.patientId === patientWorkspace.id)
    : notes;

  const recentNote = visibleNotes[0];
  const totalPatients = useMemo(
    () => new Set(visibleNotes.map((note) => note.patientId)).size,
    [visibleNotes]
  );

  function closeDrawer() {
    setShowDrawer(false);
    setEditingNote(null);
    setPatientId("");
    setSummary("");
    setEditorSeed("");
    setTag("General");
  }

  function openCreateDrawer(prefillSummary = "", prefillTag = "General") {
    setEditingNote(null);
    setPatientId(patientWorkspace?.id || "");
    const content = prefillSummary || "<h2>Clinical Note</h2><p><br></p>";
    setSummary(content);
    setEditorSeed(content);
    setTag(prefillTag);
    setShowDrawer(true);
  }

  function openEditDrawer(note: ProviderNote) {
    setEditingNote(note);
    setPatientId(note.patientId);
    setSummary(note.summary);
    setEditorSeed(note.summary);
    setTag(note.tag);
    setShowDrawer(true);
  }

  function syncEditor() {
    setSummary(editorRef.current?.innerHTML ?? "");
  }

  function runEditorCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  }

  function applyBlock(block: "h2" | "h3" | "p" | "blockquote") {
    runEditorCommand("formatBlock", block);
  }

  function applyTextSize(size: string) {
    editorRef.current?.focus();
    document.execCommand("fontSize", false, "3");
    editorRef.current?.querySelectorAll("font[size='3']").forEach((node) => {
      const span = document.createElement("span");
      span.innerHTML = node.innerHTML;
      span.setAttribute("style", `font-size: ${size}`);
      node.replaceWith(span);
    });
    syncEditor();
  }

  function applyFontFamily(fontFamily: string) {
    editorRef.current?.focus();
    document.execCommand("fontName", false, fontFamily);
    editorRef.current?.querySelectorAll("font[face]").forEach((node) => {
      const span = document.createElement("span");
      span.innerHTML = node.innerHTML;
      span.setAttribute("style", `font-family: ${fontFamily}`);
      node.replaceWith(span);
    });
    syncEditor();
  }

  async function submitNote() {
    const content = sanitizeClinicalNoteHtml(editorRef.current?.innerHTML ?? summary);
    if (!patientId || !clinicalNotePreview(content, 5000).trim()) return;
    setSaving(true);
    try {
      if (editingNote) {
        const updated = await updateProviderNote({ id: editingNote.id, patientId, summary: content, tag });
        setNotes((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      } else {
        const row = await createProviderNote({ patientId, summary: content, tag });
        setNotes((prev) => [row, ...prev]);
      }
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[color:var(--color-primary-soft-border)] bg-[linear-gradient(135deg,var(--color-surface),var(--color-primary-soft))] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-[color:var(--color-primary-soft-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Clinical Documentation
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">
              {patientWorkspace ? `${patientWorkspace.name} Notes` : "Patient Notes"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Write clean, formatted clinical notes with document-style structure, headings, lists, and emphasis.
            </p>
          </div>
          <Button
            onClick={() => openCreateDrawer()}
            className="bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
          >
            + New Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader title="Document Library" subtitle={`${visibleNotes.length} formatted note${visibleNotes.length === 1 ? "" : "s"}`} />
          <div className="divide-y divide-[var(--color-border)]">
            {visibleNotes.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
                No notes yet. Create the first clinical note from the editor.
              </div>
            ) : (
              visibleNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openEditDrawer(n)}
                  className="group grid w-full grid-cols-1 gap-4 px-5 py-5 text-left transition-colors hover:bg-[var(--color-surface-soft)] lg:grid-cols-[180px_minmax(0,1fr)_120px]"
                >
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">{formatPatientName(patientMap[n.patientId])}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{n.date}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={noteTagVariant[n.tag] || "gray"}>{n.tag}</Badge>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        Clinical note
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
                      {clinicalNotePreview(n.summary)}
                    </p>
                  </div>
                  <div className="flex items-center justify-start lg:justify-end">
                    <span className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition group-hover:border-[color:var(--color-primary-soft-border)] group-hover:text-[var(--color-primary)]">
                      Edit note
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="At a Glance" />
            <div className="grid grid-cols-3 gap-2 px-5 pb-5 pt-1">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <div className="text-[11px] text-[var(--color-text-muted)]">Notes</div>
                <div className="mt-1 text-xl font-bold text-[var(--color-text)]">{visibleNotes.length}</div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <div className="text-[11px] text-[var(--color-text-muted)]">Patients</div>
                <div className="mt-1 text-xl font-bold text-[var(--color-text)]">{totalPatients}</div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <div className="text-[11px] text-[var(--color-text-muted)]">Latest</div>
                <div className="mt-1 text-sm font-bold text-[var(--color-text)]">{recentNote?.date ?? "-"}</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Templates" subtitle="Start with a structured note." />
            <div className="px-5 pb-5 space-y-2">
              {templates.map((template) => (
                <button
                  key={template.label}
                  onClick={() => openCreateDrawer(template.body, template.tag)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm text-[var(--color-text)] transition-colors hover:border-[color:var(--color-primary-soft-border)] hover:bg-[var(--color-primary-soft)]"
                >
                  <span className="font-semibold">{template.label}</span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Formatted sections, list-ready plan, clean patient view.</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <RightDrawer
        open={showDrawer}
        onClose={closeDrawer}
        title={editingNote ? "Edit Clinical Note" : "New Clinical Note"}
        subtitle="Format this note like a clean clinical document."
        footer={(
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={closeDrawer} className="flex-1">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Format</label>
              <select
                onChange={(e) => applyBlock(e.target.value as "h2" | "h3" | "p" | "blockquote")}
                defaultValue="p"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="p">Paragraph</option>
                <option value="h2">Heading</option>
                <option value="h3">Subheading</option>
                <option value="blockquote">Clinical callout</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-2">
              <button title="Bold" type="button" onClick={() => runEditorCommand("bold")} className="h-9 w-9 rounded-lg border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]">B</button>
              <button title="Italic" type="button" onClick={() => runEditorCommand("italic")} className="h-9 w-9 rounded-lg border border-[var(--color-border)] text-sm italic text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]">I</button>
              <button title="Underline" type="button" onClick={() => runEditorCommand("underline")} className="h-9 w-9 rounded-lg border border-[var(--color-border)] text-sm underline text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]">U</button>
              <button title="Bulleted list" type="button" onClick={() => runEditorCommand("insertUnorderedList")} className="h-9 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]">List</button>
              <button title="Numbered list" type="button" onClick={() => runEditorCommand("insertOrderedList")} className="h-9 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]">1 2</button>
              <button title="Align left" type="button" onClick={() => runEditorCommand("justifyLeft")} className="h-9 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]">Left</button>
              <button title="Center" type="button" onClick={() => runEditorCommand("justifyCenter")} className="h-9 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]">Center</button>
              <select
                title="Font family"
                onChange={(e) => applyFontFamily(e.target.value)}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)]"
              >
                {fontFamilies.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
              <select
                title="Text size"
                onChange={(e) => applyTextSize(e.target.value)}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)]"
              >
                {fontSizes.map((size) => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[55vh] overflow-auto bg-slate-100/60 p-3">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditor}
                className="min-h-[420px] rounded-sm bg-white px-7 py-6 text-[15px] leading-7 text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-950 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-teal-400 [&_blockquote]:bg-teal-50 [&_blockquote]:py-2 [&_blockquote]:pl-4"
              />
            </div>
          </div>
        </div>
      </RightDrawer>
    </div>
  );
}
