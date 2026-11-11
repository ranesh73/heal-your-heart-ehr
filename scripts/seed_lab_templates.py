import sys
import os
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
os.environ["PYTHONPATH"] = str(backend_dir)
if "EHR_DATA_DIR" not in os.environ:
    os.environ["EHR_DATA_DIR"] = str(backend_dir / "data")

from app.db import SessionLocal, lock_writes
from app import models as m

LAB_TEMPLATES = [
    {
        "code": "TPL_AFB_SPUTUM",
        "name": "AFB Sputum",
        "category": "Microbiology",
        "tests": ["AFB Suptum"]
    },
    {
        "code": "TPL_ALLERGY_PROFILE",
        "name": "Allergy Profile",
        "category": "Immunology",
        "tests": ["Immunoglobulin E (IgE)", "Total Eosinophil Count (AEC)"]
    },
    {
        "code": "TPL_ANEMIA_PROFILE",
        "name": "Anemia Profile",
        "category": "Haematology",
        "tests": ["Complete Hemogram", "Ferritin", "Iron", "Total Iron Binding Capacity(TIBC)", "Unsaturated Iron Binding Capacity (UIBC)"]
    },
    {
        "code": "TPL_BLOOD_GROUP",
        "name": "Blood Group",
        "category": "HUH Blood Group",
        "tests": ["Blood Group", "RH Type"]
    },
    {
        "code": "TPL_EGFR",
        "name": "eGFR",
        "category": "HUH-CD-Renal Function Test",
        "tests": ["Glomerular Filtration Rate(eGFR)", "Creatinine", "BUN-Blood Urea Nitrogen"]
    },
    {
        "code": "TPL_HEART_FAILURE_PLUS",
        "name": "Heart Failure Plus",
        "category": "BioChemistry",
        "tests": ["HUH-N Terminal Pro B Natriuretic Peptide", "Cardiac Troponin I", "Creatine Kinase-MB", "Sodium", "Chloride"]
    },
    {
        "code": "TPL_HUH_EECP_ROUTINE",
        "name": "HUH - EECP Routine",
        "category": "HUH Lab Tests",
        "tests": ["HUH - Complete Hemogram", "HUH - Lipid Profile", "HUH - Renal Function", "HUH - Diabetic Profile", "HUH - Electrolytes"]
    },
    {
        "code": "TPL_HUH_EECP_ROUTINE_OUT",
        "name": "HUH - EECP Routine Out",
        "category": "HUH Lab Tests",
        "tests": ["HUH - Complete Hemogram", "HUH - Lipid Profile", "HUH - Renal Function", "HUH - Diabetic Profile"]
    },
    {
        "code": "TPL_HUH_CARDIO_DIABETIC",
        "name": "HUH-Cardio Diabetic",
        "category": "HUH-Cardio Diabetic",
        "tests": [
            "HUH-CD-Bone Marker",
            "HUH-CD-Cardiac Risk Marker",
            "HUH-CD-Complete Hemogram",
            "HUH-CD-Diabetes",
            "HUH-CD-Electrolytes",
            "HUH-CD-Free Thyroid",
            "HUH-CD-Gout Marker",
            "HUH-CD-Iron Deficiency Profile",
            "HUH-CD-Kidney Microvascular",
            "HUH-CD-Lipid Profile",
            "HUH-CD-Liver Function Test",
            "HUH-CD-Pancreas Profile",
            "HUH-CD-Renal Function Test",
            "HUH-CD-Trace Micronutrients",
            "HUH-CD-Urine Routine",
            "HUH-CD-Vitamins"
        ]
    },
    {
        "code": "TPL_HUH_CD_DIABETIC_ROUTINE",
        "name": "HUH-CD Diabetic Routine",
        "category": "HUH-CD-Diabetic Routine",
        "tests": ["Fasting Blood Sugar", "HbA1c", "Postprandial Blood Sugar"]
    },
    {
        "code": "TPL_HUH_CD_DIABETIC",
        "name": "HUH-CD-Diabetic",
        "category": "HUH-CD-Diabetic",
        "tests": [
            "Fasting Blood Sugar",
            "Postprandial Sugar",
            "HbA1c",
            "Estimated Average Glucose",
            "Fasting Insulin",
            "C-Peptide",
            "Insulin Resistance",
            "Beta Cell Function",
            "Fructosamine",
            "Mean Plasma Glucose",
            "Ultrasensitive Insulin"
        ]
    },
    {
        "code": "TPL_LAB_ORDERS",
        "name": "Lab Orders",
        "category": "HUH Lab Tests",
        "tests": ["HUH - Lipid Profile", "HUH - Renal Function", "HUH - Complete Hemogram"]
    },
    {
        "code": "TPL_MASTER_HEALTH_CHECKUP",
        "name": "Master Health Checkup",
        "category": "Master Health Checkup",
        "tests": [
            "HUH-CD-Complete Hemogram",
            "HUH-CD-Lipid Profile",
            "HUH-CD-Liver Function Test",
            "HUH-CD-Renal Function Test",
            "HUH-CD-Diabetes",
            "HUH-CD-Cardiac Risk Marker",
            "HUH-CD-Free Thyroid",
            "HUH-CD-Urine Routine"
        ]
    }
]

def seed():
    with SessionLocal() as db:
        lock_writes(db)
        facilities = db.query(m.Facility).all()
        print(f"Seeding lab order templates across {len(facilities)} facilities...")
        for f in facilities:
            for tpl in LAB_TEMPLATES:
                content = json.dumps({
                    "template_name": tpl["name"],
                    "category": tpl["category"],
                    "tests": tpl["tests"]
                })
                existing = db.query(m.Catalog).filter_by(
                    facility_id=f.id,
                    kind="lab_template",
                    code=tpl["code"]
                ).first()
                if existing:
                    existing.name = tpl["name"]
                    existing.content = content
                    existing.active = True
                else:
                    db.add(m.Catalog(
                        facility_id=f.id,
                        kind="lab_template",
                        code=tpl["code"],
                        name=tpl["name"],
                        content=content,
                        active=True
                    ))
        db.commit()
        print("Successfully seeded lab order templates!")

if __name__ == "__main__":
    seed()

