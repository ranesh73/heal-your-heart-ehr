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
import { ActionOption } from './components/common/ThreeDotMenu';
import { TEMPLATE_TYPES, MEDICAL_CATEGORIES } from './constants/templateTypes';
import './styles/charm-theme.css';
import './styles/my-templates.css';
import './styles/pathway.css';
import './styles/option-tree.css';

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

  // Template list state
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
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

  const handleTemplateClick = (t: ClinicalTemplate) => {
    setSelectedTemplate(t);
    setViewMode('viewer');
  };

  const handleAction = async (action: ActionOption, t: ClinicalTemplate) => {
    if (action === 'edit') {
      setSelectedTemplate(t);
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

      {/* Main Filter & Action Bar */}
      {activeTab !== 'common_medication' && (
        <div className="charm-templates-controls-bar">
          <div className="charm-templates-search-box">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search templates by name, condition, or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="charm-templates-search-input"
            />
          </div>

          <div className="charm-templates-filters-group">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="charm-select-filter"
            >
              <option value="All">All Types</option>
              {TEMPLATE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="charm-select-filter"
            >
              <option value="All">All Categories</option>
              {MEDICAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              type="button"
              className="charm-btn-refresh-icon"
              onClick={loadTemplates}
              title="Refresh list"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              className="charm-btn-orange-new"
              onClick={() => {
                setSelectedTemplate(null);
                setViewMode('builder');
              }}
            >
              <Plus size={15} />
              <span>New Template</span>
            </button>
          </div>
        </div>
      )}

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
