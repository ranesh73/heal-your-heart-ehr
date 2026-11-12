import React from 'react';
import { AlertCircle, CheckCircle2, FileSearch, Loader2, Sparkles } from 'lucide-react';
import { ClinicalTemplate } from '../../types';
import { ActionOption, ThreeDotMenu } from '../common/ThreeDotMenu';

interface MyTemplatesTableProps {
  templates: ClinicalTemplate[];
  loading: boolean;
  /** Non-null when the last fetch failed; shown instead of the table. */
  error?: string | null;
  onAction: (action: ActionOption, template: ClinicalTemplate) => void;
  onTemplateClick: (template: ClinicalTemplate) => void;
  onRetry?: () => void;
  onResetFilters?: () => void;
  /** True when any search / type / condition filter is narrowing the list. */
  hasActiveFilters?: boolean;
}

export const MyTemplatesTable: React.FC<MyTemplatesTableProps> = ({
  templates,
  loading,
  error,
  onAction,
  onTemplateClick,
  onRetry,
  onResetFilters,
  hasActiveFilters = false
}) => {
  if (loading) {
    return (
      <div className="charm-table-container">
        <div className="table-state-panel" role="status" aria-live="polite">
          <Loader2 size={28} className="spin" aria-hidden="true" />
          <p className="state-title">Loading templates…</p>
          <p className="state-hint">Fetching your clinical templates from the server.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="charm-table-container">
        <div className="table-state-panel error" role="alert">
          <AlertCircle size={28} aria-hidden="true" />
          <p className="state-title">Unable to load templates</p>
          <p className="state-hint">{error}</p>
          {onRetry && (
            <button type="button" className="btn-secondary" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="charm-table-container">
        <div className="table-state-panel" role="status">
          <FileSearch size={28} aria-hidden="true" />
          <p className="state-title">No templates available</p>
          <p className="state-hint">
            {hasActiveFilters
              ? 'Try changing your search or template type.'
              : 'Create your first clinical template with the + New Template button.'}
          </p>
          {hasActiveFilters && onResetFilters && (
            <button type="button" className="btn-secondary" onClick={onResetFilters}>
              Clear all filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="charm-table-container">
      <table className="charm-table my-templates-table">
        <caption className="visually-hidden">
          My clinical templates, showing name, medical category and template type
        </caption>
        <thead>
          <tr>
            <th scope="col" className="col-name">Template Name</th>
            <th scope="col" className="col-category">Category</th>
            <th scope="col" className="col-type">Template Type</th>
            <th scope="col" className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl) => {
            const isInactive = tpl.is_active === false;
            const hasPathway = Boolean(tpl.relationships && tpl.relationships.length > 0);
            const hasDefaults = Boolean(
              tpl.sections && tpl.sections.some((s) => s.components.some((c) => c.default_value))
            );
            const category = tpl.category || tpl.specialty;

            return (
              <tr
                key={tpl.id}
                className={isInactive ? 'row-inactive' : ''}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.col-actions')) return;
                  onTemplateClick(tpl);
                }}
              >
                <td data-label="Template Name">
                  <div className="name-cell">
                    <button
                      type="button"
                      className="template-name-link"
                      onClick={() => onTemplateClick(tpl)}
                      title={`View "${tpl.name}"`}
                    >
                      {tpl.name}
                    </button>

                    {hasPathway && (
                      <span className="badge badge-pathway" title="Horizontal Clinical Pathway enabled">
                        <Sparkles size={9} aria-hidden="true" /> Horizontal Pathway
                      </span>
                    )}

                    {isInactive && (
                      <span className="badge badge-inactive">Inactive</span>
                    )}
                  </div>

                  {tpl.description && (
                    <p className="name-cell-description">{tpl.description}</p>
                  )}

                  {hasDefaults && (
                    <span className="default-values-note">
                      <CheckCircle2 size={11} aria-hidden="true" />
                      Default values configured
                    </span>
                  )}
                </td>

                <td data-label="Category">
                  <span className={`badge badge-category ${category === 'EECP' ? 'eecp' : ''}`}>
                    {category}
                  </span>
                </td>

                <td data-label="Template Type">
                  <span className="badge badge-type">{tpl.template_type}</span>
                </td>

                <td data-label="Actions" className="col-actions">
                  <ThreeDotMenu template={tpl} mode="my" onAction={onAction} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
