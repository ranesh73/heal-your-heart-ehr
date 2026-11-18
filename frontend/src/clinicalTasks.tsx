import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { api, branch, navigate, Row } from "./api";
import { useApp } from "./context";
import { ClinicLetterhead } from "./DischargeSummaryViewer";

function formatShortDate(value?: string | null): string {
  if (!value) return "";
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return value || "";
  }
}

function priorityClass(priority?: string): string {
  const p = (priority || "Medium").toLowerCase();
  if (p === "high") return "ct-priority-high";
  if (p === "low") return "ct-priority-low";
  return "ct-priority-medium";
}

function statusClass(status?: string): string {
  const s = (status || "Pending").toLowerCase();
  if (s === "completed") return "ct-status-completed";
  if (s === "in-progress") return "ct-status-progress";
  return "ct-status-pending";
}

/* ============================================================================
   1. COMPACT WORKFLOW PROGRESS BAR (Calendar Cards + Patient Messages/Overview)
   ============================================================================ */
export function PatientWorkflowProgressBar({
  workflows,
  compact = false,
  onOpenTasks,
}: {
  workflows: Row[];
  compact?: boolean;
  onOpenTasks?: () => void;
}) {
  if (!workflows || workflows.length === 0) return null;

  // Show active (uncompleted) workflows first; fall back to most recent completed if none active
  const activeList = workflows.filter((w) => !w.is_completed);
  const toShow = activeList.length > 0 ? activeList : workflows.slice(0, 1);

  return (
    <div className={`ct-wf-tracker-wrap ${compact ? "compact" : ""}`}>
      {toShow.map((wf) => {
        const steps: Row[] = wf.steps || [];
        const bottleneckTaskId = wf.bottleneck?.task_id;
        return (
          <div key={wf.workflow_instance_id} className="ct-wf-row">
            <div className="ct-wf-header-group">
              <span className="ct-wf-template-badge">
                <Layers size={11} />
                {wf.template_name}
              </span>
              <span className="ct-wf-count">
                {wf.completed_count}/{wf.total_count}
              </span>
            </div>

            <div className="ct-wf-pills">
              {steps.map((step) => {
                const isCompleted = step.status === "Completed";
                const isInProgress = step.status === "In-Progress";
                const isBottleneck =
                  !isCompleted &&
                  !isInProgress &&
                  bottleneckTaskId === step.id;

                if (isCompleted) {
                  return (
                    <span
                      key={step.id}
                      className="ct-wf-pill completed"
                      title={`${step.title} — Completed (${step.assigned_to_name})`}
                    >
                      <Check size={11} /> {step.short_label || step.title}
                    </span>
                  );
                }

                if (isInProgress) {
                  return (
                    <span
                      key={step.id}
                      className="ct-wf-pill in-progress"
                      title={`${step.title} — In-Progress (${step.assigned_to_name})`}
                    >
                      ⏳ {step.short_label || step.title} ({step.assigned_to_name})
                    </span>
                  );
                }

                if (isBottleneck) {
                  return (
                    <span
                      key={step.id}
                      className={`ct-wf-pill bottleneck ${step.is_overdue ? "overdue" : ""}`}
                      title={`Waiting on ${step.assigned_to_name}${step.due_date ? ` · Due ${formatShortDate(step.due_date)}` : ""}`}
                    >
                      ● Stuck at: {step.title} ({step.assigned_to_name})
                      {step.is_overdue ? " · OVERDUE" : ""}
                    </span>
                  );
                }

                return (
                  <span
                    key={step.id}
                    className="ct-wf-pill queued"
                    title={`${step.title} — Pending (${step.assigned_to_name})`}
                  >
                    {step.short_label || step.title}
                  </span>
                );
              })}

              {wf.is_completed && (
                <span className="ct-wf-pill completed">
                  <CheckCircle2 size={11} /> Workflow Completed
                </span>
              )}
            </div>

            {onOpenTasks && (
              <button
                type="button"
                className="ct-wf-manage-link"
                onClick={onOpenTasks}
              >
                Manage Tasks →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PatientWorkflowBanner({
  patientId,
  onOpenTasks,
}: {
  patientId: string;
  onOpenTasks?: () => void;
}) {
  const { data: workflows = [] } = useQuery({
    queryKey: ["patient-workflow-progress", branch, patientId],
    queryFn: () => api<Row[]>(`/patients/${patientId}/workflow-progress`),
    enabled: Boolean(patientId),
    refetchInterval: 15000,
  });

  if (!workflows.length) return null;

  const activeCount = workflows.filter((w) => !w.is_completed).length;
  const pendingSteps = workflows.reduce(
    (sum, w) =>
      sum + (w.steps || []).filter((s: Row) => s.status !== "Completed").length,
    0,
  );

  return (
    <div className="ct-patient-banner">
      <div className="ct-patient-banner-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ct-patient-banner-title">Active Clinical Workflow & Pending Tasks</span>
          {pendingSteps > 0 && (
            <span className="ct-banner-pending-badge">
              {pendingSteps} pending step{pendingSteps === 1 ? "" : "s"}
            </span>
          )}
          {activeCount === 0 && (
            <span className="ct-wf-pill completed">All Workflows Completed</span>
          )}
        </div>
        {onOpenTasks && (
          <button type="button" className="text-link" onClick={onOpenTasks} style={{ fontSize: 12, fontWeight: 600 }}>
            Open Patient Tasks →
          </button>
        )}
      </div>
      <PatientWorkflowProgressBar workflows={workflows} />
    </div>
  );
}

/* ============================================================================
   2. CUSTOM WORKFLOW TEMPLATE BUILDER MODAL (+ New Template)
   ============================================================================ */
interface DraftTemplateStep {
  title: string;
  short_label: string;
  default_priority: "High" | "Medium" | "Low";
  allowed_assignees: string[];
  enable_lab_subtypes: boolean;
}

function CreateTemplateModal({
  staff,
  onClose,
  onCreated,
}: {
  staff: Row[];
  onClose: () => void;
  onCreated: (created: Row) => void;
}) {
  const { notify } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasOptionalLabFlow, setHasOptionalLabFlow] = useState(false);
  const [steps, setSteps] = useState<DraftTemplateStep[]>([
    {
      title: "",
      short_label: "",
      default_priority: "Medium",
      allowed_assignees: [],
      enable_lab_subtypes: false,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      {
        title: "",
        short_label: "",
        default_priority: "Medium",
        allowed_assignees: [],
        enable_lab_subtypes: false,
      },
    ]);

  const removeStep = (idx: number) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const updateStep = (idx: number, patch: Partial<DraftTemplateStep>) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const toggleStaff = (idx: number, staffName: string) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const exists = s.allowed_assignees.includes(staffName);
        return {
          ...s,
          allowed_assignees: exists
            ? s.allowed_assignees.filter((n) => n !== staffName)
            : [...s.allowed_assignees, staffName],
        };
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    const validSteps = steps.filter((s) => s.title.trim());
    if (!validSteps.length) {
      setError("Add at least one workflow step with a title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await api<Row>("/workflow-templates", "POST", {
        name: name.trim(),
        description: description.trim(),
        has_optional_lab_flow: hasOptionalLabFlow,
        steps: validSteps.map((s, idx) => ({
          step_order: idx + 1,
          title: s.title.trim(),
          short_label: s.short_label.trim(),
          default_priority: s.default_priority,
          allowed_assignees: s.allowed_assignees,
          sub_types: s.enable_lab_subtypes
            ? {
                "Lab Test": ["Sarala D", "Jamuna"],
                "ECG or Echo Test": ["Serina", "Mahalakshmi S"],
              }
            : null,
        })),
      });
      notify(`Workflow template "${created.name}" created.`);
      onCreated(created);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div className="ct-modal-dialog ct-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-header">
          <h3>Create Custom Workflow Template</h3>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="ct-modal-body">
          {error && <div className="ct-error-box">{error}</div>}
          <div className="ct-form-grid-2">
            <label className="ct-field">
              <span>Template Name <em className="req">*</em></span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Post-EECP Follow-up Flow"
                required
              />
            </label>
            <label className="ct-field">
              <span>Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this clinic workflow"
              />
            </label>
          </div>

          <label className="ct-checkbox-line" style={{ marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={hasOptionalLabFlow}
              onChange={(e) => setHasOptionalLabFlow(e.target.checked)}
            />
            <span>Allow optional "Include Lab Flow" toggle when applying this template</span>
          </label>

          <div className="ct-steps-section-head">
            <strong>Ordered Workflow Steps ({steps.length})</strong>
            <button type="button" className="charm-btn-subtle" onClick={addStep}>
              <Plus size={13} /> Add Step
            </button>
          </div>

          <div className="ct-steps-builder-list">
            {steps.map((step, idx) => (
              <div key={idx} className="ct-step-builder-card">
                <div className="ct-step-builder-top">
                  <span className="ct-step-num-badge">Step {idx + 1}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      className="ct-link-danger"
                      onClick={() => removeStep(idx)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="ct-form-grid-3">
                  <label className="ct-field">
                    <span>Task Title <em className="req">*</em></span>
                    <input
                      value={step.title}
                      onChange={(e) => updateStep(idx, { title: e.target.value })}
                      placeholder="e.g. Complete Lipid Profile Follow-up"
                      required
                    />
                  </label>
                  <label className="ct-field">
                    <span>Short Pill Label</span>
                    <input
                      value={step.short_label}
                      onChange={(e) => updateStep(idx, { short_label: e.target.value })}
                      placeholder="e.g. Lipid Check"
                    />
                  </label>
                  <label className="ct-field">
                    <span>Default Priority</span>
                    <select
                      value={step.default_priority}
                      onChange={(e) =>
                        updateStep(idx, {
                          default_priority: e.target.value as "High" | "Medium" | "Low",
                        })
                      }
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>
                </div>

                <label className="ct-checkbox-line" style={{ marginTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={step.enable_lab_subtypes}
                    onChange={(e) =>
                      updateStep(idx, { enable_lab_subtypes: e.target.checked })
                    }
                  />
                  <span>Include Lab Test / ECG or Echo Test sub-type selector</span>
                </label>

                <div className="ct-staff-picker-wrap">
                  <span className="ct-staff-picker-label">
                    Allowed Staff Members (leave unchecked to allow all clinic staff):
                  </span>
                  <div className="ct-staff-chips">
                    {staff.map((member) => {
                      const active = step.allowed_assignees.includes(member.name);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`ct-staff-chip ${active ? "selected" : ""}`}
                          onClick={() => toggleStaff(idx, member.name)}
                        >
                          {active && <Check size={11} />}
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="ct-modal-footer">
            <button type="submit" className="ct-btn-orange" disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
            </button>
            <button type="button" className="ct-btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   3. ADD TASK / WORKFLOW TEMPLATE MODAL (+ Task)
   ============================================================================ */
interface StepDraftAssignment {
  step_order: number;
  title: string;
  short_label: string;
  sub_type: string;
  sub_types: Record<string, string[]> | null;
  allowed_assignees: string[];
  priority: "High" | "Medium" | "Low";
  assigned_to_user_id: string;
  due_date: string;
  comments: string;
}

function AddTaskModal({
  templates,
  staff,
  patients,
  currentUserId,
  defaultPatientId,
  onOpenNewTemplate,
  onClose,
  onSaved,
}: {
  templates: Row[];
  staff: Row[];
  patients: Row[];
  currentUserId: string;
  defaultPatientId?: string;
  onOpenNewTemplate: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useApp();
  const [mode, setMode] = useState<"single" | "template">("single");
  // Single task fields (exact ChARM Add Task modal)
  const [category, setCategory] = useState(templates[0]?.name || "Admission");
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState(currentUserId || staff[0]?.id || "");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [isPatientSpecific, setIsPatientSpecific] = useState(Boolean(defaultPatientId));
  const [patientId, setPatientId] = useState(defaultPatientId || patients[0]?.id || "");
  const [assignDueDate, setAssignDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [comments, setComments] = useState("");

  // Workflow template fields
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [includeLabFlow, setIncludeLabFlow] = useState(false);
  const [wfPatientId, setWfPatientId] = useState(defaultPatientId || patients[0]?.id || "");
  const [stepDrafts, setStepDrafts] = useState<StepDraftAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId],
  );

  // Helper to resolve staff members matching allowed name list
  const matchingStaffFor = (allowedNames: string[]): Row[] => {
    if (!allowedNames || allowedNames.length === 0) return staff;
    const lowered = new Set(allowedNames.map((n) => n.toLowerCase()));
    const matched = staff.filter((s) => lowered.has((s.name || "").toLowerCase()));
    return matched.length > 0 ? matched : staff;
  };

  useEffect(() => {
    if (!selectedTemplate) return;
    const baseSteps: Row[] = [...(selectedTemplate.steps || [])];
    if (selectedTemplate.has_optional_lab_flow && includeLabFlow) {
      for (const extra of selectedTemplate.optional_lab_steps || []) {
        baseSteps.push({
          ...extra,
          step_order: baseSteps.length + 1,
        });
      }
    }
    const built: StepDraftAssignment[] = baseSteps.map((st, idx) => {
      const subTypeKeys = st.sub_types ? Object.keys(st.sub_types) : [];
      const defaultSubType = subTypeKeys[0] || "";
      const allowedNames =
        defaultSubType && st.sub_types?.[defaultSubType]
          ? st.sub_types[defaultSubType]
          : st.allowed_assignees || [];
      const candidates = matchingStaffFor(allowedNames);
      return {
        step_order: idx + 1,
        title: st.title,
        short_label: st.short_label || "",
        sub_type: defaultSubType,
        sub_types: st.sub_types || null,
        allowed_assignees: st.allowed_assignees || [],
        priority: (st.default_priority || "Medium") as "High" | "Medium" | "Low",
        assigned_to_user_id: candidates[0]?.id || currentUserId || staff[0]?.id || "",
        due_date: "",
        comments: "",
      };
    });
    setStepDrafts(built);
  }, [selectedTemplate, includeLabFlow, staff, currentUserId]);

  const updateStepDraft = (idx: number, patch: Partial<StepDraftAssignment>) => {
    setStepDrafts((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, ...patch };
        if (patch.sub_type !== undefined && item.sub_types?.[patch.sub_type]) {
          const candidates = matchingStaffFor(item.sub_types[patch.sub_type]);
          if (candidates.length && !candidates.some((c) => c.id === next.assigned_to_user_id)) {
            next.assigned_to_user_id = candidates[0].id;
          }
        }
        return next;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "single") {
        if (!title.trim()) {
          setError("Please enter a task description.");
          setSaving(false);
          return;
        }
        await api("/clinical-tasks", "POST", {
          mode: "single",
          category,
          title: title.trim(),
          priority,
          assigned_to_user_id: ownerId || currentUserId,
          patient_id: isPatientSpecific && patientId ? patientId : null,
          due_date: assignDueDate && dueDate ? dueDate : null,
          comments: comments.trim(),
        });
        notify("Task created and assigned.");
      } else {
        if (!selectedTemplate) {
          setError("Please select a workflow template.");
          setSaving(false);
          return;
        }
        await api("/clinical-tasks", "POST", {
          mode: "template",
          template_id: selectedTemplate.id,
          patient_id: wfPatientId || null,
          include_lab_flow: includeLabFlow,
          steps: stepDrafts.map((s) => ({
            step_order: s.step_order,
            title: s.title,
            short_label: s.short_label,
            sub_type: s.sub_type,
            priority: s.priority,
            assigned_to_user_id: s.assigned_to_user_id,
            due_date: s.due_date || null,
            comments: s.comments,
          })),
        });
        notify(`Workflow "${selectedTemplate.name}" started (${stepDrafts.length} steps).`);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div
        className={`ct-modal-dialog ${mode === "template" ? "ct-modal-lg" : "ct-modal-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ct-modal-header">
          <h3>Add Task</h3>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle: Single Task vs Workflow Template */}
        <div className="ct-mode-tabs">
          <button
            type="button"
            className={`ct-mode-tab ${mode === "single" ? "active" : ""}`}
            onClick={() => setMode("single")}
          >
            Single Task
          </button>
          <button
            type="button"
            className={`ct-mode-tab ${mode === "template" ? "active" : ""}`}
            onClick={() => setMode("template")}
          >
            <Layers size={14} /> Workflow Template
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="ct-modal-body">
          {error && <div className="ct-error-box">{error}</div>}

          {mode === "single" ? (
            <div className="ct-charm-form">
              <div className="ct-charm-row">
                <label>Category <em className="req">*</em></label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option value="General">General</option>
                </select>
              </div>

              <div className="ct-charm-row">
                <label>Task <em className="req">*</em></label>
                <textarea
                  rows={3}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task details..."
                  required
                />
              </div>

              <div className="ct-charm-row">
                <label>Owner</label>
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ct-charm-row">
                <label>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "High" | "Medium" | "Low")}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="ct-charm-row">
                <span />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="ct-checkbox-line">
                    <input
                      type="checkbox"
                      checked={isPatientSpecific}
                      onChange={(e) => setIsPatientSpecific(e.target.checked)}
                    />
                    <span>Is patient specific</span>
                  </label>
                  {isPatientSpecific && (
                    <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                      <option value="">-- Select Patient --</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()} ({p.mrn})
                        </option>
                      ))}
                    </select>
                  )}

                  <label className="ct-checkbox-line">
                    <input
                      type="checkbox"
                      checked={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.checked)}
                    />
                    <span>Assign due date</span>
                  </label>
                  {assignDueDate && (
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="ct-charm-row">
                <label>Comments</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Optional instructions or notes..."
                />
              </div>

              <div className="ct-charm-row">
                <span />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="ct-btn-orange" disabled={saving}>
                    {saving ? "Adding..." : "Add"}
                  </button>
                  <button type="button" className="ct-btn-cancel" onClick={onClose}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="ct-form-grid-2">
                <label className="ct-field">
                  <span>Patient <em className="req">*</em></span>
                  <select
                    value={wfPatientId}
                    onChange={(e) => setWfPatientId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()} ({p.mrn})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ct-field">
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Workflow Template <em className="req">*</em></span>
                    <button
                      type="button"
                      className="text-link"
                      style={{ fontSize: 11.5 }}
                      onClick={onOpenNewTemplate}
                    >
                      + Custom Template
                    </button>
                  </span>
                  <select
                    value={selectedTemplate?.id || ""}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      setIncludeLabFlow(false);
                    }}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedTemplate?.has_optional_lab_flow && (
                <label className="ct-lab-flow-toggle">
                  <input
                    type="checkbox"
                    checked={includeLabFlow}
                    onChange={(e) => setIncludeLabFlow(e.target.checked)}
                  />
                  <span>
                    <strong>Include Lab Flow</strong> — automatically appends Step 2 (Complete the Laboratory Testing) &amp; Step 3 (Verify Laboratory Report)
                  </span>
                </label>
              )}

              <div className="ct-wf-step-cards">
                {stepDrafts.map((st, idx) => {
                  const subTypeKeys = st.sub_types ? Object.keys(st.sub_types) : [];
                  const activeAllowedNames =
                    st.sub_type && st.sub_types?.[st.sub_type]
                      ? st.sub_types[st.sub_type]
                      : st.allowed_assignees;
                  const allowedStaff = matchingStaffFor(activeAllowedNames);

                  return (
                    <div key={`${st.step_order}-${st.title}`} className="ct-wf-step-card">
                      <div className="ct-wf-step-card-head">
                        <span className="ct-step-num-badge">Step {st.step_order}</span>
                        <strong>{st.title}</strong>
                      </div>
                      <div className="ct-wf-step-fields">
                        {subTypeKeys.length > 0 && (
                          <label className="ct-field">
                            <span>Test Sub-Type</span>
                            <select
                              value={st.sub_type}
                              onChange={(e) =>
                                updateStepDraft(idx, { sub_type: e.target.value })
                              }
                            >
                              {subTypeKeys.map((k) => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        <label className="ct-field">
                          <span>Assigned Staff</span>
                          <select
                            value={st.assigned_to_user_id}
                            onChange={(e) =>
                              updateStepDraft(idx, { assigned_to_user_id: e.target.value })
                            }
                          >
                            {allowedStaff.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="ct-field">
                          <span>Priority</span>
                          <select
                            value={st.priority}
                            onChange={(e) =>
                              updateStepDraft(idx, {
                                priority: e.target.value as "High" | "Medium" | "Low",
                              })
                            }
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </label>

                        <label className="ct-field">
                          <span>Due Date</span>
                          <input
                            type="date"
                            value={st.due_date}
                            onChange={(e) =>
                              updateStepDraft(idx, { due_date: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ct-modal-footer">
                <button type="submit" className="ct-btn-orange" disabled={saving}>
                  {saving ? "Creating..." : `Create Workflow (${stepDrafts.length} Steps)`}
                </button>
                <button type="button" className="ct-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   4. EDIT TASK MODAL (Respects Two-Person Edit Lock)
   ============================================================================ */
function EditTaskModal({
  task,
  staff,
  onClose,
  onSaved,
}: {
  task: Row;
  staff: Row[];
  onClose: () => void;
  onSaved: (updated: Row) => void;
}) {
  const [title, setTitle] = useState(task.title || "");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">(task.priority || "Medium");
  const [status, setStatus] = useState<"Pending" | "In-Progress" | "Completed">(task.status || "Pending");
  const [assignedTo, setAssignedTo] = useState(task.assigned_to_user_id || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [comments, setComments] = useState(task.comments || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await api<Row>(`/clinical-tasks/${task.id}`, "PUT", {
        title: title.trim(),
        priority,
        status,
        assigned_to_user_id: assignedTo,
        due_date: dueDate || null,
        clear_due_date: !dueDate,
        comments: comments.trim(),
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div className="ct-modal-dialog ct-modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-header">
          <h3>Edit Task</h3>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="ct-modal-body">
          {error && <div className="ct-error-box">{error}</div>}
          <div className="ct-charm-form">
            <div className="ct-charm-row">
              <label>Task <em className="req">*</em></label>
              <textarea rows={2} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="ct-charm-row">
              <label>Owner</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="ct-charm-row">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="ct-charm-row">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="Pending">Pending</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="ct-charm-row">
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="ct-charm-row">
              <label>Notes</label>
              <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
            <div className="ct-charm-row">
              <span />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="ct-btn-orange" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="ct-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   5. TASK COMMENTS DRAWER
   ============================================================================ */
function TaskCommentsDrawer({
  task,
  onClose,
  onCommentAdded,
}: {
  task: Row;
  onClose: () => void;
  onCommentAdded: () => void;
}) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const commentsQuery = useQuery({
    queryKey: ["clinical-task-comments", task.id],
    queryFn: () => api<Row[]>(`/clinical-tasks/${task.id}/comments`),
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      await api(`/clinical-tasks/${task.id}/comments`, "POST", { body: body.trim() });
      setBody("");
      await commentsQuery.refetch();
      onCommentAdded();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ct-drawer-backdrop" onClick={onClose}>
      <aside className="ct-comments-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>Task Notes & Comments</h3>
            <small style={{ color: "#64748b" }}>{task.title}</small>
          </div>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="ct-comments-list">
          {commentsQuery.isLoading ? (
            <div style={{ color: "#64748b", padding: 12 }}>Loading comments...</div>
          ) : (commentsQuery.data || []).length === 0 ? (
            <div style={{ color: "#94a3b8", padding: 16, textAlign: "center" }}>
              No comments yet. Add clinical handoff notes below.
            </div>
          ) : (
            (commentsQuery.data || []).map((c) => (
              <div key={c.id} className="ct-comment-item">
                <div className="ct-comment-meta">
                  <strong>{c.author_name}</strong>
                  <span>{formatShortDate(c.created_at)}</span>
                </div>
                <div className="ct-comment-body">{c.body}</div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={(e) => void handleAdd(e)} className="ct-comment-form">
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment or handoff note..."
            required
          />
          <button type="submit" className="ct-btn-orange" disabled={posting}>
            <Send size={13} /> {posting ? "Posting..." : "Post"}
          </button>
        </form>
      </aside>
    </div>
  );
}

/* ============================================================================
   6. PRINTABLE FILTERED TASK LIST (With Official Heal Your Heart Letterhead)
   ============================================================================ */
function PrintTasksModal({
  tasks,
  facility,
  filtersSummary,
  onClose,
}: {
  tasks: Row[];
  facility?: Row;
  filtersSummary: string;
  onClose: () => void;
}) {
  return (
    <div className="discharge-viewer-backdrop">
      <section className="discharge-summary-print-root" role="dialog" aria-modal="true" aria-label="Print Tasks">
        <div className="discharge-summary-toolbar">
          <div className="discharge-summary-toolbar-title">
            <button type="button" className="discharge-icon-button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Clinical Tasks Report</span>
          </div>
          <div className="discharge-summary-toolbar-actions">
            <button type="button" className="discharge-action-button primary" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
        <div className="discharge-viewer-scroll">
          <article className="discharge-document">
            <ClinicLetterhead facility={facility} phonePrefix="Phone: " />
            <div className="discharge-divider-line" />
            <h1 className="discharge-document-title" style={{ textDecoration: "none", marginBottom: 6 }}>
              Clinical Tasks &amp; Workflow Summary
            </h1>
            <div style={{ textAlign: "center", fontSize: 12, color: "#475569", marginBottom: 16 }}>
              {filtersSummary} · Printed {formatShortDate(new Date().toISOString())}
            </div>
            <table className="clinical-summary-table">
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Task</th>
                  <th style={{ width: "18%" }}>Patient</th>
                  <th style={{ width: "14%" }}>Category</th>
                  <th style={{ width: "12%" }}>Owner</th>
                  <th style={{ width: "8%" }}>Priority</th>
                  <th style={{ width: "8%" }}>Due Date</th>
                  <th style={{ width: "8%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No tasks match the active filters.</td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.title}</strong>
                        {t.sub_type ? ` (${t.sub_type})` : ""}
                      </td>
                      <td>{t.patient_name ? `${t.patient_name} [${t.patient_mrn}]` : "—"}</td>
                      <td>{t.category}</td>
                      <td>{t.assigned_to_name}</td>
                      <td>{t.priority}</td>
                      <td>{t.due_date ? formatShortDate(t.due_date) : "—"}</td>
                      <td>{t.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </article>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   7. MAIN CLINICAL TASKS VIEW (Global /tasks AND Patient Chart -> Tasks Tab)
   ============================================================================ */
export function ClinicalTasksView({ patientId }: { patientId?: string }) {
  const { patients, staff, user, facilities, notify } = useApp();
  const qc = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Row | null>(null);
  const [commentsTask, setCommentsTask] = useState<Row | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["workflow-templates", branch],
    queryFn: () => api<Row[]>("/workflow-templates"),
  });

  const tasksQuery = useQuery({
    queryKey: [
      "clinical-tasks",
      branch,
      patientId || "all",
      categoryFilter,
      statusFilter,
      ownerFilter,
      priorityFilter,
      searchQuery,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (ownerFilter !== "All") params.set("owner_id", ownerFilter);
      if (priorityFilter !== "All") params.set("priority", priorityFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (patientId) params.set("patient_id", patientId);
      return api<Row[]>(`/clinical-tasks?${params.toString()}`);
    },
    refetchInterval: 15000,
  });

  const templates = templatesQuery.data || [];
  const tasks = tasksQuery.data || [];
  const currentFacility = facilities.find((f) => f.id === branch) || facilities[0];

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ["clinical-tasks"] });
    void qc.invalidateQueries({ queryKey: ["patient-workflow-progress"] });
    void qc.invalidateQueries({ queryKey: ["calendar-workflow-progress"] });
    void qc.invalidateQueries({ queryKey: ["task-notifications"] });
  };

  const handleStatusChange = async (task: Row, nextStatus: string) => {
    try {
      const updated = await api<Row>(`/clinical-tasks/${task.id}`, "PATCH", {
        status: nextStatus,
      });
      invalidateAll();
      if (updated.handoff?.next_task_title) {
        notify(
          `Completed! Auto-handoff sent to ${updated.handoff.next_assignee_name} for "${updated.handoff.next_task_title}".`,
        );
      } else {
        notify(`Task status updated to ${nextStatus}.`);
      }
    } catch (err: any) {
      notify(err?.message || "Unable to update task status");
    }
  };

  const handleDeleteOne = async (task: Row) => {
    setOpenMenuId(null);
    try {
      await api(`/clinical-tasks/${task.id}`, "DELETE");
      setSelectedIds((prev) => prev.filter((id) => id !== task.id));
      invalidateAll();
      notify("Task deleted.");
    } catch (err: any) {
      notify(err?.message || "Unable to delete task");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      notify("Select at least one task to delete.");
      return;
    }
    try {
      await api("/clinical-tasks/bulk-delete", "POST", { task_ids: selectedIds });
      setSelectedIds([]);
      invalidateAll();
      notify("Selected tasks deleted.");
    } catch (err: any) {
      notify(err?.message || "Unable to delete selected tasks");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const editableVisible = tasks.filter((t) => t.can_edit);
  const allEditableSelected =
    editableVisible.length > 0 &&
    editableVisible.every((t) => selectedIds.includes(t.id));

  const toggleSelectAll = () => {
    if (allEditableSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(editableVisible.map((t) => t.id));
    }
  };

  const categoryOptions = useMemo(() => {
    const names = new Set<string>(templates.map((t) => t.name));
    names.add("General");
    return Array.from(names);
  }, [templates]);

  return (
    <div className="ct-module-shell" onClick={() => openMenuId && setOpenMenuId(null)}>
      {/* Header Bar */}
      <div className="ct-header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="ct-page-title">Tasks</h2>
          {tasks.some((t) => t.is_overdue) && (
            <span className="ct-overdue-summary-badge">
              <AlertTriangle size={12} /> {tasks.filter((t) => t.is_overdue).length} Overdue
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="ct-btn-secondary"
            title="Create Custom Workflow Template"
            onClick={() => setShowNewTemplateModal(true)}
          >
            <Layers size={14} /> + New Template
          </button>
          <button
            type="button"
            className="ct-btn-orange"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} /> Task
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Exact ChARM Layout) */}
      <div className="ct-filter-bar">
        <div className="ct-filter-group">
          <label>Categories</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="ct-filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Pending">Pending</option>
            <option value="In-Progress">In-Progress</option>
            <option value="Completed">Completed</option>
            <option value="All">All</option>
          </select>
        </div>

        <div className="ct-filter-group">
          <label>Owner</label>
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="All">All</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ct-filter-group">
          <label>Priority</label>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="ct-filter-group ct-search-group">
          <label>Search</label>
          <div className="ct-search-input-wrap">
            <Search size={13} color="#94a3b8" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Task / Comments"
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Buttons (Delete & Print) */}
      <div className="ct-bulk-bar">
        <button
          type="button"
          className="ct-bulk-btn"
          disabled={selectedIds.length === 0}
          onClick={() => void handleBulkDelete()}
        >
          Delete{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
        </button>
        <button
          type="button"
          className="ct-bulk-btn"
          onClick={() => setShowPrintModal(true)}
        >
          Print
        </button>
      </div>

      {/* Tasks Table */}
      <div className="ct-table-wrap">
        <table className="ct-table">
          <thead>
            <tr>
              <th style={{ width: 34, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allEditableSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all editable tasks"
                />
              </th>
              <th style={{ width: "34%" }}>Task</th>
              <th style={{ width: "9%" }}>Priority</th>
              <th style={{ width: "14%" }}>Owner</th>
              <th style={{ width: "11%" }}>Created On</th>
              <th style={{ width: "11%" }}>Due Date</th>
              <th style={{ width: "13%" }}>Status</th>
              <th style={{ width: 46, textAlign: "center" }} aria-label="Comments" />
              <th style={{ width: 44, textAlign: "center" }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {tasksQuery.isLoading ? (
              <tr>
                <td colSpan={9} className="ct-empty-cell">
                  Loading tasks...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="ct-empty-cell">
                  No tasks found matching the selected filters. Click <strong>+ Task</strong> to add a task or launch a patient workflow template.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id} className={t.is_overdue ? "ct-row-overdue" : ""}>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      disabled={!t.can_edit}
                      title={t.can_edit ? "Select task" : t.lock_reason}
                      checked={selectedIds.includes(t.id)}
                      onChange={() => toggleSelect(t.id)}
                    />
                  </td>
                  <td>
                    <div className="ct-task-cell-title">
                      <span>{t.title}</span>
                      {t.sub_type && <span className="ct-subtype-tag">{t.sub_type}</span>}
                    </div>
                    <div className="ct-task-cell-meta">
                      {t.patient_id && (
                        <button
                          type="button"
                          className="ct-patient-chip"
                          onClick={() => navigate(`/patients/${t.patient_id}`)}
                        >
                          <User size={10} /> {t.patient_name}
                          {t.patient_mrn ? ` · ${t.patient_mrn}` : ""}
                        </button>
                      )}
                      {t.category && (
                        <span className="ct-template-tag">{t.category}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`ct-priority-pill ${priorityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td>{t.assigned_to_name}</td>
                  <td>{formatShortDate(t.created_at)}</td>
                  <td>
                    {t.due_date ? (
                      <div className={t.is_overdue ? "ct-due-overdue" : ""}>
                        <div>{formatShortDate(t.due_date)}</div>
                        {t.is_overdue && <span className="ct-overdue-pill">Overdue</span>}
                      </div>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td>
                    {t.can_edit ? (
                      <select
                        className={`ct-inline-status ${statusClass(t.status)}`}
                        value={t.status}
                        onChange={(e) => void handleStatusChange(t, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In-Progress">In-Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    ) : (
                      <span
                        className={`ct-readonly-status ${statusClass(t.status)}`}
                        title={t.lock_reason}
                      >
                        <Lock size={11} /> {t.status}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="ct-comment-btn"
                      title="View / Add Comments"
                      onClick={() => setCommentsTask(t)}
                    >
                      <MessageSquare size={15} />
                      {t.comment_count > 0 && (
                        <span className="ct-comment-badge">{t.comment_count}</span>
                      )}
                    </button>
                  </td>
                  <td style={{ textAlign: "center", position: "relative" }}>
                    <button
                      type="button"
                      className="ct-more-btn"
                      title={t.can_edit ? "Actions" : t.lock_reason}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === t.id ? null : t.id);
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {openMenuId === t.id && (
                      <div className="ct-row-menu" onClick={(e) => e.stopPropagation()}>
                        {t.can_edit ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setEditingTask(t);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => void handleDeleteOne(t)}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        ) : (
                          <div className="ct-row-menu-locked">
                            <Lock size={12} /> {t.lock_reason}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {tasks.length > 0 && (
          <div className="ct-table-footer">
            1 - {tasks.length} of {tasks.length}
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      {showAddModal && (
        <AddTaskModal
          templates={templates}
          staff={staff}
          patients={patients}
          currentUserId={user.id}
          defaultPatientId={patientId}
          onOpenNewTemplate={() => {
            setShowAddModal(false);
            setShowNewTemplateModal(true);
          }}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            invalidateAll();
          }}
        />
      )}

      {showNewTemplateModal && (
        <CreateTemplateModal
          staff={staff}
          onClose={() => setShowNewTemplateModal(false)}
          onCreated={() => {
            setShowNewTemplateModal(false);
            void qc.invalidateQueries({ queryKey: ["workflow-templates"] });
          }}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          staff={staff}
          onClose={() => setEditingTask(null)}
          onSaved={(updated) => {
            setEditingTask(null);
            invalidateAll();
            if (updated.handoff?.next_task_title) {
              notify(
                `Completed! Auto-handoff sent to ${updated.handoff.next_assignee_name} for "${updated.handoff.next_task_title}".`,
              );
            } else {
              notify("Task updated.");
            }
          }}
        />
      )}

      {commentsTask && (
        <TaskCommentsDrawer
          task={commentsTask}
          onClose={() => setCommentsTask(null)}
          onCommentAdded={() => invalidateAll()}
        />
      )}

      {showPrintModal && (
        <PrintTasksModal
          tasks={tasks}
          facility={currentFacility}
          filtersSummary={`Category: ${categoryFilter} · Status: ${statusFilter} · Priority: ${priorityFilter}`}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

/* ============================================================================
   8. REAL-TIME ASSIGNMENT POPUP NOTIFICATION & TOP-RIGHT BELL CENTER
   ============================================================================ */
export function TaskNotificationCenter() {
  const { user, notify } = useApp();
  const qc = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<Row | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const notifQuery = useQuery({
    queryKey: ["task-notifications", branch, user.id],
    queryFn: () => api<Row>("/clinical-tasks/notifications"),
    refetchInterval: 12000,
    enabled: Boolean(user?.id && branch),
  });

  const data = notifQuery.data;
  const unreadCount: number = data?.unread_count || 0;
  const overdueCount: number = data?.overdue_count || 0;
  const notifications: Row[] = data?.notifications || [];

  // Trigger real-time popup whenever a new unread task notification arrives!
  useEffect(() => {
    if (!notifications.length) return;
    const unread = notifications.filter((n) => !n.is_read);
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Show the most recent unread assignment popup right away on login/load if pending
      if (unread.length > 0) {
        setActivePopup(unread[0]);
      }
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      return;
    }
    const newlyArrived = unread.find((n) => !seenIdsRef.current.has(n.id));
    notifications.forEach((n) => seenIdsRef.current.add(n.id));
    if (newlyArrived) {
      setActivePopup(newlyArrived);
    }
  }, [notifications]);

  const markRead = async (notifId: string) => {
    try {
      await api(`/clinical-tasks/notifications/${notifId}/read`, "POST");
      void qc.invalidateQueries({ queryKey: ["task-notifications"] });
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api("/clinical-tasks/notifications/read-all", "POST");
      setActivePopup(null);
      void qc.invalidateQueries({ queryKey: ["task-notifications"] });
    } catch {
      // ignore
    }
  };

  const quickStatus = async (notif: Row, nextStatus: "In-Progress" | "Completed") => {
    try {
      const updated = await api<Row>(`/clinical-tasks/${notif.task.id}`, "PATCH", {
        status: nextStatus,
      });
      await markRead(notif.id);
      if (activePopup?.id === notif.id) setActivePopup(null);
      void qc.invalidateQueries({ queryKey: ["clinical-tasks"] });
      void qc.invalidateQueries({ queryKey: ["patient-workflow-progress"] });
      void qc.invalidateQueries({ queryKey: ["calendar-workflow-progress"] });
      if (updated.handoff?.next_task_title) {
        notify(
          `Completed! Auto-handoff sent to ${updated.handoff.next_assignee_name} for "${updated.handoff.next_task_title}".`,
        );
      } else {
        notify(`Task marked ${nextStatus}.`);
      }
    } catch (err: any) {
      notify(err?.message || "Unable to update task");
    }
  };

  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="charm-icon-btn-round"
          aria-label="Task Notifications"
          title={
            unreadCount > 0
              ? `${unreadCount} unread task notification${unreadCount === 1 ? "" : "s"}`
              : "Notifications"
          }
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen((prev) => !prev);
          }}
        >
          <Bell size={16} />
          {(unreadCount > 0 || overdueCount > 0) && (
            <span className="ct-bell-count-badge">
              {unreadCount > 0 ? unreadCount : "!"}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div className="ct-notif-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="ct-notif-dropdown-head">
              <strong>
                Task Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
              </strong>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-link"
                    style={{ fontSize: 11.5 }}
                    onClick={() => void markAllRead()}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  className="text-link"
                  style={{ fontSize: 11.5 }}
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/tasks");
                  }}
                >
                  All Tasks
                </button>
              </div>
            </div>

            {overdueCount > 0 && (
              <div className="ct-notif-overdue-strip">
                <AlertTriangle size={13} /> You have {overdueCount} overdue task
                {overdueCount === 1 ? "" : "s"}.
              </div>
            )}

            <div className="ct-notif-list">
              {notifications.length === 0 ? (
                <div className="ct-notif-empty">No task notifications yet.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`ct-notif-item ${n.is_read ? "read" : "unread"}`}
                  >
                    <div className="ct-notif-item-top">
                      <span className={`ct-notif-kind ${n.kind}`}>
                        {n.kind === "handoff" ? "Workflow Handoff" : "Assigned Task"}
                      </span>
                      <span className={`ct-priority-pill ${priorityClass(n.task?.priority)}`}>
                        {n.task?.priority}
                      </span>
                    </div>
                    <div className="ct-notif-title">{n.task?.title}</div>
                    {n.task?.patient_name && (
                      <div className="ct-notif-sub">
                        Patient: <strong>{n.task.patient_name}</strong> ({n.task.patient_mrn})
                      </div>
                    )}
                    {n.task?.due_date && (
                      <div className={`ct-notif-sub ${n.task.is_overdue ? "ct-due-overdue" : ""}`}>
                        <Clock size={11} /> Due: {formatShortDate(n.task.due_date)}
                        {n.task.is_overdue ? " (OVERDUE)" : ""}
                      </div>
                    )}
                    <div className="ct-notif-actions">
                      {n.task?.status !== "In-Progress" && n.task?.status !== "Completed" && (
                        <button
                          type="button"
                          className="ct-notif-btn start"
                          onClick={() => void quickStatus(n, "In-Progress")}
                        >
                          <Play size={11} /> Start
                        </button>
                      )}
                      {n.task?.status !== "Completed" && (
                        <button
                          type="button"
                          className="ct-notif-btn complete"
                          onClick={() => void quickStatus(n, "Completed")}
                        >
                          <Check size={11} /> Complete
                        </button>
                      )}
                      {n.task?.patient_id && (
                        <button
                          type="button"
                          className="ct-notif-btn view"
                          onClick={() => {
                            void markRead(n.id);
                            setDropdownOpen(false);
                            navigate(`/patients/${n.task.patient_id}`);
                          }}
                        >
                          View Patient
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Floating Assignment / Auto-Handoff Popup */}
      {activePopup && activePopup.task && (
        <div className="ct-popup-toast" role="alert" aria-live="polite">
          <div className="ct-popup-header">
            <span className={`ct-notif-kind ${activePopup.kind}`}>
              {activePopup.kind === "handoff"
                ? "⚡ Workflow Handoff — Ready for You"
                : "🔔 New Task Assigned"}
            </span>
            <button
              type="button"
              className="ct-icon-close"
              aria-label="Dismiss notification"
              onClick={() => {
                void markRead(activePopup.id);
                setActivePopup(null);
              }}
            >
              <X size={15} />
            </button>
          </div>
          <div className="ct-popup-title">{activePopup.task.title}</div>
          <div className="ct-popup-meta">
            {activePopup.task.patient_name && (
              <span>
                <strong>{activePopup.task.patient_name}</strong> ({activePopup.task.patient_mrn})
              </span>
            )}
            <span className={`ct-priority-pill ${priorityClass(activePopup.task.priority)}`}>
              {activePopup.task.priority}
            </span>
            {activePopup.task.due_date && (
              <span className={activePopup.task.is_overdue ? "ct-due-overdue" : ""}>
                Due {formatShortDate(activePopup.task.due_date)}
                {activePopup.task.is_overdue ? " · OVERDUE" : ""}
              </span>
            )}
          </div>
          <div className="ct-popup-actions">
            {activePopup.task.status !== "In-Progress" && (
              <button
                type="button"
                className="ct-notif-btn start"
                onClick={() => void quickStatus(activePopup, "In-Progress")}
              >
                <Play size={12} /> Start (In-Progress)
              </button>
            )}
            <button
              type="button"
              className="ct-notif-btn complete"
              onClick={() => void quickStatus(activePopup, "Completed")}
            >
              <Check size={12} /> Mark Completed
            </button>
            {activePopup.task.patient_id && (
              <button
                type="button"
                className="ct-notif-btn view"
                onClick={() => {
                  void markRead(activePopup.id);
                  const pid = activePopup.task.patient_id;
                  setActivePopup(null);
                  navigate(`/patients/${pid}`);
                }}
              >
                View Patient
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
