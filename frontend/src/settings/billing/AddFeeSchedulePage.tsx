import React, { useState, useEffect } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Search } from "lucide-react";
import { api } from "../../api";

interface AddFeeSchedulePageProps {
  onBack: () => void;
  onSaved: () => void;
  scheduleId?: string | null;
}

export function AddFeeSchedulePage({ onBack, onSaved, scheduleId }: AddFeeSchedulePageProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleType, setScheduleType] = useState<"Provider Specific" | "Patient Specific" | "Payer Specific" | "Facility Specific" | "None">("None");

  const [proceduresOpen, setProceduresOpen] = useState(true);
  const [productsOpen, setProductsOpen] = useState(true);

  const [procedures, setProcedures] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState("");

  const [autofillMode, setAutofillMode] = useState<"charge" | "discount">("charge");
  const [autofillValue, setAutofillValue] = useState("");

  // Map of procedureId -> { charge: string, discountVal: string, discountType: "%" | "Amount", pos: string, mod1: string, mod2: string, mod3: string, mod4: string }
  const [procOverrides, setProcOverrides] = useState<Record<string, any>>({});
  // Map of productId -> { sellingPrice: string, discountVal: string, discountType: "%" | "Amount" }
  const [prodOverrides, setProdOverrides] = useState<Record<string, any>>({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const [procs, prods] = await Promise.all([
          api<any[]>("/settings/billing/procedure-codes"),
          api<any[]>("/inventory?status=active").catch(() => []),
        ]);
        setProcedures(procs || []);
        setProducts(prods || []);

        if (scheduleId) {
          const detail = await api<any>(`/settings/billing/fee-schedules/${scheduleId}`);
          if (detail) {
            setName(detail.name || "");
            setDescription(detail.description || "");
            setScheduleType(detail.schedule_type || "None");
            setProcOverrides(detail.differential_prices || {});
            setProdOverrides(detail.product_prices || {});
          }
        }
      } catch (err) {
        console.error("Failed to load fee schedule data:", err);
      }
    };
    loadItems();
  }, [scheduleId]);

  const handleAutofill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && autofillValue.trim()) {
      e.preventDefault();
      const val = autofillValue.trim();
      const updated: Record<string, any> = { ...procOverrides };
      procedures.forEach((p) => {
        const existing = updated[p.code] || { charge: "", discountVal: "", discountType: "%", pos: "11 - Office", mod1: "", mod2: "", mod3: "", mod4: "" };
        if (autofillMode === "charge") {
          existing.charge = val;
        } else {
          existing.discountVal = val;
        }
        updated[p.code] = existing;
      });
      setProcOverrides(updated);
    }
  };

  const updateProcOverride = (code: string, field: string, val: any) => {
    setProcOverrides((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] || { charge: "", discountVal: "", discountType: "%", pos: "11 - Office", mod1: "", mod2: "", mod3: "", mod4: "" }),
        [field]: val,
      },
    }));
  };

  const updateProdOverride = (id: string, field: string, val: any) => {
    setProdOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { sellingPrice: "", discountVal: "", discountType: "%" }),
        [field]: val,
      },
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a Fee Schedule Name");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        schedule_type: scheduleType,
        differential_prices: procOverrides,
        product_prices: prodOverrides,
      };
      if (scheduleId) {
        await api(`/settings/billing/fee-schedules/${scheduleId}`, "PUT", payload);
      } else {
        await api("/settings/billing/fee-schedules", "POST", payload);
      }
      onSaved();
      onBack();
    } catch (err: any) {
      alert(err.message || "Failed to save fee schedule");
    } finally {
      setSaving(false);
    }
  };

  const filteredProcs = procedures.filter(
    (p) =>
      !searchFilter.trim() ||
      p.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.code.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredProds = products.filter(
    (p) =>
      !searchFilter.trim() ||
      (p.name && p.name.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (p.trade_name && p.trade_name.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
      {/* Top Header with Back Arrow */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#1e293b" }}>
          {scheduleId ? "Edit Fee Schedule" : "Add Fee Schedule"}
        </h2>
      </div>

      {/* Basic Inputs */}
      <div style={{ maxWidth: 760, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
            Fee Schedule Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Preferred Cardiology Tariff"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", maxWidth: 360, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "start", marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: "#334155", textAlign: "right", marginTop: 6 }}>
            Fee Schedule Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", maxWidth: 440, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
            Type of Fee Schedule
          </label>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#334155" }}>
            {(["Provider Specific", "Patient Specific", "Payer Specific", "Facility Specific", "None"] as const).map((type) => (
              <label key={type} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="scheduleType"
                  value={type}
                  checked={scheduleType === type}
                  onChange={() => setScheduleType(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginLeft: 192 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "7px 22px",
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : scheduleId ? "Save" : "Add"}
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "7px 18px",
              background: "#ffffff",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Filter and Autofill Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "#f8fafc",
          padding: "10px 14px",
          borderRadius: 4,
          border: "1px solid #e2e8f0",
          marginBottom: 16,
        }}
      >
        <div style={{ position: "relative", minWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Type and Enter to search for Procedures & Products"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 32px",
              fontSize: 13,
              border: "1px solid #cbd5e1",
              borderRadius: 4,
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <div style={{ textAlign: "right", color: "#475569" }}>
            <span style={{ fontWeight: 600 }}>Autofill Procedure Code Charge or Discount %</span>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              (Enter charge or discount percent and click enter. This will auto-populate the entered value to all the Procedure Codes)
            </div>
          </div>
          <select
            value={autofillMode}
            onChange={(e) => setAutofillMode(e.target.value as any)}
            style={{ padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
          >
            <option value="charge">Charge</option>
            <option value="discount">Discount %</option>
          </select>
          <span style={{ color: "#64748b" }}>with</span>
          <input
            type="number"
            placeholder="Enter value & click enter"
            value={autofillValue}
            onChange={(e) => setAutofillValue(e.target.value)}
            onKeyDown={handleAutofill}
            style={{ width: 140, padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
          />
        </div>
      </div>

      {/* Collapsible: Procedure Codes */}
      <div style={{ marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 4 }}>
        <button
          type="button"
          onClick={() => setProceduresOpen(!proceduresOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 14px",
            background: "#f1f5f9",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            color: "#1e293b",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {proceduresOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Procedure Codes ({filteredProcs.length})</span>
        </button>

        {proceduresOpen && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <th colSpan={6} style={{ padding: "8px 12px", textAlign: "center", borderRight: "2px solid #cbd5e1", fontWeight: 700 }}>
                    Default
                  </th>
                  <th colSpan={4} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>
                    Fee Schedule
                  </th>
                </tr>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#64748b" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>CPT Code</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Charge</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Discount</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Place of Service</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", borderRight: "2px solid #cbd5e1" }}>Modifiers</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Charge</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Discount</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Place of Service</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Modifiers</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcs.map((p) => {
                  const ovr = procOverrides[p.code] || {};
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 500, color: "#1e293b", maxWidth: 220 }}>{p.description}</td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>{p.code}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#0f172a" }}>{p.charge.toFixed(2)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>{p.discount || "-"}</td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>{p.place_of_service || "11 - Office"}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", borderRight: "2px solid #cbd5e1" }}>-</td>

                      {/* Fee Schedule Inputs */}
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="number"
                          placeholder={p.charge.toFixed(2)}
                          value={ovr.charge || ""}
                          onChange={(e) => updateProcOverride(p.code, "charge", e.target.value)}
                          style={{ width: 80, padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="0"
                            value={ovr.discountVal || ""}
                            onChange={(e) => updateProcOverride(p.code, "discountVal", e.target.value)}
                            style={{ width: 44, padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                          />
                          <button
                            type="button"
                            onClick={() => updateProcOverride(p.code, "discountType", ovr.discountType === "%" ? "Amount" : "%")}
                            style={{
                              padding: "4px 6px",
                              fontSize: 10,
                              background: "#e2e8f0",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer",
                            }}
                          >
                            {ovr.discountType || "%"}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <select
                          value={ovr.pos || p.place_of_service || "11 - Office"}
                          onChange={(e) => updateProcOverride(p.code, "pos", e.target.value)}
                          style={{ padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, width: 100 }}
                        >
                          <option value="11 - Office">11 - Office</option>
                          <option value="12 - Home">12 - Home</option>
                          <option value="21 - Inpatient">21 - Inpatient</option>
                          <option value="23 - ER">23 - ER</option>
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {["mod1", "mod2", "mod3", "mod4"].map((mKey) => (
                            <input
                              key={mKey}
                              type="text"
                              maxLength={4}
                              value={ovr[mKey] || ""}
                              onChange={(e) => updateProcOverride(p.code, mKey, e.target.value)}
                              style={{ width: 28, padding: "4px 2px", textAlign: "center", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collapsible: Products */}
      <div style={{ marginBottom: 20, border: "1px solid #e2e8f0", borderRadius: 4 }}>
        <button
          type="button"
          onClick={() => setProductsOpen(!productsOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 14px",
            background: "#f1f5f9",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            color: "#1e293b",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {productsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Products ({filteredProds.length})</span>
        </button>

        {productsOpen && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <th colSpan={5} style={{ padding: "8px 12px", textAlign: "center", borderRight: "2px solid #cbd5e1", fontWeight: 700 }}>
                    Default
                  </th>
                  <th colSpan={2} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>
                    Fee Schedule
                  </th>
                </tr>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#64748b" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Cost Price</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Selling Price</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", borderRight: "2px solid #cbd5e1" }}>Discount</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Selling Price</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Discount</th>
                </tr>
              </thead>
              <tbody>
                {filteredProds.map((prod) => {
                  const ovr = prodOverrides[prod.id] || {};
                  return (
                    <tr key={prod.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 500, color: "#1e293b" }}>{prod.name}</td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>{prod.category || "Drug"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#64748b" }}>
                        {(prod.cost_price || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#0f172a" }}>
                        {(prod.retail_price || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8", borderRight: "2px solid #cbd5e1" }}>
                        -
                      </td>

                      {/* Fee Schedule Inputs */}
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="number"
                          placeholder={(prod.retail_price || 0).toFixed(2)}
                          value={ovr.sellingPrice || ""}
                          onChange={(e) => updateProdOverride(prod.id, "sellingPrice", e.target.value)}
                          style={{ width: 90, padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="0"
                            value={ovr.discountVal || ""}
                            onChange={(e) => updateProdOverride(prod.id, "discountVal", e.target.value)}
                            style={{ width: 44, padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                          />
                          <button
                            type="button"
                            onClick={() => updateProdOverride(prod.id, "discountType", ovr.discountType === "%" ? "Amount" : "%")}
                            style={{
                              padding: "4px 6px",
                              fontSize: 10,
                              background: "#e2e8f0",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer",
                            }}
                          >
                            {ovr.discountType || "%"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ padding: "7px 18px", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "7px 22px", background: "#f59e0b", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {saving ? "Saving..." : scheduleId ? "Save" : "Add"}
        </button>
      </div>
    </div>
  </div>
  );
}

