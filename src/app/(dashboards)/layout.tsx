import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Provider Portal | Proxima Health",
  description: "Manage your patients, schedule, lab orders, and clinical notes.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {children}
    </div>
  );
}
