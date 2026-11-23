import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  if (loading) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          Loading Email Templates...
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="charm-table-container">
        <div className="empty-table-state" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          No Email Templates available
        </div>
      </div>
    );
  }

  const totalItems = templates.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentTemplates = templates.slice(startIndex, endIndex);

  return (
    <div className="charm-table-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <table className="charm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ width: '55%', padding: '10px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Template Name
            </th>
            <th style={{ width: '25%', padding: '10px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Template Type
            </th>
            <th style={{ width: '20%', padding: '10px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {currentTemplates.map((tpl) => (
            <tr
              key={tpl.id}
              style={{
                borderBottom: '1px solid #f1f5f9',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <td style={{ padding: '12px 16px' }}>
                <span
                  className="template-name-link"
                  onClick={() => onTemplateClick(tpl)}
                  style={{
                    color: '#0288d1',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {tpl.name}
                </span>
                {tpl.description && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                    {tpl.description}
                  </div>
                )}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span
                  className="type-pill"
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1'
                  }}
                >
                  Email
                </span>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
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

      {/* CharmHealth Pagination: < 1 - 25 of 26 > */}
      <div
        className="charm-pagination-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '12px 20px',
          gap: '14px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          fontSize: '13px',
          color: '#64748b'
        }}
      >
        <span>
          {startIndex + 1} - {endIndex} of {totalItems}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              backgroundColor: '#ffffff',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              color: currentPage <= 1 ? '#cbd5e1' : '#334155'
            }}
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              backgroundColor: '#ffffff',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              color: currentPage >= totalPages ? '#cbd5e1' : '#334155'
            }}
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
