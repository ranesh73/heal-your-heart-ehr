"""
Idempotently seed all 219 exact medicine master catalogue records from Part 10 of the spec,
and seed standard inventory categories into the master database.
"""
from datetime import datetime
from pathlib import Path
import sqlite3
import uuid

MEDICINES_DATA = [
    ("ISOSORBIDE DINARATE 5 MG", "ISOSORBIDE DINARATE 5 MG oral tablet"),
    ("K BIND SACHET", "K BIND SACHET"),
    ("Atarax Anti-Itch Lotion", "Atarax Anti-Itch Lotion"),
    ("ROSUVASTATIN 20 + CLOPIDOGREL 75", "rosumark cv 20"),
    ("TORSEMIDE IP 10 MG", "TORSELIX 10"),
    ("ROSUVASTATIN 40 MG", "ROSUMARK-40"),
    ("RIFAXIMIN 550", "RIFAXIMIN 550 oral tablet"),
    ("Vildagliptin 100", "vinglyn sr 100"),
    ("TELMISARTAN  40 mg &CLINIDIPINE 10 mg", "TELMIDOZ-C"),
    ("SODIUM BICARBONATE 500 mg", "SODINOL -500"),
    ("ALPRAZOLAM  0.5 MG", "ALPRAZOLAM  0.5 MG oral tablet"),
    ("SODIUM ALGINATE SUSPENSION", "GAVISCON SYP"),
    ("NEBIVOLOL HYDROCHLORIDE 5MG", "NEBAWOL - 5 TAB"),
    ("THIOCOLCHICOSIDE  8 MG", "THIOCOLCHICOSIDE  8 MG oral tablet"),
    ("SACUBRITRIL 24+VALSARTAN 26 MG", "SACUBRITRIL 24+VALSARTAN 26 MG oral tablet"),
    ("PROBIOTIC-PREBIOTIC + IMMUNOBIOTIC", "NOVOBIOTIC CAPS"),
    ("EMPAGLIFLOZIN 10 MG", "EMPAGLIFLOZIN 10 MG oral tablet"),
    ("BECOSULE CAP", "BECOSULE CAP oral tablet"),
    ("IVABRADINE TABLETS 5 MG", "IVALINE-5"),
    ("NICORANDIL 10 mg", "NICOPAL 10"),
    ("LINAGLIPTIN 5mg &  DAPAGLIFLOZIN 10mg", "LINALIX - D"),
    ("BISOPROLOL FUMARATE 1.25 MG", "CONCOR 1.25 MG TAB"),
    ("TRIMETAZIDINE 35mg", "TRIMEDON"),
    ("TORSEMIDE 10 MG + SPIRONOLACTONE 25 MG", "TEROMIDE PLUS LS"),
    ("TOLVAPTAN 15 mg", "tolvaptoris"),
    ("ESOMEPRAZOLE (40 MG) , DOMPERIDONE (30 MG)", "ESOZOOM-DSR"),
    ("BISOPROLOL FUMARATE IP 2.5 MG", "BISOZOOM 2.5"),
    ("TORSEMIDE 10 MG + SPIRONOLACTONE 50 MG", "TORSEHEAL PLUS 10"),
    ("NITRO-G 2.6 Oral tablet", "NITRO-G 2.6 Oral tablet"),
    ("NIFEDIPINE", "NIFEDIPINE"),
    ("ETORICOXIB 60+THICOLCHICOSIDE 4 MG", "ETORICOXIB 60+THICOLCHICOSIDE 4 MG oral tablet"),
    ("CARE Q 10", "CARE Q 10 oral tablet"),
    ("BISOPROLOL FUMARATE  2.5  + AMLODIPINE 5", "CONCOR AM 2.5 MG TAB"),
    ("GLIMEPRIDE 2+METFORMIN 500 MG", "GLIMEPRIDE 2+METFORMIN 500 MG oral tablet"),
    ("SACUBRITRIL 48+VALSARTAN52", "SACUBRITRIL 48+VALSARTAN52 oral tablet"),
    ("ATORVASTATIN 10+CLOPIDOGREAL 75 MG", "ELIVAS-CV"),
    ("TORSEMIDE 5 MG", "TORSEMIDE 5 MG oral tablet"),
    ("BISOPROLOL FUMARATE 2.5MG", "BISONOL 2.5MG TAB"),
    ("OMNIGEL OINMENT", "OMNIGEL OINMENT"),
    ("ROSUVASTATIN 20 mg", "ROSUZID - 20"),
    ("DOXOFYLLINE 400mg", "DOXOLENT"),
    ("ISOSORBIDE MONONITRATE 30 MG", "ISOLIX-30"),
    ("PANTOPRAZOLE 40MG", "PAN 40"),
    ("RANOLIZINE 500 MG", "RANZOLIX-500 SR"),
    ("ROSUVASTATIN 10,CLOPIDOGREAL75", "ATR"),
    ("ATORVASTATIN 80 MG", "Atorvastatin  80mg"),
    ("DAPAGLIFLOZIN 10 MG", "DAPALIX 10"),
    ("FRUSEMIDE 40  MG", "FRUSEMIDE 40"),
    ("ROSUVASTATIN 20+ASPIRIN 75+CLOPIDOGREL", "ROSUVASTATIN+ASPIRIN+CLOPIDOGREL 20/75/75 milligram(s) oral tablet"),
    ("BISOPROLOl 5 mg", "Biso Heart .5 MG"),
    ("VOGLIBOSE 0.3+METFORMIN 500 MG", "VOGLIBOSE 0.3+METFORMIN 500 MG oral tablet"),
    ("CHOLECALCIFEROL 6000 IU", "CHOLECALCIFEROL 6000 IU oral capsule"),
    ("FENOFIBRATE 160 MG", "FENODAY - 160 TAB"),
    ("TRIMETAZIDINE 60 MG", "FLAVELIX MR 60"),
    ("OMNIGEL SPRAY", "OMNIGEL SPRAY"),
    ("DAPAGLIFLOZIN 10MG + METFORMIN 500MG", "Voage -M 10/500 TAB"),
    ("NITROFURANTOIN 100MG", "URIVRON 100 MG"),
    ("METRONIDAZOLE 400 MG", "METRONIDAZOLE 400 MG oral tablet"),
    ("FERROUS ASCORBATE&FOLIC ACID SYP", "FERROUS ASCORBATE&FOLIC ACID SYP oral syrup"),
    ("ACEBROPHLLINE 100+ACETYLCYSTEINE 600", "ACEBROPHLLINE 100+ACETYLCYSTEINE 600 oral tablet"),
    ("AMIODARONE 100 MG", "AMIODARONE 100 MG oral tablet"),
    ("NITROGLYCERIN-2.6MG", "cardioplat 2.6"),
    ("LINAGLIPTIN-5MG", "Linadyl 5"),
    ("NITROGLYCERIN 6.4 MG", "NITROGLYCERIN 6.4 MG oral tablet"),
    ("OMEPRAZOLE 20 MG", "OMEPRAZOLE 20 MG oral capsule"),
    ("ESCITALOPRAM 5MG+CLONAZEPAM 0.5 MG", "NEXITO PLUS"),
    ("VOGLIBOSE 0.3+GLIMEPREIDE 2+METFORMIN 500 MG", "VOGLIBOSE 0.3+GLIMEPREIDE 2+METFORMIN 500 MG oral tablet"),
    ("METALAZONE", "METALONIX 2.5 TAB"),
    ("VILDAGLIPTIN 50+METFORMIN 500", "VILDAGLIPTIN 50+METFORMIN 500 oral tablet"),
    ("TRIMETAZIDINE 80 MG", "TRIMETAZIDINE 80 MG oral tablet"),
    ("HYDROCHLOROTHIAZIDE-12.50MG + TELMISARTAN-40MG", "curetel-40 h"),
    ("LEVOSULPIRIDE 25mg", "LESURICH 25"),
    ("CARVEDIL 6.25 MG", "CARVEDIL 6.25 MG oral tablet"),
    ("ATORVASTATIN-20MG+CLOPIDOGREL-75MG", "ATORVASTATIN-20MG+CLOPIDOGREL-75MG"),
    ("NAPROXEN-500 TAB Oral Tablet", "NAPROXEN-500 TAB Oral Tablet"),
    ("TORSEMIDE 10 MG", "TORMAY - 20 MG TAB"),
    ("ATORVASTATIN  20 +ASPIRIN 75 MG", "ATR-AP 20/75"),
    ("ATORVASTATIN 20+CLOPIDOGREL 75+ASPIRIN 75", "CLOPIPAL GOLD 20"),
    ("TICAGRELOR 90 MG", "TIKAGLOR - 90 TAB"),
    ("SITAGLIPTIN 50 MG + METFORMIN 500 MG", "SITADOSE - M 500 TAB"),
    ("SITAGLIPTIN 100 MG", "SITADOSE- 100 TAB"),
    ("PRAZOSIN HYDROCHLORIDE 2.5 MG", "PAZOTRY - 2.5 TAB"),
    ("APIXABAN 2.5MG", "APXBAN - 2.5 TAB"),
    ("AMLODIPINE 5 MG", "AMLODOSE - 5 TAB"),
    ("ACETYLCYTEINE 600 MG", "ACETYLCYTEINE 600 MG oral tablet"),
    ("AMLODIPINE 2.5 MG", "AMLODOSE - 2.5 TAB"),
    ("SYP. CITRALKA", "SYP. CITRALKA oral suspension"),
    ("ROSUVASTATIN 20 MG+ASPIRIN 75 MG", "ROSUVASTATIN 20 MG+ASPIRIN 75 MG oral tablet"),
    ("BISOPROLOL FUMARATE 5MG+AMLODIPINE 5MG", "CONCOR AM 5MG TAB"),
    ("CIPROFLOXIN  500 MG", "CIPROFLOXIN  500 MG oral tablet"),
    ("SILDENAFIL 20 MG", "CARDIAX"),
    ("GLICLAZIDE 60+METFORMIN 500 MG", "Gliclazide 60 mg &Metformin 500 mg oral tablet"),
    ("MILK OF MAGNESIA , LIQUID PARAFFIN & SODIUM PICOSULFATE SUSPENSION", "CORSAFFIN PLUS"),
    ("VOGLIBOSE 0.3MG", "VOGLIBOZ 0.3 MG"),
    ("CILNIDIPINE-10MG", "Xemcil 10"),
    ("FEXOFENADINE 120 MG", "FEXOFENADINE 120 MG oral tablet"),
    ("EMPAGLIFLOZIN 25 MG", "EMPAGLIFLOZIN 25 MG oral tablet"),
    ("VOGLIBOSE 0.3 MG+GLIMEPRIDE 1+METFORMIN 500 MG", "VOGLIBOSE 0.3 MG+GLIMEPRIDE 1+METFORMIN 500 MG oral tablet"),
    ("GABAPENTIN 300+METHYLCOBALAMIN 500 MG", "GABAPENTIN 300+METHYLCOBALAMIN 500 MG oral tablet"),
    ("AMOXYCILLIN 500+CLAVULANIC ACID 125", "AMOXYCILLIN 500+CLAVULANIC ACID 125 oral tablet"),
    ("ROSUVASTATIN 10 MG+ASPIRIN 75 MG", "ROSUVASTATIN 10 MG+ASPIRIN 75 MG oral tablet"),
    ("SPIROLACTONE 50 MG", "SPIROLACTONE 50 MG oral tablet"),
    ("THYROXINE SODIUM 100 MG", "THYROXINE SODIUM 100 MG oral tablet"),
    ("CARVEDILOL 3.125 MG", "CARVEDILOL 3.125 MG oral tablet"),
    ("ATORVASTATIN 20MG", "LIPIVENT - 20MG"),
    ("Cofol -Z Carbonyl iron with zinc &  folic acid ora", "Cofol -Z Carbonyl iron with zinc &  folic acid oral tablet"),
    ("Nitroglycerin  6.4mg oral tablet", "Nitro G 6.4"),
    ("METFORMIN  500  MG   ORAL    TAB", "P1225252TB"),
    ("ROSUVASTATIN 10 MG", "ROSUMARK 10"),
    ("RABEPRAZOLE 20+DOMPERIDONE30", "RABEPRAZOLE 20+DOMPERIDONE30 oral tablet"),
    ("SITAGLIPTIN 50 MG", "SITADOSE- 50 TAB"),
    ("FEBUXOSTAT 40 MG", "FEBULIX-40"),
    ("NIFEDIPINE 30 MG", "NIFEDULES RT 30"),
    ("CLONIDIME 100 MG", "CLONIDIME 100 MG oral tablet"),
    ("GLICLAZIDE 80 MG + METFOEMIN 500MG", "GLICADAY - M 80 TAB"),
    ("ISOSORBIDE DINITRATE 20 HYDRALAZINE 37.5 MG", "ISOSORBIDE DINITRATE 20 HYDRALAZINE 37.5 MG oral tablet"),
    ("ACETYLCYSTEINE-150MG+TAURINE-500MG", "GFR fit"),
    ("THYROXINE SODIUM 12.5 MG", "THYROXINE SODIUM 12.5 MG oral tablet"),
    ("LACTULOSE SYRUP", "LACTULOSE SYRUP oral syrup"),
    ("VERAPAMIL 40 MG", "VERAPAMIL 40 MG oral tablet"),
    ("DESIDUSTAT 50 MG", "DESIDUSTAT 50 MG oral tablet"),
    ("SORBILINE SYRUP", "SORBILINE SYRUP oral tablet"),
    ("CLOBETASOL+NEOMYCIN+MICONAZOLE+ZINC+BORAX", "CLOBETA GM 20GM"),
    ("VILDAGLIPTIN 50MG + METFORMIN 500MG", "VILDIGLIPT-M 500 TAB"),
    ("CILOSTAZOL 50", "CILOZEN"),
    ("NICORANDIL 5 MG", "NICORANDIL 5 MG oral tablet"),
    ("Tab. Vildagliptin 50mg", "Tab. Vildagliptin 50mg"),
    ("NEBIVOLOL 2.5 MG", "NEBOLIX"),
    ("THYROXINE SODIUM 25 MG", "THYROXINE SODIUM 25MG oral tablet"),
    ("Dubinor", "Dubinor"),
    ("Glimepiride (1mg) + Metformin (500mg) + Pioglitazo", "Triglynase 1"),
    ("LINAGLIPTIN 2.5/METFORMIN 500", "LINOZEN M 2.5"),
    ("MIRABEGRON 50", "MIRABEGRON 50 oral tablet"),
    ("MONTELUKAST+LEVOCETRIZINE", "MONTELUKAST+LEVOCETRIZINE oral tablet"),
    ("GLIMIPRIDE 4+METFORMIN 500", "GLIMIPRIDE 4+METFORMIN 500 oral tablet"),
    ("ATORVASTATIN +EZETIMIBE", "ATORVASTATIN +EZETIMIBE oral tablet"),
    ("THYRONORM 150", "THYRONORM 150 oral tablet"),
    ("METOPROLOL 50 MG", "METOPROLOL 50 MG oral tablet"),
    ("IVABRADINE", "IVABRADINE"),
    ("GLICLAZIDE", "GLICLAZIDE"),
    ("Enalapril Maleate 2.5mg", "Enalapril Maleate 2.5mg oral tablet"),
    ("TELMISARTAN 40MG", "TELMA 40 mg"),
    ("Aspirin (150mg)", "ASPRIN 150mg"),
    ("ISOSORBIDE MONONITRATE", "ISOLIX"),
    ("TAMSULOSIN", "TASMULINE"),
    ("TELMISARTAN-40MG", "Telistar-40 Tablet"),
    ("Atorvastatin (10mg)", "Safstat 10"),
    ("DAPAGLIFLOZIN-10MG+LINAGLIPTIN-5MG", "Emlinz-D 5/10 Tablet"),
    ("Tab.Spironolactone 25mg", "Tab.Spironolactone 25mg"),
    ("Ranitidine (150mg)", "Rantidine 150mg"),
    ("DILTIAZEM HYDROCHLORIDE 30MG", "DILTALOK - 30 SR"),
    ("TRYPSIN-CHYMOTRYPSIN", "CHYMOTHAL FORT TAB"),
    ("ISOSORBIDE DINITRATE 10 MG", "ISOSORBIDE DINITRATE 10 MG oral tablet"),
    ("PARACETOMAL 650 MG", "PARACIP"),
    ("METFORMIN", "METFORMIN"),
    ("Gabapentin(100mg)+Methylcobalamin(500mcg)", "Gabadon-M 100/500"),
    ("Glimepride  1 mg", "Glimepride  1 mg oral tablet"),
    ("Glimepiride (1mg) + Metformin (500mg)", "ISRYL M1"),
    ("DIGOXIN 0.25mg", "Digioxin"),
    ("GLIMEPRIDE 2 MG", "GLIMDA"),
    ("Clopidogrel  75", "Clopinol 75"),
    ("Thyroxine Sodium-50 mcg", "Thyroup (50 mcg)"),
    ("PRAZOSIN HYDROCHLORIDE 5 MG", "PAZOTRY - 5 TAB"),
    ("Benidipine (4mg)", "INZIT"),
    ("Thyroxine Sodium-75 mcg", "Thyronorm (75 mcg)"),
    ("ATORVASTATIN 5 MG ORAL TAB", "ATORVASTATIN 5 MG ORAL TAB oral tablet, chewable"),
    ("ASPIRIN 75+ATORVASTATIN 10", "ATROPAL-ASP"),
    ("Dapagliflozin", "Dapavel-5 mg"),
    ("Glipizide (5mg) + Metformin (500mg)", "Dibizide-M Tablet"),
    ("Sitagliptin (50mg) + Metformin (1000mg)", "Janumet 1000mg/50mg"),
    ("Aspirin (75mg)", "ASPRIN 75mg"),
    ("Flunarizine-10 mg", "Migranex (10 mg)"),
    ("Ondansetron (4mg)", "Zofer MD"),
    ("Torsemide  10mg Spironolactone  25mg", "Torzide  Sl 25"),
    ("Diltiazem-30 mg", "Dilzex (30 mg)"),
    ("Clopidogrel  75mg  Aspirin Ip  75mg oral tablet", "Clopicard AP 75mg"),
    ("Omeprazole 20mg", "Zenpro  Capsule 20mg"),
    ("Gliclazide (60mg)", "glykind xr 60"),
    ("THIOCOLCHICOSIDE 4MG", "COLCHISID-4"),
    ("CETIRIZINE 10MG", "JP CET TAB"),
    ("CETAPHIL MOIST LOTION 200ML", "EUROSOFT ADV MOISTURIZER"),
    ("Cholecalciferol  60000 IU", "D3Strong 60K IU Softgels"),
    ("Dapagliflozin (5mg) + Metformin (500mg)", "Dapaford M"),
    ("ROSUVASTATIN 10MG", "ROSUGEN-10"),
    ("Heparin Sodium & Benzyl Nicotinate Gel", "Thrombolent"),
    ("Pregabalin (75mg)", "pregablin"),
    ("Telmisartan (20mg)", "telepress 20"),
    ("Ibuprofen (400mg) + Paracetamol (325mg)", "Combiflam"),
    ("MAXIRICH CAP", "MAXIRICH CAP Oral tablet"),
    ("GLIMEPIRIDE 2mg & METFORMIN 500mg", "glimpex m2"),
    ("GLIMEPIRIDE 2 MG", "GLIMPEX 2"),
    ("LEVOCARNITINE 500 MG", "LEVMAC500"),
    ("ATORVASTATIN - 40mg", "ATROPAL"),
    ("PECUL PLUS", "PECUL PLUS"),
    ("CILNIDIPINE 10MG", "CILACAR 10"),
    ("Ambroxol (30mg/5ml) + Levosalbutamol (1mg/5ml) + Guaifenesin (50mg/5ml)", "Ascory LS"),
    ("Etophylline-77 mg + Theophylline-23 mg", "Zeriphylline (77+23)"),
    ("Dapagliflozin (10mg) + Metformin (1000mg)", "Oxramet XR 10mg/1000mg Tablet"),
    ("Teneligliptin (20mg)", "Zita plus 20mg"),
    ("ACARBOSE 50 MG ORAL TAB", "Acrabose 50mg"),
    ("Pioglitazone-15 mg", "Pioglaz (15 mg)"),
    ("Empagliflozin (25mg)", "Gibtulio -S 25mg"),
    ("Metformin (500mg) + Linagliptin (5mg)", "Linapride M"),
    ("Repaglinide-0.5 mg", "Reglide (0.5 mg)"),
    ("Gliclazide (80mg)", "Gliclazide 80mg"),
    ("Glimepiride (2mg) + Metformin (1000mg)", "Gemer DS 2"),
    ("Diltiazem-60 mg", "Dilzem (60 mg)"),
    ("Naproxen  500mg", "Naporex  500mg"),
    ("Rabeprazole-20 mg", "Rabeloc (20 mg)"),
    ("VILDAGLIPTIN 50MG + METFORMIN 850MG", "VILDIGLIPT-M 850 TAB"),
    ("Ramipril 2.5 mg", "Ramipril 2.5 mg oral tablet"),
    ("Valsartan 40 mg", "Valsartan 40 mg oral tablet"),
    ("METOPROLOL 2.5 MG", "METOPROLOL 2.5 MG oral tablet"),
    ("Glimepride 1mg Metformin 500mg", "Glidum-MF"),
    ("Metolazone 2.5 mg", "Mezlon 2.5"),
    ("Cilnidipine 5mg", "Cilnidipine 5mg oral tablet"),
    ("Loading Dose", "Loading Dose oral tablet"),
    ("Aspirn 75mg Atorvastatin 20mg", "Tecosprin 20/75"),
    ("Clindipine 5 mg", "Clindinol-5")
]

