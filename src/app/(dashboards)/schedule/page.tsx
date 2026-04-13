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
  createAvailabilityOverride,
  getAvailabilityOverrides,
  getWeeklyAvailability,
  saveWeeklyAvailability,
  WeeklyAvailabilityDay,
} from "@/services/provider-availability.service";
import { useProviderUi } from "@/components/provider/ProviderUiContext";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_DAY_HOURS = { startTime: "08:00", endTime: "17:00" };

export default function SchedulePage() {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyAvailabilityDay[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");
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
        const [bookingData, weeklyData, overrideData] = await Promise.all([
          getProviderBookings(),
          getWeeklyAvailability(),
          getAvailabilityOverrides(),
        ]);
        if (!mounted) return;
        setBookings(bookingData);
        setWeeklySchedule(
          Array.isArray(weeklyData) && weeklyData.length === 7
            ? weeklyData
            : Array.from({ length: 7 }, (_, weekday) => ({
                weekday,
                enabled: false,
                startTime: null,
                endTime: null,
                ruleId: null,
              }))
        );
        setOverrides(overrideData);
      } catch {
        if (!mounted) return;
        setBookings([]);
        setWeeklySchedule(
          Array.from({ length: 7 }, (_, weekday) => ({
            weekday,
            enabled: false,
            startTime: null,
            endTime: null,
            ruleId: null,
          }))
        );
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

  async function handleSaveWeeklySchedule() {
    setSavingWeekly(true);
    try {
      const saved = await saveWeeklyAvailability({
        days: weeklySchedule.map((day) => ({
          weekday: day.weekday,
          enabled: day.enabled,
          startTime: day.enabled ? day.startTime : null,
          endTime: day.enabled ? day.endTime : null,
        })),
      });
      setWeeklySchedule(saved);
      setFlashMessage("Weekly schedule saved.");
    } catch (err: any) {
      setFlashMessage(err?.message || "Unable to save weekly schedule.");
    } finally {
      setSavingWeekly(false);
    }
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  async function handleCreateOverride() {
    try {
      const created = await createAvailabilityOverride(overrideForm);
      setOverrides((prev) => [created, ...prev]);
      setFlashMessage("Override saved.");
    } catch (err: any) {
      setFlashMessage(err?.message || "Unable to save override.");
    }
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  function patientName(booking: ProviderBooking) {
    return booking.patientName || "Patient";
  }

  const acceptedBookings = bookings.filter(
    (b) => b.status === "accepted" || b.status === "in_progress"
  );

  const activeDaysCount = weeklySchedule.filter((day) => day.enabled).length;

  function updateWeeklyDay(
    weekday: number,
    updates: Partial<Pick<WeeklyAvailabilityDay, "enabled" | "startTime" | "endTime">>
  ) {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        const nextEnabled = updates.enabled ?? day.enabled;
        const nextStart = updates.startTime ?? day.startTime ?? DEFAULT_DAY_HOURS.startTime;
        const nextEnd = updates.endTime ?? day.endTime ?? DEFAULT_DAY_HOURS.endTime;
        return {
          ...day,
          enabled: nextEnabled,
          startTime: nextEnabled ? nextStart : null,
          endTime: nextEnabled ? nextEnd : null,
        };
      })
    );
  }

  function handleClearDay(weekday: number) {
    updateWeeklyDay(weekday, {
      enabled: false,
      startTime: null,
      endTime: null,
    });
  }

  function handleClearAll() {
    setWeeklySchedule((prev) =>
      prev.map((day) => ({
        ...day,
        enabled: false,
        startTime: null,
        endTime: null,
      }))
    );
  }

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
          <CardHeader
            title="Weekly Availability"
            subtitle="Choose the days you work and set one-hour booking windows for each day."
          />
          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {activeDaysCount} of 7 days open
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Patients will choose an available date first, then see one-hour time slots.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="gray">1-hour slots</Badge>
                  <Button variant="outline" size="sm" onClick={handleClearAll}>
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {weeklySchedule.map((day) => (
                <div
                  key={day.weekday}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateWeeklyDay(day.weekday, {
                            enabled: !day.enabled,
                            startTime: day.startTime ?? DEFAULT_DAY_HOURS.startTime,
                            endTime: day.endTime ?? DEFAULT_DAY_HOURS.endTime,
                          })
                        }
                        className={cn(
                          "relative inline-flex h-7 w-12 items-center rounded-full transition",
                          day.enabled
                            ? "bg-[var(--color-primary)]"
                            : "bg-[var(--color-border)]"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-5 w-5 transform rounded-full bg-white transition",
                            day.enabled ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">
                          {WEEKDAYS[day.weekday]}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {day.enabled
                            ? `${day.startTime ?? DEFAULT_DAY_HOURS.startTime} to ${day.endTime ?? DEFAULT_DAY_HOURS.endTime}`
                            : "Closed"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:min-w-[320px]">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          value={day.startTime ?? DEFAULT_DAY_HOURS.startTime}
                          disabled={!day.enabled}
                          onChange={(e) =>
                            updateWeeklyDay(day.weekday, { startTime: e.target.value })
                          }
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:bg-[var(--color-surface-soft)] disabled:text-[var(--color-text-muted)]"
                        />
                        <input
                          type="time"
                          value={day.endTime ?? DEFAULT_DAY_HOURS.endTime}
                          disabled={!day.enabled}
                          onChange={(e) =>
                            updateWeeklyDay(day.weekday, { endTime: e.target.value })
                          }
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:bg-[var(--color-surface-soft)] disabled:text-[var(--color-text-muted)]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearDay(day.weekday)}
                          disabled={!day.enabled}
                        >
                          Clear Day
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                You can clear a day or all days, but booked future slots stay protected.
              </p>
              <Button
                className="bg-[var(--color-primary)] text-white"
                onClick={handleSaveWeeklySchedule}
                disabled={savingWeekly}
              >
                {savingWeekly ? "Saving..." : "Save Weekly Schedule"}
              </Button>
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
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              />
              <select
                value={overrideForm.isAvailable ? "open" : "blocked"}
                onChange={(e) =>
                  setOverrideForm((prev) => ({ ...prev, isAvailable: e.target.value === "open" }))
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
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
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                  />
                  <input
                    type="time"
                    value={overrideForm.endTime}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                  />
                </div>
              )}
              <input
                type="text"
                value={overrideForm.note}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Note (optional)"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
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
