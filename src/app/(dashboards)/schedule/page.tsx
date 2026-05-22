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

  const bookedSlotStarts = useMemo(() => {
    const result = new Set<string>();
    bookings
      .filter((booking) => BOOKED_DAY_STATUSES.has(booking.status))
      .forEach((booking) => {
        if (!booking.startAt || !booking.endAt) return;
        const start = getZonedDateParts(booking.startAt, timezone);
        const end = getZonedDateParts(booking.endAt, timezone);
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

  async function handleSaveSelectedSlots() {
    setSavingSlots(true);
    try {
      await saveProviderDateSlots({
        date: selectedDate,
        slotMinutes: SLOT_MINUTES,
        slots: selectedSlots,
      });
      await refreshOverrides();
      showFlash(selectedSlots.length ? "Selected slots opened for patients." : "Selected date cleared.");
    } catch (err: any) {
      showFlash(err?.message || "Failed to save selected slots.");
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 lg:p-8">
      <div className="overflow-hidden rounded-[2.25rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(70,221,99,0.18),_transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#c9f2d2] bg-[#effcf2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1e8a36]">
              <span className="h-2 w-2 rounded-full bg-[#3fd85b]" />
              Provider schedule
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">Availability schedule</h1>
            <p className="mt-3 text-sm font-medium text-slate-600 lg:text-base">
              Approved physicians can create patient-bookable 30-minute slot windows.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <Icon name="clock" size={12} />
                Timezone
              </div>
              <select
                value={timezone}
                disabled={savingTimezone}
                onChange={(event) => handleSaveTimezone(event.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-[#46dd63] px-5 py-4 text-white shadow-lg shadow-[#46dd63]/25">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">Active dates</div>
              <div className="mt-1 text-3xl font-bold leading-none">{activeDatesCount}</div>
            </div>
          </div>
        </div>
      </div>

      {flashMessage ? (
        <div className="flex items-center justify-between rounded-2xl border border-[#caecd3] bg-[#f1fbf4] px-4 py-3 text-sm font-semibold text-[#1b7d32] shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#2fbe4c] p-1 text-white">
              <Icon name="check" size={12} />
            </span>
            {flashMessage}
          </div>
          <button onClick={() => setFlashMessage("")} className="text-slate-400 transition hover:text-slate-700">
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="space-y-6 p-6 lg:p-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900">Availability schedule</h2>
              <p className="text-sm text-slate-500">Choose a date, tap the 30-minute times you want open, then publish them.</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Clinic date</span>
                <input
                  type="date"
                  min={formatDateInput(new Date())}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 outline-none ring-0 transition focus:border-[#46dd63] focus:shadow-[0_0_0_4px_rgba(70,221,99,0.14)]"
                />
              </label>

              <button
                type="button"
                onClick={handleSaveSelectedSlots}
                disabled={savingSlots}
                className="mt-auto flex h-14 items-center justify-center rounded-2xl bg-[#46dd63] px-5 text-base font-bold text-white shadow-lg shadow-[#46dd63]/25 transition hover:bg-[#36cf54] disabled:cursor-not-allowed disabled:opacity-60"
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
                        ? "border-[#194ea6] bg-[#1d56b6] text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#b6d8ff] hover:bg-[#f6fbff]",
                      isBooked ? "cursor-not-allowed border-[#ffd9c2] bg-[#fff5ee] text-[#c67136]" : "",
                      isPast ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" : "",
                    ].join(" ")}
                  >
                    {time}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-slate-500">
                <span className="font-bold text-slate-800">{selectedSlots.length}</span> slots selected to open.
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlots([])}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
              >
                Clear selection
              </button>
            </div>

            <div className="space-y-3">
              {selectedRangesPreview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                  Select one or more 30-minute buttons to build this day&apos;s patient-bookable windows.
                </div>
              ) : (
                selectedRangesPreview.map((range) => (
                  <div
                    key={`${range.startTime}-${range.endTime}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700"
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
          <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="space-y-5 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Published windows</h3>
                <p className="text-sm text-slate-500">Dates and time ranges currently visible to patients.</p>
              </div>

              <div className="space-y-3">
                {publishedRanges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                    No slot windows published yet.
                  </div>
                ) : (
                  publishedRanges.map((override) => (
                    <div
                      key={override.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
                    >
                      <span>{override.date.slice(0, 10)}</span>
                      <span>{formatRangeLabel(override.startTime as string, override.endTime as string)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Visit ledger</h3>
                  <p className="text-sm text-slate-500">Scheduled appointments.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-slate-400">
                  <Icon name="calendar" size={20} />
                </div>
              </div>

              <div className="space-y-5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#46dd63]" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Loading schedule...</p>
                  </div>
                ) : upcomingBookedDays.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                    No upcoming appointments found.
                  </div>
                ) : (
                  upcomingBookedDays.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          {group.label}
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>

                      {group.bookings.map((booking: ProviderBooking) => (
                        <div
                          key={booking.id}
                          className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{booking.patientName}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
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
