import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  RefreshCw,
  UserCheck,
  AlertCircle,
  FileText,
  ChevronRight,
  FlaskConical,
  RotateCcw,
  Pill,
  Eye,
  Copy,
  Check,
  X
} from 'lucide-react';
import { ClinicalTemplate, Patient, TemplateComponent, UserSession, MedicationReference } from '../../types';
import { api } from '../../services/api';
import { ClinicalFormRenderer } from '../clinical/ClinicalFormRenderer';
import { computeVisibility, pruneHiddenAnswers } from '../clinical/conditionalLogic';

interface ConsultationScreenProps {
  template: ClinicalTemplate;
  patient: Patient;
  currentUser: UserSession | null;
  onBack: () => void;
  onSwitchPatient: () => void;
}

function fillPatientPlaceholders(text: string, p: Patient): string {
  if (!text) return '';
  return text
    .replace(/\$\{patient\.name\}/gi, p.full_name)
    .replace(/\$\{patient\.record_id\}/gi, p.mrn)
    .replace(/\$\{patient\.mrn\}/gi, p.mrn)
    .replace(/\$\{patient\.age\}/gi, String(p.age))
    .replace(/\$\{patient\.date_of_birth\}/gi, (p as any).dob || (p as any).date_of_birth || '1970-05-14')
    .replace(/\$\{patient\.gender\}/gi, p.gender)
    .replace(/\$\{patient\.birth_sex\}/gi, p.gender)
    .replace(/\$\{patient\.phone\}/gi, p.phone || '+91 98400 12345')
    .replace(/\$\{patient\.pcp\}/gi, 'Dr. Rajagopal, MD')
    .replace(/\$\{patient\.referring_provider\}/gi, 'Heal Your Heart Neelankarai')
    .replace(/\$\{patient\.past_medical_history\}/gi, p.condition_history || 'Coronary Artery Disease')
    .replace(/\$\{patient\.allergies\}/gi, 'No known drug allergies (NKDA)')
    .replace(/\$\{patient\.medications\}/gi, 'Aspirin 75mg OD, Atorvastatin 40mg HS')
    .replace(/\$\{patient\.supplements\}/gi, 'Omega-3 Fatty Acids, CoQ10 100mg')
    .replace(/\$\{patient\.diagnoses\}/gi, p.condition_history || 'Under clinical evaluation')
    .replace(/\$\{patient\.immunizations\}/gi, 'Influenza (2025), Pneumococcal PCV13')
    .replace(/\$\{patient\.procedures\}/gi, 'Coronary Angiography (2023)')
    .replace(/\$\{patient\.family_history\}/gi, 'Father: IHD at age 62; Mother: Type 2 Diabetes');
}

