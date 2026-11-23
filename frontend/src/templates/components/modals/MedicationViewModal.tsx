import React from 'react';
import { X, Pill, Heart, Edit, Check, AlertCircle, Clock, Calendar, FileText } from 'lucide-react';
import { MedicationReference } from '../../types';

interface MedicationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: MedicationReference | null;
  onEdit: (med: MedicationReference) => void;
}

export const MedicationViewModal: React.FC<MedicationViewModalProps> = ({
  isOpen,
  onClose,
  medication,
  onEdit
}) => {
  if (!isOpen || !medication) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1200 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '600px',
          width: '100%',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
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
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea580c'
              }}
            >
              <Pill size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {medication.medication_name}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                {medication.generic_name || 'Standard Pharmaceutical Reference'}
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

        {/* Content Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Badges Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {medication.condition_name}
            </span>
            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {medication.category}
            </span>
            <span
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {medication.form || (medication as any).dosage_form || 'Tablet'}
            </span>
          </div>

          {/* Core Regimen Details Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, display: 'block' }}>
                Strength
              </span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                {medication.strength || 'Standard'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, display: 'block' }}>
                Frequency
              </span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                {medication.frequency || 'OD'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, display: 'block' }}>
                Duration
              </span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                {medication.duration || '30 Days'}
              </strong>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: '0 0 4px 0' }}>
              Patient Instructions &amp; Directions
            </h4>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '12px 14px',
                fontSize: '13px',
                color: '#1e293b'
              }}
            >
              {medication.instructions || 'Standard oral prescription; follow physician advice.'}
            </div>
          </div>

          {/* Clinical Notes / Precautions */}
          {medication.notes && (
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: '0 0 4px 0' }}>
                Clinical Warnings &amp; Cardiovascular Precautions
              </h4>
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  color: '#92400e',
                  display: 'flex',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{medication.notes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(medication);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0288d1',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              cursor: 'pointer'
            }}
          >
            <Edit size={14} /> Edit Medication
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: '#0F766E',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
