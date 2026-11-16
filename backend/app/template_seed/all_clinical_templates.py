"""
Comprehensive Clinical Template Seeder for HEAL YOUR HEART Clinic.
Neelankarai, Chennai, Tamil Nadu, India.

Ensures every medical template in all clinical categories is fully populated
with authentic, clinically sensible sections, questions, choices, checklists,
rating scales, numerical fields with units, interactive tables, and notes.

Every template has is_practice = 1, is_active = 1, and is owned by the demo physician.
"""

import json
from ..database import get_db_connection, DEFAULT_OWNER_EMAIL
from ..routes.templates import _write_sections

SEED_AUTHOR = "Dr. K. Rajagopal, MD"
DEFAULT_ROLES = ["Physician", "Physician Assistant"]

YES_NO_OPTS = [{"option_label": "No"}, {"option_label": "Yes"}]
SEVERITY_OPTS = [{"option_label": "Mild"}, {"option_label": "Moderate"}, {"option_label": "Severe"}]

def _patient_info_section():
    return {
        "title": "Patient Information",
        "category": "Subjective",
        "components": [
            {
                "component_type": "Notes",
                "label": "Patient Details & Demographics",
                "placeholder": "Enter patient clinical notes, presentation, or relevant demographics...",
                "default_value": ""
            }
        ]
    }

def _clinical_notes_sections(condition_name):
    return [
        {
            "title": "Assessment",
            "category": "Assessment",
            "components": [
                {
                    "component_type": "Notes",
                    "label": f"Clinical Assessment ({condition_name})",
                    "placeholder": f"Enter diagnostic synthesis and clinical impressions for {condition_name}..."
                }
            ]
        },
        {
            "title": "Plan",
            "category": "Plan",
            "components": [
                {
                    "component_type": "Notes",
                    "label": "Treatment Plan & Follow-up Instructions",
                    "placeholder": "Dietary recommendations, lifestyle modifications, supportive care, and review schedule..."
                },
                {
                    "component_type": "Date",
                    "label": "Next Follow-up Date"
                }
            ]
        }
    ]

# ---------------------------------------------------------------------------
# TEMPLATES DEFINITION
# ---------------------------------------------------------------------------

