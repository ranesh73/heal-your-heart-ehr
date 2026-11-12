"""
Central clinical template-type definition for Heal Your Heart Neelankarai.

This module is the SINGLE SOURCE OF TRUTH for template types, medical
categories, and the medical-condition shortcut chips. It is consumed by:

  * the REST API (`GET /api/template-types`, `/api/template-categories`,
    `/api/medical-conditions`)
  * backend validation on create / update (never trust frontend values)
  * the seed + top-up scripts
  * the React frontend, which fetches the lists at runtime and keeps a
    mirrored copy in `frontend/src/constants/templateTypes.ts` as an
    offline fallback.

Keep this file and the frontend mirror in sync when adding a type.
"""

# ---------------------------------------------------------------------------
# Canonical template types - order is significant and must be preserved.
# "All" is injected at the top of the dropdown by `dropdown_template_types()`.
# ---------------------------------------------------------------------------
TEMPLATE_TYPES = [
    "Billing Inventory",
    "Chief Complaints",
    "Diagnosis",
    "Diet Recommendations",
    "Email",
    "Family History",
    "Follow up",
    "History of Present Illness",
    "Imaging",
    "Injection",
    "Instructions",
    "Lab Record",
    "Lifestyle Recommendations",
    "Nurse Notes",
    "Past Medical History",
    "Physical Examination",
    "Prescription",
    "Reports",
    "Review of Systems",
    "SOAP",
    "Self Notes",
    "Social History",
    "Supplement",
    "Symptoms",
    "Send Invoice - PHR Message",
    "Send Invoice - Email",
    "Send Receipt - PHR Message",
    "Send Receipt - Email",
    "Send Statement - PHR Message",
    "Send Statement - Email",
    "Treatment Notes",
    "Vaccine",
]

# Types that predate the canonical list above. Existing rows still use them,
# so they stay valid for storage and filtering and are appended to the
# dropdown under a "Legacy" group instead of being destroyed.
LEGACY_TEMPLATE_TYPES = [
    "Assessment Notes",
    "Billing Procedure Codes",
]

# Old spelling -> canonical spelling. Applied by the DB migration and by
# `normalize_template_type()` so the API accepts both.
TEMPLATE_TYPE_ALIASES = {
    "follow up": "Follow up",
    "followup": "Follow up",
    "soap template": "SOAP",
    "diet recommendation": "Diet Recommendations",
    "lifestyle recommendation": "Lifestyle Recommendations",
}

ALL_ALLOWED_TYPES = TEMPLATE_TYPES + LEGACY_TEMPLATE_TYPES

# The order the Template Type dropdown renders in, copied from the reference
# CharmHealth dropdown. It is a presentation concern only - storage validation
# still goes through ALL_ALLOWED_TYPES - so the two lists are reconciled at
# runtime by `dropdown_template_types()` and can never silently drift.
TEMPLATE_TYPE_DROPDOWN = [
    "Assessment Notes",
    "Billing Procedure Codes",
    "Billing Inventory",
    "Chief Complaints",
    "Diagnosis",
    "Diet Recommendations",
    "Email",
    "Family History",
    "Follow up",
    "History of Present Illness",
    "Imaging",
    "Injection",
    "Instructions",
    "Lab Record",
    "Lifestyle Recommendations",
    "Nurse Notes",
    "Past Medical History",
    "Physical Examination",
    "Prescription",
    "Reports",
    "Review of Systems",
    "SOAP",
    "Self Notes",
    "Social History",
    "Supplement",
    "Symptoms",
    "Send Invoice - PHR Message",
    "Send Invoice - Email",
    "Send Receipt - PHR Message",
    "Send Receipt - Email",
    "Send Statement - PHR Message",
    "Send Statement - Email",
    "Treatment Notes",
    "Vaccine",
]

# Case-insensitive lookup table built once at import time.
_TYPE_LOOKUP = {t.lower(): t for t in ALL_ALLOWED_TYPES}
_TYPE_LOOKUP.update(TEMPLATE_TYPE_ALIASES)


