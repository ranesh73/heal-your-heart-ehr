import { useState } from "react";
import { ArrowLeft, ChevronDown, Clock3 } from "lucide-react";
import { Row, localInput, today } from "./api";
import { formatDoctorName } from "./clinicalWorkflows";

const FACILITY_OPTIONS = [
  {
    code: "HUH001",
    label: "Heal Your Heart Neelankarai - HUH001",
    aliases: ["hyn", "huh001", "neelankarai"],
  },
  {
    code: "HUH002",
    label: "Heal Your Heart Royapettah - HUH002",
    aliases: ["hyr", "huh002", "royapettah"],
  },
  {
    code: "4R",
    label: "4R Health & Wellness",
    aliases: ["4r", "wellness"],
  },
  {
    code: "HUH003",
    label: "Heal Your Heart - Manapakkam - HUH003",
    aliases: ["hym", "huh003", "manapakkam"],
  },
  {
    code: "005",
    label: "Heal Your Heart-Madurai - 005",
    aliases: ["005", "madurai"],
  },
  {
    code: "004",
    label: "Heal Your Heart-Tirunelveli - 004",
    aliases: ["004", "tirunelveli"],
  },
] as const;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_PREFERENCES = ["Any Time", "Morning", "Afternoon", "Evening"];

type AvailabilitySlot = {
  label: string;
  startAt: string;
};

type AvailabilityDateResult = {
  date: string;
  day: string;
  slots: AvailabilitySlot[];
};

export type ProviderAvailabilityResult = {
  providerId: string;
  providerName: string;
  facilityName: string;
  duration: number;
  rows: AvailabilityDateResult[];
};

type SearchMode = "Next Available Slots" | "Specific Date" | "Date Range";
type DateRangePreset = "This Week" | "This Month" | "Next Month" | "Custom";

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: string, count: number) {
  const result = parseDate(date);
  result.setDate(result.getDate() + count);
  return dateString(result);
}

function dateWeekday(date: string) {
  return (parseDate(date).getDay() + 6) % 7;
}

