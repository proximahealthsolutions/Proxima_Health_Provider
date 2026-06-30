const providerNotificationReadKey = "proxima.provider.readNotifications";

function readIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(providerNotificationReadKey);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(ids.filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

function writeIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(providerNotificationReadKey, JSON.stringify([...ids]));
  window.dispatchEvent(new Event("provider-notifications-read"));
}

export function getReadProviderNotificationIds() {
  return readIds();
}

export function markProviderNotificationRead(id: string) {
  const ids = readIds();
  ids.add(id);
  writeIds(ids);
}

export function markProviderNotificationsRead(idsToMark: string[]) {
  const ids = readIds();
  idsToMark.forEach((id) => ids.add(id));
  writeIds(ids);
}

