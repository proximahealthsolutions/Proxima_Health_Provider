"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/shared/Badge";
import Card from "@/components/shared/Card";
import Icon from "@/components/shared/Icon";
import { bookingStatusVariant, ProviderBooking } from "@/types";
import { getProviderBookings } from "@/services/provider-bookings.service";
import {
  AvailabilityOverride,
  WeeklyAvailabilityDay,
  getAvailabilityOverrides,
  getWeeklyAvailability,
  saveProviderDateSlots,
  saveWeeklyAvailability,
} from "@/services/provider-availability.service";

const BOOKED_DAY_STATUSES = new Set(["requested", "accepted", "in_progress", "ended"]);
const SLOT_MINUTES = 30;
const SLOT_START_HOUR = 7;
const SLOT_END_HOUR = 20;
const COMMON_TIMEZONES = [
  "UTC",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildTimeOptions() {
  const slots: string[] = [];
  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += 1) {
    slots.push(`${pad(hour)}:00`);
    slots.push(`${pad(hour)}:30`);
  }
  return slots;
}

function sortByStartAt(items: ProviderBooking[]) {
  return [...items].sort((a, b) => {
    const left = a.startAt ? new Date(a.startAt).getTime() : 0;
    const right = b.startAt ? new Date(b.startAt).getTime() : 0;
    return left - right;
  });
}

function getZonedDateParts(value: string | Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(value));
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    time: `${getPart("hour")}:${getPart("minute")}`,
  };
}

function formatRangeLabel(startTime: string, endTime: string) {
  return `${startTime} - ${endTime}`;
}

