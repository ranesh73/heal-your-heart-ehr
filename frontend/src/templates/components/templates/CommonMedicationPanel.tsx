import React, { useState, useMemo } from 'react';
import {
  Search,
  Pill,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Info,
  CheckCircle2,
  Bookmark,
  FileText
} from 'lucide-react';
import { ClinicalTemplate, MedicalCondition } from '../../types';

interface CommonMedicationPanelProps {
  conditions: MedicalCondition[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeCondition: string;
  onSelectCondition: (key: string) => void;
  templates: ClinicalTemplate[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewTemplate: (template: ClinicalTemplate) => void;
}

export interface FirstLineMed {
  name: string;
  generic: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

export interface ClinicianConditionReference {
  id: string;
  condition: string;
  category: string;
  firstLineMeds: FirstLineMed[];
  clinicalNotes: string;
}

/** 15 Common Clinical Conditions Reference Directory (Clinician Reference Only - Non-Prescriptive) */
export const COMMON_CLINICAL_CONDITIONS: ClinicianConditionReference[] = [
  {
    id: 'fever',
    condition: 'Fever (Pyrexia)',
    category: 'General Medicine',
    firstLineMeds: [
      {
        name: 'Paracetamol (Dolo / Calpol)',
        generic: 'Paracetamol',
        dosage: '500 mg - 650 mg',
        frequency: 'TDS / QDS PRN (Max 4g / day)',
        instructions: 'Take after food with plenty of water. Space doses by at least 4 to 6 hours.'
      },
      {
        name: 'Mefenamic Acid (Meftal)',
        generic: 'Mefenamic Acid',
        dosage: '250 mg - 500 mg',
        frequency: 'SOS (Max 3 times daily)',
        instructions: 'For high refractory fever; avoid on empty stomach and avoid in renal impairment.'
      }
    ],
    clinicalNotes: 'Ensure oral hydration with ORS and tender coconut water. Screen for dengue, malaria, UTI, or viral prodrome if fever persists > 48 hours.'
  },
  {
    id: 'cold',
    condition: 'Common Cold / Rhinorrhea',
    category: 'Respiratory',
    firstLineMeds: [
      {
        name: 'Cetirizine / Levocetirizine',
        generic: 'Levocetirizine 5mg',
        dosage: '5 mg',
        frequency: 'Once daily at night (HS)',
        instructions: 'Non-sedating antihistamine for sneezing, rhinorrhea, and nasal congestion.'
      },
      {
        name: 'Phenylephrine + CPM',
        generic: 'Nasal Decongestant',
        dosage: 'Standard Tablet',
        frequency: 'BD x 3 days',
        instructions: 'Relieves nasal mucosal congestion. Caution in hypertension and ischemic heart disease.'
      },
      {
        name: 'Saline Nasal Drops',
        generic: 'Sodium Chloride 0.65%',
        dosage: '2-3 drops',
        frequency: 'TDS in each nostril',
        instructions: 'Moisturizes dry nasal mucosa and thins viscous secretions.'
      }
    ],
    clinicalNotes: 'Steam inhalation with camphor or eucalyptus. Advise warm fluids and salt water gargles.'
  },
  {
    id: 'cough',
    condition: 'Cough (Acute Dry / Productive)',
    category: 'Respiratory',
    firstLineMeds: [
      {
        name: 'Dextromethorphan + Chlorpheniramine',
        generic: 'Dry Cough Syrup',
        dosage: '5 - 10 ml',
        frequency: 'TDS for 5 days',
        instructions: 'Central antitussive for irritating dry non-productive cough.'
      },
      {
        name: 'Ambroxol + Levosalbutamol + Guaiphenesin',
        generic: 'Expectorant Mucolytic',
        dosage: '5 - 10 ml',
        frequency: 'TDS after meals',
        instructions: 'Promotes clearance of thick tracheobronchial phlegm. Hydrate adequately.'
      }
    ],
    clinicalNotes: 'Evaluate for ACE-inhibitor induced cough, post-nasal drip, GERD, or underlying cardiac asthma (nocturnal cough in heart failure).'
  },
  {
    id: 'sore_throat',
    condition: 'Sore Throat / Pharyngitis',
    category: 'Respiratory',
    firstLineMeds: [
      {
        name: 'Betadine Gargle (Povidone Iodine 2%)',
        generic: 'Povidone Iodine 2%',
        dosage: '10 ml diluted 1:1 with warm water',
        frequency: 'Gargle TDS x 5 days',
        instructions: 'Broad-spectrum topical antiseptic. Spit out after 30 seconds gargle; do not swallow.'
      },
      {
        name: 'Benzydamine Mouthwash / Lozenges',
        generic: 'Benzydamine HCl',
        dosage: '1 Lozenge / 15 ml rinse',
        frequency: 'Every 3-4 hours PRN',
        instructions: 'Local analgesic and anti-inflammatory relief for acute pharyngeal pain.'
      }
    ],
    clinicalNotes: 'Rule out Streptococcal pharyngitis (Centor criteria) or tonsillitis if fever, tonsillar exudate, and tender cervical lymphadenopathy present.'
  },
  {
    id: 'diarrhea',
    condition: 'Loose Motion / Acute Diarrhea',
    category: 'Gastrointestinal',
    firstLineMeds: [
      {
        name: 'Oral Rehydration Salts (WHO-ORS)',
        generic: 'WHO-Formula ORS (21.8g in 1L)',
        dosage: '200 - 400 ml per loose stool',
        frequency: 'Frequent sips',
        instructions: 'Immediate replacement of fluid and electrolyte losses. Paramount to prevent dehydration.'
      },
      {
        name: 'Saccharomyces boulardii / Lactic Acid Bacillus',
        generic: 'Probiotic 250mg',
        dosage: '250 mg sachet / cap',
        frequency: 'BD x 5 days',
        instructions: 'Restores healthy intestinal microflora and shortens diarrheal duration.'
      },
      {
        name: 'Racecadotril',
        generic: 'Racecadotril 100mg',
        dosage: '100 mg',
        frequency: 'TDS before food (Max 7 days)',
        instructions: 'Peripheral enkephalinase inhibitor reduces hypersecretion without affecting gut motility.'
      }
    ],
    clinicalNotes: 'Avoid antimotility agents (Loperamide) in fever or bloody stools (dysentery). Check electrolytes and creatinine in elderly/cardiac patients.'
  },
  {
    id: 'vomiting',
    condition: 'Vomiting / Acute Nausea',
    category: 'Gastrointestinal',
    firstLineMeds: [
      {
        name: 'Ondansetron (Emeset / Vomikind)',
        generic: 'Ondansetron 4mg',
        dosage: '4 mg - 8 mg',
        frequency: 'TDS SOS (30 min before food)',
        instructions: '5-HT3 receptor antagonist for acute gastroenteritis, migraine, or drug-induced nausea.'
      },
      {
        name: 'Domperidone (Domstal)',
        generic: 'Domperidone 10mg',
        dosage: '10 mg',
        frequency: 'BD / TDS before meals',
        instructions: 'Prokinetic dopamine antagonist. Promotes gastric emptying.'
      }
    ],
    clinicalNotes: 'Small frequent sips of electrolyte fluids. In cardiac patients, check ECG for QT prolongation before repeating antiemetics.'
  },
  {
    id: 'acidity',
    condition: 'Acidity / Gastritis / GERD',
    category: 'Gastrointestinal',
    firstLineMeds: [
      {
        name: 'Pantoprazole (Pan 40)',
        generic: 'Pantoprazole 40mg',
        dosage: '40 mg',
        frequency: 'Once daily (30 min before breakfast)',
        instructions: 'Proton pump inhibitor suppresses gastric acid secretion. Take on an empty stomach.'
      },
      {
        name: 'Magaldrate + Simethicone Suspension',
        generic: 'Antacid Gel',
        dosage: '10 - 15 ml',
        frequency: 'TDS (1-2 hours after food & HS)',
        instructions: 'Rapid local neutralization of gastric acid and gas relief.'
      }
    ],
    clinicalNotes: 'Differentiate epigastric burning/acidity from atypical myocardial ischemia / angina. Always assess cardiac risk factors!'
  },
  {
    id: 'thyroid',
    condition: 'Thyroid Disorders (Hypothyroidism)',
    category: 'Endocrinology',
    firstLineMeds: [
      {
        name: 'Levothyroxine Sodium (Thyronorm / Eltroxin)',
        generic: 'Levothyroxine',
        dosage: '25 - 100 mcg (Individualized)',
        frequency: 'Once daily on empty stomach',
        instructions: 'Take first thing in the morning with plain water, 60 min before breakfast, tea, or milk.'
      }
    ],
    clinicalNotes: 'Recheck fasting Serum TSH and Free T4 every 6-8 weeks until euthyroid. Titrate gradually in elderly CAD patients to prevent angina.'
  },
  {
    id: 'headache',
    condition: 'Headache (Tension / Migraine)',
    category: 'Neurology',
    firstLineMeds: [
      {
        name: 'Paracetamol 650mg + Caffeine',
        generic: 'Paracetamol 650mg + Caffeine 50mg',
        dosage: '1 tablet',
        frequency: 'SOS (Max 3 tabs / day)',
        instructions: 'First-line for tension-type headache or mild-moderate migraine attack.'
      },
      {
        name: 'Naproxen + Domperidone',
        generic: 'Naproxen 500mg + Domperidone 10mg',
        dosage: '1 tablet',
        frequency: 'At headache onset SOS',
        instructions: 'NSAID combined with prokinetic reduces neurogenic inflammation and gastric stasis.'
      }
    ],
    clinicalNotes: 'Screen for red flag headache signs (thunderclap onset, neurological deficit, papilledema, fever with neck stiffness, hypertensive crisis).'
  },
  {
    id: 'body_pain',
    condition: 'Body Pain / Musculoskeletal Ache',
    category: 'Musculoskeletal',
    firstLineMeds: [
      {
        name: 'Aceclofenac + Paracetamol (Zerodol-P)',
        generic: 'Aceclofenac 100mg + Paracetamol 325mg',
        dosage: '1 tablet',
        frequency: 'BD after meals x 3-5 days',
        instructions: 'Anti-inflammatory and analgesic for acute back pain, sprains, or arthralgia.'
      },
      {
        name: 'Thiocolchicoside (Muscoril)',
        generic: 'Muscle Relaxant 4mg',
        dosage: '4 mg',
        frequency: 'BD x 5 days',
        instructions: 'Central GABA-mimetic muscle relaxant for acute skeletal muscle spasms.'
      }
    ],
    clinicalNotes: 'Always co-prescribe PPI with NSAIDs in patients > 60 years or history of peptic ulcer. Caution with NSAIDs in renal dysfunction and CHF.'
  },
  {
    id: 'constipation',
    condition: 'Constipation (Acute & Chronic)',
    category: 'Gastrointestinal',
    firstLineMeds: [
      {
        name: 'Lactulose Oral Solution',
        generic: 'Lactulose 10g / 15ml',
        dosage: '15 - 30 ml',
        frequency: 'Once daily at night (HS)',
        instructions: 'Osmotic disaccharide laxative softens stools. Onset 24-48 hours. Drink 2L water daily.'
      },
      {
        name: 'Isabgol (Psyllium Husk)',
        generic: 'Dietary Fiber Supplement',
        dosage: '1-2 tablespoons',
        frequency: 'At bedtime with warm water',
        instructions: 'Bulk-forming natural fiber. Must be consumed immediately after mixing.'
      }
    ],
    clinicalNotes: 'Crucial for cardiac and post-CABG/EECP patients to prevent straining at stool (Valsalva maneuver triggers dangerous bradycardia/ischemia).'
  },
  {
    id: 'weakness',
    condition: 'General Weakness / Fatigue',
    category: 'General Medicine',
    firstLineMeds: [
      {
        name: 'B-Complex with B12 & Zinc (Becodex / Becosules)',
        generic: 'Multivitamin & Zinc',
        dosage: '1 capsule',
        frequency: 'Once daily after breakfast x 30 days',
        instructions: 'Nutritional replenishment for cellular energy metabolism and neuro-muscular vitality.'
      },
      {
        name: 'Vitamin D3 (Cholecalciferol 60,000 IU)',
        generic: 'Cholecalciferol 60k',
        dosage: '60,000 IU sachet / cap',
        frequency: 'Once weekly for 8 weeks',
        instructions: 'Corrects widespread hypovitaminosis D. Take with milk or meal containing healthy fats.'
      }
    ],
    clinicalNotes: 'Workup: Complete Blood Count (anemia), HbA1c, Serum Ferritin, Thyroid panel, and Electrolytes. Rule out occult heart failure or malignancy.'
  },
  {
    id: 'allergies',
    condition: 'Allergic Symptoms / Urticaria / Pruritus',
    category: 'Dermatology',
    firstLineMeds: [
      {
        name: 'Fexofenadine (Allegra 120 / 180)',
        generic: 'Fexofenadine HCl',
        dosage: '120 mg - 180 mg',
        frequency: 'Once daily (OD)',
        instructions: 'Second-generation non-drowsy H1 antihistamine for allergic rhinitis and chronic urticaria.'
      },
      {
        name: 'Calamine Lotion',
        generic: 'Calamine + Zinc Oxide',
        dosage: 'Topical application',
        frequency: 'TDS to affected skin areas',
        instructions: 'Soothes dermal itching, insect bites, and allergic rash.'
      }
    ],
    clinicalNotes: 'Warn patients regarding anaphylaxis signs (facial angioedema, stridor, bronchospasm, hypotension) requiring immediate emergency adrenaline (epinephrine).'
  },
  {
    id: 'diabetes',
    condition: 'Diabetes Mellitus (Type 2 - Reference)',
    category: 'Endocrinology',
    firstLineMeds: [
      {
        name: 'Metformin Hydrochloride',
        generic: 'Metformin 500mg - 1000mg',
        dosage: '500 mg - 850 mg',
        frequency: 'BD with or after main meals',
        instructions: 'First-line biguanide insulin sensitizer. Decreases hepatic gluconeogenesis.'
      },
      {
        name: 'Glimepiride',
        generic: 'Sulfonylurea 1mg - 2mg',
        dosage: '1 mg - 2 mg',
        frequency: 'Once daily before breakfast',
        instructions: 'Stimulates pancreatic insulin secretion. Educate on hypoglycemia symptoms.'
      },
      {
        name: 'Dapagliflozin / Empagliflozin',
        generic: 'SGLT2 Inhibitor 10mg',
        dosage: '10 mg',
        frequency: 'Once daily morning',
        instructions: 'Cardioprotective and nephroprotective glycemic control with proven CHF mortality reduction.'
      }
    ],
    clinicalNotes: 'Target HbA1c < 7.0%. Monitor renal function (eGFR) and urine microalbumin annually. Essential for cardiovascular disease risk reduction.'
  },
  {
    id: 'hypertension',
    condition: 'Hypertension (Primary - Reference)',
    category: 'Cardiology',
    firstLineMeds: [
      {
        name: 'Telmisartan (Telma 40)',
        generic: 'Telmisartan 40mg',
        dosage: '40 mg - 80 mg',
        frequency: 'Once daily morning',
        instructions: 'Angiotensin II receptor blocker (ARB). Promotes vascular relaxation and kidney protection.'
      },
      {
        name: 'Amlodipine (Amlong 5)',
        generic: 'Amlodipine 5mg',
        dosage: '5 mg',
        frequency: 'Once daily (OD)',
        instructions: 'Dihydropyridine calcium channel blocker. Watch for ankle edema in prolonged therapy.'
      },
      {
        name: 'Metoprolol Succinate Prolonged Release',
        generic: 'Metoprolol ER 25mg - 50mg',
        dosage: '25 mg - 50 mg',
        frequency: 'Once daily morning',
        instructions: 'Cardioselective beta-1 blocker. Slows resting heart rate and lowers myocardial oxygen demand.'
      }
    ],
    clinicalNotes: 'Target BP < 130/80 mmHg. Lifestyle: sodium restriction (< 2g/day), DASH diet, 30 min daily walking, weight control, and stress reduction.'
  }
];

const CATEGORIES = [
  'All',
  'General Medicine',
  'Cardiology',
  'Respiratory',
  'Gastrointestinal',
  'Endocrinology',
  'Neurology',
  'Musculoskeletal',
  'Dermatology'
];

export const CommonMedicationPanel: React.FC<CommonMedicationPanelProps> = ({
  searchTerm,
  onSearchChange,
  templates,
  onViewTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedConditionIds, setExpandedConditionIds] = useState<Set<string>>(
    new Set(['fever', 'cold', 'diarrhea', 'acidity', 'hypertension'])
  );

  const toggleExpand = (id: string) => {
    setExpandedConditionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedConditionIds(new Set(COMMON_CLINICAL_CONDITIONS.map((c) => c.id)));
  };

  const collapseAll = () => {
    setExpandedConditionIds(new Set());
  };

  const filteredConditions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return COMMON_CLINICAL_CONDITIONS.filter((item) => {
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      // Search match
      const matchCond = item.condition.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchNotes = item.clinicalNotes.toLowerCase().includes(q);
      const matchMeds = item.firstLineMeds.some(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.generic.toLowerCase().includes(q) ||
          m.dosage.toLowerCase().includes(q) ||
          m.instructions.toLowerCase().includes(q)
      );
      return matchCond || matchCat || matchNotes || matchMeds;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="common-medication-container" style={{ padding: '4px 0 24px 0' }}>
      {/* Top Banner & Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10afa3'
            }}
          >
            <Pill size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Common Clinical Reference
              </h2>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  backgroundColor: '#f0fdf4',
                  color: '#0f766e',
                  border: '1px solid #99f6e4',
                  padding: '2px 10px',
                  borderRadius: '12px'
                }}
              >
                15 Conditions Active
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}
              >
                Clinician Reference Only · Non-Prescriptive
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
              Standard first-line clinical regimens, dosages, and instructions for common outpatient conditions.
            </p>
          </div>
        </div>

        {/* Quick Expand / Collapse All Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={expandAll}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#10afa3',
              backgroundColor: '#ffffff',
              border: '1px solid #10afa3',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 12px',
              width: '100%',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <Search size={16} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search condition, medication, or instruction..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13.5px',
                width: '100%',
                color: '#1e293b'
              }}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? '#10afa3' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid #10afa3' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Safety Notice Callout */}
      <div
        style={{
          backgroundColor: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: '6px',
          padding: '10px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12.5px',
          color: '#0f766e'
        }}
      >
        <ShieldAlert size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Clinical Practice Reference:</strong> This section provides standardized first-line regimens for clinician reference during consultations. It does not automatically prescribe medications or alter patient records.
        </span>
      </div>

      {/* Condition Reference Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredConditions.map((item, idx) => {
          const isExpanded = expandedConditionIds.has(item.id);

          // Find if any existing template matches this condition
          const matchingTemplate = templates.find((t) =>
            t.name.toLowerCase().includes(item.id) ||
            t.name.toLowerCase().includes(item.condition.toLowerCase().split(' ')[0])
          );

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'border-color 0.15s ease'
              }}
            >
              {/* Condition Header Bar */}
              <div
                onClick={() => toggleExpand(item.id)}
                style={{
                  padding: '12px 18px',
                  backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                  borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#e0f2fe',
                      color: '#0288d1',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                    {item.condition}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    {item.category}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    ({item.firstLineMeds.length} first-line regimen{item.firstLineMeds.length > 1 ? 's' : ''})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {matchingTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewTemplate(matchingTemplate);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#0288d1',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <FileText size={12} /> View Template
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </div>
              </div>

              {/* Expanded Condition Content */}
              {isExpanded && (
                <div style={{ padding: '16px 20px' }}>
                  {/* First-Line Regimens Table */}
                  <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px'
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155', width: '25%' }}>First-Line Medication</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155', width: '22%' }}>Generic Composition</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155', width: '15%' }}>Usual Adult Dose</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155', width: '15%' }}>Frequency</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155', width: '23%' }}>Clinical Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.firstLineMeds.map((med, mIdx) => (
                          <tr
                            key={mIdx}
                            style={{
                              borderBottom: mIdx < item.firstLineMeds.length - 1 ? '1px solid #f1f5f9' : 'none',
                              backgroundColor: mIdx % 2 === 0 ? '#ffffff' : '#fafafa'
                            }}
                          >
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Pill size={13} color="#10afa3" style={{ flexShrink: 0 }} />
                                <span>{med.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>{med.generic}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 500, color: '#334155' }}>{med.dosage}</td>
                            <td style={{ padding: '8px 12px', color: '#0369a1', fontWeight: 600 }}>{med.frequency}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '12.5px' }}>{med.instructions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Clinical Pearl / Advice Note */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      borderLeft: '3px solid #10afa3',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      color: '#334155',
                      borderRadius: '0 4px 4px 0'
                    }}
                  >
                    <strong style={{ color: '#0f766e' }}>Clinical Pearl: </strong>
                    {item.clinicalNotes}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredConditions.length === 0 && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#64748b'
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
              No common conditions found matching "{searchTerm}".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
