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
  getAvailabilityOverrides,
  createAvailabilityOverride,
  deleteAvailabilityOverride,
  AvailabilityOverride,
} from "@/services/provider-availability.service";

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

export default function SchedulePage() {
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashMessage, setFlashMessage] = useState("");

  // Override State
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideStart, setNewOverrideStart] = useState("09:00");
  const [newOverrideEnd, setNewOverrideEnd] = useState("10:00");
  const [isAddingOverride, setIsAddingOverride] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [bookingData, overrideData] = await Promise.all([
          getProviderBookings(),
          getAvailabilityOverrides(),
        ]);
        if (!mounted) return;

        setBookings(sortByStartAt(bookingData));
        setOverrides(overrideData || []);
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

  async function handleAddOverride() {
    if (!newOverrideDate) return;
    setIsAddingOverride(true);
    try {
      const resp = await createAvailabilityOverride({
        date: newOverrideDate,
        startTime: newOverrideStart,
        endTime: newOverrideEnd,
        isAvailable: true,
      });
      setOverrides((prev) => [...prev, resp].sort((a, b) => a.date.localeCompare(b.date)));
      setNewOverrideDate("");
      showFlash("Availability for specific date added.");
    } catch (err: any) {
      showFlash(err?.message || "Failed to add availability.");
    } finally {
      setIsAddingOverride(false);
    }
  }

  async function handleDeleteOverride(id: string) {
    try {
      await deleteAvailabilityOverride(id);
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      showFlash("Availability removed.");
    } catch (err: any) {
      showFlash(err?.message || "Failed to remove availability.");
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-10 text-white shadow-2xl overflow-hidden relative border border-slate-700/50">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-semibold uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Manual Selection Mode
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Manage Your <span className="text-primary italic">Availability</span>
            </h1>
            <p className="mt-4 text-slate-300 text-lg leading-relaxed font-medium">
              You are in full control. Only the dates you manually publish below will be available for patient bookings.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex flex-col items-center bg-primary rounded-3xl p-6 shadow-lg shadow-primary/20 w-full sm:w-auto min-w-[160px]">
              <span className="text-white/70 text-[10px] font-semibold uppercase tracking-widest mb-1 text-center">Active Dates</span>
              <span className="text-4xl font-bold text-white">{overrides.length}</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50" />
      </div>

      {flashMessage && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 rounded-[1.5rem] border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft)] px-6 py-4 text-sm font-semibold text-[var(--color-success)] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-full bg-[var(--color-success)] text-white">
              <Icon name="check" className="w-3.5 h-3.5" />
            </div>
            {flashMessage}
          </div>
          <button onClick={() => setFlashMessage("")} className="opacity-50 hover:opacity-100 transition-opacity">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          {/* Main Controls Card */}
          <Card className="rounded-[2.5rem] border-none shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden bg-[var(--color-surface)]">
            <div className="p-8 space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Individual Date Selection</h3>
                  <p className="text-[var(--color-text-muted)] font-medium">Select specific calendar days to open for appointments.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10">
                {/* Add Form */}
                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] ring-1 ring-slate-200 dark:ring-slate-800 space-y-6 shadow-sm">
                    <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
                      <Icon name="plus" size={16} />
                      Publish Availability
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Calendar Date</label>
                      <input
                        type="date"
                        value={newOverrideDate}
                        onChange={(e) => setNewOverrideDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-semibold p-4 focus:ring-4 focus:ring-primary/20 text-slate-900 dark:text-white shadow-sm transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Starts At</label>
                        <input
                          type="time"
                          value={newOverrideStart}
                          onChange={(e) => setNewOverrideStart(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-semibold p-4 focus:ring-4 focus:ring-primary/20 text-slate-900 dark:text-white shadow-sm transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ends At</label>
                        <input
                          type="time"
                          value={newOverrideEnd}
                          onChange={(e) => setNewOverrideEnd(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-semibold p-4 focus:ring-4 focus:ring-primary/20 text-slate-900 dark:text-white shadow-sm transition-all"
                        />
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleAddOverride}
                      disabled={isAddingOverride || !newOverrideDate}
                      className="w-full rounded-2xl py-6 font-bold uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      {isAddingOverride ? "Publishing..." : "Add to Schedule"}
                    </Button>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Active Slots</h4>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{overrides.length} Total</span>
                  </div>

                  {overrides.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                        <Icon name="calendar" size={32} />
                      </div>
                      <p className="text-sm text-slate-500 font-bold">No custom dates published</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] text-center">Start by adding a specific date to the left.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
                      {overrides.map((override) => (
                        <div key={override.id} className="group relative p-5 rounded-[1.5rem] bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-primary/50 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold">
                                <span className="text-[10px] uppercase">{new Date(override.date).toLocaleDateString([], { month: 'short' })}</span>
                                <span className="text-lg leading-none">{new Date(override.date).getDate()}</span>
                              </div>
                              <div>
                                <p className="text-base font-bold text-slate-900 dark:text-white">
                                  {new Date(override.date).toLocaleDateString([], { weekday: 'long' })}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Icon name="clock" size={14} className="text-slate-400" />
                                  <span className="text-sm font-semibold text-slate-500">
                                    {override.startTime} — {override.endTime}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteOverride(override.id)}
                              className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Icon name="trash" size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Simplified Tips */}
          <div className="rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-900/10 p-8 border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-6 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white dark:bg-indigo-900/50 shadow-sm">
                <Icon name="help" size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              How it works
            </h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Absolute Transparency</p>
                <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 leading-relaxed font-medium">
                  We have disabled automatic slot generation. Only the dates and times you explicitly list here will be visible to patients.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">No "Ghost" Slots</p>
                <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 leading-relaxed font-medium">
                  Deleting an entry here removes it instantly from the booking page. This ensures you are never booked for a time you aren't actually working.
                </p>
              </div>
            </div>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 p-8 bg-[var(--color-surface)]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xl tracking-tight">Visit Ledger</h3>
                <p className="text-sm text-slate-500 font-medium">Scheduled appointments.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-slate-400">
                <Icon name="calendar" size={20} />
              </div>
            </div>
            
            <div className="space-y-6">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-primary mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Syncing Ledger...</p>
                </div>
              ) : upcomingBookedDays.length === 0 ? (
                <div className="py-16 text-center rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800/50">
                  <Icon name="calendar" className="mx-auto w-12 h-12 text-slate-200 dark:text-slate-800 mb-4" />
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Clear Ledger</p>
                </div>
              ) : (
                upcomingBookedDays.map((group) => (
                  <div key={group.key} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{group.label}</span>
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800/50" />
                    </div>
                    {group.bookings.map((booking: ProviderBooking) => (
                      <div key={booking.id} className="p-5 rounded-[1.5rem] bg-slate-50/50 dark:bg-slate-900/20 ring-1 ring-slate-100 dark:ring-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:ring-primary/20 transition-all duration-300">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {booking.patientName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{booking.patientName}</p>
                              <div className="flex items-center gap-1.5 mt-2 text-slate-500">
                                <Icon name="clock" size={12} />
                                <span className="text-xs font-semibold tracking-tight">
                                  {booking.preferredTime}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={bookingStatusVariant[booking.status]} className="font-bold uppercase text-[9px] tracking-widest px-3 py-1 rounded-full">
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
        </div>
      </div>
    </div>
  );
}
