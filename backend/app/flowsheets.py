import math
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import select

from . import models as m
from .schemas import Input
from .security import CLINICAL, context


router = APIRouter()

SYMPTOM_OPTIONS = [
    "No Chest Pain",
    "No Shortness of Breath",
    "Chest Pain",
    "Shortness of Breath",
]
AIx_OPTIONS = [str(value) for value in range(101)]

THERAPISTS = [
    "Divya A", "Elakkiya B", "Kalaiyarasi T", "Kavitha M", "Keerthana M",
    "Lavanya M", "Madhuvanthi R", "Mahalakshmi S", "Malathi E", "Manikandan A",
    "Nanthini P", "Pavithra K", "Priya K", "Priyanka B", "Roja S", "Selvi M",
    "Sivakami V", "Sneha S", "Sowmiya S", "Subashini P", "Subathra N", "Swetha V",
    "Uma B", "Vanitha M", "Vijayalakshmi K", "Vinothini M", "Yogalakshmi G",
    "Yuvarani P", "Abinaya S", "Anitha R", "Bhuvaneswari M", "Chitra D", "Deepa K",
    "Gomathi S", "Indhumathi R", "Janani M", "Jayanthi S", "Kanimozhi R",
    "Karthika M", "Lakshmi P", "Meena S", "Nandhini S", "Nirmala D", "Padma R",
    "Parameswari R", "Pooja S", "Preethi R", "Ramya M", "Ranjani K", "Revathi S",
    "Sangeetha R", "Saranya S", "Shanthi M", "Sindhuja P", "Sreeja R", "Sumathi M",
    "Tamilselvi R", "Valli M", "Vasanthi S", "Vidhya R",
]
PHYSICIANS = [
    "Dr.Ramya R", "Dr.Aravind K", "Dr.Deepika S", "Dr.Karthik M",
    "Dr.Meenakshi V", "Dr.Nithya R", "Dr.Prakash S", "Dr.Priya M",
    "Dr.Ramasamy S", "Dr.Sathish K", "Dr.Suresh Babu", "Dr.Vidhya S",
]
IV_FLUID_OPTIONS = [
    "IV Adrenaline",
    "IV Atropine",
    "IV RL -500 ml",
    "IV NS-500 ml",
    "IV DNS -500 ml",
    "IV Isolyte-E 500 ml",
]
INVESTIGATION_OPTIONS = [
    "Troponin I",
    "NT-Pro BNP",
    "Electrolytes",
    "CBC",
    "Hemoglobin",
    "RFT",
    "PT/INR",
]
TREATMENT_OPTIONS = [
    "Medication Management",
    "Intravenous Support",
    "Injected Medications",
    "Nebulizer Therapy Administered",
    "Monitoring & Support",
]