def normalize_template_type(value, default=None):
    """Return the canonical spelling of `value`, or `default` if unknown.

    Matching is case-insensitive and whitespace-tolerant so the API tolerates
    client variations without ever writing an unvalidated string to the DB.
    """
    if value is None:
        return default
    key = str(value).strip().lower()
    if not key:
        return default
    return _TYPE_LOOKUP.get(key, default)


def is_valid_template_type(value):
    return normalize_template_type(value) is not None


def dropdown_template_types(include_legacy=True):
    """Flat, ordered list for the Template Type dropdown - 'All' first.

    The order comes from TEMPLATE_TYPE_DROPDOWN. Any allowed type missing from
    that list is appended rather than dropped, so adding a type to
    TEMPLATE_TYPES alone can never make it unreachable in the UI.
    """
    def allowed(name):
        return include_legacy or name not in LEGACY_TEMPLATE_TYPES

    ordered = [t for t in TEMPLATE_TYPE_DROPDOWN if allowed(t)]
    seen = set(ordered)
    ordered += [t for t in ALL_ALLOWED_TYPES if allowed(t) and t not in seen]
    return ["All"] + ordered


# ---------------------------------------------------------------------------
# Medical categories (stored on templates.category, mirrored to .specialty)
# ---------------------------------------------------------------------------
MEDICAL_CATEGORIES = [
    "Cardiac",
    "EECP",
    "Respiratory",
    "General Medicine",
    "Diabetes",
    "Hypertension",
    "Thyroid",
    "Anesthesia",
    "Kidney / Urinary",
    "Gastrointestinal",
    "Neurology",
    "Musculoskeletal",
    "Vaccination",
    "Lab",
    "Imaging",
    "Preventive",
    "Nutrition",
    "Pharmacy",
    "Nursing",
    "Billing",
    "Administrative",
    "Communication",
]

_CATEGORY_LOOKUP = {c.lower(): c for c in MEDICAL_CATEGORIES}


def normalize_category(value, default="General Medicine"):
    """Free-text categories are allowed, but known ones get canonical casing."""
    if value is None:
        return default
    cleaned = str(value).strip()
    if not cleaned:
        return default
    return _CATEGORY_LOOKUP.get(cleaned.lower(), cleaned[:80])


def dropdown_categories():
    return ["All"] + list(MEDICAL_CATEGORIES)