CLINICAL_TEMPLATES = [
    # =======================================================================
    # 1. FEVER ASSESSMENT (Full specification from Section 4 & 25)
    # =======================================================================
    {
        "name": "Fever Assessment",
        "template_type": "SOAP",
        "category": "General Medicine",
        "description": "Comprehensive fever workup with temperature measurement method, full associated symptoms checklist, headache/vomiting follow-ups, and clinical notes.",
        "tags": "fever, temperature, pyrexia, chills, infection, general medicine",
        "sections": [
            _patient_info_section(),
            {
                "title": "Temperature Measurement",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Number Field",
                        "label": "Body Temperature",
                        "placeholder": "e.g. 101.4 or 38.5",
                        "is_required": 1
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Temperature Unit",
                        "options": [{"option_label": "°F (Fahrenheit)"}, {"option_label": "°C (Celsius)"}]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "How was the temperature measured?",
                        "options": [
                            {"option_label": "Oral"},
                            {"option_label": "Axillary"},
                            {"option_label": "Tympanic"},
                            {"option_label": "Temporal"},
                            {"option_label": "Other"}
                        ]
                    }
                ]
            },
            {
                "title": "Fever Details & History",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Number Field",
                        "label": "Duration of fever (value)",
                        "placeholder": "e.g. 3"
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Duration Unit",
                        "options": [{"option_label": "Hours"}, {"option_label": "Days"}]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Fever pattern",
                        "options": [
                            {"option_label": "Continuous"},
                            {"option_label": "Intermittent"},
                            {"option_label": "Unknown"}
                        ]
                    }
                ]
            },
            {
                "title": "Associated Symptoms",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Yes/No Question",
                        "label": "Vomiting sensation / Nausea?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Simple Question",
                        "label": "Describe nausea / vomiting & number of episodes",
                        "placeholder": "Number of episodes, frequency, relation to food intake...",
                        "config": {"multiline": True}
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Headache?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Headache severity",
                        "options": SEVERITY_OPTS
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Headache location",
                        "options": [
                            {"option_label": "Frontal"},
                            {"option_label": "Temporal"},
                            {"option_label": "Occipital"},
                            {"option_label": "Diffuse"},
                            {"option_label": "Other"}
                        ]
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Chills?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Body pain?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Fatigue?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Cough?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Sore throat?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Runny nose?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Breathing difficulty?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Abdominal discomfort?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Diarrhea?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Skin rash?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Simple Question",
                        "label": "Additional symptoms",
                        "placeholder": "Specify other clinical symptoms...",
                        "config": {"multiline": True}
                    }
                ]
            },
            {
                "title": "Clinical Notes",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Notes",
                        "label": "Clinician Examination Notes",
                        "placeholder": "General appearance, hydration status, lymphadenopathy, systemic examination findings..."
                    }
                ]
            },
            _clinical_notes_sections("Fever Assessment")[0],
            _clinical_notes_sections("Fever Assessment")[1]
        ]
    },

    # =======================================================================
    # 2. CHEST PAIN ASSESSMENT (Full specification from Section 5 & 6)
    # =======================================================================
    {
        "name": "Chest Pain Assessment",
        "template_type": "SOAP",
        "category": "Cardiac",
        "description": "Cardiac chest pain evaluation with progressive horizontal hierarchy (Chest Pain -> Yes -> CCS -> Class I..IV), symptom details and Angina Frequency Log table.",
        "tags": "chest pain, angina, ccs, cardiac, eecp, coronary, ischemic",
        "sections": [
            _patient_info_section(),
            {
                "title": "Subjective - Chest Pain Classification",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Check List",
                        "label": "Chest Pain?",
                        "is_required": 1,
                        "options": [
                            {"option_label": "No"},
                            {
                                "option_label": "Yes",
                                "children": [
                                    {
                                        "option_label": "CCS",
                                        "children": [
                                            {"option_label": "Class I"},
                                            {"option_label": "Class II"},
                                            {"option_label": "Class III"},
                                            {"option_label": "Class IV"}
                                        ]
                                    },
                                {
                                    "option_label": "With Exertion",
                                    "is_expandable": True,
                                    "children": [
                                        {"option_label": "Running"},
                                        {"option_label": "Walking up Stairs"},
                                        {"option_label": "Walking up Slope"},
                                        {
                                            "option_label": "Walking on Flat Surface",
                                            "is_expandable": True,
                                            "children": [
                                                {"option_label": "More than 1/2 km"},
                                                {"option_label": "Less than 1/2 km"},
                                                {"option_label": "Less than 100 m"},
                                            ],
                                        },
                                    ],
                                },
                                {"option_label": "At Rest"}
                            ]
                        }
                    ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Pain location",
                        "options": [
                            {"option_label": "Central chest"},
                            {"option_label": "Left chest"},
                            {"option_label": "Right chest"},
                            {"option_label": "Epigastric"},
                            {"option_label": "Other"}
                        ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Pain character",
                        "options": [
                            {"option_label": "Pressure"},
                            {"option_label": "Tightness"},
                            {"option_label": "Burning"},
                            {"option_label": "Stabbing"},
                            {"option_label": "Other"}
                        ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Pain severity",
                        "options": SEVERITY_OPTS
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Duration (numeric)",
                        "placeholder": "e.g. 15"
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Duration Unit",
                        "options": [{"option_label": "Minutes"}, {"option_label": "Hours"}, {"option_label": "Days"}]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Onset",
                        "options": [{"option_label": "Sudden"}, {"option_label": "Gradual"}, {"option_label": "Unknown"}]
                    },
                    {
                        "component_type": "Multi Choice",
                        "label": "Triggers",
                        "options": [
                            {"option_label": "Exertion"},
                            {"option_label": "Rest"},
                            {"option_label": "Emotional stress"},
                            {"option_label": "After meals"},
                            {"option_label": "Other"}
                        ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Relieving factors",
                        "options": [{"option_label": "Rest"}, {"option_label": "Sublingual Nitroglycerin"}, {"option_label": "Other"}, {"option_label": "Unknown"}]
                    },
                    {
                        "component_type": "Multi Choice",
                        "label": "Associated symptoms",
                        "options": [
                            {"option_label": "Shortness of breath"},
                            {"option_label": "Sweating"},
                            {"option_label": "Nausea"},
                            {"option_label": "Vomiting"},
                            {"option_label": "Dizziness"},
                            {"option_label": "Palpitations"},
                            {"option_label": "Fatigue"},
                            {"option_label": "Other"}
                        ]
                    }
                ]
            },
            {
                "title": "Objective - Angina Frequency Log",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Table",
                        "label": "Angina Frequency & Medication Log",
                        "config": {
                            "rows": [
                                [{"text": "Parameter", "properties": {"bold": True}}, {"text": "Weekly Measurement", "properties": {"bold": True}}],
                                [{"text": "Chest Pain Frequency per Week", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "S/L Nitroglycerin per Week", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Walking Time without Symptoms (mins)", "properties": {"bold": False}}, {"text": ""}]
                            ]
                        }
                    }
                ]
            },
            _clinical_notes_sections("Chest Pain Assessment")[0],
            _clinical_notes_sections("Chest Pain Assessment")[1]
        ]
    },

    # =======================================================================
    # 3. CARDIAC ASSESSMENT
    # =======================================================================
    {
        "name": "Cardiac Assessment",
        "template_type": "SOAP",
        "category": "Cardiac",
        "description": "Comprehensive cardiology initial consultation covering cardiac risk profile, functional classification, ECG and echocardiogram logs.",
        "tags": "cardiac, cardiology, ecg, echo, heart, risk factors",
        "sections": [
            _patient_info_section(),
            {
                "title": "Cardiovascular History",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Multi Choice",
                        "label": "Known Cardiac Risk Factors",
                        "options": [
                            {"option_label": "Hypertension"},
                            {"option_label": "Diabetes Mellitus"},
                            {"option_label": "Dyslipidemia"},
                            {"option_label": "Family History of CAD"},
                            {"option_label": "Smoking / Tobacco"},
                            {"option_label": "Sedentary Lifestyle"}
                        ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "NYHA Functional Class",
                        "options": [{"option_label": "Class I"}, {"option_label": "Class II"}, {"option_label": "Class III"}, {"option_label": "Class IV"}]
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Exertional Dyspnea?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Orthopnea / PND?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Pedal Edema?",
                        "options": YES_NO_OPTS
                    }
                ]
            },
            {
                "title": "Baseline Cardiovascular Vitals",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Table",
                        "label": "Baseline Cardiovascular Vitals Table",
                        "config": {
                            "rows": [
                                [{"text": "Parameter", "properties": {"bold": True}}, {"text": "Value", "properties": {"bold": True}}, {"text": "Unit", "properties": {"bold": True}}],
                                [{"text": "Resting Blood Pressure", "properties": {"bold": False}}, {"text": ""}, {"text": "mmHg"}],
                                [{"text": "Heart Rate / Pulse", "properties": {"bold": False}}, {"text": ""}, {"text": "bpm"}],
                                [{"text": "LVEF (Ejection Fraction)", "properties": {"bold": False}}, {"text": ""}, {"text": "%"}],
                                [{"text": "Oxygen Saturation (SpO2)", "properties": {"bold": False}}, {"text": ""}, {"text": "%"}]
                            ]
                        }
                    }
                ]
            },
            _clinical_notes_sections("Cardiac Assessment")[0],
            _clinical_notes_sections("Cardiac Assessment")[1]
        ]
    },

    # =======================================================================
    # 4. HYPERTENSION TEMPLATE (Section 27)
    # =======================================================================
    {
        "name": "Hypertension Assessment",
        "template_type": "SOAP",
        "category": "Hypertension",
        "description": "Blood pressure assessment with systolic/diastolic/pulse measurements, symptom review and lifestyle modification tracking.",
        "tags": "hypertension, blood pressure, bp, cardiac, lifestyle",
        "sections": [
            _patient_info_section(),
            {
                "title": "Blood Pressure Measurements",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Number Field",
                        "label": "Systolic Blood Pressure (mmHg)",
                        "placeholder": "e.g. 138",
                        "is_required": 1
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Diastolic Blood Pressure (mmHg)",
                        "placeholder": "e.g. 88",
                        "is_required": 1
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Pulse / Heart Rate (bpm)",
                        "placeholder": "e.g. 76"
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Measurement Position",
                        "options": [{"option_label": "Sitting"}, {"option_label": "Supine"}, {"option_label": "Standing"}]
                    },
                    {
                        "component_type": "Simple Question",
                        "label": "Measurement Notes",
                        "placeholder": "Cuff size, arm used, resting period before measurement..."
                    }
                ]
            },
            {
                "title": "Hypertension Symptoms & Target Organ Screen",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Multi Choice",
                        "label": "Reported Symptoms",
                        "options": [
                            {"option_label": "Headache"},
                            {"option_label": "Dizziness"},
                            {"option_label": "Chest discomfort"},
                            {"option_label": "Palpitations"},
                            {"option_label": "Shortness of breath"},
                            {"option_label": "Blurred vision"},
                            {"option_label": "Asymptomatic"}
                        ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Salt Intake Compliance",
                        "options": [{"option_label": "Strict Low-Sodium"}, {"option_label": "Moderate"}, {"option_label": "High Sodium"}]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Medication Adherence",
                        "options": [{"option_label": "100% Compliant"}, {"option_label": "Occasional Missed Dose"}, {"option_label": "Irregular"}]
                    }
                ]
            },
            _clinical_notes_sections("Hypertension Assessment")[0],
            _clinical_notes_sections("Hypertension Assessment")[1]
        ]
    },

    # =======================================================================
    # 5. DIABETES ASSESSMENT (Section 26)
    # =======================================================================
    {
        "name": "Diabetes Assessment",
        "template_type": "SOAP",
        "category": "Diabetes",
        "description": "Comprehensive diabetes status documentation with blood glucose levels, units, symptoms, lifestyle, complication history and vitals log.",
        "tags": "diabetes, glucose, hba1c, glycemic, endocrinology",
        "sections": [
            _patient_info_section(),
            {
                "title": "Diabetes Status & Glycemic History",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Single Choice",
                        "label": "Diabetes status",
                        "options": [
                            {"option_label": "Known diabetes"},
                            {"option_label": "Newly identified concern"},
                            {"option_label": "Unknown"}
                        ],
                        "is_required": 1
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Blood glucose level",
                        "placeholder": "e.g. 142"
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Glucose Unit",
                        "options": [{"option_label": "mg/dL"}, {"option_label": "mmol/L"}]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Fasting / Post-meal / Random",
                        "options": [
                            {"option_label": "Fasting"},
                            {"option_label": "Post-meal (PPBS)"},
                            {"option_label": "Random (RBS)"}
                        ]
                    },
                    {
                        "component_type": "Multi Choice",
                        "label": "Symptoms reported",
                        "options": [
                            {"option_label": "Increased thirst (Polydipsia)"},
                            {"option_label": "Increased urination (Polyuria)"},
                            {"option_label": "Increased hunger (Polyphagia)"},
                            {"option_label": "Fatigue"},
                            {"option_label": "Blurred vision"},
                            {"option_label": "Paresthesia / Numbness"},
                            {"option_label": "None"}
                        ]
                    }
                ]
            },
            {
                "title": "Lifestyle & Complication Screening",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Table",
                        "label": "Diabetes Routine Log",
                        "config": {
                            "rows": [
                                [{"text": "Parameter", "properties": {"bold": True}}, {"text": "Value", "properties": {"bold": True}}],
                                [{"text": "HbA1c (%)", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Diet Compliance", "properties": {"bold": False}}, {"text": "Strict / Moderate"}],
                                [{"text": "Physical Activity (min/week)", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Foot Inspection", "properties": {"bold": False}}, {"text": "Normal / Ulcer / Callus"}]
                            ]
                        }
                    },
                    {
                        "component_type": "Simple Question",
                        "label": "Medication History & Current Regimen",
                        "placeholder": "List current oral hypoglycemics or insulin regimens...",
                        "config": {"multiline": True}
                    }
                ]
            },
            _clinical_notes_sections("Diabetes Assessment")[0],
            _clinical_notes_sections("Diabetes Assessment")[1]
        ]
    },

    # =======================================================================
    # 6. RESPIRATORY ASSESSMENT (Section 28)
    # =======================================================================
    {
        "name": "Respiratory Assessment",
        "template_type": "SOAP",
        "category": "Respiratory",
        "description": "Respiratory clinical evaluation with cough, sputum color branching, shortness of breath, wheezing and smoking history.",
        "tags": "respiratory, cough, asthma, copd, sputum, lungs, dyspnea",
        "sections": [
            _patient_info_section(),
            {
                "title": "Respiratory Symptoms",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Yes/No Question",
                        "label": "Cough?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Cough Duration (days)",
                        "placeholder": "e.g. 5"
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Shortness of breath?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Wheezing?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Check List",
                        "label": "Sputum?",
                        "options": [
                            {"option_label": "No"},
                            {
                                "option_label": "Yes",
                                "children": [
                                    {"option_label": "Clear"},
                                    {"option_label": "White"},
                                    {"option_label": "Yellow"},
                                    {"option_label": "Green"},
                                    {"option_label": "Blood-tinged"}
                                ]
                            }
                        ]
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Chest discomfort?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Fever?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Smoking history?",
                        "options": YES_NO_OPTS
                    }
                ]
            },
            {
                "title": "Respiratory Vitals & Auscultation",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Table",
                        "label": "Pulmonary Vitals",
                        "config": {
                            "rows": [
                                [{"text": "Parameter", "properties": {"bold": True}}, {"text": "Value", "properties": {"bold": True}}],
                                [{"text": "SpO2 (Room Air)", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Respiratory Rate (/min)", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Breath Sounds", "properties": {"bold": False}}, {"text": "Vesicular / Crepitations / Rhonchi"}]
                            ]
                        }
                    }
                ]
            },
            _clinical_notes_sections("Respiratory Assessment")[0],
            _clinical_notes_sections("Respiratory Assessment")[1]
        ]
    },

    # =======================================================================
    # 7. DIARRHEA ASSESSMENT (Section 29)
    # =======================================================================
    {
        "name": "Diarrhea Assessment",
        "template_type": "SOAP",
        "category": "Gastrointestinal",
        "description": "Gastrointestinal diarrhea assessment with stool characteristics, hydration status, travel history and supportive care.",
        "tags": "diarrhea, gastroenteritis, stool, dehydration, gi, hydration",
        "sections": [
            _patient_info_section(),
            {
                "title": "Diarrhea History & Characteristics",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Number Field",
                        "label": "Duration (days)",
                        "placeholder": "e.g. 2"
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Number of episodes per day",
                        "placeholder": "e.g. 5"
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Stool characteristics",
                        "options": [
                            {"option_label": "Watery"},
                            {"option_label": "Loose / Semi-solid"},
                            {"option_label": "Mucus present"},
                            {"option_label": "Bloody / Dysentery"},
                            {"option_label": "Other"}
                        ]
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Abdominal pain?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Fever?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Vomiting?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Dehydration-related symptoms (thirst, dry mouth, oliguria)?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Simple Question",
                        "label": "Recent food outside or travel history",
                        "placeholder": "Street food, contaminated water, travel history within 7 days...",
                        "config": {"multiline": True}
                    }
                ]
            },
            _clinical_notes_sections("Diarrhea Assessment")[0],
            _clinical_notes_sections("Diarrhea Assessment")[1]
        ]
    },

    # =======================================================================
    # 8. ABDOMINAL PAIN ASSESSMENT (Section 30)
    # =======================================================================
    {
        "name": "Abdominal Pain Assessment",
        "template_type": "SOAP",
        "category": "Gastrointestinal",
        "description": "Abdominal pain workup with localization, severity, onset, character and associated peritoneal/GI symptoms.",
        "tags": "abdominal pain, stomach, colic, epigastric, gi, gastroenterology",
        "sections": [
            _patient_info_section(),
            {
                "title": "Pain Characteristics",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Single Choice",
                        "label": "Pain location",
                        "options": [
                            {"option_label": "Upper abdomen (Epigastric)"},
                            {"option_label": "Lower abdomen (Hypogastric)"},
                            {"option_label": "Right side (RUQ / RIF)"},
                            {"option_label": "Left side (LUQ / LIF)"},
                            {"option_label": "Central (Periumbilical)"},
                            {"option_label": "Diffuse / Generalized"}
                        ],
                        "is_required": 1
                    },
                    {
                        "component_type": "Rating Scale",
                        "label": "Pain Severity Scale (1 - 10)",
                        "config": {"min": 1, "max": 10}
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Pain character",
                        "options": [
                            {"option_label": "Cramping / Colicky"},
                            {"option_label": "Burning"},
                            {"option_label": "Sharp / Stabbing"},
                            {"option_label": "Dull ache"},
                            {"option_label": "Other"}
                        ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Onset",
                        "options": [{"option_label": "Sudden"}, {"option_label": "Gradual"}, {"option_label": "Unknown"}]
                    },
                    {
                        "component_type": "Multi Choice",
                        "label": "Associated symptoms",
                        "options": [
                            {"option_label": "Nausea"},
                            {"option_label": "Vomiting"},
                            {"option_label": "Diarrhea"},
                            {"option_label": "Constipation"},
                            {"option_label": "Fever"},
                            {"option_label": "Bloating"},
                            {"option_label": "Jaundice"}
                        ]
                    }
                ]
            },
            _clinical_notes_sections("Abdominal Pain Assessment")[0],
            _clinical_notes_sections("Abdominal Pain Assessment")[1]
        ]
    },

    # =======================================================================
    # 9. HEADACHE ASSESSMENT (Section 31)
    # =======================================================================
    {
        "name": "Headache Assessment",
        "template_type": "SOAP",
        "category": "Neurology",
        "description": "Neurological headache and migraine evaluation with onset, character, red flags and sensory sensitivity.",
        "tags": "headache, migraine, neurology, cephalalgia, aura",
        "sections": [
            _patient_info_section(),
            {
                "title": "Headache Features",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Single Choice",
                        "label": "Location",
                        "options": [
                            {"option_label": "Unilateral (One-sided)"},
                            {"option_label": "Bilateral (Both sides)"},
                            {"option_label": "Frontal"},
                            {"option_label": "Temporal"},
                            {"option_label": "Occipital"},
                            {"option_label": "Band-like around head"}
                        ]
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Severity",
                        "options": SEVERITY_OPTS
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Character",
                        "options": [
                            {"option_label": "Throbbing / Pulsatile"},
                            {"option_label": "Constant pressure / Tightness"},
                            {"option_label": "Sharp / Stabbing"},
                            {"option_label": "Other"}
                        ]
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Light sensitivity (Photophobia)?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Sound sensitivity (Phonophobia)?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Visual disturbances or Aura?",
                        "options": YES_NO_OPTS
                    }
                ]
            },
            _clinical_notes_sections("Headache Assessment")[0],
            _clinical_notes_sections("Headache Assessment")[1]
        ]
    },

    # =======================================================================
    # 10. EECP INITIAL ASSESSMENT (Flagship clinic therapy - Section 34)
    # =======================================================================
    {
        "name": "EECP Initial Assessment",
        "template_type": "SOAP",
        "category": "EECP",
        "description": "Vaso-Meditech Enhanced External Counterpulsation eligibility screening, angina grading, and baseline cardiovascular parameters.",
        "tags": "eecp, counterpulsation, refractory angina, ccs, collateral, cardiac",
        "sections": [
            _patient_info_section(),
            {
                "title": "Clinical Angina & Candidacy",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Single Choice",
                        "label": "Baseline CCS Angina Class",
                        "options": [{"option_label": "Class I"}, {"option_label": "Class II"}, {"option_label": "Class III"}, {"option_label": "Class IV"}],
                        "is_required": 1
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Prior Revascularization History",
                        "options": [
                            {"option_label": "Post-PCI (Stenting)"},
                            {"option_label": "Post-CABG (Bypass)"},
                            {"option_label": "Both PCI & CABG"},
                            {"option_label": "Unsuitable for Revascularization / High Risk"}
                        ]
                    },
                    {
                        "component_type": "Multi Choice",
                        "label": "Contraindication Screening (Must be Absent)",
                        "options": [
                            {"option_label": "No Severe Aortic Regurgitation"},
                            {"option_label": "No Active DVT / Phlebitis"},
                            {"option_label": "No Severe Arrhythmia / Frequent PVCs"},
                            {"option_label": "BP Controlled (< 180/100 mmHg)"}
                        ]
                    }
                ]
            },
            {
                "title": "Baseline Cardiovascular Measurements",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Table",
                        "label": "EECP Baseline Measurements Table",
                        "config": {
                            "rows": [
                                [{"text": "Measurement", "properties": {"bold": True}}, {"text": "Baseline Value", "properties": {"bold": True}}],
                                [{"text": "Resting Blood Pressure", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Resting Heart Rate", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "LVEF (%)", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Nitroglycerin Tablets/Week", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Walking Time Before Angina (mins)", "properties": {"bold": False}}, {"text": ""}]
                            ]
                        }
                    }
                ]
            },
            _clinical_notes_sections("EECP Initial Assessment")[0],
            _clinical_notes_sections("EECP Initial Assessment")[1]
        ]
    },

    # =======================================================================
    # 11. EECP SESSION NOTE (Section 34)
    # =======================================================================
    {
        "name": "EECP Session Note",
        "template_type": "Treatment Notes",
        "category": "EECP",
        "description": "Daily treatment session documentation for Vaso-Meditech EECP therapy including cuff pressure and augmentation ratio.",
        "tags": "eecp, session note, counterpulsation, cuff pressure, treatment notes",
        "sections": [
            _patient_info_section(),
            {
                "title": "Session Parameters & Cuff Pressures",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Number Field",
                        "label": "Completed Session Number (1 to 35)",
                        "placeholder": "e.g. 14",
                        "is_required": 1
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Treatment Duration (Minutes)",
                        "placeholder": "60"
                    },
                    {
                        "component_type": "Table",
                        "label": "Session Pressure & Hemodynamic Log",
                        "config": {
                            "rows": [
                                [{"text": "Stage", "properties": {"bold": True}}, {"text": "BP (mmHg)", "properties": {"bold": True}}, {"text": "Heart Rate", "properties": {"bold": True}}, {"text": "SpO2 (%)", "properties": {"bold": True}}, {"text": "Cuff Pressure (PSI)", "properties": {"bold": True}}],
                                [{"text": "Pre-Session", "properties": {"bold": False}}, {"text": ""}, {"text": ""}, {"text": ""}, {"text": "-"}],
                                [{"text": "Mid-Session (30m)", "properties": {"bold": False}}, {"text": ""}, {"text": ""}, {"text": ""}, {"text": ""}],
                                [{"text": "Post-Session", "properties": {"bold": False}}, {"text": ""}, {"text": ""}, {"text": ""}, {"text": "-"}]
                            ]
                        }
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Augmentation Ratio (D/S Ratio)",
                        "options": [
                            {"option_label": "Optimal (> 1.5)"},
                            {"option_label": "Acceptable (1.2 - 1.5)"},
                            {"option_label": "Suboptimal (< 1.2)"}
                        ]
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Any Adverse Effect (Leg discomfort / skin irritation)?",
                        "options": YES_NO_OPTS
                    }
                ]
            },
            _clinical_notes_sections("EECP Session Note")[0],
            _clinical_notes_sections("EECP Session Note")[1]
        ]
    },

    # =======================================================================
    # 12. PRE-ANESTHESIA ASSESSMENT (Section 21)
    # =======================================================================
    {
        "name": "Pre-Anesthesia Assessment",
        "template_type": "SOAP",
        "category": "Anesthesia",
        "description": "Preoperative anesthesia risk stratification, ASA classification, airway assessment (Mallampati), and systemic organ reserve evaluation.",
        "tags": "anesthesia, pre-anesthesia, asa, mallampati, surgery, preoperative",
        "sections": [
            _patient_info_section(),
            {
                "title": "Airway & ASA Risk Classification",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Single Choice",
                        "label": "ASA Physical Status Classification",
                        "options": [
                            {"option_label": "ASA I - Normal Healthy Patient"},
                            {"option_label": "ASA II - Mild Systemic Disease"},
                            {"option_label": "ASA III - Severe Systemic Disease"},
                            {"option_label": "ASA IV - Severe Life-threatening Disease"},
                            {"option_label": "ASA V - Moribund Patient"}
                        ],
                        "is_required": 1
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Mallampati Airway Score",
                        "options": [
                            {"option_label": "Class I (Full view of soft palate & uvula)"},
                            {"option_label": "Class II (Soft palate & complete uvula visible)"},
                            {"option_label": "Class III (Soft palate & base of uvula visible)"},
                            {"option_label": "Class IV (Only hard palate visible)"}
                        ]
                    },
                    {
                        "component_type": "Number Field",
                        "label": "NPO Fasting Duration (Hours)",
                        "placeholder": "e.g. 8"
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "History of Difficult Airway or Intubation?",
                        "options": YES_NO_OPTS
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Known Allergies to Anesthetics or Latex?",
                        "options": YES_NO_OPTS
                    }
                ]
            },
            _clinical_notes_sections("Pre-Anesthesia Assessment")[0],
            _clinical_notes_sections("Pre-Anesthesia Assessment")[1]
        ]
    },

    # =======================================================================
    # 13. VACCINATION ASSESSMENT (Section 21)
    # =======================================================================
    {
        "name": "Vaccination Assessment",
        "template_type": "Vaccine",
        "category": "Vaccination",
        "description": "Pre-immunization screening, allergic history verification, vital sign screening, and informed consent documentation.",
        "tags": "vaccination, vaccine, immunization, influenza, hepatitis",
        "sections": [
            _patient_info_section(),
            {
                "title": "Pre-Vaccination Screening",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Single Choice",
                        "label": "Vaccine Administered Today",
                        "options": [
                            {"option_label": "Influenza (Flu)"},
                            {"option_label": "Pneumococcal (PCV/PPSV)"},
                            {"option_label": "Hepatitis B"},
                            {"option_label": "Tetanus Toxoid / Tdap"},
                            {"option_label": "COVID-19 Booster"},
                            {"option_label": "Other"}
                        ],
                        "is_required": 1
                    },
                    {
                        "component_type": "Table",
                        "label": "Vaccine Administration Log",
                        "config": {
                            "rows": [
                                [{"text": "Field", "properties": {"bold": True}}, {"text": "Record Entry", "properties": {"bold": True}}],
                                [{"text": "Lot / Batch Number", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Manufacturer", "properties": {"bold": False}}, {"text": ""}],
                                [{"text": "Anatomical Site", "properties": {"bold": False}}, {"text": "Left Deltoid / Right Deltoid"}],
                                [{"text": "Route", "properties": {"bold": False}}, {"text": "Intramuscular (IM)"}],
                                [{"text": "Expiration Date", "properties": {"bold": False}}, {"text": ""}]
                            ]
                        }
                    },
                    {
                        "component_type": "Yes/No Question",
                        "label": "Informed Consent Received and Signed?",
                        "options": YES_NO_OPTS
                    }
                ]
            },
            _clinical_notes_sections("Vaccination Assessment")[0],
            _clinical_notes_sections("Vaccination Assessment")[1]
        ]
    },

    # =======================================================================
    # 14. GENERAL HEALTH CHECK (Preventive - Section 21)
    # =======================================================================
    {
        "name": "General Health Check",
        "template_type": "SOAP",
        "category": "Preventive",
        "description": "Executive master health checkup including vitals, full systemic examination, lifestyle scoring and screening laboratory reviews.",
        "tags": "preventive, master health checkup, general health, wellness, screening",
        "sections": [
            _patient_info_section(),
            {
                "title": "General Systemic Examination",
                "category": "Objective",
                "components": [
                    {
                        "component_type": "Table",
                        "label": "Master Vitals & Anthropometry Table",
                        "config": {
                            "rows": [
                                [{"text": "Parameter", "properties": {"bold": True}}, {"text": "Observed Value", "properties": {"bold": True}}, {"text": "Reference Range", "properties": {"bold": True}}],
                                [{"text": "Height (cm)", "properties": {"bold": False}}, {"text": ""}, {"text": "-"}],
                                [{"text": "Weight (kg)", "properties": {"bold": False}}, {"text": ""}, {"text": "-"}],
                                [{"text": "BMI (kg/m²)", "properties": {"bold": False}}, {"text": ""}, {"text": "18.5 - 24.9"}],
                                [{"text": "Blood Pressure (mmHg)", "properties": {"bold": False}}, {"text": ""}, {"text": "< 120/80"}],
                                [{"text": "Fasting Blood Sugar (mg/dL)", "properties": {"bold": False}}, {"text": ""}, {"text": "70 - 99"}],
                                [{"text": "Total Cholesterol (mg/dL)", "properties": {"bold": False}}, {"text": ""}, {"text": "< 200"}]
                            ]
                        }
                    },
                    {
                        "component_type": "Multi Choice",
                        "label": "Screening Status Completed",
                        "options": [
                            {"option_label": "12-Lead ECG"},
                            {"option_label": "Chest X-Ray"},
                            {"option_label": "Lipid Profile"},
                            {"option_label": "Renal Function Test"},
                            {"option_label": "Liver Function Test"},
                            {"option_label": "Complete Blood Count"}
                        ]
                    }
                ]
            },
            _clinical_notes_sections("General Health Check")[0],
            _clinical_notes_sections("General Health Check")[1]
        ]
    }
]