TEMPLATES = [
    {
        "name": "Sphygmocor Report",
        "slug": "sphygmocor-report",
        "sections": [
            {"title": "", "form_layout": "single", "fields": [
                {"key": "week_no", "label": "Week No:-", "type": "number"},
                {"key": "session_no", "label": "Session No:-", "type": "number"},
            ]},
            {"title": "Pre-EECP", "form_layout": "single", "fields": [
                {"key": "pre_aortic_systolic_pressure", "label": "Aortic Systolic Pressure", "type": "number", "unit": "mmHg"},
                {"key": "pre_aortic_pulse_pressure", "label": "Aortic Pulse Pressure", "type": "number", "unit": "mmHg"},
                {"key": "pre_augmented_pressure", "label": "Augmented Pressure", "type": "number", "unit": "mmHg"},
                {"key": "pre_augmentation_index", "label": "Augmentation Index(AIx)", "type": "select", "unit": "%", "options": AIx_OPTIONS, "trend": True},
            ]},
            {"title": "Post-EECP", "form_layout": "single", "fields": [
                {"key": "post_aortic_systolic_pressure", "label": "Aortic Systolic Pressure", "type": "number", "unit": "mmHg"},
                {"key": "post_aortic_pulse_pressure", "label": "Aortic Pulse Pressure", "type": "number", "unit": "mmHg"},
                {"key": "post_augmented_pressure", "label": "Augmented Pressure", "type": "number", "unit": "mmHg"},
                {"key": "post_augmentation_index", "label": "Augmentation Index(AIx)", "type": "select", "unit": "%", "options": AIx_OPTIONS, "trend": True},
            ]},
            {"title": "", "form_layout": "single", "fields": [
                {"key": "physician_notes", "label": "Physician Notes", "type": "textarea"},
                {"key": "therapist_name", "label": "Therapist Name", "type": "staff", "role": "therapist"},
            ]},
        ],
    },
    {
        "name": "Vaso-Meditech Blood Sugar Chart",
        "slug": "vaso-meditech-blood-sugar-chart",
        "sections": [
            {"title": "", "form_layout": "single", "fields": [
                {"key": "week_no", "label": "Week No:-", "type": "number"},
                {"key": "session_no", "label": "Session No:-", "type": "number"},
            ]},
            {"title": "Pre - EECP", "form_layout": "single", "fields": [
                {"key": "pre_random_blood_sugar", "label": "Random Blood Sugar", "type": "number", "unit": "mg/dL"},
            ]},
            {"title": "Post - EECP", "form_layout": "single", "fields": [
                {"key": "post_random_blood_sugar", "label": "Random Blood Sugar", "type": "number", "unit": "mg/dL"},
            ]},
            {"title": "In-Charge", "form_layout": "single", "fields": [
                {"key": "therapist_name", "label": "Therapist Name", "type": "staff", "role": "therapist"},
            ]},
        ],
    },
    {
        "name": "Vaso-Meditech EECP Daily Chart",
        "slug": "vaso-meditech-eecp-daily-chart",
        "sections": [
            {"title": "", "form_layout": "single", "fields": [
                {"key": "week_no", "label": "Week No:-", "type": "number"},
                {"key": "session_no", "label": "Session No:-", "type": "number"},
            ]},
            {"title": "Pre EECP", "form_layout": "two-column", "fields": [
                {"key": "weight", "label": "Weight", "type": "number", "unit": "Kgs"},
                {"key": "pre_bp", "label": "BP", "type": "text", "unit": "mmHg", "format": "blood-pressure", "trend": True},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm"},
                {"key": "spo2", "label": "SpO2", "type": "number", "unit": "%"},
            ]},
            {"title": "After 15 min. of Session", "form_layout": "single", "fields": [
                {"key": "ds_peak_15", "label": "D/S - Peak (15 min)", "type": "number", "unit": "Ratio"},
                {"key": "ds_area_15", "label": "D/S - Area (15 min)", "type": "number", "unit": "Ratio"},
                {"key": "pulse_rate_15", "label": "Pulse Rate (15 min)", "type": "number", "unit": "per min"},
                {"key": "applied_pressure_15", "label": "Applied Pressure", "type": "number", "unit": "mmHg"},
            ]},
            {"title": "After 45 min. of Session", "form_layout": "single", "fields": [
                {"key": "ds_peak_45", "label": "D/S - Peak (45 min)", "type": "number", "unit": "Ratio"},
                {"key": "ds_area_45", "label": "D/S - Area (45 min)", "type": "number", "unit": "Ratio"},
                {"key": "pulse_rate_45", "label": "Pulse Rate (45 min)", "type": "number", "unit": "per min"},
                {"key": "applied_pressure_45", "label": "Applied Pressure", "type": "number", "unit": "mmHg"},
            ]},
            {"title": "Post EECP", "form_layout": "single", "fields": [
                {"key": "post_bp_systolic", "label": "BP - Systolic (Post EECP)", "type": "number", "unit": "mmHg"},
                {"key": "post_bp_diastolic", "label": "BP - Diastolic (Post EECP)", "type": "number", "unit": "mmHg"},
                {"key": "post_pulse_rate", "label": "Pulse Rate (Post EECP)", "type": "number", "unit": "bpm"},
                {"key": "post_spo2", "label": "SpO2 (Post EECP)", "type": "number", "unit": "%"},
            ]},
            {"title": "", "form_layout": "single", "fields": [
                {"key": "electrode_artifact", "label": "Electrode induced artifact present", "type": "radio", "options": ["Yes", "No"]},
                {"key": "symptoms", "label": "Symptoms", "type": "radio", "options": SYMPTOM_OPTIONS},
                {"key": "physician_evaluation", "label": "Physician Evaluation", "type": "textarea"},
                {"key": "therapist_name", "label": "Therapist Name", "type": "staff", "role": "therapist"},
                {"key": "physician_name", "label": "Physician Name", "type": "staff", "role": "physician"},
            ]},
        ],
    },
    {
        "name": "Vaso-Meditech EECP Weekly Chart",
        "slug": "vaso-meditech-eecp-weekly-chart",
        "sections": [
            {"title": "", "form_layout": "single", "fields": [
                {"key": "week_no", "label": "Week No:-", "type": "number"},
                {"key": "session_no", "label": "Session No:-", "type": "number"},
                {"key": "weight", "label": "Weight", "type": "number", "unit": "Kgs"},
                {"key": "height", "label": "Height", "type": "number", "unit": "cms"},
                {"key": "bmi", "label": "BMI", "type": "number", "unit": "", "auto_calculate": True, "trend": True},
                {"key": "bp_systolic", "label": "BP - Systolic", "type": "number", "unit": "mmHg"},
                {"key": "bp_diastolic", "label": "BP - Diastolic", "type": "number", "unit": "mmHg"},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm"},
                {"key": "exercise_time", "label": "Exercise Time", "type": "number", "unit": "min"},
                {"key": "nyha", "label": "NYHA", "type": "radio", "options": ["Class I", "Class II", "Class III", "Class IV"]},
                {"key": "ccs", "label": "CCS", "type": "radio", "options": ["No Chest Pain", "Class I", "Class II", "Class III", "Class IV"]},
                {"key": "pre_eecp_blood_glucose", "label": "Pre EECP Blood Glucose", "type": "number", "unit": "mg/dL"},
                {"key": "post_eecp_blood_glucose", "label": "Post EECP Blood Glucose", "type": "number", "unit": "mg/dL"},
                {"key": "o2", "label": "O2", "type": "number", "unit": "L"},
                {"key": "symptoms", "label": "Symptoms", "type": "radio", "options": SYMPTOM_OPTIONS},
                {"key": "physician_evaluation", "label": "Physician Evaluation", "type": "textarea"},
                {"key": "therapist_name", "label": "Therapist Name", "type": "staff", "role": "therapist"},
                {"key": "physician_name", "label": "Physician Name", "type": "staff", "role": "physician"},
            ]},
        ],
    },
    {
        "name": "Admission Flowsheet Nursing",
        "slug": "admission-flowsheet-nursing",
        "sections": [
            {"title": "", "form_layout": "two-column", "fields": [
                {"key": "height", "label": "Height", "type": "number", "unit": "cms", "trend": True},
                {"key": "weight", "label": "Weight", "type": "number", "unit": "Kgs", "trend": True},
                {"key": "temperature", "label": "Temperature", "type": "temperature", "unit_options": ["°C", "°F"], "default_unit": "°F", "trend": True},
                {"key": "bp", "label": "BP", "type": "text", "unit": "mmHg", "format": "blood-pressure", "trend": True},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm", "trend": True},
                {"key": "spo2", "label": "SpO2", "type": "number", "unit": "%", "trend": True},
                {"key": "respiratory_rate", "label": "Respiratory Rate", "type": "number", "unit": "per min", "trend": True},
                {"key": "urine_output", "label": "Urine Output", "type": "number", "unit": "ML", "trend": True},
            ]},
            {"title": "Lab Results", "form_layout": "two-column", "fields": [
                {"key": "cardiac_troponin_i", "label": "Cardiac Troponin I", "type": "text", "trend": True},
                {"key": "creatine_kinase_mb", "label": "Creatine Kinase-MB", "type": "text", "trend": True},
                {"key": "nt_pro_bnp", "label": "NT-Pro BNP", "type": "text", "trend": True},
                {"key": "urea_serum", "label": "Urea Serum", "type": "text", "trend": True},
                {"key": "sr_creatinine", "label": "Sr. Creatinine", "type": "text", "trend": True},
                {"key": "random_blood_sugar", "label": "Random Blood Sugar", "type": "number", "unit": "mg/dL", "trend": True},
                {"key": "cbg", "label": "CBG", "type": "number", "unit": "mg/dL", "trend": True},
            ]},
            {"title": "", "form_layout": "single", "fields": [
                {"key": "iv_fluids", "label": "IV Fluids/Injections/Nebulizer", "type": "checkboxes", "options": IV_FLUID_OPTIONS},
                {"key": "medications_added", "label": "Medications Added", "type": "textarea"},
                {"key": "o2", "label": "O2", "type": "number", "unit": "L", "trend": True},
                {"key": "notes", "label": "Notes", "type": "textarea"},
            ]},
        ],
    },
    {
        "name": "Admission Treatment &Progress",
        "slug": "admission-treatment-progress",
        "sections": [
            {"title": "", "form_layout": "single", "fields": [
                {"key": "complaints", "label": "Complaints", "type": "textarea"},
            ]},
            {"title": "", "form_layout": "single", "fields": [
                {"key": "treatment_administered", "label": "Treatment Administered", "type": "checkboxes", "options": TREATMENT_OPTIONS},
                {"key": "labs_investigation_ordered", "label": "Labs & Investigation Ordered", "type": "checkboxes", "options": INVESTIGATION_OPTIONS},
                {"key": "iv_fluids", "label": "IV Fluids/Injections/Nebulizer", "type": "checkboxes", "options": IV_FLUID_OPTIONS},
                {"key": "monitoring", "label": "Multi-parameter Monitor", "type": "checkboxes", "options": ["ECG", "NIBP", "SpO2", "Temperature"]},
                {"key": "medications_added", "label": "Medications Added", "type": "textarea"},
            ]},
            {"title": "Lab Results", "form_layout": "two-column", "fields": [
                {"key": "troponin_i", "label": "Troponin I", "type": "text", "trend": True},
                {"key": "nt_pro_bnp", "label": "NT-Pro BNP", "type": "text", "trend": True},
                {"key": "electrolytes", "label": "Electrolytes", "type": "text", "trend": True},
                {"key": "cbc", "label": "CBC", "type": "text", "trend": True},
                {"key": "hemoglobin", "label": "Hemoglobin", "type": "text", "trend": True},
                {"key": "rft", "label": "RFT", "type": "text", "trend": True},
                {"key": "pt_inr", "label": "PT/INR", "type": "text", "trend": True},
            ]},
            {"title": "Vitals", "form_layout": "two-column", "fields": [
                {"key": "height", "label": "Height", "type": "number", "unit": "cms", "trend": True},
                {"key": "weight", "label": "Weight", "type": "number", "unit": "Kgs", "trend": True},
                {"key": "temperature", "label": "Temperature", "type": "temperature", "unit_options": ["°C", "°F"], "default_unit": "°F", "trend": True},
                {"key": "bp", "label": "BP", "type": "text", "unit": "mmHg", "format": "blood-pressure", "trend": True},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm", "trend": True},
                {"key": "spo2", "label": "SpO2", "type": "number", "unit": "%", "trend": True},
                {"key": "respiratory_rate", "label": "Respiratory Rate", "type": "number", "unit": "per min", "trend": True},
            ]},
            {"title": "", "form_layout": "two-column", "fields": [
                {"key": "o2", "label": "O2", "type": "number", "unit": "L", "trend": True},
                {"key": "urine_output_24hr", "label": "Urine Output 24 Hr", "type": "number", "unit": "ML", "trend": True},
            ]},
            {"title": "", "form_layout": "single", "fields": [
                {"key": "notes", "label": "Notes", "type": "textarea"},
                {"key": "duty_doctor_incharge", "label": "Duty Doctor Incharge", "type": "text"},
            ]},
        ],
    },
    {
        "name": "ER Flowsheet",
        "slug": "er-flowsheet",
        "sections": [
            {"title": "", "form_layout": "single", "fields": [
                {"key": "presenting_complaints", "label": "Presenting Complaints", "type": "textarea"},
            ]},
            {"title": "Vitals", "form_layout": "two-column", "fields": [
                {"key": "height", "label": "Height", "type": "number", "unit": "cms", "trend": True},
                {"key": "weight", "label": "Weight", "type": "number", "unit": "Kgs", "trend": True},
                {"key": "temperature", "label": "Temperature", "type": "temperature", "unit_options": ["°C", "°F"], "default_unit": "°F", "trend": True},
                {"key": "bp", "label": "BP", "type": "text", "unit": "mmHg", "format": "blood-pressure", "trend": True},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm", "trend": True},
                {"key": "spo2", "label": "SpO2", "type": "number", "unit": "%", "trend": True},
                {"key": "respiratory_rate", "label": "Respiratory Rate", "type": "number", "unit": "per min", "trend": True},
                {"key": "urine_output", "label": "Urine Output", "type": "number", "unit": "ML", "trend": True},
            ]},
            {"title": "Lab Results", "form_layout": "two-column", "fields": [
                {"key": "troponin_i", "label": "Troponin I", "type": "text", "trend": True},
                {"key": "nt_pro_bnp", "label": "NT-Pro BNP", "type": "text", "trend": True},
                {"key": "electrolytes", "label": "Electrolytes", "type": "text", "trend": True},
                {"key": "cbc", "label": "CBC", "type": "text", "trend": True},
                {"key": "hemoglobin", "label": "Hemoglobin", "type": "text", "trend": True},
                {"key": "rft", "label": "RFT", "type": "text", "trend": True},
                {"key": "pt_inr", "label": "PT/INR", "type": "text", "trend": True},
                {"key": "cbg", "label": "CBG", "type": "number", "unit": "mg/dL", "trend": True},
            ]},
            {"title": "", "form_layout": "single", "fields": [
                {"key": "interventions", "label": "Treatment Administered", "type": "checkboxes", "options": TREATMENT_OPTIONS},
                {"key": "iv_fluids", "label": "IV Fluids/Injections/Nebulizer", "type": "checkboxes", "options": IV_FLUID_OPTIONS},
                {"key": "medications_added", "label": "Medications Added", "type": "textarea"},
                {"key": "assessment", "label": "ER Assessment", "type": "textarea"},
                {"key": "disposition", "label": "Disposition", "type": "select", "options": ["Admitted", "Discharged", "Transferred", "Under Observation"]},
                {"key": "notes", "label": "Notes", "type": "textarea"},
            ]},
        ],
    },
    {
        "name": "Follow up",
        "slug": "follow-up-flowsheet",
        "sections": [
            {"title": "Vitals", "form_layout": "two-column", "fields": [
                {"key": "weight", "label": "Weight", "type": "number", "unit": "Kgs", "trend": True},
                {"key": "bp", "label": "BP", "type": "text", "unit": "mmHg", "format": "blood-pressure", "trend": True},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm", "trend": True},
                {"key": "spo2", "label": "SpO2", "type": "number", "unit": "%", "trend": True},
            ]},
            {"title": "Follow Up", "form_layout": "single", "fields": [
                {"key": "symptoms", "label": "Symptoms", "type": "textarea"},
                {"key": "progress_since_last_visit", "label": "Progress Since Last Visit", "type": "textarea"},
                {"key": "medications_added", "label": "Medications Added", "type": "textarea"},
                {"key": "follow_up_instructions", "label": "Follow-Up Instructions", "type": "textarea"},
                {"key": "follow_up_required", "label": "Follow-Up Required", "type": "radio", "options": ["Yes", "No"]},
                {"key": "next_follow_up_date", "label": "Next Follow-Up Date", "type": "date"},
                {"key": "physician_name", "label": "Physician Name", "type": "staff", "role": "physician"},
            ]},
        ],
    },
    {
        "name": "Heart Failure Patient 6 min Walk Test",
        "slug": "heart-failure-6-min-walk-test",
        "sections": [
            {"title": "6 Min Walk Test", "form_layout": "single", "fields": [
                {"key": "walk_test_stage", "label": "Test Stage", "type": "radio", "options": ["Pre EECP", "Post EECP", "Pre-medical Management", "Post-medical Management"]},
            ]},
            {"title": "Body Vitals Before Test", "form_layout": "two-column", "fields": [
                {"key": "bp_systolic", "label": "BP (Systolic)", "type": "number", "unit": "mmHg", "trend": True},
                {"key": "bp_diastolic", "label": "BP (Diastolic)", "type": "number", "unit": "mmHg", "trend": True},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm", "trend": True},
                {"key": "spo2", "label": "SpO2", "type": "number", "unit": "%", "trend": True},
            ]},
            {"title": "Lap Details", "form_layout": "single", "fields": [
                {"key": "lap_length_60m", "label": "Is the Lap Length 60m?", "type": "radio", "options": ["Yes", "No"]},
                {"key": "lap_counts", "label": "Lap Counts", "type": "number", "trend": True},
                {"key": "final_lap_distance", "label": "Distance Covered in the Final Lap", "type": "number", "unit": "m", "trend": True},
                {"key": "total_distance", "label": "Total Distance Walked", "type": "number", "unit": "m", "trend": True},
                {"key": "six_minutes_completed", "label": "6 Minutes Completed?", "type": "radio", "options": ["Yes", "No"]},
                {"key": "incomplete_reason", "label": "If 6 Min Walking Not Completed, Reason for Premature Stopping", "type": "textarea"},
                {"key": "clinical_observation", "label": "Clinical Observation After Test", "type": "textarea"},
                {"key": "walking_aids_medications", "label": "Walking Aids and Medications Used During the Test", "type": "textarea"},
                {"key": "total_walking_time", "label": "Total Walking Time", "type": "number", "unit": "min", "trend": True},
                {"key": "therapist_name", "label": "Test Conducted By", "type": "staff", "role": "therapist"},
            ]},
        ],
    },
    {
        "name": "Patient Flowsheet",
        "slug": "patient-flowsheet",
        "sections": [
            {"title": "Vitals", "form_layout": "two-column", "fields": [
                {"key": "height", "label": "Height", "type": "number", "unit": "cms", "trend": True},
                {"key": "weight", "label": "Weight", "type": "number", "unit": "Kgs", "trend": True},
                {"key": "bmi", "label": "BMI", "type": "number", "trend": True},
                {"key": "temperature", "label": "Temperature", "type": "temperature", "unit_options": ["°C", "°F"], "default_unit": "°F", "trend": True},
                {"key": "bp", "label": "BP", "type": "text", "unit": "mmHg", "format": "blood-pressure", "trend": True},
                {"key": "pulse_rate", "label": "Pulse Rate", "type": "number", "unit": "bpm", "trend": True},
                {"key": "spo2", "label": "SpO2", "type": "number", "unit": "%", "trend": True},
            ]},
            {"title": "Exercise", "form_layout": "single", "fields": [
                {"key": "walking_time_without_symptoms", "label": "Walking Time Without Symptoms", "type": "number", "unit": "Min", "trend": True},
            ]},
            {"title": "Others", "form_layout": "single", "fields": [
                {"key": "complaints", "label": "Complaints", "type": "textarea"},
                {"key": "hospitalization_recently", "label": "Any Hospitalization Recently", "type": "radio", "options": ["Yes", "No"]},
            ]},
        ],
    },
]

