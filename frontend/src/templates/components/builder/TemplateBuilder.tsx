 import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Copy,
  Eye,
  GripVertical,
  Layers,
  MoveDown,
  MoveUp,
  Plus,
  Save,
  Trash2,
  Edit3,
  X
} from 'lucide-react';
import {
  ClinicalTemplate,
  ComponentType,
  TemplateComponent,
  TemplateRelationship,
  TemplateSection
} from '../../types';
import { api } from '../../services/api';
import { MEDICAL_CATEGORIES, TEMPLATE_TYPES } from '../../constants/templateTypes';
import { ComponentConfigModal } from './ComponentConfigModal';
import { SoapSectionModal } from '../modals/SoapSectionModal';

interface TemplateBuilderProps {
  initialTemplate?: ClinicalTemplate | null;
  onSave: (savedTemplate: ClinicalTemplate) => void;
  onBack: () => void;
  onPreview: (template: ClinicalTemplate) => void;
}

const AVAILABLE_COMPONENTS: Array<{ type: ComponentType; label: string; icon: string }> = [
  { type: 'Heading', label: 'Heading', icon: '☰' },
  { type: 'Check List', label: 'Check List', icon: '☑' },
  { type: 'Simple Question', label: 'Simple Question', icon: '?' },
  { type: 'Single Choice', label: 'Single Choice', icon: '◉' },
  { type: 'Multi Choice', label: 'Multi Choice', icon: '⚁' },
  { type: 'Rating Scale', label: 'Rating Scale', icon: '★' },
  { type: 'Yes/No Question', label: 'Yes/No Question', icon: '✓' },
  { type: 'Notes', label: 'Notes', icon: '📝' },
  { type: 'Table', label: 'Table', icon: '▦' },
  { type: 'Image', label: 'Image', icon: '🖼' }
];

const SECTION_CATEGORIES = ['Subjective', 'Objective', 'Assessment', 'Plan', 'Custom'] as const;

let idCounter = 0;
const nextId = () => Date.now() * 1000 + (idCounter++ % 1000);

