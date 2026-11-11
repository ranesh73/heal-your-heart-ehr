import sys
import os
import json
from pathlib import Path

# Set up paths
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
os.environ["PYTHONPATH"] = str(backend_dir)

from app.db import SessionLocal, lock_writes
from app import models as m

PRACTICE_TEMPLATES = [
    {
        "code": "HUH_EECP_SOAP",
        "name": "HUH EECP SOAP_Practice",
        "kind": "template",
        "content": json.dumps({
            "type": "SOAP Note",
            "name": "HUH EECP SOAP_Practice",
            "chief_complaints": [
                "Chest pain, burning sensation in the chest, radiating left shoulder pain, and jaw pain",
                "Shortness of breath / Chest pain related to exertion",
                "Difficulty in climbing stairs or slopes",
                "Symptoms appear while bending down",
                "Inability to walk after meals",
                "Swelling in legs",
                "Tiredness",
                "Lack of sleep",
                "Recent history of hospitalization for ACS/LVF"
            ],
            "hpi": {
                "chest_pain": "No",
                "frequency_per_week": "nil",
                "nitroglycerin_per_week": "nil",
                "walking_time": ""
            },
            "ros": {
                "initial_assessment": True,
                "sections": [
                    {
                        "category": "General",
                        "include_header": True,
                        "items": ["Weight Loss", "Weight Gain", "Cold Intolerance", "Poor Appetite"]
                    },
                    {
                        "category": "Gastroenterology",
                        "include_header": True,
                        "items": ["Abdominal Pain", "Bloating", "Black Stool"]
                    },
                    {
                        "category": "Cardiovascular",
                        "include_header": True,
                        "items": ["Exertional Angina", "Orthopnea", "Paroxysmal Nocturnal Dyspnea", "Palpitations", "Pedal Edema"]
                    },
                    {
                        "category": "Respiratory",
                        "include_header": True,
                        "items": ["Dyspnea on Exertion", "Cough", "Hemoptysis", "Wheezing"]
                    }
                ]
            },
            "pe": {
                "clinical_assessment": True,
                "lungs": ["Auscultation", "Other"],
                "heart": ["Auscultation", "Other"],
                "cardiac_rhythm": ["Pacemaker", "LBBB", "RBBB", "Atrial Fibrillation", "Ventricular Fibrillation", "Atrial Flutter"],
                "heart_block": ["First - Degree", "Second - Degree", "Third - Degree", "Other"]
            }
        })
    },
    {
        "code": "TMT_PRACTICE",
        "name": "Treadmill Test ( TMT )_Practice",
        "kind": "template",
        "content": json.dumps({
            "type": "Review of Systems",
            "name": "Treadmill Test ( TMT )_Practice",
            "sections": [
                {
                    "title": "Indication for Test",
                    "items": ["Exertional Chest Pain", "Evaluation of CAD", "Post-Revascularization", "Arrhythmia Assessment"]
                },
                {
                    "title": "Protocol Used",
                    "items": ["Standard Bruce Protocol", "Modified Bruce Protocol", "Naughton Protocol"]
                },
                {
                    "title": "Test Parameters",
                    "expanded": True,
                    "interactive_items": [
                        { "label": "Age-Predicted Maximum Heart Rate (APMHR)", "unit": "bpm", "formula": "( 220 – age )", "type": "inline_number" },
                        { "label": "Target Heart Rate ( 85% predicted - Vigorous exercise )", "unit": "bpm", "formula": "( 220 – age ) x 0.85", "type": "inline_number" },
                        { "label": "Maximum Heart Rate Achieved", "unit": "bpm", "type": "inline_number" },
                        { "label": "Maximum Blood Pressure Achieved", "unit": "mmHg", "type": "inline_dual", "dual_labels": ["Systolic", "Diastolic"] },
                        { "label": "Total Exercise Time", "unit": "minutes (Bruce Protocol)", "type": "inline_number" },
                        { "label": "% of Age-Predicted Maximum Heart Rate", "unit": "%", "formula": "Max HR Achieved / APMHR x 100", "type": "inline_number" },
                        { "label": "Rate-Limiting Medications", "type": "inline_text" }
                    ]
                },
                {
                    "title": "Exercise Tolerance / METs",
                    "items": ["< 5 METs (Poor)", "5 - 7 METs (Fair)", "7 - 10 METs (Good)", "> 10 METs (Excellent)"]
                }
            ]
        })
    },
    {
        "code": "VASO_EECP_SOAP",
        "name": "Vaso-Meditech EECP SOAP_Practice",
        "kind": "template",
        "content": json.dumps({
            "type": "SOAP Note",
            "name": "Vaso-Meditech EECP SOAP_Practice",
            "description": "Standardized Vaso-Meditech Enhanced External Counterpulsation protocol."
        })
    },
    { "code": "DIAB_MGMT", "name": "Diabetes Management Template_Practice", "kind": "template", "content": "Comprehensive Type 2 Diabetes protocol, HbA1c review, and microvascular screening." },
    { "code": "DIET_ANEMIA", "name": "Diet for Anemia_Practice", "kind": "template", "content": "Dietary iron rich guidelines and counseling." },
    { "code": "DIET_BP", "name": "Diet for BP Patient_Practice", "kind": "template", "content": "DASH diet guidelines, sodium restriction (<2g/day), potassium optimization." },
    { "code": "DIET_CHOL", "name": "Diet For Cholesterol_Practice", "kind": "template", "content": "Low saturated fat, zero trans fat, soluble fiber cardiac diet." },
    { "code": "DIET_DIAB", "name": "Diet for Diabetes_Practice", "kind": "template", "content": "Low glycemic index, balanced carbohydrate counting." },
    { "code": "DIET_HEART", "name": "Diet for Healthy Heart/Healthy Life_Practice", "kind": "template", "content": "Heal Your Heart Mediterranean lifestyle dietary prescription." },
    { "code": "DIET_KIDNEY", "name": "Diet for Kidney Disease_Practice", "kind": "template", "content": "Renal nutrition guidelines: protein titration, phosphorus & potassium control." },
    { "code": "DIET_THYROID", "name": "Diet for Thyroid Problem_Practice", "kind": "template", "content": "Iodine, selenium, and nutritional support for hypothyroidism." },
    { "code": "DIET_HF", "name": "Heart Failure Patient Diet_Practice", "kind": "template", "content": "Fluid restriction (1.5 - 2L/day) and low sodium diet for Congestive Heart Failure." }
]

def seed_templates():
    with SessionLocal() as db:
        lock_writes(db)
        facilities = db.query(m.Facility).all()
        print(f"Found {len(facilities)} facilities.")
        for f in facilities:
            for t in PRACTICE_TEMPLATES:
                existing = db.query(m.Catalog).filter_by(facility_id=f.id, kind='template', code=t['code']).first()
                if existing:
                    existing.name = t['name']
                    existing.content = t['content']
                    existing.active = True
                else:
                    db.add(m.Catalog(
                        facility_id=f.id,
                        kind='template',
                        code=t['code'],
                        name=t['name'],
                        content=t['content'],
                        active=True
                    ))
        db.commit()
        print("Practice templates successfully seeded into database.")

if __name__ == "__main__":
    seed_templates()
