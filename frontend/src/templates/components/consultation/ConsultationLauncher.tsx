import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, HeartPulse, Search, User, X } from 'lucide-react';
import { ClinicalTemplate, Patient } from '../../types';
import { api } from '../../services/api';

interface ConsultationLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (patient: Patient, template: ClinicalTemplate) => void;
}

/**
 * The Consultation module's own entry point: patient first, then template.
 *
 *   Patient selection -> Choose template -> Consultation
 *
 * This is deliberately the ONLY place a patient list appears alongside
 * templates. Template Management never shows patients; a template there is
 * an unbound, reusable document.
 */
export const ConsultationLauncher: React.FC<ConsultationLauncherProps> = ({
  isOpen,
  onClose,
  onStart
}) => {
  const [step, setStep] = useState<'patient' | 'template'>('patient');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('patient');
    setPatient(null);
    setQuery('');
    setError(null);
    setLoading(true);

    Promise.all([api.getPatients(), api.getTemplates({ tab: 'practice_templates' })])
      .then(([p, t]) => {
        setPatients(p);
        setTemplates(t);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load data.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.condition_history || '').toLowerCase().includes(q)
    );
  }, [patients, query]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.template_type.toLowerCase().includes(q)
    );
  }, [templates, query]);

  if (!isOpen) return null;

  const chooseTemplate = async (tpl: ClinicalTemplate) => {
    if (!patient) return;
    try {
      // Load the full section/rule tree so conditional logic works at once.
      const full = await api.getTemplate(tpl.id);
      onStart(patient, full);
    } catch {
      onStart(patient, tpl);
    }
  };

  return (
    <div className="cl-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="cl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cl-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cl-header">
          <div>
            <h3 id="cl-title">
              <HeartPulse size={17} aria-hidden="true" /> Start Consultation
            </h3>
            <ol className="cl-steps">
              <li className={step === 'patient' ? 'on' : 'done'}>
                {step === 'template' && <Check size={12} aria-hidden="true" />} 1. Select patient
              </li>
              <li className={step === 'template' ? 'on' : ''}>2. Choose template</li>
            </ol>
          </div>
          <button type="button" className="cl-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="cl-searchbar">
          <Search size={15} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="cl-search">
            {step === 'patient' ? 'Search patients' : 'Search templates'}
          </label>
          <input
            id="cl-search"
            type="search"
            value={query}
            placeholder={step === 'patient' ? 'Search by name or MRN…' : 'Search templates…'}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="cl-body">
          {loading && <p className="cl-state">Loading…</p>}
          {error && <p className="cl-state error">{error}</p>}

          {!loading && !error && step === 'patient' && (
            filteredPatients.length === 0 ? (
              <p className="cl-state">No patients match “{query}”.</p>
            ) : (
              filteredPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="cl-row"
                  onClick={() => {
                    setPatient(p);
                    setQuery('');
                    setStep('template');
                  }}
                >
                  <User size={16} aria-hidden="true" />
                  <span className="cl-row-main">
                    <strong>{p.full_name}</strong>
                    <span className="cl-row-sub">
                      {p.mrn} · {p.age}y {p.gender}
                    </span>
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              ))
            )
          )}

          {!loading && !error && step === 'template' && (
            filteredTemplates.length === 0 ? (
              <p className="cl-state">No templates match “{query}”.</p>
            ) : (
              filteredTemplates.map((t) => (
                <button key={t.id} type="button" className="cl-row" onClick={() => chooseTemplate(t)}>
                  <span className="cl-row-main">
                    <strong>{t.name}</strong>
                    <span className="cl-row-sub">{t.template_type} · {t.category || t.specialty}</span>
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              ))
            )
          )}
        </div>

        <div className="cl-footer">
          {step === 'template' && patient && (
            <span className="cl-selected">
              Patient: <strong>{patient.full_name}</strong>
            </span>
          )}
          <div className="cl-footer-actions">
            {step === 'template' && (
              <button type="button" className="btn-secondary" onClick={() => setStep('patient')}>
                Back to patients
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
