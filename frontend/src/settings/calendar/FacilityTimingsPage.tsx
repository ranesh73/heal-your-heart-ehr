import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useApp } from "../../context";

interface DaySchedule {
  day_of_week: string;
  is_working_day: boolean;
  startTime: string;
  startAmPm: "am" | "pm";
  endTime: string;
  endAmPm: "am" | "pm";
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIME_SELECT_OPTIONS = [
  "12:00", "12:15", "12:30", "12:45",
  "01:00", "01:15", "01:30", "01:45",
  "02:00", "02:15", "02:30", "02:45",
  "03:00", "03:15", "03:30", "03:45",
  "04:00", "04:15", "04:30", "04:45",
  "05:00", "05:15", "05:30", "05:45",
  "06:00", "06:15", "06:30", "06:45",
  "07:00", "07:15", "07:30", "07:45",
  "08:00", "08:15", "08:30", "08:45",
  "09:00", "09:15", "09:30", "09:45",
  "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45",
];

const TIMEZONE_OPTIONS = [
  "( GMT 5:30 ) India Standard Time ( Asia/Kolkata )",
  "( GMT -10:00 ) Hawaii-Aleutian Standard Time ( Pacific/Honolulu )",
  "( GMT -8:00 ) Pacific Standard Time ( America/Los_Angeles )",
  "( GMT -7:00 ) Mountain Standard Time ( America/Denver )",
  "( GMT -6:00 ) Central Standard Time ( America/Chicago )",
  "( GMT -5:00 ) Eastern Standard Time ( America/New_York )",
  "( GMT -4:00 ) Atlantic Standard Time ( America/Halifax )",
  "( GMT -3:00 ) Brasilia Standard Time ( America/Sao_Paulo )",
  "( GMT +0:00 ) Greenwich Mean Time ( Europe/London )",
  "( GMT +1:00 ) Central European Time ( Europe/Paris )",
  "( GMT +1:00 ) West Africa Time ( Africa/Lagos )",
  "( GMT +2:00 ) Eastern European Time ( Europe/Athens )",
  "( GMT +2:00 ) South Africa Standard Time ( Africa/Johannesburg )",
  "( GMT +3:00 ) Moscow Standard Time ( Europe/Moscow )",
  "( GMT +3:00 ) Arabia Standard Time ( Asia/Riyadh )",
  "( GMT +3:30 ) Iran Standard Time ( Asia/Tehran )",
  "( GMT +4:00 ) Gulf Standard Time ( Asia/Dubai )",
  "( GMT +5:00 ) Pakistan Standard Time ( Asia/Karachi )",
  "( GMT +6:00 ) Bangladesh Standard Time ( Asia/Dhaka )",
  "( GMT +7:00 ) Indochina Time ( Asia/Bangkok )",
  "( GMT +8:00 ) Singapore Standard Time ( Asia/Singapore )",
  "( GMT +8:00 ) China Standard Time ( Asia/Shanghai )",
  "( GMT +9:00 ) Japan Standard Time ( Asia/Tokyo )",
  "( GMT +9:30 ) Australian Central Standard Time ( Australia/Darwin )",
  "( GMT +10:00 ) Australian Eastern Standard Time ( Australia/Sydney )",
  "( GMT +12:00 ) New Zealand Standard Time ( Pacific/Auckland )",
];

function parseTimeString(t: string): { time: string; ampm: "am" | "pm" } {
  const parts = (t || "12:00 am").trim().split(" ");
  let time = parts[0] || "12:00";
  if (time.indexOf(":") === 1) {
    time = "0" + time;
  }
  const ampm = (parts[1]?.toLowerCase() === "pm" ? "pm" : "am") as "am" | "pm";
  return { time, ampm };
}

function timeToMinutes(time: string, ampm: "am" | "pm"): number {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return h * 60 + m;
}

export function FacilityTimingsPage() {
  const { facilities: appFacilities, notify } = useApp();
  const [facilityList, setFacilityList] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [timezone, setTimezone] = useState<string>(
    "( GMT 5:30 ) India Standard Time ( Asia/Kolkata )"
  );
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingTz, setSavingTz] = useState<boolean>(false);
  const [savingHours, setSavingHours] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Load facilities list
  useEffect(() => {
    async function initFacilities() {
      if (appFacilities && appFacilities.length > 0) {
        setFacilityList(appFacilities);
        setSelectedFacilityId(appFacilities[0].id);
      } else {
        try {
          const res = await api<any[]>("/facilities");
          if (res && res.length > 0) {
            setFacilityList(res);
            setSelectedFacilityId(res[0].id);
          }
        } catch (e) {
          console.error("Failed to load facilities:", e);
        }
      }
    }
    initFacilities();
  }, [appFacilities]);

