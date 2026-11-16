"""
Idempotent demo-template top-up for the My Templates workspace.

`seed_missing_demo_templates()` inserts a template only when no row with that
exact name exists, so it is safe to call on every application start:

  * a fresh database gets the full demo catalogue
  * an existing database gains only the templates it is missing
  * user-created templates are never modified or deleted

The catalogue deliberately covers every entry in `template_types.TEMPLATE_TYPES`
so the Template Type dropdown never filters down to an empty table.
"""

from ..database import get_db_connection, DEFAULT_OWNER_EMAIL
from ..template_types import TEMPLATE_TYPES

SEED_AUTHOR = "Dr. K. Rajagopal, MD"
DEFAULT_ROLES = ["Physician", "Physician Assistant"]


def _t(name, type_, category, description, tags, content, roles=None):
    return {
        "name": name,
        "template_type": type_,
        "category": category,
        "description": description,
        "tags": tags,
        "content": content,
        "roles": roles or DEFAULT_ROLES,
    }


# ---------------------------------------------------------------------------
# Demo catalogue - at least one template per canonical template type
# ---------------------------------------------------------------------------
DEMO_TEMPLATES = [
    # ---------------- Symptoms ----------------
    _t("Headache & Migraine Screen", "Symptoms", "Neurology",
       "Structured headache characterisation with red-flag screening.",
       "headache, migraine, neurology, aura",
       "Onset:\nSite / Radiation:\nCharacter (throbbing / band-like / stabbing):\n"
       "Severity (0-10):\nAura present: Yes / No\nPhotophobia / Phonophobia: Yes / No\n"
       "Nausea / Vomiting: Yes / No\nRed flags (thunderclap, fever, focal deficit, papilloedema): \n"
       "Analgesic use per week:\nImpression:"),
    _t("Dizziness & Vertigo Screen", "Symptoms", "Neurology",
       "Differentiates peripheral vertigo from presyncope and disequilibrium.",
       "dizziness, vertigo, bppv, presyncope, balance",
       "Type: Spinning / Light-headed / Unsteady\nDuration per episode:\n"
       "Positional trigger: Yes / No\nHearing loss / Tinnitus: Yes / No\n"
       "Dix-Hallpike: Positive / Negative\nOrthostatic BP (lying / standing):\n"
       "Impression:"),
    _t("Palpitations Symptom Review", "Symptoms", "Cardiac",
       "Palpitation characterisation with arrhythmia risk triage.",
       "palpitations, arrhythmia, cardiac, ectopics",
       "Onset / Offset (sudden or gradual):\nRate (fast / slow / irregular):\n"
       "Duration:\nAssociated syncope / chest pain / dyspnea:\nCaffeine / stimulant intake:\n"
       "Thyroid symptoms: Yes / No\nECG findings:\nImpression:"),

    # ---------------- SOAP ----------------
    _t("Diabetes Follow-up SOAP", "SOAP", "Diabetes",
       "Quarterly diabetes review with glycaemic control and complication screening.",
       "diabetes, hba1c, follow up, glycemic, insulin",
       "S: Glycaemic symptoms, hypoglycaemia episodes, diet and activity adherence.\n"
       "O: Weight / BMI, BP, fasting and post-prandial glucose, HbA1c, foot and fundus check.\n"
       "A: Type 2 Diabetes Mellitus - control status (good / suboptimal / poor).\n"
       "P: Medication titration, dietitian referral, next HbA1c in 3 months."),
    _t("Hypertension Follow-up SOAP", "SOAP", "Hypertension",
       "Blood-pressure control review with target-organ damage assessment.",
       "hypertension, blood pressure, follow up, antihypertensive",
       "S: Headache, giddiness, adherence to antihypertensives, salt intake.\n"
       "O: Seated BP (both arms), pulse, weight, oedema, fundus.\n"
       "A: Essential Hypertension - controlled / uncontrolled (target <140/90).\n"
       "P: Dose adjustment, home BP log, renal profile, review in 4 weeks."),
    _t("Heart Failure Follow-up SOAP", "SOAP", "Cardiac",
       "NYHA-staged heart failure review with volume-status assessment.",
       "heart failure, nyha, cardiomyopathy, ejection fraction, diuretic",
       "S: Exertional dyspnea, orthopnea, PND, ankle swelling, weight gain.\n"
       "O: JVP, basal crepitations, S3 gallop, pedal oedema, daily weight, ECHO LVEF.\n"
       "A: Heart Failure - NYHA Class I / II / III / IV.\n"
       "P: Diuretic titration, fluid and salt restriction, GDMT optimisation."),
    _t("Chest Pain / Angina SOAP", "SOAP", "Cardiac",
       "Angina evaluation with CCS grading and EECP candidacy screening.",
       "chest pain, angina, ccs, ischemic, eecp",
       "S: Site, character, radiation, exertional threshold, S/L nitroglycerin use per week.\n"
       "O: BP, pulse, heart sounds, ECG, TMT / ECHO where available.\n"
       "A: Stable Angina - CCS Class I / II / III / IV.\n"
       "P: Anti-anginal optimisation, risk-factor control, EECP candidacy review."),
    _t("Annual Physical SOAP", "SOAP", "Preventive",
       "Comprehensive annual wellness visit documentation.",
       "annual, physical, preventive, wellness, checkup",
       "S: Interval history, lifestyle, screening status, immunisations.\n"
       "O: Vitals, BMI, systemic examination, baseline labs.\n"
       "A: Overall health status and identified risk factors.\n"
       "P: Age-appropriate screening, vaccination catch-up, lifestyle counselling."),

    # ---------------- Physical Examination ----------------
    _t("Cardiovascular Examination", "Physical Examination", "Cardiac",
       "Complete precordial and peripheral vascular examination.",
       "cardiovascular, examination, precordium, murmur, jvp",
       "General: Pallor / Cyanosis / Clubbing / Oedema\nPulse: rate, rhythm, character, volume\n"
       "BP (both arms):\nJVP:\nApex beat: position and character\n"
       "Heart sounds: S1 S2, added sounds, murmurs (site, timing, radiation)\n"
       "Peripheral pulses:\nImpression:"),
    _t("Respiratory Examination", "Physical Examination", "Respiratory",
       "Systematic inspection, palpation, percussion and auscultation of the chest.",
       "respiratory, examination, chest, auscultation, breath sounds",
       "Respiratory rate / effort:\nSpO2 on room air:\nChest shape and expansion:\n"
       "Trachea:\nPercussion note:\nBreath sounds:\nAdded sounds (crepitations / rhonchi):\n"
       "Vocal resonance:\nImpression:"),
    _t("Back Pain Examination", "Physical Examination", "Musculoskeletal",
       "Lumbar spine examination with neurological and red-flag screening.",
       "back pain, lumbar, spine, musculoskeletal, sciatica",
       "Site and radiation:\nGait and posture:\nLumbar range of motion:\n"
       "Straight leg raise (L / R):\nPower, tone, reflexes, sensation:\n"
       "Red flags (bladder or bowel involvement, saddle anaesthesia, weight loss, fever):\n"
       "Impression:"),

    # ---------------- Diagnosis ----------------
    _t("Diabetes Mellitus Diagnosis", "Diagnosis", "Diabetes",
       "Diagnostic confirmation and classification of diabetes mellitus.",
       "diabetes, diagnosis, hba1c, icd, glycemic",
       "Diagnostic basis: Fasting glucose / OGTT / HbA1c / Random glucose with symptoms\n"
       "Type: Type 1 / Type 2 / Gestational / Secondary\n"
       "HbA1c (%):\nComplications screened: Retinopathy / Nephropathy / Neuropathy\n"
       "ICD-10: E11.9\nFinal diagnosis:"),
    _t("Hypertension Diagnosis", "Diagnosis", "Hypertension",
       "Staging and aetiological classification of hypertension.",
       "hypertension, diagnosis, blood pressure, staging, icd",
       "Clinic BP readings (3 occasions):\nHome / ABPM average:\n"
       "Stage: Elevated / Stage 1 / Stage 2 / Hypertensive urgency\n"
       "Secondary causes screened: Renal / Endocrine / Vascular\n"
       "Target-organ damage: LVH / Retinopathy / Nephropathy\n"
       "ICD-10: I10\nFinal diagnosis:"),
    _t("Heart Failure Diagnosis", "Diagnosis", "Cardiac",
       "Heart failure diagnosis with phenotype and aetiology classification.",
       "heart failure, diagnosis, hfref, hfpef, ejection fraction",
       "Framingham criteria met: Major / Minor\nLVEF (%):\n"
       "Phenotype: HFrEF / HFmrEF / HFpEF\nAetiology: Ischemic / Hypertensive / Valvular / Idiopathic\n"
       "NT-proBNP:\nNYHA Class:\nICD-10: I50.9\nFinal diagnosis:"),

    # ---------------- Prescription ----------------
    _t("General Prescription", "Prescription", "Pharmacy",
       "Standard outpatient prescription with dose, route, frequency and duration.",
       "prescription, rx, medication, outpatient",
       "Rx\n1. Drug / Strength / Route / Frequency / Duration\n2.\n3.\n"
       "Allergies noted: Yes / No\nAdvice:\nReview date:"),
    _t("Hypertension Prescription", "Prescription", "Hypertension",
       "Antihypertensive regimen with titration and monitoring plan.",
       "prescription, hypertension, antihypertensive, amlodipine, telmisartan",
       "Rx\n1. Telmisartan 40 mg - 1 tablet once daily, morning\n"
       "2. Amlodipine 5 mg - 1 tablet once daily, if BP remains >140/90\n"
       "Monitoring: Home BP twice daily log, serum creatinine and potassium in 2 weeks\n"
       "Advice: Salt restriction <5 g/day, 30 minutes brisk walk daily"),
    _t("Diabetes Prescription", "Prescription", "Diabetes",
       "Oral hypoglycaemic and insulin prescription with hypoglycaemia counselling.",
       "prescription, diabetes, metformin, insulin, hypoglycemia",
       "Rx\n1. Metformin 500 mg - 1 tablet twice daily after food\n"
       "2. Insulin (type / units / timing) if indicated\n"
       "Monitoring: Fasting and post-prandial glucose log, HbA1c in 3 months\n"
       "Hypoglycaemia counselling given: Yes / No"),

    # ---------------- Lab Record ----------------
    _t("Complete Blood Count (CBC)", "Lab Record", "Lab",
       "CBC result capture with reference ranges.",
       "cbc, lab, haemoglobin, wbc, platelet",
       "Haemoglobin (g/dL):\nTotal WBC (/cumm):\nDifferential (N/L/E/M/B):\n"
       "Platelet count (/cumm):\nMCV / MCH / MCHC:\nESR:\nImpression:"),
    _t("Lipid Profile", "Lab Record", "Lab",
       "Fasting lipid profile with cardiovascular risk interpretation.",
       "lipid, cholesterol, ldl, hdl, triglycerides, cardiac risk",
       "Total Cholesterol (mg/dL):\nLDL (mg/dL):\nHDL (mg/dL):\n"
       "Triglycerides (mg/dL):\nNon-HDL:\nTC/HDL ratio:\n"
       "Fasting status:\nRisk category and statin indication:"),
    _t("Diabetes Lab Record", "Lab Record", "Diabetes",
       "Glycaemic and complication-screening laboratory panel.",
       "diabetes, lab, hba1c, glucose, microalbumin",
       "Fasting Blood Sugar (mg/dL):\nPost-Prandial (mg/dL):\nHbA1c (%):\n"
       "Serum Creatinine / eGFR:\nUrine Microalbumin-Creatinine Ratio:\n"
       "Lipid profile attached: Yes / No\nImpression:"),

    # ---------------- Vaccine ----------------
    _t("Adult Vaccination Record", "Vaccine", "Vaccination",
       "Adult and senior immunisation schedule with batch traceability.",
       "vaccine, vaccination, adult, influenza, pneumococcal, immunisation",
       "Vaccine name:\nDose number:\nDate administered:\nBatch / Lot number:\n"
       "Expiry date:\nSite and route:\nAdministered by:\nAdverse event observed: Yes / No\n"
       "Next dose due:"),
    _t("Childhood Vaccination Record", "Vaccine", "Vaccination",
       "Paediatric immunisation schedule tracking against the national programme.",
       "vaccine, vaccination, paediatric, child, immunisation, schedule",
       "Age at visit:\nVaccines due (BCG / OPV / Pentavalent / MMR / DPT booster):\n"
       "Administered today:\nBatch / Lot number:\nSite and route:\n"
       "Adverse event following immunisation: Yes / No\nNext visit due:"),

    # ---------------- Treatment Notes ----------------
    _t("EECP Treatment Note", "Treatment Notes", "EECP",
       "Per-session EECP therapy log with cuff pressure and tolerance.",
       "eecp, treatment, counterpulsation, session, cuff pressure",
       "Session number (of 35):\nCuff pressure (mmHg):\nDiastolic augmentation ratio:\n"
       "Duration (minutes):\nHeart rate pre / post:\nBP pre / post:\n"
       "Patient tolerance: Good / Fair / Poor\nAdverse events:\nTherapist:"),
    _t("General Treatment Note", "Treatment Notes", "General Medicine",
       "Free-form procedure and treatment documentation.",
       "treatment, procedure, note, general",
       "Procedure / treatment performed:\nIndication:\nConsent obtained: Yes / No\n"
       "Findings:\nComplications:\nPost-procedure instructions:\nPerformed by:"),

    # ---------------- Remaining canonical types ----------------
    _t("Chief Complaint Intake", "Chief Complaints", "General Medicine",
       "Presenting complaint capture with onset, duration and severity.",
       "chief complaint, intake, presenting, triage",
       "Presenting complaint (patient's own words):\nDuration:\nSeverity (0-10):\n"
       "Aggravating factors:\nRelieving factors:\nPrior treatment taken:"),
    _t("History of Present Illness - Cardiac", "History of Present Illness", "Cardiac",
       "Chronological narrative of the current cardiac illness.",
       "hpi, history, cardiac, narrative, chest pain",
       "Onset and chronology:\nSymptom progression:\nExertional threshold change:\n"
       "Prior cardiac events (MI / PCI / CABG):\nCurrent cardiac medication:\n"
       "Hospitalisations in the last year:"),
    _t("Past Medical History Review", "Past Medical History", "General Medicine",
       "Chronic conditions, surgeries, allergies and hospitalisation history.",
       "past medical history, pmh, comorbidity, surgery, allergy",
       "Chronic conditions (DM / HTN / CAD / CKD / Thyroid):\nPast surgeries with year:\n"
       "Drug allergies:\nBlood transfusions:\nPrevious hospitalisations:"),
    _t("Family History Record", "Family History", "General Medicine",
       "First- and second-degree family history with hereditary risk flags.",
       "family history, hereditary, genetic, risk",
       "Father:\nMother:\nSiblings:\nPremature CAD in first-degree relative (<55 M / <65 F): Yes / No\n"
       "Familial diabetes / hypertension / dyslipidaemia:\nHereditary risk summary:"),
    _t("Social History & Lifestyle Intake", "Social History", "General Medicine",
       "Tobacco, alcohol, occupation, diet and physical activity profile.",
       "social history, tobacco, alcohol, occupation, lifestyle",
       "Tobacco: Never / Current / Ex (pack-years)\nAlcohol: units per week\n"
       "Occupation and exposures:\nDietary pattern:\nPhysical activity (minutes per week):\n"
       "Sleep hours:\nStress and support system:"),
    _t("Review of Systems - Comprehensive", "Review of Systems", "General Medicine",
       "Fourteen-system review checklist for a complete clinical work-up.",
       "review of systems, ros, systemic, checklist",
       "Constitutional:\nEyes:\nENT:\nCardiovascular:\nRespiratory:\nGastrointestinal:\n"
       "Genitourinary:\nMusculoskeletal:\nSkin:\nNeurological:\nPsychiatric:\n"
       "Endocrine:\nHaematologic:\nAllergic / Immunologic:"),
    _t("Nurse Vitals & Observation Note", "Nurse Notes", "Nursing",
       "Nursing vitals round with intake-output and pain score.",
       "nurse, vitals, observation, nursing, intake output",
       "Time:\nTemperature:\nPulse:\nRespiratory rate:\nBP:\nSpO2:\n"
       "Pain score (0-10):\nIntake / Output:\nMedication administered:\n"
       "Patient condition:\nNurse signature:"),
    _t("Physician Self Note", "Self Notes", "General Medicine",
       "Private clinician reminder not shared on the patient chart.",
       "self note, private, reminder, clinician",
       "Clinical reasoning / differential under consideration:\nPending investigations to chase:\n"
       "Discussion points for next visit:\nReminder date:"),
    _t("Cardiac Imaging Request", "Imaging", "Imaging",
       "Echocardiography, TMT and coronary imaging request with clinical indication.",
       "imaging, echo, tmt, angiogram, cardiac, radiology",
       "Study requested: ECHO / TMT / CT Coronary Angiogram / Nuclear Perfusion\n"
       "Clinical indication:\nRelevant history:\nRenal function (if contrast):\n"
       "Urgency: Routine / Urgent\nRequesting physician:"),
    _t("Diabetic Diet Plan", "Diet Recommendations", "Nutrition",
       "Carbohydrate-controlled Indian diet plan with portion guidance.",
       "diet, diabetes, nutrition, carbohydrate, meal plan",
       "Target daily calories:\nCarbohydrate distribution across meals:\n"
       "Early morning:\nBreakfast:\nMid-morning:\nLunch:\nEvening:\nDinner:\n"
       "Foods to avoid:\nFluid intake target:"),
    _t("Cardiac Lifestyle Plan", "Lifestyle Recommendations", "Cardiac",
       "Exercise, tobacco-cessation and stress-management plan for cardiac patients.",
       "lifestyle, cardiac, exercise, tobacco cessation, stress",
       "Aerobic activity prescription (type / duration / frequency / intensity):\n"
       "Resistance training:\nTobacco cessation plan:\nAlcohol advice:\n"
       "Stress management / yoga / pranayama:\nSleep hygiene:\nWeight target:"),
    _t("Post-EECP Patient Instructions", "Instructions", "EECP",
       "Take-home instructions issued after an EECP session.",
       "instructions, eecp, post procedure, patient education",
       "1. Maintain adequate hydration for the rest of the day.\n"
       "2. Avoid strenuous unaccustomed exertion for 2 hours.\n"
       "3. Continue all prescribed cardiac medication as scheduled.\n"
       "4. Report any new chest pain, breathlessness or leg discomfort immediately.\n"
       "5. Attend the next session at the scheduled time."),
    _t("Intramuscular Injection Record", "Injection", "Pharmacy",
       "Injection administration log with site, route and reaction monitoring.",
       "injection, im, iv, administration, record",
       "Drug and strength:\nDose administered:\nRoute: IM / IV / SC\nSite:\n"
       "Date and time:\nBatch number:\nAdministered by:\nImmediate reaction: Yes / No\n"
       "Observation period completed: Yes / No"),
    _t("Cardiac Supplement Advice", "Supplement", "Nutrition",
       "Evidence-based supplement counselling for cardiac patients.",
       "supplement, omega 3, coq10, vitamin d, cardiac",
       "Supplement recommended:\nDose and timing:\nIndication:\n"
       "Interaction check with current medication: Completed / Not applicable\n"
       "Duration of use:\nReview date:"),
    _t("Consolidated Clinical Report", "Reports", "General Medicine",
       "Summary report combining diagnosis, investigations and treatment plan.",
       "report, summary, discharge, consolidated",
       "Patient summary:\nWorking diagnosis:\nKey investigations and findings:\n"
       "Treatment administered:\nCondition at discharge / review:\n"
       "Follow-up plan:\nReporting physician:"),
    _t("Post-EECP Follow-up Schedule", "Follow up", "EECP",
       "Structured follow-up intervals after completing 35 hours of EECP.",
       "follow up, eecp, review, schedule, maintenance",
       "Sessions completed:\nSymptom status versus baseline:\n"
       "Walking distance without symptoms (metres):\nS/L nitroglycerin use per week:\n"
       "Next review: 1 month / 3 months / 6 months\nInvestigations due at review:"),
    _t("Clinic Consumables Inventory", "Billing Inventory", "Billing",
       "Chargeable consumable and disposable stock record for billing.",
       "billing, inventory, consumables, stock, charges",
       "Item name:\nItem code:\nUnit of measure:\nQuantity issued:\nUnit rate (INR):\n"
       "Total amount (INR):\nBatch / Expiry:\nIssued to department:"),
    _t("Appointment Reminder Email", "Email", "Communication",
       "Automated appointment reminder sent to the patient's registered email.",
       "email, reminder, appointment, communication",
       "Subject: Your appointment at Heal Your Heart Neelankarai\n\n"
       "Dear {{patient_name}},\n\nThis is a reminder of your appointment with "
       "{{doctor_name}} on {{appointment_date}} at {{appointment_time}}.\n\n"
       "Please arrive 15 minutes early and carry your previous records.\n\n"
       "Regards,\nHeal Your Heart Neelankarai"),

    # ---------------- Billing communication types ----------------
    _t("Invoice Notification - PHR Message", "Send Invoice - PHR Message", "Billing",
       "Invoice notification delivered to the patient health record inbox.",
       "invoice, phr, billing, notification, message",
       "Dear {{patient_name}},\n\nYour invoice {{invoice_number}} dated {{invoice_date}} "
       "for {{invoice_amount}} is now available in your patient health record.\n\n"
       "You may settle it at the front desk or through the online payment link.\n\n"
       "Heal Your Heart Neelankarai"),
    _t("Invoice Notification - Email", "Send Invoice - Email", "Billing",
       "Invoice notification emailed to the patient with a payment link.",
       "invoice, email, billing, payment, notification",
       "Subject: Invoice {{invoice_number}} from Heal Your Heart Neelankarai\n\n"
       "Dear {{patient_name}},\n\nPlease find attached invoice {{invoice_number}} dated "
       "{{invoice_date}} for {{invoice_amount}}.\n\nPayment link: {{payment_link}}\n\n"
       "Regards,\nBilling Department"),
    _t("Receipt Confirmation - PHR Message", "Send Receipt - PHR Message", "Billing",
       "Payment receipt confirmation posted to the patient health record.",
       "receipt, phr, payment, billing, confirmation",
       "Dear {{patient_name}},\n\nWe have received your payment of {{amount_paid}} on "
       "{{payment_date}}. Receipt {{receipt_number}} is available in your health record.\n\n"
       "Thank you,\nHeal Your Heart Neelankarai"),
    _t("Receipt Confirmation - Email", "Send Receipt - Email", "Billing",
       "Payment receipt emailed to the patient after settlement.",
       "receipt, email, payment, billing, confirmation",
       "Subject: Payment received - Receipt {{receipt_number}}\n\n"
       "Dear {{patient_name}},\n\nThank you for your payment of {{amount_paid}} received on "
       "{{payment_date}}. Your receipt is attached.\n\nRegards,\nBilling Department"),
    _t("Account Statement - PHR Message", "Send Statement - PHR Message", "Billing",
       "Periodic account statement delivered through the patient health record.",
       "statement, phr, account, billing, balance",
       "Dear {{patient_name}},\n\nYour account statement for the period "
       "{{period_start}} to {{period_end}} is available in your health record.\n\n"
       "Outstanding balance: {{balance_due}}\n\nHeal Your Heart Neelankarai"),
    _t("Account Statement - Email", "Send Statement - Email", "Billing",
       "Periodic account statement emailed to the patient.",
       "statement, email, account, billing, balance",
       "Subject: Account statement {{period_start}} - {{period_end}}\n\n"
       "Dear {{patient_name}},\n\nPlease find attached your account statement for the period "
       "{{period_start}} to {{period_end}}.\n\nOutstanding balance: {{balance_due}}\n\n"
       "Regards,\nBilling Department"),
]


