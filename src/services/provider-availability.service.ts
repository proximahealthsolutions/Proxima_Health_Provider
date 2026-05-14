import { fetchApi } from "@/lib/api";

export type AvailabilityRule = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  timezone?: string | null;
};

export type WeeklyAvailabilitySlot = {
  id?: string;
  startTime: string;
  endTime: string;
};

export type WeeklyAvailabilityDay = {
  weekday: number;
  enabled: boolean;
  slots: WeeklyAvailabilitySlot[];
};

export type AvailabilityOverride = {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

export type WeeklyAvailabilityResponse = {
  timezone: string;
  days: WeeklyAvailabilityDay[];
};

export async function getWeeklyAvailability(): Promise<WeeklyAvailabilityResponse> {
  const resp = await fetchApi("/providers/schedule/weekly");
  return resp && typeof resp === "object" && "days" in resp ? resp : { timezone: "UTC", days: [] };
}

export async function saveWeeklyAvailability(payload: {
  timezone: string;
  days: Array<{
    weekday: number;
    enabled: boolean;
    slots: Array<{ startTime: string; endTime: string }>;
  }>;
}): Promise<WeeklyAvailabilityResponse> {
  const resp = await fetchApi("/providers/schedule/weekly", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resp && typeof resp === "object" && "days" in resp ? resp : { timezone: "UTC", days: [] };
}

export async function getAvailabilityRules(): Promise<AvailabilityRule[]> {
  const resp = await fetchApi("/providers/schedule/rules");
  return Array.isArray(resp) ? resp : [];
}

export async function createAvailabilityRule(payload: {
  weekday: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  timezone?: string;
}): Promise<AvailabilityRule> {
  return fetchApi("/providers/schedule/rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAvailabilityOverrides(): Promise<AvailabilityOverride[]> {
  const resp = await fetchApi("/providers/schedule/overrides");
  return Array.isArray(resp) ? resp : [];
}

export async function createAvailabilityOverride(payload: {
  date: string;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  note?: string;
}): Promise<AvailabilityOverride> {
  return fetchApi("/providers/schedule/overrides", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
