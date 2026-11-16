export const WAITING_LIST_STORAGE_KEY = "hyh_waiting_list_entries";
export const WAITING_LIST_UPDATED_EVENT = "hyh_waiting_list_entries_updated";

export type WaitingListEntry = Record<string, any>;

export function readWaitingListEntries(): WaitingListEntry[] {
  try {
    const saved = localStorage.getItem(WAITING_LIST_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed as WaitingListEntry[];
    console.error("Waiting list data in local storage is not an array.");
  } catch (error) {
    console.error("Unable to read waiting list data from local storage.", error);
  }
  return [];
}

export function saveWaitingListEntries(entries: WaitingListEntry[]) {
  localStorage.setItem(WAITING_LIST_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(
    new CustomEvent<WaitingListEntry[]>(WAITING_LIST_UPDATED_EVENT, {
      detail: entries,
    }),
  );
}

export function addWaitingListEntry(entry: WaitingListEntry) {
  const entries = readWaitingListEntries();
  const next = [entry, ...entries.filter((current) => current.id !== entry.id)];
  saveWaitingListEntries(next);
  return next;
}
