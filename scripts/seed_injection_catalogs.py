"""Seed master injection catalog and templates into the centralized database idempotently."""
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))

from backend.app.db import SessionLocal
from backend.app import models as m

APPROVED_INJECTIONS = [
    # Reference Catalogue Items
    ("Adenosin", "Adenosin"),
    ("Apidra Solostar 100IU/ml Injection", "Apidra Solostar 100IU/ml Injection"),
    ("Buscopan 20mg Injection", "Buscopan 20mg Injection"),
    ("Clexane 40 mg (0.4ml)", "Clexane 40 mg (0.4ml)"),
    ("Clexane 60 mg (0.6 ml)", "Clexane 60 mg (0.6 ml)"),
    ("Cresp 40 mcg Darbepoetin alfa", "Cresp 40 mcg Darbepoetin alfa"),
    ("Decadron 4 mg x 1 ml", "Decadron 4 mg x 1 ml"),
    ("Deriphyllin 50 mg x 2 ml", "Deriphyllin 50 mg x 2 ml"),
    ("diclofenac", "diclofenac"),
    ("Drotin Injection", "Drotin Injection"),
    ("Drotin Injection 40 mg (2 ml)", "Drotin Injection 40 mg (2 ml)"),
    # Hospital Sheet Identifiable Injectables
    ("Atropine sulphate 0.5mg", "Atropine sulphate 0.5mg"),
    ("Ceftriaxone 1 gm", "Ceftriaxone 1 gm"),
    ("Dexamethasone", "Dexamethasone"),
    ("Frusemide", "Frusemide"),
    ("Calcium Gluconate 10 ML", "Calcium Gluconate 10 ML"),
    ("Paracetamol Infusion", "Paracetamol Infusion"),
    ("Potassium Chloride 10mg", "Potassium Chloride 10mg"),
    ("Cyanocobalamine Inj 30 ml", "Cyanocobalamine Inj 30 ml"),
    ("Iron Sucrose Injecting", "Iron Sucrose Injecting"),
    ("Tramadol", "Tramadol"),
    ("Para Infusion 1 gm", "Para Infusion 1 gm"),
    ("Tazo 4.5 GM", "Tazo 4.5 GM"),
    ("Deriphyllin", "Deriphyllin"),
    ("Diclofenac", "Diclofenac"),
    ("Gentamicin", "Gentamicin"),
    ("Amikacin 500 mg", "Amikacin 500 mg"),
    ("Dopamine", "Dopamine"),
    ("Adrenaline", "Adrenaline"),
    ("Hydrocortisone 100mg", "Hydrocortisone 100mg"),
    ("Hyoscine Butylbromide", "Hyoscine Butylbromide"),
    ("Sodium Chloride Injection 3%", "Sodium Chloride Injection 3%"),
    ("Dobutamine", "Dobutamine"),
    ("Nitropus", "Nitropus"),
    ("Aminophylline", "Aminophylline"),
    ("Avil", "Avil"),
    # Practice Formulary Core Items
    ("Fondaflo 2.5 Injection", "Fondaflo 2.5 Injection"),
    ("Lasix 20 mg ( 10 mg x 2 ml )", "Lasix 20 mg ( 10 mg x 2 ml )"),
    ("Orofer FCM 1K Injection 20 ml", "Orofer FCM 1K Injection 20 ml"),
    ("Heparin Sodium 5,000 IU/mL", "Heparin Sodium 5,000 IU/mL"),
    ("Dynapar AQ 75mg Injection", "Dynapar AQ 75mg Injection"),
    ("Optineuron Injection", "Optineuron Injection"),
]

UNCERTAIN_INJECTIONS = [
    ("Doxycycline Vitamin C", "Doxycycline Vitamin C"),
    ("Hyoline", "Hyoline"),
    ("Norad", "Norad"),
    ("Renerve Plus", "Renerve Plus"),
    ("Weisphyl", "Weisphyl"),
    ("Augumed", "Augumed"),
    ("Metrogel", "Metrogel"),
    ("Aminosilane", "Aminosilane"),
    ("Loading Dose", "Loading Dose"),
]

