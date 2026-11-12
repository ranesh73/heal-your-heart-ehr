import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { TabType } from '../../types';

interface TemplateTabsProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onBack?: () => void;
}

/** Tab order is fixed by the clinic's brief and must not be rearranged. */
const TABS: Array<{ id: TabType; label: string }> = [
  { id: 'my_templates', label: 'My Templates' },
  { id: 'practice_templates', label: 'Practice Templates' },
  { id: 'email_templates', label: 'Email Templates' },
  { id: 'template_library', label: 'Heal Your Heart Library' },
  { id: 'common_medication', label: 'Common Medication' }
];

export const TemplateTabs: React.FC<TemplateTabsProps> = ({
  activeTab,
  onSelectTab,
  onBack
}) => {
  /** Left / right arrows move between tabs, as expected of a tablist. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();

    const current = TABS.findIndex((t) => t.id === activeTab);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = (current + delta + TABS.length) % TABS.length;
    onSelectTab(TABS[next].id);
  };

  return (
    <div className="charm-tabs-bar">
      <button type="button" className="back-btn" onClick={onBack} title="Back" aria-label="Clear filters">
        <ArrowLeft size={16} aria-hidden="true" />
      </button>

      <div
        className="tabs-list"
        role="tablist"
        aria-label="Template sections"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls="template-tabpanel"
              tabIndex={isActive ? 0 : -1}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
