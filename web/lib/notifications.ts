"use client";

export type AppNotification = {
  id: string;
  title: string;
  detail: string;
  level: "info" | "warning" | "success" | "danger";
  at: string;
};

const STORAGE_KEY = "crm_notifications";
const UPDATE_EVENT = "crm-notifications-updated";
const MAX_ITEMS = 100;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emitUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function readNotifications(): AppNotification[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.id === "string");
  } catch {
    return [];
  }
}

export function writeNotifications(items: AppNotification[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  emitUpdate();
}

export function pushNotification(item: Omit<AppNotification, "id" | "at"> & Partial<Pick<AppNotification, "id" | "at">>) {
  const current = readNotifications();
  const next: AppNotification = {
    id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: item.at ?? new Date().toISOString(),
    title: item.title,
    detail: item.detail,
    level: item.level,
  };
  writeNotifications([next, ...current]);
}

export function removeNotification(id: string) {
  const current = readNotifications();
  writeNotifications(current.filter((item) => item.id !== id));
}

export function clearNotifications() {
  writeNotifications([]);
}

export function subscribeNotifications(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(UPDATE_EVENT, listener);
  return () => window.removeEventListener(UPDATE_EVENT, listener);
}
