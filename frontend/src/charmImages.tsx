import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  Upload,
  Check,
  MoreHorizontal,
  X,
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  Eye,
  Download,
  ExternalLink,
  Layers,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import { api, branch, navigate, Row } from "./api";
import { useApp } from "./context";

// 14 Standard CharmHealth Image Types and their default cardiology examination tests
export const CHARM_IMAGE_TYPES: string[] = [
  "ABP",
  "Angiogram",
  "CT Scan",
  "Doppler scan",
  "ECG",
  "ECHO",
  "MRI",
  "PFT",
  "SPECT",
  "SphygmoCor",
  "Tread Mill Stress Test",
  "Ultrasound Scan",
  "Vascular Assessment & Heart Rate Variability",
  "X-ray",
];

export const DEFAULT_IMAGE_TESTS: Record<string, string[]> = {
  "ECHO": [
    "Ejection Fraction / RWMA / PAH [ 93306 ]",
    "2D Echocardiography with Color Doppler [ 93306 ]",
    "Transesophageal Echocardiography (TEE) [ 93312 ]",
    "Stress Echocardiography Complete [ 93351 ]",
    "Tissue Doppler Imaging (TDI) [ 93325 ]",
  ],
  "ECG": [
    "Resting [ 93000 ]",
    "12-Lead Electrocardiogram with Interpretation [ 93000 ]",
    "Rhythm ECG (1-3 leads) [ 93040 ]",
    "Signal-Averaged ECG [ 93278 ]",
  ],
  "Angiogram": [
    "Coronary Angiogram [ 93454 ]",
    "Left Heart Catheterization with Coronary Angiography [ 93458 ]",
    "Peripheral Angiogram Lower Extremity [ 75710 ]",
    "Renal Angiogram [ 75724 ]",
  ],
  "Tread Mill Stress Test": [
    "TMT - Bruce Protocol [ 93015 ]",
    "Exercise Stress Test with ECG Monitoring [ 93015 ]",
    "Modified Bruce Protocol [ 93015 ]",
    "Pharmacologic Stress Test [ 93015 ]",
  ],
  "Doppler scan": [
    "Carotid Doppler Bilateral [ 93880 ]",
    "Arterial Doppler Lower Extremity [ 93925 ]",
    "Venous Doppler Lower Extremity [ 93970 ]",
    "Renal Artery Doppler [ 93975 ]",
  ],
  "CT Scan": [
    "CT Coronary Angiography (CTCA) [ 75574 ]",
    "CT Calcium Score [ 75571 ]",
    "CT Chest without Contrast [ 71250 ]",
    "CT Angiography Aorta (Thoracic & Abdominal) [ 75635 ]",
  ],
  "MRI": [
    "Cardiac MRI with Contrast (Viability & Perfusion) [ 75561 ]",
    "Cardiac MRI Morphology and Function [ 75557 ]",
    "Magnetic Resonance Angiography (MRA) Chest [ 71555 ]",
  ],
  "PFT": [
    "Spirometry with Flow-Volume Loop [ 94010 ]",
    "Complete Pulmonary Function Test with DLCO [ 94060 ]",
    "Bronchodilator Responsiveness Spirometry [ 94070 ]",
  ],
  "SPECT": [
    "Myocardial Perfusion SPECT (Rest and Stress) [ 78452 ]",
    "Myocardial Viability SPECT [ 78451 ]",
  ],
  "SphygmoCor": [
    "Central Aortic Pressure & Pulse Wave Analysis [ 93050 ]",
    "Arterial Stiffness & Augmentation Index Assessment [ 93050 ]",
  ],
  "Vascular Assessment & Heart Rate Variability": [
    "HRV Autonomic Function Test [ 95921 ]",
    "EndoPAT Endothelial Function Assessment [ 93998 ]",
    "Ankle-Brachial Index (ABI) Bilateral [ 93922 ]",
  ],
  "Ultrasound Scan": [
    "Ultrasound Abdomen Complete [ 76700 ]",
    "Ultrasound Pelvis Non-Obstetric [ 76856 ]",
    "Ultrasound KUB [ 76770 ]",
  ],
  "ABP": [
    "24-Hour Ambulatory Blood Pressure Monitoring [ 93784 ]",
    "48-Hour Ambulatory Blood Pressure Monitoring [ 93784 ]",
  ],
  "X-ray": [
    "Chest X-Ray PA & Lateral [ 71046 ]",
    "Chest X-Ray Single View (PA) [ 71045 ]",
  ],
};

export interface SelectedImageTest {
  id: string;
  image_type: string;
  test_name: string;
  mapped_dx: string[];
}

export interface CharmImagesProps {
  patientId?: string;
  encounterId?: string;
  isGlobal?: boolean;
}

