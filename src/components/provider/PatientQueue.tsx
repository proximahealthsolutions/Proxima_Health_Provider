"use client";

import { useMemo, useState } from "react";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import { QueuePatient, QueueFilter, QueueData, queueStatusVariant } from "@/types";

const dotColor: Record<QueuePatient["token"], string> = {
  teal:   "bg-[var(--color-info-soft)]0",
  amber:  "bg-[var(--color-warning)]",
  blue:   "bg-[var(--color-primary)]",
  red:    "bg-[var(--color-danger)]",
  purple: "bg-[var(--color-primary)]",
  green:  "bg-[var(--color-accent)]",
};

const emptyQueue: QueueData = { Today: [], Tomorrow: [], Week: [] };

type PatientQueueProps = {
  data: QueueData;
  subtitle?: string;
};

export default function PatientQueue({ data, subtitle }: PatientQueueProps) {
  const { navigateTo } = useProviderUi();
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const allItems = useMemo(() => {
    const source = data ?? emptyQueue;
    return [...source.Today, ...source.Tomorrow, ...source.Week].map((item) => ({
      ...item,
      date: item.date ?? new Date().toISOString(),
    }));
  }, [data]);

  const weekStart = useMemo(() => {
    const day = selectedDay.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday
    const start = new Date(selectedDay);
    start.setDate(selectedDay.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [selectedDay]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const count = allItems.filter((item) => {
        const itemDate = new Date(item.date ?? "");
        return (
          itemDate.getFullYear() === d.getFullYear() &&
          itemDate.getMonth() === d.getMonth() &&
          itemDate.getDate() === d.getDate()
        );
      }).length;
      return { date: d, count };
    });
  }, [weekStart, allItems]);

  const queue = useMemo(() => {
    return allItems.filter((item) => {
      const d = new Date(item.date ?? "");
      return (
        d.getFullYear() === selectedDay.getFullYear() &&
        d.getMonth() === selectedDay.getMonth() &&
        d.getDate() === selectedDay.getDate()
      );
    });
  }, [allItems, selectedDay]);

  return (
    <Card>
      <CardHeader
        title="Patient Queue"
        subtitle={subtitle}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo("schedule")}
            >
              View Schedule
            </Button>
          </div>
        }
      />

      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weekDays.map((day) => {
            const isActive =
              day.date.getFullYear() === selectedDay.getFullYear() &&
              day.date.getMonth() === selectedDay.getMonth() &&
              day.date.getDate() === selectedDay.getDate();
            const label = day.date.toLocaleDateString([], { weekday: "short" });
            const number = day.date.getDate();
            return (
              <button
                key={day.date.toISOString()}
                onClick={() => setSelectedDay(day.date)}
                className={cn(
                  "min-w-[74px] rounded-xl border px-3 py-2 text-left transition",
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
                )}
              >
                <div className="text-[10px] uppercase tracking-wide">{label}</div>
                <div className="text-lg font-semibold leading-tight">{number}</div>
                <div
                  className={cn(
                    "text-[10px] mt-1",
                    isActive ? "text-[var(--color-on-primary)]" : "text-[var(--color-text-muted)]"
                  )}
                >
                  {day.count} appt{day.count === 1 ? "" : "s"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {queue.length === 0 && (
          <div className="px-5 py-6 text-sm text-[var(--color-text-muted)]">
            No appointments in this window.
          </div>
        )}
        {queue.map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <span className="text-[11px] font-bold text-[var(--color-primary)] w-16 shrink-0">{p.time}</span>
            <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor[p.token])} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--color-text)]">
                {p.name}
                {p.age !== "—" && (
                  <span className="font-normal text-[var(--color-text-muted)] text-xs"> · {p.age}y</span>
                )}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">{p.type}</div>
            </div>
            <Badge variant={queueStatusVariant[p.status]}>{p.status}</Badge>
            <Button
              size="sm"
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] ml-1"
            >
              Start
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
