import React, { useState, useEffect } from 'react';
import { X, Pill, Heart, AlertCircle, Check, Loader2 } from 'lucide-react';
import { MedicationReference, MedicalCondition } from '../../types';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (med: MedicationReference) => void;
  editingMedication?: MedicationReference | null;
  conditions: MedicalCondition[];
}

const COMMON_DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Sublingual',
  'Inhaler',
  'Topical Ointment',
  'Drops',
  'Powder / Sachet',
  'Transdermal Patch'
];

const COMMON_FREQUENCIES = [
  'OD (Once daily)',
  'BD (Twice daily)',
  'TDS (Thrice daily)',
  'QID (Four times daily)',
  'PRN (As needed / SOS)',
  'Stat (Immediately / Single dose)',
  'At bedtime (HS / Night)',
  'Every 8 Hours',
  'Every 12 Hours',
  'Weekly'
];

const COMMON_CATEGORIES = [
  'Cardiology',
  'General Medicine',
  'Respiratory',
  'Gastrointestinal',
  'Diabetes',
  'Neurology',
  'Musculoskeletal',
  'Kidney / Urinary',
  'EECP',
  'Vaccination',
  'Anesthesia'
];

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingMedication,
  conditions
}) => {
  const [medicationName, setMedicationName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [conditionKey, setConditionKey] = useState('');
  const [conditionName, setConditionName] = useState('');
  const [category, setCategory] = useState('Cardiology');
  const [form, setForm] = useState('Tablet');
  const [strength, setStrength] = useState('');
  const [frequency, setFrequency] = useState('OD (Once daily)');
  const [duration, setDuration] = useState('30 Days');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingMedication) {
      setMedicationName(editingMedication.medication_name || '');
      setGenericName(editingMedication.generic_name || '');
      setConditionKey(editingMedication.condition_key || '');
      setConditionName(editingMedication.condition_name || '');
      setCategory(editingMedication.category || 'Cardiology');
      setForm(editingMedication.form || (editingMedication as any).dosage_form || 'Tablet');
      setStrength(editingMedication.strength || '');
      setFrequency(editingMedication.frequency || 'OD (Once daily)');
      setDuration(editingMedication.duration || '30 Days');
      setInstructions(editingMedication.instructions || '');
      setNotes(editingMedication.notes || '');
    } else {
      setMedicationName('');
      setGenericName('');
      setConditionKey(conditions[0]?.key || 'cardiac');
      setConditionName(conditions[0]?.label || 'Angina Pectoris / CAD');
      setCategory('Cardiology');
      setForm('Tablet');
      setStrength('');
      setFrequency('OD (Once daily)');
      setDuration('30 Days');
      setInstructions('Take with water after meals');
      setNotes('');
    }
    setError(null);
  }, [editingMedication, isOpen, conditions]);

  if (!isOpen) return null;

  const handleConditionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    setConditionKey(key);
    const cond = conditions.find((c) => c.key === key);
    if (cond) {
      setConditionName(cond.label);
      if (cond.category) setCategory(cond.category);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName.trim()) {
      setError('Medication Name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: any = {
      medication_name: medicationName.trim(),
      generic_name: genericName.trim(),
      condition_key: conditionKey || 'cardiac',
      condition_name: conditionName || 'Cardiology',
      category: category || 'Cardiology',
      form: form,
      dosage_form: form,
      strength: strength.trim(),
      frequency: frequency,
      duration: duration.trim(),
      instructions: instructions.trim(),
      notes: notes.trim()
    };

    try {
      let savedData: any;
      if (editingMedication?.id) {
        const resp = await fetch(`/api/medications/${editingMedication.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Failed to update medication');
        savedData = await resp.json();
      } else {
        const resp = await fetch('/api/medications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Failed to create medication');
        savedData = await resp.json();
      }

      onSaved(savedData);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error saving medication');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1200 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '680px',
          width: '100%',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea580c'
              }}
            >
              <Pill size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {editingMedication ? 'Edit Common Medication' : 'Add Common Medication'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Configure standardized drug prescriptions and dosage instructions for clinical charting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Condition & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Clinical Condition / Indication <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={conditionKey}
                  onChange={handleConditionSelect}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {conditions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label} ({c.category || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Medical Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Medication Name & Generic Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Medication / Brand Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ecosprin 75mg, Atorvastatin 20mg"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Generic Salt / Composition
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acetylsalicylic Acid, Atorvastatin"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Row 3: Dosage Form, Strength, Frequency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Dosage Form
                </label>
                <select
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {COMMON_DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Strength
                </label>
                <input
                  type="text"
                  placeholder="e.g. 75 mg, 20 mg, 500 mg"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {COMMON_FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Duration & Instructions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 30 Days, Continuous"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Patient Instructions & Food Advice
                </label>
                <input
                  type="text"
                  placeholder="e.g. Take with water after meals, avoid skipping"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Row 5: Clinical Notes / Precautions */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Clinical Notes / Cardiovascular Precautions
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Monitor resting pulse; contraindicated in severe hypotension or active bleeding."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer"
            style={{
              padding: '12px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#475569',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#ea580c',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(234, 88, 12, 0.2)'
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>{editingMedication ? 'Update Medication' : 'Save Medication'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
