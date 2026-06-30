"use client";

import { createContext, useContext } from "react";
import type { PatientRow, ProviderPage } from "@/types";

export type ProviderChatIntent = {
  appointmentId: string;
  action?: "chat" | "call";
};

interface ProviderUiActions {
  navigateTo: (page: ProviderPage) => void;
  openChat: (appointmentId: string, action?: "chat" | "call") => void;
  openPatientChat: (patient: PatientRow, appointmentId: string, action?: "chat" | "call") => void;
  openPatientWorkspace: (patient: PatientRow, page?: ProviderPage) => void;
  closePatientWorkspace: () => void;
  patientWorkspace: PatientRow | null;
  notify: (message: string) => void;
  chatIntent: ProviderChatIntent | null;
  clearChatIntent: () => void;
}

const ProviderUiContext = createContext<ProviderUiActions | null>(null);

export function ProviderUiProvider({
  value,
  children,
}: {
  value: ProviderUiActions;
  children: React.ReactNode;
}) {
  return <ProviderUiContext.Provider value={value}>{children}</ProviderUiContext.Provider>;
}

export function useProviderUi() {
  const context = useContext(ProviderUiContext);
  return (
    context ?? {
      navigateTo: () => {},
      openChat: () => {},
      openPatientChat: () => {},
      openPatientWorkspace: () => {},
      closePatientWorkspace: () => {},
      patientWorkspace: null,
      notify: () => {},
      chatIntent: null,
      clearChatIntent: () => {},
    }
  );
}
