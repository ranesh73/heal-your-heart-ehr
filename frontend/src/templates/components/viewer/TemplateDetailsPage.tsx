import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Edit,
  Save,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Search,
  Pill,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ClinicalTemplate, Patient, UserSession, MedicationReference } from '../../types';
import { ClinicalFormRenderer } from '../clinical/ClinicalFormRenderer';
import { allComponentsOf, computeVisibility, pruneHiddenAnswers } from '../clinical/conditionalLogic';
import { api } from '../../services/api';

interface TemplateDetailsPageProps {
  template: ClinicalTemplate;
  currentUser?: UserSession | null;
  onBack: () => void;
  onEdit: (template: ClinicalTemplate) => void;
}

export const TemplateDetailsPage: React.FC<TemplateDetailsPageProps> = ({
  template,
  currentUser,
  onBack,
  onEdit
}) => {
  const allComponents = useMemo(() => allComponentsOf(template), [template]);

  // Patient state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  // Form answer state
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [savedConsultationId, setSavedConsultationId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Medication reference state
  const [showMeds, setShowMeds] = useState(false);
  const [medications, setMedications] = useState<MedicationReference[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [medLoading, setMedLoading] = useState(false);

  // 1. Load patients and existing saved answers for this template
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const [patientsData, consultationsData] = await Promise.all([
          api.getPatients().catch(() => [] as Patient[]),
          api.getConsultations({ template_id: template.id }).catch(() => [])
        ]);

        if (isCancelled) return;

        let selectedPatient: Patient | null = null;
        if (patientsData && patientsData.length > 0) {
          setPatients(patientsData);
          selectedPatient = patientsData[0];
          setActivePatient(patientsData[0]);
        }

        // Check if there are previously saved responses for this template
        if (consultationsData && consultationsData.length > 0) {
          const latest = consultationsData[0];
          setSavedConsultationId(latest.id);

          if (latest.patient_id && patientsData) {
            const matchedPatient = patientsData.find((p) => p.id === latest.patient_id);
            if (matchedPatient) {
              selectedPatient = matchedPatient;
              setActivePatient(matchedPatient);
            }
          }

          // Populate answers from saved consultation responses
          if (Array.isArray(latest.responses) && latest.responses.length > 0) {
            const loadedAnswers: Record<number, string> = {};
            latest.responses.forEach((r: any) => {
              if (r.component_id) {
                loadedAnswers[r.component_id] = r.response_value ?? '';
              }
            });
            setAnswers(loadedAnswers);
            return;
          }
        }

        // If no saved responses exist, seed default values
        const initial: Record<number, string> = {};
        allComponents.forEach((c) => {
          if (c.id && c.default_value && !c.default_value.includes('${patient.')) {
            initial[c.id] = c.default_value;
          }
        });
        setAnswers(initial);
      } catch (err) {
        console.error('Error loading template form data:', err);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [template.id, allComponents]);

  // Load medications when medication reference is expanded
  useEffect(() => {
    if (showMeds && medications.length === 0) {
      setMedLoading(true);
      api.getMedications({ category: template.category })
        .then((data) => setMedications(data))
        .catch(() => {
          // Fallback to all medications
          api.getMedications().then(setMedications).catch(() => {});
        })
        .finally(() => setMedLoading(false));
    }
  }, [showMeds, medications.length, template.category]);

  // Handle interactive answer change with automatic branch pruning
  const handleAnswerChange = useCallback(
    (componentId: number, value: string) => {
      setAnswers((prev) => {
        const updated = { ...prev, [componentId]: value };
        const { hidden } = computeVisibility(allComponents, template.relationships || [], updated);
        return pruneHiddenAnswers(updated, hidden);
      });
      if (validationError) setValidationError(null);
      if (saveSuccess) setSaveSuccess(false);
    },
    [allComponents, template.relationships, validationError, saveSuccess]
  );

  // Validate and Save Answers to Database
  const handleSave = async (exitAfterSave = false) => {
    const { visible } = computeVisibility(allComponents, template.relationships || [], answers);
    const missingRequired = allComponents.filter(
      (c) => c.id && visible.has(c.id) && (c.is_mandatory || (c as any).is_required) && !answers[c.id]?.trim()
    );

    if (missingRequired.length > 0) {
      setValidationError(
        `Please complete required question(s): ${missingRequired.map((m) => m.label).join(', ')}`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationError(null);
    setSaving(true);

    try {
      const responsesPayload = allComponents
        .filter((c) => c.id && visible.has(c.id) && answers[c.id] !== undefined && answers[c.id] !== '')
        .map((c) => ({
          component_id: c.id!,
          component_label: c.label,
          response_value: answers[c.id!]
        }));

      const patientId = activePatient?.id || (patients[0]?.id ?? 1);

      if (savedConsultationId) {
        // Update existing saved consultation
        await api.updateConsultation(savedConsultationId, {
          patient_id: patientId,
          notes: `Updated clinical assessment for ${template.name}. ${responsesPayload.length} fields recorded.`,
          responses: responsesPayload
        });
      } else {
        // Create new consultation response
        const res = await api.saveConsultation({
          patient_id: patientId,
          template_id: template.id,
          doctor_name: currentUser?.full_name || 'Dr. Sanjana K',
          notes: `Clinical assessment completed for ${template.name}. ${responsesPayload.length} questions recorded.`,
          responses: responsesPayload
        });
        setSavedConsultationId(res.consultation_id);
      }

      setSaveSuccess(true);

      if (exitAfterSave) {
        onBack();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save template response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Reset form answers
  const handleReset = () => {
    if (window.confirm('Reset all entered responses for this template?')) {
      const initial: Record<number, string> = {};
      allComponents.forEach((c) => {
        if (c.id && c.default_value && !c.default_value.includes('${patient.')) {
          initial[c.id] = c.default_value;
        }
      });
      setAnswers(initial);
      setSaveSuccess(false);
      setValidationError(null);
    }
  };

  const { visible } = useMemo(
    () => computeVisibility(allComponents, template.relationships || [], answers),
    [allComponents, template.relationships, answers]
  );

  const visibleQuestions = allComponents.filter(
    (c) => typeof c.id === 'number' && visible.has(c.id) && c.component_type !== 'Heading'
  );
  const answeredCount = visibleQuestions.filter((c) => Boolean(answers[c.id as number])).length;
  const progressPercent =
    visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0;

  const filteredMeds = useMemo(() => {
    const q = medSearch.trim().toLowerCase();
    if (!q) return medications;
    return medications.filter((m) =>
      [m.medication_name, m.generic_name, m.condition_name, m.category, m.instructions]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q))
    );
  }, [medications, medSearch]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Back to Templates
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onEdit(template)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              fontSize: '13.5px',
              cursor: 'pointer'
            }}
          >
            <Edit size={15} /> Edit Template
          </button>

          <button
            type="button"
            className="btn-orange"
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 20px',
              fontSize: '13.5px',
              fontWeight: 600,
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              fontSize: '13.5px',
              fontWeight: 600,
              backgroundColor: '#0288d1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            Save &amp; Exit
          </button>
        </div>
      </div>

      {/* Clean Compact Template Header: ONLY Template Name and Template Type */}
      <div
        className="template-header-card"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '16px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '36px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
            Template Name:
          </span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
            {template.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
            Template Type:
          </span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
            {template.template_type}
          </span>
        </div>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13.5px'
          }}
        >
          <AlertCircle size={18} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Save Success Message */}
      {saveSuccess && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13.5px',
            fontWeight: 500
          }}
        >
          <CheckCircle size={18} />
          <span>Template response saved successfully. Previous responses are stored in the database.</span>
        </div>
      )}

      {/* Interactive Clinical Template Form Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}
      >
        {/* Card Header: CLINICAL TEMPLATE */}
        <div
          style={{
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '0.4px',
                display: 'block'
              }}
            >
              CLINICAL TEMPLATE
            </span>
            <span style={{ fontSize: '12.5px', color: '#6b7280' }}>
              Fill and record clinical findings directly below. Answers persist to the database.
            </span>
          </div>

          <div
            style={{
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: progressPercent === 100 ? '#ecfdf5' : '#f0f9ff',
              color: progressPercent === 100 ? '#047857' : '#0369a1',
              fontSize: '12.5px',
              fontWeight: 600,
              border: `1px solid ${progressPercent === 100 ? '#a7f3d0' : '#bae6fd'}`
            }}
          >
            {answeredCount} / {visibleQuestions.length} fields completed ({progressPercent}%)
          </div>
        </div>

        {/* Live Form Renderer */}
        <div style={{ padding: '24px' }}>
          <ClinicalFormRenderer
            template={template}
            answers={answers}
            onAnswer={handleAnswerChange}
            disabled={saving}
          />
        </div>
      </div>

      {/* Common Medication Reference (Clinician Reference Only) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}
      >
        <button
          type="button"
          onClick={() => setShowMeds((prev) => !prev)}
          style={{
            width: '100%',
            backgroundColor: '#f8fafc',
            border: 'none',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pill size={16} color="#ea580c" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
              Common Medication Reference (Clinician Reference Only)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                backgroundColor: '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '10px'
              }}
            >
              Non-prescriptive
            </span>
          </div>
          {showMeds ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showMeds && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '12.5px',
                color: '#92400e',
                marginBottom: '12px'
              }}
            >
              <strong>Safety Disclaimer:</strong> This table is a clinician-editable reference list. It does not automatically prescribe medications or calculate doses.
            </div>

            <div style={{ marginBottom: '12px', maxWidth: '350px' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px' }}>
                <Search size={14} color="#94a3b8" style={{ marginRight: '6px' }} />
                <input
                  type="text"
                  placeholder="Search medication or instructions..."
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
                />
              </div>
            </div>

            {medLoading ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>Loading medications...</p>
            ) : filteredMeds.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>No medications found matching search.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', border: '1px solid #e2e8f0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Medication</th>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Generic Name</th>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Strength</th>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Form</th>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Route</th>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Frequency</th>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Duration</th>
                      <th style={{ padding: '7px 10px', fontWeight: 600 }}>Instructions / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeds.slice(0, 10).map((m, idx) => (
                      <tr key={m.id ?? idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>{m.medication_name}</td>
                        <td style={{ padding: '6px 10px', color: '#475569' }}>{m.generic_name}</td>
                        <td style={{ padding: '6px 10px' }}>{m.strength || '-'}</td>
                        <td style={{ padding: '6px 10px' }}>{m.form || 'Tablet'}</td>
                        <td style={{ padding: '6px 10px' }}>{m.route || 'Oral'}</td>
                        <td style={{ padding: '6px 10px' }}>{m.frequency || 'OD'}</td>
                        <td style={{ padding: '6px 10px' }}>{m.duration || 'As directed'}</td>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>{m.instructions || m.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Save & Exit Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '16px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={14} /> Reset Form Answers
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: '8px 16px', fontSize: '13.5px', cursor: 'pointer' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13.5px',
              fontWeight: 600,
              backgroundColor: '#0288d1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            Save &amp; Exit
          </button>

          <button
            type="button"
            className="btn-orange"
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 24px',
              fontSize: '14px',
              fontWeight: 700,
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(234, 88, 12, 0.25)'
            }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
};
