import type { ProviderSettings } from "@/types";
import { fetchApi } from "@/lib/api";

const defaultSettings: ProviderSettings = {
  profile: {
    firstName: "",
    lastName: "",
    email: "",
    specialty: "",
    phone: "",
  },
  notifications: {
    appointmentRequests: true,
    scheduleChanges: true,
    labResultAlerts: true,
    prescriptionRefills: true,
    billingAlerts: false,
    inAppSound: true,
    emailDigest: true,
    smsCritical: false,
  },
  security: {
    twoFactorAuth: false,
    loginAlerts: true,
    rememberDevice: true,
    sessionTimeoutMinutes: 30,
  },
  workflow: {
    autoConfirmFollowUps: false,
    showOnlyAssignedPatients: true,
    compactMode: false,
    defaultLanding: "overview",
  },
};

export async function getProviderSettings(): Promise<ProviderSettings> {
  const resp = await fetchApi("/providers/settings");
  return {
    ...defaultSettings,
    ...(resp ?? {}),
    profile: { ...defaultSettings.profile, ...(resp?.profile ?? {}) },
    notifications: { ...defaultSettings.notifications, ...(resp?.notifications ?? {}) },
    security: { ...defaultSettings.security, ...(resp?.security ?? {}) },
    workflow: { ...defaultSettings.workflow, ...(resp?.workflow ?? {}) },
  };
}

export async function saveProviderSettings(next: ProviderSettings): Promise<ProviderSettings> {
  const resp = await fetchApi("/providers/settings", {
    method: "PATCH",
    body: JSON.stringify(next),
  });
  return (resp.providerSettings ?? resp) as ProviderSettings;
}

export async function resetProviderSettings(): Promise<ProviderSettings> {
  const resp = await fetchApi("/providers/settings", {
    method: "PATCH",
    body: JSON.stringify(defaultSettings),
  });
  return (resp.providerSettings ?? resp) as ProviderSettings;
}
