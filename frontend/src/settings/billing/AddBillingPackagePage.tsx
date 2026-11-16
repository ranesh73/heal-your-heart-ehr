import React, { useState, useEffect } from "react";
import { ArrowLeft, Trash2, Plus, Info, HelpCircle } from "lucide-react";
import { api } from "../../api";
import { CatalogAutocomplete } from "../../CatalogAutocomplete";

interface AddBillingPackagePageProps {
  onBack: () => void;
  onSaved: () => void;
  packageId?: string | null;
}

interface PackageItemLine {
  id: string;
  desc: string;
  code: string;
  qty: number;
  charge: number;
  prorate_per_qty: number;
  prorate_charge: number;
}

export function AddBillingPackagePage({ onBack, onSaved, packageId }: AddBillingPackagePageProps) {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [description, setDescription] = useState("");
  const [billingCode, setBillingCode] = useState("");
  const [periodMonths, setPeriodMonths] = useState(1);
  const [allowFamilySharing, setAllowFamilySharing] = useState(true);
  const [chargeMode, setChargeMode] = useState<"no_charge" | "charge_services">("no_charge");
  const [includeProducts, setIncludeProducts] = useState(false);

  // Procedure lines
  const [procLines, setProcLines] = useState<PackageItemLine[]>([
    { id: "1", desc: "", code: "", qty: 1, charge: 0.0, prorate_per_qty: 0.0, prorate_charge: 0.0 },
  ]);

  // Lab lines
  const [labLines, setLabLines] = useState<PackageItemLine[]>([
    { id: "1", desc: "", code: "", qty: 1, charge: 0.0, prorate_per_qty: 0.0, prorate_charge: 0.0 },
  ]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (packageId) {
      const loadPkg = async () => {
        try {
          const pkgs = await api<any[]>("/api/settings/billing/packages");
          const found = (pkgs || []).find((p) => p.id === packageId);
          if (found) {
            setName(found.name || "");
            setShortCode(found.code || "");
            setBillingCode(found.billing_code || "");
            setIncludeProducts(found.include_products || false);
            if (found.procedures && found.procedures.length > 0) {
              setProcLines(found.procedures.map((p: any, i: number) => ({
                id: String(i + 1),
                desc: p.desc || "",
                code: p.code || "",
                qty: p.qty || 1,
                charge: p.charge || 0,
                prorate_per_qty: p.prorate ? p.prorate / (p.qty || 1) : 0,
                prorate_charge: p.prorate || 0,
              })));
            }
            if (found.labs && found.labs.length > 0) {
              setLabLines(found.labs.map((l: any, i: number) => ({
                id: String(i + 1),
                desc: l.desc || "",
                code: l.code || "",
                qty: l.qty || 1,
                charge: l.charge || 0,
                prorate_per_qty: l.prorate ? l.prorate / (l.qty || 1) : 0,
                prorate_charge: l.prorate || 0,
              })));
            }
          }
        } catch (err) {
          console.error("Failed to load package detail:", err);
        }
      };
      loadPkg();
    }
  }, [packageId]);

  const updateProcLine = (id: string, field: keyof PackageItemLine, val: any) => {
    setProcLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: val };
        if (field === "qty" || field === "charge") {
          updated.prorate_charge = updated.qty * updated.charge;
          updated.prorate_per_qty = updated.charge;
        }
        return updated;
      })
    );
  };

  const updateLabLine = (id: string, field: keyof PackageItemLine, val: any) => {
    setLabLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: val };
        if (field === "qty" || field === "charge") {
          updated.prorate_charge = updated.qty * updated.charge;
          updated.prorate_per_qty = updated.charge;
        }
        return updated;
      })
    );
  };

  const addProcLine = () => {
    setProcLines((prev) => [
      ...prev,
      { id: String(Date.now()), desc: "", code: "", qty: 1, charge: 0.0, prorate_per_qty: 0.0, prorate_charge: 0.0 },
    ]);
  };

  const removeProcLine = (id: string) => {
    if (procLines.length <= 1) {
      setProcLines([{ id: "1", desc: "", code: "", qty: 1, charge: 0.0, prorate_per_qty: 0.0, prorate_charge: 0.0 }]);
    } else {
      setProcLines((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const addLabLine = () => {
    setLabLines((prev) => [
      ...prev,
      { id: String(Date.now()), desc: "", code: "", qty: 1, charge: 0.0, prorate_per_qty: 0.0, prorate_charge: 0.0 },
    ]);
  };

  const removeLabLine = (id: string) => {
    if (labLines.length <= 1) {
      setLabLines([{ id: "1", desc: "", code: "", qty: 1, charge: 0.0, prorate_per_qty: 0.0, prorate_charge: 0.0 }]);
    } else {
      setLabLines((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const totalProcedures = procLines.reduce((sum, l) => sum + (Number(l.prorate_charge) || 0), 0);
  const totalLabs = labLines.reduce((sum, l) => sum + (Number(l.prorate_charge) || 0), 0);
  const grandTotal = totalProcedures + totalLabs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Package Name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: shortCode.trim() || `PKG_${Date.now()}`,
        billing_code: billingCode.trim() || `[${shortCode || "PKG"}] ${name.trim()}`,
        period: `${periodMonths} Month(s)`,
        charge: grandTotal,
        include_products: includeProducts,
        procedures: procLines.filter((p) => p.desc.trim()).map((p) => ({
          desc: p.desc,
          code: p.code,
          qty: p.qty,
          charge: p.charge,
          prorate: p.prorate_charge,
        })),
        labs: labLines.filter((l) => l.desc.trim()).map((l) => ({
          desc: l.desc,
          code: l.code,
          qty: l.qty,
          charge: l.charge,
          prorate: l.prorate_charge,
        })),
      };

      if (packageId) {
        await api(`/api/settings/billing/packages/${packageId}`, "PUT", payload);
      } else {
        await api("/api/settings/billing/packages", "POST", payload);
      }
      onSaved();
      onBack();
    } catch (err: any) {
      alert(err.message || "Failed to save billing package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      <form onSubmit={handleSubmit} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        {/* Header Strip matching Frame 226 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 14 }}>
          <button
            type="button"
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}
            title="Back to Billing Packages"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
            {packageId ? "Edit Billing Package" : "Add Billing Package"}
          </h2>
        </div>

        {/* 2-Column Balanced Form Grid matching Frame 226 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, marginBottom: 24 }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                Package Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EECP 35-Session Course"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                Code/Short Name
              </label>
              <input
                type="text"
                placeholder="e.g. EECP-35"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Optional description of treatment inclusions and conditions"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  Billing Code for Package *
                </label>
                <button
                  type="button"
                  onClick={() => setBillingCode(`[${shortCode || "PKG"}] ${name || "New Package"}`)}
                  style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                >
                  Generate Code
                </button>
              </div>
              <input
                type="text"
                placeholder="Search by Procedure Code or Description"
                value={billingCode}
                onChange={(e) => setBillingCode(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Charge</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", minWidth: 120 }}>
                Package Period *
              </label>
              <input
                type="number"
                min={1}
                value={periodMonths}
                onChange={(e) => setPeriodMonths(parseInt(e.target.value) || 1)}
                style={{ width: 60, padding: "6px 8px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "center" }}
              />
              <select
                style={{ padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
              >
                <option value="Months">Months</option>
                <option value="Days">Days</option>
              </select>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allowFamilySharing}
                  onChange={(e) => setAllowFamilySharing(e.target.checked)}
                  style={{ accentColor: "#0284c7" }}
                />
                <span>Allow sharing of this Package with all Family Members</span>
                <HelpCircle size={14} color="#94a3b8" />
              </label>
            </div>
          </div>
        </div>

        {/* Charge Mode Radios matching Frame 226 */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input
                type="radio"
                name="chargeMode"
                checked={chargeMode === "no_charge"}
                onChange={() => setChargeMode("no_charge")}
                style={{ marginTop: 2, accentColor: "#0284c7" }}
              />
              <div>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>
                  Patients are not charged when they use the services/items of the package
                </span>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  ( In the Invoice, Item charge will be &apos;0&apos; by default for the services in the package )
                </div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input
                type="radio"
                name="chargeMode"
                checked={chargeMode === "charge_services"}
                onChange={() => setChargeMode("charge_services")}
                style={{ marginTop: 2, accentColor: "#0284c7" }}
              />
              <div>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>
                  Patients are charged for the services when they use the services/items of the package
                </span>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  ( In the invoice, Item charge will be auto populated from Procedures for the services in the package )
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Package Items Section */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 14px 0" }}>
            Package Items
          </h3>

          {/* Procedures Table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Procedures</span>
              <button
                type="button"
                onClick={addProcLine}
                style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                Choose from Master List
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e2e8f0" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600, width: "45%" }}>Description</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "center", width: 70 }}>Qty</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right", width: 100 }}>Charge</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right", width: 120 }}>Prorate Charge/Qty</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right", width: 120 }}>Prorate Charge</th>
                  <th style={{ width: 44, textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {procLines.map((line) => (
                  <tr key={line.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 8px" }}>
                      <CatalogAutocomplete
                        value={line.desc}
                        type="all"
                        placeholder="Enter Procedure Code or Description..."
                        onChangeText={(text) => updateProcLine(line.id, "desc", text)}
                        onSelect={(cat) => {
                          updateProcLine(line.id, "desc", cat.name);
                          updateProcLine(line.id, "code", cat.code || "");
                          if (cat.price_paise) {
                            const price = cat.price_paise / 100;
                            updateProcLine(line.id, "charge", price);
                            updateProcLine(line.id, "prorate_charge", price * line.qty);
                            updateProcLine(line.id, "prorate_per_qty", price);
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateProcLine(line.id, "qty", parseInt(e.target.value) || 1)}
                        style={{ width: 50, padding: "5px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "center" }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>
                      <input
                        type="number"
                        step="0.01"
                        value={line.charge}
                        onChange={(e) => updateProcLine(line.id, "charge", parseFloat(e.target.value) || 0)}
                        style={{ width: 80, padding: "5px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#475569" }}>
                      ₹{line.prorate_per_qty.toFixed(2)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                      ₹{line.prorate_charge.toFixed(2)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeProcLine(line.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                        title="Remove Line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lab Tests Table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Lab Tests</span>
              <button
                type="button"
                onClick={addLabLine}
                style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                Choose from Master List
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e2e8f0" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600, width: "45%" }}>Description</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "center", width: 70 }}>Qty</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right", width: 100 }}>Charge</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right", width: 120 }}>Prorate Charge/Qty</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right", width: 120 }}>Prorate Charge</th>
                  <th style={{ width: 44, textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {labLines.map((line) => (
                  <tr key={line.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 8px" }}>
                      <CatalogAutocomplete
                        value={line.desc}
                        type="all"
                        placeholder="Enter Lab Test or Description..."
                        onChangeText={(text) => updateLabLine(line.id, "desc", text)}
                        onSelect={(cat) => {
                          updateLabLine(line.id, "desc", cat.name);
                          updateLabLine(line.id, "code", cat.code || "");
                          if (cat.price_paise) {
                            const price = cat.price_paise / 100;
                            updateLabLine(line.id, "charge", price);
                            updateLabLine(line.id, "prorate_charge", price * line.qty);
                            updateLabLine(line.id, "prorate_per_qty", price);
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLabLine(line.id, "qty", parseInt(e.target.value) || 1)}
                        style={{ width: 50, padding: "5px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "center" }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>
                      <input
                        type="number"
                        step="0.01"
                        value={line.charge}
                        onChange={(e) => updateLabLine(line.id, "charge", parseFloat(e.target.value) || 0)}
                        style={{ width: 80, padding: "5px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#475569" }}>
                      ₹{line.prorate_per_qty.toFixed(2)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                      ₹{line.prorate_charge.toFixed(2)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeLabLine(line.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                        title="Remove Line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeProducts}
                onChange={(e) => setIncludeProducts(e.target.checked)}
                style={{ accentColor: "#0284c7" }}
              />
              <span>Include Products in this Package</span>
            </label>
          </div>
        </div>

        {/* Bottom Buttons matching Frame 226 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 24px",
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            {saving ? "Saving..." : "Add"}
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "8px 20px",
              background: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