DEFAULT_TEMPLATES = [
    {
        "template_name": "Fondaflo SC Protocol",
        "medication_name": "Fondaflo 2.5 Injection",
        "dosage": "2.5 mg / 0.5 ml",
        "route": "Subcutaneous (SC)",
        "site": "Abdomen - Lower Right",
        "frequency": "Once a day",
        "nurse_instructions": "Do not expel air bubble before injection. Rotate abdominal wall injection sites.",
    },
    {
        "template_name": "Clexane DVT Prophylaxis",
        "medication_name": "Clexane 40 mg (0.4ml)",
        "dosage": "40 mg / 0.4 ml",
        "route": "Subcutaneous (SC)",
        "site": "Abdomen - Lower Left",
        "frequency": "Once a day",
        "nurse_instructions": "Alternate between left and right anterolateral abdominal wall. Post-intervention anticoagulation prophylaxis.",
    },
    {
        "template_name": "Lasix IV Protocol",
        "medication_name": "Lasix 20 mg ( 10 mg x 2 ml )",
        "dosage": "2.0 ml",
        "route": "Intravenous (IV)",
        "site": "Left Deltoid",
        "frequency": "Once / Stat",
        "nurse_instructions": "Slow IV push. Monitor blood pressure and pulse rate post administration.",
    },
    {
        "template_name": "Orofer Iron Infusion",
        "medication_name": "Orofer FCM 1K Injection 20 ml",
        "dosage": "1.0 gm",
        "route": "Intravenous (IV)",
        "site": "Left Deltoid",
        "frequency": "Once a week",
        "nurse_instructions": "Dilute in 100 ml normal saline. Infuse slowly over 30 minutes. Flush before and after with 0.9% normal saline.",
    },
    {
        "template_name": "Heparin Anticoagulation",
        "medication_name": "Heparin Sodium 5,000 IU/mL",
        "dosage": "5,000 IU",
        "route": "Subcutaneous (SC)",
        "site": "Abdomen - Lower Left",
        "frequency": "Once / Stat",
        "nurse_instructions": "Rotate injection site daily. Monitor aPTT levels closely.",
    },
]


def seed_injection_catalogs():
    with SessionLocal() as db:
        admin_user = db.query(m.User).filter_by(role="admin").first()
        admin_id = admin_user.id if admin_user else None

        added_approved = 0
        catalog_map = {}

        # 1. Seed approved active catalogue
        for name, orig in APPROVED_INJECTIONS:
            norm = name.strip().lower()
            existing = db.query(m.InjectionCatalog).filter_by(normalized_name=norm).first()
            if not existing:
                item = m.InjectionCatalog(
                    name=name.strip(),
                    normalized_name=norm,
                    original_source_name=orig,
                    verification_status="verified",
                    is_active=True,
                    created_by=admin_id,
                )
                db.add(item)
                db.flush()
                catalog_map[norm] = item
                added_approved += 1
            else:
                catalog_map[norm] = existing

        # 2. Seed uncertain items (Needs Verification, is_active=False)
        added_uncertain = 0
        for name, orig in UNCERTAIN_INJECTIONS:
            norm = name.strip().lower()
            existing = db.query(m.InjectionCatalog).filter_by(normalized_name=norm).first()
            if not existing:
                item = m.InjectionCatalog(
                    name=name.strip(),
                    normalized_name=norm,
                    original_source_name=orig,
                    verification_status="needs_verification",
                    is_active=False,
                    created_by=admin_id,
                )
                db.add(item)
                added_uncertain += 1

        # 3. Seed default injection templates
        added_templates = 0
        for tmpl in DEFAULT_TEMPLATES:
            existing = db.query(m.InjectionTemplate).filter_by(template_name=tmpl["template_name"]).first()
            if not existing:
                norm = tmpl["medication_name"].strip().lower()
                cat = catalog_map.get(norm)
                t = m.InjectionTemplate(
                    template_name=tmpl["template_name"],
                    catalogue_id=cat.id if cat else None,
                    medication_name=tmpl["medication_name"],
                    dosage=tmpl["dosage"],
                    route=tmpl["route"],
                    site=tmpl["site"],
                    frequency=tmpl["frequency"],
                    nurse_instructions=tmpl["nurse_instructions"],
                    is_active=True,
                    created_by=admin_id,
                )
                db.add(t)
                added_templates += 1

        db.commit()
        print(f"Injection catalog seeding complete! Added {added_approved} approved, {added_uncertain} needs-verification, and {added_templates} templates.")


if __name__ == "__main__":
    seed_injection_catalogs()

