import React, { useState, useEffect } from 'react';
import { X, CheckSquare, CheckCircle } from 'lucide-react';
import { ClinicalTemplate } from '../../types';

interface DefaultValuesModalProps {
  isOpen: boolean;
  template: ClinicalTemplate | null;
  onClose: () => void;
  onSaveDefaults: (templateId: number, defaults: Record<string, string>) => void;
}

export const DefaultValuesModal: React.FC<DefaultValuesModalProps> = ({
  isOpen,
  template,
  onClose,
  onSaveDefaults
}) => {
  const [defaultsMap, setDefaultsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template && template.sections) {
      const initial: Record<string, string> = {};
      template.sections.forEach((sec) => {
        sec.components.forEach((comp) => {
          if (comp.id) {
            initial[comp.id.toString()] = comp.default_value || '';
          }
        });
      });
      setDefaultsMap(initial);
    }
  }, [template]);

  if (!isOpen || !template) return null;

  const handleValueChange = (compId: number, val: string) => {
    setDefaultsMap((prev) => ({
      ...prev,
      [compId.toString()]: val
    }));
  };

  const handleSave = () => {
    onSaveDefaults(template.id, defaultsMap);
  };

  const allComponents = (template.sections || []).flatMap((sec) =>
    sec.components.map((c) => ({ ...c, sectionTitle: sec.title }))
  );

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={18} color="#2e7d32" />
            <h3 className="modal-title">Configure Default Values</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px' }}>
            Set baseline default values for <strong>{template.name}</strong>. Fields with active default values will display a green indicator badge.
          </p>

          {allComponents.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              No configurable questions found in this template.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {allComponents.map((comp) => {
                const compId = comp.id || 0;
                const currentVal = defaultsMap[compId.toString()] ?? (comp.default_value || '');
                const hasDefault = Boolean(currentVal && currentVal.trim());

                return (
                  <div
                    key={compId}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                          {comp.sectionTitle} • {comp.component_type}
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {comp.label}
                        </div>
                      </div>

                      {hasDefault && (
                        <span className="default-value-badge">
                          <CheckCircle size={11} /> Default value configured
                        </span>
                      )}
                    </div>

                    {comp.options && comp.options.length > 0 ? (
                      <select
                        className="select-control"
                        value={currentVal}
                        onChange={(e) => handleValueChange(compId, e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">-- No Default Value --</option>
                        {comp.options.map((opt) => (
                          <option key={opt.option_value} value={opt.option_value}>
                            {opt.option_label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter default text..."
                        value={currentVal}
                        onChange={(e) => handleValueChange(compId, e.target.value)}
                        className="field-input"
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save Default Values
          </button>
        </div>
      </div>
    </div>
  );
};
