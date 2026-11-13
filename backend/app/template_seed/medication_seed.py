"""
Seed data for Common Medications Reference Catalog.
Clinic: HEAL YOUR HEART, Neelankarai, Chennai, Tamil Nadu

IMPORTANT CLINICAL SAFETY NOTICE:
This reference catalog is strictly a clinical reference guide for demo and prototype use.
It does NOT automatically prescribe medications, calculate dosages, or replace physician judgement.
All entries can be edited, added, or removed by clinical staff.
"""

from ..database import get_db

COMMON_MEDICATIONS_DATA = [
    # --- FEVER & ACUTE INFECTIONS ---
    {
        "condition_key": "fever",
        "condition_name": "Fever / Pyrexia",
        "category": "General Medicine",
        "medication_name": "Paracetamol 650mg",
        "generic_name": "Paracetamol (Acetaminophen)",
        "form": "Tablet",
        "strength": "650 mg",
        "route": "Oral",
        "frequency": "TDS (Thrice daily) PRN",
        "duration": "3-5 days",
        "instructions": "Take after meals. Maintain minimum 4-6 hours between doses. Max 3g/day in adults.",
        "notes": "First-line antipyretic. Caution in severe hepatic impairment or chronic alcoholism."
    },
    {
        "condition_key": "fever",
        "condition_name": "Fever / High Spike",
        "category": "General Medicine",
        "medication_name": "Mefenamic Acid + Paracetamol",
        "generic_name": "Mefenamic Acid 500mg + Paracetamol 450mg",
        "form": "Tablet",
        "strength": "500 mg + 450 mg",
        "route": "Oral",
        "frequency": "BD (Twice daily) PRN",
        "duration": "2-3 days",
        "instructions": "Strictly post-meal with a full glass of water. Avoid on empty stomach.",
        "notes": "Used for refractory high fever with severe arthralgia/headache. Monitor renal and gastric comfort."
    },
    {
        "condition_key": "cough",
        "condition_name": "Acute Productive Cough",
        "category": "Respiratory",
        "medication_name": "Ambroxol + Levosalbutamol + Guaiphenesin Syrup",
        "generic_name": "Ambroxol 30mg + Levosalbutamol 1mg + Guaiphenesin 50mg / 5ml",
        "form": "Syrup",
        "strength": "Standard 100ml syrup",
        "route": "Oral",
        "frequency": "5-10 ml TDS",
        "duration": "5 days",
        "instructions": "Shake well before use. Take warm water gargles / steam inhalation alongside.",
        "notes": "Mucolytic, bronchodilator, and expectorant combination. Caution in known cardiac arrhythmia."
    },
    {
        "condition_key": "cough",
        "condition_name": "Dry Cough / Allergic Cough",
        "category": "Respiratory",
        "medication_name": "Dextromethorphan + Chlorpheniramine Syrup",
        "generic_name": "Dextromethorphan HBr 10mg + Chlorpheniramine Maleate 2mg / 5ml",
        "form": "Syrup",
        "strength": "100 ml syrup",
        "route": "Oral",
        "frequency": "10 ml TDS / at bedtime",
        "duration": "5 days",
        "instructions": "May cause mild drowsiness; avoid driving or operating heavy machinery.",
        "notes": "Antitussive for non-productive dry irritating cough."
    },
    {
        "condition_key": "diarrhea",
        "condition_name": "Acute Gastroenteritis / Diarrhea",
        "category": "Gastrointestinal",
        "medication_name": "Oral Rehydration Salts (WHO-ORS)",
        "generic_name": "Sodium Chloride + Potassium Chloride + Sodium Citrate + Dextrose",
        "form": "Powder Sachet",
        "strength": "21.8g sachet (for 1L drinking water)",
        "route": "Oral",
        "frequency": "Frequent sips after each loose stool",
        "duration": "Until diarrhea resolves",
        "instructions": "Dissolve entire packet in exactly 1 Liter boiled and cooled water. Discard unused portion after 24 hrs.",
        "notes": "Cornerstone of rehydration therapy. Prevent dehydration."
    },
    {
        "condition_key": "diarrhea",
        "condition_name": "Acute Diarrhea / Probiotic",
        "category": "Gastrointestinal",
        "medication_name": "Saccharomyces boulardii 250mg",
        "generic_name": "Saccharomyces boulardii",
        "form": "Capsule / Sachet",
        "strength": "250 mg (5 billion CFU)",
        "route": "Oral",
        "frequency": "BD (Twice daily)",
        "duration": "5 days",
        "instructions": "Consume with room temperature water or yogurt. Avoid very hot liquids.",
        "notes": "Probiotic supporting restoration of healthy gut flora."
    },
    {
        "condition_key": "gerd",
        "condition_name": "Gastritis / GERD / Dyspepsia",
        "category": "Gastrointestinal",
        "medication_name": "Pantoprazole 40mg",
        "generic_name": "Pantoprazole Sodium Gastro-resistant",
        "form": "Tablet",
        "strength": "40 mg",
        "route": "Oral",
        "frequency": "OD (Once daily)",
        "duration": "14 days",
        "instructions": "Swallow whole 30-45 minutes before morning breakfast with plain water. Do not crush.",
        "notes": "Proton pump inhibitor (PPI). Re-evaluate if symptoms persist past 2 weeks."
    },

    # --- CARDIAC & CARDIOPROTECTIVE (HEAL YOUR HEART SPECIALTY) ---
    {
        "condition_key": "chest_pain",
        "condition_name": "Angina Pectoris / CAD (Relief)",
        "category": "Cardiology",
        "medication_name": "Sorbitrate (Isosorbide Dinitrate 5mg)",
        "generic_name": "Isosorbide Dinitrate",
        "form": "Sublingual Tablet",
        "strength": "5 mg",
        "route": "Sublingual",
        "frequency": "PRN during angina attack",
        "duration": "As needed (Emergency)",
        "instructions": "Place 1 tablet under tongue at onset of chest tightness while sitting. Repeat in 5 mins if unrelieved (max 3 tabs). If pain persists > 10 min, call emergency.",
        "notes": "Potent vasodilator. Warn patient of postural hypotension and throbbing headache. Do not combine with PDE-5 inhibitors."
    },
    {
        "condition_key": "chest_pain",
        "condition_name": "Chronic Stable Angina / Antiplatelet",
        "category": "Cardiology",
        "medication_name": "Ecosprin 75mg",
        "generic_name": "Enteric Coated Aspirin",
        "form": "Tablet",
        "strength": "75 mg",
        "route": "Oral",
        "frequency": "OD (Once daily)",
        "duration": "Long term / As advised",
        "instructions": "Take after the heaviest meal of the day (lunch/dinner) with water.",
        "notes": "Secondary prevention of atherosclerotic cardiovascular events. Monitor for bleeding signs."
    },
    {
        "condition_key": "chest_pain",
        "condition_name": "Stable Angina / Statin",
        "category": "Cardiology",
        "medication_name": "Atorvastatin 20mg / 40mg",
        "generic_name": "Atorvastatin Calcium",
        "form": "Tablet",
        "strength": "20 mg / 40 mg",
        "route": "Oral",
        "frequency": "OD (Once daily at bedtime)",
        "duration": "Long term",
        "instructions": "Take at night. Periodic lipid profile and liver function tests (LFT) recommended.",
        "notes": "HMG-CoA reductase inhibitor for plaque stabilization and LDL reduction."
    },
    {
        "condition_key": "hypertension",
        "condition_name": "Essential Hypertension",
        "category": "Cardiology",
        "medication_name": "Telmisartan 40mg",
        "generic_name": "Telmisartan",
        "form": "Tablet",
        "strength": "40 mg",
        "route": "Oral",
        "frequency": "OD (Once daily)",
        "duration": "Long term",
        "instructions": "Take morning or evening around same time. Low-salt diet (under 5g salt/day) advised.",
        "notes": "Angiotensin II Receptor Blocker (ARB). Well-tolerated. Check serum creatinine and potassium periodically."
    },
    {
        "condition_key": "hypertension",
        "condition_name": "Hypertension with Angina / Tachycardia",
        "category": "Cardiology",
        "medication_name": "Metoprolol Succinate ER 25mg / 50mg",
        "generic_name": "Metoprolol Succinate Extended Release",
        "form": "ER Tablet",
        "strength": "25 mg / 50 mg",
        "route": "Oral",
        "frequency": "OD (Once daily)",
        "duration": "Long term",
        "instructions": "Take with or immediately after food. Do not abruptly stop without physician advice.",
        "notes": "Cardioselective beta-1 blocker. Lowers heart rate, BP, and myocardial oxygen demand."
    },
    {
        "condition_key": "heart_failure",
        "condition_name": "Heart Failure with Reduced EF (HFrEF)",
        "category": "Cardiology",
        "medication_name": "Empagliflozin 10mg",
        "generic_name": "Empagliflozin",
        "form": "Tablet",
        "strength": "10 mg",
        "route": "Oral",
        "frequency": "OD morning",
        "duration": "Long term",
        "instructions": "Take in morning with adequate hydration and maintain genital perineal hygiene.",
        "notes": "SGLT2 inhibitor shown to reduce HF hospitalizations and cardiovascular mortality."
    },
    {
        "condition_key": "heart_failure",
        "condition_name": "Fluid Overload / Decompensated HF",
        "category": "Cardiology",
        "medication_name": "Torsemide 10mg / 20mg",
        "generic_name": "Torsemide",
        "form": "Tablet",
        "strength": "10 mg / 20 mg",
        "route": "Oral",
        "frequency": "OD in the morning",
        "duration": "As clinically indicated",
        "instructions": "Take early in morning to prevent nighttime polyuria. Daily morning weight monitoring recommended.",
        "notes": "Loop diuretic with superior oral bioavailability compared to furosemide. Monitor serum electrolytes."
    },

    # --- DIABETES & METABOLIC ---
    {
        "condition_key": "diabetes",
        "condition_name": "Type 2 Diabetes Mellitus",
        "category": "Diabetes",
        "medication_name": "Metformin SR 500mg / 1000mg",
        "generic_name": "Metformin Hydrochloride Sustained Release",
        "form": "SR Tablet",
        "strength": "500 mg / 1000 mg",
        "route": "Oral",
        "frequency": "OD or BD with meals",
        "duration": "Long term",
        "instructions": "Take strictly along with or immediately after meals to reduce gastrointestinal irritation.",
        "notes": "First-line oral antihyperglycemic. Check eGFR; contraindicated if eGFR < 30 mL/min."
    },
    {
        "condition_key": "diabetes",
        "condition_name": "T2DM (Cardioprotective SGLT2i)",
        "category": "Diabetes",
        "medication_name": "Dapagliflozin 10mg",
        "generic_name": "Dapagliflozin",
        "form": "Tablet",
        "strength": "10 mg",
        "route": "Oral",
        "frequency": "OD morning",
        "duration": "Long term",
        "instructions": "Take in the morning with water. Stay hydrated throughout the day.",
        "notes": "Cardio-renal benefit in diabetic and heart failure patients."
    },

    # --- RESPIRATORY & ASTHMA ---
    {
        "condition_key": "asthma",
        "condition_name": "Bronchial Asthma / COPD",
        "category": "Respiratory",
        "medication_name": "Budesonide + Formoterol Inhaler (100 / 200 / 400)",
        "generic_name": "Budesonide 200mcg + Formoterol Fumarate 6mcg",
        "form": "DPI / MDI Inhaler",
        "strength": "200 mcg / 6 mcg per puff",
        "route": "Inhalation",
        "frequency": "1-2 puffs BD",
        "duration": "Maintenance",
        "instructions": "Rinse mouth thoroughly with water and spit out after inhalation to prevent oral candidiasis.",
        "notes": "Inhaled corticosteroid + long-acting beta2-agonist combination maintenance therapy."
    },
    {
        "condition_key": "asthma",
        "condition_name": "Acute Bronchospasm Relief",
        "category": "Respiratory",
        "medication_name": "Salbutamol (Asthalin) Inhaler",
        "generic_name": "Salbutamol (Albuterol) Sulfate",
        "form": "MDI Inhaler",
        "strength": "100 mcg per puff",
        "route": "Inhalation",
        "frequency": "1-2 puffs SOS / PRN",
        "duration": "As needed",
        "instructions": "Use with spacer if available. Inhale slowly and hold breath for 10 seconds.",
        "notes": "Short-acting beta-2 agonist (SABA) rescue bronchodilator for acute wheeze or chest tightness."
    },

    # --- ENDOCRINE & THYROID ---
    {
        "condition_key": "thyroid",
        "condition_name": "Primary Hypothyroidism",
        "category": "Endocrine",
        "medication_name": "Levothyroxine Sodium (25/50/75/100 mcg)",
        "generic_name": "Levothyroxine Sodium",
        "form": "Tablet",
        "strength": "50 mcg / 100 mcg",
        "route": "Oral",
        "frequency": "OD empty stomach",
        "duration": "Long term",
        "instructions": "Take strictly first thing in morning with plain water, at least 45-60 min before tea/coffee/breakfast.",
        "notes": "Synthetic T4 hormone. Monitor serum TSH every 6-8 weeks after dose titrations."
    },

    # --- NEUROLOGY / HEADACHE ---
    {
        "condition_key": "headache",
        "condition_name": "Acute Migraine Attack",
        "category": "Neurology",
        "medication_name": "Naproxen 500mg + Domperidone 10mg",
        "generic_name": "Naproxen Sodium 500mg + Domperidone 10mg",
        "form": "Tablet",
        "strength": "500 mg + 10 mg",
        "route": "Oral",
        "frequency": "1 tablet at headache onset SOS",
        "duration": "SOS (Max 2 tabs/day)",
        "instructions": "Take at onset of migraine headache or aura with a glass of water and food.",
        "notes": "Combination analgesic and antiemetic. Rest in a dark, quiet room."
    },

    # --- KIDNEY & UTI ---
    {
        "condition_key": "uti",
        "condition_name": "Acute Uncomplicated UTI",
        "category": "Kidney & Urinary",
        "medication_name": "Nitrofurantoin Sustained Release 100mg",
        "generic_name": "Nitrofurantoin SR",
        "form": "Capsule / Tablet",
        "strength": "100 mg",
        "route": "Oral",
        "frequency": "BD (Twice daily)",
        "duration": "5-7 days",
        "instructions": "Take with meals or milk to improve absorption and reduce nausea. Complete the full course.",
        "notes": "First-line empirical therapy for uncomplicated lower urinary tract infection. Avoid in CrCl < 30 mL/min."
    },

    # --- EECP THERAPY SUPPORTIVE CARE ---
    {
        "condition_key": "eecp",
        "condition_name": "Enhanced External Counterpulsation (EECP) Supportive Care",
        "category": "Cardiology",
        "medication_name": "Coenzyme Q10 + L-Carnitine + Lycopene",
        "generic_name": "CoQ10 100mg + L-Carnitine L-Tartrate 500mg + Lycopene",
        "form": "Softgel Capsule",
        "strength": "100 mg + 500 mg",
        "route": "Oral",
        "frequency": "OD after breakfast",
        "duration": "During EECP 35-hour protocol",
        "instructions": "Take post breakfast with water. Maintain daily session continuity at Heal Your Heart clinic.",
        "notes": "Nutraceutical supportive regimen aiding myocardial energetics during EECP treatment course."
    },

    # --- PRE-ANESTHESIA PREMEDICATION ---
    {
        "condition_key": "pre_anesthesia",
        "condition_name": "Pre-Procedure Aspiration Prophylaxis",
        "category": "Anesthesia",
        "medication_name": "Pantoprazole 40mg IV + Ondansetron 4mg IV",
        "generic_name": "Pantoprazole IV + Ondansetron IV",
        "form": "Injectable Solution",
        "strength": "40 mg IV / 4 mg IV",
        "route": "Intravenous (IV)",
        "frequency": "Single dose 1 hour pre-procedure",
        "duration": "Single procedural dose",
        "instructions": "Slow IV push over 2-3 minutes. Ensure NPO status compliance (6 hrs solids, 2 hrs clear liquids).",
        "notes": "Administer under direct clinical/anesthetic supervision only."
    }
]


def seed_medication_references():
    """Seeds the medication_references catalog if empty."""
    db = get_db()
    count = db.execute("SELECT COUNT(*) FROM medication_references").fetchone()[0]
    if count > 0:
        print(f"Medication references already present ({count} records). Updating or ensuring all standard entries exist...")

    inserted = 0
    for med in COMMON_MEDICATIONS_DATA:
        existing = db.execute(
            "SELECT id FROM medication_references WHERE condition_key = ? AND medication_name = ?",
            (med["condition_key"], med["medication_name"])
        ).fetchone()

        if not existing:
            db.execute("""
                INSERT INTO medication_references (
                    condition_key, condition_name, category, medication_name, generic_name,
                    form, strength, route, frequency, duration, instructions, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                med["condition_key"],
                med["condition_name"],
                med["category"],
                med["medication_name"],
                med["generic_name"],
                med["form"],
                med["strength"],
                med["route"],
                med["frequency"],
                med["duration"],
                med["instructions"],
                med["notes"]
            ))
            inserted += 1

    db.commit()
    print(f"Successfully ensured {inserted} new/updated medication references in catalog.")