function expandRangeToSlotStarts(startTime: string, endTime: string) {
  const slots: string[] = [];
  let cursor = startTime;
  while (cursor < endTime) {
    slots.push(cursor);
    const [hours, minutes] = cursor.split(":").map(Number);
    const nextMinutes = hours * 60 + minutes + SLOT_MINUTES;
    cursor = `${pad(Math.floor(nextMinutes / 60))}:${pad(nextMinutes % 60)}`;
  }
  return slots;
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SchedulePage() {
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [weeklyDays, setWeeklyDays] = useState<WeeklyAvailabilityDay[]>([]);
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [savingSlots, setSavingSlots] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [bookingData, overrideData, weeklyData] = await Promise.all([
          getProviderBookings(),
          getAvailabilityOverrides(),
          getWeeklyAvailability(),
        ]);

        if (!mounted) return;

        setBookings(sortByStartAt(bookingData));
        setOverrides(overrideData || []);
        setWeeklyDays(weeklyData?.days || []);
        if (weeklyData?.timezone) {
          setTimezone(weeklyData.timezone);
        }
      } catch {
        if (!mounted) return;
        setBookings([]);
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

  function showFlash(message: string) {
    setFlashMessage(message);
    window.setTimeout(() => setFlashMessage(""), 3000);
  }

  const publishedRanges = useMemo(() => {
    return overrides
      .filter((override) => override.isAvailable && override.startTime && override.endTime)
      .sort((a, b) => {
        const left = `${a.date}-${a.startTime}`;
        const right = `${b.date}-${b.startTime}`;
        return left.localeCompare(right);
      });
  }, [overrides]);

  const selectedDateRanges = useMemo(
    () =>
      publishedRanges
        .filter((override) => override.date.slice(0, 10) === selectedDate)
        .flatMap((override) =>
          expandRangeToSlotStarts(override.startTime as string, override.endTime as string)
        ),
    [publishedRanges, selectedDate]
  );

  useEffect(() => {
    setSelectedSlots(Array.from(new Set(selectedDateRanges)).sort());
  }, [selectedDateRanges]);

  const activeDatesCount = useMemo(() => {
    return new Set(publishedRanges.map((override) => override.date.slice(0, 10))).size;
  }, [publishedRanges]);

  const publishedRangesByDate = useMemo(() => {
    return publishedRanges.reduce<Record<string, AvailabilityOverride[]>>((acc, override) => {
      const key = override.date.slice(0, 10);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(override);
      return acc;
    }, {});
  }, [publishedRanges]);

  const bookedSlotStarts = useMemo(() => {
    const result = new Set<string>();
    bookings
      .filter((booking) => BOOKED_DAY_STATUSES.has(booking.status))
      .forEach((booking) => {
        if (!booking.startAt || !booking.endAtIso) return;
        const start = getZonedDateParts(booking.startAt, timezone);
        const end = getZonedDateParts(booking.endAtIso, timezone);
        if (start.date !== selectedDate) return;

        let cursor = start.time;
        while (cursor < end.time) {
          result.add(cursor);
          const [hours, minutes] = cursor.split(":").map(Number);
          const nextMinutes = hours * 60 + minutes + SLOT_MINUTES;
          cursor = `${pad(Math.floor(nextMinutes / 60))}:${pad(nextMinutes % 60)}`;
        }
      });
    return result;
  }, [bookings, selectedDate, timezone]);

  const pastSlotStarts = useMemo(() => {
    const now = getZonedDateParts(new Date(), timezone);
    const result = new Set<string>();
    if (now.date !== selectedDate) {
      return result;
    }

    timeOptions.forEach((time) => {
      if (time < now.time) {
        result.add(time);
      }
    });

    return result;
  }, [selectedDate, timeOptions, timezone]);

  const selectedRangesPreview = useMemo(() => {
    if (selectedSlots.length === 0) return [];

    const sorted = [...selectedSlots].sort((a, b) => a.localeCompare(b));
    const ranges: Array<{ startTime: string; endTime: string }> = [];
    let rangeStart = sorted[0];
    let rangeEndMinutes = Number(sorted[0].slice(0, 2)) * 60 + Number(sorted[0].slice(3, 5)) + SLOT_MINUTES;

    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      const currentMinutes = Number(current.slice(0, 2)) * 60 + Number(current.slice(3, 5));
      if (currentMinutes === rangeEndMinutes) {
        rangeEndMinutes += SLOT_MINUTES;
        continue;
      }

      ranges.push({
        startTime: rangeStart,
        endTime: `${pad(Math.floor(rangeEndMinutes / 60))}:${pad(rangeEndMinutes % 60)}`,
      });

      rangeStart = current;
      rangeEndMinutes = currentMinutes + SLOT_MINUTES;
    }

    ranges.push({
      startTime: rangeStart,
      endTime: `${pad(Math.floor(rangeEndMinutes / 60))}:${pad(rangeEndMinutes % 60)}`,
    });

    return ranges;
  }, [selectedSlots]);

  async function handleSaveTimezone(nextTimezone: string) {
    const previousTimezone = timezone;
    setTimezone(nextTimezone);
    setSavingTimezone(true);
    try {
      const updated = await saveWeeklyAvailability({
        timezone: nextTimezone,
        days: weeklyDays,
      });
      setWeeklyDays(updated.days || []);
      showFlash("Schedule timezone updated.");
    } catch (err: any) {
      setTimezone(previousTimezone);
      showFlash(err?.message || "Failed to update timezone.");
    } finally {
      setSavingTimezone(false);
    }
  }

  function toggleSlot(time: string) {
    if (bookedSlotStarts.has(time) || pastSlotStarts.has(time)) {
      return;
    }

    setSelectedSlots((current) =>
      current.includes(time) ? current.filter((slot) => slot !== time) : [...current, time].sort()
    );
  }

  async function refreshOverrides() {
    const updated = await getAvailabilityOverrides();
    setOverrides(updated || []);
  }

  async function saveSlotsForDate(date: string, slots: string[], successMessage: string) {
    setSavingSlots(true);
    try {
      await saveProviderDateSlots({
        date,
        slotMinutes: SLOT_MINUTES,
        slots,
      });
      await refreshOverrides();
      if (date === selectedDate) {
        setSelectedSlots(slots);
      }
      showFlash(successMessage);
    } catch (err: any) {
      showFlash(err?.message || "Failed to update published windows.");
    } finally {
      setSavingSlots(false);
    }
  }

  async function handleSaveSelectedSlots() {
    await saveSlotsForDate(
      selectedDate,
      selectedSlots,
      selectedSlots.length ? "Selected slots opened for patients." : "Selected date cleared."
    );
  }

  async function handleDeletePublishedRange(override: AvailabilityOverride) {
    const date = override.date.slice(0, 10);
    const remainingSlots = (publishedRangesByDate[date] || [])
      .filter((item) => item.id !== override.id)
      .flatMap((item) => expandRangeToSlotStarts(item.startTime as string, item.endTime as string));

    await saveSlotsForDate(date, remainingSlots, "Published window removed.");
  }

  async function handleClearDate(date: string) {
    await saveSlotsForDate(date, [], `${formatDateLabel(date)} cleared.`);
  }

  async function handleClearAllPublished() {
    const dates = Object.keys(publishedRangesByDate);
    if (dates.length === 0) {
      return;
    }

    setSavingSlots(true);
    try {
      for (const date of dates) {
        await saveProviderDateSlots({
          date,
          slotMinutes: SLOT_MINUTES,
          slots: [],
        });
      }
      await refreshOverrides();
      if (dates.includes(selectedDate)) {
        setSelectedSlots([]);
      }
      showFlash("All published windows cleared.");
    } catch (err: any) {
      showFlash(err?.message || "Failed to clear published windows.");
    } finally {
      setSavingSlots(false);
    }
  }

  const bookedDayGroups = useMemo(() => {
    const grouped = sortByStartAt(
      bookings.filter((booking) => BOOKED_DAY_STATUSES.has(booking.status))
    ).reduce<Map<string, { key: string; label: string; bookings: ProviderBooking[] }>>((acc, booking) => {
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
    }, new Map());

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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 bg-[var(--color-bg)] p-4 text-[var(--color-text)] lg:p-8">
      <div className="overflow-hidden rounded-[2.25rem] border border-[var(--color-border)] bg-[radial-gradient(circle_at_top_right,_var(--color-accent-soft),_transparent_35%),linear-gradient(180deg,var(--color-surface)_0%,var(--color-surface-soft)_100%)] p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-strong)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
              Provider schedule
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)] lg:text-4xl">Availability schedule</h1>
            <p className="mt-3 text-sm font-medium text-[var(--color-text-muted)] lg:text-base">
              Approved physicians can create patient-bookable 30-minute slot windows.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                <Icon name="clock" size={12} />
                Timezone
              </div>
              <select
                value={timezone}
                disabled={savingTimezone}
                onChange={(event) => handleSaveTimezone(event.target.value)}
                className="bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-[var(--color-on-primary)] shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Active dates</div>
              <div className="mt-1 text-3xl font-bold leading-none">{activeDatesCount}</div>
            </div>
          </div>
        </div>
      </div>

      {flashMessage ? (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--color-success-soft)] bg-[var(--color-success-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-success-strong)] shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[var(--color-success)] p-1 text-[var(--color-on-primary)]">
              <Icon name="check" size={12} />
            </span>
            {flashMessage}
          </div>
          <button onClick={() => setFlashMessage("")} className="text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]">
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div className="space-y-6 p-6 lg:p-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[var(--color-text)]">Availability schedule</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Choose a date, tap the 30-minute times you want open, then publish them.</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Clinic date</span>
                <input
                  type="date"
                  min={formatDateInput(new Date())}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base font-semibold text-[var(--color-text)] outline-none ring-0 transition focus:border-[var(--color-accent)] focus:shadow-[0_0_0_4px_var(--color-accent-soft)]"
                />
              </label>

              <button
                type="button"
                onClick={handleSaveSelectedSlots}
                disabled={savingSlots}
                className="mt-auto flex h-14 items-center justify-center rounded-2xl bg-[var(--color-accent)] px-5 text-base font-bold text-[var(--color-on-primary)] shadow-lg transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSlots ? "Saving selected slots..." : "Open selected slots"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {timeOptions.map((time) => {
                const isSelected = selectedSlots.includes(time);
                const isBooked = bookedSlotStarts.has(time);
                const isPast = pastSlotStarts.has(time);
                const disabled = isBooked || isPast;

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleSlot(time)}
                    disabled={disabled}
                    className={[
                      "h-12 rounded-2xl border text-base font-bold transition",
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary-soft-border)] hover:bg-[var(--color-primary-soft)]",
                      isBooked ? "cursor-not-allowed border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]" : "",
                      isPast ? "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] opacity-60" : "",
                    ].join(" ")}
                  >
                    {time}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface-soft)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-[var(--color-text-muted)]">
                <span className="font-bold text-[var(--color-text)]">{selectedSlots.length}</span> slots selected to open.
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlots([])}
                className="text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
              >
                Clear selection
              </button>
            </div>

            <div className="space-y-3">
              {selectedRangesPreview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
                  Select one or more 30-minute buttons to build this day&apos;s patient-bookable windows.
                </div>
              ) : (
                selectedRangesPreview.map((range) => (
                  <div
                    key={`${range.startTime}-${range.endTime}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm font-semibold text-[var(--color-text)]"
                  >
                    <span>{selectedDate}</span>
                    <span>{formatRangeLabel(range.startTime, range.endTime)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text)]">Published windows</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Dates and time ranges currently visible to patients.</p>
                </div>
                <button
                  type="button"
                  disabled={savingSlots || publishedRanges.length === 0}
                  onClick={handleClearAllPublished}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-danger-soft-border)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="trash" size={14} />
                  Clear all
                </button>
              </div>

              <div className="space-y-3">
                {publishedRanges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                    No slot windows published yet.
                  </div>
                ) : (
                  Object.entries(publishedRangesByDate).map(([date, rows]) => (
                    <div
                      key={date}
                      className="rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)]/80 p-3 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3 px-2">
                        <div>
                          <div className="text-sm font-bold text-[var(--color-text)]">{formatDateLabel(date)}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{date}</div>
                        </div>
                        <button
                          type="button"
                          disabled={savingSlots}
                          onClick={() => handleClearDate(date)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Icon name="close" size={14} />
                          Clear date
                        </button>
                      </div>

                      <div className="space-y-2">
                        {rows.map((override) => (
                          <div
                            key={override.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-primary-soft-border)] bg-[var(--color-surface)] px-4 py-3 text-sm shadow-sm"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-[var(--color-text)]">
                                {formatRangeLabel(override.startTime as string, override.endTime as string)}
                              </div>
                              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                {timezone}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={savingSlots}
                              onClick={() => handleDeletePublishedRange(override)}
                              className="rounded-xl border border-[var(--color-danger-soft-border)] bg-[var(--color-danger-soft)] p-2 text-[var(--color-danger)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Delete ${override.startTime}-${override.endTime} on ${date}`}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text)]">Visit ledger</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Scheduled appointments.</p>
                </div>
                <div className="rounded-2xl bg-[var(--color-surface-soft)] p-3 text-[var(--color-text-muted)]">
                  <Icon name="calendar" size={20} />
                </div>
              </div>

              <div className="space-y-5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-accent)]" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Loading schedule...</p>
                  </div>
                ) : upcomingBookedDays.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                    No upcoming appointments found.
                  </div>
                ) : (
                  upcomingBookedDays.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                          {group.label}
                        </span>
                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                      </div>

                      {group.bookings.map((booking: ProviderBooking) => (
                        <div
                          key={booking.id}
                          className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[var(--color-text)]">{booking.patientName}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                              <Icon name="clock" size={12} />
                              <span>{booking.preferredTime}</span>
                            </div>
                          </div>

                          <Badge variant={bookingStatusVariant[booking.status]} className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                            {booking.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
