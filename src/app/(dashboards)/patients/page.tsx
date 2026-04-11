"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card, { CardHeader } from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Avatar from "@/components/shared/Avatar";
import Icon from "@/components/shared/Icon";
import RightDrawer from "@/components/shared/RightDrawer";
import { cn } from "@/lib/utils";
import { PatientRow, PatientFilter, riskVariant, patientStatusVariant } from "@/types";
import { getProviderPatients } from "@/services/provider-patients.service";
import { getProviderBookings } from "@/services/provider-bookings.service";

const FILTERS: PatientFilter[] = ["All", "Active", "High Risk", "Recent"];

export default function PatientsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<PatientFilter>("All");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rows, bookings] = await Promise.all([getProviderPatients(), getProviderBookings()]);
        const activeStatuses = new Set(["requested", "accepted", "in_progress"]);
        const endedStatuses = new Set(["ended", "confirmed", "resolved", "cancelled", "rejected"]);
        const bookingsByPatient = bookings.reduce<Record<string, typeof bookings>>((acc, booking) => {
          acc[booking.patientId] = acc[booking.patientId] ?? [];
          acc[booking.patientId].push(booking);
          return acc;
        }, {});
        const activeBookingCount = bookings.filter((b) => activeStatuses.has(b.status)).length;
        setAcceptedCount(activeBookingCount);
        const mapped: PatientRow[] = rows.map((patient: any) => {
          const name = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Patient";
          const initials = name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("");
          let age: number | null = typeof patient.age === "number" ? patient.age : null;
          if (age === null && patient.dateOfBirth) {
            const dob = new Date(patient.dateOfBirth);
            if (!Number.isNaN(dob.getTime())) {
              const diff = Date.now() - dob.getTime();
              age = Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
            }
          }
          let lastVisit = "—";
          if (patient.createdAt) {
            const created = new Date(patient.createdAt);
            if (!Number.isNaN(created.getTime())) {
              lastVisit = created.toLocaleDateString();
            }
          }
          const patientBookings = bookingsByPatient[patient.id] ?? [];
          const activeBookings = patientBookings.filter((b) => activeStatuses.has(b.status));
          const endedBookings = patientBookings.filter((b) => endedStatuses.has(b.status));
          const bookingTimeValue = (b: (typeof patientBookings)[number]) => {
            const parsed = Date.parse(`${b.preferredDate} ${b.preferredTime}`);
            return Number.isNaN(parsed) ? 0 : parsed;
          };
          const nextActive = [...activeBookings].sort((a, b) => bookingTimeValue(a) - bookingTimeValue(b))[0];
          const lastEnded = [...endedBookings].sort((a, b) => bookingTimeValue(b) - bookingTimeValue(a))[0];
          return {
            id: patient.id,
            init: initials || "PT",
            color: "teal",
            name,
            age,
            gender: patient.gender || "—",
            condition: patient.primaryCondition || "General",
            lastVisit: lastEnded?.preferredDate || lastVisit,
            nextVisit: nextActive ? `${nextActive.preferredDate} · ${nextActive.preferredTime}${nextActive.endTime ? `–${nextActive.endTime}` : ""}` : "—",
            status: activeBookings.length ? "Active" : patientBookings.length ? "Ended" : "Inactive",
            risk: "Low",
            patientVitals: patient.patientVitals ?? null,
            patientHistory: patient.patientHistory ?? null,
            email: patient.email || "",
            phone: patient.phone || "",
          };
        });
        setPatients(mapped);
      } catch {
        setPatients([]);
      }
    })();
  }, []);

  function handleOpenProfile(patient: PatientRow) {
    setSelectedPatient(patient);
    setDrawerOpen(true);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return patients.filter((p) => {
      if (!p.name.toLowerCase().includes(q)) return false;
      if (activeFilter === "Active") return p.status === "Active";
      if (activeFilter === "High Risk") return p.risk === "High";
      if (activeFilter === "Recent") return p.lastVisit !== "—";
      return true;
    });
  }, [search, activeFilter, patients]);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}
      >
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)] flex items-center gap-2">
            <Icon name="users" className="w-5 h-5" />
            My Patients
          </h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">
            {patients.length} patients assigned to your care. {acceptedCount} accepted from booking requests.
          </p>
        </div>
      </div>

      {/* ── Table Card ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Patient List"
          subtitle={`${filtered.length} patients`}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="flex items-center gap-2 bg-[var(--color-surface-soft)] rounded-xl px-3 py-2 border border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)] text-sm">
                  <Icon name="search" className="w-4 h-4" />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patients..."
                  className="bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none w-36"
                />
              </div>
              <div className="relative sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text)]"
                >
                  <span className="text-sm leading-none">☰</span>
                  {activeFilter}
                </button>
                {mobileFilterOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-[11rem] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl">
                    {FILTERS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setActiveFilter(f);
                          setMobileFilterOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                          activeFilter === f
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)]"
                        )}
                      >
                        <span>{f}</span>
                        {activeFilter === f ? <span className="text-xs">•</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Filters */}
              <div className="hidden sm:flex gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150",
                      activeFilter === f
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]"
                        : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border)]"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        <div className="space-y-3 sm:hidden px-4 pb-4">
          {filtered.map((p, i) => (
            <div
              key={p.id ?? i}
              className={cn(
                "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4",
                p.status !== "Active" && "opacity-75"
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar initials={p.init} color={p.color} size="sm" rounded={false} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-[var(--color-text)]">{p.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {p.age ?? "—"}y / {p.gender}
                  </div>
                </div>
                <Badge variant={patientStatusVariant[p.status]}>{p.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[var(--color-text-muted)]">Condition</div>
                  <div className="mt-1 font-semibold text-[var(--color-text)]">{p.condition}</div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Risk</div>
                  <div className="mt-1"><Badge variant={riskVariant[p.risk]}>{p.risk}</Badge></div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Last Visit</div>
                  <div className="mt-1 font-semibold text-[var(--color-text)]">{p.lastVisit}</div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Next Appt</div>
                  <div className="mt-1 font-semibold text-[var(--color-primary)]">{p.nextVisit}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenProfile(p)}>
                  Profile
                </Button>
                {p.status === "Active" && (
                  <Button
                    size="sm"
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
                    onClick={() => router.push("/notes")}
                  >
                    Note
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Patient", "Age / Gender", "Primary Condition", "Last Visit", "Next Appt", "Risk", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-5 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((p, i) => (
                <tr
                  key={p.id ?? i}
                  className={cn(
                    "hover:bg-[var(--color-surface-soft)] transition-colors",
                    p.status === "Active" ? "" : "opacity-60"
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={p.init} color={p.color} size="xs" rounded={false} />
                      <span className="font-bold text-[var(--color-text)] whitespace-nowrap">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.age ?? "—"}y / {p.gender}</td>
                  <td className="px-5 py-3 text-[var(--color-text)]">{p.condition}</td>
                  <td className="px-5 py-3 text-xs text-[var(--color-text-muted)]">{p.lastVisit}</td>
                  <td className="px-5 py-3 text-xs font-bold text-[var(--color-primary)]">{p.nextVisit}</td>
                  <td className="px-5 py-3"><Badge variant={riskVariant[p.risk]}>{p.risk}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={patientStatusVariant[p.status]}>{p.status}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenProfile(p)}>
                        Profile
                      </Button>
                      {p.status === "Active" && (
                        <Button
                          size="sm"
                          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
                          onClick={() => router.push("/notes")}
                        >
                          Note
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedPatient?.name ?? "Patient Profile"}
        subtitle={selectedPatient?.email || "Patient details"}
      >
        {selectedPatient ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="flex items-center gap-3">
                <Avatar initials={selectedPatient.init} color={selectedPatient.color} size="sm" rounded={false} />
                <div className="min-w-0">
                  <div className="text-base font-semibold text-[var(--color-text)]">{selectedPatient.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {selectedPatient.age ?? "—"}y • {selectedPatient.gender}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--color-text-muted)]">
                <div>
                  <div className="uppercase tracking-wide">Email</div>
                  <div className="text-[var(--color-text)] font-medium truncate">{selectedPatient.email || "Not provided"}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide">Phone</div>
                  <div className="text-[var(--color-text)] font-medium">{selectedPatient.phone || "Not provided"}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Vitals</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)]">Weight</div>
                  <div className="font-semibold text-[var(--color-text)] mt-1">
                    {selectedPatient.patientVitals?.weight ? `${selectedPatient.patientVitals.weight} kg` : "Not provided"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)]">Height</div>
                  <div className="font-semibold text-[var(--color-text)] mt-1">
                    {selectedPatient.patientVitals?.height ? `${selectedPatient.patientVitals.height} cm` : "Not provided"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)]">Blood Pressure</div>
                  <div className="font-semibold text-[var(--color-text)] mt-1">
                    {selectedPatient.patientVitals?.bloodPressure || "Not provided"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)]">Pulse</div>
                  <div className="font-semibold text-[var(--color-text)] mt-1">
                    {selectedPatient.patientVitals?.pulseRate ? `${selectedPatient.patientVitals.pulseRate} bpm` : "Not provided"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Medical History</h4>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">Medical history</div>
                  <div className="text-[var(--color-text)]">
                    {selectedPatient.patientHistory?.medicalHistory || "Not provided"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">Surgical history</div>
                  <div className="text-[var(--color-text)]">
                    {selectedPatient.patientHistory?.surgicalHistory || "Not provided"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">Family history</div>
                  <div className="text-[var(--color-text)]">
                    {selectedPatient.patientHistory?.familyHistory || "Not provided"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">Social history</div>
                  <div className="text-[var(--color-text)]">
                    {selectedPatient.patientHistory?.socialHistory || "Not provided"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </RightDrawer>
    </div>
  );
}

