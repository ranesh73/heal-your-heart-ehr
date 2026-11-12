import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HelpCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Plus,
  Trash2,
  Settings2,
  Upload,
  Copy
} from 'lucide-react';
import { ComponentType, TemplateComponent, TemplateOption, TableCellProperties } from '../../types';
import { EditCellPropertiesModal } from './EditCellPropertiesModal';

interface ComponentConfigModalProps {
  isOpen: boolean;
  componentType: ComponentType;
  initialComponent?: TemplateComponent | null;
  onSave: (component: TemplateComponent) => void;
  onClose: () => void;
}

const PATIENT_PLACEHOLDERS: Record<string, string[]> = {
  'PATIENT DETAILS': [
    'Name',
    'Record ID',
    'Age',
    'Date of Birth',
    'Birth Sex',
    'Gender Identity',
    'Primary Care Physician',
    'Referring Provider'
  ],
  'MEDICAL HISTORY': [
    'Past Medical History',
    'Allergies',
    'Medications',
    'Supplements',
    'Diagnoses',
    'Immunizations',
    'Procedures, Surgeries and Hospitalization'
  ],
  'FAMILY HISTORY': [
    'Family History'
  ]
};

const FIELD_TO_TAG: Record<string, string> = {
  'Name': '${patient.name}',
  'Record ID': '${patient.record_id}',
  'Age': '${patient.age}',
  'Date of Birth': '${patient.date_of_birth}',
  'Birth Sex': '${patient.gender}',
  'Gender Identity': '${patient.gender}',
  'Primary Care Physician': '${patient.pcp}',
  'Referring Provider': '${patient.referring_provider}',
  'Past Medical History': '${patient.past_medical_history}',
  'Allergies': '${patient.allergies}',
  'Medications': '${patient.medications}',
  'Supplements': '${patient.supplements}',
  'Diagnoses': '${patient.diagnoses}',
  'Immunizations': '${patient.immunizations}',
  'Procedures, Surgeries and Hospitalization': '${patient.procedures}',
  'Family History': '${patient.family_history}'
};

/** Parse multiline textarea options into hierarchical TemplateOption array */
function parseOptionsText(text: string): TemplateOption[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const result: TemplateOption[] = [];
  const stack: { level: number; option: TemplateOption }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let level = 0;
    let label = raw.trim();

    // Count leading >>
    while (label.startsWith('>>')) {
      level += 1;
      label = label.substring(2).trim();
    }

    const opt: TemplateOption = {
      option_label: label,
      option_value: label,
      order_index: i,
      children: []
    };

    if (level === 0) {
      result.push(opt);
      stack.length = 0;
      stack.push({ level: 0, option: opt });
    } else {
      // Find parent in stack with level < current level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      if (stack.length > 0) {
        const parent = stack[stack.length - 1].option;
        if (!parent.children) parent.children = [];
        parent.children.push(opt);
        parent.is_expandable = true;
      } else {
        result.push(opt);
      }
      stack.push({ level, option: opt });
    }
  }

  return result;
}

/** Convert TemplateOption array back into text with >> hierarchy */
function optionsToText(options?: TemplateOption[]): string {
  if (!options || options.length === 0) return '';
  const lines: string[] = [];

  function walk(opts: TemplateOption[], depth: number) {
    for (const opt of opts) {
      const prefix = '>>'.repeat(depth);
      lines.push(`${prefix ? prefix + ' ' : ''}${opt.option_label}`);
      if (opt.children && opt.children.length > 0) {
        walk(opt.children, depth + 1);
      }
    }
  }

  walk(options, 0);
  return lines.join('\n');
}

