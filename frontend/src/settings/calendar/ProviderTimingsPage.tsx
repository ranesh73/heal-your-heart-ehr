import React, { useState, useEffect } from "react";
import { Plus, X, Clock, Calendar } from "lucide-react";
import { api } from "../../api";

interface ShiftTime {
  start: string;
  end: string;
  not_working: boolean;
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

const TIME_OPTIONS = [
  "12:00 am", "06:00 am", "07:00 am", "08:00 am", "08:30 am", "09:00 am",
  "09:30 am", "10:00 am", "11:00 am", "12:00 pm", "01:00 pm", "02:00 pm",
  "03:00 pm", "04:00 pm", "05:00 pm", "06:00 pm", "07:00 pm", "08:00 pm",
  "09:00 pm", "10:00 pm", "11:00 pm", "11:45 pm",
];

export function ProviderTimingsPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [hours, setHours] = useState<Record<string, ShiftTime>>({});
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [excDate, setExcDate] = useState("");
  const [excReason, setExcReason] = useState("");

  useEffect(() => {
    async function loadMeta() {
      try {
        const facs = await api<any[]>("/facilities");
        setFacilities(facs || []);
        if (facs && facs.length > 0) {
          setSelectedFacility(facs[0].id);
        }
      } catch (err) {
        console.error("Failed loading facilities", err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function loadMembers() {
      if (!selectedFacility) return;
      try {
        const mems = await api<any[]>(`/facilities/${selectedFacility}/members`);
        setProviders(mems || []);
        if (mems && mems.length > 0) {
          setSelectedProvider(mems[0].id);
        }
      } catch (err) {
        console.error("Failed loading members", err);
      }
    }
    loadMembers();
  }, [selectedFacility]);

  useEffect(() => {
    async function loadTimings() {
      if (!selectedFacility || !selectedProvider) return;
      setLoading(true);
      try {
        const res = await api<any>(
          `/calendar/provider-timings?facility_id=${selectedFacility}&provider_id=${selectedProvider}`
        );
        if (res && res.hours) {
          setHours(res.hours);
          setExceptions(res.exceptions || []);
        } else {
          const initHours: Record<string, ShiftTime> = {};
          DAYS_OF_WEEK.forEach((d) => {
            initHours[d] = {
              start: "08:00 am",
              end: "08:00 pm",
              not_working: d === "Sunday",
            };
          });
          setHours(initHours);
          setExceptions([]);
        }
      } catch {
        const initHours: Record<string, ShiftTime> = {};
        DAYS_OF_WEEK.forEach((d) => {
          initHours[d] = {
            start: "08:00 am",
            end: "08:00 pm",
            not_working: d === "Sunday",
          };
        });
        setHours(initHours);
      } finally {
        setLoading(false);
      }
    }
    loadTimings();
  }, [selectedFacility, selectedProvider]);

  const handleTimeChange = (day: string, field: "start" | "end", val: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { start: "08:00 am", end: "08:00 pm", not_working: false }),
        [field]: val,
      },
    }));
  };

  const handleToggleNotWorking = (day: string, checked: boolean) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { start: "08:00 am", end: "08:00 pm", not_working: false }),
        not_working: checked,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/admin/calendar/provider-timings", "POST", {
        facility_id: selectedFacility,
        provider_id: selectedProvider,
        hours,
        exceptions,
      });
      setNotice("Provider timings saved successfully");
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert("Failed to save timings: " + (err.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = () => {
    if (!excDate) return;
    setExceptions((prev) => [
      ...prev,
      { id: Date.now().toString(), date: excDate, reason: excReason || "Off Duty" },
    ]);
    setExcDate("");
    setExcReason("");
    setExceptionModalOpen(false);
  };

  const handleRemoveException = (id: string) => {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Top Filter Selection */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "12px 16px",
          background: "#f8fafc",
          borderRadius: 4,
          marginBottom: 16,
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Choose Facility:
          </label>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              border: "1px solid #cbd5e1",
              borderRadius: 3,
              background: "#fff",
              minWidth: 240,
            }}
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Choose Provider:
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              border: "1px solid #cbd5e1",
              borderRadius: 3,
              background: "#fff",
              minWidth: 180,
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {notice && (
          <span
            style={{
              fontSize: 12,
              color: "#059669",
              background: "#ecfdf5",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #a7f3d0",
              marginLeft: "auto",
            }}
          >
            {notice}
          </span>
        )}
      </div>

      {/* Main Two-Pane Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Left: Regular Working Hours */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "16px 20px",
            background: "#fff",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0" }}>
            Regular Working Hours
          </h3>
          <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 16px 0" }}>
            Configure regular shift schedules for the selected clinician.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS_OF_WEEK.map((day) => {
              const d = hours[day] || { start: "08:00 am", end: "08:00 pm", not_working: false };
              return (
                <div
                  key={day}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "8px 12px",
                    background: d.not_working ? "#f8fafc" : "#fff",
                    borderRadius: 3,
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <span style={{ width: 100, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                    {day}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: d.not_working ? 0.4 : 1 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Start:</span>
                    <select
                      value={d.start}
                      disabled={d.not_working}
                      onChange={(e) => handleTimeChange(day, "start", e.target.value)}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12.5,
                        border: "1px solid #cbd5e1",
                        borderRadius: 3,
                      }}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <span style={{ fontSize: 12, color: "#64748b", margin: "0 4px" }}>End:</span>
                    <select
                      value={d.end}
                      disabled={d.not_working}
                      onChange={(e) => handleTimeChange(day, "end", e.target.value)}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12.5,
                        border: "1px solid #cbd5e1",
                        borderRadius: 3,
                      }}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12.5,
                      color: "#64748b",
                      marginLeft: "auto",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={d.not_working}
                      onChange={(e) => handleToggleNotWorking(day, e.target.checked)}
                    />
                    Not Working
                  </label>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: "#d97706",
                color: "#ffffff",
                border: "none",
                padding: "8px 24px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save Working Hours"}
            </button>
          </div>
        </div>

        {/* Right: Exceptions Panel */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "16px 20px",
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: 0 }}>
              Exceptions
            </h3>
            <button
              type="button"
              onClick={() => setExceptionModalOpen(true)}
              style={{
                fontSize: 12,
                color: "#166eb8",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              + Add Date
            </button>
          </div>

          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>
            Specific dates when the provider is away or on special leave.
          </p>

          {exceptions.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                background: "#f8fafc",
                borderRadius: 4,
                textAlign: "center",
                color: "#64748b",
                fontSize: 12.5,
              }}
            >
              No exceptions configured for this provider.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {exceptions.map((exc) => (
                <div
                  key={exc.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    background: "#f8fafc",
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 12.5, color: "#334155", display: "block" }}>
                      {exc.date}
                    </strong>
                    <span style={{ fontSize: 11.5, color: "#64748b" }}>{exc.reason}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveException(exc.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      padding: 4,
                    }}
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exception Modal */}
      {exceptionModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setExceptionModalOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 4,
              padding: 24,
              width: 380,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700 }}>
              Add Schedule Exception
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Date:
                </label>
                <input
                  type="date"
                  value={excDate}
                  onChange={(e) => setExcDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 3,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Reason:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Leave, CME Conference"
                  value={excReason}
                  onChange={(e) => setExcReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 3,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={handleAddException}
                  style={{
                    background: "#d97706",
                    color: "#fff",
                    border: "none",
                    padding: "7px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  Add Exception
                </button>
                <button
                  type="button"
                  onClick={() => setExceptionModalOpen(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    padding: "7px 16px",
                    fontSize: 13,
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
