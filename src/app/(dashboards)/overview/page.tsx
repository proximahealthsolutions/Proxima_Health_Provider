"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/shared/Button";
import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import ProviderStatsRow from "@/components/provider/StatsRow";
import PatientQueue from "@/components/provider/PatientQueue";
import VolumeChart from "@/components/provider/VolumeChart";
import ActivityFeed from "@/components/provider/ActivityFeed";
import Icon from "@/components/shared/Icon";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import { fetchApi } from "@/lib/api";
import { getProviderLabOrders } from "@/services/provider-laborders.service";
import { getProviderNotes } from "@/services/provider-notes.service";
import { getProviderPatientMap, formatPatientName } from "@/services/provider-patients.service";
import type {
  BarData,
  ChartStat,
  FeedItem,
  ProviderLabOrder,
  ProviderNote,
  ProviderStatCard,
  QueueData,
  QueuePatient,
  QueueStatus,
} from "@/types";
import { labPriorityVariant } from "@/types";
import type { ProviderPatientDirectoryEntry } from "@/types";

type AppointmentRecord = {
  id: string;
  startAt: string;
  status:
    | "REQUESTED"
    | "ACCEPTED"
    | "REJECTED"
    | "IN_PROGRESS"
    | "ENDED_BY_PROVIDER"
    | "CONFIRMED"
    | "DISPUTED"
    | "RESOLVED"
    | "CANCELLED";
  reason?: string | null;
  patientId: string;
  patient?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
    profileImageUrl?: string | null;
  } | null;
};

type Profile = {
  firstName?: string | null;
  lastName?: string | null;
};

const emptyQueue: QueueData = { Today: [], Tomorrow: [], Week: [] };

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  return startOfDay(start);
}

function toRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.round(diffHr / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function normalizePatientName(patient?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!patient) return "Patient";
  const name = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();
  return name || "Patient";
}

