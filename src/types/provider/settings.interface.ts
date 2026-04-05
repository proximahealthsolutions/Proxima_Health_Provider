export interface ProviderProfileSettings {
  firstName: string;
  lastName: string;
  email: string;
  specialty: string;
  phone: string;
}

export interface ProviderNotificationSettings {
  appointmentRequests: boolean;
  scheduleChanges: boolean;
  labResultAlerts: boolean;
  prescriptionRefills: boolean;
  billingAlerts: boolean;
  inAppSound: boolean;
  emailDigest: boolean;
  smsCritical: boolean;
}

export interface ProviderSecuritySettings {
  twoFactorAuth: boolean;
  loginAlerts: boolean;
  rememberDevice: boolean;
  sessionTimeoutMinutes: 15 | 30 | 60;
}

export interface ProviderWorkflowSettings {
  autoConfirmFollowUps: boolean;
  showOnlyAssignedPatients: boolean;
  compactMode: boolean;
  defaultLanding: "overview" | "patients" | "schedule";
}

export interface ProviderSettings {
  profile: ProviderProfileSettings;
  notifications: ProviderNotificationSettings;
  security: ProviderSecuritySettings;
  workflow: ProviderWorkflowSettings;
}
