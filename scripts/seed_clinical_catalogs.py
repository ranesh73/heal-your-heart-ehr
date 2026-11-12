"""
Seed clinical formulary catalogs (Injections, Medications, Vaccines) across all facilities.
Ensures autocomplete dropdowns in Add Injection, Add Medication, and Add Vaccine work out of the box.
"""

import sys
import os
from pathlib import Path

# Setup backend paths
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
os.environ["PYTHONPATH"] = str(backend_dir)
if "EHR_DATA_DIR" not in os.environ:
    os.environ["EHR_DATA_DIR"] = str(backend_dir / "data")

from app.db import SessionLocal, lock_writes
from app import models as m

INJECTIONS = [
    ("FONDAFLO", "Fondaflo 2.5 Injection", "Fondaparinux Sodium 2.5mg/0.5ml", "Subcutaneous (SC)", "Left/Right Abdomen", "Single dose pre-procedure"),
    ("TRESIBA", "Tresiba 100IU/ml Flextouch", "Insulin Degludec 100 U/ml", "Subcutaneous (SC)", "Abdomen / Thigh", "Daily basal insulin"),
    ("CLEXANE40", "Clexane 40mg Injection", "Enoxaparin Sodium 40mg/0.4ml", "Subcutaneous (SC)", "Anterolateral abdominal wall", "Anticoagulant prophylaxis"),
    ("LANTUS", "Lantus Solostar 100IU/ml", "Insulin Glargine 100 U/ml", "Subcutaneous (SC)", "Abdomen / Deltoid", "Once daily bedtime"),
    ("OROFER", "Orofer S 100 Injection", "Iron Sucrose 100mg/5ml", "Intravenous (IV)", "IV Infusion", "Infuse slowly in 100ml NS"),
    ("DYNAPAR", "Dynapar AQ 75mg Injection", "Diclofenac Sodium 75mg/ml", "Intramuscular (IM)", "Gluteal muscle", "Deep gluteal for acute pain"),
    ("LASIX_INJ", "Lasix 20mg/2ml Injection", "Furosemide 20mg", "Intravenous (IV)", "Slow IV Push", "Diuretic therapy"),
    ("OPTINEURON", "Optineuron Injection", "Vitamin B-Complex with B12", "Intramuscular (IM)", "Deltoid / Gluteal", "Vitamin replenishment"),
]

MEDICATIONS = [
    ("TELMA40", "Telma (40 mg) [Telmisartan-40 mg]", "Telmisartan", "40mg", "Oral", "Once daily", "1-0-0-0", "after food", 30, 30, False),
    ("ROSUVA20", "rosuva gold 20 [Aspirin (75mg) + Rosuvastatin (20mg) + Clopidogrel]", "Aspirin + Rosuvastatin + Clopidogrel", "20mg", "Oral", "Once daily", "0-0-0-1", "after food", 30, 30, False),
    ("DIAMICRON", "Diamicron XR MET (80 mg) [Gliclazide-80 mg Metformin 500mg]", "Gliclazide + Metformin", "80/500mg", "Oral", "Once daily", "1-0-0-0", "with food", 30, 30, False),
    ("DYNAGLIPT", "dynaglipt M 20 [Metformin (500mg) + Teneligliptin (20mg)]", "Metformin + Teneligliptin", "500/20mg", "Oral", "Once daily", "0-0-0-1", "after food", 30, 30, False),
    ("FLAVEDON", "Flavedon MR (35 mg) [Trimetazidine-35 mg]", "Trimetazidine", "35mg", "Oral", "Twice daily", "1-0-0-1", "after food", 90, 180, False),
    ("CONCOR25", "Concor (2.5 mg) [Bisoprolol-2.5 mg]", "Bisoprolol", "2.5mg", "Oral", "Once daily", "1-0-0-0", "after food", 30, 30, False),
    ("CONCOR5", "Concor (5 mg) [Bisoprolol-5 mg]", "Bisoprolol", "5mg", "Oral", "Once daily", "1-0-0-0", "after food", 30, 30, False),
    ("GEMERDAPA", "Gemer dapa xr [Dapagliflozin 10 + Glimepiride 2 + Metformin 500]", "Dapagliflozin + Glimepiride + Metformin", "XR", "Oral", "Once daily", "1-0-0-0", "with food", 30, 30, False),
    ("SITAXAM", "Sitaxa M 50mg [Sitagliptin (50mg)]", "Sitagliptin", "50mg", "Oral", "Once daily", "1-0-0-0", "with meals", 30, 30, False),
    ("ECOSPRIN75", "Ecosprin 75 [Aspirin-75 mg]", "Aspirin", "75mg", "Oral", "Once daily", "0-0-0-1", "after dinner", 30, 30, False),
    ("ATORVA20", "Atorva 20 [Atorvastatin-20 mg]", "Atorvastatin", "20mg", "Oral", "Once daily", "0-0-0-1", "at bedtime", 30, 30, False),
    ("BRILINTA90", "Brilinta 90mg [Ticagrelor-90 mg]", "Ticagrelor", "90mg", "Oral", "Twice daily", "1-0-0-1", "with or without food", 30, 60, False),
    ("SORBITRATE", "Sorbitrate 5mg [Isosorbide Dinitrate-5 mg]", "Isosorbide Dinitrate", "5mg", "Sublingual", "SOS", "0-0-0-0", "sublingual for chest pain", 10, 10, False),
    ("METPURE25", "Metpure XL 25 [Metoprolol Succinate-25 mg]", "Metoprolol", "25mg", "Oral", "Once daily", "1-0-0-0", "after breakfast", 30, 30, False),
    ("RAMIPRES5", "Ramipres 5 [Ramipril-5 mg]", "Ramipril", "5mg", "Oral", "Once daily", "1-0-0-0", "morning", 30, 30, False),
    ("FLEXD", "Flex D [cholecalciferol 2000 IU]", "Cholecalciferol", "2000 IU", "Oral", "Once daily", "1-0-0-0", "after food", 30, 30, False),
    ("FLEXTINE", "Flextine (20 mg) [Fluoxetine Hcl BP-20 mg]", "Fluoxetine Hcl", "20mg", "Oral", "Once daily", "1-0-0-0", "morning", 30, 30, False),
    ("FLEXIFEN", "Flexifen (100 MG) [Aceclofenac-100 mg]", "Aceclofenac", "100mg", "Oral", "Twice daily", "1-0-0-1", "after food", 10, 20, False),
    ("COQ10", "CoQ10 100mg [Coenzyme Q10]", "Coenzyme Q10", "100mg", "Oral", "Once daily", "1-0-0-0", "after food", 30, 30, True),
    ("OMEGA3", "Omega-3 Fish Oil 1000mg [EPA + DHA]", "Omega-3 Fatty Acids", "1000mg", "Oral", "Once daily", "0-0-0-1", "with dinner", 30, 30, True),
    ("MAGNESIUM", "Magnesium Glycinate 400mg", "Magnesium Glycinate", "400mg", "Oral", "Once daily", "0-0-0-1", "at bedtime", 30, 30, True),
    ("LARGININE", "L-Arginine 500mg", "L-Arginine", "500mg", "Oral", "Twice daily", "1-0-0-1", "empty stomach", 30, 60, True),
]

