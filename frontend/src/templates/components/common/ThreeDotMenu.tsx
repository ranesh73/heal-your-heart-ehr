import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckSquare,
  Copy,
  Download,
  Edit3,
  Eye,
  Power,
  Share2,
  ShieldCheck,
  Sliders,
  Stethoscope,
  Trash2
} from 'lucide-react';
import { ClinicalTemplate } from '../../types';

export type ActionOption =
  | 'view'
  | 'edit'
  | 'assign_roles'
  | 'default_values'
  | 'duplicate'
  | 'personalise'
  | 'share_library'
  | 'delete'
  | 'import'
  | 'toggle_status'
  | 'use_consultation';

interface ThreeDotMenuProps {
  template: ClinicalTemplate;
  mode: 'practice' | 'email' | 'library' | 'my';
  onAction: (action: ActionOption, template: ClinicalTemplate) => void;
}

interface MenuEntry {
  action: ActionOption;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}

export const ThreeDotMenu: React.FC<ThreeDotMenuProps> = ({ template, mode, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus = false) => {
    setIsOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    // Move focus into the menu so arrow keys and Tab stay within it.
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  const handleItemClick = (action: ActionOption) => {
    setIsOpen(false);
    onAction(action, template);
  };

  /** Roving focus between menu items with the arrow keys. */
  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();

    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') || []);
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const next = (current + delta + items.length) % items.length;
    items[next].focus();
  };

  const isActive = template.is_active !== false;

  const viewEntry: MenuEntry = { action: 'view', label: 'View', icon: <Eye size={14} /> };
  const editEntry: MenuEntry = { action: 'edit', label: 'Edit', icon: <Edit3 size={14} /> };

  let entries: MenuEntry[];
  if (mode === 'email') {
    entries = [viewEntry, editEntry];
  } else if (mode === 'library') {
    entries = [viewEntry, { action: 'import', label: 'Import', icon: <Download size={14} /> }];
  } else {
    entries = [
      viewEntry,
      editEntry,
      { action: 'assign_roles', label: 'Assign Roles', icon: <ShieldCheck size={14} /> },
      { action: 'default_values', label: 'Default Values', icon: <CheckSquare size={14} /> },
      { action: 'duplicate', label: 'Duplicate', icon: <Copy size={14} /> },
      { action: 'personalise', label: 'Personalise', icon: <Sliders size={14} /> },
      { action: 'share_library', label: 'Share to Library', icon: <Share2 size={14} /> },
      {
        action: 'toggle_status',
        label: isActive ? 'Deactivate' : 'Activate',
        icon: <Power size={14} />
      },
      { action: 'delete', label: 'Delete', icon: <Trash2 size={14} />, danger: true }
    ];
  }

  return (
    <div className="three-dot-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="three-dot-btn"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Actions for ${template.name}`}
      >
        …
      </button>

      {isOpen && (
        <div
          className="three-dot-menu-popover"
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${template.name}`}
          onKeyDown={handleMenuKeyDown}
        >
          {entries.map((entry) => (
            <button
              key={entry.action}
              type="button"
              role="menuitem"
              className={`menu-item ${entry.danger ? 'danger' : ''}`}
              onClick={() => handleItemClick(entry.action)}
            >
              {entry.icon} {entry.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
