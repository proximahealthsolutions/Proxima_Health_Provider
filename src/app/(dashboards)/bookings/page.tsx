"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card, { CardHeader } from "@/components/shared/Card";
import RightDrawer from "@/components/shared/RightDrawer";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import { cn } from "@/lib/utils";
import {
  bookingStatusVariant,
  careActionLabel,
  CareActionKey,
  PatientRow,
  ProviderBooking,
} from "@/types";
import {
  decideProviderBooking,
  endProviderBooking,
  getProviderBookings,
  startProviderBooking,
  toggleCareAction,
} from "@/services/provider-bookings.service";
import { createProviderLabOrder } from "@/services/provider-laborders.service";
import { createProviderNote } from "@/services/provider-notes.service";
import { createProviderPrescription } from "@/services/provider-prescriptions.service";

type BookingView = "bookings" | "history";

const ACTIVE_STATUSES = new Set(["requested", "accepted", "in_progress"]);
const HISTORY_STATUSES = new Set(["ended", "rejected", "cancelled", "disputed"]);

function sortByStartAt(items: ProviderBooking[]) {
  return [...items].sort((a, b) => {
    const left = a.startAt ? new Date(a.startAt).getTime() : 0;
    const right = b.startAt ? new Date(b.startAt).getTime() : 0;
    return left - right;
  });
}

function formatSlot(booking: ProviderBooking) {
  return `${booking.preferredDate} · ${booking.preferredTime}${booking.endTime ? `-${booking.endTime}` : ""}`;
}

function patientName(booking: ProviderBooking) {
  return booking.patientName || "Patient";
}

function requiresCompletedPayment(booking: ProviderBooking) {
  return (booking.paymentAmount ?? 0) > 0 && booking.paymentStatus !== "PAID";
}

