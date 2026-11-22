import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  Filter,
  Loader2,
  Search,
  X,
  Plus,
  Pill,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import { ClinicalTemplate, MedicalCondition, MedicationReference } from '../../types';
import { api } from '../../services/api';
import { AddMedicationModal } from '../modals/AddMedicationModal';
import { MedicationViewModal } from '../modals/MedicationViewModal';

interface CommonMedicationPanelProps {
  conditions: MedicalCondition[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  /** '' when the catalogue list is showing, otherwise the condition key. */
  activeCondition: string;
  onSelectCondition: (key: string) => void;
  /** Templates matching the current view. */
  templates: ClinicalTemplate[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewTemplate: (template: ClinicalTemplate) => void;
}

const CATEGORY_FILTERS = [
  'All',
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

/** Synonyms for clinical search so terms like "stomach" find Abdominal Pain, Diarrhea, Gastritis */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  stomach: ['abdominal_pain', 'diarrhea', 'gastritis', 'acid_reflux', 'vomiting', 'nausea'],
  belly: ['abdominal_pain', 'diarrhea', 'gastritis'],
  gut: ['abdominal_pain', 'diarrhea', 'gastritis', 'constipation'],
  loose: ['diarrhea'],
  stool: ['diarrhea', 'constipation'],
  heart: ['cardiac', 'chest_pain', 'heart_failure', 'hypertension', 'eecp'],
  bp: ['hypertension', 'cardiac'],
  pressure: ['hypertension'],
  sugar: ['diabetes'],
  glucose: ['diabetes'],
  lung: ['respiratory', 'cough', 'asthma', 'flu', 'cold'],
  breath: ['respiratory', 'asthma', 'cough'],
  breathing: ['respiratory', 'asthma', 'cough'],
  temp: ['fever', 'infection'],
  pyrexia: ['fever'],
  head: ['headache'],
  migraine: ['headache'],
  joint: ['arthritis', 'musculoskeletal_pain', 'back_pain'],
  spine: ['back_pain'],
  kidney: ['kidney'],
  urine: ['kidney'],
  uti: ['kidney']
};

export const CommonMedicationPanel: React.FC<CommonMedicationPanelProps> = ({
  conditions,
  searchTerm,
  onSearchChange,
  activeCondition,
  onSelectCondition,
  templates,
  loading: templatesLoading,
  error: templatesError,
  onRetry,
  onViewTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewTab, setViewTab] = useState<'catalog' | 'conditions'>('catalog');

  // Medication References State
  const [medications, setMedications] = useState<MedicationReference[]>([]);
  const [medLoading, setMedLoading] = useState<boolean>(true);
  const [medError, setMedError] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingMed, setEditingMed] = useState<MedicationReference | null>(null);
  const [viewingMed, setViewingMed] = useState<MedicationReference | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch medications from backend
  const loadMedications = useCallback(async () => {
    setMedLoading(true);
    setMedError(null);
    try {
      const data = await api.getMedications();
      setMedications(data || []);
    } catch (err: any) {
      console.error('Failed to load medication catalog:', err);
      setMedError(err?.message || 'Failed to load medication catalog');
    } finally {
      setMedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  // Show temporary toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete medication
  const handleDeleteMedication = async (med: MedicationReference) => {
    if (!med.id) return;
    if (confirm(`Are you sure you want to remove "${med.medication_name}" from Common Medications?`)) {
      try {
        await api.deleteMedication(med.id);
        triggerToast(`"${med.medication_name}" was deleted successfully.`);
        loadMedications();
      } catch (err: any) {
        alert(err?.message || 'Failed to delete medication');
      }
    }
  };

  // Find condition object if one is drilled into
  const currentCondition = useMemo(() => {
    if (!activeCondition) return null;
    return conditions.find((c) => c.key === activeCondition) || null;
  }, [conditions, activeCondition]);

  // Helper to test if a template belongs to a condition
  const getTemplatesForCondition = (cond: MedicalCondition): ClinicalTemplate[] => {
    const keyLower = cond.key.toLowerCase().replace(/_/g, ' ');
    const labelLower = cond.label.toLowerCase();
    const catLower = (cond.category || '').toLowerCase();

    return templates.filter((tpl) => {
      const name = (tpl.name || '').toLowerCase();
      const desc = (tpl.description || '').toLowerCase();
      const tags = (tpl.tags || '').toLowerCase();
      const cat = (tpl.category || tpl.specialty || '').toLowerCase();

      // Direct name match or tag match
      if (name.includes(labelLower) || labelLower.includes(name)) return true;
      if (keyLower.length > 2 && (name.includes(keyLower) || tags.includes(keyLower))) return true;

      // Special mappings
      if (cond.key === 'diarrhea' && name.includes('diarrhea')) return true;
      if (cond.key === 'fever' && (name.includes('fever') || tags.includes('fever'))) return true;
      if (cond.key === 'abdominal_pain' && (name.includes('abdominal') || name.includes('colic'))) return true;
      if (cond.key === 'chest_pain' && (name.includes('chest pain') || name.includes('angina'))) return true;
      if (cond.key === 'hypertension' && (name.includes('hypertension') || name.includes('bp'))) return true;
      if (cond.key === 'diabetes' && name.includes('diabetes')) return true;
      if (cond.key === 'eecp' && name.includes('eecp')) return true;
      if (cond.key === 'asthma' && name.includes('asthma')) return true;
      if (cond.key === 'cough' && name.includes('cough')) return true;
      if (cond.key === 'headache' && (name.includes('headache') || name.includes('migraine'))) return true;
      if (cond.key === 'vomiting' && (name.includes('vomit') || name.includes('emesis'))) return true;
      if (cond.key === 'back_pain' && (name.includes('back') || name.includes('spine'))) return true;
      if (cond.key === 'cardiac' && (name.includes('cardiac') || name.includes('heart') || cat.includes('cardiac'))) return true;

      // Category match with strong descriptor
      if (catLower && cat === catLower && (desc.includes(labelLower) || tags.includes(labelLower))) return true;

      return false;
    });
  };

  // Filter conditions based on search and category
  const filteredConditions = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase();

    const synonymMatches = new Set<string>();
    if (rawSearch) {
      Object.entries(SEARCH_SYNONYMS).forEach(([synonym, condKeys]) => {
        if (rawSearch.includes(synonym) || synonym.includes(rawSearch)) {
          condKeys.forEach((k) => synonymMatches.add(k));
        }
      });
    }

    return conditions.filter((c) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const condCat = (c.category || '').toLowerCase();
        const selCat = selectedCategory.toLowerCase();
        const matchesCategory =
          condCat.includes(selCat) ||
          selCat.includes(condCat) ||
          (selectedCategory === 'Cardiology' && condCat.includes('cardiac')) ||
          (selectedCategory === 'Kidney / Urinary' && condCat.includes('kidney'));
        if (!matchesCategory) return false;
      }

      // Search query
      if (!rawSearch) return true;

      if (synonymMatches.has(c.key)) return true;

      const label = c.label.toLowerCase();
      const cat = (c.category || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();

      return (
        label.includes(rawSearch) ||
        cat.includes(rawSearch) ||
        desc.includes(rawSearch) ||
        c.key.toLowerCase().includes(rawSearch)
      );
    });
  }, [conditions, searchTerm, selectedCategory]);

  // Filtered medications
  const filteredMedications = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return medications.filter((m) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const medCat = (m.category || '').toLowerCase();
        const condName = (m.condition_name || '').toLowerCase();
        const sel = selectedCategory.toLowerCase();
        const matches =
          medCat.includes(sel) ||
          condName.includes(sel) ||
          (selectedCategory === 'Cardiology' && (medCat.includes('cardiac') || condName.includes('cardiac') || condName.includes('angina')));
        if (!matches) return false;
      }

      // Search query
      if (!q) return true;

      const name = (m.medication_name || '').toLowerCase();
      const generic = (m.generic_name || '').toLowerCase();
      const cond = (m.condition_name || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();
      const notes = (m.notes || '').toLowerCase();
      const instructions = (m.instructions || '').toLowerCase();

      return (
        name.includes(q) ||
        generic.includes(q) ||
        cond.includes(q) ||
        cat.includes(q) ||
        notes.includes(q) ||
        instructions.includes(q)
      );
    });
  }, [medications, searchTerm, selectedCategory]);

  // Open primary or first matching template for a condition
  const handleOpenConditionTemplate = (cond: MedicalCondition) => {
    const matched = getTemplatesForCondition(cond);
    if (matched.length > 0) {
      const exact = matched.find(
        (t) => t.name.toLowerCase() === cond.label.toLowerCase() || t.name.toLowerCase() === `${cond.label.toLowerCase()} assessment`
      );
      onViewTemplate(exact || matched[0]);
    } else {
      onSelectCondition(cond.key);
    }
  };

  // Templates for currently drilled-in condition
  const activeConditionTemplates = useMemo(() => {
    if (!currentCondition) return [];
    return getTemplatesForCondition(currentCondition);
  }, [currentCondition, templates]);

  return (
    <section className="cm-panel" aria-label="Common Medications" style={{ padding: '0 0 24px 0' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            backgroundColor: '#065f46',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 9999
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '14px',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c'
            }}
          >
            <Pill size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Common Medications &amp; Protocols
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                {medications.length} Prescriptions Active
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
              Standardized pharmaceutical catalog, clinical dosages, frequencies, and patient treatment instructions.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Primary Add Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              padding: '3px',
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setViewTab('catalog');
                if (activeCondition) onSelectCondition('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '12.5px',
                fontWeight: viewTab === 'catalog' ? 600 : 500,
                backgroundColor: viewTab === 'catalog' ? '#ffffff' : 'transparent',
                color: viewTab === 'catalog' ? '#0f172a' : '#64748b',
                boxShadow: viewTab === 'catalog' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Pill size={14} /> Medication Catalog ({filteredMedications.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('conditions')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '12.5px',
                fontWeight: viewTab === 'conditions' ? 600 : 500,
                backgroundColor: viewTab === 'conditions' ? '#ffffff' : 'transparent',
                color: viewTab === 'conditions' ? '#0f172a' : '#64748b',
                boxShadow: viewTab === 'conditions' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Activity size={14} /> Clinical Protocols ({filteredConditions.length})
            </button>
          </div>

          {/* ADD COMMON MEDICATION CTA BUTTON */}
          <button
            type="button"
            className="charm-btn-orange-new"
            onClick={() => {
              setEditingMed(null);
              setIsAddModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              padding: '7px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(234, 88, 12, 0.25)'
            }}
          >
            <Plus size={16} />
            <span>Add Common Medication</span>
          </button>
        </div>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
          <div className="cm-search-wrap" style={{ width: '100%' }}>
            <Search size={15} className="cm-search-icon" aria-hidden="true" />
            <label htmlFor="medication-search-input" className="visually-hidden">
              Search medication, condition or generic salt
            </label>
            <input
              id="medication-search-input"
              type="search"
              placeholder="🔍 Search medication, salt, or condition..."
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (activeCondition) onSelectCondition('');
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="cm-search-clear"
                onClick={() => {
                  onSearchChange('');
                  if (activeCondition) onSelectCondition('');
                }}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills & Refresh */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            maxWidth: '100%'
          }}
        >
          <Filter size={14} color="#64748b" style={{ flexShrink: 0, marginRight: '2px' }} />
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  if (activeCondition) onSelectCondition('');
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? '#ea580c' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid #ea580c' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            );
          })}

          <button
            type="button"
            className="charm-btn-refresh-icon"
            onClick={loadMedications}
            title="Refresh medication list"
            style={{
              padding: '6px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '4px'
            }}
          >
            <RefreshCw size={14} className={medLoading ? 'animate-spin' : ''} color="#64748b" />
          </button>
        </div>
      </div>

      {/* VIEW TAB 1: Medication Reference Catalog Table */}
      {viewTab === 'catalog' && (
        <>
          {medLoading ? (
            <div className="charm-table-container">
              <div className="table-state-panel" role="status">
                <Loader2 size={28} className="spin" aria-hidden="true" />
                <p className="state-title">Loading Common Medications…</p>
                <p className="state-hint">Fetching pre-configured pharmaceutical catalog from database.</p>
              </div>
            </div>
          ) : medError ? (
            <div className="charm-table-container">
              <div className="table-state-panel error" role="alert">
                <p className="state-title">Unable to load medication catalog</p>
                <p className="state-hint">{medError}</p>
                <button type="button" className="btn-secondary" onClick={loadMedications}>
                  Retry
                </button>
              </div>
            </div>
          ) : filteredMedications.length === 0 ? (
            <div className="charm-table-container">
              <div className="table-state-panel" role="status">
                <FileSearch size={28} aria-hidden="true" />
                <p className="state-title">No medications match your search</p>
                <p className="state-hint">
                  {searchTerm ? 'Try adjusting your search terms or filter.' : 'Add your first clinical drug with "+ Add Common Medication".'}
                </p>
                <button
                  type="button"
                  className="btn-orange"
                  onClick={() => {
                    setEditingMed(null);
                    setIsAddModalOpen(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    padding: '7px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  <Plus size={14} /> Add First Medication
                </button>
              </div>
            </div>
          ) : (
            <div className="charm-table-container" style={{ border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <table className="charm-table cm-med-table" style={{ fontSize: '13px', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th scope="col" style={{ width: '28%', textAlign: 'left', padding: '10px 14px' }}>
                      Medication &amp; Salt Composition
                    </th>
                    <th scope="col" style={{ width: '22%', textAlign: 'left', padding: '10px 14px' }}>
                      Condition / Specialty
                    </th>
                    <th scope="col" style={{ width: '14%', textAlign: 'left', padding: '10px 14px' }}>
                      Strength &amp; Form
                    </th>
                    <th scope="col" style={{ width: '14%', textAlign: 'left', padding: '10px 14px' }}>
                      Frequency
                    </th>
                    <th scope="col" style={{ width: '22%', textAlign: 'center', padding: '10px 14px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedications.map((med) => (
                    <tr
                      key={med.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Generic */}
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          type="button"
                          onClick={() => setViewingMed(med)}
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: '#0288d1',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            padding: 0
                          }}
                        >
                          {med.medication_name}
                        </button>
                        {med.generic_name && (
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            {med.generic_name}
                          </div>
                        )}
                      </td>

                      {/* Condition & Category */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block' }}>
                          {med.condition_name}
                        </span>
                        <span
                          className="badge badge-category"
                          style={{
                            display: 'inline-block',
                            marginTop: '2px',
                            fontSize: '10.5px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: med.category === 'Cardiology' ? '#f0fdfa' : '#f1f5f9',
                            color: med.category === 'Cardiology' ? '#0f766e' : '#475569',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          {med.category}
                        </span>
                      </td>

                      {/* Form & Strength */}
                      <td style={{ padding: '10px 14px' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                          {med.strength || 'Standard'}
                        </strong>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {med.form || (med as any).dosage_form || 'Tablet'}
                        </span>
                      </td>

                      {/* Frequency */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}
                        >
                          {med.frequency}
                        </span>
                        {med.duration && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            {med.duration}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setViewingMed(med)}
                            title="View Full Medication Details"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#0288d1',
                              backgroundColor: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} /> View
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingMed(med);
                              setIsAddModalOpen(true);
                            }}
                            title="Edit Medication"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#475569',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteMedication(med)}
                            title="Delete Medication"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#dc2626',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* VIEW TAB 2: Conditions & Clinical Protocols */}
      {viewTab === 'conditions' && (
        <>
          {currentCondition ? (
            <div className="cm-detail" style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '20px' }}>
              <div className="cm-detail-head" style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  className="cm-back-link"
                  onClick={() => onSelectCondition('')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#0288d1',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '8px',
                    padding: 0
                  }}
                >
                  <ChevronLeft size={16} /> All Clinical Conditions
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {currentCondition.label}
                    </h2>
                    {currentCondition.category && (
                      <span className="badge badge-category" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        {currentCondition.category}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingMed({
                        condition_key: currentCondition.key,
                        condition_name: currentCondition.label,
                        category: currentCondition.category || 'Cardiology',
                        medication_name: '',
                        generic_name: '',
                        strength: '',
                        frequency: 'OD (Once daily)',
                        instructions: 'Take after meals'
                      } as any);
                      setIsAddModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: '#ea580c',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add Drug to {currentCondition.label}
                  </button>
                </div>
              </div>

              {currentCondition.description && (
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                  {currentCondition.description}
                </p>
              )}

              {/* Matching Clinical Templates */}
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Clinical Form Templates for {currentCondition.label}
              </h3>

              {templatesLoading ? (
                <div className="table-state-panel" role="status">
                  <Loader2 size={26} className="spin" />
                  <p className="state-title">Loading clinical templates…</p>
                </div>
              ) : activeConditionTemplates.length === 0 ? (
                <div className="table-state-panel" role="status" style={{ padding: '24px' }}>
                  <FileSearch size={26} />
                  <p className="state-title">No templates directly matched for {currentCondition.label}</p>
                  <p className="state-hint">
                    You can create a new custom template or add common medications above.
                  </p>
                </div>
              ) : (
                <div className="charm-table-container" style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <table className="charm-table my-templates-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th scope="col" style={{ width: '45%' }}>Template Name</th>
                        <th scope="col" style={{ width: '25%' }}>Category / Specialty</th>
                        <th scope="col" style={{ width: '15%' }}>Type</th>
                        <th scope="col" style={{ width: '15%', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeConditionTemplates.map((tpl) => (
                        <tr key={tpl.id}>
                          <td>
                            <button
                              type="button"
                              className="template-name-link"
                              onClick={() => onViewTemplate(tpl)}
                              style={{
                                fontWeight: 600,
                                color: '#0288d1',
                                fontSize: '13.5px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                padding: 0
                              }}
                            >
                              {tpl.name}
                            </button>
                            {tpl.description && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {tpl.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-category">
                              {tpl.category || tpl.specialty || 'General Medicine'}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-type">{tpl.template_type}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-orange"
                              onClick={() => onViewTemplate(tpl)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: '#ea580c',
                                color: '#ffffff',
                                padding: '5px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Open Form <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* VIEW: All Clinical Conditions List */
            <>
              {filteredConditions.length === 0 ? (
                <div className="table-state-panel" role="status">
                  <FileSearch size={28} />
                  <p className="state-title">No matching clinical conditions found</p>
                  <p className="state-hint">
                    Try searching for symptoms like &quot;cough&quot;, &quot;fever&quot;, &quot;stomach&quot;, or &quot;chest&quot;.
                  </p>
                </div>
              ) : (
                <div className="charm-table-container" style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <table className="charm-table cm-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th scope="col" style={{ width: '28%' }}>Condition</th>
                        <th scope="col" style={{ width: '20%' }}>Category</th>
                        <th scope="col" style={{ width: '36%' }}>Clinical Focus &amp; Documentation</th>
                        <th scope="col" style={{ width: '16%', textAlign: 'center' }}>Clinical Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConditions.map((cond) => {
                        const matched = getTemplatesForCondition(cond);
                        const templateCount = matched.length;

                        return (
                          <tr
                            key={cond.key}
                            className="cm-row"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleOpenConditionTemplate(cond)}
                          >
                            <td data-label="Condition">
                              <button
                                type="button"
                                className="template-name-link cm-condition-link"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenConditionTemplate(cond);
                                }}
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: '#0288d1',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  padding: 0
                                }}
                              >
                                {cond.label}
                              </button>
                              {templateCount > 0 && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                                  {templateCount} clinical template{templateCount === 1 ? '' : 's'}
                                </div>
                              )}
                            </td>

                            <td data-label="Category">
                              <span className="badge badge-category" style={{ fontSize: '11px' }}>
                                {cond.category}
                              </span>
                            </td>

                            <td data-label="Description" className="cm-desc-cell" style={{ color: '#475569', fontSize: '12.5px' }}>
                              {cond.description}
                            </td>

                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenConditionTemplate(cond)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  backgroundColor: '#ea580c',
                                  color: '#ffffff',
                                  padding: '6px 14px',
                                  borderRadius: '4px',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(234, 88, 12, 0.2)'
                                }}
                              >
                                Open Form <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* POPUP MODAL: Add / Edit Common Medication */}
      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMed(null);
        }}
        onSaved={(newMed) => {
          triggerToast(`"${newMed.medication_name}" saved to Common Medications successfully!`);
          loadMedications();
        }}
        editingMedication={editingMed}
        conditions={conditions}
      />

      {/* POPUP MODAL: View Medication Details */}
      <MedicationViewModal
        isOpen={Boolean(viewingMed)}
        onClose={() => setViewingMed(null)}
        medication={viewingMed}
        onEdit={(med) => {
          setViewingMed(null);
          setEditingMed(med);
          setIsAddModalOpen(true);
        }}
      />
    </section>
  );
};
