import React from 'react';
import { ClinicalTemplate } from '../../types';
import { ThreeDotMenu, ActionOption } from '../common/ThreeDotMenu';
import { Download } from 'lucide-react';

interface LibraryTemplatesTableProps {
  templates: ClinicalTemplate[];
  loading: boolean;
  onAction: (action: ActionOption, template: ClinicalTemplate) => void;
  onTemplateClick: (template: ClinicalTemplate) => void;
  onQuickImport?: (template: ClinicalTemplate) => void;
}

export const LibraryTemplatesTable: React.FC<LibraryTemplatesTableProps> = ({
  templates,
  loading,
  onAction,
  onTemplateClick,
  onQuickImport
}) => {
  if (loading) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state">Loading CharmHealth Library...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state">No Library Templates available</div>
      </div>
    );
  }

  return (
    <div className="charm-table-container">
      <table className="charm-table">
        <thead>
          <tr>
            <th style={{ width: '22%' }}>Specialty</th>
            <th style={{ width: '45%' }}>Template Name</th>
            <th style={{ width: '20%' }}>Template Type</th>
            <th style={{ width: '13%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl) => (
            <tr key={tpl.id}>
              <td>
                <span
                  className={`specialty-tag ${
                    tpl.specialty === 'EECP' ? 'eecp-badge' : ''
                  }`}
                >
                  {tpl.specialty}
                </span>
              </td>
              <td>
                <span
                  className="template-name-link"
                  onClick={() => onTemplateClick(tpl)}
                >
                  {tpl.name}
                </span>
                {tpl.description && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {tpl.description}
                  </div>
                )}
              </td>
              <td>
                <span className="type-pill">{tpl.template_type}</span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {onQuickImport && (
                    <button
                      className="btn-link"
                      onClick={() => onQuickImport(tpl)}
                      title="Import into My Templates"
                      style={{ fontSize: '12px', color: '#0288d1', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Download size={13} /> Import
                    </button>
                  )}
                  <ThreeDotMenu
                    template={tpl}
                    mode="library"
                    onAction={onAction}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
