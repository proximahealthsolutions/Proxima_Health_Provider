"use client";

import { lazy, Suspense } from "react";
import { ProviderPage, ProviderPageContentProps } from "@/types";

const Overview  = lazy(() => import("@/app/(dashboards)/overview/page"));
const Patients  = lazy(() => import("@/app/(dashboards)/patients/page"));
const Notifications = lazy(() => import("@/app/(dashboards)/notifications/page"));
const Bookings = lazy(() => import("@/app/(dashboards)/bookings/page"));
const Schedule = lazy(() => import("@/app/(dashboards)/schedule/page"));
const Notes = lazy(() => import("@/app/(dashboards)/notes/page"));
const Prescriptions = lazy(() => import("@/app/(dashboards)/prescriptions/page"));
const LabOrders = lazy(() => import("@/app/(dashboards)/laborders/page"));
const Messages = lazy(() => import("@/app/(dashboards)/messages/page"));
const Settings = lazy(() => import("@/app/(dashboards)/settings/page"));
const PatientWorkspaceOverview = lazy(() => import("@/components/provider/PatientWorkspaceOverview"));
const PatientWorkspaceVitals = lazy(() => import("@/components/provider/PatientWorkspaceVitals"));
const PatientWorkspaceHistory = lazy(() => import("@/components/provider/PatientWorkspaceHistory"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ProviderPageContent({ activePage, patientWorkspace }: ProviderPageContentProps) {
  const renderPage = () => {
    switch (activePage) {
      case "overview":  return <Overview />;
      case "patients":  return <Patients />;
      case "notifications": return <Notifications />;
      case "bookings": return <Bookings />;
      case "schedule": return <Schedule />;
      case "notes": return <Notes />;
      case "prescriptions": return <Prescriptions />;
      case "laborders": return <LabOrders />;
      case "messages": return <Messages />;
      case "settings": return <Settings />;
      case "patient-overview": return <PatientWorkspaceOverview patient={patientWorkspace} />;
      case "patient-messages": return <Messages />;
      case "patient-notes": return <Notes />;
      case "patient-prescriptions": return <Prescriptions />;
      case "patient-laborders": return <LabOrders />;
      case "patient-vitals": return <PatientWorkspaceVitals patient={patientWorkspace} />;
      case "patient-medical-history": return <PatientWorkspaceHistory patient={patientWorkspace} type="medical" />;
      case "patient-general-history": return <PatientWorkspaceHistory patient={patientWorkspace} type="general" />;
      default: return <Overview />;
    }
  };

  return (
    <Suspense fallback={<PageLoader />}>
      {renderPage()}
    </Suspense>
  );
}
