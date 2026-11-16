export const WAITING_LIST_STORAGE_KEY = "hyh_waiting_list_entries";
export const WAITING_LIST_UPDATED_EVENT = "hyh_waiting_list_entries_updated";

export type WaitingListEntry = Record<string, any>;

export function readWaitingListEntries(): WaitingListEntry[] {
  try {
    const saved = localStorage.getItem(WAITING_LIST_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed as WaitingListEntry[];
  } catch (error) {
    console.error("Unable to read waiting list data from local storage.", error);
  }
  return [];
}

export async function fetchWaitingListEntries(): Promise<WaitingListEntry[]> {
  try {
    const res = await fetch("/api/waiting-list", {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(WAITING_LIST_STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(
          new CustomEvent<WaitingListEntry[]>(WAITING_LIST_UPDATED_EVENT, {
            detail: data,
          }),
        );
        return data;
      }
    }
  } catch (error) {
    console.warn("Unable to fetch waiting list from server, using local fallback.", error);
  }
  return readWaitingListEntries();
}

export function saveWaitingListEntries(entries: WaitingListEntry[]) {
  localStorage.setItem(WAITING_LIST_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(
    new CustomEvent<WaitingListEntry[]>(WAITING_LIST_UPDATED_EVENT, {
      detail: entries,
    }),
  );
}

export async function addWaitingListEntry(entry: WaitingListEntry) {
  try {
    await fetch("/api/waiting-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.warn("Failed to persist waiting list entry to server", error);
  }
  const entries = readWaitingListEntries();
  const next = [entry, ...entries.filter((current) => current.id !== entry.id)];
  saveWaitingListEntries(next);
  return next;
}

export async function deleteWaitingListEntry(id: string) {
  try {
    await fetch(`/api/waiting-list/${id}`, { method: "DELETE" });
  } catch (error) {
    console.warn("Failed to delete waiting list entry from server", error);
  }
  const entries = readWaitingListEntries();
  const next = entries.filter((current) => current.id !== id);
  saveWaitingListEntries(next);
  return next;
}
