export type Row = Record<string, any>;
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[] | null;
  min?: number | null;
  max?: number | null;
};
export let branch = "";
let csrf = "";
export function setSession(nextCsrf: string, nextBranch?: string) {
  csrf = nextCsrf;
  if (nextBranch !== undefined) branch = nextBranch;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: any,
): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const cleanPath = path.startsWith("/api")
    ? path
    : "/api" + (path.startsWith("/") ? path : "/" + path);
  const payload: BodyInit | null | undefined =
    body === undefined
      ? undefined
      : isForm
      ? body
      : JSON.stringify(body);

  try {
    const response = await fetch(cleanPath, {
      method,
      credentials: "same-origin",
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        "X-CSRF-Token": csrf,
        "X-Facility-ID": branch,
      },
      body: payload,
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Session expired. Please sign in again.");
      }
      if (response.status === 403) {
        throw new Error("Access restricted. You do not have permission for this clinical action.");
      }
      const data = await response
        .json()
        .catch(() => ({ detail: `Request failed with status ${response.status}` }));
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Please check the supplied values",
      );
    }
    return response.json();
  } catch (err: any) {
    if (err.name === "TypeError" && (err.message || "").toLowerCase().includes("fetch")) {
      throw new Error("Unable to connect to the EHR server. Please check your network and verify the backend is active.");
    }
    throw err;
  }
}
export async function download(path: string, filename: string) {
  const r = await fetch("/api" + path, {
    headers: { "X-Facility-ID": branch },
    credentials: "same-origin",
  });
  if (!r.ok) throw new Error("Unable to download this file");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);
export const dateTime = (value: string) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return String(value);
  }
};

export const day = (value: string) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(value);
  }
};
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const localInput = (value: string) =>
  new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16);
export const toISO = (value: string) => {
  if (!value) return value;
  if (value.includes("+") || value.endsWith("Z")) return value;
  if (value.length === 16) return value + ":00+05:30";
  if (value.length === 19) return value + "+05:30";
  return value + "+05:30";
};
export const label = (value: string) =>
  value?.replaceAll("_", " ").replaceAll("-", " ") || "—";
export function navigate(path: string) {
  location.hash = path;
}
export const patientName = (id: string, patients: Row[]) =>
  patients.find((p) => p.id === id)?.name || "Patient";
