"use client";

import { createContext, useContext } from "react";
import type { ProviderPage } from "@/types";

export type ProviderChatIntent = {
  appointmentId: string;
  action?: "chat" | "call";
};

interface ProviderUiActions {
  navigateTo: (page: ProviderPage) => void;
  openChat: (appointmentId: string, action?: "chat" | "call") => void;
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
      notify: () => {},
      chatIntent: null,
      clearChatIntent: () => {},
    }
  );
}
