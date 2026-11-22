import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, RefreshCw, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { ClinicalTemplate, TabType, MedicalCondition } from './types';
import { api } from './services/api';
import { TemplateTabs } from './components/layout/TemplateTabs';
import { MyTemplatesTable } from './components/templates/MyTemplatesTable';
import { PracticeTemplatesTable } from './components/templates/PracticeTemplatesTable';
import { EmailTemplatesTable } from './components/templates/EmailTemplatesTable';
import { LibraryTemplatesTable } from './components/templates/LibraryTemplatesTable';
import { CommonMedicationPanel } from './components/templates/CommonMedicationPanel';
import { TemplateDetailsPage } from './components/viewer/TemplateDetailsPage';
import { TemplateBuilder } from './components/builder/TemplateBuilder';
import { NewTemplateModal } from './components/modals/NewTemplateModal';
import { ActionOption } from './components/common/ThreeDotMenu';
import { TEMPLATE_TYPES, TEMPLATE_TYPE_OPTIONS, MEDICAL_CATEGORIES } from './constants/templateTypes';
import './styles/charm-theme.css';
import './styles/my-templates.css';
import './styles/pathway.css';
import './styles/option-tree.css';
import './styles/template-viewer.css';
import './styles/builder.css';

interface TemplatesModuleProps {
  initialTab?: string;
  onNavigateTab?: (tabSlug: string) => void;
  onBackToDashboard?: () => void;
}

const TAB_SLUG_MAP: Record<string, TabType> = {
  'my-templates': 'my_templates',
  'practice-templates': 'practice_templates',
  'email-templates': 'email_templates',
  'charmhealth-library': 'template_library',
  'common-medication': 'common_medication',
  'common-medications': 'common_medication',
};

const TAB_TO_SLUG_MAP: Record<TabType, string> = {
  my_templates: 'my-templates',
  practice_templates: 'practice-templates',
  email_templates: 'email-templates',
  template_library: 'charmhealth-library',
  common_medication: 'common-medication',
};