export const ConsultationScreen: React.FC<ConsultationScreenProps> = ({
  template,
  patient,
  currentUser,
  onBack,
  onSwitchPatient
}) => {
  // All components flattened from all sections
  const allComponents = useMemo(() => {
    return (template.sections || []).flatMap((sec) =>
      sec.components.map((c) => ({ ...c, sectionTitle: sec.title }))
    );
  }, [template]);

  // Initial answers
  const getInitialAnswers = () => {
    const initial: Record<number, string> = {};
    allComponents.forEach((c) => {
      if (c.id && c.default_value && !c.default_value.includes('${patient.')) {
        initial[c.id] = c.default_value;
      }
    });
    return initial;
  };

  const [answers, setAnswers] = useState<Record<number, string>>(getInitialAnswers);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedConsultationId, setSavedConsultationId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Modals & Drawers
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showMedDrawer, setShowMedDrawer] = useState(false);
  const [medications, setMedications] = useState<MedicationReference[]>([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medSearch, setMedSearch] = useState('');
  const [copiedNote, setCopiedNote] = useState(false);

  // Load medications when drawer opened
  useEffect(() => {
    if (showMedDrawer && medications.length === 0) {
      setMedLoading(true);
      api.getMedications()
        .then((data) => setMedications(data))
        .catch((err) => console.error('Failed to load medications', err))
        .finally(() => setMedLoading(false));
    }
  }, [showMedDrawer, medications.length]);

  const handleAnswerChange = (componentId: number, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [componentId]: value };
      const { hidden } = computeVisibility(allComponents, template.relationships || [], updated);
      return pruneHiddenAnswers(updated, hidden);
    });
    if (validationError) {
      setValidationError(null);
    }
  };

  // Answered stats
  const totalQuestions = allComponents.filter((c) => c.component_type !== 'Heading').length;
  const answeredQuestionsCount = allComponents.filter(
    (c) => c.id && Boolean(answers[c.id]) && c.component_type !== 'Heading'
  ).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestionsCount / totalQuestions) * 100) : 0;

  // Save Consultation to Backend
  const handleSaveConsultation = async (exitAfterSave = false) => {
    // 1. Validate mandatory fields
    const { visible } = computeVisibility(allComponents, template.relationships || [], answers);
    const missingMandatory = allComponents.filter(
      (c) => c.id && visible.has(c.id) && (c.is_mandatory || (c as any).is_required) && !answers[c.id]
    );

    if (missingMandatory.length > 0) {
      setValidationError(
        `Please complete required question(s): ${missingMandatory.map((m) => m.label).join(', ')}`
      );
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    setValidationError(null);
    try {
      setSaving(true);
      const responsesPayload = allComponents
        .filter((c) => c.id && visible.has(c.id) && answers[c.id])
        .map((c) => ({
          component_id: c.id!,
          component_label: c.label,
          response_value: answers[c.id!]
        }));

      if (savedConsultationId) {
        // Update existing consultation
        await api.updateConsultation(savedConsultationId, {
          patient_id: patient.id,
          notes: `Updated test consultation for ${patient.full_name}. ${responsesPayload.length} answers recorded.`,
          responses: responsesPayload
        });
      } else {
        // Create new consultation
        const res = await api.saveConsultation({
          patient_id: patient.id,
          template_id: template.id,
          doctor_name: currentUser?.full_name || 'Sanjana K',
          notes: `Clinical template assessment completed in Test Mode for ${patient.full_name}. ${responsesPayload.length} questions recorded.`,
          responses: responsesPayload
        });
        setSavedConsultationId(res.consultation_id);
      }

      if (exitAfterSave) {
        onBack();
      } else {
        setSaveSuccess(true);
      }
    } catch (err) {
      console.error('Save error', err);
      alert('Failed to save consultation response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (answeredQuestionsCount > 0) {
      if (window.confirm('You have entered responses. Discard changes and return to templates?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all entered responses for this test consultation?')) {
      setAnswers(getInitialAnswers());
      setSaveSuccess(false);
      setValidationError(null);
    }
  };

  const filteredMeds = useMemo(() => {
    const q = medSearch.trim().toLowerCase();
    if (!q) return medications;
    return medications.filter((m) =>
      [m.medication_name, m.generic_name, m.condition_name, m.category, m.instructions]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q))
    );
  }, [medications, medSearch]);

  const generateSoapText = () => {
    return `[SOAP NOTE - ${template.name.toUpperCase()}]\n` +
      `PATIENT: ${patient.full_name} (${patient.mrn}) | AGE: ${patient.age} | SEX: ${patient.gender}\n` +
      `DATE: ${new Date().toLocaleDateString()} | PROVIDER: ${currentUser?.full_name || 'Sanjana K'}\n` +
      `CLINIC: HEAL YOUR HEART, Neelankarai, Chennai\n\n` +
      `CLINICAL FINDINGS:\n` +
      (allComponents
        .filter((c) => c.id && answers[c.id] && c.component_type !== 'Heading')
        .map((c) => {
          const v = answers[c.id!];
          if (v.startsWith('{')) {
            try {
              const p = JSON.parse(v);
              const count = p.cells ? Object.keys(p.cells).length : Object.keys(p).length;
              return `• ${c.label}: [Table Data: ${count} cell(s)]`;
            } catch {
              return `• ${c.label}: [Table Data Recorded]`;
            }
          }
          return `• ${c.label}: ${v}`;
        })
        .join('\n') || '• Assessment in progress...');
  };

  const handleCopyNote = () => {
    navigator.clipboard.writeText(generateSoapText());
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  return (
    <div style={{ padding: '0 20px 40px 20px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleCancel}
            className="btn-secondary"
            style={{ padding: '5px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to Templates
          </button>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Templates <ChevronRight size={13} style={{ display: 'inline' }} /> <strong>{template.name}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fdba74',
              color: '#c2410c',
              padding: '4px 10px',
              borderRadius: '14px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.4px'
            }}
          >
            <FlaskConical size={14} /> TEST / DEMO MODE
          </div>

          <button
            type="button"
            onClick={() => setShowMedDrawer(true)}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              color: '#0288d1',
              borderColor: '#0288d1',
              backgroundColor: '#f0f9ff'
            }}
          >
            <Pill size={14} /> Medication Reference
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSaveConsultation(true)}
            className="btn-secondary"
            disabled={saving}
            style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600 }}
          >
            Save & Exit
          </button>

          <button
            onClick={() => handleSaveConsultation(false)}
            className="btn-primary"
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f57c00',
              borderColor: '#f57c00',
              fontWeight: 600,
              padding: '6px 16px'
            }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Test Response'}
          </button>
        </div>
      </div>

      {/* Validation Warning Alert */}
      {validationError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#b91c1c',
            fontSize: '13.5px',
            fontWeight: 500
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Patient Banner */}
      <div className="patient-banner" style={{ marginBottom: '20px' }}>
        <div className="patient-banner-info">
          <div className="patient-avatar-box">{patient.full_name.charAt(0)}</div>
          <div className="patient-details">
            <h2>
              <span>{patient.full_name}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#4b5563' }}>
                ({patient.age} yrs • {patient.gender})
              </span>
            </h2>
            <div className="patient-subdetails">
              <strong>MRN:</strong> {patient.mrn} • <strong>Date:</strong> {new Date().toLocaleDateString()} •{' '}
              <strong>Condition:</strong> {patient.condition_history || 'Under clinical evaluation'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="template-title-chip">
            {template.name} ({template.template_type})
          </div>
          <button
            onClick={onSwitchPatient}
            className="btn-secondary"
            style={{ padding: '5px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Change active patient"
          >
            <UserCheck size={14} /> Switch Patient
          </button>
        </div>
      </div>

      {/* MAIN CONSULTATION WORKSPACE */}
      <div className="consultation-layout" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* LEFT / CENTER: CLINICAL QUESTIONNAIRE */}
        <div className="consultation-main" style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
                marginBottom: '20px'
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {template.name}
                </h2>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                  {template.specialty || template.category} • {template.template_type} • Clinical Consultation Questionnaire
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <RefreshCw size={12} /> Clear Answers
                </button>
              </div>
            </div>

            {/* The Form with Horizontal Hierarchical Options and Interactive Tables */}
            <ClinicalFormRenderer
              template={template}
              answers={answers}
              onAnswer={handleAnswerChange}
            />
          </div>
        </div>

        {/* RIGHT: LIVE STICKY PATIENT SUMMARY */}
        <div style={{ width: '380px', flexShrink: 0 }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxShadow: 'var(--shadow-sm)',
              position: 'sticky',
              top: '70px'
            }}
          >
            {/* Summary Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#0288d1" />
                <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b' }}>
                  CONSULTATION SUMMARY
                </span>
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: progressPercent === 100 ? '#16a34a' : '#0288d1'
                }}
              >
                {answeredQuestionsCount} / {totalQuestions} answered
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: progressPercent === 100 ? '#22c55e' : '#0288d1',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                maxHeight: 'calc(100vh - 200px)',
                overflowY: 'auto'
              }}
            >
              {/* Patient and Template Meta */}
              <div style={{ backgroundColor: '#f1f5f9', padding: '10px 12px', borderRadius: '4px', fontSize: '12px' }}>
                <div><strong>Patient:</strong> {patient.full_name} ({patient.mrn})</div>
                <div style={{ marginTop: '2px' }}><strong>Template:</strong> {template.name}</div>
                <div style={{ marginTop: '2px' }}><strong>Provider:</strong> {currentUser?.full_name || 'Sanjana K'}</div>
                <div style={{ marginTop: '2px' }}><strong>Clinic:</strong> Heal Your Heart Neelankarai</div>
              </div>

              {/* Answers Table */}
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}
                >
                  Recorded Responses:
                </div>
                {answeredQuestionsCount === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                    No responses selected yet. Fill out questions in the form.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <tbody>
                      {allComponents.map((comp) => {
                        const val = comp.id ? answers[comp.id] : '';
                        if (!val || comp.component_type === 'Heading') return null;

                        let displayVal = val;
                        if (val.startsWith('{')) {
                          try {
                            const parsed = JSON.parse(val);
                            displayVal = `${Object.keys(parsed).length} cell(s) filled`;
                          } catch {}
                        }

                        return (
                          <tr key={comp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 4px', color: '#334155', fontWeight: 500, width: '50%' }}>
                              {comp.label}
                            </td>
                            <td
                              style={{
                                padding: '6px 4px',
                                color: '#0f172a',
                                fontWeight: 600,
                                width: '50%',
                                textAlign: 'right'
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: '#f0fdf4',
                                  color: '#166534',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #bbf7d0',
                                  display: 'inline-block',
                                  maxWidth: '160px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={displayVal}
                              >
                                {displayVal}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Clinical Narrative SOAP Preview */}
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}
                >
                  Clinical Note Preview:
                </div>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    color: '#334155',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}
                >
                  {`[SOAP NOTE - ${template.name.toUpperCase()}]\n`}
                  {`PATIENT: ${patient.full_name} (${patient.mrn}) | AGE: ${patient.age} | SEX: ${patient.gender}\n`}
                  {`DATE: ${new Date().toLocaleDateString()} | PROVIDER: ${currentUser?.full_name || 'Sanjana K'}\n\n`}
                  {`CLINICAL FINDINGS:\n`}
                  {allComponents
                    .filter((c) => c.id && answers[c.id] && c.component_type !== 'Heading')
                    .map((c) => {
                      const v = answers[c.id!];
                      if (v.startsWith('{')) {
                        return `• ${c.label}: [Table Data Recorded]`;
                      }
                      return `• ${c.label}: ${v}`;
                    })
                    .join('\n') || '• Assessment in progress...'}
                </div>
              </div>

              {/* Save Button */}
              <div style={{ paddingTop: '8px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSaveConsultation(false)}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '9px',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: '#f57c00',
                    borderColor: '#f57c00'
                  }}
                >
                  <Save size={16} />
                  {saving ? 'Saving to Database...' : 'Save Test Response'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE SUCCESS CONFIRMATION MODAL */}
      {saveSuccess && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px', textAlign: 'center', padding: '28px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                margin: '0 auto 16px auto'
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Test Consultation Saved Successfully!
            </h3>
            <p style={{ fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5', marginBottom: '24px' }}>
              Consultation response for <strong>{patient.full_name}</strong> using{' '}
              <strong>{template.name}</strong> has been recorded in the database (Consultation #{savedConsultationId}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    backgroundColor: '#0288d1',
                    borderColor: '#0288d1',
                    color: '#ffffff',
                    fontWeight: 600,
                    borderRadius: '4px'
                  }}
                  onClick={() => {
                    setSaveSuccess(false);
                    setShowResponseModal(true);
                  }}
                >
                  <Eye size={15} /> View Response
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    fontWeight: 600
                  }}
                  onClick={() => setSaveSuccess(false)}
                >
                  Edit Response
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: '#f8fafc'
                }}
                onClick={onBack}
              >
                Back to Templates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SAVED RESPONSE MODAL */}
      {showResponseModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-card"
            style={{
              maxWidth: '750px',
              width: '90%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Saved Consultation #{savedConsultationId}
                </h3>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                  {template.name} • {patient.full_name} ({patient.mrn})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResponseModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Patient Meta Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                  backgroundColor: '#f1f5f9',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              >
                <div><span style={{ color: '#64748b' }}>Patient:</span> <strong>{patient.full_name}</strong></div>
                <div><span style={{ color: '#64748b' }}>Age / Gender:</span> <strong>{patient.age}y / {patient.gender}</strong></div>
                <div><span style={{ color: '#64748b' }}>MRN:</span> <strong>{patient.mrn}</strong></div>
                <div><span style={{ color: '#64748b' }}>Provider:</span> <strong>{currentUser?.full_name || 'Sanjana K'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Clinic:</span> <strong>Heal Your Heart</strong></div>
                <div><span style={{ color: '#64748b' }}>Date:</span> <strong>{new Date().toLocaleDateString()}</strong></div>
              </div>

              {/* Recorded Findings Table */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Recorded Findings ({answeredQuestionsCount} answered)
                </h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Question</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Recorded Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allComponents
                        .filter((c) => c.id && answers[c.id] && c.component_type !== 'Heading')
                        .map((comp) => {
                          const val = answers[comp.id!];
                          let displayVal = val;
                          if (val.startsWith('{')) {
                            try {
                              const p = JSON.parse(val);
                              const cellCount = p.cells ? Object.keys(p.cells).length : Object.keys(p).length;
                              displayVal = `Table with ${cellCount} cell entries`;
                            } catch {}
                          }

                          return (
                            <tr key={comp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 500, width: '45%' }}>
                                {comp.label}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>
                                <span
                                  style={{
                                    backgroundColor: '#f0fdf4',
                                    color: '#166534',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #bbf7d0',
                                    display: 'inline-block'
                                  }}
                                >
                                  {displayVal}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SOAP Note Text */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', margin: 0 }}>
                    Clinical Note (SOAP)
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopyNote}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      color: '#0288d1'
                    }}
                  >
                    {copiedNote ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    {copiedNote ? 'Copied!' : 'Copy Note'}
                  </button>
                </div>
                <pre
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    padding: '12px',
                    fontSize: '12px',
                    color: '#1e293b',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    margin: 0
                  }}
                >
                  {generateSoapText()}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowResponseModal(false)}
                style={{ padding: '6px 14px', fontSize: '13px' }}
              >
                Edit Response
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={onBack}
                style={{
                  padding: '6px 18px',
                  fontSize: '13px',
                  backgroundColor: '#f57c00',
                  borderColor: '#f57c00'
                }}
              >
                Back to Templates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMON MEDICATION QUICK REFERENCE DRAWER */}
      {showMedDrawer && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-card"
            style={{
              maxWidth: '840px',
              width: '92%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pill size={18} color="#0288d1" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Common Medications Reference Catalog
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMedDrawer(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Safety Disclaimer Banner */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                borderBottom: '1px solid #fde68a',
                padding: '10px 16px',
                fontSize: '12px',
                color: '#92400e',
                lineHeight: 1.4
              }}
            >
              <strong>⚠️ CLINICAL REFERENCE ONLY:</strong> This catalog is a standardized clinical guide for demonstration.
              It does NOT automatically prescribe medications, compute patient dosages, or replace physician judgement.
            </div>

            {/* Search filter */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <input
                type="search"
                className="cfr-input"
                placeholder="Search medication, generic, condition (e.g. Paracetamol, Angina, Fever)..."
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                style={{ width: '100%', padding: '7px 12px', fontSize: '13px' }}
              />
            </div>

            {/* Medications Table */}
            <div style={{ padding: '0 20px', overflowY: 'auto', flex: 1 }}>
              {medLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Loading medication catalog...
                </div>
              ) : filteredMeds.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No medications found matching "{medSearch}".
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Medication & Generic</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Condition & Category</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Form / Strength</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Dose / Frequency</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Instructions / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeds.map((med) => (
                      <tr key={med.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <strong style={{ color: '#0f172a' }}>{med.medication_name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{med.generic_name}</div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ color: '#334155', fontWeight: 500 }}>{med.condition_name}</span>
                          <div style={{ fontSize: '11px', color: '#0288d1' }}>{med.category}</div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div>{med.form}</div>
                          <span style={{ fontSize: '11.5px', color: '#475569' }}>{med.strength}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div><strong>{med.frequency}</strong></div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Route: {med.route} • {med.duration}</span>
                        </td>
                        <td style={{ padding: '8px 10px', maxWidth: '240px' }}>
                          <div style={{ fontSize: '11.5px', color: '#334155' }}>{med.instructions}</div>
                          {med.notes && (
                            <div style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                              {med.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowMedDrawer(false)}
                style={{ padding: '6px 16px', fontSize: '13px' }}
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