STANDARD_CATEGORIES = [
    ("Consumables", "Others", "Patient consumables"),
    ("Drug", "Drug", "Prescription & pharmaceutical drugs"),
    ("Drug Medications", "Others", "General medications"),
    ("Emergency management", "Others", "Emergency resuscitation and cardiac support supplies"),
    ("Injections", "Drug", "Injectable medications and infusions"),
    ("IV Fluids", "Drug", "Intravenous saline and electrolyte solutions"),
    ("Lab Kit", "Others", "Diagnostic reagents and lab test kits"),
    ("Supplement", "Supplement", "Nutritional, vitamin and cardiovascular supplements"),
    ("Syringes", "Others", "Single-use disposable syringes and needles"),
    ("Vaccine", "Vaccine", "Adult and pediatric immunizations"),
]


def seed():
    root = Path(__file__).resolve().parents[1]
    db_path = root / "backend" / "data" / "ehr.db"
    if not db_path.exists():
        print(f"Error: {db_path} not found")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Fetch facilities
    cur.execute("SELECT id FROM facilities")
    facility_ids = [r[0] for r in cur.fetchall()]
    if not facility_ids:
        facility_ids = ["0c0a4ad0-1c82-4a6a-b438-4df2f1a15e53"]

    # 2. Seed standard categories
    for cat_name, group_name, desc in STANDARD_CATEGORIES:
        for fac_id in facility_ids:
            cur.execute(
                "SELECT id FROM inventory_categories WHERE facility_id=? AND name=?",
                (fac_id, cat_name)
            )
            if not cur.fetchone():
                cid = str(uuid.uuid4())
                cur.execute(
                    "INSERT INTO inventory_categories (id, facility_id, name, group_name, description, is_active, created_at, version) "
                    "VALUES (?, ?, ?, ?, ?, 1, ?, 1)",
                    (cid, fac_id, cat_name, group_name, desc, datetime.now().isoformat())
                )

    # 3. Seed 219 Medicine Catalogs
    added_meds = 0
    now_iso = datetime.now().isoformat()
    for prod_name, trade_name in MEDICINES_DATA:
        norm_prod = prod_name.strip().lower()
        norm_trade = trade_name.strip().lower()

        # Check existing in medicine_catalogs
        cur.execute("SELECT id FROM medicine_catalogs WHERE normalized_name=? AND normalized_trade=?", (norm_prod, norm_trade))
        row = cur.fetchone()
        if not row:
            mid = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO medicine_catalogs (id, product_name, trade_name, normalized_name, normalized_trade, is_active, created_at, version) "
                "VALUES (?, ?, ?, ?, ?, 1, ?, 1)",
                (mid, prod_name.strip(), trade_name.strip(), norm_prod, norm_trade, now_iso)
            )
            added_meds += 1

        # Also sync to catalogs table with kind='medication' for facility search compatibility
        for fac_id in facility_ids:
            # Code from trade name or slug
            code = f"MED-{norm_prod[:20].replace(' ', '-').upper()}"
            cur.execute("SELECT id FROM catalogs WHERE facility_id=? AND kind='medication' AND code=?", (fac_id, code))
            if not cur.fetchone():
                cat_id = str(uuid.uuid4())
                cur.execute(
                    "INSERT INTO catalogs (id, facility_id, kind, code, name, content, price_paise, active, created_at, version) "
                    "VALUES (?, ?, 'medication', ?, ?, ?, 0, 1, ?, 1)",
                    (cat_id, fac_id, code, prod_name.strip(), trade_name.strip(), now_iso)
                )

    conn.commit()
    cur.execute("SELECT count(1) FROM medicine_catalogs")
    total_meds = cur.fetchone()[0]
    cur.execute("SELECT count(1) FROM inventory_categories")
    total_cats = cur.fetchone()[0]
    conn.close()

    print(f"✓ Seeded medicine catalogue: {added_meds} added. Total in database: {total_meds} (expected 219).")
    print(f"✓ Seeded inventory categories: Total categories across facilities: {total_cats}.")


if __name__ == "__main__":
    seed()