# Additional standard condition templates to guarantee coverage of every category
ADDITIONAL_CATEGORIES = [
    # CARDIAC
    ("Angina Assessment", "SOAP", "Cardiac", "Angina pectoris grading, nitroglycerin usage, and ischemic symptom logging.", "angina, ccs, chest pain, cardiac"),
    ("Coronary Artery Disease", "SOAP", "Cardiac", "CAD chronic management, lipid targets, and antiplatelet compliance.", "cad, coronary, stenting, cabg, plaque"),
    ("Heart Failure Assessment", "SOAP", "Cardiac", "Heart failure follow-up with NYHA class, fluid balance and diuretic titration.", "heart failure, nyha, edema, lvef, dyspnea"),
    ("Palpitations Assessment", "SOAP", "Cardiac", "Palpitations evaluation with holter correlation and arrhythmia screening.", "palpitations, arrhythmia, ectopics, ecg"),
    ("Edema Assessment", "SOAP", "Cardiac", "Peripheral edema evaluation with venous Doppler and diuretic review.", "edema, swelling, pedal, cardiac, fluid"),
    ("Cardiac Follow-up", "Follow up", "Cardiac", "Routine follow-up for ischemic heart disease patients.", "cardiac, follow up, angina, review"),
    ("EECP Follow-up", "Follow up", "EECP", "Post-EECP 35-hour course functional follow-up.", "eecp, follow up, angina, functional class"),
    ("EECP Treatment Summary", "Reports", "EECP", "Complete 35-session treatment conclusion report.", "eecp, summary, report, discharge, outcome"),

    # RESPIRATORY
    ("Cough Assessment", "SOAP", "Respiratory", "Acute and chronic cough evaluation with sputum and allergy check.", "cough, sputum, respiratory, bronchitis"),
    ("Shortness of Breath", "SOAP", "Respiratory", "Dyspnea on exertion, mMRC grading, and oxygenation evaluation.", "sob, dyspnea, breathlessness, lungs"),
    ("Asthma Assessment", "SOAP", "Respiratory", "Asthma control test, peak flow measurement, and inhaler review.", "asthma, inhaler, wheezing, peak flow"),
    ("COPD Assessment", "SOAP", "Respiratory", "COPD exacerbation risk and bronchodilator evaluation.", "copd, emphysema, smoking, inhaler"),
    ("Wheezing Assessment", "SOAP", "Respiratory", "Wheezing evaluation with auscultation and bronchodilator response.", "wheezing, rhonchi, asthma, lungs"),
    ("Respiratory Infection", "SOAP", "Respiratory", "Lower and upper respiratory tract infection clinical note.", "respiratory, infection, bronchitis, pneumonia"),
    ("Pneumonia Follow-up", "Follow up", "Respiratory", "Clinical resolution check after antibiotic therapy for pneumonia.", "pneumonia, infection, lungs, chest x-ray"),

    # GENERAL MEDICINE
    ("Headache", "Symptoms", "General Medicine", "Generalized headache evaluation and analgesic logging.", "headache, pain, general medicine"),
    ("Fatigue Assessment", "SOAP", "General Medicine", "Evaluation of persistent fatigue, sleep quality, and anemia screening.", "fatigue, tiredness, weakness, sleep"),
    ("Weakness Assessment", "SOAP", "General Medicine", "Generalized muscular and generalized weakness assessment.", "weakness, fatigue, electrolytes"),
    ("Dizziness Assessment", "SOAP", "General Medicine", "Presyncope and orthostatic dizziness evaluation.", "dizziness, vertigo, blood pressure, syncopal"),
    ("Nausea Assessment", "Symptoms", "General Medicine", "Nausea episodes and hydration monitoring.", "nausea, gi, antiemetic"),
    ("Vomiting Assessment", "Symptoms", "General Medicine", "Emesis frequency, hydration status, and antiemetic review.", "vomiting, emesis, dehydration"),
    ("Diarrhea", "Symptoms", "General Medicine", "Symptom recording for acute loose stools.", "diarrhea, loose stool, hydration"),
    ("Constipation Assessment", "SOAP", "General Medicine", "Bowel frequency, dietary fiber, and laxative therapy evaluation.", "constipation, stool, bowel, fiber"),
    ("Abdominal Pain", "Symptoms", "General Medicine", "Epigastric and lower quadrant pain symptom recording.", "abdominal pain, stomach, colic"),
    ("Back Pain Assessment", "SOAP", "Musculoskeletal", "Lumbosacral pain, radiculopathy and posture review.", "back pain, spine, lumbar, sciatica"),
    ("Body Pain Assessment", "SOAP", "General Medicine", "Generalized myalgia, arthralgia and analgesic review.", "body pain, myalgia, ache"),

    # DIABETES
    ("Diabetes Follow-up", "Follow up", "Diabetes", "Routine quarterly diabetes follow-up and prescription adjustment.", "diabetes, follow up, hba1c, insulin"),
    ("Blood Glucose Monitoring", "Lab Record", "Diabetes", "Self-monitored blood glucose (SMBG) weekly log.", "glucose, smbg, fasting, postprandial"),
    ("Diabetes Lifestyle Follow-up", "Lifestyle Recommendations", "Diabetes", "Diet, carbohydrate counting, and exercise compliance check.", "diabetes, diet, lifestyle, exercise"),

    # ENDOCRINE
    ("Thyroid Assessment", "SOAP", "Thyroid", "Hypothyroidism / Hyperthyroidism clinical screening and TSH review.", "thyroid, tsh, thyroxine, endocrine"),
    ("Thyroid Follow-up", "Follow up", "Thyroid", "Dose titration check for levothyroxine.", "thyroid, follow up, tsh, levothyroxine"),

    # URINARY / KIDNEY
    ("Urinary Symptoms", "Symptoms", "Kidney / Urinary", "Dysuria, burning micturition, frequency and urgency logging.", "urinary, uti, dysuria, burning"),
    ("UTI Assessment", "SOAP", "Kidney / Urinary", "Urinary tract infection workup with urine dipstick and culture notes.", "uti, urine, dysuria, antibiotic"),
    ("Kidney Follow-up", "Follow up", "Kidney / Urinary", "Renal profile, eGFR, and chronic kidney disease stage monitoring.", "kidney, ckd, egfr, creatinine"),

    # GASTROINTESTINAL
    ("Gastric Symptoms", "Symptoms", "Gastrointestinal", "Dyspepsia, bloating, fullness and acidity documentation.", "gastric, dyspepsia, acidity, ulcer"),
    ("Acid Reflux Assessment", "SOAP", "Gastrointestinal", "GERD assessment with dietary triggers and PPI response.", "acid reflux, gerd, heartburn, ppi"),

    # NEUROLOGY
    ("Migraine Assessment", "SOAP", "Neurology", "Migraine with/without aura, prophylaxis and acute therapy.", "migraine, headache, aura, neurology"),
    ("Neurological Follow-up", "Follow up", "Neurology", "Interval neurological examination and symptom check.", "neurology, follow up, headache, balance"),

    # MUSCULOSKELETAL
    ("Joint Pain Assessment", "SOAP", "Musculoskeletal", "Arthritis, joint stiffness, and mobility review.", "joint pain, arthritis, knee, swelling"),
    ("Neck Pain Assessment", "SOAP", "Musculoskeletal", "Cervical spondylosis and neck stiffness evaluation.", "neck pain, cervical, posture, spasm"),
    ("Muscle Pain Assessment", "SOAP", "Musculoskeletal", "Myalgia, strain and physical therapy follow-up.", "muscle pain, myalgia, strain, spasm"),

    # ANESTHESIA
    ("Anesthesia Evaluation", "SOAP", "Anesthesia", "Pre-procedure sedation and airway examination.", "anesthesia, airway, sedation"),
    ("Preoperative Assessment", "SOAP", "Anesthesia", "Comprehensive pre-surgical fitness and clearance note.", "preoperative, fitness, surgery, clearance"),
    ("Post-Anesthesia Follow-up", "Follow up", "Anesthesia", "Postoperative recovery, nausea, and pain management note.", "post-anesthesia, recovery, pacu, pain"),

    # VACCINATION
    ("Vaccination Record", "Vaccine", "Vaccination", "Immunization history and schedule tracking.", "vaccine, immunization, history"),

    # LAB & IMAGING & PREVENTIVE
    ("Laboratory Review", "Lab Record", "Lab", "Review of diagnostic blood and urine laboratory results.", "lab, blood test, cbc, biochemistry"),
    ("Imaging Review", "Imaging", "Imaging", "Radiology and cardiovascular imaging findings report.", "imaging, ecg, echo, x-ray, ultrasound"),
    ("Preventive Health Assessment", "SOAP", "Preventive", "Cardiovascular wellness and primary disease prevention protocol.", "preventive, wellness, health check, screening")
]


