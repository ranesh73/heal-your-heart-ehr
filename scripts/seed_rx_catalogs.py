"""
Idempotently seed master supplements, prescription templates, supplement templates,
and link inventory items in Heal Your Heart EHR.
Can be executed multiple times safely without creating duplicates.
"""
import sys
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
os.environ["PYTHONPATH"] = str(backend_dir)
if "EHR_DATA_DIR" not in os.environ:
    os.environ["EHR_DATA_DIR"] = str(backend_dir / "data")

from app.db import SessionLocal, lock_writes
from app import models as m


def normalize_name(s: str) -> str:
    return re.sub(r"[\s\-_/\\]+", " ", s.strip().lower())


SUPPLEMENTS_DATA = [
    ("CoQ10 Ubiquinol 100mg Capsule", "Capsule", "100mg", "Oral"),
    ("L-Arginine 1000mg Sachet", "Sachet", "1000mg", "Oral"),
    ("Omega-3 Fish Oil 1000mg [EPA + DHA]", "Capsule", "1000mg", "Oral"),
    ("Magnesium Taurate 200mg Tablet", "Tablet", "200mg", "Oral"),
    ("Duphalac Fiber oral soln 200 ml solution [ Manufactured ]", "Solution", "200ml", "Oral"),
    ("Vitamin D3 60,000 IU Oral Solution", "Solution", "60000 IU", "Oral"),
    ("B-Complex Forte with Vitamin C Capsule", "Capsule", "Forte", "Oral"),
    ("Alpha Lipoic Acid 300mg Capsule", "Capsule", "300mg", "Oral"),
    ("Curcumin 500mg with Piperine Tablet", "Tablet", "500mg", "Oral"),
    ("Potassium Magnesium Citrate Sachet", "Sachet", "10g", "Oral"),
    ("Magnesium Glycinate 400mg Tablet", "Tablet", "400mg", "Oral"),
    ("Hawthorn Berry Extract 450mg Capsule", "Capsule", "450mg", "Oral"),
    ("Garlic Extract (Allicin) 500mg Tablet", "Tablet", "500mg", "Oral"),
    ("Zinc Picolinate 50mg Tablet", "Tablet", "50mg", "Oral"),
    ("Selenium 200mcg Tablet", "Tablet", "200mcg", "Oral"),
    ("Resveratrol 250mg Capsule", "Capsule", "250mg", "Oral"),
    ("Folic Acid 5mg Tablet", "Tablet", "5mg", "Oral"),
    ("Methylcobalamin (B12) 1500mcg Sublingual", "Tablet", "1500mcg", "Sublingual"),
    ("Melatonin 3mg Tablet", "Tablet", "3mg", "Oral"),
    ("Ashwagandha 500mg Extract Capsule", "Capsule", "500mg", "Oral"),
    ("Psyllium Husk Powder 100g", "Powder", "100g", "Oral"),
    ("Calcium Citrate Malate + Vit D3 Tablet", "Tablet", "1250mg", "Oral"),
    ("Glucosamine + Chondroitin Sulfate 500/400mg", "Tablet", "500/400mg", "Oral"),
    ("Iron Bisglycinate + Folic Acid Capsule", "Capsule", "30mg", "Oral"),
    ("Vitamin E 400 IU Capsule", "Capsule", "400 IU", "Oral"),
]


