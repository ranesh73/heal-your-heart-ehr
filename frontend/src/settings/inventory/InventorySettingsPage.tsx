import React, { useState, useEffect } from "react";
import {
  Save,
  Check,
  AlertTriangle,
  Building,
  ArrowRight,
  Plus,
  Truck,
  RotateCcw,
  ShoppingBag,
  Info,
  ShieldAlert,
} from "lucide-react";
import { api, Row } from "../../api";
import { useApp } from "../../context";

interface InventorySettingsPageProps {
  activeOptionId: string;
}

export function InventorySettingsPage({ activeOptionId }: InventorySettingsPageProps) {
  const { notify } = useApp();

  // Tab 1: Inventory & Vaccine Settings Form
  const [tab1Data, setTab1Data] = useState({
    minKitThreshold: 10,
    alertOnExpiryDays: 60,
    useInventoryAndDispense: true,
    recommendDrugsFromInHouse: true,
    autoPopulateInvoiceFromChartNoteDrugs: true,
    autoPopulateInvoiceFromChartNoteSupplements: true,
    autoPopulateDispenseQuantity: true,
    autoPopulateOnlySupportedUnits: true,
    showStockInEncounter: true,
    useVaccinesInventory: true,
  });

  // Tab 2: Multi-Store Form & Requisitions
  const [tab2Data, setTab2Data] = useState({
    enableMultiStore: false,
    enableInterBranchTransfers: true,
  });
  const [multiStoreWarningOpen, setMultiStoreWarningOpen] = useState(false);
  const [requisitions, setRequisitions] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [newReqModalOpen, setNewReqModalOpen] = useState(false);
  const [newReqData, setNewReqData] = useState({
    source_facility_id: "",
    destination_facility_id: "",
    item_name: "EECP Patient Kit",
    quantity: 5,
    notes: "Urgent replenishment for outpatient clinic",
  });

  // Tab 3: E-Commerce Settings Form
  const [tab3Data, setTab3Data] = useState({
    enableECommerce: false,
    allowPracticeOrders: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load settings and data from backend
  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [s1, s2, s3, reqs, facs] = await Promise.all([
        api<any>("/settings/inventory/inventory-vaccine-settings").catch(() => null),
        api<any>("/settings/inventory/multi-facility-store-settings").catch(() => null),
        api<any>("/settings/inventory/e-commerce-settings").catch(() => null),
        api<Row[]>("/inventory/requisitions").catch(() => []),
        api<Row[]>("/facilities").catch(() => []),
      ]);

      if (s1 && Object.keys(s1).length > 0) {
        setTab1Data((prev) => ({ ...prev, ...s1 }));
      }
      if (s2 && Object.keys(s2).length > 0) {
        setTab2Data((prev) => ({ ...prev, ...s2 }));
      }
      if (s3 && Object.keys(s3).length > 0) {
        setTab3Data((prev) => ({ ...prev, ...s3 }));
      }
      setRequisitions(reqs || []);
      setFacilities(facs || []);
      if (facs && facs.length >= 2) {
        setNewReqData((prev) => ({
          ...prev,
          source_facility_id: facs[0].id,
          destination_facility_id: facs[1].id,
        }));
      }
    } catch (err: any) {
      console.error("Failed to load inventory settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save changes handler for the active tab
  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      if (activeOptionId === "inventory-vaccine-settings") {
        if (tab1Data.minKitThreshold < 0) {
          throw new Error("EECP Patient Kit Minimum Reorder Warning Level must be a positive number.");
        }
        if (tab1Data.alertOnExpiryDays < 0) {
          throw new Error("Days Before Expiry to Trigger Warning Alert must be a positive number.");
        }
        await api("/admin/settings/inventory/inventory-vaccine-settings", "PUT", tab1Data);
      } else if (activeOptionId === "multi-facility-store-settings") {
        await api("/admin/settings/inventory/multi-facility-store-settings", "PUT", tab2Data);
      } else if (activeOptionId === "e-commerce-settings") {
        await api("/admin/settings/inventory/e-commerce-settings", "PUT", tab3Data);
      }
      setSavedSuccess(true);
      notify("Inventory settings saved successfully.");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Tab 2 Requisition Handlers
  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqData.source_facility_id || !newReqData.destination_facility_id) {
      alert("Please select source and destination branches.");
      return;
    }
    if (newReqData.source_facility_id === newReqData.destination_facility_id) {
      alert("Source and destination facilities must be different.");
      return;
    }
    try {
      await api("/inventory/requisitions", "POST", newReqData);
      setNewReqModalOpen(false);
      notify("Inter-branch supply requisition created.");
      const updated = await api<Row[]>("/inventory/requisitions");
      setRequisitions(updated || []);
    } catch (err: any) {
      alert(err.message || "Failed to create requisition");
    }
  };

  const handleUpdateReqStatus = async (id: string, status: string) => {
    try {
      await api(`/inventory/requisitions/${id}/status`, "PATCH", { status });
      notify(`Requisition status updated to ${status}.`);
      const updated = await api<Row[]>("/inventory/requisitions");
      setRequisitions(updated || []);
    } catch (err: any) {
      alert(err.message || "Failed to update requisition status");
    }
  };

  const currentTabLabel =
    activeOptionId === "multi-facility-store-settings"
      ? "Multi Facility / Store Settings"
      : activeOptionId === "e-commerce-settings"
      ? "E-Commerce Settings"
      : "Inventory and Vaccine Settings";

  return (
    <div className="charm-settings-tab-inner" style={{ padding: "16px 20px" }}>
      {/* Subhead Strip with Breadcrumb & Save Changes */}
      <div className="charm-settings-subhead-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
            Heal Your Heart · Settings &gt; Inventory
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {currentTabLabel}
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {savedSuccess && (
            <span style={{ fontSize: 12, color: "#0d9488", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={14} /> Changes saved
            </span>
          )}
          <button
            type="button"
            className="charm-btn-primary-action"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "#00838f",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              padding: "7px 16px",
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#b91c1c", padding: "10px 14px", borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading configuration...</div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: INVENTORY AND VACCINE SETTINGS                                     */}
          {/* ========================================================================= */}
          {activeOptionId === "inventory-vaccine-settings" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 24px" }}>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 24 }}>
                Stock threshold alerts, batch tracking, expiry notices (EECP treatment kits, ECG electrodes).
              </p>

              {/* Setting 1 & 2: Numeric inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28, background: "#f8fafc", padding: 18, borderRadius: 6, border: "1px solid #f1f5f9" }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    EECP Patient Kit Minimum Reorder Warning Level <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tab1Data.minKitThreshold}
                    onChange={(e) => setTab1Data({ ...tab1Data, minKitThreshold: Math.max(0, parseInt(e.target.value) || 0) })}
                    style={{ width: "100%", maxWidth: 240, padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
                  />
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
                    Alert appears on clinical dashboard when stock falls below this quantity. Reference initial level: 10.
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Days Before Expiry to Trigger Warning Alert <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tab1Data.alertOnExpiryDays}
                    onChange={(e) => setTab1Data({ ...tab1Data, alertOnExpiryDays: Math.max(0, parseInt(e.target.value) || 0) })}
                    style={{ width: "100%", maxWidth: 240, padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
                  />
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
                    Notice generated for kits and electrodes nearing expiration. Reference initial level: 60 days.
                  </div>
                </div>
              </div>

              {/* Detailed CharmHealth Configuration Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* 1. Use Inventory Module */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                    1. We use inventory module and dispense products.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="useInventoryAndDispense"
                        checked={tab1Data.useInventoryAndDispense === true}
                        onChange={() => setTab1Data({ ...tab1Data, useInventoryAndDispense: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="useInventoryAndDispense"
                        checked={tab1Data.useInventoryAndDispense === false}
                        onChange={() => setTab1Data({ ...tab1Data, useInventoryAndDispense: false })}
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* 2. Recommend Drugs From In-House */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    2. We recommend the Drugs to Patients directly from in-house Inventory/Pharmacy.
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    Enables the provider to select the required batch while administering drugs and the administered quantity can be deducted from in-house inventory.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="recommendDrugsFromInHouse"
                        checked={tab1Data.recommendDrugsFromInHouse === true}
                        onChange={() => setTab1Data({ ...tab1Data, recommendDrugsFromInHouse: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="recommendDrugsFromInHouse"
                        checked={tab1Data.recommendDrugsFromInHouse === false}
                        onChange={() => setTab1Data({ ...tab1Data, recommendDrugsFromInHouse: false })}
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* 3. Auto-populate Drugs & Supplements in Invoice */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    3. Auto-populate Drugs &amp; Supplements details in Invoice from Chart Note.
                  </div>
                  <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={tab1Data.autoPopulateInvoiceFromChartNoteDrugs}
                        onChange={(e) => setTab1Data({ ...tab1Data, autoPopulateInvoiceFromChartNoteDrugs: e.target.checked })}
                      />
                      Drugs
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={tab1Data.autoPopulateInvoiceFromChartNoteSupplements}
                        onChange={(e) => setTab1Data({ ...tab1Data, autoPopulateInvoiceFromChartNoteSupplements: e.target.checked })}
                      />
                      Supplements
                    </label>
                  </div>
                </div>

                {/* 4. Auto-populate Dispense Quantity in Invoice */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    4. Auto-populate Dispense Quantity of Drugs &amp; Supplements in Invoice from Chart Note.
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    Quantity entered in the dispense field can populate the invoice quantity.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="autoPopulateDispenseQuantity"
                        checked={tab1Data.autoPopulateDispenseQuantity === true}
                        onChange={() => setTab1Data({ ...tab1Data, autoPopulateDispenseQuantity: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="autoPopulateDispenseQuantity"
                        checked={tab1Data.autoPopulateDispenseQuantity === false}
                        onChange={() => setTab1Data({ ...tab1Data, autoPopulateDispenseQuantity: false })}
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* 5. Supported Dosage Units Only */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    5. Auto-populate Dispense Quantity in Invoice only for Drugs/Supplements having supported dosage units.
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    Supported units include tablets, capsules, caplets, and pellets.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="autoPopulateOnlySupportedUnits"
                        checked={tab1Data.autoPopulateOnlySupportedUnits === true}
                        onChange={() => setTab1Data({ ...tab1Data, autoPopulateOnlySupportedUnits: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="autoPopulateOnlySupportedUnits"
                        checked={tab1Data.autoPopulateOnlySupportedUnits === false}
                        onChange={() => setTab1Data({ ...tab1Data, autoPopulateOnlySupportedUnits: false })}
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* 6. Show Stock in Encounter */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    6. Show available stock quantity of Drugs and Supplements in Encounter.
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    Available stock is displayed while prescribing during consultations.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="showStockInEncounter"
                        checked={tab1Data.showStockInEncounter === true}
                        onChange={() => setTab1Data({ ...tab1Data, showStockInEncounter: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="showStockInEncounter"
                        checked={tab1Data.showStockInEncounter === false}
                        onChange={() => setTab1Data({ ...tab1Data, showStockInEncounter: false })}
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* 7. Vaccines Inventory */}
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                    7. We use Vaccines and need Inventory management for Vaccines.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="useVaccinesInventory"
                        checked={tab1Data.useVaccinesInventory === true}
                        onChange={() => setTab1Data({ ...tab1Data, useVaccinesInventory: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="useVaccinesInventory"
                        checked={tab1Data.useVaccinesInventory === false}
                        onChange={() => setTab1Data({ ...tab1Data, useVaccinesInventory: false })}
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MULTI FACILITY / STORE SETTINGS                                    */}
          {/* ========================================================================= */}
          {activeOptionId === "multi-facility-store-settings" && (
            <div>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 24px", marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 20 }}>
                  Stock transfers between Neelankarai, Royapettah, Manapakkam and central store.
                </p>

                {/* Enable Multiple Store setting with Warning Trigger */}
                <div style={{ background: "#f8fafc", padding: 18, borderRadius: 6, border: "1px solid #e2e8f0", marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                    Enable Multiple Store
                  </div>
                  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="enableMultiStore"
                        checked={tab2Data.enableMultiStore === true}
                        onChange={() => {
                          if (!tab2Data.enableMultiStore) {
                            setMultiStoreWarningOpen(true);
                          }
                        }}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="enableMultiStore"
                        checked={tab2Data.enableMultiStore === false}
                        onChange={() => {
                          setTab2Data({ ...tab2Data, enableMultiStore: false });
                        }}
                      />
                      No
                    </label>
                  </div>
                  {tab2Data.enableMultiStore && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#0d9488", fontWeight: 600 }}>
                      ✓ Multi-Store feature active: Each branch operates its own dedicated store partition.
                    </div>
                  )}
                </div>

                {/* About the Feature */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f766e", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Info size={16} /> About the Feature
                  </h3>
                  <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>
                    When multiple stores are enabled, a practice can maintain a store specific to each facility.
                    The existing inventory store can be mapped to one facility, while other facilities can have their own stores.
                    Products must be configured in each facility's store before they can be dispensed from that facility.
                    Before enabling the feature, administrators should export existing products and prepare facility-specific product import files where necessary.
                  </p>
                </div>

                {/* Before and After Comparison (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginTop: 0, marginBottom: 10 }}>
                      Before Enabling
                    </h4>
                    <ol style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
                      <li style={{ marginBottom: 6 }}>A practice has one common store across all clinic branches.</li>
                      <li style={{ marginBottom: 6 }}>All facilities dispense products and supplies from that single store.</li>
                      <li>Billing Inventory templates can be used interchangeably across all facilities.</li>
                    </ol>
                  </div>

                  <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 6, padding: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginTop: 0, marginBottom: 10 }}>
                      After Enabling
                    </h4>
                    <ol style={{ fontSize: 12.5, color: "#134e4a", lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
                      <li style={{ marginBottom: 6 }}>Each facility maintains its own specific physical inventory store.</li>
                      <li style={{ marginBottom: 6 }}>Products are dispensed only when configured in the relevant facility store.</li>
                      <li>Billing Inventory templates become facility-specific for accurate stock accounting.</li>
                    </ol>
                  </div>
                </div>

                {/* Inter-Branch Supply Requisitions Setting */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18, marginTop: 18 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                    Inter-Branch Supply Requisitions
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#334155" }}>
                    <input
                      type="checkbox"
                      checked={tab2Data.enableInterBranchTransfers}
                      onChange={(e) => setTab2Data({ ...tab2Data, enableInterBranchTransfers: e.target.checked })}
                    />
                    <strong>Allow Inter-Branch Supply Requisitions</strong> (Enables clinic transfer requests between central Neelankarai and other centers)
                  </label>
                </div>
              </div>

              {/* Inter-Branch Store Transfer Workflow Table */}
              {tab2Data.enableInterBranchTransfers && (
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                        Inter-Branch Requisitions &amp; Warehouse Movements
                      </h3>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Track stock dispatches, receipts, and source-to-destination inventory reconciliation.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewReqModalOpen(true)}
                      style={{
                        background: "#f59e0b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 4,
                        padding: "6px 14px",
                        fontWeight: 600,
                        fontSize: 12.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Plus size={14} /> New Requisition
                    </button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="charm-settings-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                          <th style={{ padding: "8px 12px" }}>Requested On</th>
                          <th style={{ padding: "8px 12px" }}>Source Branch</th>
                          <th style={{ padding: "8px 12px" }}>Destination Branch</th>
                          <th style={{ padding: "8px 12px" }}>Item &amp; Qty</th>
                          <th style={{ padding: "8px 12px" }}>Requested By</th>
                          <th style={{ padding: "8px 12px" }}>Status</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requisitions.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
                              No inter-branch supply requisitions logged yet. Click "+ New Requisition" to request transfer stock.
                            </td>
                          </tr>
                        ) : (
                          requisitions.map((req) => (
                            <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 12px", color: "#64748b" }}>
                                {req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}
                              </td>
                              <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1e293b" }}>
                                {req.source_facility_name || "Central Store"}
                              </td>
                              <td style={{ padding: "8px 12px", fontWeight: 600, color: "#00838f" }}>
                                {req.destination_facility_name || "Branch Clinic"}
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                <strong>{req.item_name}</strong> × {req.quantity}
                              </td>
                              <td style={{ padding: "8px 12px", color: "#475569" }}>
                                {req.requested_by_name || "Clinic Staff"}
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 3,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background:
                                      req.status === "received"
                                        ? "#dcfce7"
                                        : req.status === "dispatched"
                                        ? "#e0e7ff"
                                        : req.status === "approved"
                                        ? "#fef3c7"
                                        : "#f1f5f9",
                                    color:
                                      req.status === "received"
                                        ? "#15803d"
                                        : req.status === "dispatched"
                                        ? "#4338ca"
                                        : req.status === "approved"
                                        ? "#b45309"
                                        : "#475569",
                                  }}
                                >
                                  {(req.status || "requested").toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                {req.status === "requested" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReqStatus(req.id, "approved")}
                                    style={{ fontSize: 11, padding: "3px 8px", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", borderRadius: 3, cursor: "pointer", marginRight: 6 }}
                                  >
                                    Approve
                                  </button>
                                )}
                                {req.status === "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReqStatus(req.id, "dispatched")}
                                    style={{ fontSize: 11, padding: "3px 8px", background: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 3, cursor: "pointer", marginRight: 6 }}
                                  >
                                    Dispatch
                                  </button>
                                )}
                                {req.status === "dispatched" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReqStatus(req.id, "received")}
                                    style={{ fontSize: 11, padding: "3px 8px", background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 3, cursor: "pointer" }}
                                  >
                                    Confirm Receipt
                                  </button>
                                )}
                                {req.status === "received" && (
                                  <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>Completed</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: E-COMMERCE SETTINGS                                                */}
          {/* ========================================================================= */}
          {activeOptionId === "e-commerce-settings" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 24px" }}>
              <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 6, padding: 18, marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f766e", display: "flex", alignItems: "center", gap: 6, marginTop: 0, marginBottom: 8 }}>
                  <ShoppingBag size={16} /> Patient Health Record (PHR) E-Commerce Portal
                </h3>
                <p style={{ fontSize: 13, color: "#134e4a", lineHeight: 1.6, margin: 0 }}>
                  The E-Commerce feature allows the practice to sell products from its inventory to registered patients through the Patient Health Record portal.
                  Once enabled, eligible inventory products can be displayed in the patient-facing store.
                  Patients can place orders through the portal, which are visible within the EHR Inventory Orders section and can be managed until dispatched or delivered.
                  When an order is placed, the ordered quantity must be tracked separately from available physical stock.
                  When the order is delivered, the reserved/delivered quantity is reconciled into physical inventory balances.
                </p>
              </div>

              {/* General Settings */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                    1. Enable E-Commerce feature for the practice.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="enableECommerce"
                        checked={tab3Data.enableECommerce === true}
                        onChange={() => setTab3Data({ ...tab3Data, enableECommerce: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="enableECommerce"
                        checked={tab3Data.enableECommerce === false}
                        onChange={() => setTab3Data({ ...tab3Data, enableECommerce: false })}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                    2. Allow Practice to place orders from EHR.
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="allowPracticeOrders"
                        checked={tab3Data.allowPracticeOrders === true}
                        onChange={() => setTab3Data({ ...tab3Data, allowPracticeOrders: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="allowPracticeOrders"
                        checked={tab3Data.allowPracticeOrders === false}
                        onChange={() => setTab3Data({ ...tab3Data, allowPracticeOrders: false })}
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment Gateway Status Card */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                  <ShieldAlert size={16} color="#64748b" /> Online Payment Gateway
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
                  Payment Gateway: <strong>Not Configured</strong> (Integration unavailable in local development).
                  Online payment transactions require verified merchant credentials. Products can currently be placed on cash-on-delivery or hospital billing invoice modes.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Multi-Store Enabling Confirmation Modal */}
      {multiStoreWarningOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: "#ffffff", borderRadius: 8, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b45309", marginBottom: 12 }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1e293b" }}>
                Important Multi-Store Migration Warning
              </h3>
            </div>

            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 16 }}>
              Enabling <strong>Multiple Stores</strong> partitions inventory catalogs across each physical clinic branch (Neelankarai, Royapettah, Manapakkam, etc.).
              This modification affects how inventory items and billing templates are bound to facilities.
              Disabling this feature later may require database support intervention rather than ordinary settings changes.
            </p>

            <p style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginBottom: 20 }}>
              Are you sure you want to enable Multiple Stores for the practice?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setMultiStoreWarningOpen(false)}
                style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 4, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab2Data({ ...tab2Data, enableMultiStore: true });
                  setMultiStoreWarningOpen(false);
                }}
                style={{ background: "#00838f", color: "#ffffff", border: "none", borderRadius: 4, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Confirm &amp; Enable Multi-Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Requisition Modal */}
      {newReqModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: "#ffffff", borderRadius: 8, maxWidth: 480, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", color: "#1e293b" }}>
              Create Inter-Branch Supply Requisition
            </h3>

            <form onSubmit={handleCreateRequisition}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Source Facility (Dispatching From) *
                </label>
                <select
                  value={newReqData.source_facility_id}
                  onChange={(e) => setNewReqData({ ...newReqData, source_facility_id: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
                  required
                >
                  <option value="">Select dispatch facility...</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Destination Facility (Requesting Branch) *
                </label>
                <select
                  value={newReqData.destination_facility_id}
                  onChange={(e) => setNewReqData({ ...newReqData, destination_facility_id: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
                  required
                >
                  <option value="">Select receiving facility...</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={newReqData.item_name}
                    onChange={(e) => setNewReqData({ ...newReqData, item_name: e.target.value })}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newReqData.quantity}
                    onChange={(e) => setNewReqData({ ...newReqData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Transfer Notes / Reason
                </label>
                <textarea
                  rows={2}
                  value={newReqData.notes}
                  onChange={(e) => setNewReqData({ ...newReqData, notes: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setNewReqModalOpen(false)}
                  style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 4, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#00838f", color: "#ffffff", border: "none", borderRadius: 4, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