CORE_TEMPLATE_SLUGS = {
    "sphygmocor-report",
    "vaso-meditech-blood-sugar-chart",
    "vaso-meditech-eecp-daily-chart",
    "vaso-meditech-eecp-weekly-chart",
}
OPTIONAL_TEMPLATE_SLUGS = {
    "admission-flowsheet-nursing",
    "admission-treatment-progress",
    "er-flowsheet",
    "follow-up-flowsheet",
    "heart-failure-6-min-walk-test",
    "patient-flowsheet",
}


class EntryInput(Input):
    recorded_at: datetime
    values_json: dict[str, Any] = Field(default_factory=dict)
    therapist_name: str | None = None
    physician_name: str | None = None


class EntryUpdate(Input):
    recorded_at: datetime | None = None
    values_json: dict[str, Any] | None = None
    therapist_name: str | None = None
    physician_name: str | None = None


class TemplateSelection(Input):
    slugs: list[str] = Field(default_factory=list, max_length=20)


def ensure_templates(db):
    existing = {row.slug: row for row in db.scalars(select(m.FlowsheetTemplate))}
    for order, template in enumerate(TEMPLATES):
        row = existing.get(template["slug"])
        if row is None:
            row = m.FlowsheetTemplate(slug=template["slug"])
            db.add(row)
        row.name = template["name"]
        row.display_order = order
        row.schema_json = {
            "table_layout": "transposed",
            "sections": template["sections"],
        }
        row.is_active = True
    db.flush()