  // Load timings for selected facility
  const loadFacilityTimings = useCallback(async (facId: string) => {
    if (!facId) return;
    setLoading(true);
    setFeedback(null);
    try {
      const data = await api<any>(`/facilities/${facId}/timings`);
      if (data) {
        setTimezone(data.timezone || "( GMT 5:30 ) India Standard Time ( Asia/Kolkata )");
        const list: DaySchedule[] = [];
        const timingsMap: Record<string, any> = {};
        if (Array.isArray(data.timings)) {
          data.timings.forEach((item: any) => {
            timingsMap[item.day_of_week] = item;
          });
        }
        DAYS_OF_WEEK.forEach((day) => {
          const item = timingsMap[day];
          if (item) {
            const start = parseTimeString(item.start_time || "12:00 am");
            const end = parseTimeString(item.end_time || "11:45 pm");
            list.push({
              day_of_week: day,
              is_working_day: item.is_working_day !== false,
              startTime: start.time,
              startAmPm: start.ampm,
              endTime: end.time,
              endAmPm: end.ampm,
            });
          } else {
            list.push({
              day_of_week: day,
              is_working_day: day !== "Sunday",
              startTime: "12:00",
              startAmPm: "am",
              endTime: "11:45",
              endAmPm: "pm",
            });
          }
        });
        setSchedules(list);
      }
    } catch (err: any) {
      console.error("Error loading facility timings:", err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to load facility timings",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFacilityId) {
      loadFacilityTimings(selectedFacilityId);
    }
  }, [selectedFacilityId, loadFacilityTimings]);

  const handleFacilityChange = (facId: string) => {
    setSelectedFacilityId(facId);
  };

  const handleScheduleChange = (
    index: number,
    field: keyof DaySchedule,
    value: any
  ) => {
    setSchedules((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleHolidayToggle = (index: number, isHoliday: boolean) => {
    setSchedules((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        is_working_day: !isHoliday,
      };
      return updated;
    });
  };

  const handleSaveTimezone = async () => {
    if (!selectedFacilityId) return;
    setSavingTz(true);
    setFeedback(null);
    try {
      await api(`/facilities/${selectedFacilityId}/timezone`, "PUT", {
        timezone,
      });
      setFeedback({
        type: "success",
        message: "Facility time zone saved successfully.",
      });
      notify?.("Facility time zone saved successfully.");
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to save facility time zone.",
      });
    } finally {
      setSavingTz(false);
    }
  };

  const handleSaveTimings = async () => {
    if (!selectedFacilityId) return;
    setFeedback(null);

    // Validate active working days: end time must be later than start time
    for (const s of schedules) {
      if (s.is_working_day) {
        const startMin = timeToMinutes(s.startTime, s.startAmPm);
        const endMin = timeToMinutes(s.endTime, s.endAmPm);
        if (endMin <= startMin) {
          setFeedback({
            type: "error",
            message: `End time must be later than start time on ${s.day_of_week}.`,
          });
          return;
        }
      }
    }

    setSavingHours(true);
    try {
      const payloadTimings = schedules.map((s) => ({
        day_of_week: s.day_of_week,
        is_working_day: s.is_working_day,
        start_time: `${s.startTime} ${s.startAmPm}`,
        end_time: `${s.endTime} ${s.endAmPm}`,
        timezone,
      }));

      await api(`/facilities/${selectedFacilityId}/timings`, "PUT", {
        timezone,
        timings: payloadTimings,
      });

      setFeedback({
        type: "success",
        message: "Facility working hours saved successfully.",
      });
      notify?.("Facility working hours saved successfully.");
      // Reload configuration from server
      await loadFacilityTimings(selectedFacilityId);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to save facility working hours.",
      });
    } finally {
      setSavingHours(false);
    }
  };

  const handleCancel = () => {
    if (selectedFacilityId) {
      loadFacilityTimings(selectedFacilityId);
    }
  };

  return (
    <div
      style={{
        padding: "20px 24px 40px",
        background: "#ffffff",
        minHeight: "520px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "16px",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: feedback.type === "success" ? "#065f46" : "#991b1b",
            border:
              feedback.type === "success"
                ? "1px solid #a7f3d0"
                : "1px solid #fecaca",
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* SECTION 1: Facility Time Zone */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "12px",
            borderBottom: "1px solid #eee",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#222",
            }}
          >
            Facility Time Zone
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              style={{
                fontSize: "13px",
                color: "#444",
                fontWeight: 500,
              }}
            >
              Choose Facility
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => handleFacilityChange(e.target.value)}
              style={{
                border: "1px solid #ccc",
                borderRadius: "3px",
                padding: "4px 8px",
                fontSize: "13px",
                background: "#fff",
                color: "#333",
                minWidth: "220px",
                outline: "none",
              }}
            >
              {facilityList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Zone row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <label
            style={{
              width: "110px",
              textAlign: "right",
              marginRight: "16px",
              fontSize: "13px",
              color: "#333",
            }}
          >
            Time Zone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={loading}
            style={{
              width: "480px",
              maxWidth: "100%",
              padding: "6px 10px",
              fontSize: "13px",
              border: "1px solid #ccc",
              borderRadius: "3px",
              background: "#fff",
              color: "#333",
              outline: "none",
            }}
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Save button for Time Zone */}
        <div style={{ marginLeft: "126px" }}>
          <button
            onClick={handleSaveTimezone}
            disabled={savingTz || loading}
            style={{
              background: "#ea8b0d",
              color: "#ffffff",
              border: "none",
              borderRadius: "3px",
              padding: "5px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: savingTz || loading ? "not-allowed" : "pointer",
              opacity: savingTz || loading ? 0.7 : 1,
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            {savingTz ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Subtle Horizontal Divider */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          margin: "24px 0 20px",
        }}
      />

      {/* SECTION 2: Facility Working Hours */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "12px",
            borderBottom: "1px solid #eee",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#222",
            }}
          >
            Facility Working Hours
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              style={{
                fontSize: "13px",
                color: "#444",
                fontWeight: 500,
              }}
            >
              Choose Facility
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => handleFacilityChange(e.target.value)}
              style={{
                border: "1px solid #ccc",
                borderRadius: "3px",
                padding: "4px 8px",
                fontSize: "13px",
                background: "#fff",
                color: "#333",
                minWidth: "220px",
                outline: "none",
              }}
            >
              {facilityList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule Grid Table */}
        <div style={{ marginTop: "12px" }}>
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingBottom: "8px",
              marginBottom: "6px",
            }}
          >
            <div style={{ width: "110px" }} />
            <div
              style={{
                width: "185px",
                textAlign: "center",
                fontSize: "13px",
                fontWeight: "bold",
                color: "#222",
              }}
            >
              Start Time
            </div>
            <div
              style={{
                width: "185px",
                textAlign: "center",
                fontSize: "13px",
                fontWeight: "bold",
                color: "#222",
              }}
            >
              End Time
            </div>
            <div style={{ width: "100px" }} />
          </div>

          {/* Weekday Rows (Sunday through Saturday) */}
          {loading ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              Loading facility schedule...
            </div>
          ) : (
            schedules.map((row, idx) => {
              const isHoliday = !row.is_working_day;
              return (
                <div
                  key={row.day_of_week}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "11px",
                  }}
                >
                  {/* Day Label */}
                  <div
                    style={{
                      width: "110px",
                      textAlign: "right",
                      paddingRight: "16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: isHoliday ? "#888" : "#222",
                    }}
                  >
                    {row.day_of_week}
                  </div>

                  {/* Start Time Pickers */}
                  <div
                    style={{
                      width: "185px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <select
                      value={row.startTime}
                      disabled={isHoliday}
                      onChange={(e) =>
                        handleScheduleChange(idx, "startTime", e.target.value)
                      }
                      style={{
                        width: "82px",
                        padding: "4px 6px",
                        fontSize: "13px",
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        background: isHoliday ? "#f3f4f6" : "#fff",
                        color: isHoliday ? "#9ca3af" : "#222",
                        cursor: isHoliday ? "not-allowed" : "pointer",
                        outline: "none",
                      }}
                    >
                      {TIME_SELECT_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.startAmPm}
                      disabled={isHoliday}
                      onChange={(e) =>
                        handleScheduleChange(
                          idx,
                          "startAmPm",
                          e.target.value as "am" | "pm"
                        )
                      }
                      style={{
                        width: "56px",
                        padding: "4px 6px",
                        fontSize: "13px",
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        background: isHoliday ? "#f3f4f6" : "#fff",
                        color: isHoliday ? "#9ca3af" : "#222",
                        cursor: isHoliday ? "not-allowed" : "pointer",
                        outline: "none",
                      }}
                    >
                      <option value="am">am</option>
                      <option value="pm">pm</option>
                    </select>
                  </div>

                  {/* End Time Pickers */}
                  <div
                    style={{
                      width: "185px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <select
                      value={row.endTime}
                      disabled={isHoliday}
                      onChange={(e) =>
                        handleScheduleChange(idx, "endTime", e.target.value)
                      }
                      style={{
                        width: "82px",
                        padding: "4px 6px",
                        fontSize: "13px",
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        background: isHoliday ? "#f3f4f6" : "#fff",
                        color: isHoliday ? "#9ca3af" : "#222",
                        cursor: isHoliday ? "not-allowed" : "pointer",
                        outline: "none",
                      }}
                    >
                      {TIME_SELECT_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.endAmPm}
                      disabled={isHoliday}
                      onChange={(e) =>
                        handleScheduleChange(
                          idx,
                          "endAmPm",
                          e.target.value as "am" | "pm"
                        )
                      }
                      style={{
                        width: "56px",
                        padding: "4px 6px",
                        fontSize: "13px",
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        background: isHoliday ? "#f3f4f6" : "#fff",
                        color: isHoliday ? "#9ca3af" : "#222",
                        cursor: isHoliday ? "not-allowed" : "pointer",
                        outline: "none",
                      }}
                    >
                      <option value="am">am</option>
                      <option value="pm">pm</option>
                    </select>
                  </div>

                  {/* Holiday Checkbox */}
                  <div
                    style={{
                      paddingLeft: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`holiday-${row.day_of_week}`}
                      checked={isHoliday}
                      onChange={(e) =>
                        handleHolidayToggle(idx, e.target.checked)
                      }
                      style={{
                        width: "15px",
                        height: "15px",
                        cursor: "pointer",
                        accentColor: "#ea8b0d",
                      }}
                    />
                    <label
                      htmlFor={`holiday-${row.day_of_week}`}
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        cursor: "pointer",
                      }}
                    >
                      Holiday
                    </label>
                  </div>
                </div>
              );
            })
          )}

          {/* Action Buttons */}
          <div
            style={{
              marginLeft: "110px",
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <button
              onClick={handleSaveTimings}
              disabled={savingHours || loading}
              style={{
                background: "#ea8b0d",
                color: "#ffffff",
                border: "none",
                borderRadius: "3px",
                padding: "6px 20px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: savingHours || loading ? "not-allowed" : "pointer",
                opacity: savingHours || loading ? 0.7 : 1,
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              {savingHours ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={savingHours || loading}
              style={{
                background: "#f8fafc",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "3px",
                padding: "5px 16px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: savingHours || loading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