def _build_standard_template(name, type_, category, description, tags):
    return {
        "name": name,
        "template_type": type_,
        "category": category,
        "description": description,
        "tags": tags,
        "sections": [
            _patient_info_section(),
            {
                "title": f"Clinical Evaluation ({name})",
                "category": "Subjective",
                "components": [
                    {
                        "component_type": "Simple Question",
                        "label": f"Chief Concern regarding {name}",
                        "placeholder": f"Describe patient presentation for {name}...",
                        "is_required": 1,
                        "config": {"multiline": True}
                    },
                    {
                        "component_type": "Single Choice",
                        "label": "Severity Level",
                        "options": SEVERITY_OPTS
                    },
                    {
                        "component_type": "Number Field",
                        "label": "Duration (days)",
                        "placeholder": "e.g. 4"
                    },
                    {
                        "component_type": "Multi Choice",
                        "label": "Associated Features",
                        "options": [
                            {"option_label": "Intermittent"},
                            {"option_label": "Persistent"},
                            {"option_label": "Worsens with Exertion"},
                            {"option_label": "Relieved by Rest"},
                            {"option_label": "Mild Discomfort"}
                        ]
                    },
                    {
                        "component_type": "Table",
                        "label": f"{name} Clinical Tracking",
                        "config": {
                            "rows": [
                                [{"text": "Parameter", "properties": {"bold": True}}, {"text": "Finding / Value", "properties": {"bold": True}}],
                                [{"text": "Current Status", "properties": {"bold": False}}, {"text": "Stable / Improving / Worsening"}],
                                [{"text": "Functional Impact", "properties": {"bold": False}}, {"text": "None / Mild / Significant"}]
                            ]
                        }
                    }
                ]
            },
            _clinical_notes_sections(name)[0],
            _clinical_notes_sections(name)[1]
        ]
    }