def seed_rx():
    print("=== Idempotently Seeding RX Supplements, Templates & Inventory Links ===")
    with SessionLocal() as db:
        lock_writes(db)

        # 1. Facilities
        facilities = db.query(m.Facility).all()
        primary_facility = facilities[0] if facilities else None

        # 2. Seed Supplements
        added_supplements = 0
        supp_map = {}
        for name, dosage_form, strength, route in SUPPLEMENTS_DATA:
            norm = normalize_name(name)
            existing = db.query(m.SupplementCatalog).filter(
                (m.SupplementCatalog.normalized_name == norm) | (m.SupplementCatalog.name == name)
            ).first()
            if not existing:
                supp = m.SupplementCatalog(
                    id=str(uuid.uuid4()),
                    name=name,
                    normalized_name=norm,
                    dosage_form=dosage_form,
                    strength=strength,
                    route=route,
                    is_active=True,
                    version=1,
                )
                db.add(supp)
                db.flush()
                supp_map[norm] = supp
                added_supplements += 1
            else:
                supp_map[norm] = existing

        print(f"✓ Supplements: {added_supplements} added (Total: {db.query(m.SupplementCatalog).count()})")

        # 3. Seed Prescription Templates
        # Find some drugs from medicine_catalogs
        meds = db.query(m.MedicineCatalog).all()
        med_dict = {m.product_name.lower(): m for m in meds}

        presc_template_defs = [
            ("HUH - CAD Prevention Protocol", [
                ("ROSUVASTATIN 20 + CLOPIDOGREL 75", "1 Capsule", "Oral", "Once daily", "0-0-0-1", "30 Day(s)", "Post-dinner with water"),
                ("TELMISARTAN  40 mg &CLINIDIPINE 10 mg", "1 Tablet", "Oral", "Once daily", "1-0-0-0", "30 Day(s)", "Morning after breakfast"),
                ("ISOSORBIDE MONONITRATE 30 MG", "1 Tablet", "Oral", "Once daily", "1-0-0-0", "30 Day(s)", "Morning after food"),
            ]),
            ("Post-EECP Maintenance Rx", [
                ("ATORVASTATIN 10+CLOPIDOGREAL 75 MG", "1 Capsule", "Oral", "Once daily", "0-0-0-1", "30 Day(s)", "Bedtime after dinner"),
                ("DAPAGLIFLOZIN 10 MG", "1 Tablet", "Oral", "Once daily", "1-0-0-0", "30 Day(s)", "Morning with meals"),
                ("TRIMETAZIDINE 35mg", "1 Tablet", "Oral", "Twice daily", "1-0-0-1", "60 Day(s)", "Cellular anti-ischemic support"),
            ]),
            ("Cardio-Diabetic Standard Protocol", [
                ("VOGLIBOSE 0.3+METFORMIN 500 MG", "1 Tablet", "Oral", "Twice daily", "1-0-1-0", "30 Day(s)", "Just before meals"),
                ("SITAGLIPTIN 50 MG + METFORMIN 500 MG", "1 Tablet", "Oral", "Once daily", "1-0-0-0", "30 Day(s)", "Morning breakfast"),
            ])
        ]

        added_pt = 0
        for t_name, items in presc_template_defs:
            for d_name, dose, route, freq, maen, dur, notes in items:
                # Find matching drug
                match = None
                for k, v in med_dict.items():
                    if d_name.lower() in k or k in d_name.lower():
                        match = v
                        break
                
                cat_id = match.id if match else None
                gen_name = match.product_name if match else d_name

                existing = db.query(m.PrescriptionTemplate).filter_by(
                    template_name=t_name,
                    drug_name=d_name
                ).first()

                if not existing:
                    pt = m.PrescriptionTemplate(
                        id=str(uuid.uuid4()),
                        facility_id=primary_facility.id if primary_facility else None,
                        template_name=t_name,
                        catalogue_id=cat_id,
                        drug_name=d_name,
                        generic_name=gen_name,
                        dosage=dose,
                        route=route,
                        frequency=freq,
                        maen=maen,
                        duration=dur,
                        instructions=notes,
                        is_active=True,
                        version=1
                    )
                    db.add(pt)
                    added_pt += 1

        print(f"✓ Prescription Templates: {added_pt} items added")

        # 4. Seed Supplement Templates
        supp_template_defs = [
            ("Syrub / oint / vit (EECP Supplement Pack)", [
                ("Duphalac Fiber oral soln 200 ml solution [ Manufactured ]", "1 tablespoon", "Oral", "At Bedtime", "1 day(s)", "Bowel regularity post-procedure"),
                ("CoQ10 Ubiquinol 100mg Capsule", "1 capsule", "Oral", "Once daily", "30 day(s)", "Mitochondrial cardiac bioenergetic support"),
                ("L-Arginine 1000mg Sachet", "1 sachet", "Oral", "Twice daily", "30 day(s)", "Nitric oxide endothelium vascular tone"),
                ("Omega-3 Fish Oil 1000mg [EPA + DHA]", "1 capsule", "Oral", "Once daily", "30 day(s)", "Triglyceride lowering and membrane stability"),
                ("Magnesium Taurate 200mg Tablet", "1 tablet", "Oral", "Once daily", "30 day(s)", "Arrhythmia stabilization and muscle relaxation"),
            ]),
            ("Cardiac Wellness Vitality Pack", [
                ("Alpha Lipoic Acid 300mg Capsule", "1 capsule", "Oral", "Once daily", "30 day(s)", "Antioxidant cellular defense"),
                ("Curcumin 500mg with Piperine Tablet", "1 tablet", "Oral", "Once daily", "30 day(s)", "Anti-inflammatory endothelial protection"),
                ("Vitamin D3 60,000 IU Oral Solution", "1 solution", "Oral", "Weekly", "8 week(s)", "Cardiovascular calcium regulation"),
            ])
        ]

        added_st = 0
        for t_name, items in supp_template_defs:
            for s_name, dose, route, freq, dur, notes in items:
                norm = normalize_name(s_name)
                matched_supp = supp_map.get(norm)
                if not matched_supp:
                    for k, v in supp_map.items():
                        if k in norm or norm in k:
                            matched_supp = v
                            break

                cat_id = matched_supp.id if matched_supp else None

                existing = db.query(m.SupplementTemplate).filter_by(
                    template_name=t_name,
                    supplement_name=s_name
                ).first()

                if not existing:
                    st = m.SupplementTemplate(
                        id=str(uuid.uuid4()),
                        facility_id=primary_facility.id if primary_facility else None,
                        template_name=t_name,
                        catalogue_id=cat_id,
                        supplement_name=s_name,
                        dosage=dose,
                        route=route,
                        frequency=freq,
                        duration=dur,
                        instructions=notes,
                        is_active=True,
                        version=1
                    )
                    db.add(st)
                    added_st += 1

        print(f"✓ Supplement Templates: {added_st} items added")

        # 5. Link Inventory Items to Drugs and Supplements
        # Create a few authentic inventory items with catalogue_id if they don't exist
        inventory_seed = [
            ("ROSUVASTATIN 20 + CLOPIDOGREL 75", "rosumark cv 20", "Drug", "Tablet", 100, 25.0, 32.5),
            ("TELMISARTAN  40 mg &CLINIDIPINE 10 mg", "TELMIDOZ-C", "Drug", "Tablet", 150, 12.0, 18.0),
            ("ISOSORBIDE DINARATE 5 MG", "ISOSORBIDE DINARATE 5 MG oral tablet", "Drug", "Tablet", 200, 4.5, 7.0),
            ("CoQ10 Ubiquinol 100mg Capsule", "CoQ10 100mg", "Supplement", "Capsule", 80, 45.0, 65.0),
            ("Duphalac Fiber oral soln 200 ml solution [ Manufactured ]", "Duphalac Fiber", "Supplement", "Solution", 50, 180.0, 240.0),
            ("Omega-3 Fish Oil 1000mg [EPA + DHA]", "Omega-3 1000mg", "Supplement", "Capsule", 120, 22.0, 35.0),
        ]

        linked_inv = 0
        if primary_facility:
            for item_name, trade_name, group, dose_form, qty, cp, rp in inventory_seed:
                # Find matching catalogue id
                cat_id = None
                if group == "Drug":
                    for k, v in med_dict.items():
                        if item_name.lower() in k or k in item_name.lower():
                            cat_id = v.id
                            break
                else:
                    norm = normalize_name(item_name)
                    supp = supp_map.get(norm)
                    if not supp:
                        for k, v in supp_map.items():
                            if k in norm or norm in k:
                                supp = v
                                break
                    if supp:
                        cat_id = supp.id

                existing_inv = db.query(m.InventoryItem).filter_by(
                    facility_id=primary_facility.id,
                    name=item_name
                ).first()

                if not existing_inv:
                    new_item = m.InventoryItem(
                        id=str(uuid.uuid4()),
                        facility_id=primary_facility.id,
                        name=item_name,
                        trade_name=trade_name,
                        category=group,
                        group_name=group,
                        unit="Strip / Bottle",
                        dose_form=dose_form,
                        cost_price=cp,
                        retail_price=rp,
                        order_quantity=qty,
                        reorder_level=20,
                        is_active=True,
                        catalogue_id=cat_id,
                        version=1
                    )
                    db.add(new_item)
                    linked_inv += 1
                elif cat_id and not existing_inv.catalogue_id:
                    existing_inv.catalogue_id = cat_id
                    linked_inv += 1

        db.commit()
        print(f"✓ Inventory Links: {linked_inv} items created/linked.")
        print(">>> RX SEED COMPLETE AND FULLY IDEMPOTENT! <<<")


if __name__ == "__main__":
    seed_rx()

