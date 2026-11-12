import React, { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface SoapSectionModalProps {
  isOpen: boolean;
  templateName: string;
  onClose: () => void;
  onAddSections: (selectedSections: Array<{ title: string; category: 'Subjective' | 'Objective' | 'Assessment' | 'Plan' }>) => void;
}

interface SoapCategoryGroup {
  category: 'Subjective' | 'Objective' | 'Assessment' | 'Plan';
  title: string;
  items: string[];
}

const SOAP_DEFINITIONS: SoapCategoryGroup[] = [
  {
    category: 'Subjective',
    title: 'SUBJECTIVE',
    items: [
      'Symptoms',
      'History of Present Illness',
      'Past Medical History',
      'Family History',
      'Social History',
      'Review of Systems'
    ]
  },
  {
    category: 'Objective',
    title: 'OBJECTIVE',
    items: ['Physical Examination']
  },
  {
    category: 'Assessment',
    title: 'ASSESSMENT',
    items: ['Assessment Notes', 'Self Notes']
  },
  {
    category: 'Plan',
    title: 'PLAN',
    items: [
      'Diet Recommendation',
      'Lifestyle Recommendation',
      'Treatment Notes',
      'Instructions'
    ]
  }
];

export const SoapSectionModal: React.FC<SoapSectionModalProps> = ({
  isOpen,
  templateName,
  onClose,
  onAddSections
}) => {
  // Pre-select Symptoms and Physical Examination by default
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({
    'Symptoms': true,
    'Physical Examination': true,
    'Assessment Notes': true,
    'Treatment Notes': true
  });

  if (!isOpen) return null;

  const handleToggle = (item: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleAdd = () => {
    const chosen: Array<{ title: string; category: 'Subjective' | 'Objective' | 'Assessment' | 'Plan' }> = [];
    SOAP_DEFINITIONS.forEach((group) => {
      group.items.forEach((item) => {
        if (selectedItems[item]) {
          chosen.push({
            title: item,
            category: group.category
          });
        }
      });
    });

    onAddSections(chosen);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="back-btn" onClick={onClose} style={{ padding: '2px 6px' }} title="Back">
              <ArrowLeft size={16} />
            </button>
            <h3 className="modal-title">Add SOAP Sections</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px', fontWeight: 500 }}>
            Please choose the required SOAP sections
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Column 1: Subjective */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="soap-category-block" style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f57c00', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {SOAP_DEFINITIONS[0].title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {SOAP_DEFINITIONS[0].items.map((item) => (
                    <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1f2937', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!selectedItems[item]}
                        onChange={() => handleToggle(item)}
                        style={{ accentColor: '#f57c00', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Objective, Assessment, Plan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SOAP_DEFINITIONS.slice(1).map((group) => (
                <div key={group.title} className="soap-category-block" style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f57c00', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {group.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {group.items.map((item) => (
                      <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1f2937', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedItems[item]}
                          onChange={() => handleToggle(item)}
                          style={{ accentColor: '#f57c00', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f9fafb' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '13px' }}>
            Cancel
          </button>
          <button type="button" className="btn-orange" onClick={handleAdd} style={{ padding: '6px 20px', fontSize: '13px', backgroundColor: '#f57c00', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
