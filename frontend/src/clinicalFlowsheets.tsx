import { FormEvent, Fragment, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Edit2, MoreHorizontal, Plus, Printer, TrendingUp, Trash2 } from "lucide-react";
import { api, localInput, Row, toISO } from "./api";
import { useApp } from "./context";
import { Button, Empty, ErrorBox, Loading, Modal } from "./ui";

type FlowField = {
  key: string;
  label: string;
  type: string;
  unit?: string;
  options?: string[];
  role?: "therapist" | "physician";
  trend?: boolean;
  auto_calculate?: boolean;
  format?: "blood-pressure";
  unit_options?: string[];
  default_unit?: string;
};
type FlowSection = { title: string; form_layout?: "single" | "two-column"; fields: FlowField[] };
type FlowTemplate = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  schema_json: { table_layout: string; sections: FlowSection[] };
};
type FlowTemplateChoice = FlowTemplate & { selected: boolean };
type PatientTemplateCatalog = { templates: FlowTemplate[]; available: FlowTemplateChoice[] };
type FlowEntry = {
  id: string;
  recorded_at: string;
  values_json: Row;
  therapist_name?: string | null;
  physician_name?: string | null;
};
type StaffRoster = { therapists: string[]; physicians: string[] };
type TrendPoint = { date: string; label: string; value: number };

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: "" };
  return {
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function numericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function entryFieldValue(field: FlowField, entry: FlowEntry) {
  const value = field.key === "therapist_name"
    ? entry.therapist_name
    : field.key === "physician_name"
      ? entry.physician_name
      : entry.values_json?.[field.key];
  if (value === undefined || value === null || value === "") return "";
  const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
  const unit = field.type === "temperature"
    ? entry.values_json?.[`${field.key}_unit`] || field.default_unit
    : field.unit;
  return `${displayValue}${unit ? ` ${unit}` : ""}`;
}

function TrendModal({
  field,
  points,
  onClose,
}: {
  field: FlowField;
  points: TrendPoint[];
  onClose: () => void;
}) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? 320 : 24 + (index * 592) / (points.length - 1),
    y: 218 - ((point.value - min) / range) * 184,
  }));
  const path = coords.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Modal title={`${field.label} trend`} onClose={onClose} className="clinical-flowsheet-trend-modal">
      {points.length ? (
        <div className="clinical-flowsheet-trend">
          <svg viewBox="0 0 640 250" role="img" aria-label={`${field.label} measurements over time`}>
            <line x1="24" y1="24" x2="24" y2="218" />
            <line x1="24" y1="218" x2="616" y2="218" />
            <polyline points={path} />
            {coords.map((point) => (
              <circle key={`${point.date}-${point.value}`} cx={point.x} cy={point.y} r="4">
                <title>{point.label}: {point.value}{field.unit ? ` ${field.unit}` : ""}</title>
              </circle>
            ))}
          </svg>
          <div className="clinical-flowsheet-trend-points">
            {points.map((point) => (
              <span key={`${point.date}-${point.value}`}>
                <strong>{point.value}{field.unit ? ` ${field.unit}` : ""}</strong>
                <small>{point.label}</small>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <Empty title="No numeric observations" body="Numeric values will appear here after entries are recorded." />
      )}
    </Modal>
  );
}

export function ClinicalFlowsheets({
  patientId,
  writable,
}: {
  patientId: string;
  writable: boolean;
}) {
  const { notify } = useApp();
  const queryClient = useQueryClient();
  const [templateSlug, setTemplateSlug] = useState("");
  const [editing, setEditing] = useState<FlowEntry | null | undefined>();
  const [recordedAt, setRecordedAt] = useState("");
  const [values, setValues] = useState<Row>({});
  const [error, setError] = useState<unknown>();
  const [catalogError, setCatalogError] = useState<unknown>();
  const [trendField, setTrendField] = useState<FlowField | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const templatesQuery = useQuery({
    queryKey: ["patient-flowsheet-templates", patientId],
    queryFn: () => api<PatientTemplateCatalog>(`/patients/${patientId}/flowsheets/templates`),
  });
  const staffQuery = useQuery({
    queryKey: ["flowsheet-staff"],
    queryFn: () => api<StaffRoster>("/flowsheets/staff"),
  });
  const templates = templatesQuery.data?.templates || [];
  const availableTemplates = templatesQuery.data?.available || [];
  const roster = staffQuery.data || { therapists: [], physicians: [] };
  useEffect(() => {
    if (templates.length && !templates.some((item) => item.slug === templateSlug)) {
      setTemplateSlug(
        templates.find((item) => item.slug === "sphygmocor-report")?.slug || templates[0].slug,
      );
    }
  }, [templateSlug, templates]);
  const dataQuery = useQuery({
    queryKey: ["patient-flowsheets", patientId, templateSlug],
    queryFn: () =>
      api<{ template: FlowTemplate; entries: FlowEntry[] }>(
        `/patients/${patientId}/flowsheets/${templateSlug}`,
      ),
    enabled: Boolean(patientId && templateSlug),
  });
  const template = dataQuery.data?.template;
  const entries = dataQuery.data?.entries || [];

  const openEntryForm = (entry?: FlowEntry) => {
    setError(undefined);
    setEditing(entry || null);
    setRecordedAt(entry ? localInput(entry.recorded_at) : localInput(new Date().toISOString()));
    const initialValues: Row = {
      ...(entry?.values_json || {}),
      therapist_name: entry?.therapist_name || "",
      physician_name: entry?.physician_name || "",
    };
    for (const section of template?.schema_json.sections || []) {
      for (const field of section.fields) {
        if (field.type === "temperature" && initialValues[`${field.key}_unit`] === undefined) {
          initialValues[`${field.key}_unit`] = field.default_unit || field.unit_options?.[0] || "";
        }
      }
    }
    setValues(initialValues);
  };

  const updateValue = (key: string, value: unknown) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (
        template?.slug === "vaso-meditech-eecp-weekly-chart" &&
        (key === "weight" || key === "height")
      ) {
        const weight = Number(next.weight);
        const height = Number(next.height);
        if (weight > 0 && height > 0) {
          next.bmi = Number((weight / ((height / 100) ** 2)).toFixed(1));
        } else {
          next.bmi = "";
        }
      }
      return next;
    });
  };

  const openTemplateCatalog = () => {
    setCatalogError(undefined);
    setSelectedSlugs(availableTemplates.filter((item) => item.selected).map((item) => item.slug));
    setCatalogOpen(true);
  };

  const saveTemplateSelection = async () => {
    setCatalogError(undefined);
    try {
      const catalog = await api<PatientTemplateCatalog>(
        `/patients/${patientId}/flowsheets/templates`,
        "PUT",
        { slugs: selectedSlugs },
      );
      queryClient.setQueryData(["patient-flowsheet-templates", patientId], catalog);
      setCatalogOpen(false);
    } catch (selectionError) {
      setCatalogError(selectionError);
    }
  };

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!template) return;
    setError(undefined);
    const valuesJson: Row = {};
    for (const section of template.schema_json.sections) {
      for (const field of section.fields) {
        if (field.type === "staff") continue;
        const value = values[field.key];
        if (value === undefined || value === null || value === "") continue;
        if (field.type === "temperature") {
          valuesJson[field.key] = Number(value);
          valuesJson[`${field.key}_unit`] = values[`${field.key}_unit`] || field.default_unit || "";
        } else {
          valuesJson[field.key] = field.type === "number" ? Number(value) : value;
        }
      }
    }
    const payload = {
      recorded_at: toISO(recordedAt),
      values_json: valuesJson,
      therapist_name: values.therapist_name || null,
      physician_name: values.physician_name || null,
    };
    try {
      if (editing) {
        await api(`/flowsheets/entries/${editing.id}`, "PUT", payload);
        notify("Flowsheet entry updated.");
      } else {
        await api(`/patients/${patientId}/flowsheets/${template.slug}/entries`, "POST", payload);
        notify("Flowsheet entry added.");
      }
      await queryClient.invalidateQueries({
        queryKey: ["patient-flowsheets", patientId, templateSlug],
      });
      setEditing(undefined);
    } catch (submitError) {
      setError(submitError);
    }
  };

  const removeEntry = async (entry: FlowEntry) => {
    if (!window.confirm("Delete this flowsheet entry? This cannot be undone.")) return;
    setError(undefined);
    try {
      await api(`/flowsheets/entries/${entry.id}`, "DELETE");
      await queryClient.invalidateQueries({
        queryKey: ["patient-flowsheets", patientId, templateSlug],
      });
      notify("Flowsheet entry deleted.");
    } catch (deleteError) {
      setError(deleteError);
    }
  };

  const exportCsv = () => {
    if (!template) return;
    const rows: unknown[][] = [["Section", "Clinical parameter", "Unit", ...entries.map((entry) => entry.recorded_at)]];
    for (const section of template.schema_json.sections) {
      for (const field of section.fields) {
        const valuesForRow = entries.map((entry) => {
          return entryFieldValue(field, entry);
        });
        rows.push([section.title, field.label, field.unit || "", ...valuesForRow]);
      }
    }
    const content = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.slug}-${patientId}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printFlowsheet = () => {
    const cleanup = () => {
      document.body.classList.remove("print-clinical-flowsheet");
      window.removeEventListener("afterprint", cleanup);
    };
    document.body.classList.add("print-clinical-flowsheet");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  };

  const trendPoints = (field: FlowField) =>
    entries.flatMap((entry) => {
      const raw = field.key === "therapist_name"
        ? entry.therapist_name
        : field.key === "physician_name"
          ? entry.physician_name
          : entry.values_json?.[field.key];
      const value = numericValue(raw);
      if (value === null) return [];
      const formatted = displayDate(entry.recorded_at);
      return [{ date: entry.recorded_at, label: `${formatted.date} ${formatted.time}`, value }];
    });

  if (templatesQuery.isLoading || staffQuery.isLoading || (templateSlug && dataQuery.isLoading)) {
    return <Loading />;
  }
  if (templatesQuery.error) return <ErrorBox error={templatesQuery.error} />;
  if (staffQuery.error) return <ErrorBox error={staffQuery.error} />;

  return (
    <div className="clinical-flowsheet-container">
      <div className="clinical-flowsheet-header">
        <div className="clinical-flowsheet-selector">
          <select
            aria-label="Flowsheet template"
            value={templateSlug}
            onChange={(event) => setTemplateSlug(event.target.value)}
          >
            {templates.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
          {writable && (
            <button type="button" aria-label="Add Flowsheets" title="Add Flowsheets" onClick={openTemplateCatalog}>
              <Plus size={16} />
            </button>
          )}
        </div>
        <div className="clinical-flowsheet-toolbar">
          {writable && (
            <Button className="clinical-flowsheet-add" onClick={() => openEntryForm()}>
              Add Entries
            </Button>
          )}
          <details className="clinical-flowsheet-menu">
            <summary aria-label="Print and export flowsheet"><MoreHorizontal size={19} /></summary>
            <div className="clinical-flowsheet-menu-items">
              <button onClick={printFlowsheet}><Printer size={15} /> Print</button>
              <button onClick={exportCsv} disabled={!template}><Download size={15} /> Export CSV</button>
            </div>
          </details>
        </div>
      </div>

      <ErrorBox error={error || dataQuery.error} />
      {dataQuery.isLoading ? <Loading /> : template ? (
        <div className="clinical-flowsheet-table-wrap">
          <table className="clinical-flowsheet-table">
            <colgroup>
              <col className="clinical-flowsheet-params-col" />
              {entries.map((entry) => <col key={entry.id} className="clinical-flowsheet-date-col" />)}
            </colgroup>
            <thead>
              <tr>
                <th className="clinical-flowsheet-sticky">Params</th>
                {entries.map((entry) => {
                  const formatted = displayDate(entry.recorded_at);
                  return (
                    <th key={entry.id} className="clinical-flowsheet-entry-heading">
                      <div className="clinical-flowsheet-date-heading">
                        <div>
                          <span>{formatted.date}</span>
                          <small>{formatted.time}</small>
                        </div>
                      {writable && (
                        <div className="flowsheet-entry-actions">
                          <button aria-label={`Edit entry from ${formatted.date}`} onClick={() => openEntryForm(entry)}><Edit2 size={14} /></button>
                          <button aria-label={`Delete entry from ${formatted.date}`} onClick={() => removeEntry(entry)}><Trash2 size={14} /></button>
                        </div>
                      )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {template.schema_json.sections.map((section, index) => (
                <Fragment key={`${section.title}-${index}`}>
                  {section.title && (
                    <tr className="clinical-flowsheet-section">
                      <th className="clinical-flowsheet-sticky" colSpan={entries.length + 1}>{section.title}</th>
                    </tr>
                  )}
                  {section.fields.map((field) => (
                    <tr key={field.key}>
                      <th className="clinical-flowsheet-sticky">
                        <span>{field.label}</span>
                        {(field.type === "number" || field.trend) && (
                          <button
                            type="button"
                            className="clinical-flowsheet-trend-button"
                            aria-label={`Show ${field.label} trend`}
                            title={`Show ${field.label} trend`}
                            onClick={() => setTrendField(field)}
                          >
                            <TrendingUp size={14} />
                          </button>
                        )}
                      </th>
                      {entries.map((entry) => {
                        const value = entryFieldValue(field, entry);
                        const shown = value || "—";
                        return <td key={entry.id}>{shown}</td>;
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!entries.length && <Empty title="No flowsheet entries yet" body="Add an entry to start this patient's clinical flowsheet." />}
        </div>
      ) : <Empty title="No flowsheet template available" />}

      {editing !== undefined && template && (
        <Modal
          title={editing ? "Edit Entries" : "Add Entries"}
          onClose={() => setEditing(undefined)}
          className="clinical-flowsheet-modal"
        >
          <form className="clinical-flowsheet-form" onSubmit={saveEntry}>
            <div className="clinical-flowsheet-form-header">
              <label>
                <span>Date</span>
                <input
                  type="datetime-local"
                  required
                  value={recordedAt}
                  onChange={(event) => setRecordedAt(event.target.value)}
                />
              </label>
              <div>
                <Button type="submit" className="clinical-flowsheet-add">
                  {editing ? "Save" : "Add"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>
                  Cancel
                </Button>
              </div>
            </div>
            {template.schema_json.sections.map((section, index) => (
              <fieldset
                className="clinical-flowsheet-form-section"
                key={`${section.title}-${index}`}
              >
                {section.title && <legend>{section.title}</legend>}
                <div className={`clinical-flowsheet-form-grid ${section.form_layout || "single"}`}>
                  {section.fields.map((field) => {
                    const staffOptions = field.role === "physician" ? roster.physicians : roster.therapists;
                    const bloodPressure = field.format === "blood-pressure";
                    const bpParts = String(values[field.key] || "").split("/");
                    return (
                      <div className={`clinical-flowsheet-field ${field.type === "textarea" || field.type === "staff" || field.type === "checkboxes" ? "wide-field" : ""}`} key={field.key}>
                        <span>{field.label}</span>
                        {field.type === "staff" ? (
                          <div className="clinical-flowsheet-staff-list">
                            {staffOptions.map((name) => (
                              <label key={name}>
                                <input
                                  type="radio"
                                  name={field.key}
                                  value={name}
                                  checked={values[field.key] === name}
                                  onChange={() => updateValue(field.key, name)}
                                />
                                {name}
                              </label>
                            ))}
                          </div>
                        ) : field.type === "radio" ? (
                          <div className="clinical-flowsheet-radio-list">
                            {(field.options || []).map((option) => (
                              <label key={option}>
                                <input
                                  type="radio"
                                  name={field.key}
                                  value={option}
                                  checked={values[field.key] === option}
                                  onChange={() => updateValue(field.key, option)}
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : field.type === "checkboxes" ? (
                          <div className="clinical-flowsheet-checkbox-list">
                            {(field.options || []).map((option) => {
                              const selected = (values[field.key] || []) as string[];
                              return (
                                <label key={option}>
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={(event) => updateValue(
                                      field.key,
                                      event.target.checked
                                        ? [...selected, option]
                                        : selected.filter((item) => item !== option),
                                    )}
                                  />
                                  {option}
                                </label>
                              );
                            })}
                          </div>
                        ) : field.type === "textarea" ? (
                          <textarea
                            aria-label={field.label}
                            rows={3}
                            value={values[field.key] || ""}
                            onChange={(event) => updateValue(field.key, event.target.value)}
                          />
                        ) : field.type === "select" ? (
                          <select
                            aria-label={field.label}
                            value={values[field.key] ?? ""}
                            onChange={(event) => updateValue(field.key, event.target.value)}
                          >
                            <option value="">-Select-</option>
                            {(field.options || []).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : bloodPressure ? (
                          <div className="clinical-flowsheet-bp-input">
                            <input
                              aria-label={`${field.label} systolic`}
                              type="number"
                              step="any"
                              value={bpParts[0] || ""}
                              onChange={(event) => {
                                const systolic = event.target.value;
                                const diastolic = bpParts[1] || "";
                                updateValue(field.key, systolic || diastolic ? `${systolic}/${diastolic}` : "");
                              }}
                            />
                            <span>/</span>
                            <input
                              aria-label={`${field.label} diastolic`}
                              type="number"
                              step="any"
                              value={bpParts[1] || ""}
                              onChange={(event) => {
                                const systolic = bpParts[0] || "";
                                const diastolic = event.target.value;
                                updateValue(field.key, systolic || diastolic ? `${systolic}/${diastolic}` : "");
                              }}
                            />
                            <small>{field.unit}</small>
                          </div>
                        ) : field.type === "temperature" ? (
                          <div className="clinical-flowsheet-temperature-input">
                            <input
                              aria-label={field.label}
                              type="number"
                              step="any"
                              value={values[field.key] ?? ""}
                              onChange={(event) => updateValue(field.key, event.target.value)}
                            />
                            <select
                              aria-label={`${field.label} unit`}
                              value={values[`${field.key}_unit`] || field.default_unit || ""}
                              onChange={(event) => updateValue(`${field.key}_unit`, event.target.value)}
                            >
                              {(field.unit_options || []).map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                        ) : field.type === "date" ? (
                          <input
                            aria-label={field.label}
                            type="date"
                            value={values[field.key] || ""}
                            onChange={(event) => updateValue(field.key, event.target.value)}
                          />
                        ) : (
                          <div className="clinical-flowsheet-input-wrap">
                            <input
                              aria-label={field.label}
                              type="number"
                              step="any"
                              value={values[field.key] ?? ""}
                              onChange={(event) => updateValue(field.key, event.target.value)}
                            />
                            {field.unit && <span>{field.unit}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <ErrorBox error={error} />
          </form>
        </Modal>
      )}
      {catalogOpen && (
        <Modal
          title="Add Flowsheets"
          onClose={() => setCatalogOpen(false)}
          className="flowsheet-catalog-modal"
        >
          <div className="flowsheet-catalog-content">
            <div className="flowsheet-catalog-options">
              {availableTemplates.map((item) => (
                <label key={item.slug}>
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(item.slug)}
                    onChange={(event) => setSelectedSlugs((current) =>
                      event.target.checked
                        ? [...current, item.slug]
                        : current.filter((slug) => slug !== item.slug)
                    )}
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
            <ErrorBox error={catalogError} />
            <div className="flowsheet-catalog-actions">
              <Button className="clinical-flowsheet-add" onClick={() => void saveTemplateSelection()}>
                Add
              </Button>
              <Button variant="secondary" onClick={() => setCatalogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {trendField && (
        <TrendModal
          field={trendField}
          points={trendPoints(trendField)}
          onClose={() => setTrendField(null)}
        />
      )}
    </div>
  );
}
