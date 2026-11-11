import React, { useState, useEffect } from "react";
import { Trash2, Plus, ChevronRight } from "lucide-react";
import { api, Row } from "../../api";

export function FacilityNotificationsPage() {
  const [activeSubMenu, setActiveSubMenu] = useState("lab-results");
  const [staffList, setStaffList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Criteria rules
  const [rules, setRules] = useState([
    {
      id: "r1",
      parameter: "Troponin-I",
      criteria: ">",
      value: "0.04 ng/mL",
      message: "Critical Alert: Elevated Troponin-I detected. Immediate clinical review required.",
    },
    {
      id: "r2",
      parameter: "Serum Potassium",
      criteria: ">",
      value: "5.5 mEq/L",
      message: "Hyperkalemia Alert: Serum potassium above safe threshold.",
    },
  ]);

  // Notify To list
  const [recipients, setRecipients] = useState([
    {
      id: "rc1",
      member_name: "Dr. Ramasamy S",
      contact: "Mobile : 9003070065",
      sms: true,
      email: true,
      inside_product: true,
    },
    {
      id: "rc2",
      member_name: "Dr. Ebinesh Joel",
      contact: "Mobile : 9789455491",
      sms: true,
      email: true,
      inside_product: true,
    },
  ]);

  useEffect(() => {
    setLoading(true);
    Promise.all([api("/staff"), api("/notifications-rules")])
      .then(([staff, notifs]) => {
        setStaffList(staff);
        if (notifs?.lab_results && notifs.lab_results.length > 0) {
          const lrs = notifs.lab_results;
          setRules(
            lrs.map((item: any, idx: number) => ({
              id: "r" + idx,
              parameter: item.parameter,
              criteria: item.criteria,
              value: item.value,
              message: item.message,
            }))
          );
          if (lrs[0]?.notified_members) {
            setRecipients(
              lrs[0].notified_members.map((m: any, idx: number) => ({
                id: "rc" + idx,
                member_name: m.name,
                contact: `Mobile : ${m.phone || "9003070065"}`,
                sms: m.sms ?? true,
                email: m.email ?? true,
                inside_product: m.inside_product ?? true,
              }))
            );
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        id: "r_" + Date.now(),
        parameter: "hs-CRP",
        criteria: ">",
        value: "3.0 mg/L",
        message: "High risk cardiovascular inflammation detected.",
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleAddRecipient = () => {
    const firstStaff = staffList[0]?.name || "Chandra Mohan R";
    setRecipients([
      ...recipients,
      {
        id: "rc_" + Date.now(),
        member_name: firstStaff,
        contact: "Mobile : 9003070065",
        sms: true,
        email: true,
        inside_product: true,
      },
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter((rc) => rc.id !== id));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payload = {
        lab_results: rules.map((r) => ({
          parameter: r.parameter,
          criteria: r.criteria,
          value: r.value,
          message: r.message,
          notified_members: recipients.map((rc) => ({
            name: rc.member_name,
            phone: "9003070065",
            sms: rc.sms,
            email: rc.email,
            inside_product: rc.inside_product,
          })),
        })),
      };
      await api("/admin/notifications-rules", "POST", payload);
      alert("Notification rules saved successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to save notifications");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="charm-notifications-view">
      <div className="charm-notifs-layout">
        {/* Left Submenu matching CharmHealth */}
        <div className="charm-notifs-sidebar">
          <button
            type="button"
            className={`charm-notifs-menu-item ${activeSubMenu === "lab-results" ? "active" : ""}`}
            onClick={() => setActiveSubMenu("lab-results")}
          >
            <span>Lab Result Notifications</span>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className={`charm-notifs-menu-item ${activeSubMenu === "vital" ? "active" : ""}`}
            onClick={() => setActiveSubMenu("vital")}
          >
            <span>Vital Notifications</span>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className={`charm-notifs-menu-item ${activeSubMenu === "questionnaire" ? "active" : ""}`}
            onClick={() => setActiveSubMenu("questionnaire")}
          >
            <span>Questionnaire Notifications</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Right Content Pane */}
        <div className="charm-notifs-content">
          <div className="charm-notifs-head-action">
            <h3 style={{ margin: 0, fontSize: 16, color: "#1e293b", fontWeight: 600 }}>
              {activeSubMenu === "lab-results"
                ? "Lab Result Notifications"
                : activeSubMenu === "vital"
                ? "Vital Notifications"
                : "Questionnaire Notifications"}
            </h3>
            <button
              type="button"
              className="charm-btn-orange"
              disabled={saving}
              onClick={handleSaveAll}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {/* Criteria Table */}
          <div className="charm-notif-table-box">
            <table className="charm-notif-table">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Parameter</th>
                  <th style={{ width: "16%" }}>Criteria</th>
                  <th style={{ width: "18%" }}>Value</th>
                  <th style={{ width: "36%" }}>Message</th>
                  <th style={{ width: "6%", textAlign: "center" }}>&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, idx) => (
                  <tr key={rule.id}>
                    <td>
                      <input
                        type="text"
                        className="charm-notif-input"
                        value={rule.parameter}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx].parameter = e.target.value;
                          setRules(next);
                        }}
                      />
                    </td>
                    <td>
                      <select
                        className="charm-notif-select"
                        value={rule.criteria}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx].criteria = e.target.value;
                          setRules(next);
                        }}
                      >
                        <option value=">">&gt; (Greater than)</option>
                        <option value="<">&lt; (Less than)</option>
                        <option value=">=">&gt;= (Greater or equal)</option>
                        <option value="<=">&lt;= (Less or equal)</option>
                        <option value="=">= (Equals)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="charm-notif-input"
                        value={rule.value}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx].value = e.target.value;
                          setRules(next);
                        }}
                      />
                    </td>
                    <td>
                      <textarea
                        className="charm-notif-textarea"
                        rows={2}
                        value={rule.message}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx].message = e.target.value;
                          setRules(next);
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="charm-trash-btn"
                        onClick={() => handleRemoveRule(rule.id)}
                        title="Remove rule"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "8px 12px" }}>
              <button
                type="button"
                className="charm-link-btn"
                onClick={handleAddRule}
              >
                + Add Rule
              </button>
            </div>
          </div>

          {/* Notify To Section */}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, color: "#334155", margin: "0 0 10px 0" }}>
              Notify To
            </h4>
            <div className="charm-notif-table-box">
              <table className="charm-notif-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Member</th>
                    <th style={{ width: "34%" }}>Contact Details</th>
                    <th style={{ width: "10%", textAlign: "center" }}>SMS</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Email</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Inside Product</th>
                    <th style={{ width: "4%", textAlign: "center" }}>&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((rc, idx) => (
                    <tr key={rc.id}>
                      <td>
                        <select
                          className="charm-notif-select"
                          value={rc.member_name}
                          onChange={(e) => {
                            const next = [...recipients];
                            next[idx].member_name = e.target.value;
                            setRecipients(next);
                          }}
                        >
                          {staffList.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: "#475569" }}>{rc.contact}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={rc.sms}
                          onChange={(e) => {
                            const next = [...recipients];
                            next[idx].sms = e.target.checked;
                            setRecipients(next);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={rc.email}
                          onChange={(e) => {
                            const next = [...recipients];
                            next[idx].email = e.target.checked;
                            setRecipients(next);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={rc.inside_product}
                          onChange={(e) => {
                            const next = [...recipients];
                            next[idx].inside_product = e.target.checked;
                            setRecipients(next);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="charm-trash-btn"
                          onClick={() => handleRemoveRecipient(rc.id)}
                          title="Remove recipient"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "8px 12px" }}>
                <button
                  type="button"
                  className="charm-link-btn"
                  onClick={handleAddRecipient}
                >
                  + Add more
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