def seed_missing_demo_templates(verbose=True):
    """Insert only the demo templates whose exact name is not already stored."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT LOWER(name) AS n FROM templates;")
    existing_names = {row["n"] for row in cursor.fetchall()}

    inserted = []
    for tpl in DEMO_TEMPLATES:
        if tpl["name"].lower() in existing_names:
            continue

        cursor.execute("""
            INSERT INTO templates (name, template_type, specialty, category, description,
                                   content, tags, is_active, is_practice, is_library,
                                   created_by, owner_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, ?);
        """, (
            tpl["name"], tpl["template_type"], tpl["category"], tpl["category"],
            tpl["description"], tpl["content"], tpl["tags"],
            SEED_AUTHOR, DEFAULT_OWNER_EMAIL,
        ))
        new_id = cursor.lastrowid

        for role in tpl["roles"]:
            cursor.execute(
                "INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?);",
                (new_id, role),
            )
        inserted.append(tpl["name"])

    conn.commit()

    # Report any canonical type still without a template so the gap is visible
    # in the server log rather than only as an empty table in the UI.
    cursor.execute("SELECT DISTINCT template_type FROM templates;")
    covered = {row["template_type"] for row in cursor.fetchall()}
    missing = [t for t in TEMPLATE_TYPES if t not in covered]

    conn.close()

    if verbose:
        if inserted:
            print(f"Seeded {len(inserted)} additional demo template(s) covering new template types.")
        else:
            print("Demo template catalogue already complete - nothing to add.")
        if missing:
            print(f"WARNING: template types with no template: {', '.join(missing)}")

    return inserted, missing