# ---------------------------------------------------------------------------
# Common Medication / Condition catalogue.
#
# These entries back the "Common Medication" tab only. They are deliberately
# NOT surfaced on My Templates: the clinic asked that the condition list live
# in exactly one place so the template tabs stay a clean template listing.
#
# `keywords` drives server-side filtering, so selecting a condition finds every
# template that mentions it in its name, description, tags, or category.
# `category` is the clinical grouping shown beside the condition in the list.
# ---------------------------------------------------------------------------
MEDICAL_CONDITIONS = [
    {"key": "diarrhea", "label": "Diarrhea", "category": "Gastrointestinal",
     "description": "Acute and chronic loose stools, gastroenteritis and rehydration plans.",
     "keywords": ["diarrhea", "diarrhoea", "gastroenteritis", "loose stool", "dysentery"]},
    {"key": "back_pain", "label": "Back Pain", "category": "Musculoskeletal",
     "description": "Lower back, lumbar and sciatic pain assessment and management.",
     "keywords": ["back pain", "lumbar", "lumbago", "sciatica", "spine", "spinal"]},
    {"key": "cardiac", "label": "Cardiac", "category": "Cardiac",
     "description": "General cardiology workup, coronary assessment and cardiac routines.",
     "keywords": ["cardiac", "cardio", "coronary", "heart", "ecg", "echo", "tmt", "angio"]},
    {"key": "cough", "label": "Cough", "category": "Respiratory",
     "description": "Productive and dry cough, bronchitis and expectorant therapy.",
     "keywords": ["cough", "expectoration", "sputum", "bronchitis"]},
    {"key": "cold", "label": "Cold", "category": "ENT",
     "description": "Common cold, coryza and nasal congestion management.",
     "keywords": ["cold", "coryza", "rhinitis", "nasal congestion", "runny nose"]},
    {"key": "fever", "label": "Fever", "category": "General Medicine",
     "description": "Acute febrile illness, pyrexia workup and antipyretic orders.",
     "keywords": ["fever", "pyrexia", "febrile"]},
    {"key": "anaesthesia", "label": "Anaesthesia", "category": "Anesthesia",
     "description": "Anaesthetic agents, sedation records and intra-operative notes.",
     "keywords": ["anesthesia", "anaesthesia", "anesthetic", "anaesthetic", "sedation"]},
    {"key": "chest_pain", "label": "Chest Pain", "category": "Cardiac",
     "description": "Chest pain triage, angina grading and ischaemic pathways.",
     "keywords": ["chest pain", "angina", "ccs", "ischemic", "ischaemic"]},
    {"key": "heart_failure", "label": "Heart Failure", "category": "Cardiac",
     "description": "NYHA staging, ejection fraction review and cardiomyopathy follow-up.",
     "keywords": ["heart failure", "cardiomyopathy", "nyha", "ejection fraction"]},
    {"key": "hypertension", "label": "Hypertension", "category": "Hypertension",
     "description": "Blood pressure monitoring and antihypertensive regimens.",
     "keywords": ["hypertension", "blood pressure", "antihypertensive", "bp patient"]},
    {"key": "diabetes", "label": "Diabetes", "category": "Diabetes",
     "description": "Glycaemic control, HbA1c review and insulin titration.",
     "keywords": ["diabetes", "diabetic", "glycemic", "glycaemic", "hba1c", "insulin"]},
    {"key": "asthma", "label": "Asthma", "category": "Respiratory",
     "description": "Asthma control assessment, inhaler technique and bronchodilators.",
     "keywords": ["asthma", "wheez", "inhaler", "bronchodilator", "nebul"]},
    {"key": "respiratory", "label": "Respiratory Conditions", "category": "Respiratory",
     "description": "COPD, pneumonia, breathlessness and general respiratory review.",
     "keywords": ["respiratory", "copd", "dyspnea", "dyspnoea", "pneumonia", "bronch", "lung"]},
    {"key": "abdominal_pain", "label": "Abdominal Pain", "category": "Gastrointestinal",
     "description": "Abdominal pain localisation, colic and epigastric complaints.",
     "keywords": ["abdominal pain", "abdomen", "colic", "epigastric", "stomach pain"]},
    {"key": "acid_reflux", "label": "Acid Reflux", "category": "Gastrointestinal",
     "description": "GERD, heartburn and acid suppression therapy.",
     "keywords": ["acid reflux", "gerd", "heartburn", "reflux", "acidity"]},
    {"key": "kidney", "label": "Kidney / UTI", "category": "Kidney / Urinary",
     "description": "Renal profile, eGFR, urinary tract infection and dialysis notes.",
     "keywords": ["kidney", "renal", "uti", "urinary", "nephro", "dialysis", "egfr"]},
    {"key": "vaccination", "label": "Vaccination", "category": "Vaccination",
     "description": "Immunisation schedules, vaccine records and consent notes.",
     "keywords": ["vaccine", "vaccination", "immunisation", "immunization"]},
    {"key": "anesthesia", "label": "Pre-Anesthesia", "category": "Anesthesia",
     "description": "Pre-anaesthetic checkup, surgical clearance and fitness notes.",
     "keywords": ["pre-anesthesia", "pre-anaesthesia", "preoperative", "pre-operative",
                  "surgical clearance"]},
    {"key": "general_pain", "label": "General Pain", "category": "General Medicine",
     "description": "Generic pain scoring and analgesic prescriptions.",
     "keywords": ["pain score", "analgesic", "analgesia", "painkiller"]},
    {"key": "headache", "label": "Headache", "category": "Neurology",
     "description": "Headache pattern, migraine grading and prophylaxis.",
     "keywords": ["headache", "migraine", "cephalalgia"]},
    {"key": "vomiting", "label": "Vomiting", "category": "Gastrointestinal",
     "description": "Emesis episodes, hydration status and antiemetic orders.",
     "keywords": ["vomiting", "vomit", "emesis"]},
    {"key": "nausea", "label": "Nausea", "category": "Gastrointestinal",
     "description": "Nausea assessment and antiemetic management.",
     "keywords": ["nausea", "nauseous", "antiemetic"]},
    {"key": "allergy", "label": "Allergy", "category": "General Medicine",
     "description": "Allergy profile, urticaria and antihistamine therapy.",
     "keywords": ["allergy", "allergic", "antihistamine", "urticaria"]},
    {"key": "infection", "label": "Infection", "category": "General Medicine",
     "description": "Infection workup, cultures and antibiotic courses.",
     "keywords": ["infection", "antibiotic", "sepsis", "culture", "c/s"]},
    {"key": "flu", "label": "Flu", "category": "Respiratory",
     "description": "Influenza and viral fever assessment.",
     "keywords": ["flu", "influenza", "viral fever"]},
    {"key": "gastritis", "label": "Gastritis", "category": "Gastrointestinal",
     "description": "Gastritis, dyspepsia and peptic ulcer management.",
     "keywords": ["gastritis", "dyspepsia", "ulcer", "ppi"]},
    {"key": "arthritis", "label": "Arthritis", "category": "Musculoskeletal",
     "description": "Osteoarthritis, rheumatoid arthritis and joint pain review.",
     "keywords": ["arthritis", "joint pain", "osteoarthritis", "rheumatoid"]},
    {"key": "musculoskeletal_pain", "label": "Musculoskeletal Pain", "category": "Musculoskeletal",
     "description": "Muscle strain, sprain and myalgia assessment.",
     "keywords": ["musculoskeletal", "muscle", "sprain", "strain", "myalgia"]},
    {"key": "skin", "label": "Skin Conditions", "category": "Dermatology",
     "description": "Rash, eczema, psoriasis and topical treatment plans.",
     "keywords": ["skin", "dermat", "rash", "eczema", "psoriasis", "oint"]},
    {"key": "ent", "label": "ENT Conditions", "category": "ENT",
     "description": "Ear, nose and throat complaints including sinusitis and tonsillitis.",
     "keywords": ["ent", "sinusitis", "tonsil", "pharyngitis", "ear pain", "throat"]},
    {"key": "eye", "label": "Eye Conditions", "category": "Ophthalmology",
     "description": "Vision complaints, conjunctivitis and diabetic retinopathy screening.",
     "keywords": ["eye", "ocular", "vision", "conjunctivitis", "retinopathy"]},
    {"key": "womens_health", "label": "Women's Health", "category": "Women's Health",
     "description": "Gynaecology, antenatal review and menstrual history.",
     "keywords": ["women", "gyneco", "gynaeco", "obstetric", "menstrual", "pregnan", "antenatal"]},
    {"key": "mens_health", "label": "Men's Health", "category": "Men's Health",
     "description": "Prostate screening and men's general health review.",
     "keywords": ["men's health", "prostate", "psa", "erectile", "andro"]},
    {"key": "pediatric", "label": "Pediatric Common Conditions", "category": "Pediatrics",
     "description": "Paediatric growth, common childhood illness and immunisation.",
     "keywords": ["pediatric", "paediatric", "child", "infant", "newborn"]},
    # Clinic-specific addition: EECP is this practice's flagship therapy, so it
    # belongs in the condition catalogue alongside the generic entries.
    {"key": "eecp", "label": "EECP Therapy", "category": "EECP",
     "description": "Enhanced external counterpulsation sessions, routines and event reporting.",
     "keywords": ["eecp", "enhanced external counterpulsation", "counterpulsation"]},
]

_CONDITION_BY_KEY = {c["key"]: c for c in MEDICAL_CONDITIONS}
_CONDITION_BY_LABEL = {c["label"].lower(): c for c in MEDICAL_CONDITIONS}


def condition_keywords(value):
    """Resolve a chip key OR its display label to its keyword list.

    Returns an empty list for unknown values so an unrecognised chip degrades
    to "no condition filter" rather than erroring.
    """
    if not value:
        return []
    key = str(value).strip().lower()
    cond = _CONDITION_BY_KEY.get(key) or _CONDITION_BY_LABEL.get(key)
    return list(cond["keywords"]) if cond else []