VACCINES = [
    ("FLU_QUAD", "Influenza, seasonal, quadrivalent (FluQuadri)", "Flu Quadrivalent", "Intramuscular (IM)", "Left Deltoid", "Annual cardiovascular influenza prophylaxis", "CVX-150"),
    ("FLU_INTRA", "influenza, seasonal, intradermal, preservative free", "Flu Intradermal", "Intradermal (ID)", "Left Deltoid", "Intradermal seasonal protection", "CVX-144"),
    ("RABIES", "Rabies - IM fibroblast culture (Rabivax-S)", "Rabies Vaccine", "Intramuscular (IM)", "Right Deltoid", "Post/Pre-exposure immunization", "CVX-18"),
    ("PCV20", "Pneumococcal Conjugate PCV20 (Prevnar 20)", "PCV20", "Intramuscular (IM)", "Right Deltoid", "Adult cardiology pneumococcal prophylaxis", "CVX-216"),
    ("PPSV23", "Pneumococcal Polysaccharide (Pneumovax 23)", "PPSV23", "Intramuscular (IM)", "Right Deltoid", "High-risk cardiac polysaccharide vaccine", "CVX-33"),
    ("HEPB", "Hepatitis B Adult Recombinant (Engerix-B 20mcg)", "Hep B Adult", "Intramuscular (IM)", "Left Deltoid", "Standard adult 3-dose series", "CVX-43"),
    ("TDAP", "Tdap (Tetanus, Diphtheria, Pertussis - Boostrix)", "Tdap", "Intramuscular (IM)", "Left Deltoid", "10-year adult booster", "CVX-115"),
]

def seed_catalogs():
    with SessionLocal() as db:
        lock_writes(db)
        facilities = db.query(m.Facility).all()
        if not facilities:
            print("No facilities found! Please run migrations and seed.py first.")
            return

        added_inj = 0
        added_med = 0
        added_vac = 0

        for f in facilities:
            # 1. Injections
            for code, name, gen, route, site, notes in INJECTIONS:
                existing = db.query(m.Catalog).filter_by(facility_id=f.id, kind="injection", code=code).first()
                if not existing:
                    db.add(m.Catalog(
                        facility_id=f.id,
                        kind="injection",
                        code=code,
                        name=name,
                        content=f"{gen}|{route}|{site}|{notes}",
                        price_paise=0,
                        active=True
                    ))
                    added_inj += 1

            # 2. Medications
            for code, name, gen, dose, route, freq, maen, timing, dur, qty, is_supp in MEDICATIONS:
                existing = db.query(m.Catalog).filter_by(facility_id=f.id, kind="medication", code=code).first()
                if not existing:
                    db.add(m.Catalog(
                        facility_id=f.id,
                        kind="medication",
                        code=code,
                        name=name,
                        content=f"{gen}|{dose}|{route}|{freq}|{maen}|{timing}|{dur}|{qty}|{int(is_supp)}",
                        price_paise=0,
                        active=True
                    ))
                    added_med += 1

            # 3. Vaccines
            for code, name, gen, route, site, notes, cvx in VACCINES:
                existing = db.query(m.Catalog).filter_by(facility_id=f.id, kind="vaccine", code=code).first()
                if not existing:
                    db.add(m.Catalog(
                        facility_id=f.id,
                        kind="vaccine",
                        code=code,
                        name=name,
                        content=f"{gen}|{route}|{site}|{notes}|{cvx}",
                        price_paise=0,
                        active=True
                    ))
                    added_vac += 1

        db.commit()
        print(f"Catalog seeding complete! Added {added_inj} injections, {added_med} medications, and {added_vac} vaccines across {len(facilities)} facilities.")

if __name__ == "__main__":
    seed_catalogs()

