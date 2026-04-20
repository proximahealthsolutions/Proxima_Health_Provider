"use client";

import { lazy, Suspense } from "react";
import { ProviderPage, ProviderPageContentProps } from "@/types";

const Overview  = lazy(() => import("@/app/(dashboards)/overview/page"));
const Patients  = lazy(() => import("@/app/(dashboards)/patients/page"));
const Notifications = lazy(() => import("@/app/(dashboards)/notifications/page"));
const Schedule = lazy(() => import("@/app/(dashboards)/schedule/page"));
const Notes = lazy(() => import("@/app/(dashboards)/notes/page"));
const Prescriptions = lazy(() => import("@/app/(dashboards)/prescriptions/page"));
const LabOrders = lazy(() => import("@/app/(dashboards)/laborders/page"));
const Messages = lazy(() => import("@/app/(dashboards)/messages/page"));
const Settings = lazy(() => import("@/app/(dashboards)/settings/page"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ProviderPageContent({ activePage }: ProviderPageContentProps) {
  const renderPage = () => {
    switch (activePage) {
      case "overview":  return <Overview />;
      case "patients":  return <Patients />;
      case "notifications": return <Notifications />;
      case "schedule": return <Schedule />;
      case "notes": return <Notes />;
      case "prescriptions": return <Prescriptions />;
      case "laborders": return <LabOrders />;
      case "messages": return <Messages />;
      case "settings": return <Settings />;
      default: return <Overview />;
    }
  };

  return (
    <Suspense fallback={<PageLoader />}>
      {renderPage()}
    </Suspense>
  );
}
