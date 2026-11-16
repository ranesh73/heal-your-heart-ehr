import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, Trash2, Edit3, CheckCircle, XCircle, ArrowLeft, Loader2, MoreVertical, Package, AlertCircle } from "lucide-react";
import { api } from "../../api";
import { AddBillingPackagePage } from "./AddBillingPackagePage";

interface BillingPackageItem {
  id: string;
  name: string;
  code: string;
  billing_code: string;
  charge: number;
  period: string;
  status: string;
  patients_count: number;
  procedures?: any[];
  labs?: any[];
  include_products?: boolean;
  active: boolean;
}

export function BillingPackagesTab() {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingPackage, setEditingPackage] = useState<BillingPackageItem | null>(null);

  const [packages, setPackages] = useState<BillingPackageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Settings
  const [allowExpired, setAllowExpired] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgsRes, settingsRes] = await Promise.all([
        api<BillingPackageItem[]>("/api/settings/billing/packages"),
        api<{ allow_expired_packages?: boolean }>("/api/settings/billing/packages-settings")
      ]);
      setPackages(pkgsRes || []);
      if (settingsRes && settingsRes.allow_expired_packages !== undefined) {
        setAllowExpired(settingsRes.allow_expired_packages);
      }
    } catch (err) {
      console.error("Failed to load billing packages", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAllowExpired = async (checked: boolean) => {
    setAllowExpired(checked);
    setSavingSettings(true);
    try {
      await api("/api/settings/billing/packages-settings", "PUT", {
        allow_expired_packages: checked
      });
    } catch (err) {
      console.error("Failed to update packages settings", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete package "${name}"?`)) return;
    try {
      await api(`/api/settings/billing/packages/${id}`, "DELETE");
      setActionMenuOpenId(null);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete package");
    }
  };

  const filtered = packages.filter((pkg) => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE" && pkg.status !== "Active") return false;
      if (statusFilter === "INACTIVE" && pkg.status === "Active") return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        pkg.name.toLowerCase().includes(q) ||
        (pkg.billing_code && pkg.billing_code.toLowerCase().includes(q)) ||
        (pkg.code && pkg.code.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (view === "create" || (view === "edit" && editingPackage)) {
    return (
      <AddBillingPackagePage
        onBack={() => {
          setView("list");
          setEditingPackage(null);
        }}
        onSaved={() => {
          setView("list");
          setEditingPackage(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      {/* Informational Guidance Box matching Frame 217 */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px 0", fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          &apos;Billing Packages&apos; enables the practice to create Packages for a collection of Procedures/Treatments that are used over a period of time say 6 months or 1 year. Once patient buys the package, system keeps track of the package and shows the available services in the package. Also, Package can be shared between the family members of the patient.
        </p>
        <p style={{ margin: "0 0 8px 0", fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          <strong>Selling Package to the Patient:</strong> After creating a Billing Package, it can be sold to the patient by adding Billing code of the package in Invoice. Once the Invoice is approved, the Package will be mapped to the patient and the patient can start using the package.
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          <strong>Using Package services in subsequent Patient&apos;s Visit:</strong> When practice is generating an Invoice for the Patient&apos;s Visit and package is available for the patient, Package can be selected for the invoice. For the Invoice line item that is part of the selected package, Charge will be made as either Zero or Charge will be populated from Procedure Codes.
        </p>
      </div>

      {/* Billing Package Settings Box matching Frame 217 */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "18px 22px", marginBottom: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
          Billing Package Settings
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start", marginBottom: 16 }}>
          <div style={{ textAlign: "right" }}>
            <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
              Allow patients to use items in the expired packages
            </label>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>
              ( If option &apos;No&apos; is selected, expired packages will not be listed in the Create Invoice section, and items in the expired packages can not be used. If option &apos;Yes&apos; is selected, expired packages will be listed in the Create Invoice section, and items can be used. )
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="allowExpiredPackages"
                checked={allowExpired}
                onChange={() => setAllowExpired(true)}
                style={{ accentColor: "#0284c7" }}
              />
              Yes
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="allowExpiredPackages"
                checked={!allowExpired}
                onChange={() => setAllowExpired(false)}
                style={{ accentColor: "#0284c7" }}
              />
              No
            </label>
          </div>
        </div>

        <div style={{ marginLeft: 400 }}>
          <button
            type="button"
            onClick={() => handleToggleAllowExpired(allowExpired)}
            disabled={savingSettings}
            style={{
              padding: "7px 24px",
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
            {savingSettings ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        {/* Filter Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
              <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Package Name or Code..."
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 32px",
                  fontSize: 13,
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  outline: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  outline: "none",
                  background: "#ffffff",
                  color: "#1e293b"
                }}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingPackage(null);
              setView("create");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            <Plus size={15} />
            Billing Package
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? "package" : "packages"}
        </div>

        {/* Packages Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
          Loading billing packages...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 8, color: "#64748b" }}>
          <Package size={36} style={{ margin: "0 auto 12px", color: "#94a3b8" }} />
          <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: "0 0 6px 0" }}>No Billing Packages Found</h4>
          <p style={{ fontSize: 13, margin: "0 0 16px 0" }}>
            {search || statusFilter !== "ALL"
              ? "No billing packages match your search filter."
              : "Create bundled service packages with procedures, lab tests, and products."}
          </p>
          <button
            onClick={() => {
              setEditingPackage(null);
              setView("create");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <Plus size={15} />
            Billing Package
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Package Name</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Billing Code</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Charge</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Billing Period</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "center" }}>Status</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "center" }}>Patients</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "center", width: 70 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pkg) => (
                <tr key={pkg.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>
                    {pkg.name}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>
                    {pkg.billing_code || "--"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                    ₹{Number(pkg.charge).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#475569" }}>
                    {pkg.period || "1 Month(s)"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: pkg.status === "Active" ? "#ecfdf5" : "#f1f5f9",
                        color: pkg.status === "Active" ? "#059669" : "#64748b",
                        border: `1px solid ${pkg.status === "Active" ? "#a7f3d0" : "#e2e8f0"}`
                      }}
                    >
                      {pkg.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "#475569" }}>
                    {pkg.patients_count || 0}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", position: "relative" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <button
                        title="Edit Package"
                        onClick={() => {
                          setEditingPackage(pkg);
                          setView("edit");
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#64748b",
                          cursor: "pointer",
                          padding: 4
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        title="Delete Package"
                        onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: 4
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
