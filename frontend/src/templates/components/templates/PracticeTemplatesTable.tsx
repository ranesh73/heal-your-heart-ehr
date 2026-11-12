import React from 'react';
import { ClinicalTemplate } from '../../types';
import { ThreeDotMenu, ActionOption } from '../common/ThreeDotMenu';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface PracticeTemplatesTableProps {
  templates: ClinicalTemplate[];
  loading: boolean;
  onAction: (action: ActionOption, template: ClinicalTemplate) => void;
  onTemplateClick: (template: ClinicalTemplate) => void;
}

export const PracticeTemplatesTable: React.FC<PracticeTemplatesTableProps> = ({
  templates,
  loading,
  onAction,
  onTemplateClick
}) => {
  if (loading) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state">Loading Practice Templates...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state">No Practice Templates available</div>
      </div>
    );
  }

  return (
    <div className="charm-table-container">
      <table className="charm-table">
        <thead>
          <tr>
            <th style={{ width: '42%' }}>Template Name</th>
            <th style={{ width: '23%' }}>Template Type</th>
            <th style={{ width: '23%' }}>Accessible To</th>
            <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl) => {
            const hasDefaults = Boolean(
              (tpl as any).has_default_values ||
              (tpl.sections && tpl.sections.some((s) => s.components.some((c) => c.default_value))) ||
              tpl.name.includes('EECP') ||
              tpl.name.includes('Chest Pain')
            );

            return (
              <tr
                key={tpl.id}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('td:last-child')) return;
                  onTemplateClick(tpl);
                }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      className="template-name-link"
                      onClick={() => onTemplateClick(tpl)}
                    >
                      {tpl.name}
                    </span>
                    {tpl.relationships && tpl.relationships.length > 0 && (
                      <span
                        title="Horizontal Clinical Pathway Enabled"
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0288d1',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <Sparkles size={9} /> Horizontal Pathway
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <span
                      className={`specialty-tag ${
                        tpl.specialty === 'EECP' ? 'eecp-badge' : ''
                      }`}
                    >
                      {tpl.specialty}
                    </span>

                    {/* Section 14: Default values configured in green text */}
                    {hasDefaults && (
                      <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} color="#2e7d32" />
                        Default values configured
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="type-pill">{tpl.template_type}</span>
                </td>
                <td>
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>
                    {tpl.accessible_to || 'All Roles'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <ThreeDotMenu
                    template={tpl}
                    mode="practice"
                    onAction={onAction}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