function formatTime(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${String(hour12).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

function clockMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function isTimePreferenceMatch(minutes: number, preference: string) {
  if (preference === "Morning") return minutes < 12 * 60;
  if (preference === "Afternoon") return minutes >= 12 * 60 && minutes < 17 * 60;
  if (preference === "Evening") return minutes >= 17 * 60;
  return true;
}

function getDateRange(
  preset: DateRangePreset,
  customStart: string,
  customEnd: string,
): [string, string] {
  const current = parseDate(today());
  if (preset === "This Week") {
    const start = parseDate(today());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return [dateString(start), addDays(dateString(start), 6)];
  }
  if (preset === "This Month") {
    const start = new Date(current.getFullYear(), current.getMonth(), 1, 12);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 12);
    return [dateString(start), dateString(end)];
  }
  if (preset === "Next Month") {
    const start = new Date(current.getFullYear(), current.getMonth() + 1, 1, 12);
    const end = new Date(current.getFullYear(), current.getMonth() + 2, 0, 12);
    return [dateString(start), dateString(end)];
  }
  return [customStart, customEnd];
}

function selectedFacilityRecord(facilityCode: string, facilities: Row[]) {
  const option = FACILITY_OPTIONS.find((item) => item.code === facilityCode);
  if (!option) return undefined;
  return facilities.find((facility) => {
    const code = String(facility.code || "").toLowerCase();
    const name = String(facility.name || "").toLowerCase();
    return option.aliases.some((alias) => code === alias || name.includes(alias));
  });
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function ProviderAvailabilityPanel({
  providers,
  facilities,
  visitTypes,
  schedules,
  appointments,
  onClose,
  onSearch,
}: {
  providers: Row[];
  facilities: Row[];
  visitTypes: Row[];
  schedules: Row[];
  appointments: Row[];
  onClose: () => void;
  onSearch: (result: ProviderAvailabilityResult) => void;
}) {
  const [facilityCode, setFacilityCode] = useState<string>(FACILITY_OPTIONS[0].code);
  const [providerId, setProviderId] = useState("");
  const [visitTypeId, setVisitTypeId] = useState("");
  const [duration, setDuration] = useState(10);
  const [searchMode, setSearchMode] = useState<SearchMode>("Next Available Slots");
  const [specificDate, setSpecificDate] = useState(today());
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("This Month");
  const [customStart, setCustomStart] = useState(today());
  const [customEnd, setCustomEnd] = useState(today());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timePreference, setTimePreference] = useState("Any Time");
  const [error, setError] = useState("");

  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const selectedFacility = FACILITY_OPTIONS.find((item) => item.code === facilityCode) || FACILITY_OPTIONS[0];
  const facilityRecord = selectedFacilityRecord(facilityCode, facilities);

  const getIntervalsForDate = (date: string) => {
    const weekday = dateWeekday(date);
    const providerSchedule = schedules.filter(
      (row) =>
        row.user_id === providerId &&
        facilityRecord &&
        row.facility_id === facilityRecord.id &&
        row.weekday === weekday,
    );
    const isRamasamy = String(selectedProvider?.name || "").toLowerCase().includes("ramasamy");

    if (isRamasamy && (facilityCode === "HUH001" || facilityCode === "HUH002")) {
      const validDays = facilityCode === "HUH001" ? [0, 2, 3, 5] : [1, 4];
      if (!validDays.includes(weekday)) return [];
      return providerSchedule.length
        ? providerSchedule.map((row) => ({ start: row.start_minute, end: row.end_minute }))
        : [{ start: 9 * 60 + 30, end: 17 * 60 }];
    }

    return providerSchedule.map((row) => ({ start: row.start_minute, end: row.end_minute }));
  };

  const findSlotsForDate = (date: string) => {
    const weekday = dateWeekday(date);
    if (selectedDays.length > 0 && !selectedDays.includes(weekday)) return [];
    if (date < today()) return [];

    const intervals = getIntervalsForDate(date);
    if (intervals.length === 0) return [];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const durationMinutes = Math.max(1, Number(duration));
    const activeAppointments = facilityRecord ? appointments.filter((appointment) => {
      if (appointment.provider_id !== providerId || appointment.status === "cancelled") return false;
      if (appointment.facility_id !== facilityRecord.id) return false;
      return localInput(appointment.start_at).slice(0, 10) === date;
    }) : [];

    const slots: AvailabilitySlot[] = [];
    for (const interval of intervals) {
      for (let start = interval.start; start + durationMinutes <= interval.end; start += Math.max(10, durationMinutes)) {
        if (date === today() && start <= currentMinutes) continue;
        if (!isTimePreferenceMatch(start, timePreference)) continue;

        const conflict = activeAppointments.some((appointment) => {
          const appointmentStart = clockMinutes(localInput(appointment.start_at).slice(11, 16));
          if (appointmentStart === undefined) return false;
          const appointmentEnd = clockMinutes(appointment.end_at ? localInput(appointment.end_at).slice(11, 16) : "")
            ?? appointmentStart + Number(appointment.duration_minutes || durationMinutes);
          return start < appointmentEnd && start + durationMinutes > appointmentStart;
        });
        if (conflict) continue;

        slots.push({
          label: formatTime(start),
          startAt: `${date}T${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
        });
      }
    }
    return slots;
  };

  const handleCheckAvailability = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!providerId || !selectedProvider) {
      setError("Please select a provider.");
      return;
    }
    if (!Number.isFinite(Number(duration)) || Number(duration) <= 0) {
      setError("Enter a valid duration in minutes.");
      return;
    }

    const currentDate = today();
    let startDate = currentDate;
    let endDate = currentDate;
    if (searchMode === "Specific Date") {
      startDate = specificDate;
      endDate = specificDate;
    } else if (searchMode === "Date Range") {
      [startDate, endDate] = getDateRange(rangePreset, customStart, customEnd);
      if (!startDate || !endDate || endDate < startDate) {
        setError("Choose a valid date range.");
        return;
      }
    } else {
      endDate = addDays(currentDate, 365);
    }

    if (searchMode !== "Specific Date" && startDate < currentDate) {
      startDate = currentDate;
    }

    const rows: AvailabilityDateResult[] = [];
    for (let date = startDate, daysChecked = 0; date <= endDate && daysChecked < 366; date = addDays(date, 1), daysChecked += 1) {
      const slots = findSlotsForDate(date);
      if (slots.length === 0) continue;
      rows.push({
        date,
        day: WEEKDAYS[dateWeekday(date)],
        slots: searchMode === "Next Available Slots" ? slots.slice(0, 5) : slots,
      });
      if (searchMode === "Next Available Slots") break;
    }

    onSearch({
      providerId,
      providerName: selectedProvider.role === "doctor"
        ? formatDoctorName(selectedProvider.name)
        : selectedProvider.name,
      facilityName: selectedFacility.label,
      duration: Number(duration),
      rows,
    });
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((current) =>
      current.includes(dayIndex)
        ? current.filter((day) => day !== dayIndex)
        : [...current, dayIndex].sort((a, b) => a - b),
    );
  };

  return (
    <aside className="charm-cal-drawer open charm-provider-availability-drawer">
      <div className="charm-drawer-head">
        <span>Provider Availability</span>
        <button
          type="button"
          className="charm-provider-availability-close"
          onClick={onClose}
          aria-label="Close Provider Availability"
          title="Close Provider Availability"
        >
          <ArrowLeft size={13} />
          <Clock3 size={17} />
        </button>
      </div>

      <form className="charm-provider-availability-form" onSubmit={handleCheckAvailability}>
        <label className="charm-availability-field">
          <span>Facility <strong>*</strong></span>
          <select value={facilityCode} onChange={(event) => setFacilityCode(event.target.value)} required>
            {FACILITY_OPTIONS.map((facility) => (
              <option key={facility.code} value={facility.code}>{facility.label}</option>
            ))}
          </select>
        </label>

        <label className="charm-availability-field">
          <span>Provider <strong>*</strong></span>
          <select value={providerId} onChange={(event) => setProviderId(event.target.value)} required>
            <option value="">--Select--</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.role === "doctor" ? formatDoctorName(provider.name) : provider.name}
              </option>
            ))}
          </select>
        </label>

        <label className="charm-availability-field">
          <span>Visit Type</span>
          <select value={visitTypeId} onChange={(event) => setVisitTypeId(event.target.value)}>
            <option value="">--Select--</option>
            {visitTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </label>

        <label className="charm-availability-field">
          <span>Duration <strong>*</strong></span>
          <span className="charm-availability-duration">
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
            />
            <span>minutes</span>
          </span>
        </label>

        <fieldset className="charm-availability-search-mode">
          <legend>Search for</legend>
          <label>
            <input
              type="radio"
              name="provider-availability-mode"
              checked={searchMode === "Next Available Slots"}
              onChange={() => setSearchMode("Next Available Slots")}
            />
            Next Available Slots
          </label>
          <label className="charm-availability-date-option">
            <input
              type="radio"
              name="provider-availability-mode"
              checked={searchMode === "Specific Date"}
              onChange={() => setSearchMode("Specific Date")}
            />
            Specific Date
            {searchMode === "Specific Date" && (
              <input
                type="date"
                value={specificDate}
                onChange={(event) => setSpecificDate(event.target.value)}
                aria-label="Specific date"
              />
            )}
          </label>
          <label className="charm-availability-date-option">
            <input
              type="radio"
              name="provider-availability-mode"
              checked={searchMode === "Date Range"}
              onChange={() => setSearchMode("Date Range")}
            />
            Date Range
            {searchMode === "Date Range" && (
              <select
                value={rangePreset}
                onChange={(event) => setRangePreset(event.target.value as DateRangePreset)}
                aria-label="Date range preset"
              >
                {(["This Week", "This Month", "Next Month", "Custom"] as const).map((preset) => (
                  <option key={preset} value={preset}>{preset}</option>
                ))}
              </select>
            )}
          </label>
          {searchMode === "Date Range" && rangePreset === "Custom" && (
            <div className="charm-availability-custom-range">
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                aria-label="Custom range start date"
              />
              <span>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                aria-label="Custom range end date"
              />
            </div>
          )}
        </fieldset>

        <button
          type="button"
          className="charm-availability-filter-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Additional Filters
          <ChevronDown size={13} className={filtersOpen ? "expanded" : ""} />
        </button>

        {filtersOpen && (
          <div className="charm-availability-filters">
            <div className="charm-availability-filter-field">
              <span>Days Preference</span>
              <div className="charm-availability-day-select">
                <button
                  type="button"
                  className="charm-availability-select-trigger"
                  aria-expanded={dayMenuOpen}
                  onClick={() => setDayMenuOpen((open) => !open)}
                >
                  {selectedDays.length ? selectedDays.map((day) => WEEKDAYS[day]).join(", ") : "Select Day"}
                </button>
                {dayMenuOpen && (
                  <div className="charm-availability-day-menu">
                    {WEEKDAYS.map((day, index) => (
                      <label key={day}>
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(index)}
                          onChange={() => toggleDay(index)}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <label className="charm-availability-filter-field">
              <span>Time Preference</span>
              <select value={timePreference} onChange={(event) => setTimePreference(event.target.value)}>
                {TIME_PREFERENCES.map((preference) => (
                  <option key={preference} value={preference}>{preference}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {error && <div className="charm-availability-error" role="alert">{error}</div>}
        <button type="submit" className="charm-availability-check-btn">
          Check Availability
        </button>
      </form>
    </aside>
  );
}

export function ProviderAvailabilityResults({
  result,
  onClose,
}: {
  result: ProviderAvailabilityResult;
  onClose: () => void;
}) {
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const toggleExpanded = (date: string) => {
    setExpandedDates((current) =>
      current.includes(date) ? current.filter((item) => item !== date) : [...current, date],
    );
  };

  return (
    <div className="charm-provider-availability-results">
      <div className="charm-provider-availability-results-header">
        <h3>Available Slots for {result.providerName}</h3>
        <button type="button" onClick={onClose} aria-label="Close availability results">×</button>
      </div>
      <div className="charm-provider-availability-results-subtitle">
        {result.facilityName} · {result.duration} minutes
      </div>
      <table className="charm-provider-availability-results-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Date</th>
            <th>
              Available Slots
              <span>Slots are shown in Asia/Kolkata time zone</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => {
            const expanded = expandedDates.includes(row.date);
            const visibleSlots = expanded ? row.slots : row.slots.slice(0, 18);
            return (
              <tr key={row.date}>
                <td>{row.day}</td>
                <td>{formatDate(row.date)}</td>
                <td>
                  <div className="charm-provider-availability-slots">
                    {visibleSlots.map((slot) => (
                      <span key={slot.startAt}>{slot.label}</span>
                    ))}
                    {row.slots.length > 18 && (
                      <button type="button" onClick={() => toggleExpanded(row.date)}>
                        {expanded ? "Less" : "More"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {result.rows.length === 0 && (
            <tr>
              <td colSpan={3} className="charm-provider-availability-empty">No Slots Available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
