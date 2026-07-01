"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card, { CardHeader } from "@/components/shared/Card";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import {
  loadProviderNotificationItems,
  notificationPatient,
  type ProviderNotificationItem,
} from "@/lib/provider-notification-items";
import {
  getReadProviderNotificationIds,
  markProviderNotificationRead,
  markProviderNotificationsRead,
} from "@/lib/notification-read-state";

export default function ProviderNotificationsPage() {
  const { navigateTo, openChat, openPatientChat, openPatientWorkspace, notify } = useProviderUi();
  const [notifications, setNotifications] = useState<ProviderNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadProviderNotificationIds());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const all = await loadProviderNotificationItems();
        if (!mounted) return;
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
    const unread = notifications.filter((item) => !readIds.has(item.id));
    const bookings = unread.filter((item) => item.kind === "booking").length;
    const labs = unread.filter((item) => item.kind === "lab").length;
    const messages = unread.filter((item) => item.kind === "message").length;
    const prescriptions = unread.filter((item) => item.kind === "prescription").length;
    return { bookings, labs, messages, prescriptions, total: unread.length };
  }, [notifications, readIds]);

  function openNotification(item: ProviderNotificationItem) {
    markProviderNotificationRead(item.id);
    setReadIds(getReadProviderNotificationIds());

    const patient = notificationPatient(item);
    if (item.target === "messages" && item.appointmentId) {
      if (patient) {
        openPatientChat(patient, item.appointmentId, "chat");
        return;
      }
      openChat(item.appointmentId, "chat");
      return;
    }
    if (item.target === "prescriptions" && patient) {
      openPatientWorkspace(patient, "patient-prescriptions");
      return;
    }
    if (item.target === "laborders" && patient) {
      openPatientWorkspace(patient, "patient-laborders");
      return;
    }
    navigateTo(item.target);
  }

  function markAllRead() {
    markProviderNotificationsRead(notifications.map((item) => item.id));
    setReadIds(getReadProviderNotificationIds());
    notify("All notifications marked as read.");
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
              {stats.prescriptions} Meds
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
          subtitle={loading ? "Loading notifications..." : `${stats.total} unread notifications`}
          actions={
            <Button variant="outline" size="sm" onClick={markAllRead}>
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
                      item.kind === "booking"
                        ? "yellow"
                        : item.kind === "lab"
                        ? "blue"
                        : item.kind === "prescription"
                        ? "purple"
                        : "green"
                    }
                  >
                    {readIds.has(item.id) ? "read" : item.kind}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.detail}</p>
                {item.kind === "prescription" && item.reason && (
                  <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Patient reason
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text)]">{item.reason}</p>
                  </div>
                )}
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Opens{" "}
                  {item.target === "laborders"
                    ? "Lab Orders"
                    : item.target === "bookings"
                    ? "Bookings"
                    : item.target === "prescriptions"
                    ? "Prescriptions"
                    : "Messages"}
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
