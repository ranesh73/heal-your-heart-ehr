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
  body?: unknown,
): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(form ? {} : { "Content-Type": "application/json" }),
      "X-CSRF-Token": csrf,
      "X-Facility-ID": branch,
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Please check the supplied values",
    );
  }
  return response.json();
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
export const dateTime = (value: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
export const day = (value: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const localInput = (value: string) =>
  new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16);
export const toISO = (value: string) =>
  value.length === 16 ? value + ":00+05:30" : value;
export const label = (value: string) =>
  value?.replaceAll("_", " ").replaceAll("-", " ") || "—";
export function navigate(path: string) {
  location.hash = path;
}
export const patientName = (id: string, patients: Row[]) =>
  patients.find((p) => p.id === id)?.name || "Patient";
