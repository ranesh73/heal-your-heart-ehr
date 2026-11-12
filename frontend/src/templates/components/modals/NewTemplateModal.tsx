import React, { useState } from 'react';
import { X, ArrowLeft, Info } from 'lucide-react';

interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (templateName: string, templateType: string, specialty: string, tags: string) => void;
}

const TEMPLATE_TYPE_CATEGORIES = [
  'SOAP Template',
  'General',
  'Medical History',
  'Assessment',
  'Physical Examination',
  'Follow Up',
  'Procedure',
  'Chief Complaints',
  'Symptoms',
  'History of Present Illness',
  'Past Medical History',
  'Family History',
  'Social History',
  'Review of Systems',
  'Assessment Notes',
  'Nurse Notes',
  'Diagnosis',
  'Self Notes',
  'Prescription',
  'Supplement',
  'Lab Record',
  'Injection',
  'Vaccine',
  'Imaging',
  'Diet Recommendation',
  'Lifestyle Recommendation',
  'Treatment Notes',
  'Instructions',
  'Reports',
  'Billing Procedure Codes',
  'Billing Inventory',
  'Email'
];

const SPECIALTY_OPTIONS = [
  'EECP',
  'Cardiac',
  'Respiratory',
  'General Medicine',
  'Diabetes',
  'Hypertension',
  'Thyroid',
  'Anesthesia',
  'Kidney / Urinary',
  'Gastrointestinal',
  'Neurology',
  'Musculoskeletal',
  'Vaccination',
  'Lab',
  'Imaging',
  'Preventive'
];

export const NewTemplateModal: React.FC<NewTemplateModalProps> = ({
  isOpen,
  onClose,
  onProceed
}) => {
  const [templateName, setTemplateName] = useState('');
  const [selectedType, setSelectedType] = useState('SOAP Template');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Cardiac');
  const [tags, setTags] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!templateName.trim()) {
      setValidationError('Please enter a Template Name.');
      return;
    }
    setValidationError('');
    // Map 'SOAP Template' to 'SOAP'
    const finalType = selectedType === 'SOAP Template' ? 'SOAP' : selectedType;
    onProceed(templateName.trim(), finalType, selectedSpecialty, tags.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="back-btn"
              onClick={onClose}
              style={{ padding: '2px 6px' }}
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <h3 className="modal-title">New Template</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {validationError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '13px'
              }}
            >
              {validationError}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '5px'
              }}
            >
              Template Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. EECP Clinical Assessment / Chest Pain Protocol"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                if (validationError) setValidationError('');
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                outline: 'none'
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '5px'
              }}
            >
              Clinical Specialty
            </label>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="select-control"
              style={{ width: '100%' }}
            >
              {SPECIALTY_OPTIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '5px'
              }}
            >
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. cardiac, chest pain, eecp"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '4px'
              }}
            >
              Choose Template Type
            </label>

            {selectedType === 'SOAP Template' && (
              <div className="soap-notice-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={16} />
                  <strong>SOAP Template</strong>
                </div>
                Single Template for entire Chart Note (Subjective, Objective, Assessment, Plan).
              </div>
            )}

            <div className="type-radio-grid">
              {TEMPLATE_TYPE_CATEGORIES.map((cat) => (
                <label key={cat} className="type-radio-item">
                  <input
                    type="radio"
                    name="template_type_choice"
                    value={cat}
                    checked={selectedType === cat}
                    onChange={() => setSelectedType(cat)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-orange" onClick={handleProceed}>
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};
