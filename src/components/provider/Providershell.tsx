"use client";

import { useEffect, useMemo, useState } from "react";
import ProviderSidebar  from "@/components/provider/Sidebar";
import ProviderTopbar   from "@/components/provider/Topbar";
import ProviderPageContent from "@/components/provider/Pagecontent";
import { fetchApi } from "@/lib/api";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { logoutProviderSession } from "@/lib/session";
import { ProviderPage, ProviderProfileSummary } from "@/types";
import {
  ProviderChatIntent,
  ProviderUiProvider,
} from "@/components/provider/ProviderUiContext";
import { ProviderCallProvider } from "@/components/provider/ProviderCallProvider";

export default function ProviderShell() {
  const [activePage,  setActivePage]  = useState<ProviderPage>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ProviderProfileSummary | null>(null);
  const [toast, setToast] = useState("");
  const [chatIntent, setChatIntent] = useState<ProviderChatIntent | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchApi("/providers/me")
      .then((data) => {
        if (!mounted) return;
        setProfile(data || null);
      })
      .catch(() => {
        if (!mounted) return;
        setProfile(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const actions = useMemo(
    () => ({
      navigateTo: (page: ProviderPage) => setActivePage(page),
      openChat: (appointmentId: string, action?: "chat" | "call") => {
        setChatIntent({ appointmentId, action });
        setActivePage("messages");
      },
      notify: (message: string) => {
        setToast(message);
        setTimeout(() => setToast(""), 3000);
      },
      chatIntent,
      clearChatIntent: () => setChatIntent(null),
    }),
    [chatIntent]
  );

  useInactivityLogout(() => logoutProviderSession());

  return (
    <ProviderUiProvider value={actions}>
      <ProviderCallProvider>
      <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[var(--color-bg)]">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <ProviderSidebar
        activePage={activePage}
        onNavigate={actions.navigateTo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        profile={profile}
      />

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden">
        <ProviderTopbar
          activePage={activePage}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onOpenNotifications={() => setActivePage("notifications")}
          profile={profile}
        />
        <main
          data-mobile-scroll="true"
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          <div className="px-3 py-3 sm:px-5 sm:py-5 lg:p-6 [padding-bottom:calc(env(safe-area-inset-bottom)+1rem)]">
            <ProviderPageContent activePage={activePage} />
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed left-4 right-4 bottom-4 sm:left-auto sm:right-5 sm:bottom-5 z-[60] max-w-sm rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] px-4 py-3 text-sm shadow-xl border border-[var(--color-primary-hover)] [bottom:calc(env(safe-area-inset-bottom)+1rem)]">
          {toast}
        </div>
      )}
      </div>
      </ProviderCallProvider>
    </ProviderUiProvider>
  );
}