export default function ProviderOverviewPage() {
  const { navigateTo } = useProviderUi();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [labOrders, setLabOrders] = useState<ProviderLabOrder[]>([]);
  const [notes, setNotes] = useState<ProviderNote[]>([]);
  const [patientMap, setPatientMap] = useState<Record<string, ProviderPatientDirectoryEntry>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [me, appts, labs, notesRows, patientMapRows] = await Promise.all([
          fetchApi("/providers/me"),
          fetchApi("/providers/appointments"),
          getProviderLabOrders(),
          getProviderNotes(),
          getProviderPatientMap(),
        ]);
        if (!mounted) return;
        setProfile(me || null);
        setAppointments(Array.isArray(appts) ? appts : []);
        setLabOrders(Array.isArray(labs) ? labs : []);
        setNotes(Array.isArray(notesRows) ? notesRows : []);
        setPatientMap(patientMapRows || {});
      } catch {
        if (!mounted) return;
        setProfile(null);
        setAppointments([]);
        setLabOrders([]);
        setNotes([]);
        setPatientMap({});
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);

  const stats: ProviderStatCard[] = useMemo(() => {
    const todayAppointments = appointments.filter((appt) =>
      isSameDay(new Date(appt.startAt), today)
    );
    const urgentLabs = labOrders.filter(
      (lab) => lab.priority === "Urgent" && lab.status !== "Result Ready"
    ).length;
    const completedToday = appointments.filter(
      (appt) =>
        (appt.status === "CONFIRMED" || appt.status === "RESOLVED") &&
        isSameDay(new Date(appt.startAt), today)
    ).length;

    return [
      {
        icon: "users",
        token: "purple",
        value: String(todayAppointments.length),
        label: "Today's Patients",
        delta: todayAppointments.length ? "Appointments scheduled today" : "No visits scheduled",
        up: todayAppointments.length ? true : null,
      },
      {
        icon: "bolt",
        token: "red",
        value: String(urgentLabs),
        label: "Urgent Labs",
        delta: urgentLabs ? "Needs attention" : "No urgent labs",
        up: urgentLabs ? false : null,
      },
      {
        icon: "check",
        token: "green",
        value: String(completedToday),
        label: "Completed Today",
        delta: completedToday ? "Visits completed" : "No completed visits",
        up: completedToday ? true : null,
      },
      {
        icon: "clock",
        token: "blue",
        value: "—",
        label: "Avg Consult Time",
        delta: "Not available yet",
        up: null,
      },
    ];
  }, [appointments, labOrders, today]);

  const queueData: QueueData = useMemo(() => {
    const data: QueueData = { Today: [], Tomorrow: [], Week: [] };
    const now = startOfDay(today);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const weekAhead = new Date(now);
    weekAhead.setDate(now.getDate() + 7);

    const statusMap: Record<AppointmentRecord["status"], QueueStatus> = {
      REQUESTED: "Waiting",
      ACCEPTED: "Confirmed",
      REJECTED: "No Show",
      IN_PROGRESS: "In Progress",
      ENDED_BY_PROVIDER: "In Progress",
      CONFIRMED: "Confirmed",
      DISPUTED: "No Show",
      RESOLVED: "Confirmed",
      CANCELLED: "No Show",
    };

    const tokenMap: Record<QueueStatus, QueuePatient["token"]> = {
      Waiting: "amber",
      Confirmed: "blue",
      "In Progress": "teal",
      "No Show": "red",
    };

    appointments.forEach((appt) => {
      const date = new Date(appt.startAt);
      const day = startOfDay(date);
      let bucket: keyof QueueData | null = null;
      if (isSameDay(day, now)) bucket = "Today";
      else if (isSameDay(day, tomorrow)) bucket = "Tomorrow";
      else if (day > tomorrow && day < weekAhead) bucket = "Week";

      if (!bucket) return;
      const status = statusMap[appt.status];
      data[bucket].push({
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: date.toISOString(),
        name: normalizePatientName(appt.patient),
        age: appt.patient?.age ?? "—",
        type: appt.reason || "Consultation",
        status,
        token: tokenMap[status],
      });
    });

    (Object.keys(data) as Array<keyof QueueData>).forEach((key) => {
      data[key] = data[key].sort((a, b) => (a.time > b.time ? 1 : -1));
    });

    return data;
  }, [appointments, today]);

  const chartData = useMemo(() => {
    const weekStart = startOfWeek(today);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);

    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });

    const counts = days.map((day) => {
      const count = appointments.filter((appt) => {
        const date = new Date(appt.startAt);
        return isSameDay(date, day) && appt.status !== "CANCELLED";
      }).length;
      return count;
    });

    const max = Math.max(1, ...counts);
    const bars: BarData[] = days.map((day, idx) => ({
      label: day.toLocaleDateString([], { weekday: "short" }),
      h: Math.round((counts[idx] / max) * 100),
    }));

    const thisWeekTotal = counts.reduce((sum, v) => sum + v, 0);
    const lastWeekTotal = appointments.filter((appt) => {
      const date = new Date(appt.startAt);
      return date >= lastWeekStart && date < weekStart && appt.status !== "CANCELLED";
    }).length;

    const growth =
      lastWeekTotal === 0
        ? thisWeekTotal === 0
          ? "0%"
          : "+100%"
        : `${Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)}%`;

    const chartStats: ChartStat[] = [
      { label: "This Week", value: String(thisWeekTotal), token: "purple" },
      { label: "Last Week", value: String(lastWeekTotal), token: "slate" },
      { label: "Growth", value: growth, token: thisWeekTotal >= lastWeekTotal ? "green" : "slate" },
    ];

    return { bars, chartStats };
  }, [appointments, today]);

  const pendingLabs = useMemo(() => {
    return labOrders
      .filter((lab) => lab.status !== "Result Ready")
      .slice(0, 5)
      .map((lab) => ({
        patient: formatPatientName(patientMap[lab.patientId]),
        test: lab.test,
        priority: lab.priority,
        token: labPriorityVariant[lab.priority],
      }));
  }, [labOrders, patientMap]);

  const activityFeed: FeedItem[] = useMemo(() => {
    const feed: Array<{ date: Date; item: FeedItem }> = [];

    notes.forEach((note) => {
      const date = new Date(note.date);
      feed.push({
        date,
        item: {
          dot: "blue",
          text: `Note added for ${formatPatientName(patientMap[note.patientId])} — ${note.tag}`,
          time: toRelative(date),
        },
      });
    });

    labOrders.forEach((lab) => {
      const date = new Date(lab.ordered);
      feed.push({
        date,
        item: {
          dot: lab.priority === "Urgent" ? "red" : "purple",
          text: `Lab order for ${formatPatientName(patientMap[lab.patientId])} — ${lab.test}`,
          time: toRelative(date),
        },
      });
    });

    return feed
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map((entry) => entry.item);
  }, [notes, labOrders, patientMap]);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 55%, var(--color-primary-active) 100%)" }}
      >
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)] flex items-center gap-2">
            <Icon name="medical" className="w-5 h-5" />
            Good morning, Dr. {profile?.lastName || profile?.firstName || "there"}
          </h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">
            You have {stats[0]?.value ?? "0"} patients scheduled today. {stats[1]?.value ?? "0"} require urgent attention.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button
            onClick={() => navigateTo("notes")}
            className="w-full sm:w-auto bg-[var(--color-banner-veil)] border border-[var(--color-banner-border)] text-[var(--color-on-primary)] hover:bg-[var(--color-banner-veil-hover)]"
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="clipboard" className="w-4 h-4" />
              Patient Notes
            </span>
          </Button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <ProviderStatsRow stats={stats} />

      {/* ── Queue (2/3) + Volume (1/3) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PatientQueue data={queueData ?? emptyQueue} subtitle={today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })} />
        </div>
        <div><VolumeChart bars={chartData.bars} chartStats={chartData.chartStats} /></div>
      </div>

      {/* ── Pending Labs + Activity Feed ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader
            title="Pending Lab Results"
            actions={pendingLabs.length ? <Badge variant="red">{pendingLabs.length} New</Badge> : undefined}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Patient", "Test", "Priority", "Action"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {pendingLabs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-sm text-[var(--color-text-muted)]">
                      No pending lab results.
                    </td>
                  </tr>
                )}
                {pendingLabs.map((r, i) => (
                  <tr key={i} className="hover:bg-[var(--color-surface-soft)] transition-colors">
                    <td className="px-5 py-3 font-semibold text-[var(--color-text)]">{r.patient}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{r.test}</td>
                    <td className="px-5 py-3">
                      <Badge variant={r.token}>{r.priority}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Button size="sm" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]">
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <ActivityFeed items={activityFeed} />
      </div>

    </div>
  );
}

