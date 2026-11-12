import React, { useState, useEffect } from 'react';
import { X, User, Search, ArrowRight, HeartPulse, Check } from 'lucide-react';
import { Patient, ClinicalTemplate } from '../../types';
import { api } from '../../services/api';

interface PatientSelectModalProps {
  isOpen: boolean;
  template: ClinicalTemplate | null;
  onClose: () => void;
  onSelectPatient: (patient: Patient, template: ClinicalTemplate) => void;
}

export const PatientSelectModal: React.FC<PatientSelectModalProps> = ({
  isOpen,
  template,
  onClose,
  onSelectPatient
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getPatients()
        .then((data) => {
          setPatients(data);
          if (data.length > 0) {
            setSelectedPatientId(data[0].id);
          }
        })
        .catch((err) => console.error('Failed to load patients', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen || !template) return null;

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.condition_history && p.condition_history.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleProceed = () => {
    const chosen = patients.find((p) => p.id === selectedPatientId);
    if (chosen) {
      onSelectPatient(chosen, template);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeartPulse size={18} color="#f57c00" />
            <div>
              <h3 className="modal-title">Select Patient for Consultation</h3>
              <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
                Template: <strong style={{ color: '#1f2937' }}>{template.name}</strong> ({template.template_type} - {template.specialty})
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px' }}>
          {/* Patient Search */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search demo patient by name, MRN, or condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No matching demo patients found</div>
            ) : (
              filteredPatients.map((patient) => {
                const isSelected = selectedPatientId === patient.id;
                return (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    style={{
                      border: isSelected ? '1.5px solid #0288d1' : '1px solid #e5e7eb',
                      backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                      borderRadius: '4px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#0288d1' : '#e0e7ff',
                          color: isSelected ? '#ffffff' : '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                          flexShrink: 0
                        }}
                      >
                        {patient.full_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{patient.full_name}</span>
                          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                            {patient.age} yrs • {patient.gender}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#0288d1', fontWeight: 600 }}>
                          MRN: {patient.mrn}
                        </div>
                        {patient.condition_history && (
                          <div style={{ fontSize: '11.5px', color: '#4b5563', marginTop: '2px', lineHeight: '1.4' }}>
                            {patient.condition_history}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ paddingLeft: '8px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isSelected ? '5px solid #0288d1' : '2px solid #cbd5e1',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleProceed}
            disabled={!selectedPatientId}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Start Template <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