export function TemplatesModule({
  initialTab = 'my-templates',
  onNavigateTab,
  onBackToDashboard,
}: TemplatesModuleProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    TAB_SLUG_MAP[initialTab] || 'my_templates'
  );
  const [viewMode, setViewMode] = useState<'list' | 'viewer' | 'builder'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Template list state
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters - default to 'SOAP' matching CharmHealth reference layout
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('SOAP');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Common medication conditions
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [activeCondition, setActiveCondition] = useState('');

  useEffect(() => {
    api.getMedicalConditions().then(setConditions).catch(() => {});
  }, []);

  // Sync tab with external prop
  useEffect(() => {
    if (initialTab && TAB_SLUG_MAP[initialTab]) {
      setActiveTab(TAB_SLUG_MAP[initialTab]);
      setViewMode('list');
      setSelectedTemplate(null);
    }
  }, [initialTab]);

  // Load templates for current tab and filters
  const loadTemplates = useCallback(async () => {
    if (activeTab === 'common_medication') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTemplates({
        tab: activeTab,
        search: search.trim() || undefined,
        template_type: typeFilter !== 'All' ? typeFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
      });
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      setError(err?.message || 'Failed to fetch clinical templates');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, typeFilter, categoryFilter]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    setViewMode('list');
    setSelectedTemplate(null);
    const slug = TAB_TO_SLUG_MAP[tab];
    if (onNavigateTab && slug) {
      onNavigateTab(slug);
    }
  };

  const loadFullTemplate = async (t: ClinicalTemplate): Promise<ClinicalTemplate> => {
    try {
      const full = await api.getTemplate(t.id);
      return full || t;
    } catch (err) {
      console.error('Failed to load full template:', err);
      return t;
    }
  };

  const handleTemplateClick = async (t: ClinicalTemplate) => {
    const full = await loadFullTemplate(t);
    setSelectedTemplate(full);
    setViewMode('viewer');
  };

  const handleAction = async (action: ActionOption, t: ClinicalTemplate) => {
    if (action === 'view') {
      const full = await loadFullTemplate(t);
      setSelectedTemplate(full);
      setViewMode('viewer');
    } else if (action === 'edit') {
      const full = await loadFullTemplate(t);
      setSelectedTemplate(full);
      setViewMode('builder');
    } else if (action === 'duplicate') {
      try {
        await api.duplicateTemplate(t.id);
        loadTemplates();
      } catch (err) {
        console.error(err);
      }
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to deactivate template "${t.name}"?`)) {
        try {
          await api.setTemplateStatus(t.id, false);
          loadTemplates();
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // If in viewer mode: render TemplateDetailsPage (with horizontal pathway)
  if (viewMode === 'viewer' && selectedTemplate) {
    return (
      <div className="charm-templates-fullscreen-wrap">
        <TemplateDetailsPage
          template={selectedTemplate}
          onBack={() => setViewMode('list')}
          onEdit={(t) => {
            setSelectedTemplate(t);
            setViewMode('builder');
          }}
        />
      </div>
    );
  }

  // If in builder mode: render TemplateBuilder
  if (viewMode === 'builder') {
    return (
      <div className="charm-templates-fullscreen-wrap">
        <TemplateBuilder
          initialTemplate={selectedTemplate}
          onBack={() => setViewMode('list')}
          onSave={() => {
            setViewMode('list');
            loadTemplates();
          }}
          onPreview={(t) => {
            setSelectedTemplate(t);
            setViewMode('viewer');
          }}
        />
      </div>
    );
  }

  return (
    <div className="charm-templates-module-container">
      {/* Top Template Navigation Tabs Bar */}
      <TemplateTabs
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
        onBack={onBackToDashboard}
      />

      {/* Main Filter & Action Bar - Matching CharmHealth Screenshot 9 & 10 */}
      {activeTab !== 'common_medication' && (
        <div className="charm-templates-controls-wrap" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div
            className="charm-templates-controls-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px 8px 20px',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label
                htmlFor="template-type-filter"
                style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}
              >
                Template Type
              </label>
              <select
                id="template-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="charm-select-filter"
                style={{
                  minWidth: '220px',
                  height: '34px',
                  fontSize: '13.5px',
                  padding: '4px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b'
                }}
              >
                {TEMPLATE_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="template-search-input-wrap" style={{ width: '280px', position: 'relative' }}>
                <Search
                  size={14}
                  className="template-search-icon"
                  style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}
                  aria-hidden="true"
                />
                <input
                  id="template-name-search"
                  type="search"
                  placeholder="Search by Template Name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="charm-templates-search-input"
                  style={{
                    width: '100%',
                    height: '34px',
                    paddingLeft: '32px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>

              <button
                type="button"
                className="charm-btn-refresh-icon"
                onClick={loadTemplates}
                title="Refresh list"
                style={{
                  height: '34px',
                  width: '34px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div
            className="charm-templates-action-row"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '0 20px 12px 20px'
            }}
          >
            <button
              type="button"
              className="charm-btn-orange-new"
              onClick={() => setIsNewModalOpen(true)}
              style={{
                backgroundColor: '#f97316',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '7px 16px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} />
              <span>New Template</span>
            </button>
          </div>
        </div>
      )}

      {/* New Template Creation Modal */}
      <NewTemplateModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onProceed={(name, type, specialty, tags) => {
          setIsNewModalOpen(false);
          setSelectedTemplate({
            name,
            template_type: type,
            specialty,
            tags,
            sections: [
              {
                title: 'Clinical Assessment & Notes',
                components: []
              }
            ]
          } as any);
          setViewMode('builder');
        }}
      />

      {/* Content Table Body */}
      <div className="charm-templates-body-area">
        {activeTab === 'my_templates' && (
          <MyTemplatesTable
            templates={templates}
            loading={loading}
            error={error}
            onAction={handleAction}
            onTemplateClick={handleTemplateClick}
            onRetry={loadTemplates}
          />
        )}

        {activeTab === 'practice_templates' && (
          <PracticeTemplatesTable
            templates={templates}
            loading={loading}
            onAction={handleAction}
            onTemplateClick={handleTemplateClick}
          />
        )}

        {activeTab === 'email_templates' && (
          <EmailTemplatesTable
            templates={templates}
            loading={loading}
            onAction={handleAction}
            onTemplateClick={handleTemplateClick}
          />
        )}

        {activeTab === 'template_library' && (
          <LibraryTemplatesTable
            templates={templates}
            loading={loading}
            onAction={handleAction}
            onTemplateClick={handleTemplateClick}
          />
        )}

        {activeTab === 'common_medication' && (
          <CommonMedicationPanel
            conditions={conditions}
            searchTerm={medSearch}
            onSearchChange={setMedSearch}
            activeCondition={activeCondition}
            onSelectCondition={setActiveCondition}
            templates={templates}
            loading={loading}
            error={error}
            onRetry={loadTemplates}
            onViewTemplate={handleTemplateClick}
          />
        )}
      </div>
    </div>
  );
}
