/**
 * Frontend mirror of `backend/app/template_types.py`.
 *
 * The dropdowns fetch the authoritative lists from the API at runtime
 * (`/api/template-types`, `/api/template-categories`, `/api/medical-conditions`);
 * these constants are the offline fallback used before the fetch resolves or
 * if the backend is unreachable. Keep them in sync with the Python module.
 */

import type { MedicalCondition } from '../types';

export type { MedicalCondition };

/** The 32 canonical clinical template types. */
export const TEMPLATE_TYPES: string[] = [
  'Billing Inventory',
  'Chief Complaints',
  'Diagnosis',
  'Diet Recommendations',
  'Email',
  'Family History',
  'Follow up',
  'History of Present Illness',
  'Imaging',
  'Injection',
  'Instructions',
  'Lab Record',
  'Lifestyle Recommendations',
  'Nurse Notes',
  'Past Medical History',
  'Physical Examination',
  'Prescription',
  'Reports',
  'Review of Systems',
  'SOAP',
  'Self Notes',
  'Social History',
  'Supplement',
  'Symptoms',
  'Send Invoice - PHR Message',
  'Send Invoice - Email',
  'Send Receipt - PHR Message',
  'Send Receipt - Email',
  'Send Statement - PHR Message',
  'Send Statement - Email',
  'Treatment Notes',
  'Vaccine'
];

/** Types that predate the canonical list; kept so existing rows stay reachable. */
export const LEGACY_TEMPLATE_TYPES: string[] = [
  'Assessment Notes',
  'Billing Procedure Codes'
];

/**
 * The order the Template Type dropdown renders in, matching the reference
 * CharmHealth dropdown. It is presentation only - storage still validates
 * against TEMPLATE_TYPES + LEGACY_TEMPLATE_TYPES.
 */
export const TEMPLATE_TYPE_DROPDOWN: string[] = [
  'Assessment Notes',
  'Billing Procedure Codes',
  'Billing Inventory',
  'Chief Complaints',
  'Diagnosis',
  'Diet Recommendations',
  'Email',
  'Family History',
  'Follow up',
  'History of Present Illness',
  'Imaging',
  'Injection',
  'Instructions',
  'Lab Record',
  'Lifestyle Recommendations',
  'Nurse Notes',
  'Past Medical History',
  'Physical Examination',
  'Prescription',
  'Reports',
  'Review of Systems',
  'SOAP',
  'Self Notes',
  'Social History',
  'Supplement',
  'Symptoms',
  'Send Invoice - PHR Message',
  'Send Invoice - Email',
  'Send Receipt - PHR Message',
  'Send Receipt - Email',
  'Send Statement - PHR Message',
  'Send Statement - Email',
  'Treatment Notes',
  'Vaccine'
];

/** Flat list for the dropdown: "All" first, then the types in reference order. */
export const TEMPLATE_TYPE_OPTIONS: string[] = ['All', ...TEMPLATE_TYPE_DROPDOWN];

export const MEDICAL_CATEGORIES: string[] = [
  'Cardiac',
  'EECP',
  'Respiratory',
  'General Medicine',
  'Diabetes',
  'Hypertension',
  'Thyroid',
  'Anesthesia',
  'Kidney / Urinary',
  'Gastrointestinal',
  'Neurology',
  'Musculoskeletal',
  'Vaccination',
  'Lab',
  'Imaging',
  'Preventive',
  'Nutrition',
  'Pharmacy',
  'Nursing',
  'Billing',
  'Administrative',
  'Communication'
];

/**
 * Common Medication catalogue - the ONLY place medical conditions are listed.
 * My Templates deliberately shows no condition chips; the clinic asked for a
 * single home for this list so the template tabs stay a plain template listing.
 */
