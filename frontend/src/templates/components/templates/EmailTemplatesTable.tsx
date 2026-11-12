import React from 'react';
import { ClinicalTemplate } from '../../types';
import { ThreeDotMenu, ActionOption } from '../common/ThreeDotMenu';

interface EmailTemplatesTableProps {
  templates: ClinicalTemplate[];
  loading: boolean;
  onAction: (action: ActionOption, template: ClinicalTemplate) => void;
  onTemplateClick: (template: ClinicalTemplate) => void;
}

export const EmailTemplatesTable: React.FC<EmailTemplatesTableProps> = ({
  templates,
  loading,
  onAction,
  onTemplateClick
}) => {
  if (loading) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state">Loading Email Templates...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state">No Email Templates available</div>
      </div>
    );
  }

  return (
    <div className="charm-table-container">
      <table className="charm-table">
        <thead>
          <tr>
            <th style={{ width: '60%' }}>Template Name</th>
            <th style={{ width: '25%' }}>Template Type</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl) => (
            <tr key={tpl.id}>
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
                <span className="type-pill">Email</span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <ThreeDotMenu
                  template={tpl}
                  mode="email"
                  onAction={onAction}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