type DragPayload =
  | { kind: 'new'; componentType: ComponentType }
  | { kind: 'move'; componentId: number };

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  initialTemplate,
  onSave,
  onBack,
  onPreview
}) => {
  const isNew = !initialTemplate?.id;

  const [templateName, setTemplateName] = useState(initialTemplate?.name || '');
  const [templateType, setTemplateType] = useState(initialTemplate?.template_type || 'SOAP');
  const [category, setCategory] = useState(
    initialTemplate?.category || initialTemplate?.specialty || 'General Medicine'
  );
  const [tags, setTags] = useState(initialTemplate?.tags || '');
  const [layoutStyle, setLayoutStyle] = useState<'1 Column' | '2 Columns' | '3 Columns'>('2 Columns');

  const [sections, setSections] = useState<TemplateSection[]>(() => {
    if (initialTemplate?.sections?.length) return initialTemplate.sections;
    return [
      {
        id: nextId(),
        title: 'History of Present Illness',
        category: 'Subjective',
        order_index: 0,
        column_layout: 1,
        components: []
      }
    ];
  });

  const [relationships, setRelationships] = useState<TemplateRelationship[]>(
    initialTemplate?.relationships || []
  );

  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Post-save modal states
  const [showPostSaveModal, setShowPostSaveModal] = useState(false);
  const [savedTemplateObj, setSavedTemplateObj] = useState<ClinicalTemplate | null>(null);

  // Component configuration modal states
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: ComponentType;
    sectionIdx: number;
    atIndex?: number;
    existingComponent?: TemplateComponent | null;
  }>({
    isOpen: false,
    type: 'Heading',
    sectionIdx: 0,
    existingComponent: null
  });

  // Add sections modal
  const [showAddSectionChoice, setShowAddSectionChoice] = useState(false);
  const [showSoapSectionModal, setShowSoapSectionModal] = useState(false);
  const [customSectionTitle, setCustomSectionTitle] = useState('');

  // Drag state
  const dragRef = useRef<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setBanner({ kind, text });
    window.setTimeout(() => setBanner(null), 3500);
  };

  /* ------------------------------------------------------------ mutations */

  const handleOpenNewComponentModal = (type: ComponentType, sectionIdx = activeSectionIdx, atIndex?: number) => {
    const targetSection = sections[sectionIdx] ? sectionIdx : 0;
    setModalConfig({
      isOpen: true,
      type,
      sectionIdx: targetSection,
      atIndex,
      existingComponent: null
    });
  };

  const handleOpenEditComponentModal = (comp: TemplateComponent, sectionIdx: number) => {
    setModalConfig({
      isOpen: true,
      type: comp.component_type,
      sectionIdx,
      existingComponent: comp
    });
  };

  const handleSaveModalComponent = (configuredComponent: TemplateComponent) => {
    const { sectionIdx, atIndex, existingComponent } = modalConfig;

    if (existingComponent) {
      // Update in place
      setSections((prev) =>
        prev.map((sec, sIdx) => {
          if (sIdx !== sectionIdx) return sec;
          return {
            ...sec,
            components: sec.components.map((c) =>
              c.id === configuredComponent.id ? configuredComponent : c
            )
          };
        })
      );
    } else {
      // Insert new component
      setSections((prev) =>
        prev.map((sec, sIdx) => {
          if (sIdx !== sectionIdx) return sec;
          const comps = [...sec.components];
          comps.splice(atIndex ?? comps.length, 0, configuredComponent);
          return { ...sec, components: comps };
        })
      );
    }
  };

  const moveExisting = useCallback(
    (componentId: number, toSectionIdx: number, atIndex?: number) => {
      setSections((prev) => {
        let moved: TemplateComponent | null = null;
        const stripped = prev.map((sec) => {
          const idx = sec.components.findIndex((c) => c.id === componentId);
          if (idx === -1) return sec;
          moved = sec.components[idx];
          return { ...sec, components: sec.components.filter((c) => c.id !== componentId) };
        });
        if (!moved) return prev;

        return stripped.map((sec, i) => {
          if (i !== toSectionIdx) return sec;
          const comps = [...sec.components];
          comps.splice(Math.min(atIndex ?? comps.length, comps.length), 0, moved!);
          return { ...sec, components: comps };
        });
      });
    },
    []
  );

  const deleteComponent = (compId: number) => {
    setSections((prev) =>
      prev.map((sec) => ({ ...sec, components: sec.components.filter((c) => c.id !== compId) }))
    );
    setRelationships((prev) =>
      prev.filter((r) => r.parent_component_id !== compId && r.child_component_id !== compId)
    );
  };

  const duplicateComponent = (sectionIdx: number, compIdx: number) => {
    const source = sections[sectionIdx].components[compIdx];
    const copy: TemplateComponent = {
      ...source,
      id: nextId(),
      label: `${source.label} (copy)`,
      options: (source.options || []).map((o) => ({ ...o, id: undefined }))
    };
    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIdx) return sec;
        const comps = [...sec.components];
        comps.splice(compIdx + 1, 0, copy);
        return { ...sec, components: comps };
      })
    );
  };

  const moveComponent = (sectionIdx: number, compIdx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? compIdx - 1 : compIdx + 1;
    setSections((prev) => {
      const comps = [...prev[sectionIdx].components];
      if (target < 0 || target >= comps.length) return prev;
      [comps[compIdx], comps[target]] = [comps[target], comps[compIdx]];
      return prev.map((sec, i) => (i === sectionIdx ? { ...sec, components: comps } : sec));
    });
  };

  /* -------------------------------------------------------------- sections */

  const addCustomSection = () => {
    const title = customSectionTitle.trim() || `New Section ${sections.length + 1}`;
    const newSection: TemplateSection = {
      id: nextId(),
      title,
      category: 'Custom',
      order_index: sections.length,
      column_layout: 1,
      components: []
    };
    setSections((prev) => [...prev, newSection]);
    setActiveSectionIdx(sections.length);
    setCustomSectionTitle('');
    setShowAddSectionChoice(false);
  };

  const handleAddSoapSections = (
    selectedSections: Array<{ title: string; category: 'Subjective' | 'Objective' | 'Assessment' | 'Plan' }>
  ) => {
    setShowSoapSectionModal(false);
    setShowAddSectionChoice(false);

    const newSecs: TemplateSection[] = selectedSections.map((sec, idx) => ({
      id: nextId() + idx,
      title: sec.title,
      category: sec.category,
      order_index: sections.length + idx,
      column_layout: 1,
      components: []
    }));

    setSections((prev) => [...prev, ...newSecs]);
  };

  const updateSectionTitle = (idx: number, title: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, title } : s)));
  };

  const deleteSection = (idx: number) => {
    if (sections.length <= 1) {
      flash('err', 'A template must keep at least one section.');
      return;
    }
    const removedIds = sections[idx].components.map((c) => c.id);
    setSections((prev) => prev.filter((_, i) => i !== idx));
    setRelationships((prev) =>
      prev.filter(
        (r) =>
          !removedIds.includes(r.parent_component_id) && !removedIds.includes(r.child_component_id)
      )
    );
    setActiveSectionIdx((cur) => Math.max(0, Math.min(cur, sections.length - 2)));
  };

  const moveSection = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
    setActiveSectionIdx(target);
  };

  /* ------------------------------------------------------ drag and drop */

  const onPaletteDragStart = (e: React.DragEvent, type: ComponentType) => {
    dragRef.current = { kind: 'new', componentType: type };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', type);
  };

  const onComponentDragStart = (e: React.DragEvent, componentId: number) => {
    dragRef.current = { kind: 'move', componentId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(componentId));
    e.stopPropagation();
  };

  const onDragEnd = () => {
    dragRef.current = null;
    setDropTarget(null);
  };

  const allowDrop = (e: React.DragEvent, key: string) => {
    if (!dragRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = dragRef.current.kind === 'new' ? 'copy' : 'move';
    if (dropTarget !== key) setDropTarget(key);
  };

  const handleDrop = (e: React.DragEvent, sectionIdx: number, atIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = dragRef.current;
    dragRef.current = null;
    setDropTarget(null);
    if (!payload) return;

    if (payload.kind === 'new') {
      handleOpenNewComponentModal(payload.componentType, sectionIdx, atIndex);
    } else {
      moveExisting(payload.componentId, sectionIdx, atIndex);
    }
  };

  /* ---------------------------------------------------------------- save */

  const buildTemplate = (): ClinicalTemplate => ({
    id: initialTemplate?.id || 0,
    name: templateName.trim(),
    template_type: templateType,
    specialty: category,
    category,
    description: initialTemplate?.description || '',
    tags,
    is_practice: initialTemplate?.is_practice ?? 1,
    is_library: initialTemplate?.is_library ?? 0,
    is_active: true,
    sections: sections.map((s, i) => ({ ...s, order_index: i })),
    relationships
  });

  const handleSave = async () => {
    if (!templateName.trim()) {
      flash('err', 'Template Name is required.');
      return;
    }
    const payload = buildTemplate();
    setSaving(true);
    try {
      let saved: ClinicalTemplate;
      if (initialTemplate?.id) {
        await api.updateTemplate(initialTemplate.id, payload);
        saved = { ...payload, id: initialTemplate.id };
      } else {
        const created = await api.createTemplate(payload);
        saved = { ...payload, id: created.id };
      }
      setSavedTemplateObj(saved);
      setShowPostSaveModal(true);
      onSave(saved);
    } catch (err) {
      flash('err', err instanceof Error ? err.message : 'Could not save the template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tb-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Top Header matching screenshots */}
      <div
        className="tb-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #d1d5db',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
            {isNew ? 'New Template' : 'Edit Template'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Template Name:</label>
            <input
              type="text"
              value={templateName}
              placeholder="e.g. Chest Pain Assessment"
              onChange={(e) => setTemplateName(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', minWidth: '240px' }}
              autoFocus={isNew}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Template Type:</label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              {TEMPLATE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Tags:</label>
            <input
              type="text"
              value={tags}
              placeholder="e.g. cardiac, eecp"
              onChange={(e) => setTags(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '160px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowAddSectionChoice(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#fff7ed',
              color: '#f57c00',
              border: '1px solid #f57c00',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} /> Add Sections
          </button>
        </div>
      </div>

      {banner && (
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: banner.kind === 'ok' ? '#ecfdf5' : '#fef2f2',
            color: banner.kind === 'ok' ? '#166534' : '#b91c1c',
            borderBottom: '1px solid #d1d5db',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          {banner.kind === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Main Body: Left Palette + Right Canvas */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Components Panel */}
        <aside
          style={{
            width: '230px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'sticky',
            top: '56px',
            height: 'calc(100vh - 120px)',
            overflowY: 'auto'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Components
          </div>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
            Click or drag onto a section to configure and insert.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {AVAILABLE_COMPONENTS.map((comp) => (
              <div
                key={comp.type}
                draggable
                onDragStart={(e) => onPaletteDragStart(e, comp.type)}
                onDragEnd={onDragEnd}
                onClick={() => handleOpenNewComponentModal(comp.type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="palette-item-hover"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GripVertical size={13} style={{ color: '#cbd5e1' }} />
                  <span style={{ fontSize: '13px', color: '#f57c00' }}>{comp.icon}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155' }}>{comp.label}</span>
                </div>
                {/* Double chevron as shown in screenshots */}
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>&gt;&gt;</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Canvas: Sections with components */}
        <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sections.map((section, sIdx) => {
              const isActive = activeSectionIdx === sIdx;
              return (
                <div
                  key={section.id ?? sIdx}
                  onClick={() => setActiveSectionIdx(sIdx)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Section Header with Orange Title */}
                  <div
                    style={{
                      backgroundColor: '#fffaf5',
                      borderBottom: '1px solid #fed7aa',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <Layers size={16} style={{ color: '#f57c00' }} />
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#c2410c',
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          width: '100%',
                          maxWidth: '400px'
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#9ca3af', backgroundColor: '#ffedd5', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {section.category || 'Custom'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => moveSection(sIdx, 'up')}
                        disabled={sIdx === 0}
                        style={{ background: 'none', border: 'none', color: sIdx === 0 ? '#d1d5db' : '#6b7280', cursor: sIdx === 0 ? 'default' : 'pointer', padding: '4px' }}
                        title="Move section up"
                      >
                        <MoveUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(sIdx, 'down')}
                        disabled={sIdx === sections.length - 1}
                        style={{ background: 'none', border: 'none', color: sIdx === sections.length - 1 ? '#d1d5db' : '#6b7280', cursor: sIdx === sections.length - 1 ? 'default' : 'pointer', padding: '4px' }}
                        title="Move section down"
                      >
                        <MoveDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSection(sIdx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete section"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Section Editable Area / Dropzone */}
                  <div
                    onDragOver={(e) => allowDrop(e, `sec-${sIdx}`)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => handleDrop(e, sIdx)}
                    style={{
                      padding: '16px',
                      backgroundColor: dropTarget === `sec-${sIdx}` ? '#fffbeb' : '#ffffff',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {section.components.length === 0 ? (
                      <div
                        style={{
                          border: '2px dashed #e2e8f0',
                          borderRadius: '4px',
                          padding: '24px',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '13px'
                        }}
                      >
                        Drag components from the left panel or click a component to add it here.
                      </div>
                    ) : (
                      section.components.map((comp, cIdx) => (
                        <div
                          key={comp.id ?? cIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditComponentModal(comp, sIdx);
                          }}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            transition: 'border-color 0.15s ease'
                          }}
                          className="canvas-component-card"
                        >
                          {/* Component Top Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f57c00', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: '1px 6px', borderRadius: '3px' }}>
                                {comp.component_type}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                {comp.label}
                                {comp.is_required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditComponentModal(comp, sIdx)}
                                title="Edit Component"
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '3px' }}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveComponent(sIdx, cIdx, 'up')}
                                disabled={cIdx === 0}
                                title="Move up"
                                style={{ background: 'none', border: 'none', color: cIdx === 0 ? '#d1d5db' : '#6b7280', cursor: cIdx === 0 ? 'default' : 'pointer', padding: '3px' }}
                              >
                                <MoveUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveComponent(sIdx, cIdx, 'down')}
                                disabled={cIdx === section.components.length - 1}
                                title="Move down"
                                style={{ background: 'none', border: 'none', color: cIdx === section.components.length - 1 ? '#d1d5db' : '#6b7280', cursor: cIdx === section.components.length - 1 ? 'default' : 'pointer', padding: '3px' }}
                              >
                                <MoveDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateComponent(sIdx, cIdx)}
                                title="Duplicate"
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '3px' }}
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteComponent(comp.id!)}
                                title="Delete"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '3px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Render preview inside card matching component type */}
                          {comp.component_type === 'Heading' && (
                            <div
                              style={{
                                fontSize: comp.config?.fontSize ? `${comp.config.fontSize}px` : '14px',
                                textAlign: comp.config?.alignment || 'left',
                                fontWeight: comp.config?.bold ? 'bold' : 'normal',
                                fontStyle: comp.config?.italic ? 'italic' : 'normal',
                                textDecoration: comp.config?.underline ? 'underline' : 'none',
                                color: '#111827',
                                padding: '4px 0'
                              }}
                            >
                              {comp.label}
                            </div>
                          )}

                          {['Check List', 'Single Choice', 'Multi Choice'].includes(comp.component_type) && comp.options && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {comp.options.slice(0, 8).map((opt, oIdx) => (
                                <span
                                  key={opt.id ?? oIdx}
                                  style={{
                                    fontSize: '11.5px',
                                    color: '#475569',
                                    backgroundColor: '#f1f5f9',
                                    padding: '2px 8px',
                                    borderRadius: '3px',
                                    border: '1px solid #e2e8f0'
                                  }}
                                >
                                  {comp.component_type === 'Check List' ? '☑ ' : '○ '}
                                  {opt.option_label}
                                </span>
                              ))}
                              {comp.options.length > 8 && (
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>+{comp.options.length - 8} more</span>
                              )}
                            </div>
                          )}

                          {comp.component_type === 'Simple Question' && (
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                              {comp.config?.multiline ? '[ Multiline Text Input ]' : '[ Single line Text Input ]'}
                            </div>
                          )}

                          {comp.component_type === 'Yes/No Question' && (
                            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#475569' }}>
                              <span>○ Yes</span>
                              <span>○ No</span>
                            </div>
                          )}

                          {comp.component_type === 'Rating Scale' && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                              {Array.from({ length: Math.min(10, (comp.config?.max || 10) - (comp.config?.min || 1) + 1) }, (_, i) => (
                                <span key={i} style={{ border: '1px solid #cbd5e1', padding: '2px 6px', fontSize: '11px', borderRadius: '3px', color: '#475569' }}>
                                  {(comp.config?.min || 1) + i}
                                </span>
                              ))}
                            </div>
                          )}

                          {comp.component_type === 'Notes' && (
                            <div style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                              {comp.default_value || 'Notes placeholder content...'}
                            </div>
                          )}

                          {comp.component_type === 'Table' && comp.config?.rows && (
                            <div style={{ marginTop: '6px', overflowX: 'auto' }}>
                              <table style={{ borderCollapse: 'collapse', fontSize: '11.5px', width: '100%', border: '1px solid #e2e8f0' }}>
                                <tbody>
                                  {comp.config.rows.slice(0, 3).map((row: any[], rIdx: number) => (
                                    <tr key={rIdx} style={{ backgroundColor: rIdx === 0 ? '#f8fafc' : '#ffffff' }}>
                                      {row.map((cell: any, cIdx: number) => (
                                        <td key={cIdx} style={{ border: '1px solid #e2e8f0', padding: '4px 8px' }}>
                                          {cell.text || '-'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {comp.component_type === 'Image' && comp.config?.imageUrl && (
                            <div style={{ marginTop: '6px', maxHeight: '100px', overflow: 'hidden' }}>
                              <img src={comp.config.imageUrl} alt={comp.label} style={{ maxHeight: '90px', objectFit: 'contain' }} />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Bottom Bar matching screenshot: Layout Style dropdown, orange Save button, gray Cancel */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #d1d5db',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          bottom: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
            Layout Style:
          </label>
          <select
            value={layoutStyle}
            onChange={(e) => setLayoutStyle(e.target.value as any)}
            style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          >
            <option value="1 Column">1 Column</option>
            <option value="2 Columns">2 Columns</option>
            <option value="3 Columns">3 Columns</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: '7px 18px', fontSize: '13.5px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-orange"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '7px 24px',
              fontSize: '13.5px',
              fontWeight: 600,
              backgroundColor: '#f57c00',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Save size={15} /> {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Component Configuration Modal */}
      {modalConfig.isOpen && (
        <ComponentConfigModal
          isOpen={modalConfig.isOpen}
          componentType={modalConfig.type}
          initialComponent={modalConfig.existingComponent}
          onSave={handleSaveModalComponent}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false, existingComponent: null })}
        />
      )}

      {/* Add Sections Choice Modal */}
      {showAddSectionChoice && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
              <h3 className="modal-title" style={{ fontSize: '15px', fontWeight: 600 }}>Add Sections</h3>
              <button className="modal-close-btn" onClick={() => setShowAddSectionChoice(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Create Custom Section:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter section name..."
                    value={customSectionTitle}
                    onChange={(e) => setCustomSectionTitle(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                  <button
                    type="button"
                    onClick={addCustomSection}
                    style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: '#f57c00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>— OR —</div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSectionChoice(false);
                    setShowSoapSectionModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #f57c00',
                    color: '#c2410c',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Choose from Standard SOAP Sections (HPI, Exam, Assessment...)
                </button>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAddSectionChoice(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOAP Section Modal */}
      {showSoapSectionModal && (
        <SoapSectionModal
          isOpen={showSoapSectionModal}
          templateName={templateName || 'Clinical Template'}
          onClose={() => setShowSoapSectionModal(false)}
          onAddSections={handleAddSoapSections}
        />
      )}

      {/* Post-Save Confirmation Modal */}
      {showPostSaveModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '26px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                margin: '0 auto 16px auto'
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Template Saved Successfully!
            </h3>
            <p style={{ fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5', marginBottom: '22px' }}>
              <strong>"{savedTemplateObj?.name || templateName}"</strong> has been saved with{' '}
              {sections.length} section{sections.length === 1 ? '' : 's'} and{' '}
              {sections.reduce((acc, s) => acc + s.components.length, 0)} component{sections.reduce((acc, s) => acc + s.components.length, 0) === 1 ? '' : 's'}.
              What would you like to do next?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#f57c00',
                  borderColor: '#f57c00',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowPostSaveModal(false);
                  if (savedTemplateObj) {
                    onPreview(savedTemplateObj);
                  }
                }}
              >
                <Eye size={16} /> Preview Clinical Form
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                  onClick={() => setShowPostSaveModal(false)}
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                  onClick={() => {
                    setShowPostSaveModal(false);
                    onBack();
                  }}
                >
                  Back to Templates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
