"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card, { CardHeader } from "@/components/shared/Card";
import { cn } from "@/lib/utils";
import { bookingStatusVariant, ProviderBooking } from "@/types";
import { getProviderBookings } from "@/services/provider-bookings.service";
import {
  getWeeklyAvailability,
  saveWeeklyAvailability,
  WeeklyAvailabilityDay,
} from "@/services/provider-availability.service";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_DAY_HOURS = { startTime: "08:00", endTime: "17:00" };
const BOOKED_DAY_STATUSES = new Set(["requested", "accepted", "in_progress", "ended"]);

type BookedDayGroup = {
  key: string;
  label: string;
  bookings: ProviderBooking[];
};

function sortByStartAt(items: ProviderBooking[]) {
  return [...items].sort((a, b) => {
    const left = a.startAt ? new Date(a.startAt).getTime() : 0;
    const right = b.startAt ? new Date(b.startAt).getTime() : 0;
    return left - right;
  });
}

function buildEmptySchedule() {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: false,
    startTime: null,
    endTime: null,
    ruleId: null,
  }));
}

function patientName(booking: ProviderBooking) {
  return booking.patientName || "Patient";
}

function slotLabel(booking: ProviderBooking) {
  return `${booking.preferredTime}${booking.endTime ? `-${booking.endTime}` : ""}`;
}

export default function SchedulePage() {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyAvailabilityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [bookingData, weeklyData] = await Promise.all([
          getProviderBookings(),
          getWeeklyAvailability(),
        ]);
        if (!mounted) return;

        setBookings(sortByStartAt(bookingData));
        setWeeklySchedule(
          Array.isArray(weeklyData) && weeklyData.length === 7 ? weeklyData : buildEmptySchedule()
        );
      } catch {
        if (!mounted) return;
        setBookings([]);
        setWeeklySchedule(buildEmptySchedule());
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

  const activeDaysCount = weeklySchedule.filter((day) => day.enabled).length;

  const bookedDayGroups = useMemo<BookedDayGroup[]>(() => {
    const grouped = sortByStartAt(
      bookings.filter((booking) => BOOKED_DAY_STATUSES.has(booking.status))
    ).reduce<Map<string, BookedDayGroup>>((acc, booking) => {
      const key = booking.startAt ? booking.startAt.slice(0, 10) : booking.preferredDate;
      const label = booking.startAt
        ? new Date(booking.startAt).toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : booking.preferredDate;

      if (!acc.has(key)) {
        acc.set(key, { key, label, bookings: [] });
      }
      acc.get(key)?.bookings.push(booking);
      return acc;
    }, new Map<string, BookedDayGroup>());

    return Array.from(grouped.values());
  }, [bookings]);

  const upcomingBookedDays = useMemo(
    () =>
      bookedDayGroups.filter((group) =>
        group.bookings.some((booking) => {
          if (!booking.startAt) return true;
          return new Date(booking.startAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000;
        })
      ),
    [bookedDayGroups]
  );

  const stats = useMemo(() => {
    const requested = bookings.filter((booking) => booking.status === "requested").length;
    const accepted = bookings.filter((booking) => booking.status === "accepted").length;
    const inProgress = bookings.filter((booking) => booking.status === "in_progress").length;
    const bookedDays = bookedDayGroups.length;
    return { requested, accepted, inProgress, bookedDays };
  }, [bookedDayGroups.length, bookings]);

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
    updateWeeklyDay(weekday, { enabled: false, startTime: null, endTime: null });
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
      showFlash("Weekly schedule saved.");
    } catch (err: any) {
      showFlash(err?.message || "Unable to save weekly schedule.");
    } finally {
      setSavingWeekly(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-on-primary)]">Provider Schedule</h2>
            <p className="mt-1 text-sm text-[var(--color-primary-contrast-soft)]">
              Keep your weekly availability clean and see the days that already have bookings.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {activeDaysCount} Open Days
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.bookedDays} Booked Days
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.requested} Requests
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.accepted + stats.inProgress} Active
            </Badge>
          </div>
        </div>
      </div>

      {flashMessage && (
        <div className="rounded-xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-medium text-[var(--color-primary)]">
          {flashMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Weekly Availability"
            subtitle="Choose the days you work and set one-hour booking windows for each day."
          />
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {activeDaysCount} of 7 days open
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Patients first choose an available day, then they see one-hour time slots.
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
                          day.enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
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
                Booked appointments stay visible in the booking area even after you update your hours.
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
          <CardHeader
            title="Booked Days"
            subtitle={
              loading
                ? "Loading booked dates..."
                : `${upcomingBookedDays.length} upcoming days with requests or visits`
            }
          />
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Booking visibility
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                This replaces one-off overrides so you can quickly see where the calendar is already occupied.
              </p>
            </div>

            {upcomingBookedDays.length === 0 && !loading && (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5 text-sm text-[var(--color-text-muted)]">
                No booked days yet.
              </div>
            )}

            <div className="space-y-3">
              {upcomingBookedDays.map((group) => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{group.label}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {group.bookings.length} booking{group.bookings.length > 1 ? "s" : ""} on this day
                      </p>
                    </div>
                    <Badge variant="gray">{group.bookings.length} total</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text)]">
                              {patientName(booking)}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {booking.reason}
                            </p>
                          </div>
                          <Badge variant={bookingStatusVariant[booking.status]}>{booking.status}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                          <span>{slotLabel(booking)}</span>
                          <span>•</span>
                          <span>{booking.visitType || "VIDEO"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
