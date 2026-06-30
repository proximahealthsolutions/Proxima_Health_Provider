"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import Icon, { IconName } from "@/components/shared/Icon";
import { cn } from "@/lib/utils";
import { ProviderSidebarProps, ProviderNavSection } from "@/types";
import { fetchApi } from "@/lib/api";
import { logoutProviderSession } from "@/lib/session";

const navSections: ProviderNavSection[] = [
  {
    label: "Provider",
    items: [
      { icon: "home", label: "Dashboard",    page: "overview" },
      { icon: "clipboard", label: "Schedule", page: "schedule" },
      { icon: "users", label: "My Patients",  page: "patients" },
      { icon: "bell", label: "Notifications", page: "notifications" },
      { icon: "calendar", label: "Bookings", page: "bookings" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { icon: "settings", label: "Profile",  page: "settings" },
    ],
  },
];

const patientWorkspaceSections: ProviderNavSection[] = [
  {
    label: "Patient Workspace",
    items: [
      { icon: "home", label: "Dashboard", page: "patient-overview" },
      { icon: "message", label: "Messages", page: "patient-messages" },
      { icon: "clipboard", label: "Patient Notes", page: "patient-notes" },
      { icon: "pill", label: "Prescriptions", page: "patient-prescriptions" },
      { icon: "flask", label: "Lab Results", page: "patient-laborders" },
      { icon: "activity", label: "Vital Trends", page: "patient-vitals" },
      { icon: "receipt", label: "History", page: "patient-history" },
    ],
  },
];

export default function ProviderSidebar({
  activePage,
  onNavigate,
  isOpen,
  onClose,
  profile,
  patientWorkspace,
  onCloseWorkspace,
}: ProviderSidebarProps) {
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [notificationCount, setNotificationCount] = useState<number | null>(null);
  const initials =
    [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .map((part) => String(part).trim()[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "PR";
  const displayName =
    profile?.firstName || profile?.lastName
      ? `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim()
      : "Physician";
  const subtitle = profile?.email ?? "Physician account";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [patients, appointments, labOrders, threads, prescriptions] = await Promise.all([
          fetchApi("/providers/patients"),
          fetchApi("/providers/appointments"),
          fetchApi("/providers/clinical/lab-orders"),
          fetchApi("/providers/messages/threads"),
          fetchApi("/providers/prescriptions"),
        ]);
        if (!mounted) return;
        setPatientCount(Array.isArray(patients) ? patients.length : 0);
        if (Array.isArray(appointments)) {
          const pending = appointments.filter((row) => row?.status === "REQUESTED").length;
          setBookingCount(pending);
          const patientLabUploads = Array.isArray(labOrders)
            ? labOrders.filter((row) => row?.uploadedBy === "patient").length
            : 0;
          const messageUpdates = Array.isArray(threads)
            ? threads.filter((row) => Boolean(row?.lastMessage)).length
            : 0;
          const medicationRequests = Array.isArray(prescriptions)
            ? prescriptions.reduce(
                (total, row) =>
                  total +
                  ((row?.changeRequests ?? []).filter(
                    (request: { status?: string | null }) => request?.status === "PENDING"
                  ).length ?? 0),
                0
              )
            : 0;
          setNotificationCount(pending + patientLabUploads + messageUpdates + medicationRequests);
        } else {
          setBookingCount(0);
          setNotificationCount(0);
        }
      } catch {
        if (!mounted) return;
        setPatientCount(null);
        setBookingCount(null);
        setNotificationCount(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sections = useMemo<ProviderNavSection[]>(
    () =>
      (patientWorkspace ? patientWorkspaceSections : navSections).map((section) => ({
        ...section,
        items: section.items.map((item) => {
          if (patientWorkspace) {
            return item;
          }
          if (item.page === "patients") {
            return { ...item, badge: patientCount !== null ? `${patientCount}` : undefined };
          }
          if (item.page === "bookings") {
            return {
              ...item,
              badge: bookingCount !== null && bookingCount > 0 ? `${bookingCount}` : undefined,
              urgent: bookingCount !== null && bookingCount > 0,
            };
          }
          if (item.page === "notifications") {
            return {
              ...item,
              badge:
                notificationCount !== null && notificationCount > 0
                  ? `${notificationCount}`
                  : undefined,
              urgent: notificationCount !== null && notificationCount > 0,
            };
          }
          return item;
        }),
      })),
    [bookingCount, notificationCount, patientCount, patientWorkspace]
  );

  function handleLogout() {
    void logoutProviderSession();
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 h-dvh w-64 z-30 flex flex-col lg:h-auto lg:min-h-dvh",
          "bg-[var(--color-surface)] border-r border-[var(--color-border)]",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-16 w-44 h-44 rounded-full bg-[var(--color-primary-soft)] blur-3xl" />
          <div className="absolute -bottom-16 right-0 w-40 h-40 rounded-full bg-[var(--color-accent-soft)] blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border)]">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-on-primary)] font-bold text-sm shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
              boxShadow:
                "0 12px 22px color-mix(in srgb, var(--color-primary) 28%, transparent)",
            }}
          >
            P
          </div>
          <div className="min-w-0">
            <div className="text-[var(--color-primary)] font-bold text-sm leading-tight tracking-tight">Proxima Health</div>
            <div className="text-[var(--color-primary-faint)] text-[10px] uppercase tracking-[0.18em] mt-0.5">Physician Portal</div>
          </div>
        </div>

        {/* Role tag */}
        <div className="relative mx-4 mt-4 rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)]">
          {patientWorkspace ? (
            <div className="space-y-3 py-1">
              <div className="inline-flex items-center gap-2">
                <Icon name="users" className="h-3.5 w-3.5" />
                Patient Workspace
              </div>
              <div className="rounded-xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-surface)] px-3 py-3">
                <div className="text-sm font-semibold text-[var(--color-text)]">{patientWorkspace.name}</div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  {patientWorkspace.patientRecordNumber || patientWorkspace.email || "Patient record"}
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseWorkspace}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)]"
              >
                <Icon name="close" size={14} />
                Exit patient
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Icon name="medical" className="w-3.5 h-3.5" />
              Physician Portal
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto px-2 py-3 mt-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-faint)] px-2 mb-2">
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive = activePage === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => { onNavigate(item.page); onClose(); }}
                    className={cn(
                      "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 mb-1 border",
                      isActive
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold border-[color:var(--color-primary-soft-border)]"
                        : "text-[var(--color-primary-muted)] border-transparent hover:bg-[var(--color-primary-soft)] hover:border-[color:var(--color-primary-soft-border)] hover:text-[var(--color-primary)]"
                    )}
                    style={
                      isActive
                        ? { boxShadow: "0 6px 14px color-mix(in srgb, var(--color-primary) 14%, transparent)" }
                        : undefined
                    }
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[var(--color-accent)]" />
                    )}
                    <span
                      className={cn(
                        "text-base w-6 h-6 rounded-lg flex items-center justify-center",
                        isActive
                          ? "bg-[var(--color-accent-soft)]"
                          : "bg-[var(--color-primary-soft)] group-hover:bg-[var(--color-primary-soft)]"
                      )}
                    >
                      <Icon name={item.icon as IconName} className="w-4 h-4 text-[var(--color-text)]" />
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                          item.urgent
                            ? "bg-[var(--color-danger)] text-[var(--color-on-primary)]"
                            : isActive
                              ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
                              : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="relative p-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] px-3 py-2.5">
            <Avatar
              initials={initials}
              imageUrl={profile?.profileImageUrl ?? undefined}
              color="purple"
              size="sm"
              rounded
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--color-primary)] truncate">{displayName}</div>
              <div className="text-[11px] text-[var(--color-primary-faint)] truncate">{subtitle}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] border border-[color:var(--color-primary-soft-border)] rounded-xl px-3 py-2 hover:bg-[var(--color-primary-soft)] transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
