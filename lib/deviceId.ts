const KEY = "jeunes_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const id = generateId();
  window.localStorage.setItem(KEY, id);
  return id;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const NAME_KEY = "jeunes_user_name";

export function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function setStoredName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name);
}