export function CharmImages({ patientId, encounterId, isGlobal }: CharmImagesProps) {
  const { user, staff, patients, notify } = useApp();
  const queryClient = useQueryClient();

  const isGlobalMode = !patientId || !!isGlobal;

  // Tabs: in Global mode default to "results" (matching CharmHealth video Frame 0025)
  const [activeSubTab, setActiveSubTab] = useState<"orders" | "results">(isGlobalMode ? "results" : "orders");
  const [viewMode, setViewMode] = useState<"list" | "add_order" | "edit_order" | "edit_result" | "import_result" | "viewer" | "print_view">("list");
  const [selectedRecord, setSelectedRecord] = useState<Row | null>(null);

  // Filters & Search for Results
  const [filterReviewer, setFilterReviewer] = useState<string>("all");
  const [filterResultStatus, setFilterResultStatus] = useState<string>("unsigned");
  const [resultSearchQuery, setResultSearchQuery] = useState<string>("");

  // Filters & Search for Orders
  const [filterOrderedBy, setFilterOrderedBy] = useState<string>("all");
  const [filterOrderStatus, setFilterOrderStatus] = useState<string>("pending_partial");
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");

  // Action Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Modals
  const [mapDxModalOpen, setMapDxModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState<"Practice" | "My">("Practice");
  const [showAllActiveDx, setShowAllActiveDx] = useState(true);
  const [mapAllDxChecked, setMapAllDxChecked] = useState(false);

  // Edit / Add Order Form State
  const [formPatientId, setFormPatientId] = useState<string>(patientId || "");
  const [formOrderedDate, setFormOrderedDate] = useState<string>(new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }));
  const [formOrderedBy, setFormOrderedBy] = useState<string>(user?.id || "");
  const [formActiveToolbarTab, setFormActiveToolbarTab] = useState<"search_add" | "templates" | "map_dx" | "past_orders" | "view_orders">("search_add");
  const [formImageType, setFormImageType] = useState<string>("ECHO");
  const [formImageTest, setFormImageTest] = useState<string>("");
  const [formSelectedTests, setFormSelectedTests] = useState<SelectedImageTest[]>([]);
  const [formNoteToPatient, setFormNoteToPatient] = useState<string>("");
  const [formIntraOfficeNotes, setFormIntraOfficeNotes] = useState<string>("");

  // Edit Result Form State
  const [resReviewerId, setResReviewerId] = useState<string>(user?.id || "");
  const [resDateTime, setResDateTime] = useState<string>(new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
  const [resComments, setResComments] = useState<string>("");
  const [resInterpretation, setResInterpretation] = useState<string>("");
  const [resUploadedDocs, setResUploadedDocs] = useState<Row[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Viewer State (Right sidebar)
  const [viewerReviewerId, setViewerReviewerId] = useState<string>(user?.id || "");
  const [viewerNoteToPatient, setViewerNoteToPatient] = useState<string>("");
  const [viewerInternalComments, setViewerInternalComments] = useState<string>("");
  const [viewerStatus, setViewerStatus] = useState<string>("Unsigned");

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch all orders from backend
  const { data: allOrders = [], refetch: refetchOrders } = useQuery<Row[]>({
    queryKey: ["records", "orders"],
    queryFn: () => api("/records/orders"),
  });

  // Fetch diagnoses for patient
  const targetPatientId = formPatientId || patientId;
  const { data: allDiagnoses = [] } = useQuery<Row[]>({
    queryKey: ["records", "diagnoses"],
    queryFn: () => api("/records/diagnoses"),
  });

  // Fetch catalogs for image tests & templates
  const { data: testCatalogs = [] } = useQuery<Row[]>({
    queryKey: ["catalogs", "image_test"],
    queryFn: () => api("/catalogs?kind=image_test"),
  });

  const { data: templateCatalogs = [] } = useQuery<Row[]>({
    queryKey: ["catalogs", "image_template"],
    queryFn: () => api("/catalogs?kind=image_template"),
  });

  // Filter image orders (kind in ('Image', 'Imaging'))
  const imageOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const isImg = o.kind === "Image" || o.kind === "Imaging";
      if (!isImg) return false;
      if (!isGlobalMode && patientId) {
        return o.patient_id === patientId;
      }
      return true;
    });
  }, [allOrders, isGlobalMode, patientId]);

  // Derived: Orders tab listing (typically Pending / Partial orders)
  const ordersTabList = useMemo(() => {
    return imageOrders.filter((o) => {
      // Filter by Ordered By
      if (filterOrderedBy !== "all" && o.author_id !== filterOrderedBy) {
        return false;
      }
      // Filter by Order Status
      const statusLower = (o.status || "").toLowerCase();
      if (filterOrderStatus === "pending_partial") {
        if (!["pending", "partial", "ordered"].includes(statusLower)) return false;
      } else if (filterOrderStatus !== "all") {
        if (statusLower !== filterOrderStatus.toLowerCase()) return false;
      }
      // Filter by Search Query
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const pName = (o.patient_name || "").toLowerCase();
        const mrn = (o.patient_mrn || "").toLowerCase();
        const ref = (o.lab_ref || "").toLowerCase();
        const test = (o.name || "").toLowerCase();
        return pName.includes(q) || mrn.includes(q) || ref.includes(q) || test.includes(q);
      }
      return true;
    });
  }, [imageOrders, filterOrderedBy, filterOrderStatus, orderSearchQuery]);

  // Derived: Results tab listing (orders that have results or are completed/resulted/reviewed)
  const resultsTabList = useMemo(() => {
    return imageOrders.filter((o) => {
      // Must be a resulted or completed order, or have documents / results
      const statusLower = (o.status || "").toLowerCase();
      const hasResult = !!o.result || (o.documents && o.documents.length > 0) || ["completed", "resulted", "reviewed"].includes(statusLower);
      if (!hasResult) return false;

      // Filter by Reviewer
      if (filterReviewer !== "all" && o.reviewed_by !== filterReviewer && o.author_id !== filterReviewer) {
        return false;
      }
      // Filter by Status: "unsigned" (not reviewed), "reviewed", "all"
      if (filterResultStatus === "unsigned") {
        if (statusLower === "reviewed") return false;
      } else if (filterResultStatus === "reviewed") {
        if (statusLower !== "reviewed") return false;
      }
      // Filter by search
      if (resultSearchQuery.trim()) {
        const q = resultSearchQuery.toLowerCase();
        const pName = (o.patient_name || "").toLowerCase();
        const mrn = (o.patient_mrn || "").toLowerCase();
        const test = (o.name || "").toLowerCase();
        return pName.includes(q) || mrn.includes(q) || test.includes(q);
      }
      return true;
    });
  }, [imageOrders, filterReviewer, filterResultStatus, resultSearchQuery]);

  // Patient diagnoses for Map Dx
  const patientDiagnoses = useMemo(() => {
    return allDiagnoses.filter((d) => d.patient_id === targetPatientId && d.status === "active");
  }, [allDiagnoses, targetPatientId]);

  // Doctors for dropdowns
  const doctorsList = useMemo(() => {
    return (staff || []).filter((s) => s.role === "doctor");
  }, [staff]);

  // Available tests for selected Image Type
  const availableTestsForType = useMemo(() => {
    const fromCat = testCatalogs
      .filter((c) => {
        try {
          const content = JSON.parse(c.content || "{}");
          return content.image_type === formImageType;
        } catch {
          return false;
        }
      })
      .map((c) => c.name);
    if (fromCat.length > 0) return fromCat;
    return DEFAULT_IMAGE_TESTS[formImageType] || [];
  }, [testCatalogs, formImageType]);

  // Set default test name when image type changes
  useEffect(() => {
    if (availableTestsForType.length > 0) {
      setFormImageTest(availableTestsForType[0]);
    } else {
      setFormImageTest("");
    }
  }, [formImageType, availableTestsForType]);

  // Reset form when entering Add Order
  function handleOpenAddOrder() {
    setSelectedRecord(null);
    setFormPatientId(patientId || (patients && patients[0]?.id) || "");
    setFormOrderedDate(new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }));
    setFormOrderedBy(user?.id || "");
    setFormImageType("ECHO");
    setFormSelectedTests([]);
    setFormNoteToPatient("");
    setFormIntraOfficeNotes("");
    setViewMode("add_order");
  }

  // Open Edit Order
  function handleOpenEditOrder(order: Row) {
    setSelectedRecord(order);
    setFormPatientId(order.patient_id);
    setFormOrderedDate(order.ordered_date || new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }));
    setFormOrderedBy(order.author_id || user?.id || "");
    setFormNoteToPatient(order.notes_lab_patient || "");
    setFormIntraOfficeNotes(order.notes_intra_office || "");

    // Parse existing tests from order_metadata
    let loadedTests: SelectedImageTest[] = [];
    try {
      const meta = JSON.parse(order.order_metadata || "{}");
      if (meta.tests && Array.isArray(meta.tests)) {
        loadedTests = meta.tests.map((t: any, idx: number) => ({
          id: `test-${idx}-${Date.now()}`,
          image_type: t.image_type || "ECHO",
          test_name: t.test_name || order.name,
          mapped_dx: t.mapped_dx || [],
        }));
      }
    } catch { }

    if (loadedTests.length === 0) {
      // Fallback from order.name (e.g. "ECHO : Ejection Fraction / RWMA / PAH")
      const parts = (order.name || "").split(" : ");
      const imgType = parts.length > 1 ? parts[0] : "ECHO";
      const testName = parts.length > 1 ? parts.slice(1).join(" : ") : order.name;
      loadedTests = [
        {
          id: `test-0-${Date.now()}`,
          image_type: imgType,
          test_name: testName,
          mapped_dx: [],
        },
      ];
    }
    setFormSelectedTests(loadedTests);
    setViewMode("edit_order");
  }

  // Open Edit Result
  function handleOpenEditResult(record: Row) {
    setSelectedRecord(record);
    setResReviewerId(record.reviewed_by || record.author_id || user?.id || "");
    setResDateTime(record.ordered_date || new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
    setResComments(record.notes_intra_office || "");
    setResInterpretation(record.result || "");
    setResUploadedDocs(record.documents || []);
    setViewMode("edit_result");
  }

  // Open Import Result
  function handleOpenImportResult(order: Row) {
    setSelectedRecord(order);
    setResReviewerId(user?.id || "");
    setResDateTime(new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
    setResComments(order.notes_intra_office || "");
    setResInterpretation("");
    setResUploadedDocs(order.documents || []);
    setViewMode("import_result");
  }

  // Open Report Viewer
  function handleOpenViewer(record: Row) {
    setSelectedRecord(record);
    setViewerReviewerId(record.reviewed_by || record.author_id || user?.id || "");
    setViewerNoteToPatient(record.notes_lab_patient || "");
    setViewerInternalComments(record.notes_intra_office || "");
    setViewerStatus(record.status === "reviewed" ? "Reviewed" : "Unsigned");
    setViewMode("viewer");
  }

  // Add test to selection
  function handleAddTest() {
    if (!formImageTest) return;
    const newTest: SelectedImageTest = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      image_type: formImageType,
      test_name: formImageTest,
      mapped_dx: [],
    };
    setFormSelectedTests([...formSelectedTests, newTest]);
  }

  // Remove test from selection
  function handleRemoveTest(id: string) {
    setFormSelectedTests(formSelectedTests.filter((t) => t.id !== id));
  }

  // Apply template
  function handleApplyTemplate(template: Row) {
    try {
      const content = JSON.parse(template.content || "{}");
      if (content.tests && Array.isArray(content.tests)) {
        const newTests: SelectedImageTest[] = content.tests.map((t: any, idx: number) => ({
          id: `tpl-${Date.now()}-${idx}`,
          image_type: t.image_type || "ECHO",
          test_name: t.test_name || "",
          mapped_dx: [],
        }));
        setFormSelectedTests([...formSelectedTests, ...newTests]);
        notify(`Applied template "${template.name}"`);
      }
    } catch {
      notify("Failed to parse template tests");
    }
    setTemplatesModalOpen(false);
  }

  // Save Map Dx changes
  function handleSaveMapDx(testMappings: Record<string, string[]>) {
    const updated = formSelectedTests.map((t) => {
      if (testMappings[t.id]) {
        return { ...t, mapped_dx: testMappings[t.id] };
      }
      return t;
    });
    setFormSelectedTests(updated);
    setMapDxModalOpen(false);
    notify("Diagnoses mapped successfully");
  }

  // Save Order (Create or Update)
  async function handleSaveOrder() {
    if (!formPatientId) {
      notify("Please select a patient");
      return;
    }
    if (formSelectedTests.length === 0) {
      notify("Please add at least one test to the order");
      return;
    }

    const primaryTest = formSelectedTests[0];
    const orderTitle = formSelectedTests.length === 1
      ? `${primaryTest.image_type} : ${primaryTest.test_name.replace(/\[.*?\]/g, "").trim()}`
      : `${primaryTest.image_type} : ${primaryTest.test_name.replace(/\[.*?\]/g, "").trim()} (+${formSelectedTests.length - 1} tests)`;

    const meta = {
      tests: formSelectedTests.map((t) => ({
        image_type: t.image_type,
        test_name: t.test_name,
        mapped_dx: t.mapped_dx,
      })),
    };

    try {
      if (viewMode === "edit_order" && selectedRecord) {
        await api(`/records/orders/${selectedRecord.id}`, "PUT", {
          name: orderTitle,
          ordered_date: formOrderedDate,
          notes_lab_patient: formNoteToPatient,
          notes_intra_office: formIntraOfficeNotes,
          order_metadata: JSON.stringify(meta),
        });
        notify("Image order updated successfully");
      } else {
        await api("/records/orders", "POST", {
          patient_id: formPatientId,
          kind: "Image",
          name: orderTitle,
          ordered_date: formOrderedDate,
          status: "Pending",
          notes_lab_patient: formNoteToPatient,
          notes_intra_office: formIntraOfficeNotes,
          order_metadata: JSON.stringify(meta),
        });
        notify("Image order created successfully");
      }
      await queryClient.invalidateQueries({ queryKey: ["records", "orders"] });
      refetchOrders();
      setViewMode("list");
    } catch (err: any) {
      notify(err.message || "Failed to save image order");
    }
  }

  // Upload file for result
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedRecord) return;

    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("patient_id", selectedRecord.patient_id);
    fd.append("order_id", selectedRecord.id);
    fd.append("title", file.name);
    fd.append("file", file);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "X-Facility-Id": branch || "",
        },
        body: fd,
      });
      if (!res.ok) throw new Error("Document upload failed");
      const doc = await res.json();
      setResUploadedDocs([...resUploadedDocs, doc]);
      notify(`Uploaded "${file.name}"`);
      refetchOrders();
    } catch (err: any) {
      notify(err.message || "Upload failed");
    } finally {
      setUploadingDoc(false);
    }
  }

  // Delete uploaded doc
  async function handleDeleteDoc(docId: string) {
    if (!confirm("Remove this uploaded document?")) return;
    try {
      await api(`/documents/${docId}`, "DELETE");
      setResUploadedDocs(resUploadedDocs.filter((d) => d.id !== docId));
      notify("Document removed");
      refetchOrders();
    } catch (err: any) {
      notify(err.message || "Failed to remove document");
    }
  }

  // Save Result
  async function handleSaveResult() {
    if (!selectedRecord) return;
    try {
      await api(`/orders/${selectedRecord.id}/result`, "POST", {
        version: selectedRecord.version || 1,
        result: resInterpretation || "Imaging examination completed. Findings documented.",
        status: "Completed",
        values: [],
      });
      await api(`/records/orders/${selectedRecord.id}`, "PUT", {
        notes_intra_office: resComments,
        notes_lab_patient: formNoteToPatient,
      });
      notify("Image result saved successfully");
      await queryClient.invalidateQueries({ queryKey: ["records", "orders"] });
      refetchOrders();
      setViewMode("list");
    } catch (err: any) {
      notify(err.message || "Failed to save result");
    }
  }

  // Save Viewer Review
  async function handleSaveViewerReview() {
    if (!selectedRecord) return;
    try {
      await api(`/orders/${selectedRecord.id}/review`, "POST", {
        version: selectedRecord.version,
        notes_lab_patient: viewerNoteToPatient,
        notes_intra_office: viewerInternalComments,
      });
      setViewerStatus("Reviewed");
      notify("Image result reviewed and signed successfully");
      await queryClient.invalidateQueries({ queryKey: ["records", "orders"] });
      refetchOrders();
    } catch (err: any) {
      notify(err.message || "Failed to review result");
    }
  }

  // Delete an Order / Result
  async function handleDeleteOrder(id: string) {
    if (!confirm("Are you sure you want to delete this image record?")) return;
    try {
      await api(`/records/orders/${id}`, "DELETE");
      notify("Image record deleted");
      await queryClient.invalidateQueries({ queryKey: ["records", "orders"] });
      refetchOrders();
    } catch (err: any) {
      notify(err.message || "Failed to delete record");
    }
  }

  // Mark Order as Completed
  async function handleMarkCompleted(order: Row) {
    try {
      await api(`/records/orders/${order.id}/status`, "POST", {
        version: order.version,
        status: "Completed",
      });
      notify("Order marked as Completed");
      await queryClient.invalidateQueries({ queryKey: ["records", "orders"] });
      refetchOrders();
    } catch (err: any) {
      notify(err.message || "Failed to update status");
    }
  }

  // =========================================================================
  // RENDER: VIEW MODE - REPORT VIEWER (70/30 Split - Frame 0040)
  // =========================================================================
  if (viewMode === "viewer" && selectedRecord) {
    const doc = selectedRecord.documents && selectedRecord.documents[0];
    const docUrl = doc ? `/api/documents/${doc.id}/download` : null;

    return (
      <div className="charm-viewer-wrapper" style={{ background: "#f8fafc", minHeight: "85vh", padding: "12px 16px" }}>
        {/* Top Breadcrumb & Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setViewMode("list")}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: "#0284c7", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
            >
              <ArrowLeft size={16} /> Back to Image Results
            </button>
            <span style={{ color: "#94a3b8" }}>|</span>
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>
              {selectedRecord.patient_name} ({selectedRecord.patient_mrn}) - {selectedRecord.name}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {docUrl && (
              <a
                href={docUrl}
                download={doc.filename}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#f1f5f9", borderRadius: 4, border: "1px solid #cbd5e1", color: "#334155", fontSize: 12, textDecoration: "none", fontWeight: 500 }}
              >
                <Download size={14} /> Download PDF
              </a>
            )}
            <button
              onClick={() => window.print()}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#f1f5f9", borderRadius: 4, border: "1px solid #cbd5e1", color: "#334155", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{ padding: "6px 12px", background: "#ffffff", borderRadius: 4, border: "1px solid #cbd5e1", color: "#475569", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
            >
              Close
            </button>
          </div>
        </div>

        {/* 70/30 Split Layout */}
        <div style={{ display: "flex", gap: 16, height: "calc(85vh - 60px)" }}>
          {/* Left Pane (70%): PDF / Report Document Preview */}
          <div style={{ flex: "0 0 70%", background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "10px 16px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                <FileText size={16} color="#0d9488" />
                <span>{doc ? doc.title : "Diagnostic Imaging Examination Report"}</span>
              </div>
              {docUrl && (
                <a href={docUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0284c7", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                  <ExternalLink size={13} /> Open in new tab
                </a>
              )}
            </div>

            <div style={{ flex: 1, overflow: "auto", position: "relative", background: "#f8fafc" }}>
              <div style={{ background: "#ffffff", minHeight: "100%", padding: 32, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1e293b" }}>
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: 18, fontWeight: 700 }}>HEAL YOUR HEART - CARDIOLOGY & EECP CENTER</h2>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Comprehensive Cardiovascular Diagnostics & Non-Invasive Therapy</p>
                  </div>
                  {doc && (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", padding: "4px 10px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11, color: "#334155", fontWeight: 600 }}>
                        <FileText size={14} color="#0d9488" /> {doc.filename}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, fontSize: 13, borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
                  <div><strong style={{ color: "#475569" }}>Patient:</strong> <span style={{ color: "#0284c7", fontWeight: 600 }}>{selectedRecord.patient_name}</span></div>
                  <div><strong style={{ color: "#475569" }}>MRN:</strong> <span style={{ fontFamily: "monospace" }}>{selectedRecord.patient_mrn}</span></div>
                  <div><strong style={{ color: "#475569" }}>Ordered Date:</strong> {selectedRecord.ordered_date}</div>
                  <div><strong style={{ color: "#475569" }}>Reviewer:</strong> {selectedRecord.ordered_by || "Dr. Prem Sekar"}</div>
                  <div style={{ gridColumn: "1 / -1" }}><strong style={{ color: "#475569" }}>Examination:</strong> <span style={{ color: "#0f172a", fontWeight: 600 }}>{selectedRecord.name}</span></div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "#334155" }}>Parameter Findings</h4>
                  <div style={{ fontSize: 13, lineHeight: 1.6, background: "#f8fafc", padding: 14, borderRadius: 4, border: "1px solid #e2e8f0", color: "#1e293b" }}>
                    {selectedRecord.notes_intra_office || "Normal Left Ventricular Systolic Function. Left ventricular ejection fraction (LVEF) 60%. Left atrium normal in size. No regional wall motion abnormalities detected at rest. Normal valvular morphology with trivial mitral regurgitation."}
                  </div>
                </div>

                <div style={{ marginBottom: 30 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "#334155" }}>Impression / Diagnostic Conclusion</h4>
                  <div style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500, color: "#0f172a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 4 }}>
                    {selectedRecord.result || "Normal left ventricular systolic function (LVEF 60%). No regional wall motion abnormality. Good cardiac reserve."}
                  </div>
                </div>

                <div style={{ marginTop: 40, borderTop: "1px dashed #cbd5e1", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#64748b" }}>
                  <div>Status: <span style={{ color: "#16a34a", fontWeight: 600 }}>● Electronically Verified & Signed</span></div>
                  <div style={{ fontWeight: 600, color: "#1e293b" }}>Dr. Prem Sekar, MD, DM (Cardiology)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane (30%): Review Sidebar Panel - Frame 0040 */}
          <div style={{ flex: "0 0 calc(30% - 16px)", background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
              Image Result Details
            </div>

            {/* Metadata Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Result Date:</span>
                <span style={{ fontWeight: 500, color: "#1e293b" }}>{selectedRecord.ordered_date || "Nov 06, 2026 09:27 PM"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Result Interpretation:</span>
                <span style={{ padding: "2px 8px", background: "#dcfce7", color: "#166534", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                  {selectedRecord.status || "Completed"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Review Status:</span>
                <span style={{ padding: "2px 8px", background: viewerStatus === "Reviewed" ? "#dbeafe" : "#fef3c7", color: viewerStatus === "Reviewed" ? "#1e40af" : "#92400e", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                  {viewerStatus}
                </span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Reviewer :
              </label>
              <select
                value={viewerReviewerId}
                onChange={(e) => setViewerReviewerId(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
              >
                {doctorsList.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Note to Patient
              </label>
              <textarea
                value={viewerNoteToPatient}
                onChange={(e) => setViewerNoteToPatient(e.target.value)}
                placeholder="Enter note visible to patient..."
                rows={3}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", resize: "vertical" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 2 }}>
                Internal Comments
              </label>
              <span style={{ display: "block", fontSize: 11, color: "#dc2626", fontStyle: "italic", marginBottom: 4 }}>
                *Not shared with Patient*
              </span>
              <textarea
                value={viewerInternalComments}
                onChange={(e) => setViewerInternalComments(e.target.value)}
                placeholder="Internal clinical notes..."
                rows={4}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", resize: "vertical" }}
              />
            </div>

            <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", gap: 8 }}>
              <button
                onClick={handleSaveViewerReview}
                style={{ flex: 1, padding: "8px 14px", background: "#0d9488", color: "#ffffff", border: "none", borderRadius: 4, fontWeight: 600, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Check size={14} /> Save & Sign
              </button>
              <button
                onClick={() => setViewMode("list")}
                style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 4, fontWeight: 500, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: VIEW MODE - ADD / EDIT IMAGE ORDER SCREEN (Frame 0070 & 0080)
  // =========================================================================
  if (viewMode === "add_order" || viewMode === "edit_order") {
    const isEdit = viewMode === "edit_order";

    return (
      <div className="charm-order-form-container" style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: "16px 20px", maxWidth: 1100, margin: "10px auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {/* Top Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
          <button
            onClick={() => setViewMode("list")}
            style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: 600, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
          >
            <ArrowLeft size={15} /> Image Orders
          </button>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
            {isEdit ? "Edit Image Order" : "Add Image Order"}
          </span>
        </div>

        {/* Patient and Clinician Info Row */}
        <div style={{ display: "grid", gridTemplateColumns: isGlobalMode ? "1.5fr 1fr 1fr" : "1fr 1fr", gap: 16, marginBottom: 16, background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
          {isGlobalMode && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Patient <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={formPatientId}
                onChange={(e) => setFormPatientId(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
              >
                {(patients || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.mrn})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Ordered Date <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={formOrderedDate}
              onChange={(e) => setFormOrderedDate(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Ordered By <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={formOrderedBy}
              onChange={(e) => setFormOrderedBy(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
            >
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Toolbar Subtabs (Search & Add / Templates / Map Dx / Past Orders / View Orders) - Frame 0070 */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e2e8f0", marginBottom: 14 }}>
          <button
            onClick={() => setFormActiveToolbarTab("search_add")}
            style={{
              padding: "6px 14px",
              background: formActiveToolbarTab === "search_add" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: formActiveToolbarTab === "search_add" ? "2px solid #0d9488" : "2px solid transparent",
              color: formActiveToolbarTab === "search_add" ? "#0d9488" : "#64748b",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            Search & Add
          </button>
          <button
            onClick={() => {
              setFormActiveToolbarTab("templates");
              setTemplatesModalOpen(true);
            }}
            style={{
              padding: "6px 14px",
              background: formActiveToolbarTab === "templates" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: formActiveToolbarTab === "templates" ? "2px solid #0d9488" : "2px solid transparent",
              color: formActiveToolbarTab === "templates" ? "#0d9488" : "#64748b",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            Templates
          </button>
          <button
            onClick={() => {
              setFormActiveToolbarTab("map_dx");
              setMapDxModalOpen(true);
            }}
            style={{
              padding: "6px 14px",
              background: formActiveToolbarTab === "map_dx" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: formActiveToolbarTab === "map_dx" ? "2px solid #0d9488" : "2px solid transparent",
              color: formActiveToolbarTab === "map_dx" ? "#0d9488" : "#64748b",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            Map Dx
          </button>
          <button
            onClick={() => setFormActiveToolbarTab("past_orders")}
            style={{
              padding: "6px 14px",
              background: formActiveToolbarTab === "past_orders" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: formActiveToolbarTab === "past_orders" ? "2px solid #0d9488" : "2px solid transparent",
              color: formActiveToolbarTab === "past_orders" ? "#0d9488" : "#64748b",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            Past Orders
          </button>
          <button
            onClick={() => setFormActiveToolbarTab("view_orders")}
            style={{
              padding: "6px 14px",
              background: formActiveToolbarTab === "view_orders" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: formActiveToolbarTab === "view_orders" ? "2px solid #0d9488" : "2px solid transparent",
              color: formActiveToolbarTab === "view_orders" ? "#0d9488" : "#64748b",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            View Orders
          </button>
        </div>

        {/* Search & Add Panel - Frame 0080 exact 14 Image Types */}
        {formActiveToolbarTab === "search_add" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr auto", gap: 12, alignItems: "end", background: "#f8fafc", padding: 12, borderRadius: 6, marginBottom: 16, border: "1px solid #e2e8f0" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Image Type <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={formImageType}
                onChange={(e) => setFormImageType(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, background: "#ffffff", color: "#1e293b" }}
              >
                {CHARM_IMAGE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Image Test <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={formImageTest}
                onChange={(e) => setFormImageTest(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, background: "#ffffff", color: "#1e293b" }}
              >
                {availableTestsForType.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddTest}
              className="charm-btn-teal"
              style={{
                padding: "7px 18px",
                background: "var(--brand-teal-primary, #00838f)",
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        )}

        {/* Selected Tests Table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
            Selected Tests ({formSelectedTests.length})
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e2e8f0" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "8px 12px", width: "22%" }}>Image Type</th>
                <th style={{ padding: "8px 12px", width: "45%" }}>Image Test</th>
                <th style={{ padding: "8px 12px", width: "25%" }}>Mapped Dx Codes</th>
                <th style={{ padding: "8px 12px", width: "8%", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {formSelectedTests.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "20px 12px", textAlign: "center", color: "#94a3b8" }}>
                    No tests selected. Choose an Image Type and Test above and click "+ Add" or select from Templates.
                  </td>
                </tr>
              ) : (
                formSelectedTests.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500, color: "#1e293b" }}>{t.image_type}</td>
                    <td style={{ padding: "8px 12px", color: "#0284c7", fontWeight: 500 }}>{t.test_name}</td>
                    <td style={{ padding: "8px 12px", color: "#475569" }}>
                      {t.mapped_dx && t.mapped_dx.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {t.mapped_dx.map((code) => (
                            <span key={code} style={{ padding: "1px 6px", background: "#e0f2fe", color: "#0369a1", borderRadius: 3, fontSize: 11 }}>
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setMapDxModalOpen(true);
                          }}
                          style={{ background: "transparent", border: "none", color: "#ea580c", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                        >
                          + Map Dx
                        </button>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => handleRemoveTest(t.id)}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                        title="Remove Test"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Notes Textareas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Note to Patient
            </label>
            <textarea
              value={formNoteToPatient}
              onChange={(e) => setFormNoteToPatient(e.target.value)}
              placeholder="Instructions or notes for patient..."
              rows={3}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", resize: "vertical" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Intra Office Notes
            </label>
            <textarea
              value={formIntraOfficeNotes}
              onChange={(e) => setFormIntraOfficeNotes(e.target.value)}
              placeholder="Internal clinic notes..."
              rows={3}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", resize: "vertical" }}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
          <button
            onClick={() => setViewMode("list")}
            style={{ padding: "7px 18px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveOrder}
            style={{ padding: "7px 22px", background: "#0d9488", border: "none", color: "#ffffff", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Save
          </button>
        </div>

        {/* MODAL: MAP DX (Frame 0095) */}
        {mapDxModalOpen && (
          <MapDxModal
            patientDiagnoses={patientDiagnoses}
            selectedTests={formSelectedTests}
            onClose={() => setMapDxModalOpen(false)}
            onSave={handleSaveMapDx}
          />
        )}

        {/* MODAL: TEMPLATES */}
        {templatesModalOpen && (
          <TemplatesModal
            templates={templateCatalogs}
            onClose={() => setTemplatesModalOpen(false)}
            onApply={handleApplyTemplate}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: VIEW MODE - EDIT / IMPORT IMAGE RESULT SCREEN (Frame 0050 & 0060)
  // =========================================================================
  if (viewMode === "edit_result" || viewMode === "import_result") {
    const isImport = viewMode === "import_result";

    return (
      <div className="charm-result-form-container" style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: "16px 20px", maxWidth: 950, margin: "10px auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {/* Top Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
          <button
            onClick={() => setViewMode("list")}
            style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: 600, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
          >
            <ArrowLeft size={15} /> {isImport ? "Image Orders" : "Image Results"}
          </button>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
            {isImport ? "Import Image Result" : "Edit Image Result"}
          </span>
        </div>

        {/* Metadata Header Box - Frame 0050 */}
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0", marginBottom: 16, display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 14 }}>
          <div>
            <span style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 2 }}>Patient</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
              {selectedRecord?.patient_name} ({selectedRecord?.patient_mrn})
            </span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 2 }}>Reviewer</span>
            <select
              value={resReviewerId}
              onChange={(e) => setResReviewerId(e.target.value)}
              style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
            >
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 2 }}>Date Time</span>
            <input
              type="text"
              value={resDateTime}
              onChange={(e) => setResDateTime(e.target.value)}
              style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b" }}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 2 }}>Test</span>
            <span style={{ display: "inline-block", padding: "3px 10px", background: "#e0f2fe", color: "#0369a1", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
              {selectedRecord?.name}
            </span>
          </div>
        </div>

        {/* Document Upload Section - Frame 0050 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Documents / Scan Reports
            </span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "#0d9488", color: "#ffffff", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: uploadingDoc ? "not-allowed" : "pointer" }}>
              <Upload size={14} /> {uploadingDoc ? "Uploading..." : "Upload Document"}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                disabled={uploadingDoc}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {resUploadedDocs.length === 0 ? (
            <div style={{ padding: "16px 12px", textAlign: "center", color: "#94a3b8", fontSize: 12, background: "#f8fafc", borderRadius: 4, border: "1px dashed #cbd5e1" }}>
              No document uploaded yet. Click "Upload Document" to attach an imaging PDF or scan report.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {resUploadedDocs.map((doc) => (
                <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={16} color="#0d9488" />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{doc.title || doc.filename}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>({Math.round((doc.size || 0) / 1024)} KB)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      download={doc.filename}
                      style={{ color: "#0284c7", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, textDecoration: "none" }}
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Textarea */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Comments
          </label>
          <textarea
            value={resComments}
            onChange={(e) => setResComments(e.target.value)}
            placeholder="Clinical observations, parameter measurements, quality of scan..."
            rows={4}
            style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", resize: "vertical" }}
          />
        </div>

        {/* Param Interpretation Textarea */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Param Interpretation / Impression
          </label>
          <textarea
            value={resInterpretation}
            onChange={(e) => setResInterpretation(e.target.value)}
            placeholder="Diagnostic impression, conclusion, recommendations..."
            rows={3}
            style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", resize: "vertical" }}
          />
        </div>

        {/* Footer Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
          <button
            onClick={() => setViewMode("list")}
            style={{ padding: "7px 18px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveResult}
            style={{ padding: "7px 22px", background: "#0d9488", border: "none", color: "#ffffff", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Save Result
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: DEFAULT VIEW - TABBED INTERFACE (IMAGE RESULTS & IMAGE ORDERS)
  // =========================================================================
  return (
    <div className="charm-images-container" style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", minHeight: "82vh" }}>
      {/* Top Main Navigation Tabs: Image Results | Image Orders */}
      <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", padding: "0 16px", background: "#fafafa" }}>
        <button
          onClick={() => setActiveSubTab("results")}
          style={{
            padding: "12px 20px",
            background: "transparent",
            border: "none",
            borderBottom: activeSubTab === "results" ? "2px solid #0d9488" : "2px solid transparent",
            color: activeSubTab === "results" ? "#0d9488" : "#475569",
            fontWeight: activeSubTab === "results" ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: -2,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FileText size={15} />
          Image Results
        </button>
        <button
          onClick={() => setActiveSubTab("orders")}
          style={{
            padding: "12px 20px",
            background: "transparent",
            border: "none",
            borderBottom: activeSubTab === "orders" ? "2px solid #0d9488" : "2px solid transparent",
            color: activeSubTab === "orders" ? "#0d9488" : "#475569",
            fontWeight: activeSubTab === "orders" ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: -2,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Layers size={15} />
          Image Orders
        </button>
      </div>

      {/* =====================================================================
          TAB 1: IMAGE RESULTS (Frame 0025 & 0030)
          ===================================================================== */}
      {activeSubTab === "results" && (
        <div style={{ padding: "12px 16px" }}>
          {/* Filter Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>Reviewer :</span>
                <select
                  value={filterReviewer}
                  onChange={(e) => setFilterReviewer(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
                >
                  <option value="all">All</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>Status :</span>
                <select
                  value={filterResultStatus}
                  onChange={(e) => setFilterResultStatus(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
                >
                  <option value="unsigned">Unsigned</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="all">All</option>
                </select>
              </div>

              {/* Patient search input */}
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 8, top: 7, color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search by Patient"
                  value={resultSearchQuery}
                  onChange={(e) => setResultSearchQuery(e.target.value)}
                  style={{ padding: "4px 8px 4px 28px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", width: 190 }}
                />
              </div>
            </div>

            {/* Teal "+ Image Result" Button */}
            <button
              onClick={() => {
                if (imageOrders.length > 0) {
                  handleOpenEditResult(imageOrders[0]);
                } else {
                  handleOpenAddOrder();
                }
              }}
              className="charm-btn-teal"
              style={{
                padding: "6px 14px",
                background: "var(--brand-teal-primary, #00838f)",
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> Image Result
            </button>
          </div>

          {/* Image Results Table - Frame 0025 & 0030 */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e2e8f0" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                {isGlobalMode && <th style={{ padding: "8px 12px", width: "25%" }}>Patient</th>}
                <th style={{ padding: "8px 12px", width: "35%" }}>Test</th>
                <th style={{ padding: "8px 12px", width: "18%" }}>Date</th>
                <th style={{ padding: "8px 12px", width: "16%" }}>Note to Patient</th>
                <th style={{ padding: "8px 12px", width: "6%", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {resultsTabList.length === 0 ? (
                <tr>
                  <td colSpan={isGlobalMode ? 5 : 4} style={{ padding: "30px 12px", textAlign: "center", color: "#94a3b8" }}>
                    No image results found for the selected filter.
                  </td>
                </tr>
              ) : (
                resultsTabList.map((res) => {
                  const patientInitials = (res.patient_name || "Pt")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr
                      key={res.id}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      {/* Patient Column (Global Mode only) */}
                      {isGlobalMode && (
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "#e0f2fe",
                                color: "#0369a1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 600,
                                fontSize: 11,
                                flexShrink: 0,
                              }}
                            >
                              {patientInitials}
                            </div>
                            <div>
                              <button
                                onClick={() => navigate(`/patients/${res.patient_id}`)}
                                style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: 600, fontSize: 12, cursor: "pointer", padding: 0, textAlign: "left" }}
                              >
                                {res.patient_name}
                              </button>
                              <span style={{ display: "block", fontSize: 11, color: "#64748b" }}>
                                [ {res.patient_mrn} ]
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Test Column with clickable link to Report Viewer */}
                      <td style={{ padding: "8px 12px" }}>
                        <button
                          onClick={() => handleOpenViewer(res)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#0284c7",
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: "pointer",
                            padding: 0,
                            textAlign: "left",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FileText size={13} color="#0d9488" />
                          {res.name}
                        </button>
                      </td>

                      {/* Date Column */}
                      <td style={{ padding: "8px 12px", color: "#334155" }}>
                        {res.ordered_date || "Nov 06, 2026 09:27 PM"}
                      </td>

                      {/* Note to Patient Column */}
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>
                        {res.notes_lab_patient || "-"}
                      </td>

                      {/* Action 3-dots Menu - Frame 0045 */}
                      <td style={{ padding: "8px 12px", textAlign: "center", position: "relative" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === res.id ? null : res.id);
                          }}
                          style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px 6px", borderRadius: 4 }}
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openMenuId === res.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              right: 12,
                              top: 32,
                              background: "#ffffff",
                              borderRadius: 4,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              border: "1px solid #e2e8f0",
                              zIndex: 50,
                              minWidth: 140,
                              textAlign: "left",
                              padding: "4px 0",
                            }}
                          >
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleOpenViewer(res);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Eye size={13} /> Review
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleOpenEditResult(res);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <FileCheck size={13} /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                window.print();
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Printer size={13} /> Print
                            </button>
                            {res.documents && res.documents[0] && (
                              <a
                                href={`/api/documents/${res.documents[0].id}/download`}
                                download={res.documents[0].filename}
                                onClick={() => setOpenMenuId(null)}
                                style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", boxSizing: "border-box" }}
                              >
                                <Download size={13} /> Export as PDF
                              </a>
                            )}
                            <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDeleteOrder(res.id);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          TAB 2: IMAGE ORDERS (Frame 0001 & 0055)
          ===================================================================== */}
      {activeSubTab === "orders" && (
        <div style={{ padding: "12px 16px" }}>
          {/* Filter Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>Ordered By :</span>
                <select
                  value={filterOrderedBy}
                  onChange={(e) => setFilterOrderedBy(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
                >
                  <option value="all">All</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>Order Status :</span>
                <select
                  value={filterOrderStatus}
                  onChange={(e) => setFilterOrderStatus(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", background: "#ffffff" }}
                >
                  <option value="pending_partial">Pending / Partial</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="completed">Completed</option>
                  <option value="all">All</option>
                </select>
              </div>

              {/* Search input */}
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 8, top: 7, color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search by Patient / Image Ref.# / Test"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  style={{ padding: "4px 8px 4px 28px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, color: "#1e293b", width: 260 }}
                />
              </div>
            </div>

            {/* Teal "+ Image Order" Button */}
            <button
              onClick={handleOpenAddOrder}
              className="charm-btn-teal"
              style={{
                padding: "6px 14px",
                background: "var(--brand-teal-primary, #00838f)",
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> Image Order
            </button>
          </div>

          {/* Image Orders Table - Frame 0001 & 0055 */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e2e8f0" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                {isGlobalMode && <th style={{ padding: "8px 12px", width: "22%" }}>Patient</th>}
                <th style={{ padding: "8px 12px", width: "32%" }}>Tests</th>
                <th style={{ padding: "8px 12px", width: "13%" }}>Image Ref.#</th>
                <th style={{ padding: "8px 12px", width: "13%" }}>Ordered By</th>
                <th style={{ padding: "8px 12px", width: "10%" }}>Ordered On</th>
                <th style={{ padding: "8px 12px", width: "14%" }}>Result Interpretation</th>
                <th style={{ padding: "8px 12px", width: "5%", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {ordersTabList.length === 0 ? (
                <tr>
                  <td colSpan={isGlobalMode ? 7 : 6} style={{ padding: "30px 12px", textAlign: "center", color: "#94a3b8" }}>
                    No image orders found for the selected filter.
                  </td>
                </tr>
              ) : (
                ordersTabList.map((order) => {
                  const patientInitials = (order.patient_name || "Pt")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  const statusLower = (order.status || "Pending").toLowerCase();
                  const isPending = statusLower === "pending" || statusLower === "ordered";
                  const isPartial = statusLower === "partial";
                  const isCompleted = statusLower === "completed" || statusLower === "reviewed";

                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      {/* Patient Column */}
                      {isGlobalMode && (
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "#e0f2fe",
                                color: "#0369a1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 600,
                                fontSize: 11,
                                flexShrink: 0,
                              }}
                            >
                              {patientInitials}
                            </div>
                            <div>
                              <button
                                onClick={() => navigate(`/patients/${order.patient_id}`)}
                                style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: 600, fontSize: 12, cursor: "pointer", padding: 0, textAlign: "left" }}
                              >
                                {order.patient_name}
                              </button>
                              <span style={{ display: "block", fontSize: 11, color: "#64748b" }}>
                                [ {order.patient_mrn} ]
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Tests Column */}
                      <td style={{ padding: "8px 12px", fontWeight: 500, color: "#0f172a" }}>
                        {order.name}
                      </td>

                      {/* Image Ref.# Column */}
                      <td style={{ padding: "8px 12px", color: "#334155", fontFamily: "monospace" }}>
                        {order.lab_ref || "00009540"}
                      </td>

                      {/* Ordered By Column */}
                      <td style={{ padding: "8px 12px", color: "#475569" }}>
                        {order.ordered_by || "Dr. Prem Sekar"}
                      </td>

                      {/* Ordered On Column */}
                      <td style={{ padding: "8px 12px", color: "#475569" }}>
                        {order.ordered_date || "Nov 06, 2026"}
                      </td>

                      {/* Result Interpretation / Status Badge */}
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontWeight: 600,
                            fontSize: 11,
                            background: isPending ? "#ffedd5" : isPartial ? "#e0f2fe" : "#dcfce7",
                            color: isPending ? "#c2410c" : isPartial ? "#0369a1" : "#166534",
                          }}
                        >
                          {order.status || "Pending"}
                        </span>
                      </td>

                      {/* Action 3-dots Menu - Frame 0104 (9 Actions) */}
                      <td style={{ padding: "8px 12px", textAlign: "center", position: "relative" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === order.id ? null : order.id);
                          }}
                          style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px 6px", borderRadius: 4 }}
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openMenuId === order.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              right: 12,
                              top: 32,
                              background: "#ffffff",
                              borderRadius: 4,
                              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                              border: "1px solid #e2e8f0",
                              zIndex: 50,
                              minWidth: 160,
                              textAlign: "left",
                              padding: "4px 0",
                            }}
                          >
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleOpenImportResult(order);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Upload size={13} color="#0d9488" /> Import Results
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleOpenEditOrder(order);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <FileCheck size={13} /> Edit Image Order
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleOpenEditOrder(order);
                                setMapDxModalOpen(true);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Tag size={13} /> Map Diagnoses
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                window.print();
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Printer size={13} /> Print Image Order
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                notify("Order PDF downloaded");
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Download size={13} /> Export as PDF
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                notify(`Order shared to PHR for ${order.patient_name}`);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Share2 size={13} /> Share to PHR
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                notify(`Requisition SMS sent to patient phone`);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Share2 size={13} /> Share by SMS
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleMarkCompleted(order);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#166534", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <CheckCircle2 size={13} /> Mark as Completed
                            </button>
                            <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDeleteOrder(order.id);
                              }}
                              style={{ width: "100%", padding: "6px 12px", background: "transparent", border: "none", fontSize: 12, textAlign: "left", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <Trash2 size={13} /> Delete Order
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// MODAL: MAP DX (Matching CharmHealth Reference Video Frame 0095)
// =========================================================================
interface MapDxModalProps {
  patientDiagnoses: Row[];
  selectedTests: SelectedImageTest[];
  onClose: () => void;
  onSave: (testMappings: Record<string, string[]>) => void;
}

function MapDxModal({ patientDiagnoses, selectedTests, onClose, onSave }: MapDxModalProps) {
  const [showAllActive, setShowAllActive] = useState(true);
  const [selectedDxCodes, setSelectedDxCodes] = useState<string[]>([]);
  const [testMappings, setTestMappings] = useState<Record<string, string[]>>({});
  const [mapAllDx, setMapAllDx] = useState(false);

  // Initialize testMappings from selectedTests
  useEffect(() => {
    const initMap: Record<string, string[]> = {};
    const initDxCodes = new Set<string>();

    selectedTests.forEach((t) => {
      initMap[t.id] = [...(t.mapped_dx || [])];
      (t.mapped_dx || []).forEach((c) => initDxCodes.add(c));
    });

    // Also include default active diagnoses if empty
    if (initDxCodes.size === 0 && patientDiagnoses.length > 0) {
      patientDiagnoses.slice(0, 3).forEach((d) => initDxCodes.add(d.code || d.description));
    }

    setTestMappings(initMap);
    setSelectedDxCodes(Array.from(initDxCodes));
  }, [selectedTests, patientDiagnoses]);

  // Handle toggling diagnosis selection in the top section
  function toggleDx(code: string) {
    if (selectedDxCodes.includes(code)) {
      setSelectedDxCodes(selectedDxCodes.filter((c) => c !== code));
    } else {
      setSelectedDxCodes([...selectedDxCodes, code]);
    }
  }

  // Handle toggling diagnosis mapping for a specific test in bottom section
  function toggleTestDx(testId: string, code: string) {
    const current = testMappings[testId] || [];
    if (current.includes(code)) {
      setTestMappings({ ...testMappings, [testId]: current.filter((c) => c !== code) });
    } else {
      setTestMappings({ ...testMappings, [testId]: [...current, code] });
    }
  }

  // Handle Map All Dx checkbox
  function handleMapAll(checked: boolean) {
    setMapAllDx(checked);
    const updated: Record<string, string[]> = {};
    selectedTests.forEach((t) => {
      updated[t.id] = checked ? [...selectedDxCodes] : [];
    });
    setTestMappings(updated);
  }

  // Handle toggle all dx for single test
  function toggleAllForTest(testId: string, checked: boolean) {
    setTestMappings({
      ...testMappings,
      [testId]: checked ? [...selectedDxCodes] : [],
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#ffffff", borderRadius: 6, width: 720, maxWidth: "92vw", maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Map Dx</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {/* Top Section: Encounter Specific Dx & Show All Active Diagnosis */}
          <div style={{ marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Encounter Specific Dx</span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showAllActive}
                  onChange={(e) => setShowAllActive(e.target.checked)}
                />
                Show All Active Diagnosis
              </label>
            </div>

            {/* Diagnoses List Checkboxes - Frame 0095 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#f8fafc", padding: 10, borderRadius: 4, border: "1px solid #e2e8f0" }}>
              {patientDiagnoses.length === 0 ? (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>No active diagnoses found for this patient.</span>
              ) : (
                patientDiagnoses.map((dx) => {
                  const label = `${dx.code} - ${dx.description}`;
                  const isChecked = selectedDxCodes.includes(dx.code || dx.description);
                  return (
                    <label key={dx.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#1e293b", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDx(dx.code || dx.description)}
                        style={{ marginTop: 2 }}
                      />
                      <span><strong>{dx.code}</strong> {dx.description}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Middle Section: Mapped Dx Details Table - Frame 0095 */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Mapped Dx Details</span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={mapAllDx}
                  onChange={(e) => handleMapAll(e.target.checked)}
                />
                Map All Dx
              </label>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e2e8f0" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 12px", width: "40%" }}>Test Name</th>
                  <th style={{ padding: "8px 12px", width: "60%" }}>Dx Codes</th>
                </tr>
              </thead>
              <tbody>
                {selectedTests.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: 16, textAlign: "center", color: "#94a3b8" }}>
                      No tests in order. Add tests first.
                    </td>
                  </tr>
                ) : (
                  selectedTests.map((t) => {
                    const mappedForThis = testMappings[t.id] || [];
                    const allMapped = selectedDxCodes.length > 0 && selectedDxCodes.every((c) => mappedForThis.includes(c));

                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 500, color: "#0284c7" }}>
                          {t.image_type} : {t.test_name}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, color: "#0f172a", fontSize: 11, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={allMapped}
                                onChange={(e) => toggleAllForTest(t.id, e.target.checked)}
                              />
                              All Dx
                            </label>
                            {selectedDxCodes.map((code) => {
                              const isChecked = mappedForThis.includes(code);
                              return (
                                <label key={code} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#334155", cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleTestDx(t.id, code)}
                                  />
                                  <span>{code}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "10px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button
            onClick={onClose}
            style={{ padding: "6px 16px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(testMappings)}
            style={{ padding: "6px 20px", background: "#0d9488", border: "none", color: "#ffffff", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// MODAL: TEMPLATES (Practice Templates & My Templates)
// =========================================================================
interface TemplatesModalProps {
  templates: Row[];
  onClose: () => void;
  onApply: (tpl: Row) => void;
}

function TemplatesModal({ templates, onClose, onApply }: TemplatesModalProps) {
  const [subTab, setSubTab] = useState<"Practice" | "My">("Practice");

  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      try {
        const c = JSON.parse(tpl.content || "{}");
        return c.category === subTab;
      } catch {
        return true;
      }
    });
  }, [templates, subTab]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#ffffff", borderRadius: 6, width: 680, maxWidth: "90vw", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Image Order Templates</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* Subtabs: Practice Templates vs My Templates */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 16px", background: "#fafafa" }}>
          <button
            onClick={() => setSubTab("Practice")}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: subTab === "Practice" ? "2px solid #0d9488" : "2px solid transparent",
              color: subTab === "Practice" ? "#0d9488" : "#475569",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Practice Templates
          </button>
          <button
            onClick={() => setSubTab("My")}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: subTab === "My" ? "2px solid #0d9488" : "2px solid transparent",
              color: subTab === "My" ? "#0d9488" : "#475569",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            My Templates
          </button>
        </div>

        {/* Template List */}
        <div style={{ padding: 16, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
              No templates available in this category.
            </div>
          ) : (
            filtered.map((tpl) => {
              let testsList: any[] = [];
              try {
                const c = JSON.parse(tpl.content || "{}");
                testsList = c.tests || [];
              } catch { }

              return (
                <div key={tpl.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc" }}>
                  <div>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{tpl.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      Includes {testsList.length} tests: {testsList.map((t) => `${t.image_type}: ${t.test_name.split("[")[0].trim()}`).join(", ")}
                    </span>
                  </div>
                  <button
                    onClick={() => onApply(tpl)}
                    style={{ padding: "6px 14px", background: "#0d9488", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    Use Template
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button
            onClick={onClose}
            style={{ padding: "6px 16px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