export const MEDICAL_CONDITIONS: MedicalCondition[] = [
  { key: 'diarrhea', label: 'Diarrhea', category: 'Gastrointestinal', description: 'Acute and chronic loose stools, gastroenteritis and rehydration plans.' },
  { key: 'back_pain', label: 'Back Pain', category: 'Musculoskeletal', description: 'Lower back, lumbar and sciatic pain assessment and management.' },
  { key: 'cardiac', label: 'Cardiac', category: 'Cardiac', description: 'General cardiology workup, coronary assessment and cardiac routines.' },
  { key: 'cough', label: 'Cough', category: 'Respiratory', description: 'Productive and dry cough, bronchitis and expectorant therapy.' },
  { key: 'cold', label: 'Cold', category: 'ENT', description: 'Common cold, coryza and nasal congestion management.' },
  { key: 'fever', label: 'Fever', category: 'General Medicine', description: 'Acute febrile illness, pyrexia workup and antipyretic orders.' },
  { key: 'anaesthesia', label: 'Anaesthesia', category: 'Anesthesia', description: 'Anaesthetic agents, sedation records and intra-operative notes.' },
  { key: 'chest_pain', label: 'Chest Pain', category: 'Cardiac', description: 'Chest pain triage, angina grading and ischaemic pathways.' },
  { key: 'heart_failure', label: 'Heart Failure', category: 'Cardiac', description: 'NYHA staging, ejection fraction review and cardiomyopathy follow-up.' },
  { key: 'hypertension', label: 'Hypertension', category: 'Hypertension', description: 'Blood pressure monitoring and antihypertensive regimens.' },
  { key: 'diabetes', label: 'Diabetes', category: 'Diabetes', description: 'Glycaemic control, HbA1c review and insulin titration.' },
  { key: 'asthma', label: 'Asthma', category: 'Respiratory', description: 'Asthma control assessment, inhaler technique and bronchodilators.' },
  { key: 'respiratory', label: 'Respiratory Conditions', category: 'Respiratory', description: 'COPD, pneumonia, breathlessness and general respiratory review.' },
  { key: 'abdominal_pain', label: 'Abdominal Pain', category: 'Gastrointestinal', description: 'Abdominal pain localisation, colic and epigastric complaints.' },
  { key: 'acid_reflux', label: 'Acid Reflux', category: 'Gastrointestinal', description: 'GERD, heartburn and acid suppression therapy.' },
  { key: 'kidney', label: 'Kidney / UTI', category: 'Kidney / Urinary', description: 'Renal profile, eGFR, urinary tract infection and dialysis notes.' },
  { key: 'vaccination', label: 'Vaccination', category: 'Vaccination', description: 'Immunisation schedules, vaccine records and consent notes.' },
  { key: 'anesthesia', label: 'Pre-Anesthesia', category: 'Anesthesia', description: 'Pre-anaesthetic checkup, surgical clearance and fitness notes.' },
  { key: 'general_pain', label: 'General Pain', category: 'General Medicine', description: 'Generic pain scoring and analgesic prescriptions.' },
  { key: 'headache', label: 'Headache', category: 'Neurology', description: 'Headache pattern, migraine grading and prophylaxis.' },
  { key: 'vomiting', label: 'Vomiting', category: 'Gastrointestinal', description: 'Emesis episodes, hydration status and antiemetic orders.' },
  { key: 'nausea', label: 'Nausea', category: 'Gastrointestinal', description: 'Nausea assessment and antiemetic management.' },
  { key: 'allergy', label: 'Allergy', category: 'General Medicine', description: 'Allergy profile, urticaria and antihistamine therapy.' },
  { key: 'infection', label: 'Infection', category: 'General Medicine', description: 'Infection workup, cultures and antibiotic courses.' },
  { key: 'flu', label: 'Flu', category: 'Respiratory', description: 'Influenza and viral fever assessment.' },
  { key: 'gastritis', label: 'Gastritis', category: 'Gastrointestinal', description: 'Gastritis, dyspepsia and peptic ulcer management.' },
  { key: 'arthritis', label: 'Arthritis', category: 'Musculoskeletal', description: 'Osteoarthritis, rheumatoid arthritis and joint pain review.' },
  { key: 'musculoskeletal_pain', label: 'Musculoskeletal Pain', category: 'Musculoskeletal', description: 'Muscle strain, sprain and myalgia assessment.' },
  { key: 'skin', label: 'Skin Conditions', category: 'Dermatology', description: 'Rash, eczema, psoriasis and topical treatment plans.' },
  { key: 'ent', label: 'ENT Conditions', category: 'ENT', description: 'Ear, nose and throat complaints including sinusitis and tonsillitis.' },
  { key: 'eye', label: 'Eye Conditions', category: 'Ophthalmology', description: 'Vision complaints, conjunctivitis and diabetic retinopathy screening.' },
  { key: 'womens_health', label: "Women's Health", category: "Women's Health", description: 'Gynaecology, antenatal review and menstrual history.' },
  { key: 'mens_health', label: "Men's Health", category: "Men's Health", description: "Prostate screening and men's general health review." },
  { key: 'pediatric', label: 'Pediatric Common Conditions', category: 'Pediatrics', description: 'Paediatric growth, common childhood illness and immunisation.' },
  // Clinic-specific addition: EECP is this practice's flagship therapy.
  { key: 'eecp', label: 'EECP Therapy', category: 'EECP', description: 'Enhanced external counterpulsation sessions, routines and event reporting.' }
];

/**
 * Put an API-supplied type list into the reference dropdown order.
 *
 * "All" is stripped (the dropdown renders it itself) and any type the frontend
 * does not know about is appended rather than dropped, so a backend-only type
 * stays selectable.
 */
export function orderTemplateTypes(flatList: string[]): string[] {
  const known = new Set(TEMPLATE_TYPE_DROPDOWN);
  const supplied = new Set(flatList);

  const ordered = TEMPLATE_TYPE_DROPDOWN.filter((t) => supplied.has(t));
  const extras = flatList.filter((t) => t !== 'All' && !known.has(t));

  return [...ordered, ...extras];
}
