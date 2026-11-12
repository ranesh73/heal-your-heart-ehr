import React, { useState } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline } from 'lucide-react';
import { TableCellProperties } from '../../types';

interface EditCellPropertiesModalProps {
  isOpen: boolean;
  initialProperties?: TableCellProperties;
  cellCoord?: { row: number; col: number } | null;
  onApply: (properties: TableCellProperties) => void;
  onClose: () => void;
}

export const EditCellPropertiesModal: React.FC<EditCellPropertiesModalProps> = ({
  isOpen,
  initialProperties,
  cellCoord,
  onApply,
  onClose
}) => {
  const [fontSize, setFontSize] = useState<number>(initialProperties?.fontSize || 14);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>(
    initialProperties?.alignment || 'left'
  );
  const [bold, setBold] = useState<boolean>(initialProperties?.bold || false);
  const [italic, setItalic] = useState<boolean>(initialProperties?.italic || false);
  const [underline, setUnderline] = useState<boolean>(initialProperties?.underline || false);

  const [borderTop, setBorderTop] = useState<boolean>(initialProperties?.borderTop !== false);
  const [borderRight, setBorderRight] = useState<boolean>(initialProperties?.borderRight !== false);
  const [borderBottom, setBorderBottom] = useState<boolean>(initialProperties?.borderBottom !== false);
  const [borderLeft, setBorderLeft] = useState<boolean>(initialProperties?.borderLeft !== false);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      fontSize,
      alignment,
      bold,
      italic,
      underline,
      borderTop,
      borderRight,
      borderBottom,
      borderLeft
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-card" style={{ maxWidth: '420px', borderRadius: '6px', overflow: 'hidden' }}>
        <div className="modal-header" style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
          <h3 className="modal-title" style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
            Edit Cell Properties {cellCoord ? `(Row ${cellCoord.row + 1}, Col ${cellCoord.col + 1})` : ''}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Text Size */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Text Size:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="10"
                max="32"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 14)}
                style={{
                  width: '80px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>px</span>
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Text Alignment:
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => setAlignment(align)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: alignment === align ? '#fff7ed' : '#ffffff',
                    borderColor: alignment === align ? '#f57c00' : '#d1d5db',
                    color: alignment === align ? '#f57c00' : '#4b5563',
                    cursor: 'pointer'
                  }}
                  title={align.toUpperCase()}
                >
                  {align === 'left' && <AlignLeft size={16} />}
                  {align === 'center' && <AlignCenter size={16} />}
                  {align === 'right' && <AlignRight size={16} />}
                  {align === 'justify' && <AlignJustify size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Text Style */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Text Style:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setBold(!bold)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: bold ? '#fff7ed' : '#ffffff',
                  borderColor: bold ? '#f57c00' : '#d1d5db',
                  color: bold ? '#f57c00' : '#4b5563',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                title="Bold"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                onClick={() => setItalic(!italic)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: italic ? '#fff7ed' : '#ffffff',
                  borderColor: italic ? '#f57c00' : '#d1d5db',
                  color: italic ? '#f57c00' : '#4b5563',
                  cursor: 'pointer'
                }}
                title="Italic"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                onClick={() => setUnderline(!underline)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: underline ? '#fff7ed' : '#ffffff',
                  borderColor: underline ? '#f57c00' : '#d1d5db',
                  color: underline ? '#f57c00' : '#4b5563',
                  cursor: 'pointer'
                }}
                title="Underline"
              >
                <Underline size={15} />
              </button>
            </div>
          </div>

          {/* Border */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Border:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={borderTop}
                  onChange={(e) => setBorderTop(e.target.checked)}
                  style={{ accentColor: '#f57c00' }}
                />
                <span>Top</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={borderRight}
                  onChange={(e) => setBorderRight(e.target.checked)}
                  style={{ accentColor: '#f57c00' }}
                />
                <span>Right</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={borderBottom}
                  onChange={(e) => setBorderBottom(e.target.checked)}
                  style={{ accentColor: '#f57c00' }}
                />
                <span>Bottom</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={borderLeft}
                  onChange={(e) => setBorderLeft(e.target.checked)}
                  style={{ accentColor: '#f57c00' }}
                />
                <span>Left</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f9fafb' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: '13px' }}>
            Cancel
          </button>
          <button type="button" className="btn-orange" onClick={handleApply} style={{ padding: '6px 18px', fontSize: '13px', backgroundColor: '#f57c00', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
