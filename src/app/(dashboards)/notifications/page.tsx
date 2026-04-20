"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card, { CardHeader } from "@/components/shared/Card";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import { fetchApi } from "@/lib/api";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  kind: "booking" | "lab" | "message";
  target: "bookings" | "laborders" | "messages";
  appointmentId?: string;
  createdAt?: string | null;
};

type MessageThread = {
  id: string;
  patientName: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  status: string;
};

type LabOrder = {
  id: string;
  test: string;
  ordered: string;
  uploadedBy?: "patient" | "provider" | null;
  fileName?: string | null;
};

export default function ProviderNotificationsPage() {
  const { navigateTo, openChat, notify } = useProviderUi();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [appointments, labOrders, threads] = await Promise.all([
          fetchApi("/providers/appointments"),
          fetchApi("/providers/clinical/lab-orders"),
          fetchApi("/providers/messages/threads"),
        ]);

        if (!mounted) return;

        const bookingNotifications: NotificationItem[] = (Array.isArray(appointments) ? appointments : [])
          .filter((row) => row?.status === "REQUESTED")
          .map((row) => ({
            id: `booking-${row.id}`,
            title: "New booking request",
            detail: `${row?.patient?.firstName ?? "Patient"} ${row?.patient?.lastName ?? ""}`.trim() || "A patient requested a booking.",
            kind: "booking",
            target: "bookings",
            appointmentId: row.id,
            createdAt: row?.createdAt ?? row?.startAt ?? null,
          }));

        const labNotifications: NotificationItem[] = (Array.isArray(labOrders) ? labOrders : [])
          .filter((row: LabOrder) => row?.uploadedBy === "patient")
          .map((row: LabOrder) => ({
            id: `lab-${row.id}`,
            title: "Patient uploaded a lab result",
            detail: row.fileName ? `${row.test} • ${row.fileName}` : row.test,
            kind: "lab",
            target: "laborders",
            createdAt: row.ordered,
          }));

        const messageNotifications: NotificationItem[] = (Array.isArray(threads) ? threads : [])
          .filter((row: MessageThread) => Boolean(row?.lastMessage))
          .map((row: MessageThread) => ({
            id: `message-${row.id}`,
            title: "New message update",
            detail: `${row.patientName}: ${row.lastMessage}`,
            kind: "message",
            target: "messages",
            appointmentId: row.id,
            createdAt: row.lastMessageAt ?? null,
          }));

        const all = [...bookingNotifications, ...labNotifications, ...messageNotifications].sort(
          (a, b) => {
            const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return right - left;
          }
        );

        setNotifications(all);
      } catch {
        if (!mounted) return;
        setNotifications([]);
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
    const bookings = notifications.filter((item) => item.kind === "booking").length;
    const labs = notifications.filter((item) => item.kind === "lab").length;
    const messages = notifications.filter((item) => item.kind === "message").length;
    return { bookings, labs, messages, total: notifications.length };
  }, [notifications]);

  function openNotification(item: NotificationItem) {
    if (item.target === "messages" && item.appointmentId) {
      openChat(item.appointmentId, "chat");
      return;
    }
    navigateTo(item.target);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-on-primary)]">Notifications</h2>
            <p className="mt-1 text-sm text-[var(--color-primary-contrast-soft)]">
              See every booking, lab-result, and message update in one place, then open the right page to act.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.bookings} Bookings
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.labs} Lab Updates
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.messages} Messages
            </Badge>
            <Badge variant="gray" className="justify-center bg-white/15 border border-white/25 text-[var(--color-on-primary)]">
              {stats.total} Total
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Alert Center"
          subtitle={loading ? "Loading notifications..." : `${notifications.length} notifications available`}
          actions={
            <Button variant="outline" size="sm" onClick={() => notify("Notifications reviewed.")}>
              Mark reviewed
            </Button>
          }
        />

        <div className="p-4 sm:p-5 space-y-3">
          {!loading && notifications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5 text-sm text-[var(--color-text-muted)]">
              No notifications yet.
            </div>
          )}

          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openNotification(item)}
              className="flex w-full items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:bg-[var(--color-surface-soft)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-text)]">{item.title}</p>
                  <Badge
                    variant={
                      item.kind === "booking" ? "yellow" : item.kind === "lab" ? "blue" : "green"
                    }
                  >
                    {item.kind}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.detail}</p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Opens {item.target === "laborders" ? "Lab Orders" : item.target === "bookings" ? "Bookings" : "Messages"}
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Open
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