def ensure_staff_roster(db):
    seeded = [
        ("therapist", name, order)
        for order, name in enumerate(THERAPISTS)
    ] + [
        ("physician", name, order)
        for order, name in enumerate(PHYSICIANS)
    ]
    existing = {
        (row.role, row.name): row
        for row in db.scalars(select(m.FlowsheetStaffRoster))
    }
    for role, name, order in seeded:
        row = existing.get((role, name))
        if row is None:
            row = m.FlowsheetStaffRoster(role=role, name=name)
            db.add(row)
        row.display_order = order
        row.is_active = True
    db.flush()


def ensure_flowsheet_seed_data(db):
    ensure_templates(db)
    ensure_staff_roster(db)


def template_for(db, slug):
    ensure_templates(db)
    template = db.scalar(select(m.FlowsheetTemplate).where(
        m.FlowsheetTemplate.slug == slug,
        m.FlowsheetTemplate.is_active == True,
    ))
    if not template:
        raise HTTPException(404, "Flowsheet template not found")
    return template


def template_out(template):
    return {
        "id": template.id,
        "name": template.name,
        "slug": template.slug,
        "display_order": template.display_order,
        "schema_json": template.schema_json,
    }


def patient_template_catalog(db, patient_id):
    templates = list(db.scalars(
        select(m.FlowsheetTemplate)
        .where(m.FlowsheetTemplate.is_active == True)
        .order_by(m.FlowsheetTemplate.display_order, m.FlowsheetTemplate.name)
    ))
    assigned_ids = set(db.scalars(
        select(m.PatientFlowsheetTemplate.template_id)
        .where(m.PatientFlowsheetTemplate.patient_id == patient_id)
    ))
    selected = [
        template
        for template in templates
        if template.slug in CORE_TEMPLATE_SLUGS or template.id in assigned_ids
    ]
    optional = [
        {
            **template_out(template),
            "selected": template.id in assigned_ids,
        }
        for template in templates
        if template.slug in OPTIONAL_TEMPLATE_SLUGS
    ]
    return {
        "templates": [template_out(template) for template in selected],
        "available": optional,
    }