export const ComponentConfigModal: React.FC<ComponentConfigModalProps> = ({
  isOpen,
  componentType,
  initialComponent,
  onSave,
  onClose
}) => {
  // Common states
  const [label, setLabel] = useState('');
  const [isMandatory, setIsMandatory] = useState<boolean>(false);
  const [generatedText, setGeneratedText] = useState('${question} ${answer}');
  const [showHelp, setShowHelp] = useState(false);

  // Heading states
  const [headingSize, setHeadingSize] = useState<number>(14);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);

  // Choice & Checklist states
  const [optionsText, setOptionsText] = useState('');
  const [includeOthers, setIncludeOthers] = useState(false);
  const [includeComments, setIncludeComments] = useState(false);

  // Simple question
  const [multilineAnswer, setMultilineAnswer] = useState(false);

  // Yes / No question
  const [commentsYes, setCommentsYes] = useState(false);
  const [commentsNo, setCommentsNo] = useState(false);
  const [genTextYes, setGenTextYes] = useState('${question} Yes');
  const [genTextNo, setGenTextNo] = useState('${question} No');

  // Rating scale
  const [ratingMin, setRatingMin] = useState(1);
  const [ratingMax, setRatingMax] = useState(10);

  // Notes
  const [notesContent, setNotesContent] = useState('');
  const [selectedPatientField, setSelectedPatientField] = useState('');
  const [generatedPlaceholder, setGeneratedPlaceholder] = useState('');
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Table
  const [tableCols, setTableCols] = useState(2);
  const [tableRows, setTableRows] = useState<Array<Array<{ text: string; properties?: TableCellProperties }>>>([
    [{ text: 'Header 1' }, { text: 'Header 2' }],
    [{ text: 'Data 1' }, { text: 'Data 2' }]
  ]);
  const [activeCellCoord, setActiveCellCoord] = useState<{ row: number; col: number } | null>(null);
  const [showCellPropsModal, setShowCellPropsModal] = useState(false);

  // Image
  const [imageUrl, setImageUrl] = useState('');

  // Synchronize state when initialComponent or componentType changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialComponent) {
      setLabel(initialComponent.label || '');
      setIsMandatory(Boolean(initialComponent.is_required));
      const cfg = initialComponent.config || {};

      // Heading
      if (initialComponent.component_type === 'Heading') {
        setHeadingSize(cfg.fontSize || 14);
        setAlignment(cfg.alignment || 'left');
        setBold(Boolean(cfg.bold));
        setItalic(Boolean(cfg.italic));
        setUnderline(Boolean(cfg.underline));
      }

      // Check List / Single Choice / Multi Choice
      if (['Check List', 'Single Choice', 'Multi Choice'].includes(initialComponent.component_type)) {
        setOptionsText(optionsToText(initialComponent.options));
        setIncludeOthers(Boolean(cfg.includeOthers));
        setIncludeComments(Boolean(cfg.includeComments));
        setGeneratedText(cfg.generatedText || (initialComponent.component_type === 'Check List' ? '${answer}' : '${question} ${answer}'));
      }

      // Simple question
      if (initialComponent.component_type === 'Simple Question') {
        setMultilineAnswer(Boolean(cfg.multiline));
        setGeneratedText(cfg.generatedText || '${question} ${answer}');
      }

      // Yes / No Question
      if (initialComponent.component_type === 'Yes/No Question') {
        setCommentsYes(Boolean(cfg.includeCommentsYes));
        setCommentsNo(Boolean(cfg.includeCommentsNo));
        setGenTextYes(cfg.generatedTextYes || '${question} Yes');
        setGenTextNo(cfg.generatedTextNo || '${question} No');
      }

      // Rating Scale
      if (initialComponent.component_type === 'Rating Scale') {
        setRatingMin(cfg.min || 1);
        setRatingMax(cfg.max || 10);
        setGeneratedText(cfg.generatedText || '${question} ${answer}');
      }

      // Notes
      if (initialComponent.component_type === 'Notes') {
        setNotesContent(initialComponent.default_value || '');
      }

      // Table
      if (initialComponent.component_type === 'Table') {
        if (cfg.rows && Array.isArray(cfg.rows)) {
          setTableRows(cfg.rows);
          setTableCols(cfg.columnCount || cfg.rows[0]?.length || 2);
        }
      }

      // Image
      if (initialComponent.component_type === 'Image') {
        setImageUrl(cfg.imageUrl || '');
      }
    } else {
      // Default setup for brand new components
      setLabel(componentType === 'Heading' ? 'Section Header' : '');
      setIsMandatory(false);
      setGeneratedText(componentType === 'Check List' ? '${answer}' : '${question} ${answer}');

      if (componentType === 'Heading') {
        setHeadingSize(14);
        setAlignment('left');
        setBold(true);
        setItalic(false);
        setUnderline(false);
      } else if (componentType === 'Check List') {
        setOptionsText('Chest Pain\n>> Severity\n>>>> Mild\n>>>> Moderate\n>>>> Severe\n>> Classification\n>>>> CCS\n>>>> With Exertion\n>>>> At Rest');
      } else if (componentType === 'Single Choice' || componentType === 'Multi Choice') {
        setOptionsText('Yes\n>> Severity\n>>>> Mild\n>>>> Moderate\n>>>> Severe\nNo');
        setIncludeOthers(false);
        setIncludeComments(false);
      } else if (componentType === 'Simple Question') {
        setMultilineAnswer(false);
      } else if (componentType === 'Yes/No Question') {
        setCommentsYes(false);
        setCommentsNo(false);
        setGenTextYes('${question} Yes');
        setGenTextNo('${question} No');
      } else if (componentType === 'Rating Scale') {
        setRatingMin(1);
        setRatingMax(10);
      } else if (componentType === 'Notes') {
        setNotesContent('Patient Details:\nName: ${patient.name}\nAge: ${patient.age}\nRecord ID: ${patient.record_id}\n\nClinical Observations:\n');
      } else if (componentType === 'Table') {
        setTableCols(2);
        setTableRows([
          [{ text: 'Parameter' }, { text: 'Baseline Value' }],
          [{ text: 'Blood Pressure' }, { text: '120/80 mmHg' }],
          [{ text: 'Heart Rate' }, { text: '72 bpm' }]
        ]);
      } else if (componentType === 'Image') {
        setImageUrl('');
      }
    }
  }, [isOpen, initialComponent, componentType]);

  if (!isOpen) return null;

  // Handling table column changes
  const handleColCountChange = (newCols: number) => {
    if (newCols < 1 || newCols > 6) return;
    setTableCols(newCols);
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.length === newCols) return row;
        if (row.length < newCols) {
          const added = Array.from({ length: newCols - row.length }, () => ({ text: '' }));
          return [...row, ...added];
        }
        return row.slice(0, newCols);
      })
    );
  };

  const addTableRow = () => {
    const newRow = Array.from({ length: tableCols }, () => ({ text: '' }));
    setTableRows((prev) => [...prev, newRow]);
  };

  const deleteTableRow = (rowIdx: number) => {
    if (tableRows.length <= 1) return;
    setTableRows((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  const updateTableCellText = (rowIdx: number, colIdx: number, val: string) => {
    setTableRows((prev) =>
      prev.map((r, ri) =>
        ri === rowIdx
          ? r.map((c, ci) => (ci === colIdx ? { ...c, text: val } : c))
          : r
      )
    );
  };

  const handleApplyCellProperties = (props: TableCellProperties) => {
    if (!activeCellCoord) return;
    const { row, col } = activeCellCoord;
    setTableRows((prev) =>
      prev.map((r, ri) =>
        ri === row
          ? r.map((c, ci) => (ci === col ? { ...c, properties: props } : c))
          : r
      )
    );
  };

  // Notes placeholder insertion
  const handleSelectPlaceholderField = (fieldName: string) => {
    setSelectedPatientField(fieldName);
    const tag = FIELD_TO_TAG[fieldName] || `\${patient.${fieldName.toLowerCase().replace(/[\s,]+/g, '_')}}`;
    setGeneratedPlaceholder(tag);
  };

  const handleInsertPlaceholder = () => {
    if (!generatedPlaceholder) return;
    setNotesContent((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') || !prev ? '' : ' ') + generatedPlaceholder);
  };

  // Submit and package component
  const handleSave = () => {
    const isHeading = componentType === 'Heading';
    const finalLabel = label.trim() || (isHeading ? 'Heading' : 'Question');

    let parsedOptions: TemplateOption[] = [];
    if (['Check List', 'Single Choice', 'Multi Choice'].includes(componentType)) {
      parsedOptions = parseOptionsText(optionsText);
    } else if (componentType === 'Yes/No Question') {
      parsedOptions = [
        { option_label: 'Yes', option_value: 'Yes' },
        { option_label: 'No', option_value: 'No' }
      ];
    } else if (componentType === 'Rating Scale') {
      parsedOptions = Array.from({ length: Math.max(1, ratingMax - ratingMin + 1) }, (_, i) => ({
        option_label: String(ratingMin + i),
        option_value: String(ratingMin + i)
      }));
    }

    const configPayload: Record<string, any> = {
      isMandatory
    };

    if (isHeading) {
      configPayload.fontSize = headingSize;
      configPayload.alignment = alignment;
      configPayload.bold = bold;
      configPayload.italic = italic;
      configPayload.underline = underline;
    } else if (componentType === 'Check List') {
      configPayload.generatedText = generatedText;
    } else if (componentType === 'Single Choice' || componentType === 'Multi Choice') {
      configPayload.includeOthers = includeOthers;
      configPayload.includeComments = includeComments;
      configPayload.generatedText = generatedText;
    } else if (componentType === 'Simple Question') {
      configPayload.multiline = multilineAnswer;
      configPayload.generatedText = generatedText;
    } else if (componentType === 'Yes/No Question') {
      configPayload.includeCommentsYes = commentsYes;
      configPayload.includeCommentsNo = commentsNo;
      configPayload.generatedTextYes = genTextYes;
      configPayload.generatedTextNo = genTextNo;
    } else if (componentType === 'Rating Scale') {
      configPayload.min = ratingMin;
      configPayload.max = ratingMax;
      configPayload.generatedText = generatedText;
    } else if (componentType === 'Notes') {
      configPayload.patientField = selectedPatientField;
      configPayload.placeholderField = generatedPlaceholder;
    } else if (componentType === 'Table') {
      configPayload.columnCount = tableCols;
      configPayload.rows = tableRows;
    } else if (componentType === 'Image') {
      configPayload.imageUrl = imageUrl;
    }

    const updated: TemplateComponent = {
      id: initialComponent?.id || Date.now(),
      section_id: initialComponent?.section_id,
      component_type: componentType,
      label: finalLabel,
      is_required: isMandatory,
      default_value: componentType === 'Notes' ? notesContent : (initialComponent?.default_value || ''),
      placeholder: componentType === 'Simple Question' ? (multilineAnswer ? 'Enter details...' : 'Enter answer...') : '',
      column_count: componentType === 'Rating Scale' ? Math.min(ratingMax, 10) : 3,
      options: parsedOptions,
      config: configPayload
    };

    onSave(updated);
    onClose();
  };

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1000 }}>
        <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="modal-header" style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="modal-title" style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                {componentType} Configuration
              </h3>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. HEADING */}
            {componentType === 'Heading' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Heading
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the Heading here"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                      Text Size
                    </label>
                    <select
                      value={headingSize}
                      onChange={(e) => setHeadingSize(Number(e.target.value))}
                      style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                    >
                      {[12, 14, 16, 18, 20, 24, 28].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                      Alignment
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['left', 'center', 'right', 'justify'] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAlignment(a)}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid',
                            borderColor: alignment === a ? '#f57c00' : '#cbd5e1',
                            backgroundColor: alignment === a ? '#fff7ed' : '#ffffff',
                            color: alignment === a ? '#f57c00' : '#4b5563',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {a === 'left' && <AlignLeft size={16} />}
                          {a === 'center' && <AlignCenter size={16} />}
                          {a === 'right' && <AlignRight size={16} />}
                          {a === 'justify' && <AlignJustify size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                      Text Style
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setBold(!bold)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid',
                          borderColor: bold ? '#f57c00' : '#cbd5e1',
                          backgroundColor: bold ? '#fff7ed' : '#ffffff',
                          color: bold ? '#f57c00' : '#4b5563',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        <Bold size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItalic(!italic)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid',
                          borderColor: italic ? '#f57c00' : '#cbd5e1',
                          backgroundColor: italic ? '#fff7ed' : '#ffffff',
                          color: italic ? '#f57c00' : '#4b5563',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Italic size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnderline(!underline)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid',
                          borderColor: underline ? '#f57c00' : '#cbd5e1',
                          backgroundColor: underline ? '#fff7ed' : '#ffffff',
                          color: underline ? '#f57c00' : '#4b5563',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Underline size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 2. CHECK LIST */}
            {componentType === 'Check List' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Check List Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter checklist title (e.g. Symptoms Review)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '12px' }}
                    autoFocus
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      Check List Options
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHelp(!showHelp)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <HelpCircle size={15} /> Help
                    </button>
                  </div>

                  {showHelp && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', color: '#166534', marginBottom: '8px' }}>
                      Enter each option on a separate line. Use <strong>&gt;&gt;</strong> for hierarchical options, <strong>&gt;&gt;&gt;&gt;</strong> for second level, etc.
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Enter each option on a separate line. Use &gt;&gt; for hierarchical options.
                  </div>
                  <textarea
                    rows={8}
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Generated Text
                  </label>
                  <input
                    type="text"
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </>
            )}

            {/* 3. SIMPLE QUESTION */}
            {componentType === 'Simple Question' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Question
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the question here"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={multilineAnswer}
                      onChange={(e) => setMultilineAnswer(e.target.checked)}
                      style={{ accentColor: '#f57c00' }}
                    />
                    <span>Multi line answer</span>
                  </label>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Text generated in chart notes
                  </div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Generated Text
                  </label>
                  <input
                    type="text"
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </>
            )}

            {/* 4 & 5. SINGLE CHOICE / MULTI CHOICE */}
            {(componentType === 'Single Choice' || componentType === 'Multi Choice') && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Question
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the question here"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    autoFocus
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      Options
                    </label>
                    {/* Greyed helper text requested by prompt */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500, userSelect: 'none' }}>
                        &gt;&gt; Use hierarchical options
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowHelp(!showHelp)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <HelpCircle size={15} /> Help
                      </button>
                    </div>
                  </div>

                  {showHelp && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', color: '#166534', marginBottom: '8px' }}>
                      Prefix an option with <strong>&gt;&gt;</strong> to make it a child of the option above it. During testing, child options reveal horizontally when the parent is selected!
                    </div>
                  )}

                  <textarea
                    rows={6}
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder={'Yes\n>> Severity\n>>>> Mild\n>>>> Moderate\n>>>> Severe\nNo'}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeOthers}
                      onChange={(e) => setIncludeOthers(e.target.checked)}
                      style={{ accentColor: '#f57c00' }}
                    />
                    <span>Include others option</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeComments}
                      onChange={(e) => setIncludeComments(e.target.checked)}
                      style={{ accentColor: '#f57c00' }}
                    />
                    <span>Include additional comments</span>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Generated Text
                  </label>
                  <input
                    type="text"
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </>
            )}

            {/* 6. YES / NO QUESTION */}
            {componentType === 'Yes/No Question' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Question
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the question here"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={commentsYes}
                      onChange={(e) => setCommentsYes(e.target.checked)}
                      style={{ accentColor: '#f57c00' }}
                    />
                    <span>Include additional comments for Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={commentsNo}
                      onChange={(e) => setCommentsNo(e.target.checked)}
                      style={{ accentColor: '#f57c00' }}
                    />
                    <span>Include additional comments for No</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Generated Text for Yes:
                    </label>
                    <input
                      type="text"
                      value={genTextYes}
                      onChange={(e) => setGenTextYes(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Generated Text for No:
                    </label>
                    <input
                      type="text"
                      value={genTextNo}
                      onChange={(e) => setGenTextNo(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* 7. RATING SCALE */}
            {componentType === 'Rating Scale' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Question
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the question here (e.g. Pain Scale 1-10)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      value={ratingMin}
                      onChange={(e) => setRatingMin(Number(e.target.value))}
                      style={{ width: '80px', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      value={ratingMax}
                      onChange={(e) => setRatingMax(Number(e.target.value))}
                      style={{ width: '80px', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Text generated in chart notes
                  </div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Generated Text
                  </label>
                  <input
                    type="text"
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </>
            )}

            {/* 8. NOTES & PLACEHOLDERS */}
            {componentType === 'Notes' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Notes Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clinical Narrative / Assessment Notes"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '12px' }}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Notes
                  </label>
                  <textarea
                    ref={notesRef}
                    rows={6}
                    value={notesContent}
                    onChange={(e) => setNotesContent(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Copy and paste the required place holders within the notes to auto-populate the patient data.</span>
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <HelpCircle size={15} /> Help
                  </button>
                </div>

                {showHelp && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', color: '#166534' }}>
                    During test mode, placeholders such as <strong>{'${patient.name}'}</strong> and <strong>{'${patient.age}'}</strong> will be dynamically replaced with the selected fictional patient&apos;s real-time information!
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Patient Field
                    </label>
                    <select
                      value={selectedPatientField}
                      onChange={(e) => handleSelectPlaceholderField(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    >
                      <option value="">[ Select Field ]</option>
                      {Object.entries(PATIENT_PLACEHOLDERS).map(([cat, fields]) => (
                        <optgroup key={cat} label={cat}>
                          {fields.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Place Holder
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={generatedPlaceholder}
                      placeholder="e.g. ${patient.name}"
                      style={{ width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#4b5563' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleInsertPlaceholder}
                    disabled={!generatedPlaceholder}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: generatedPlaceholder ? '#f57c00' : '#e5e7eb',
                      color: generatedPlaceholder ? '#ffffff' : '#9ca3af',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: generatedPlaceholder ? 'pointer' : 'default',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={13} /> Insert
                  </button>
                </div>
              </>
            )}

            {/* 9. TABLE */}
            {componentType === 'Table' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Table Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter table title (e.g. Vital Signs Record)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '12px' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      No of Columns:
                    </label>
                    <select
                      value={tableCols}
                      onChange={(e) => handleColCountChange(Number(e.target.value))}
                      style={{ padding: '4px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={addTableRow}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Add Row
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      {tableRows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ backgroundColor: rIdx === 0 ? '#f9fafb' : '#ffffff' }}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              style={{
                                borderTop: cell.properties?.borderTop === false ? 'none' : '1px solid #cbd5e1',
                                borderRight: cell.properties?.borderRight === false ? 'none' : '1px solid #cbd5e1',
                                borderBottom: cell.properties?.borderBottom === false ? 'none' : '1px solid #cbd5e1',
                                borderLeft: cell.properties?.borderLeft === false ? 'none' : '1px solid #cbd5e1',
                                padding: '6px',
                                position: 'relative',
                                fontWeight: rIdx === 0 || cell.properties?.bold ? 'bold' : 'normal',
                                fontStyle: cell.properties?.italic ? 'italic' : 'normal',
                                textDecoration: cell.properties?.underline ? 'underline' : 'none',
                                textAlign: cell.properties?.alignment || 'left',
                                fontSize: cell.properties?.fontSize ? `${cell.properties.fontSize}px` : undefined
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="text"
                                  value={cell.text}
                                  onChange={(e) => updateTableCellText(rIdx, cIdx, e.target.value)}
                                  placeholder={`R${rIdx + 1}C${cIdx + 1}`}
                                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 'inherit', fontWeight: 'inherit', textAlign: 'inherit' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCellCoord({ row: rIdx, col: cIdx });
                                    setShowCellPropsModal(true);
                                  }}
                                  title="Edit Cell Properties"
                                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Settings2 size={13} />
                                </button>
                              </div>
                            </td>
                          ))}
                          <td style={{ width: '32px', border: '1px solid #e5e7eb', textAlign: 'center', padding: '4px' }}>
                            <button
                              type="button"
                              onClick={() => deleteTableRow(rIdx)}
                              title="Delete Row"
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 10. IMAGE */}
            {componentType === 'Image' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Image Label / Caption
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ECG Strip / Clinical Diagram"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '14px' }}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Choose file
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                </div>

                {imageUrl && (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px', textAlign: 'center', maxHeight: '180px', overflow: 'hidden' }}>
                    <img src={imageUrl} alt="Uploaded preview" style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain' }} />
                  </div>
                )}
              </>
            )}

            {/* Mandatory toggle for all components except Heading */}
            {componentType !== 'Heading' && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Is Mandatory:
                </span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1f2937', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_mandatory_choice"
                      checked={isMandatory}
                      onChange={() => setIsMandatory(true)}
                      style={{ accentColor: '#f57c00' }}
                    />
                    <span>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1f2937', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_mandatory_choice"
                      checked={!isMandatory}
                      onChange={() => setIsMandatory(false)}
                      style={{ accentColor: '#f57c00' }}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer CTAs */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f9fafb' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ padding: '6px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-orange"
              onClick={handleSave}
              style={{ padding: '6px 22px', fontSize: '13px', backgroundColor: '#f57c00', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
            >
              OK
            </button>
          </div>
        </div>
      </div>

      {/* Edit Cell Properties sub-modal for Table */}
      {showCellPropsModal && activeCellCoord && (
        <EditCellPropertiesModal
          isOpen={showCellPropsModal}
          cellCoord={activeCellCoord}
          initialProperties={tableRows[activeCellCoord.row]?.[activeCellCoord.col]?.properties}
          onApply={handleApplyCellProperties}
          onClose={() => setShowCellPropsModal(false)}
        />
      )}
    </>
  );
};