def seed_all_clinical_templates():
    """Populates every medical template in SQLite with real sections, components, choices and tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Combine explicit templates with generated standard templates
    all_defs = list(CLINICAL_TEMPLATES)
    existing_names = {t["name"] for t in all_defs}

    for name, type_, category, desc, tags in ADDITIONAL_CATEGORIES:
        if name not in existing_names:
            all_defs.append(_build_standard_template(name, type_, category, desc, tags))
            existing_names.add(name)

    print(f"Ensuring {len(all_defs)} clinical templates are fully populated...")

    for tpl_data in all_defs:
        name = tpl_data["name"]
        cursor.execute("SELECT id FROM templates WHERE name = ?;", (name,))
        row = cursor.fetchone()

        if not row:
            # Insert template row
            cursor.execute("""
                INSERT INTO templates (
                    name, template_type, specialty, category, description,
                    content, tags, is_active, is_practice, is_library,
                    created_by, owner_email
                ) VALUES (?, ?, ?, ?, ?, '', ?, 1, 1, 0, ?, ?);
            """, (
                name,
                tpl_data["template_type"],
                tpl_data["category"],
                tpl_data["category"],
                tpl_data.get("description", ""),
                tpl_data.get("tags", ""),
                SEED_AUTHOR,
                DEFAULT_OWNER_EMAIL
            ))
            template_id = cursor.lastrowid

            # Add default roles
            for r in DEFAULT_ROLES:
                cursor.execute("INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?);", (template_id, r))

            # Write sections & components
            _write_sections(cursor, template_id, tpl_data.get("sections", []), tpl_data.get("relationships", []))
        else:
            template_id = row["id"]
            # Ensure it is marked as practice and active
            cursor.execute("""
                UPDATE templates
                SET is_practice = 1, is_active = 1, category = ?, specialty = ?,
                    description = COALESCE(NULLIF(description, ''), ?),
                    tags = COALESCE(NULLIF(tags, ''), ?)
                WHERE id = ?;
            """, (tpl_data["category"], tpl_data["category"], tpl_data.get("description", ""), tpl_data.get("tags", ""), template_id))

            cursor.execute("""
                SELECT COUNT(*) FROM template_components tc
                JOIN template_sections ts ON tc.section_id = ts.id
                WHERE ts.template_id = ?;
            """, (template_id,))
            comp_count = cursor.fetchone()[0]

            force_refresh_names = {
                "Fever Assessment",
                "Chest Pain Assessment",
                "Vaso-Meditech EECP Initial Assessment",
                "Cardiac Rehabilitation Consultation",
                "Chronic Stable Angina Follow-up",
                "Bronchial Asthma Evaluation",
                "Type 2 Diabetes Comprehensive Review"
            }

            if comp_count == 0 or name in force_refresh_names:
                # Populate template with full sections, progressive disclosure options, and components
                cursor.execute("DELETE FROM template_relationships WHERE template_id = ?;", (template_id,))
                cursor.execute("DELETE FROM template_components WHERE section_id IN (SELECT id FROM template_sections WHERE template_id = ?);", (template_id,))
                cursor.execute("DELETE FROM template_sections WHERE template_id = ?;", (template_id,))
                _write_sections(cursor, template_id, tpl_data.get("sections", []), tpl_data.get("relationships", []))

    conn.commit()
    conn.close()
    print("All clinical templates successfully seeded and populated.")