def require_patient_template(db, patient_id, template):
    if template.slug in OPTIONAL_TEMPLATE_SLUGS and not db.get(
        m.PatientFlowsheetTemplate, (patient_id, template.id)
    ):
        raise HTTPException(404, "Flowsheet has not been added to this patient")


def normalize_recorded_at(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
    return value


def validate_values(template, values):
    definitions = {}
    for section in template.schema_json["sections"]:
        for field in section["fields"]:
            if field["type"] == "staff":
                continue
            definitions[field["key"]] = field
            if field["type"] == "temperature":
                definitions[f"{field['key']}_unit"] = {
                    "key": f"{field['key']}_unit",
                    "label": f"{field['label']} unit",
                    "type": "unit",
                    "options": field["unit_options"],
                }
    unknown = set(values) - definitions.keys()
    if unknown:
        raise HTTPException(422, "Unknown flowsheet field")

    clean = {}
    for key, raw in values.items():
        if raw is None or raw == "":
            continue
        field = definitions[key]
        kind = field["type"]
        if kind in {"number", "temperature"}:
            try:
                number = float(raw)
            except (TypeError, ValueError):
                raise HTTPException(422, f"{field['label']} must be a number")
            if not math.isfinite(number):
                raise HTTPException(422, f"{field['label']} must be finite")
            clean[key] = number
        elif kind in {"select", "radio", "unit"}:
            if str(raw) not in field.get("options", []):
                raise HTTPException(422, f"Choose a valid {field['label']}")
            clean[key] = str(raw)
        elif kind == "checkboxes":
            options = field.get("options", [])
            if (
                not isinstance(raw, list)
                or len(raw) > len(options)
                or any(not isinstance(value, str) or value not in options for value in raw)
                or len(set(raw)) != len(raw)
            ):
                raise HTTPException(422, f"Choose valid {field['label']} options")
            clean[key] = raw
        elif kind == "date":
            if not isinstance(raw, str):
                raise HTTPException(422, f"{field['label']} must be a date")
            try:
                date.fromisoformat(raw)
            except ValueError:
                raise HTTPException(422, f"{field['label']} must be a valid date")
            clean[key] = raw
        else:
            if not isinstance(raw, str) or len(raw) > 5000:
                raise HTTPException(422, f"{field['label']} is too long")
            text = raw.strip()
            if field.get("format") == "blood-pressure" and text and not re.fullmatch(r"\d+(?:\.\d+)?\s*/\s*\d+(?:\.\d+)?", text):
                raise HTTPException(422, "BP must be entered as systolic/diastolic")
            clean[key] = text

    for section in template.schema_json["sections"]:
        for field in section["fields"]:
            if field["type"] != "temperature":
                continue
            unit_key = f"{field['key']}_unit"
            if field["key"] in clean:
                clean.setdefault(unit_key, field["default_unit"])
            else:
                clean.pop(unit_key, None)

    if template.slug == "vaso-meditech-eecp-weekly-chart" and "bmi" not in clean:
        weight = clean.get("weight")
        height = clean.get("height")
        if weight and height and weight > 0 and height > 0:
            clean["bmi"] = round(weight / ((height / 100) ** 2), 1)
    return clean


def validate_roster_name(db, name, role):
    if name is None or name == "":
        return None
    member = db.scalar(select(m.FlowsheetStaffRoster).where(
        m.FlowsheetStaffRoster.role == role,
        m.FlowsheetStaffRoster.name == name,
        m.FlowsheetStaffRoster.is_active == True,
    ))
    if not member:
        raise HTTPException(422, f"Choose a valid {role} name")
    return member.name


def entry_out(entry):
    return {
        "id": entry.id,
        "patient_id": entry.patient_id,
        "template_id": entry.template_id,
        "recorded_at": entry.recorded_at.isoformat(),
        "values_json": entry.values_json or {},
        "therapist_name": entry.therapist_name,
        "physician_name": entry.physician_name,
        "created_by": entry.created_by,
        "created_at": entry.created_at.isoformat(),
        "updated_at": entry.updated_at.isoformat(),
    }


@router.get("/api/flowsheets/templates")
def list_templates(c=Depends(context)):
    c.allow(CLINICAL)
    ensure_templates(c.db)
    return [template_out(row) for row in c.db.scalars(
        select(m.FlowsheetTemplate)
        .where(m.FlowsheetTemplate.is_active == True)
        .order_by(m.FlowsheetTemplate.display_order, m.FlowsheetTemplate.name)
    )]


@router.get("/api/flowsheets/staff")
def list_flowsheet_staff(c=Depends(context)):
    c.allow(CLINICAL)
    ensure_staff_roster(c.db)
    rows = c.db.scalars(
        select(m.FlowsheetStaffRoster)
        .where(m.FlowsheetStaffRoster.is_active == True)
        .order_by(m.FlowsheetStaffRoster.role, m.FlowsheetStaffRoster.display_order)
    )
    staff = list(rows)
    return {
        "therapists": [row.name for row in staff if row.role == "therapist"],
        "physicians": [row.name for row in staff if row.role == "physician"],
    }


@router.get("/api/patients/{patient_id}/flowsheets/templates")
def patient_flowsheet_templates(patient_id: str, c=Depends(context)):
    c.allow(CLINICAL)
    patient = c.patient(patient_id)
    ensure_templates(c.db)
    return patient_template_catalog(c.db, patient.id)


@router.put("/api/patients/{patient_id}/flowsheets/templates")
def update_patient_flowsheet_templates(
    patient_id: str,
    data: TemplateSelection,
    c=Depends(context),
):
    c.allow(CLINICAL)
    patient = c.patient(patient_id)
    ensure_templates(c.db)
    requested = set(data.slugs)
    if len(requested) != len(data.slugs) or not requested.issubset(OPTIONAL_TEMPLATE_SLUGS):
        raise HTTPException(422, "Choose valid flowsheets")

    optional_templates = {
        row.slug: row
        for row in c.db.scalars(
            select(m.FlowsheetTemplate).where(
                m.FlowsheetTemplate.slug.in_(OPTIONAL_TEMPLATE_SLUGS),
                m.FlowsheetTemplate.is_active == True,
            )
        )
    }
    if not requested.issubset(optional_templates):
        raise HTTPException(422, "One or more flowsheets are unavailable")
    existing = {
        row.template_id: row
        for row in c.db.scalars(
            select(m.PatientFlowsheetTemplate).where(
                m.PatientFlowsheetTemplate.patient_id == patient.id
            )
        )
    }
    requested_ids = {optional_templates[slug].id for slug in requested}
    for template_id, assignment in existing.items():
        if template_id not in requested_ids:
            c.db.delete(assignment)
    for template_id in requested_ids - existing.keys():
        c.db.add(m.PatientFlowsheetTemplate(
            patient_id=patient.id,
            template_id=template_id,
        ))
    c.db.flush()
    return patient_template_catalog(c.db, patient.id)


@router.get("/api/patients/{patient_id}/flowsheets/{template_slug}")
def patient_flowsheet(patient_id: str, template_slug: str, c=Depends(context)):
    c.allow(CLINICAL)
    patient = c.patient(patient_id)
    template = template_for(c.db, template_slug)
    require_patient_template(c.db, patient.id, template)
    entries = c.db.scalars(
        select(m.PatientFlowsheetEntry)
        .where(
            m.PatientFlowsheetEntry.patient_id == patient.id,
            m.PatientFlowsheetEntry.template_id == template.id,
        )
        .order_by(m.PatientFlowsheetEntry.recorded_at.asc(), m.PatientFlowsheetEntry.created_at.asc())
    )
    return {
        "template": {"id": template.id, "name": template.name, "slug": template.slug, "schema_json": template.schema_json},
        "entries": [entry_out(entry) for entry in entries],
    }


@router.post("/api/patients/{patient_id}/flowsheets/{template_slug}/entries")
def create_entry(patient_id: str, template_slug: str, data: EntryInput, c=Depends(context)):
    c.allow(CLINICAL)
    patient = c.patient(patient_id)
    template = template_for(c.db, template_slug)
    require_patient_template(c.db, patient.id, template)
    ensure_staff_roster(c.db)
    entry = m.PatientFlowsheetEntry(
        patient_id=patient.id,
        template_id=template.id,
        recorded_at=normalize_recorded_at(data.recorded_at),
        values_json=validate_values(template, data.values_json),
        therapist_name=validate_roster_name(c.db, data.therapist_name, "therapist"),
        physician_name=validate_roster_name(c.db, data.physician_name, "physician"),
        created_by=c.user.id,
    )
    c.db.add(entry)
    c.audit("create_flowsheet_entry", entry)
    return entry_out(entry)


@router.put("/api/flowsheets/entries/{entry_id}")
def update_entry(entry_id: str, data: EntryUpdate, c=Depends(context)):
    c.allow(CLINICAL)
    entry = c.db.get(m.PatientFlowsheetEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Flowsheet entry not found")
    c.patient(entry.patient_id)
    template = c.db.get(m.FlowsheetTemplate, entry.template_id)
    if not template or not template.is_active:
        raise HTTPException(404, "Flowsheet template not found")
    require_patient_template(c.db, entry.patient_id, template)
    ensure_staff_roster(c.db)
    if data.recorded_at is not None:
        entry.recorded_at = normalize_recorded_at(data.recorded_at)
    if data.values_json is not None:
        entry.values_json = validate_values(template, data.values_json)
    if "therapist_name" in data.model_fields_set:
        entry.therapist_name = validate_roster_name(c.db, data.therapist_name, "therapist")
    if "physician_name" in data.model_fields_set:
        entry.physician_name = validate_roster_name(c.db, data.physician_name, "physician")
    entry.updated_at = datetime.now(timezone.utc)
    c.audit("update_flowsheet_entry", entry)
    return entry_out(entry)


@router.delete("/api/flowsheets/entries/{entry_id}")
def delete_entry(entry_id: str, c=Depends(context)):
    c.allow(CLINICAL)
    entry = c.db.get(m.PatientFlowsheetEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Flowsheet entry not found")
    c.patient(entry.patient_id)
    c.audit("delete_flowsheet_entry", entry)
    c.db.delete(entry)
    return {"ok": True}
