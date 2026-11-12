import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { ClinicalTemplate, MedicalCondition } from '../../types';

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
  'General Medicine',
  'Cardiology',
  'Respiratory',
  'Gastrointestinal',
  'Diabetes',
  'Neurology',
  'Musculoskeletal',
  'Kidney / Urinary',
  'Anesthesia',
  'Vaccination',
  'EECP'
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

    // Check synonym keys
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

  // Open primary or first matching template for a condition
  const handleOpenConditionTemplate = (cond: MedicalCondition) => {
    const matched = getTemplatesForCondition(cond);
    if (matched.length > 0) {
      // Find best match (exact condition name preferred)
      const exact = matched.find(
        (t) => t.name.toLowerCase() === cond.label.toLowerCase() || t.name.toLowerCase() === `${cond.label.toLowerCase()} assessment`
      );
      onViewTemplate(exact || matched[0]);
    } else {
      // Drill into condition to let user see or create
      onSelectCondition(cond.key);
    }
  };

  // Templates for currently drilled-in condition
  const activeConditionTemplates = useMemo(() => {
    if (!currentCondition) return [];
    return getTemplatesForCondition(currentCondition);
  }, [currentCondition, templates]);

  return (
    <section className="cm-panel" aria-label="Clinical Condition Templates" style={{ padding: '0 0 24px 0' }}>
      {/* Top Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '14px',
          marginBottom: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Activity size={20} color="#ea580c" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Clinical Condition Templates
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fed7aa',
                padding: '2px 8px',
                borderRadius: '12px'
              }}
            >
              Interactive Forms
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Fully interactive clinical templates for patient evaluation, symptom assessment, and clinical documentation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
            {filteredConditions.length} Conditions Available
          </span>
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
            <label htmlFor="condition-search-input" className="visually-hidden">
              Search condition or category
            </label>
            <input
              id="condition-search-input"
              type="search"
              placeholder="🔍 Search condition or category..."
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

        {/* Category Pills Bar */}
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
        </div>
      </div>

      {/* VIEW: Drilled into a Specific Condition */}
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
          </div>

          {currentCondition.description && (
            <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              {currentCondition.description}
            </p>
          )}

          {templatesLoading ? (
            <div className="table-state-panel" role="status">
              <Loader2 size={26} className="spin" />
              <p className="state-title">Loading clinical templates…</p>
            </div>
          ) : templatesError ? (
            <div className="table-state-panel error" role="alert">
              <p className="state-title">Unable to load templates</p>
              <p className="state-hint">{templatesError}</p>
              {onRetry && (
                <button type="button" className="btn-secondary" onClick={onRetry}>
                  Try again
                </button>
              )}
            </div>
          ) : activeConditionTemplates.length === 0 ? (
            <div className="table-state-panel" role="status">
              <FileSearch size={26} />
              <p className="state-title">No templates directly matched for {currentCondition.label}</p>
              <p className="state-hint">
                You can create a new custom template or browse all available clinical templates in My Templates.
              </p>
            </div>
          ) : (
            <div className="charm-table-container" style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <table className="charm-table my-templates-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th scope="col" style={{ width: '40%' }}>Template Name</th>
                    <th scope="col" style={{ width: '22%' }}>Category / Specialty</th>
                    <th scope="col" style={{ width: '18%' }}>Template Type</th>
                    <th scope="col" style={{ width: '20%', textAlign: 'center' }}>Action</th>
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
                            gap: '6px',
                            backgroundColor: '#ea580c',
                            color: '#ffffff',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Open Template Form <ArrowRight size={13} />
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
                    <th scope="col" style={{ width: '26%' }}>Condition</th>
                    <th scope="col" style={{ width: '20%' }}>Category</th>
                    <th scope="col" style={{ width: '38%' }}>Clinical Focus &amp; Documentation</th>
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
    </section>
  );
};
