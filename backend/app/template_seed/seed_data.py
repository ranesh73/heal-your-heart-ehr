import json
from ..database import get_db_connection

def seed_database():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing data
    cursor.execute("DELETE FROM template_responses;")
    cursor.execute("DELETE FROM consultations;")
    cursor.execute("DELETE FROM template_relationships;")
    cursor.execute("DELETE FROM template_options;")
    cursor.execute("DELETE FROM template_components;")
    cursor.execute("DELETE FROM template_sections;")
    cursor.execute("DELETE FROM template_permissions;")
    cursor.execute("DELETE FROM templates;")
    cursor.execute("DELETE FROM patients;")
    cursor.execute("DELETE FROM users;")
    cursor.execute("DELETE FROM roles;")

    # 1. Seed Roles
    roles = [
        ("Administrator", "Full system access and template configuration"),
        ("Physician", "Chief & Consultant Doctors with full clinical authoring"),
        ("Physician Assistant", "Clinical template entry and follow-up data"),
        ("Nurse", "Nursing notes, vitals, and treatment monitoring"),
        ("Clinical Staff", "Administrative and reception notes")
    ]
    cursor.executemany("INSERT INTO roles (role_name, description) VALUES (?, ?);", roles)

    # 2. Seed Users
    #
    # Accounts are generic: the display name is a plain person's name with no
    # "Dr." prefix, qualification or specialty. `role` here drives template
    # permissions only - it is never surfaced as the account holder's title.
    users = [
        ("sanju2kguru@gmail.com", "password123", "Sanjana K", "User"),
        ("doctor@healyourheart.in", "password123", "Rajagopal K", "User"),
        ("nurse@healyourheart.in", "password123", "Lakshmi V", "Nurse"),
        ("admin@healyourheart.in", "password123", "System Administrator", "Administrator")
    ]
    cursor.executemany("INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?);", users)

    # 3. Seed Patients
    patients = [
        ("DEMO-001", "Arun Kumar", 56, "Male", "+91 98400 11223", "arun.kumar@example.com", "Coronary Artery Disease, Refractory Angina (CCS Class III), Hypertension. Evaluated for Non-Invasive EECP."),
        ("DEMO-002", "Priya Raj", 48, "Female", "+91 98401 22334", "priya.raj@example.com", "Microvascular Angina, Post-PCI follow-up, Type 2 Diabetes Mellitus, Hyperlipidemia."),
        ("DEMO-003", "Karthik S", 62, "Male", "+91 98402 33445", "karthik.s@example.com", "Ischemic Heart Disease, Dyspnea on Exertion, Stage 2 Hypertension. Pre-EECP Screening."),
        ("DEMO-004", "Meena Devi", 53, "Female", "+91 98403 44556", "meena.devi@example.com", "Atypical Chest Pain, Palpitations, Hypothyroidism, Mild Dyslipidemia."),
        ("DEMO-005", "Rahul Kumar", 39, "Male", "+91 98404 55667", "rahul.kumar@example.com", "Non-cardiac chest discomfort, Gastritis, Generalized Fatigue, Screened for Arrhythmia."),
        ("HYH-2026-001", "Rajesh Kumar", 58, "Male", "+91 98401 23456", "rajesh.k@example.com", "Coronary Artery Disease, Refractory Angina (CCS Class III), Hypertension. Post-PCI (2021). Candidate for EECP Therapy."),
        ("HYH-2026-002", "Meenakshi Sundaram", 64, "Female", "+91 94440 98765", "meenakshi.s@example.com", "Type 2 Diabetes Mellitus (15 yrs), Microvascular Angina, Stage 2 Hypertension. Post-CABG (2018). Undergoing EECP Session 18."),
        ("HYH-2026-003", "Ananthakrishnan V.", 52, "Male", "+91 97910 11223", "ananth.v@example.com", "Dyspnea on Exertion, Suspected Ischemic Heart Disease, Hyperlipidemia. Pre-EECP Screening."),
        ("HYH-2026-004", "Priya Swaminathan", 47, "Female", "+91 98844 55667", "priya.swami@example.com", "Hypothyroidism, Palpitations, Generalized Fatigue, Mild Anemia."),
        ("HYH-2026-005", "K. Balaji", 69, "Male", "+91 99620 44556", "balaji.k@example.com", "Ischemic Cardiomyopathy, LVEF 35%, NYHA Class II Heart Failure, Completed 35 Hours EECP (Maintenance Phase).")
    ]
    cursor.executemany("""
        INSERT INTO patients (mrn, full_name, age, gender, phone, email, condition_history)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, patients)

    # 4. Templates Data Definition
    # We will build rich templates with sections, components, options, and horizontal hierarchy
    templates_catalog = [
        # CARDIAC & EECP
        {
            "name": "Chest Pain Assessment",
            "type": "SOAP",
            "specialty": "Cardiac",
            "description": "Comprehensive cardiac chest pain diagnostic and horizontal triage pathway.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Subjective - Chest Pain Pathway",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {
                            "tag": "cp_presence",
                            "type": "Single Choice",
                            "label": "Chest Pain Present?",
                            "required": 1,
                            "default": "Yes",
                            "options": ["No", "Yes"]
                        },
                        {
                            "tag": "cp_severity",
                            "type": "Single Choice",
                            "label": "Pain Severity Level",
                            "required": 0,
                            "default": "Moderate",
                            "options": ["Mild", "Moderate", "Severe"]
                        },
                        {
                            "tag": "cp_classification",
                            "type": "Single Choice",
                            "label": "Clinical Classification",
                            "required": 0,
                            "default": "With Exertion",
                            "options": ["CCS Angina Class", "With Exertion", "At Rest (Unstable)"]
                        },
                        {
                            "tag": "cp_duration",
                            "type": "Single Choice",
                            "label": "Episode Duration & Walking Distance",
                            "required": 0,
                            "default": "100-300 meters",
                            "options": ["< 100 meters", "100-300 meters", "> 500 meters", "Constant / Non-exertional"]
                        },
                        {
                            "tag": "cp_associated",
                            "type": "Multi Choice",
                            "label": "Associated Cardiac Symptoms",
                            "required": 0,
                            "default": "Diaphoresis",
                            "options": ["Diaphoresis (Cold Sweats)", "Dyspnea / SOB", "Radiation to Left Arm / Jaw", "Nausea", "Palpitations"]
                        },
                        {
                            "tag": "cp_notes",
                            "type": "Notes",
                            "label": "Clinical Subjective Narrative",
                            "placeholder": "Enter specific patient narrative details...",
                            "default": "Patient reports retrosternal pressure radiating to jaw."
                        }
                    ]
                },
                {
                    "title": "Objective - Vitals & Physical Exam",
                    "category": "Objective",
                    "column_layout": 2,
                    "components": [
                        {"tag": "bp", "type": "Text Field", "label": "Blood Pressure (mmHg)", "default": "130/84 mmHg"},
                        {"tag": "hr", "type": "Text Field", "label": "Heart Rate (BPM)", "default": "78 bpm"},
                        {"tag": "spo2", "type": "Text Field", "label": "SpO2 (%)", "default": "98% on room air"},
                        {"tag": "ecg_finding", "type": "Single Choice", "label": "Resting 12-Lead ECG", "options": ["Normal Sinus Rhythm", "ST Depression (>1mm)", "T-wave Inversion", "LBBB", "Old Q Waves"], "default": "ST Depression (>1mm)"}
                    ]
                },
                {
                    "title": "Assessment - Working Diagnosis",
                    "category": "Assessment",
                    "column_layout": 1,
                    "components": [
                        {"tag": "assessment_diag", "type": "Single Choice", "label": "Primary Cardiac Diagnosis", "options": ["Stable Angina Pectoris (CCS II-III)", "Acute Coronary Syndrome Rule-out", "Microvascular Angina", "Non-Cardiac Chest Wall Pain"], "default": "Stable Angina Pectoris (CCS II-III)"},
                        {"tag": "eecp_candidate", "type": "Single Choice", "label": "EECP Eligibility Status", "options": ["Prime Candidate for 35-Hr EECP", "Already Undergoing EECP", "Contraindicated (Severe AR/DVT)", "Further Imaging Needed"], "default": "Prime Candidate for 35-Hr EECP"}
                    ]
                },
                {
                    "title": "Plan - Management & Treatment",
                    "category": "Plan",
                    "column_layout": 1,
                    "components": [
                        {"tag": "plan_rx", "type": "Notes", "label": "Medications & Instructions", "default": "Tab. Sorbitrate 5mg PRN for angina. Continue Aspirin 75mg + Atorvastatin 40mg. Schedule EECP baseline Echocardiogram."}
                    ]
                }
            ],
            "relationships": [
                {"parent_tag": "cp_presence", "trigger": "Yes", "child_tag": "cp_severity"},
                {"parent_tag": "cp_severity", "trigger": "Severe", "child_tag": "cp_classification"},
                {"parent_tag": "cp_severity", "trigger": "Moderate", "child_tag": "cp_classification"},
                {"parent_tag": "cp_classification", "trigger": "With Exertion", "child_tag": "cp_duration"},
                {"parent_tag": "cp_classification", "trigger": "At Rest (Unstable)", "child_tag": "cp_associated"}
            ]
        },
        {
            "name": "EECP Initial Assessment",
            "type": "SOAP",
            "specialty": "EECP",
            "description": "Comprehensive pre-treatment evaluation for Enhanced External Counterpulsation candidacy.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "EECP Candidacy & Indications",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {"tag": "eecp_indication", "type": "Single Choice", "label": "Primary Indication for EECP", "options": ["Refractory Angina Pectoris", "Inoperable CAD / Diffuse Disease", "Post-CABG/PCI Recurrent Angina", "Ischemic Heart Failure (LVEF 30-45%)", "Microvascular Angina"], "default": "Refractory Angina Pectoris"},
                        {"tag": "eecp_contra_screen", "type": "Single Choice", "label": "Contraindication Screening", "options": ["Cleared (No Contraindications)", "Severe Aortic Regurgitation (Excluded)", "Active Deep Vein Thrombosis (Excluded)", "Severe Arrhythmia / Frequent PVCs"], "default": "Cleared (No Contraindications)"},
                        {"tag": "baseline_angina_class", "type": "Single Choice", "label": "Baseline CCS Angina Class", "options": ["Class I (Mild exertion only)", "Class II (Slight limitation)", "Class III (Marked limitation, walking 1 block)", "Class IV (Inability to carry out activity)"], "default": "Class III (Marked limitation, walking 1 block)"}
                    ]
                },
                {
                    "title": "Vascular & Pressure Readiness",
                    "category": "Objective",
                    "column_layout": 2,
                    "components": [
                        {"tag": "lower_limb_pulse", "type": "Single Choice", "label": "Femoral & Dorsalis Pedis Pulses", "options": ["Normal Palpable (+2)", "Diminished (+1)", "Absent (Severe PVD)"], "default": "Normal Palpable (+2)"},
                        {"tag": "bp_target", "type": "Text Field", "label": "Baseline Resting BP", "default": "124/80 mmHg"},
                        {"tag": "skin_integrity", "type": "Single Choice", "label": "Lower Limb Skin & Cuff Fit", "options": ["Intact / Suitable for high-pressure cuffs", "Skin breakdown / Fragile", "Edema (Requires diuretic prep)"], "default": "Intact / Suitable for high-pressure cuffs"}
                    ]
                },
                {
                    "title": "EECP Prescription Plan",
                    "category": "Plan",
                    "column_layout": 1,
                    "components": [
                        {"tag": "eecp_protocol", "type": "Notes", "label": "Recommended Course", "default": "Course of 35 one-hour sessions (1 hr/day, 6 days/wk). Initial cuff pressure 220-260 mmHg, titration to achieve D/S ratio >= 1.5."}
                    ]
                }
            ],
            "relationships": [
                {"parent_tag": "eecp_indication", "trigger": "Refractory Angina Pectoris", "child_tag": "baseline_angina_class"},
                {"parent_tag": "eecp_contra_screen", "trigger": "Cleared (No Contraindications)", "child_tag": "lower_limb_pulse"}
            ]
        },
        {
            "name": "EECP Eligibility Documentation",
            "type": "Assessment",
            "specialty": "EECP",
            "description": "Standard documentation checklist for non-invasive EECP therapy evaluation.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Clinical Criteria Checklist",
                    "category": "Assessment",
                    "column_layout": 1,
                    "components": [
                        {"tag": "eecp_diag", "type": "Single Choice", "label": "Documented Clinical Category", "options": ["Coronary Artery Disease", "Refractory Angina", "Cardiomyopathy / LVEF < 40%", "Microvascular Dysfunction"], "default": "Coronary Artery Disease"},
                        {"tag": "eecp_ecg", "type": "Single Choice", "label": "Baseline Resting ECG Triage", "options": ["Sinus Rhythm", "Stable Bundle Branch Block", "Prior Infarct Q-waves", "Non-specific ST-T Changes"], "default": "Sinus Rhythm"},
                        {"tag": "eecp_status", "type": "Single Choice", "label": "Clearance Status", "options": ["Recommended for EECP Course", "Under Evaluation", "Contraindicated"], "default": "Recommended for EECP Course"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "EECP Session Note",
            "type": "Treatment Notes",
            "specialty": "EECP",
            "description": "Per-session treatment monitoring log for EECP therapy hour, cuff pressures, and deflation timing.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse", "Physician Assistant"],
            "sections": [
                {
                    "title": "Daily Session Execution",
                    "category": "Plan",
                    "column_layout": 2,
                    "components": [
                        {"tag": "session_num", "type": "Number Field", "label": "Session Number (1 to 35)", "default": "15"},
                        {"tag": "calves_pressure", "type": "Text Field", "label": "Calves Cuff Pressure (PSI/mmHg)", "default": "240 mmHg"},
                        {"tag": "thighs_pressure", "type": "Text Field", "label": "Lower Thighs Pressure (mmHg)", "default": "260 mmHg"},
                        {"tag": "buttocks_pressure", "type": "Text Field", "label": "Upper Thighs / Buttocks Pressure", "default": "280 mmHg"},
                        {"tag": "ds_ratio", "type": "Text Field", "label": "Achieved D/S Waveform Ratio", "default": "1.65 (Optimal Augmentation)"},
                        {"tag": "patient_tolerance", "type": "Single Choice", "label": "Patient Tolerance During Session", "options": ["Well Tolerated / Comfortable", "Mild Muscle Fatigue", "Cuff Discomfort Adjusted", "Session Interrupted"], "default": "Well Tolerated / Comfortable"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "EECP Daily Session Treatment Log",
            "type": "Treatment Notes",
            "specialty": "EECP",
            "description": "Daily monitoring log for EECP therapy hour, cuff pressures, and deflation timing.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse", "Physician Assistant"],
            "sections": [
                {
                    "title": "Daily Session Execution",
                    "category": "Plan",
                    "column_layout": 2,
                    "components": [
                        {"tag": "session_num", "type": "Number Field", "label": "Session Number (1 to 35)", "default": "15"},
                        {"tag": "calves_pressure", "type": "Text Field", "label": "Calves Cuff Pressure (PSI/mmHg)", "default": "240 mmHg"},
                        {"tag": "thighs_pressure", "type": "Text Field", "label": "Lower Thighs Pressure (mmHg)", "default": "260 mmHg"},
                        {"tag": "buttocks_pressure", "type": "Text Field", "label": "Upper Thighs / Buttocks Pressure", "default": "280 mmHg"},
                        {"tag": "ds_ratio", "type": "Text Field", "label": "Achieved D/S Waveform Ratio", "default": "1.65 (Optimal Augmentation)"},
                        {"tag": "patient_tolerance", "type": "Single Choice", "label": "Patient Tolerance During Session", "options": ["Well Tolerated / Comfortable", "Mild Muscle Fatigue", "Cuff Discomfort Adjusted", "Session Interrupted"], "default": "Well Tolerated / Comfortable"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "EECP Progress",
            "type": "Progress Notes",
            "specialty": "EECP",
            "description": "Interim 15-hour and 25-hour progress assessment during EECP course.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Interim Clinical Progress",
                    "category": "Assessment",
                    "column_layout": 1,
                    "components": [
                        {"tag": "hours_completed", "type": "Single Choice", "label": "Milestone Evaluation Point", "options": ["Session 15 Review", "Session 25 Review", "Session 35 Final"], "default": "Session 15 Review"},
                        {"tag": "angina_status", "type": "Single Choice", "label": "Symptom Burden Trend", "options": ["Significant Improvement", "Moderate Improvement", "Unchanged", "Increased Fatigue"], "default": "Significant Improvement"},
                        {"tag": "functional_walk", "type": "Text Field", "label": "Daily Walking Tolerance", "default": "Walks 30 mins comfortably without rest pain"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "EECP Treatment Summary",
            "type": "Reports",
            "specialty": "EECP",
            "description": "Full 35-hour cumulative summary of symptoms, functional capacity, and nitroglycerin reduction.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [
                {
                    "title": "Post-EECP Outcome Evaluation",
                    "category": "Assessment",
                    "column_layout": 1,
                    "components": [
                        {"tag": "completed_hours", "type": "Number Field", "label": "Total Completed Treatment Hours", "default": "35"},
                        {"tag": "angina_reduction", "type": "Single Choice", "label": "Angina Frequency Reduction", "options": ["> 75% Reduction / Pain-free", "50-75% Significant Reduction", "25-50% Moderate Improvement", "< 25% Minimal Change"], "default": "> 75% Reduction / Pain-free"},
                        {"tag": "six_min_walk", "type": "Text Field", "label": "6-Minute Walk Distance Improvement", "default": "+140 meters compared to baseline"},
                        {"tag": "summary_notes", "type": "Notes", "label": "Physician Final Narrative", "default": "Remarkable improvement in exercise tolerance and coronary collateral flow post 35-hr EECP course."}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "EECP Follow-up",
            "type": "Follow Up",
            "specialty": "EECP",
            "description": "Routine 3-month and 6-month post-treatment evaluation.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Follow-up Status",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {"tag": "followup_timeline", "type": "Single Choice", "label": "Follow-up Timepoint", "options": ["1 Month Post-EECP", "3 Months Post-EECP", "6 Months Post-EECP", "1 Year Annual Review"], "default": "3 Months Post-EECP"},
                        {"tag": "sustained_relief", "type": "Yes/No Question", "label": "Sustained Symptom Relief Maintained?", "default": "Yes", "options": ["No", "Yes"]},
                        {"tag": "nitro_usage", "type": "Single Choice", "label": "Sublingual Nitrate Usage", "options": ["Zero usage (Completely stopped)", "Rarely (< 1/week)", "Occasional (2-3/week)", "Frequent (> 4/week)"], "default": "Zero usage (Completely stopped)"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Heart Failure Assessment",
            "type": "SOAP",
            "specialty": "Cardiac",
            "description": "Evaluation of cardiac decompensation, NYHA functional class, and fluid overload.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Heart Failure Clinical Symptoms",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {"tag": "nyha_class", "type": "Single Choice", "label": "NYHA Functional Class", "options": ["Class I (No limitation)", "Class II (Slight limitation)", "Class III (Marked limitation)", "Class IV (Symptoms at rest)"], "default": "Class II (Slight limitation)"},
                        {"tag": "orthopnea", "type": "Single Choice", "label": "Orthopnea / Pillows required", "options": ["None (Flat)", "2 Pillows", "3+ Pillows", "Sleeps upright in chair"], "default": "2 Pillows"},
                        {"tag": "pedal_edema", "type": "Single Choice", "label": "Lower Extremity Pitting Edema", "options": ["None (0)", "Mild ankle (+1)", "Moderate pretibial (+2)", "Severe thigh/generalized (+3 to +4)"], "default": "Mild ankle (+1)"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Heart Failure Patient Diet",
            "type": "Diet Recommendations",
            "specialty": "Cardiac",
            "description": "Specific low sodium, fluid restriction, and heart-healthy dietary plan.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [
                {
                    "title": "Diet Guidelines",
                    "category": "Plan",
                    "column_layout": 1,
                    "components": [
                        {"tag": "sodium_limit", "type": "Single Choice", "label": "Daily Sodium Restriction", "options": ["< 1,500 mg/day (Strict)", "< 2,000 mg/day (Standard HF)", "No added table salt"], "default": "< 1,500 mg/day (Strict)"},
                        {"tag": "fluid_limit", "type": "Single Choice", "label": "Daily Fluid Intake Limit", "options": ["1.2 Liters/day (Severe Edema)", "1.5 Liters/day (Standard)", "2.0 Liters/day", "Unrestricted"], "default": "1.5 Liters/day (Standard)"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Diet for BP Patient",
            "type": "Diet Recommendations",
            "specialty": "Hypertension",
            "description": "DASH diet guidelines, potassium-rich foods, and salt reduction protocol.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [
                {
                    "title": "Hypertension Nutrition Plan",
                    "category": "Plan",
                    "column_layout": 1,
                    "components": [
                        {"tag": "dash_plan", "type": "Single Choice", "label": "Dietary Approach", "options": ["Strict DASH Diet", "Moderate Sodium Reduction", "Low Glycemic + Low Sodium"], "default": "Strict DASH Diet"},
                        {"tag": "salt_target", "type": "Text Field", "label": "Salt Target", "default": "Less than 1 level teaspoon (5g salt / 2g sodium) daily."}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Diet for Anemia",
            "type": "Diet Recommendations",
            "specialty": "General Medicine",
            "description": "Iron-rich foods, vitamin C co-factors, and dietary counseling for hemoglobin support.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [
                {
                    "title": "Iron & Nutritional Plan",
                    "category": "Plan",
                    "column_layout": 1,
                    "components": [
                        {"tag": "iron_diet", "type": "Multi Choice", "label": "Recommended Iron Sources", "options": ["Green leafy vegetables (Spinach, Moringa)", "Dates & Raisins", "Beetroot & Pomegranate", "Lentils & Legumes", "Jaggery (Moderate)"], "default": "Dates & Raisins"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Coronary Artery Disease",
            "type": "Assessment Notes",
            "specialty": "Cardiac",
            "description": "Assessment of stable atherosclerotic disease, revascularization status, and plaque stability.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Palpitations",
            "type": "Symptoms",
            "specialty": "Cardiac",
            "description": "Investigation of skipped beats, tachycardia, flutter, and Holter correlation.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Cardiac Edema",
            "type": "Physical Examination",
            "specialty": "Cardiac",
            "description": "Systematic grading of peripheral and sacral edema in cardiovascular patients.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [], "relationships": []
        },
        {
            "name": "Cardiac Follow-up",
            "type": "Follow Up",
            "specialty": "Cardiac",
            "description": "Interval evaluation of blood pressure, lipid profile, and exercise tolerance.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # RESPIRATORY
        {
            "name": "Respiratory Assessment",
            "type": "SOAP",
            "specialty": "Respiratory",
            "description": "Detailed respiratory evaluation with horizontal branching for cough and dyspnea.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Respiratory Symptoms Pathway",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {"tag": "resp_cough", "type": "Single Choice", "label": "Cough Present?", "options": ["No", "Yes"], "default": "Yes"},
                        {"tag": "cough_type", "type": "Single Choice", "label": "Cough Character", "options": ["Dry Irritant", "Productive with Sputum", "Nocturnal Bouts", "Hemoptysis (Blood Streaked)"], "default": "Dry Irritant"},
                        {"tag": "cough_duration", "type": "Single Choice", "label": "Cough Duration", "options": ["< 1 Week (Acute)", "1-3 Weeks (Subacute)", "> 4 Weeks (Chronic)"], "default": "1-3 Weeks (Subacute)"},
                        {"tag": "wheezing_present", "type": "Single Choice", "label": "Audible Wheezing?", "options": ["No Wheezing", "Expiratory Wheeze", "Inspiratory & Expiratory"], "default": "No Wheezing"}
                    ]
                }
            ],
            "relationships": [
                {"parent_tag": "resp_cough", "trigger": "Yes", "child_tag": "cough_type"},
                {"parent_tag": "cough_type", "trigger": "Productive with Sputum", "child_tag": "cough_duration"}
            ]
        },
        {
            "name": "Cough",
            "type": "Chief Complaints",
            "specialty": "Respiratory",
            "description": "Quick triage for cough frequency, nighttime triggers, and allergen exposure.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [], "relationships": []
        },
        {
            "name": "Shortness of Breath",
            "type": "Symptoms",
            "specialty": "Respiratory",
            "description": "Dyspnea on exertion, resting breathlessness, and respiratory rate tracking.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Asthma",
            "type": "SOAP",
            "specialty": "Respiratory",
            "description": "GINA guidelines-based asthma symptom control and inhaler adherence assessment.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "COPD",
            "type": "SOAP",
            "specialty": "Respiratory",
            "description": "GOLD criteria assessment for chronic obstructive pulmonary disease and exacerbations.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # GENERAL MEDICINE
        {
            "name": "Fever Assessment",
            "type": "SOAP",
            "specialty": "General Medicine",
            "description": "Acute febrile illness protocol with horizontal duration and associated focus screening.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Fever Characteristics",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {"tag": "fever_present", "type": "Single Choice", "label": "Fever Present?", "options": ["No", "Yes"], "default": "Yes"},
                        {"tag": "fever_temp", "type": "Single Choice", "label": "Recorded Peak Temperature", "options": ["Low Grade (99 - 100.4°F)", "Moderate (100.5 - 102°F)", "High Grade (> 102°F)"], "default": "Moderate (100.5 - 102°F)"},
                        {"tag": "fever_chills", "type": "Single Choice", "label": "Associated Chills & Rigors", "options": ["No Chills", "Chills Present", "Shaking Rigors (Suggests Bacteremia/Malaria)"], "default": "Chills Present"},
                        {"tag": "fever_source", "type": "Multi Choice", "label": "Localizing Symptoms", "options": ["Sore throat / URI", "Urinary burning / Dysuria", "Abdominal cramp / Diarrhea", "Joint / Body ache", "Rash"], "default": "Sore throat / URI"}
                    ]
                }
            ],
            "relationships": [
                {"parent_tag": "fever_present", "trigger": "Yes", "child_tag": "fever_temp"},
                {"parent_tag": "fever_temp", "trigger": "High Grade (> 102°F)", "child_tag": "fever_chills"},
                {"parent_tag": "fever_temp", "trigger": "Moderate (100.5 - 102°F)", "child_tag": "fever_chills"}
            ]
        },
        {
            "name": "Diarrhea Assessment",
            "type": "SOAP",
            "specialty": "General Medicine",
            "description": "Acute gastroenteritis, hydration status, and stool characterization pathway.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "GI Symptom Evaluation",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {"tag": "loose_stools", "type": "Single Choice", "label": "Loose Stools Present?", "options": ["No", "Yes"], "default": "Yes"},
                        {"tag": "stool_freq", "type": "Single Choice", "label": "Episodes per 24 Hours", "options": ["1-3 times (Mild)", "4-6 times (Moderate)", "> 6 times (Severe)"], "default": "4-6 times (Moderate)"},
                        {"tag": "stool_type", "type": "Single Choice", "label": "Stool Appearance", "options": ["Watery without Blood", "Mucus Present", "Gross Blood Present (Dysentery)"], "default": "Watery without Blood"},
                        {"tag": "hydration_eval", "type": "Single Choice", "label": "Hydration / Thirst Status", "options": ["Well Hydrated (Normal skin turgor)", "Mild Dehydration (Thirsty, dry mouth)", "Severe Dehydration (Sunken eyes, oliguria)"], "default": "Mild Dehydration (Thirsty, dry mouth)"}
                    ]
                }
            ],
            "relationships": [
                {"parent_tag": "loose_stools", "trigger": "Yes", "child_tag": "stool_freq"},
                {"parent_tag": "stool_freq", "trigger": "> 6 times (Severe)", "child_tag": "hydration_eval"},
                {"parent_tag": "stool_freq", "trigger": "4-6 times (Moderate)", "child_tag": "stool_type"}
            ]
        },
        {
            "name": "Headache",
            "type": "Chief Complaints",
            "specialty": "General Medicine",
            "description": "Red flag screening for headache, thunderclap onset, and vision changes.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Fatigue",
            "type": "Symptoms",
            "specialty": "General Medicine",
            "description": "Evaluation of generalized weakness, sleep disturbances, and metabolic causes.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Abdominal Pain",
            "type": "Symptoms",
            "specialty": "General Medicine",
            "description": "Quadrant-based abdominal examination and surgical abdomen screening.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # DIABETES & METABOLIC
        {
            "name": "Diabetes Management Template",
            "type": "SOAP",
            "specialty": "Diabetes",
            "description": "Comprehensive Type 2 Diabetes clinic note, glycemic targets, and complications.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [
                {
                    "title": "Glycemic History",
                    "category": "Subjective",
                    "column_layout": 1,
                    "components": [
                        {"tag": "dm_years", "type": "Number Field", "label": "Duration of Diabetes (Years)", "default": "8"},
                        {"tag": "hypo_episodes", "type": "Single Choice", "label": "Hypoglycemia Episodes (< 70 mg/dL)", "options": ["None reported", "Mild (1-2/month, self-treated)", "Severe (Required assistance)"], "default": "None reported"},
                        {"tag": "last_hba1c", "type": "Text Field", "label": "Latest HbA1c (%)", "default": "7.4%"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Blood Sugar Monitoring",
            "type": "Lab Record",
            "specialty": "Diabetes",
            "description": "Fasting blood sugar, postprandial glucose, and home SMBG log.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [], "relationships": []
        },
        {
            "name": "Diabetic Foot Assessment",
            "type": "Physical Examination",
            "specialty": "Diabetes",
            "description": "Monofilament 10g sensory test, vibration sense, and peripheral pulses.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [], "relationships": []
        },
        {
            "name": "Diabetic Diet",
            "type": "Diet Recommendations",
            "specialty": "Diabetes",
            "description": "Carbohydrate counting, glycemic index education, and meal timing.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [], "relationships": []
        },

        # HYPERTENSION
        {
            "name": "Hypertension Assessment",
            "type": "SOAP",
            "specialty": "Hypertension",
            "description": "Staging of blood pressure, target organ damage, and secondary causes.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Blood Pressure Follow-up",
            "type": "Follow Up",
            "specialty": "Hypertension",
            "description": "Office vs home BP logs and medication titration.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [], "relationships": []
        },

        # THYROID
        {
            "name": "Thyroid Assessment",
            "type": "SOAP",
            "specialty": "Thyroid",
            "description": "Evaluation of thyroid enlargement, TSH levels, and hypo/hyperthyroid symptoms.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Hypothyroidism",
            "type": "Assessment Notes",
            "specialty": "Thyroid",
            "description": "Levothyroxine dosing and symptom resolution monitoring.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # ANESTHESIA
        {
            "name": "Pre-Anesthesia Assessment",
            "type": "SOAP",
            "specialty": "Anesthesia",
            "description": "Preoperative medical fitness, airway evaluation (Mallampati), and cardiac risk.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [
                {
                    "title": "Airway & Systemic Evaluation",
                    "category": "Objective",
                    "column_layout": 2,
                    "components": [
                        {"tag": "mallampati", "type": "Single Choice", "label": "Mallampati Airway Score", "options": ["Class I (Full visualization)", "Class II (Uvula partially visible)", "Class III (Only base of uvula)", "Class IV (Only hard palate)"], "default": "Class I (Full visualization)"},
                        {"tag": "asa_status", "type": "Single Choice", "label": "ASA Physical Status", "options": ["ASA I (Healthy)", "ASA II (Mild systemic disease)", "ASA III (Severe systemic disease)", "ASA IV (Constant threat to life)"], "default": "ASA II (Mild systemic disease)"},
                        {"tag": "cardiac_cleared", "type": "Single Choice", "label": "Cardiovascular Clearance", "options": ["Cleared without restriction", "Requires stress ECG/ECHO", "Deferred for medical optimization"], "default": "Cleared without restriction"}
                    ]
                }
            ],
            "relationships": []
        },

        # RENAL & URINARY
        {
            "name": "Kidney Disease",
            "type": "SOAP",
            "specialty": "Kidney / Urinary",
            "description": "CKD staging, eGFR trajectory, proteinuria, and renal-protective regimens.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "UTI",
            "type": "Symptoms",
            "specialty": "Kidney / Urinary",
            "description": "Dysuria, urinary frequency, urgency, and fever protocol.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [], "relationships": []
        },

        # GASTROINTESTINAL
        {
            "name": "Acid Reflux",
            "type": "Symptoms",
            "specialty": "Gastrointestinal",
            "description": "Heartburn, regurgitation, dysphagia red flags, and PPI response.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # NEUROLOGY & MUSCULOSKELETAL
        {
            "name": "Migraine",
            "type": "SOAP",
            "specialty": "Neurology",
            "description": "Aura characteristics, unilateral throbbing pain, photophobia, and triptan therapy.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Joint Pain",
            "type": "Symptoms",
            "specialty": "Musculoskeletal",
            "description": "Morning stiffness, joint swelling, range of motion, and inflammatory markers.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Back Pain",
            "type": "Physical Examination",
            "specialty": "Musculoskeletal",
            "description": "Straight leg raise test, neurological deficits, and posture examination.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # VACCINATION & PREVENTIVE
        {
            "name": "Vaccination",
            "type": "Vaccine",
            "specialty": "Vaccination",
            "description": "Adult and pediatric vaccine administration, lot numbers, and site documentation.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [
                {
                    "title": "Vaccine Details",
                    "category": "Plan",
                    "column_layout": 2,
                    "components": [
                        {"tag": "vaccine_name", "type": "Single Choice", "label": "Vaccine Administered", "options": ["Influenza (Quadrivalent)", "Pneumococcal (PCV20)", "Hepatitis B", "Tetanus-Diphtheria (Td)", "Typhoid Conjugate"], "default": "Influenza (Quadrivalent)"},
                        {"tag": "route_site", "type": "Single Choice", "label": "Route & Site", "options": ["Intramuscular - Left Deltoid", "Intramuscular - Right Deltoid", "Subcutaneous - Upper Arm"], "default": "Intramuscular - Left Deltoid"},
                        {"tag": "adverse_reaction", "type": "Yes/No Question", "label": "Immediate Adverse Reaction?", "options": ["No", "Yes"], "default": "No"}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Annual Physical",
            "type": "SOAP",
            "specialty": "Preventive",
            "description": "Comprehensive annual health checkup, cardiovascular risk calculator, and screening.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # LAB & IMAGING
        {
            "name": "Lipid Profile",
            "type": "Lab Record",
            "specialty": "Lab",
            "description": "Total cholesterol, LDL-C, HDL-C, triglycerides, and non-HDL calculation.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [], "relationships": []
        },
        {
            "name": "Echocardiogram",
            "type": "Imaging",
            "specialty": "Imaging",
            "description": "2D Transthoracic Echocardiogram report with LVEF, wall motion, and diastolic function.",
            "is_practice": 1, "is_library": 0,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },

        # EMAIL TEMPLATES
        {
            "name": "Appointment Reminder Email",
            "type": "Email",
            "specialty": "General Medicine",
            "description": "Standard reminder email sent to patients 24 hours prior to appointment.",
            "is_practice": 0, "is_library": 0,
            "roles": ["Clinical Staff"],
            "sections": [
                {
                    "title": "Email Body",
                    "category": "Plan",
                    "column_layout": 1,
                    "components": [
                        {"tag": "email_subject", "type": "Text Field", "label": "Subject Line", "default": "Reminder: Your Upcoming Consultation at Heal Your Heart Neelankarai"},
                        {"tag": "email_content", "type": "Notes", "label": "Email Body", "default": "Dear [Patient Name], This is a gentle reminder for your consultation on [Date] at [Time]. Please bring your prior ECG, EECP records, and latest blood test reports."}
                    ]
                }
            ],
            "relationships": []
        },
        {
            "name": "Post-EECP Instructions Email",
            "type": "Email",
            "specialty": "EECP",
            "description": "Discharge and home care guidelines for patients undergoing EECP therapy.",
            "is_practice": 0, "is_library": 0,
            "roles": ["Physician", "Nurse"],
            "sections": [
                {
                    "title": "Email Body",
                    "category": "Plan",
                    "column_layout": 1,
                    "components": [
                        {"tag": "email_subject", "type": "Text Field", "label": "Subject Line", "default": "Important Post-EECP Care Guidelines - Heal Your Heart"},
                        {"tag": "email_content", "type": "Notes", "label": "Email Body", "default": "Dear Patient, Please stay adequately hydrated following your EECP session today. Avoid strenuous unaccustomed exertion for the next 2 hours and continue your prescribed cardiac medications as scheduled."}
                    ]
                }
            ],
            "relationships": []
        },

        # TEMPLATE LIBRARY (Importable from Community / CharmHealth Library)
        {
            "name": "Universal Adult Well-Woman Exam",
            "type": "SOAP",
            "specialty": "General Medicine",
            "description": "Routine preventive gynecological and general health examination template.",
            "is_practice": 0, "is_library": 1,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        },
        {
            "name": "Geriatric Fall Risk Assessment",
            "type": "Physical Examination",
            "specialty": "Neurology",
            "description": "Timed Up and Go (TUG) test, gait assessment, and balance evaluation.",
            "is_practice": 0, "is_library": 1,
            "roles": ["Physician", "Physician Assistant"],
            "sections": [], "relationships": []
        },
        {
            "name": "Pediatric Growth & Developmental Milestones",
            "type": "Physical Examination",
            "specialty": "General Medicine",
            "description": "Weight-for-age percentiles, head circumference, and motor milestone checks.",
            "is_practice": 0, "is_library": 1,
            "roles": ["Physician"],
            "sections": [], "relationships": []
        }
    ]

    for t_data in templates_catalog:
        cursor.execute("""
            INSERT INTO templates (name, template_type, specialty, description, is_practice, is_library, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            t_data["name"],
            t_data["type"],
            t_data["specialty"],
            t_data["description"],
            t_data["is_practice"],
            t_data["is_library"],
            "Dr. K. Rajagopal, MD"
        ))
        template_id = cursor.lastrowid

        # Insert permissions
        roles_list = t_data.get("roles", ["Physician", "Physician Assistant"])
        for r_name in roles_list:
            cursor.execute("INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?);", (template_id, r_name))

        # Insert sections and components if provided
        tag_to_comp_id = {}
        for s_idx, s_data in enumerate(t_data.get("sections", [])):
            cursor.execute("""
                INSERT INTO template_sections (template_id, title, category, order_index, column_layout)
                VALUES (?, ?, ?, ?, ?);
            """, (template_id, s_data["title"], s_data.get("category", "Subjective"), s_idx, s_data.get("column_layout", 1)))
            section_id = cursor.lastrowid

            for c_idx, c_data in enumerate(s_data.get("components", [])):
                cursor.execute("""
                    INSERT INTO template_components (section_id, component_type, label, placeholder, is_required, default_value, order_index)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                """, (
                    section_id,
                    c_data["type"],
                    c_data["label"],
                    c_data.get("placeholder", ""),
                    c_data.get("required", 0),
                    c_data.get("default", None),
                    c_idx
                ))
                comp_id = cursor.lastrowid
                if "tag" in c_data:
                    tag_to_comp_id[c_data["tag"]] = comp_id

                # Options
                for o_idx, opt_text in enumerate(c_data.get("options", [])):
                    cursor.execute("""
                        INSERT INTO template_options (component_id, option_label, option_value, order_index)
                        VALUES (?, ?, ?, ?);
                    """, (comp_id, opt_text, opt_text, o_idx))

        # Insert relationships
        for rel in t_data.get("relationships", []):
            p_tag = rel.get("parent_tag")
            c_tag = rel.get("child_tag")
            if p_tag in tag_to_comp_id and c_tag in tag_to_comp_id:
                cursor.execute("""
                    INSERT INTO template_relationships (template_id, parent_component_id, trigger_value, child_component_id)
                    VALUES (?, ?, ?, ?);
                """, (template_id, tag_to_comp_id[p_tag], rel["trigger"], tag_to_comp_id[c_tag]))

    # Seed one sample completed consultation for Demo Patient 001 with Chest Pain template
    cursor.execute("SELECT id FROM templates WHERE name = 'Chest Pain Assessment' LIMIT 1;")
    cp_row = cursor.fetchone()
    cursor.execute("SELECT id FROM patients ORDER BY id ASC LIMIT 1;")
    p_row = cursor.fetchone()
    if cp_row and p_row:
        cp_id = cp_row["id"]
        p_id = p_row["id"]
        cursor.execute("""
            INSERT INTO consultations (patient_id, template_id, doctor_name, status, notes)
            VALUES (?, ?, 'Sanjana K', 'Completed', 'Patient evaluated for acute chest tightness. EECP recommended.');
        """, (p_id, cp_id))
        cons_id = cursor.lastrowid

        cursor.execute("SELECT id, label FROM template_components WHERE section_id IN (SELECT id FROM template_sections WHERE template_id = ?);", (cp_id,))
        comps = cursor.fetchall()
        for c in comps:
            cursor.execute("""
                INSERT INTO template_responses (consultation_id, component_id, component_label, response_value)
                VALUES (?, ?, ?, ?);
            """, (cons_id, c["id"], c["label"], "Normal / Screened"))

    conn.commit()
    conn.close()
    print("Database successfully seeded with 42 templates, demo patients, and sample consultation.")

if __name__ == "__main__":
    from ..database import init_db
    init_db()
    seed_database()
