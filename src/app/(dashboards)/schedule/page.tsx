"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";
import { bookingStatusVariant, ProviderBooking, BookingStatus } from "@/types";
import { getProviderBookings } from "@/services/provider-bookings.service";
import {
  getWeeklyAvailability,
  saveWeeklyAvailability,
  WeeklyAvailabilityDay,
} from "@/services/provider-availability.service";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BOOKED_DAY_STATUSES = new Set(["requested", "accepted", "in_progress", "ended"]);

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

function sortByStartAt(items: ProviderBooking[]) {
  return [...items].sort((a, b) => {
    const left = a.startAt ? new Date(a.startAt).getTime() : 0;
    const right = b.startAt ? new Date(b.startAt).getTime() : 0;
    return left - right;
  });
}

function buildEmptySchedule(): WeeklyAvailabilityDay[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: false,
    slots: [],
  }));
}

export default function SchedulePage() {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyAvailabilityDay[]>(buildEmptySchedule());
  const [timezone, setTimezone] = useState("UTC");
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
        if (weeklyData && weeklyData.days) {
          setWeeklySchedule(weeklyData.days);
          setTimezone(weeklyData.timezone || "UTC");
        }
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
    window.setTimeout(() => setFlashMessage(""), 3000);
  }

  const activeDaysCount = weeklySchedule.filter((day) => day.enabled).length;

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

  const stats = useMemo(() => {
    const requested = bookings.filter((booking) => booking.status === "requested").length;
    const accepted = bookings.filter((booking) => booking.status === "accepted").length;
    const inProgress = bookings.filter((booking) => booking.status === "in_progress").length;
    const bookedDays = bookedDayGroups.length;
    return { requested, accepted, inProgress, bookedDays };
  }, [bookedDayGroups.length, bookings]);

  function handleAddSlot(weekday: number) {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        return {
          ...day,
          enabled: true,
          slots: [...day.slots, { startTime: "09:00", endTime: "10:00" }],
        };
      })
    );
  }

  function handleRemoveSlot(weekday: number, index: number) {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        const nextSlots = day.slots.filter((_, i) => i !== index);
        return {
          ...day,
          enabled: nextSlots.length > 0,
          slots: nextSlots,
        };
      })
    );
  }

  function handleUpdateSlot(weekday: number, index: number, field: "startTime" | "endTime", value: string) {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        const nextSlots = day.slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        );
        return { ...day, slots: nextSlots };
      })
    );
  }

  function handleToggleDay(weekday: number) {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        const nextEnabled = !day.enabled;
        return {
          ...day,
          enabled: nextEnabled,
          slots: nextEnabled && day.slots.length === 0 ? [{ startTime: "09:00", endTime: "10:00" }] : day.slots,
        };
      })
    );
  }

  async function handleSave() {
    setSavingWeekly(true);
    try {
      const resp = await saveWeeklyAvailability({
        timezone,
        days: weeklySchedule.map((day) => ({
          weekday: day.weekday,
          enabled: day.enabled,
          slots: day.enabled ? day.slots.map(s => ({ startTime: s.startTime, endTime: s.endTime })) : [],
        })),
      });
      setWeeklySchedule(resp.days);
      setTimezone(resp.timezone);
      showFlash("Schedule updated successfully.");
    } catch (err: any) {
      showFlash(err?.message || "Failed to save schedule.");
    } finally {
      setSavingWeekly(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1e293b] to-[#334155] p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Availability Center</h1>
              <p className="mt-2 text-slate-300 max-w-md">
                Customize your weekly schedule with precision. Add specific time slots and manage your timezone.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 py-1.5 px-4 rounded-full">
                {activeDaysCount} Days Active
              </Badge>
              <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-400 py-1.5 px-4 rounded-full">
                {stats.requested} Pending Requests
              </Badge>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
      </div>

      {flashMessage && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-2xl border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft)] px-4 py-4 text-sm font-semibold text-[var(--color-success)] flex items-center gap-3">
          <Icon name="check" className="w-5 h-5" />
          {flashMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm ring-1 ring-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
            <div className="p-6 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">Weekly Slots</h3>
                <p className="text-sm text-[var(--color-text-muted)]">Configure your daily working hours</p>
              </div>
              <div className="flex items-center gap-3 bg-[var(--color-surface-soft)] p-1.5 rounded-2xl ring-1 ring-[var(--color-border)]">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] ml-2">Timezone</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="bg-[var(--color-surface)] border-none rounded-xl text-sm font-medium py-1.5 px-3 focus:ring-2 focus:ring-[var(--color-primary)] shadow-sm text-[var(--color-text)]"
                >
                  {COMMON_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {weeklySchedule.map((day) => (
                <div key={day.weekday} className={cn("p-6 transition-colors", day.enabled ? "bg-[var(--color-surface)]" : "bg-[var(--color-surface-soft)]/50")}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-[140px]">
                      <button
                        onClick={() => handleToggleDay(day.weekday)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300",
                          day.enabled ? "bg-[var(--color-primary)]" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300", day.enabled ? "translate-x-6" : "translate-x-1")} />
                      </button>
                      <span className={cn("font-bold text-base", day.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")}>
                        {WEEKDAYS[day.weekday]}
                      </span>
                    </div>

                    <div className="flex-1 space-y-3">
                      {day.enabled ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {day.slots.map((slot, idx) => (
                              <div key={idx} className="flex items-center gap-2 group animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex flex-1 items-center gap-2 bg-[var(--color-surface-soft)] rounded-2xl p-2 ring-1 ring-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-primary)] transition-all">
                                  <input
                                    type="time"
                                    value={slot.startTime}
                                    onChange={(e) => handleUpdateSlot(day.weekday, idx, "startTime", e.target.value)}
                                    className="bg-transparent border-none text-sm font-medium w-full focus:ring-0 p-1 text-[var(--color-text)]"
                                  />
                                  <span className="text-[var(--color-text-muted)] text-xs">—</span>
                                  <input
                                    type="time"
                                    value={slot.endTime}
                                    onChange={(e) => handleUpdateSlot(day.weekday, idx, "endTime", e.target.value)}
                                    className="bg-transparent border-none text-sm font-medium w-full focus:ring-0 p-1 text-[var(--color-text)]"
                                  />
                                </div>
                                <button
                                  onClick={() => handleRemoveSlot(day.weekday, idx)}
                                  className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] rounded-xl transition-colors"
                                >
                                  <Icon name="trash" size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => handleAddSlot(day.weekday)}
                            className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-[var(--color-primary-soft)] transition-colors"
                          >
                            <Icon name="plus" size={14} />
                            Add time slot
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-[var(--color-text-muted)] italic py-2">Unavailable for bookings</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-[var(--color-surface-soft)] border-t border-[var(--color-border)] flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
                Slots will be visible to patients for booking. Ensure you allow enough buffer time between appointments.
              </p>
              <Button
                onClick={handleSave}
                disabled={savingWeekly}
                className="rounded-2xl px-8 shadow-lg bg-[var(--color-primary)] text-[var(--color-on-primary)]"
              >
                {savingWeekly ? "Saving changes..." : "Save Schedule"}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm ring-1 ring-[var(--color-border)] p-6 bg-[var(--color-surface)]">
            <h3 className="font-bold text-[var(--color-text)] text-lg">Booked Overview</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">See your upcoming confirmed visits</p>
            
            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mb-4" />
                  <p className="text-sm">Fetching your bookings...</p>
                </div>
              ) : upcomingBookedDays.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border-2 border-dashed border-[var(--color-border)]">
                  <Icon name="calendar" className="mx-auto w-10 h-10 text-[var(--color-text-muted)]/30 mb-3" />
                  <p className="text-sm text-[var(--color-text-muted)] font-medium">No confirmed bookings yet</p>
                </div>
              ) : (
                upcomingBookedDays.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-[var(--color-border)]" />
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{group.label}</span>
                      <div className="h-px flex-1 bg-[var(--color-border)]" />
                    </div>
                    {group.bookings.map((booking: ProviderBooking) => (
                      <div key={booking.id} className="p-4 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[var(--color-text)]">{booking.patientName}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Icon name="clock" size={12} className="text-[var(--color-text-muted)]" />
                              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                                {booking.preferredTime}
                              </span>
                            </div>
                          </div>
                          <Badge variant={bookingStatusVariant[booking.status]}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="rounded-3xl bg-[var(--color-primary-soft)] p-6 border border-[var(--color-primary-soft-border)]">
            <h4 className="text-sm font-bold text-[var(--color-primary)] mb-2 flex items-center gap-2">
              <Icon name="help" size={16} />
              Scheduling Tips
            </h4>
            <ul className="text-xs text-[var(--color-text)] space-y-3 opacity-80">
              <li className="flex gap-2">
                <span className="text-[var(--color-primary)] font-bold">•</span>
                Use the multi-slot feature to set breaks or split shifts during the day.
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--color-primary)] font-bold">•</span>
                Double check your timezone to ensure patients see the correct local times.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
