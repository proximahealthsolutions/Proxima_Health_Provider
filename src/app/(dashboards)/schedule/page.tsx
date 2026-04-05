"use client";

import { useEffect, useMemo, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import {
  bookingStatusVariant,
  careActionLabel,
  CareActionKey,
  ProviderBooking,
} from "@/types";
import {
  decideProviderBooking,
  endProviderBooking,
  getProviderBookings,
  startProviderBooking,
  toggleCareAction,
} from "@/services/provider-bookings.service";
import { createProviderNote } from "@/services/provider-notes.service";
import { createProviderLabOrder } from "@/services/provider-laborders.service";
import { createProviderPrescription } from "@/services/provider-prescriptions.service";
import {
  AvailabilityOverride,
  AvailabilityRule,
  createAvailabilityOverride,
  createAvailabilityRule,
  getAvailabilityOverrides,
  getAvailabilityRules,
} from "@/services/provider-availability.service";
import { useProviderUi } from "@/components/provider/ProviderUiContext";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePage() {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState("");
  const [ruleForm, setRuleForm] = useState({
    weekday: 1,
    startTime: "08:00",
    endTime: "17:00",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });
  const [overrideForm, setOverrideForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    isAvailable: false,
    startTime: "09:00",
    endTime: "13:00",
    note: "",
  });
  const { openChat } = useProviderUi();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [bookingData, ruleData, overrideData] = await Promise.all([
          getProviderBookings(),
          getAvailabilityRules(),
          getAvailabilityOverrides(),
        ]);
        if (!mounted) return;
        setBookings(bookingData);
        setRules(ruleData);
        setOverrides(overrideData);
      } catch {
        if (!mounted) return;
        setBookings([]);
        setRules([]);
        setOverrides([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const requested = bookings.filter((b) => b.status === "requested").length;
    const accepted = bookings.filter((b) => b.status === "accepted").length;
    const inProgress = bookings.filter((b) => b.status === "in_progress").length;
    const ended = bookings.filter((b) => b.status === "ended").length;
    return { requested, accepted, inProgress, ended, total: bookings.length };
  }, [bookings]);

  async function handleDecision(bookingId: string, decision: "accepted" | "rejected") {
    setBusyBookingId(bookingId);
    const updated = await decideProviderBooking({
      bookingId,
      decision,
      decisionNote:
        decision === "accepted"
          ? "Appointment accepted by provider."
          : "Booking declined by provider.",
    });
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setBusyBookingId(null);
    const patientLabel = updated.patientName || "Patient";
    setFlashMessage(
      decision === "accepted"
        ? `${patientLabel} has been accepted.`
        : `${patientLabel} has been rejected.`
    );
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  async function handleStart(bookingId: string) {
    setBusyBookingId(bookingId);
    const updated = await startProviderBooking(bookingId);
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setBusyBookingId(null);
    setFlashMessage("Session started.");
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  async function handleEnd(bookingId: string) {
    setBusyBookingId(bookingId);
    const updated = await endProviderBooking(bookingId);
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setBusyBookingId(null);
    setFlashMessage("Session ended. Waiting for patient confirmation.");
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  async function handleCareAction(booking: ProviderBooking, action: CareActionKey) {
    if (booking.careActions[action]) return;
    const bookingId = booking.id;
    setBusyBookingId(bookingId);
    if (action === "clinical_note") {
      await createProviderNote({
        patientId: booking.patientId,
        summary: `Clinical note created from booking (${booking.condition}).`,
        tag: "FollowUp",
      });
    }
    if (action === "lab_order") {
      await createProviderLabOrder({
        patientId: booking.patientId,
        test: `${booking.condition} Panel`,
        priority: "Routine",
      });
    }
    if (action === "prescription") {
      await createProviderPrescription({
        patientId: booking.patientId,
        medication: `${booking.condition} medication plan`,
        dosage: "As directed",
        frequency: "Daily",
        duration: "7 days",
      });
    }
    if (action === "follow_up") {
      await createProviderNote({
        patientId: booking.patientId,
        summary: "Follow-up plan created and shared with patient.",
        tag: "FollowUp",
      });
    }
    const updated = await toggleCareAction({ bookingId, action });
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setBusyBookingId(null);
    setFlashMessage(
      `${careActionLabel[action]} completed for ${booking.patientName || "Patient"}.`
    );
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  async function handleCreateRule() {
    const created = await createAvailabilityRule(ruleForm);
    setRules((prev) => [created, ...prev]);
    setFlashMessage("Availability rule saved.");
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  async function handleCreateOverride() {
    const created = await createAvailabilityOverride(overrideForm);
    setOverrides((prev) => [created, ...prev]);
    setFlashMessage("Override saved.");
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  function patientName(booking: ProviderBooking) {
    return booking.patientName || "Patient";
  }

  const acceptedBookings = bookings.filter(
    (b) => b.status === "accepted" || b.status === "in_progress"
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)]">Schedule & Availability</h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">
            Set your availability, accept requests, and manage live sessions.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Badge
            variant="gray"
            className="bg-white/15 border border-white/25 text-[var(--color-on-primary)]"
          >
            {stats.requested} Requested
          </Badge>
          <Badge
            variant="gray"
            className="bg-white/15 border border-white/25 text-[var(--color-on-primary)]"
          >
            {stats.accepted} Accepted
          </Badge>
          <Badge
            variant="gray"
            className="bg-white/15 border border-white/25 text-[var(--color-on-primary)]"
          >
            {stats.inProgress} In Progress
          </Badge>
          <Badge
            variant="gray"
            className="bg-white/15 border border-white/25 text-[var(--color-on-primary)]"
          >
            {stats.ended} Ended
          </Badge>
        </div>
      </div>

      {flashMessage && (
        <div className="px-4 py-3 rounded-xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-sm font-medium">
          {flashMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Set Weekly Availability" subtitle="Add recurring availability windows." />
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={ruleForm.weekday}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, weekday: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
              >
                {WEEKDAYS.map((day, idx) => (
                  <option key={day} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={ruleForm.startDate}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
              />
              <input
                type="date"
                value={ruleForm.endDate}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={ruleForm.startTime}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
                />
                <input
                  type="time"
                  value={ruleForm.endTime}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
                />
              </div>
            </div>
            <Button className="bg-[var(--color-primary)] text-white" onClick={handleCreateRule}>
              Save Rule
            </Button>
            <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
              {rules.length === 0 && <div>No rules yet.</div>}
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between">
                  <span>
                    {WEEKDAYS[rule.weekday]} {rule.startTime}–{rule.endTime}
                  </span>
                  <span className="text-xs">
                    {rule.startDate.slice(0, 10)} → {rule.endDate.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="One-off Overrides" subtitle="Block or open extra time slots." />
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="date"
                value={overrideForm.date}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
              />
              <select
                value={overrideForm.isAvailable ? "open" : "blocked"}
                onChange={(e) =>
                  setOverrideForm((prev) => ({ ...prev, isAvailable: e.target.value === "open" }))
                }
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
              >
                <option value="blocked">Blocked</option>
                <option value="open">Open time</option>
              </select>
              {overrideForm.isAvailable && (
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={overrideForm.startTime}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
                  />
                  <input
                    type="time"
                    value={overrideForm.endTime}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
                  />
                </div>
              )}
              <input
                type="text"
                value={overrideForm.note}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Note (optional)"
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm"
              />
            </div>
            <Button className="bg-[var(--color-primary)] text-white" onClick={handleCreateOverride}>
              Save Override
            </Button>
            <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
              {overrides.length === 0 && <div>No overrides yet.</div>}
              {overrides.map((override) => (
                <div key={override.id} className="flex items-center justify-between">
                  <span>
                    {override.date.slice(0, 10)} · {override.isAvailable ? "Open" : "Blocked"}
                  </span>
                  <span className="text-xs">
                    {override.isAvailable
                      ? `${override.startTime ?? "--"}–${override.endTime ?? "--"}`
                      : override.note ?? "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Appointment Queue"
          subtitle={loading ? "Loading appointments..." : `${stats.total} total requests`}
        />

        <div className="md:hidden p-4 space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text)] truncate">{patientName(b)}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{b.reason}</p>
                </div>
                <Badge variant={bookingStatusVariant[b.status]}>{b.status}</Badge>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {b.preferredDate} · {b.preferredTime}{b.endTime ? `–${b.endTime}` : ""} · {b.visitType || "VIDEO"}
              </div>
              <div className="flex flex-wrap gap-2">
                {b.status === "requested" && (
                  <>
                    <Button
                      size="sm"
                      disabled={busyBookingId === b.id}
                      className="bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-[var(--color-on-primary)]"
                      onClick={() => handleDecision(b.id, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      disabled={busyBookingId === b.id}
                      className="bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-[var(--color-on-primary)]"
                      onClick={() => handleDecision(b.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {b.status === "accepted" && (
                  <>
                    <Button size="sm" disabled={busyBookingId === b.id} className="bg-[var(--color-primary)] text-white" onClick={() => handleStart(b.id)}>
                      Start
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openChat(b.id, "call")}>
                      {b.visitType === "AUDIO" ? "Audio Call" : "Video Call"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openChat(b.id, "chat")}>
                      Chat
                    </Button>
                  </>
                )}
                {b.status === "in_progress" && (
                  <>
                    <Button size="sm" disabled={busyBookingId === b.id} className="bg-[var(--color-danger)] text-white" onClick={() => handleEnd(b.id)}>
                      End Session
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openChat(b.id, "call")}>
                      {b.visitType === "AUDIO" ? "Audio Call" : "Video Call"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openChat(b.id, "chat")}>
                      Chat
                    </Button>
                  </>
                )}
                {b.status === "ended" && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {b.rawStatus === "ENDED_BY_PROVIDER" ? "Awaiting patient confirmation" : "Completed"}
                  </span>
                )}
                {b.status === "disputed" && <span className="text-xs text-[var(--color-danger)]">Disputed</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Patient", "Slot", "Type", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-5 py-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  className={cn(
                    "hover:bg-[var(--color-surface-soft)] transition-colors",
                    ["ended", "cancelled", "rejected", "disputed"].includes(b.status) ? "opacity-60" : ""
                  )}
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[var(--color-text)] whitespace-nowrap">{patientName(b)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{b.reason}</p>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                    {b.preferredDate} · {b.preferredTime}
                    {b.endTime ? `–${b.endTime}` : ""}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">
                    {b.visitType || "VIDEO"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={bookingStatusVariant[b.status]}>{b.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {b.status === "requested" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyBookingId === b.id}
                            className="bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-[var(--color-on-primary)]"
                            onClick={() => handleDecision(b.id, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            disabled={busyBookingId === b.id}
                            className="bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-[var(--color-on-primary)]"
                            onClick={() => handleDecision(b.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {b.status === "accepted" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyBookingId === b.id}
                            className="bg-[var(--color-primary)] text-white"
                            onClick={() => handleStart(b.id)}
                          >
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openChat(b.id, "call")}
                          >
                            {b.visitType === "AUDIO" ? "Audio Call" : "Video Call"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openChat(b.id, "chat")}>
                            Chat
                          </Button>
                        </>
                      )}
                      {b.status === "in_progress" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyBookingId === b.id}
                            className="bg-[var(--color-danger)] text-white"
                            onClick={() => handleEnd(b.id)}
                          >
                            End Session
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openChat(b.id, "call")}
                          >
                            {b.visitType === "AUDIO" ? "Audio Call" : "Video Call"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openChat(b.id, "chat")}>
                            Chat
                          </Button>
                        </>
                      )}
                      {b.status === "ended" && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {b.rawStatus === "ENDED_BY_PROVIDER"
                            ? "Awaiting patient confirmation"
                            : "Completed"}
                        </span>
                      )}
                      {b.status === "disputed" && (
                        <span className="text-xs text-[var(--color-danger)]">Disputed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Accepted Patients: Care Actions"
          subtitle="After accepting a booking, complete the required care actions."
        />
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {acceptedBookings.length === 0 && (
            <div className="text-sm text-[var(--color-text-muted)]">No accepted bookings yet.</div>
          )}
          {acceptedBookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-surface-soft)] flex flex-col gap-3"
            >
              <div>
                <p className="font-semibold text-[var(--color-text)]">{patientName(booking)}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{booking.condition}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(booking.careActions) as CareActionKey[]).map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    className={
                      booking.careActions[action]
                        ? "bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-[var(--color-on-primary)]"
                        : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
                    }
                    disabled={busyBookingId === booking.id}
                    onClick={() => handleCareAction(booking, action)}
                  >
                    {booking.careActions[action] ? "Done: " : "Mark: "}
                    {careActionLabel[action]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