function toPatientWorkspaceRow(booking: ProviderBooking): PatientRow {
  const name = patientName(booking);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return {
    id: booking.patientId,
    init: initials || "PT",
    color: "teal",
    name,
    age: booking.age || null,
    gender: booking.gender || "—",
    condition: booking.condition || "General Consultation",
    lastVisit: "—",
    nextVisit: formatSlot(booking),
    status: booking.status === "accepted" || booking.status === "in_progress" ? "Active" : "Inactive",
    risk: "Low",
    email: booking.patientEmail || "",
    phone: booking.patientPhone || "",
  };
}

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState("");
  const [view, setView] = useState<BookingView>("bookings");
  const [reviewBooking, setReviewBooking] = useState<ProviderBooking | null>(null);
  const { openChat, openPatientWorkspace } = useProviderUi();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rows = await getProviderBookings();
        if (!mounted) return;
        setBookings(sortByStartAt(rows));
      } catch {
        if (!mounted) return;
        setBookings([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  function showFlash(message: string) {
    setFlashMessage(message);
    window.setTimeout(() => setFlashMessage(""), 2400);
  }

  const activeBookings = useMemo(
    () => sortByStartAt(bookings.filter((booking) => ACTIVE_STATUSES.has(booking.status))),
    [bookings]
  );
  const historyBookings = useMemo(
    () =>
      sortByStartAt(bookings.filter((booking) => HISTORY_STATUSES.has(booking.status))).reverse(),
    [bookings]
  );
  const actionableBookings = useMemo(
    () =>
      activeBookings.filter(
        (booking) => booking.status === "accepted" || booking.status === "in_progress"
      ),
    [activeBookings]
  );

  const stats = useMemo(() => {
    const requested = bookings.filter((booking) => booking.status === "requested").length;
    const accepted = bookings.filter((booking) => booking.status === "accepted").length;
    const inProgress = bookings.filter((booking) => booking.status === "in_progress").length;
    const history = bookings.filter((booking) => HISTORY_STATUSES.has(booking.status)).length;
    return { requested, accepted, inProgress, history, total: bookings.length };
  }, [bookings]);

  async function handleDecision(bookingId: string, decision: "accepted" | "rejected") {
    setBusyBookingId(bookingId);
    try {
      const updated = await decideProviderBooking({
        bookingId,
        decision,
        decisionNote:
          decision === "accepted"
            ? "Appointment accepted by provider."
            : "Booking declined by provider.",
      });
      setBookings((prev) => sortByStartAt(prev.map((item) => (item.id === updated.id ? updated : item))));
      showFlash(
        decision === "accepted"
          ? `${patientName(updated)} has been accepted.`
          : `${patientName(updated)} has been rejected.`
      );
    } finally {
      setBusyBookingId(null);
    }
  }

  async function handleWorkspaceDecision(decision: "accepted" | "rejected") {
    if (!reviewBooking) return;

    const currentBooking = reviewBooking;
    await handleDecision(currentBooking.id, decision);
    setReviewBooking(null);

    if (decision === "accepted") {
      openPatientWorkspace(toPatientWorkspaceRow(currentBooking), "patient-overview");
    }
  }

  async function handleStart(bookingId: string) {
    setBusyBookingId(bookingId);
    try {
      const updated = await startProviderBooking(bookingId);
      setBookings((prev) => sortByStartAt(prev.map((item) => (item.id === updated.id ? updated : item))));
      showFlash("Session started.");
    } finally {
      setBusyBookingId(null);
    }
  }

  async function handleEnd(bookingId: string) {
    setBusyBookingId(bookingId);
    try {
      const updated = await endProviderBooking(bookingId);
      setBookings((prev) => sortByStartAt(prev.map((item) => (item.id === updated.id ? updated : item))));
      showFlash("Session ended. Waiting for patient confirmation.");
    } finally {
      setBusyBookingId(null);
    }
  }

  async function handleCareAction(booking: ProviderBooking, action: CareActionKey) {
    if (booking.careActions[action]) return;

    setBusyBookingId(booking.id);
    try {
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

      const updated = await toggleCareAction({ bookingId: booking.id, action });
      setBookings((prev) => sortByStartAt(prev.map((item) => (item.id === updated.id ? updated : item))));
      showFlash(`${careActionLabel[action]} completed for ${patientName(booking)}.`);
    } finally {
      setBusyBookingId(null);
    }
  }

  function renderActions(booking: ProviderBooking) {
    if (booking.status === "requested") {
      if (requiresCompletedPayment(booking)) {
        return (
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            Awaiting payment
          </span>
        );
      }
      return (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={busyBookingId === booking.id}
            onClick={() => setReviewBooking(booking)}
          >
            Workspace
          </Button>
          <Button
            size="sm"
            disabled={busyBookingId === booking.id}
            className="bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-[var(--color-on-primary)]"
            onClick={() => handleDecision(booking.id, "accepted")}
          >
            Accept
          </Button>
          <Button
            size="sm"
            disabled={busyBookingId === booking.id}
            className="bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-[var(--color-on-primary)]"
            onClick={() => handleDecision(booking.id, "rejected")}
          >
            Reject
          </Button>
        </>
      );
    }

    if (booking.status === "accepted") {
      if (requiresCompletedPayment(booking)) {
        return (
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            Awaiting payment
          </span>
        );
      }
      return (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPatientWorkspace(toPatientWorkspaceRow(booking), "patient-overview")}
          >
            Workspace
          </Button>
          <Button
            size="sm"
            disabled={busyBookingId === booking.id}
            className="bg-[var(--color-primary)] text-white"
            onClick={() => handleStart(booking.id)}
          >
            Start
          </Button>
          <Button size="sm" variant="outline" onClick={() => openChat(booking.id, "call")}>
            {booking.visitType === "AUDIO" ? "Audio Call" : "Video Call"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openChat(booking.id, "chat")}>
            Chat
          </Button>
        </>
      );
    }

    if (booking.status === "in_progress") {
      return (
        <>
          <Button
            size="sm"
            disabled={busyBookingId === booking.id}
            className="bg-[var(--color-danger)] text-white"
            onClick={() => handleEnd(booking.id)}
          >
            End Session
          </Button>
          <Button size="sm" variant="outline" onClick={() => openChat(booking.id, "call")}>
            {booking.visitType === "AUDIO" ? "Audio Call" : "Video Call"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openChat(booking.id, "chat")}>
            Chat
          </Button>
        </>
      );
    }

    if (booking.status === "ended") {
      return (
        <span className="text-xs text-[var(--color-text-muted)]">
          {booking.rawStatus === "ENDED_BY_PROVIDER" ? "Awaiting patient confirmation" : "Completed"}
        </span>
      );
    }

    if (booking.status === "disputed") {
      return <span className="text-xs text-[var(--color-danger)]">Disputed</span>;
    }

    return <span className="text-xs capitalize text-[var(--color-text-muted)]">{booking.status}</span>;
  }

  const visibleBookings = view === "bookings" ? activeBookings : historyBookings;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-on-primary)]">Bookings</h2>
            <p className="mt-1 text-sm text-[var(--color-primary-contrast-soft)]">
              Manage booking requests, active sessions, and completed visit history.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.requested} Requested
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.accepted} Accepted
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.inProgress} In Progress
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.history} History
            </Badge>
          </div>
        </div>
      </div>

      {flashMessage && (
        <div className="rounded-xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-medium text-[var(--color-primary)]">
          {flashMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {(["bookings", "history"] as BookingView[]).map((option) => {
          const active = view === option;
          return (
            <Button
              key={option}
              variant={active ? "primary" : "outline"}
              onClick={() => setView(option)}
              className={cn("capitalize", active && "shadow-sm")}
            >
              {option}
            </Button>
          );
        })}
        <span className="text-sm text-[var(--color-text-muted)]">
          {loading ? "Loading bookings..." : `${visibleBookings.length} items in ${view}`}
        </span>
      </div>

      <Card>
        <CardHeader
          title={view === "bookings" ? "Booking Queue" : "Booking History"}
          subtitle={
            view === "bookings"
              ? "All pending and active provider bookings in one place."
              : "Past visits and closed requests."
          }
        />

        <div className="p-4 md:hidden space-y-3">
          {!loading && visibleBookings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5 text-sm text-[var(--color-text-muted)]">
              No {view} yet.
            </div>
          )}
          {visibleBookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text)]">{patientName(booking)}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{booking.reason}</p>
                </div>
                <Badge variant={bookingStatusVariant[booking.status]}>{booking.status}</Badge>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {formatSlot(booking)} · {booking.visitType || "VIDEO"}
                {requiresCompletedPayment(booking) ? " · Awaiting payment" : ""}
              </div>
              <div className="flex flex-wrap gap-2">{renderActions(booking)}</div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Patient", "Reason", "Slot", "Type", "Status", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {!loading && visibleBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
                    No {view} yet.
                  </td>
                </tr>
              )}
              {visibleBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className={cn(
                    "transition-colors hover:bg-[var(--color-surface-soft)]",
                    view === "history" && "opacity-75"
                  )}
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[var(--color-text)]">{patientName(booking)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{booking.patientEmail || "No email provided"}</p>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{booking.reason}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">
                    {formatSlot(booking)}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">
                    {booking.visitType || "VIDEO"}
                    {requiresCompletedPayment(booking) ? " · Awaiting payment" : ""}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={bookingStatusVariant[booking.status]}>{booking.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">{renderActions(booking)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {view === "bookings" && (
        <Card>
          <CardHeader
            title="Booking Actions"
            subtitle="Complete care tasks after a booking has been accepted or started."
          />
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-2">
            {actionableBookings.length === 0 && (
              <div className="text-sm text-[var(--color-text-muted)]">
                No accepted or in-progress bookings yet.
              </div>
            )}
            {actionableBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">{patientName(booking)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{booking.condition}</p>
                  </div>
                  <Badge variant={bookingStatusVariant[booking.status]}>{booking.status}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {booking.status === "accepted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPatientWorkspace(toPatientWorkspaceRow(booking), "patient-overview")}
                    >
                      Open Workspace
                    </Button>
                  )}
                  {(Object.keys(booking.careActions) as CareActionKey[]).map((action) => (
                    <Button
                      key={action}
                      size="sm"
                      disabled={busyBookingId === booking.id}
                      className={
                        booking.careActions[action]
                          ? "bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-[var(--color-on-primary)]"
                          : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
                      }
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
      )}

      <RightDrawer
        open={Boolean(reviewBooking)}
        onClose={() => setReviewBooking(null)}
        title={reviewBooking ? `Review ${patientName(reviewBooking)}` : "Review Booking"}
        subtitle={reviewBooking ? "Accept this booking before opening the patient workspace." : undefined}
        footer={
          reviewBooking ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                disabled={busyBookingId === reviewBooking.id}
                onClick={() => handleWorkspaceDecision("rejected")}
              >
                Reject
              </Button>
              <Button
                className="bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
                disabled={busyBookingId === reviewBooking.id}
                onClick={() => handleWorkspaceDecision("accepted")}
              >
                Accept and Open Workspace
              </Button>
            </div>
          ) : null
        }
      >
        {reviewBooking ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--color-text)]">
                    {patientName(reviewBooking)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {reviewBooking.reason}
                  </p>
                </div>
                <Badge variant={bookingStatusVariant[reviewBooking.status]}>
                  {reviewBooking.status}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)]">Appointment slot</div>
                  <div className="mt-1 font-medium text-[var(--color-text)]">
                    {formatSlot(reviewBooking)}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)]">Visit type</div>
                  <div className="mt-1 font-medium text-[var(--color-text)]">
                    {reviewBooking.visitType || "VIDEO"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] p-4">
              <h4 className="text-sm font-semibold text-[var(--color-primary)]">
                Workspace is locked until you accept this booking
              </h4>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Accept to continue into the patient workspace. If you reject this request, this review panel closes and the patient workspace stays unavailable.
              </p>
            </div>
          </div>
        ) : null}
      </RightDrawer>
    </div>
  );
}
