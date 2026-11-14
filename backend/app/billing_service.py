"""Billing Settings & Operations Service:
Reverse-engineered to match CharmHealth Billing module precisely.
Covers:
1. Procedure Codes (List/Group View, CRUD, search)
2. Fee Schedules (Settings, list, differential charges, CPT/Product associations)
3. Billing Settings (Account settings, hard close, title overrides, payment methods, write-off types, taxes)
4. Patient Billing Settings (Automation, communication templates, reminders interval)
5. Procedure Code for Lab Tests (Lab CPT auto-population, mapping, unmapping)
6. Billing Packages (Multi-session packages, procedures & labs bundle, expiration policy)
7. Invoice Templates (Gallery, default template selection, active toggles)
8. Receipt Templates & Razorpay
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, or_, and_, delete
from typing import Optional, List, Dict, Any
import json
import uuid
import re

from .identity import context
from . import models as m
from .settings_router import load_store, save_store

router = APIRouter(prefix="", tags=["billing-settings"])

# ----------------------------------------------------------------------------
# SEED CONSTANTS FROM CHARMHEALTH REFERENCE
# ----------------------------------------------------------------------------

SEED_PROCEDURES = [
    {"desc": "CA 15-3 Cancer Antigen", "code": "86300", "sac": "999312", "charge": 1200.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "CEA", "code": "82378", "sac": "999312", "charge": 950.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Thyroglobulin", "code": "84432", "sac": "", "charge": 1100.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Anti Thyroglobulin", "code": "86800", "sac": "", "charge": 1200.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Wound Dressing", "code": "97597", "sac": "999312", "charge": 800.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "Observation Charge", "code": "99218", "sac": "999312", "charge": 750.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "Visiting Doctor Consultation", "code": "99213", "sac": "", "charge": 1500.00, "is_lab": False, "cat": "Consultation", "pos": "11 - Office"},
    {"desc": "Below Knee Amputation", "code": "27880", "sac": "", "charge": 100000.00, "is_lab": False, "cat": "Surgical", "pos": "21 - Inpatient"},
    {"desc": "HBsAg", "code": "87341", "sac": "", "charge": 600.00, "is_lab": True, "cat": "Lab", "pos": "11 - Office"},
    {"desc": "Transport-HC", "code": "99312", "sac": "999312", "charge": 200.00, "is_lab": False, "cat": "Home Care", "pos": "12 - Home"},
    {"desc": "Emergency Care", "code": "99284", "sac": "", "charge": 3000.00, "is_lab": False, "cat": "Emergency", "pos": "23 - Emergency Room"},
    {"desc": "Blood Transfusion Charges", "code": "36430", "sac": "", "charge": 1000.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "Calcium Test", "code": "35694", "sac": "999312", "charge": 150.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Diabetic/HT Follow up", "code": "99245", "sac": "999312", "charge": 500.00, "is_lab": False, "cat": "Cardio Diabetic Consultation", "pos": "11 - Office"},
    {"desc": "Diabetic/HT Consultation", "code": "99245", "sac": "999312", "charge": 500.00, "is_lab": False, "cat": "Cardio Diabetic Consultation", "pos": "11 - Office"},
    {"desc": "HUH-Cardiodiabetic Test", "code": "80050", "sac": "", "charge": 7900.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Vascular Assessment&Heart Rate Variability", "code": "93923", "sac": "", "charge": 3000.00, "is_lab": True, "cat": "HUH-D", "pos": "11 - Office"},
    {"desc": "Doppler Study", "code": "93926", "sac": "", "charge": 4000.00, "is_lab": False, "cat": "Lab", "pos": "11 - Office"},
    {"desc": "Anesthetist Fees", "code": "01999", "sac": "", "charge": 10000.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "Surgeon fees", "code": "28820", "sac": "", "charge": 24000.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "CT-Chest", "code": "71250", "sac": "", "charge": 5000.00, "is_lab": False, "cat": "HUH-D", "pos": "11 - Office"},
    {"desc": "Comprehensive EECP Treatment Charges(Includes EECP Sessions and Patient accomodation during the treatment Period)", "code": "92971", "sac": "999312", "charge": 0.00, "is_lab": False, "cat": "Treatment", "pos": "11 - Office"},
    {"desc": "Pus culture", "code": "87070", "sac": "", "charge": 650.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Ketone Test", "code": "82009", "sac": "", "charge": 100.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "HCV Antibody", "code": "86803", "sac": "", "charge": 750.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "VDRL", "code": "86592", "sac": "", "charge": 240.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Observation Charge 2-3 Hr", "code": "99281", "sac": "", "charge": 1500.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "RA Factor", "code": "006502", "sac": "", "charge": 350.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Gout", "code": "001057", "sac": "", "charge": 500.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "TMT", "code": "93350", "sac": "9993", "charge": 2500.00, "is_lab": False, "cat": "HUH-D", "pos": "11 - Office"},
    {"desc": "Malarial Parasite", "code": "87899", "sac": "9993", "charge": 300.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "Nursing Care", "code": "99304", "sac": "9993", "charge": 0.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "MRI Brain", "code": "70553", "sac": "9993", "charge": 5000.00, "is_lab": False, "cat": "HUH-D", "pos": "11 - Office"},
    {"desc": "Catheter Insert", "code": "93454", "sac": "99312", "charge": 1000.00, "is_lab": False, "cat": "Emergency", "pos": "11 - Office"},
    {"desc": "Mobile X ray", "code": "R0075", "sac": "99312", "charge": 2500.00, "is_lab": False, "cat": "Home Care", "pos": "12 - Home"},
    {"desc": "Mobile Echo-HC", "code": "HC", "sac": "99312", "charge": 4500.00, "is_lab": False, "cat": "Home Care", "pos": "12 - Home"},
    {"desc": "Blood Collection-HC", "code": "HC", "sac": "99312", "charge": 300.00, "is_lab": False, "cat": "Home Care", "pos": "12 - Home"},
    {"desc": "Iron Injection", "code": "Q0138", "sac": "99312", "charge": 750.00, "is_lab": False, "cat": "Home Care", "pos": "12 - Home"},
    {"desc": "Physiotherapist House Visit", "code": "HC", "sac": "99312", "charge": 1000.00, "is_lab": False, "cat": "Home Care", "pos": "12 - Home"},
    {"desc": "Serum Urea & Creatinine", "code": "84520", "sac": "999316", "charge": 220.00, "is_lab": True, "cat": "HUH Labs", "pos": "11 - Office"},
    {"desc": "HUH-Urine Microalbumin test", "code": "82570", "sac": "99312", "charge": 150.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "HUH-Pre Diabetic Screening", "code": "82950", "sac": "99312", "charge": 2500.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "HUH-Stool", "code": "87045", "sac": "99312", "charge": 200.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "HUH-eGFR", "code": "82565", "sac": "999312", "charge": 800.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "HUH-AFB Sputum", "code": "87015", "sac": "99312", "charge": 800.00, "is_lab": True, "cat": "HUH-O", "pos": "11 - Office"},
    {"desc": "HUH-Renal Microvascular Test", "code": "140285", "sac": "99312", "charge": 1200.00, "is_lab": True, "cat": "HUH Labs", "pos": "11 - Office"},
    {"desc": "HUH-PSA", "code": "84153", "sac": "99312", "charge": 1300.00, "is_lab": True, "cat": "HUH Labs", "pos": "11 - Office"},
    {"desc": "HUH-Iron profile", "code": "83550", "sac": "99312", "charge": 1500.00, "is_lab": True, "cat": "HUH Labs", "pos": "11 - Office"},
    {"desc": "EECP Routine Profile Package (69 tests)", "code": "EECP", "sac": "999312", "charge": 3800.00, "is_lab": True, "cat": "HUH Labs", "pos": "11 - Office"}
]

SEED_PACKAGES = [
    {
        "name": "[EECP] EECP Complete Treatment",
        "code": "EECP-PKG-35",
        "billing_code": "--",
        "charge": 0.00,
        "period": "1 Month(s)",
        "status": "Inactive",
        "patients_count": 0,
        "procedures": [{"desc": "EECP 1-Hour Session (Standard)", "code": "92971", "qty": 35, "charge": 3500.0, "prorate": 0.0}],
        "labs": [],
        "include_products": False
    },
    {
        "name": "[CCD] Cardiac Consultation with EECP Demo",
        "code": "CCD-99245",
        "billing_code": "[99245] Cardiac Consultation with EECP Demo",
        "charge": 1000.00,
        "period": "999 Month(s)",
        "status": "Inactive",
        "patients_count": 89,
        "procedures": [{"desc": "Cardiology Consultation & Assessment", "code": "99245", "qty": 1, "charge": 1000.0, "prorate": 1000.0}],
        "labs": [],
        "include_products": False
    },
    {
        "name": "[CEECP] Vaso-Meditech Enhanced External Counterpulsation Complete Treatment",
        "code": "CEECP-FULL",
        "billing_code": "--",
        "charge": 0.00,
        "period": "999 Month(s)",
        "status": "Inactive",
        "patients_count": 0,
        "procedures": [{"desc": "Comprehensive EECP Treatment Session", "code": "92971", "qty": 35, "charge": 0.0, "prorate": 0.0}],
        "labs": [],
        "include_products": True
    },
    {
        "name": "[CCS] Cardiac Consultation with SphygmoCor Test",
        "code": "CCS-SPHYG",
        "billing_code": "--",
        "charge": 0.00,
        "period": "999 Month(s)",
        "status": "Inactive",
        "patients_count": 1,
        "procedures": [
            {"desc": "Consultation", "code": "99213", "qty": 1, "charge": 1500.0, "prorate": 0.0},
            {"desc": "SphygmoCor Arterial Stiffness Test", "code": "93923", "qty": 1, "charge": 3000.0, "prorate": 0.0}
        ],
        "labs": [],
        "include_products": False
    },
    {
        "name": "[CCC] Comprehensive Cardiac Consultation with SphygmoCor Test & EECP Demo",
        "code": "CCC-DEMO",
        "billing_code": "[99245] Comprehensive Cardiac Consultation, SphygmoCor Test & EECP Demo",
        "charge": 1500.00,
        "period": "999 Month(s)",
        "status": "Inactive",
        "patients_count": 1,
        "procedures": [
            {"desc": "Comprehensive Consultation", "code": "99245", "qty": 1, "charge": 1500.0, "prorate": 1500.0}
        ],
        "labs": [],
        "include_products": False
    }
]

SEED_PAYMENT_METHODS = ["Cash", "UPI", "Credit Card", "Debit Card", "Cheque", "Bank Transfer"]
SEED_WRITE_OFF_TYPES = ["Contractual", "Bad Debt", "Small Balance", "Other"]
SEED_TAXES = [
    {"name": "Healthcare Exempt Services", "percent": 0.0},
    {"name": "Medical Supplies GST", "percent": 5.0},
    {"name": "Medical Consumables GST", "percent": 12.0},
    {"name": "Clinical Facility Standard GST", "percent": 18.0}
]

def ensure_billing_defaults(c):
    # 1. Procedures
    has_procs = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'procedure_code'
        ).limit(1)
    )
    if not has_procs:
        seen_codes = set()
        for idx, p in enumerate(SEED_PROCEDURES):
            base_code = p['code']
            cat_code = base_code
            if cat_code in seen_codes:
                cat_code = f"{base_code}_{idx+1}"
            seen_codes.add(cat_code)

            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='procedure_code',
                code=cat_code,
                name=p['desc'],
                content=json.dumps({
                    "description": p['desc'],
                    "code": p['code'],
                    "sac_code": p['sac'],
                    "charge": p['charge'],
                    "discount": "-",
                    "is_lab_code": p['is_lab'],
                    "category": p['cat'],
                    "place_of_service": p['pos'],
                    "modifiers": []
                }),
                price_paise=int(p['charge'] * 100),
                active=True
            ))

    # 2. Fee Schedules
    has_fs = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'fee_schedule'
        ).limit(1)
    )
    if not has_fs:
        c.db.add(m.Catalog(
            id=str(uuid.uuid4()),
            facility_id=c.facility_id,
            kind='fee_schedule',
            code='MASTER_FS',
            name='Master Fee Schedule',
            content=json.dumps({
                "description": "This is a pre-defined 'Fee Schedule' provided for the practice. All procedures added under 'Procedure Codes' section will be linked to this fee schedule. While generating Invoice, when a particular procedure is not available in the selected 'Fee Schedule', its charge will be taken from 'Master Fee Schedule'.",
                "is_default": True,
                "procedures_count": len(SEED_PROCEDURES),
                "products_count": 413,
                "schedule_type": "None",
                "differential_prices": {}
            }),
            active=True
        ))
        c.db.add(m.Catalog(
            id=str(uuid.uuid4()),
            facility_id=c.facility_id,
            kind='fee_schedule',
            code='INTL_PATIENT_FS',
            name='International Patient',
            content=json.dumps({
                "description": "Differential pricing schedule for overseas and medical tourism patients.",
                "is_default": False,
                "procedures_count": 1,
                "products_count": 0,
                "schedule_type": "Patient Specific",
                "differential_prices": {}
            }),
            active=True
        ))

    # 3. Billing Packages
    has_pkgs = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'billing_package'
        ).limit(1)
    )
    if not has_pkgs:
        for pkg in SEED_PACKAGES:
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='billing_package',
                code=pkg['code'],
                name=pkg['name'],
                content=json.dumps(pkg),
                price_paise=int(pkg['charge'] * 100),
                active=True
            ))

    # 4. Payment Methods
    has_pm = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'payment_method'
        ).limit(1)
    )
    if not has_pm:
        for pm in SEED_PAYMENT_METHODS:
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='payment_method',
                code=f"PM_{pm.upper().replace(' ', '_')}",
                name=pm,
                content=json.dumps({"name": pm}),
                active=True
            ))

    # 5. Write-off Types
    has_wo = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'write_off_type'
        ).limit(1)
    )
    if not has_wo:
        for wo in SEED_WRITE_OFF_TYPES:
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='write_off_type',
                code=f"WO_{wo.upper().replace(' ', '_')}",
                name=wo,
                content=json.dumps({"name": wo}),
                active=True
            ))

    # 6. Taxes
    has_tax = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'tax_rate'
        ).limit(1)
    )
    if not has_tax:
        for tx in SEED_TAXES:
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='tax_rate',
                code=f"TAX_{tx['name'].upper().replace(' ', '_')[:16]}",
                name=tx['name'],
                content=json.dumps(tx),
                active=True
            ))

    # 7. Invoice Templates
    has_it = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'invoice_template'
        ).limit(1)
    )
    if not has_it:
        templates = [
            {"name": "Invoice PDF for Double Window Envelop", "is_default": False, "is_active": True, "type": "envelope"},
            {"name": "Invoice PDF", "is_default": True, "is_active": True, "type": "standard"},
            {"name": "Superbill PDF", "is_default": False, "is_active": True, "type": "superbill"}
        ]
        for it in templates:
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='invoice_template',
                code=f"INV_TMPL_{it['type'].upper()}",
                name=it['name'],
                content=json.dumps(it),
                active=it['is_active']
            ))

    # 8. Lab Procedure Mappings
    has_lpm = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'lab_procedure_mapping'
        ).limit(1)
    )
    if not has_lpm:
        seed_lab_maps = [
            {"test_name": "Cardiac Panel Test [ CPT ]", "cpt_desc": "Cardiac Panel Test {cTnI/CK-Mb/MYO}", "cpt_code": "84484", "charge": 2500.00, "lab": "BioChemistry"},
            {"test_name": "A rheumatoid factor", "cpt_desc": "", "cpt_code": "", "charge": 0.00, "lab": "BioChemistry"},
            {"test_name": "Cardiac Risk Marker", "cpt_desc": "", "cpt_code": "", "charge": 0.00, "lab": "BioChemistry"},
            {"test_name": "Cardiac Risk Marker Plus", "cpt_desc": "", "cpt_code": "", "charge": 0.00, "lab": "BioChemistry"},
            {"test_name": "Cerebro Spinal Fluid", "cpt_desc": "", "cpt_code": "", "charge": 0.00, "lab": "BioChemistry"},
            {"test_name": "Cystatin C", "cpt_desc": "", "cpt_code": "", "charge": 0.00, "lab": "BioChemistry"}
        ]
        for idx, lm in enumerate(seed_lab_maps):
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='lab_procedure_mapping',
                code=f"LPM_{idx+1}_{re.sub(r'[^A-Z0-9]', '_', lm['test_name'].upper())[:14]}",
                name=lm['test_name'],
                content=json.dumps(lm),
                active=True
            ))

    c.db.commit()


# ============================================================================
# 1. PROCEDURE CODES ENDPOINTS
# ============================================================================

@router.get("/api/settings/billing/procedure-codes")
@router.get("/settings/billing/procedure-codes")
def list_procedure_codes(q: Optional[str] = None, category: Optional[str] = None, c: context = Depends(context)):
    ensure_billing_defaults(c)
    stmt = select(m.Catalog).where(
        m.Catalog.facility_id == c.facility_id,
        m.Catalog.kind == 'procedure_code'
    )
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(or_(
            m.Catalog.name.ilike(term),
            m.Catalog.code.ilike(term)
        ))
    items = c.db.scalars(stmt).all()
    results = []
    for item in items:
        data = json.loads(item.content) if item.content else {}
        if category and category != "all" and data.get("category") != category:
            continue
        results.append({
            "id": item.id,
            "name": item.name,
            "description": data.get("description", item.name),
            "code": item.code,
            "sac_code": data.get("sac_code", ""),
            "charge": data.get("charge", item.price_paise / 100 if item.price_paise else 0.0),
            "discount": data.get("discount", "-"),
            "is_lab_code": data.get("is_lab_code", False),
            "category": data.get("category", "General"),
            "place_of_service": data.get("place_of_service", "11 - Office"),
            "modifiers": data.get("modifiers", []),
            "additional_details": data.get("additional_details", "-"),
            "active": item.active
        })
    return sorted(results, key=lambda x: x["description"].lower())


@router.post("/api/settings/billing/procedure-codes")
@router.post("/settings/billing/procedure-codes")
def create_procedure_code(payload: Dict[str, Any], c: context = Depends(context)):
    code = payload.get("code", "").strip()
    desc = payload.get("description", "").strip() or payload.get("name", "").strip()
    if not code or not desc:
        raise HTTPException(status_code=400, detail="Procedure Code and Description are required")

    charge = float(payload.get("charge", 0.0))
    existing = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'procedure_code',
            m.Catalog.code == code
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Procedure code '{code}' already exists")

    new_id = str(uuid.uuid4())
    content = {
        "description": desc,
        "sac_code": payload.get("sac_code", "").strip(),
        "charge": charge,
        "discount": payload.get("discount", "-"),
        "is_lab_code": bool(payload.get("is_lab_code", False)),
        "category": payload.get("category", "General").strip(),
        "place_of_service": payload.get("place_of_service", "11 - Office"),
        "modifiers": payload.get("modifiers", []),
        "additional_details": payload.get("additional_details", "-")
    }
    item = m.Catalog(
        id=new_id,
        facility_id=c.facility_id,
        kind='procedure_code',
        code=code,
        name=desc,
        content=json.dumps(content),
        price_paise=int(charge * 100),
        active=True
    )
    c.db.add(item)
    c.db.commit()
    return {"id": new_id, "message": "Procedure code added successfully"}


@router.put("/api/settings/billing/procedure-codes/{item_id}")
@router.put("/settings/billing/procedure-codes/{item_id}")
def update_procedure_code(item_id: str, payload: Dict[str, Any], c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'procedure_code',
            m.Catalog.id == item_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Procedure code not found")

    desc = payload.get("description", item.name).strip()
    code = payload.get("code", item.code).strip()
    charge = float(payload.get("charge", item.price_paise / 100 if item.price_paise else 0.0))
    data = json.loads(item.content) if item.content else {}
    data.update({
        "description": desc,
        "sac_code": payload.get("sac_code", data.get("sac_code", "")).strip(),
        "charge": charge,
        "discount": payload.get("discount", data.get("discount", "-")),
        "is_lab_code": payload.get("is_lab_code", data.get("is_lab_code", False)),
        "category": payload.get("category", data.get("category", "General")),
        "place_of_service": payload.get("place_of_service", data.get("place_of_service", "11 - Office")),
        "modifiers": payload.get("modifiers", data.get("modifiers", [])),
        "additional_details": payload.get("additional_details", data.get("additional_details", "-"))
    })
    item.name = desc
    item.code = code
    item.price_paise = int(charge * 100)
    item.content = json.dumps(data)
    if "active" in payload:
        item.active = bool(payload["active"])
    c.db.commit()
    return {"message": "Procedure code updated"}


@router.delete("/api/settings/billing/procedure-codes/{item_id}")
@router.delete("/settings/billing/procedure-codes/{item_id}")
def delete_procedure_code(item_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'procedure_code',
            m.Catalog.id == item_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Procedure code not found")
    c.db.delete(item)
    c.db.commit()
    return {"message": "Procedure code deleted"}


# ============================================================================
# 2. FEE SCHEDULES ENDPOINTS
# ============================================================================

@router.get("/api/settings/billing/fee-schedules-settings")
@router.get("/settings/billing/fee-schedules-settings")
def get_fee_schedule_settings(c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:fee_schedule_settings'
        )
    )
    if pref and pref.data:
        return json.loads(pref.data)
    return {
        "enable_fee_schedules": True,
        "default_fee_schedule": "Master Fee Schedule"
    }


@router.put("/api/settings/billing/fee-schedules-settings")
@router.put("/settings/billing/fee-schedules-settings")
def update_fee_schedule_settings(payload: Dict[str, Any], c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:fee_schedule_settings'
        )
    )
    if not pref:
        pref = m.UserPreference(
            id=str(uuid.uuid4()),
            user_id=c.user.id,
            facility_id=c.facility_id,
            section='billing:fee_schedule_settings',
            data=json.dumps(payload)
        )
        c.db.add(pref)
    else:
        pref.data = json.dumps(payload)
    c.db.commit()
    store = load_store()
    store["fee_schedule_settings"] = payload
    save_store(store)
    return {"message": "Fee schedule settings saved"}


@router.get("/api/settings/billing/fee-schedules")
@router.get("/settings/billing/fee-schedules")
def list_fee_schedules(c: context = Depends(context)):
    ensure_billing_defaults(c)
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'fee_schedule'
        )
    ).all()
    results = []
    for item in items:
        data = json.loads(item.content) if item.content else {}
        results.append({
            "id": item.id,
            "name": item.name,
            "code": item.code,
            "description": data.get("description", ""),
            "is_default": data.get("is_default", False),
            "procedures_count": data.get("procedures_count", 0),
            "products_count": data.get("products_count", 0),
            "schedule_type": data.get("schedule_type", "None"),
            "differential_prices": data.get("differential_prices", {}),
            "active": item.active
        })
    return results


@router.get("/api/settings/billing/fee-schedules/{fs_id}")
@router.get("/settings/billing/fee-schedules/{fs_id}")
def get_fee_schedule(fs_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'fee_schedule',
            m.Catalog.id == fs_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Fee schedule not found")
    data = json.loads(item.content) if item.content else {}
    return {
        "id": item.id,
        "name": item.name,
        "code": item.code,
        "description": data.get("description", ""),
        "is_default": data.get("is_default", False),
        "schedule_type": data.get("schedule_type", "None"),
        "differential_prices": data.get("differential_prices", {}),
        "active": item.active
    }


@router.post("/api/settings/billing/fee-schedules")
@router.post("/settings/billing/fee-schedules")
def create_fee_schedule(payload: Dict[str, Any], c: context = Depends(context)):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Fee schedule name is required")

    code = f"FS_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}"
    existing = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'fee_schedule',
            m.Catalog.name == name
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Fee schedule '{name}' already exists")

    diff_prices = payload.get("differential_prices", {})
    procs_count = len([k for k, v in diff_prices.items() if v.get("charge") or v.get("discount")])
    item = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='fee_schedule',
        code=code,
        name=name,
        content=json.dumps({
            "description": payload.get("description", "").strip(),
            "is_default": bool(payload.get("is_default", False)),
            "schedule_type": payload.get("schedule_type", "None"),
            "procedures_count": procs_count,
            "products_count": len(payload.get("product_prices", {})),
            "differential_prices": diff_prices,
            "product_prices": payload.get("product_prices", {})
        }),
        active=True
    )
    c.db.add(item)
    c.db.commit()
    return {"id": item.id, "message": "Fee schedule created successfully"}


@router.put("/api/settings/billing/fee-schedules/{fs_id}")
@router.put("/settings/billing/fee-schedules/{fs_id}")
def update_fee_schedule(fs_id: str, payload: Dict[str, Any], c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'fee_schedule',
            m.Catalog.id == fs_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Fee schedule not found")

    data = json.loads(item.content) if item.content else {}
    if "name" in payload:
        item.name = payload["name"].strip()
    diff_prices = payload.get("differential_prices", data.get("differential_prices", {}))
    data.update({
        "description": payload.get("description", data.get("description", "")),
        "is_default": payload.get("is_default", data.get("is_default", False)),
        "schedule_type": payload.get("schedule_type", data.get("schedule_type", "None")),
        "differential_prices": diff_prices,
        "product_prices": payload.get("product_prices", data.get("product_prices", {})),
        "procedures_count": len([k for k, v in diff_prices.items() if v.get("charge") or v.get("discount")]),
        "products_count": len(payload.get("product_prices", data.get("product_prices", {})))
    })
    item.content = json.dumps(data)
    c.db.commit()
    return {"message": "Fee schedule updated successfully"}


@router.delete("/api/settings/billing/fee-schedules/{fs_id}")
@router.delete("/settings/billing/fee-schedules/{fs_id}")
def delete_fee_schedule(fs_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'fee_schedule',
            m.Catalog.id == fs_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Fee schedule not found")
    data = json.loads(item.content) if item.content else {}
    if data.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default fee schedule")
    c.db.delete(item)
    c.db.commit()
    return {"message": "Fee schedule deleted"}


# ============================================================================
# 3. BILLING SETTINGS TAB (ACCOUNT, HARD CLOSE, TITLES, PM, WO, TAXES)
# ============================================================================

@router.get("/api/settings/billing/account-settings")
@router.get("/settings/billing/account-settings")
def get_billing_account_settings(c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:account_settings'
        )
    )
    if not pref:
        pref = c.db.scalar(
            select(m.UserPreference).where(
                m.UserPreference.user_id == c.user.id,
                m.UserPreference.section == 'billing:account_settings'
            )
        )
    default_settings = {
        "order_invoices_by": "Invoice Added Date",
        "order_receipts_by": "Receipt Added Date",
        "print_layouts": ["A4 / US Letter"],
        "include_inactive_providers": False,
        "enable_invoice_consult_lab_product": True,
        "included_invoice_groups": ["Consultation", "Lab"],
        "create_lab_order_for_lab_invoice": False,
        "allow_inter_facility_receipts": True,
        "enable_hard_close": False,
        "hard_close_basis": "Invoice/Payment/Refund Date",
        "item_table_titles": ["Consultation / Procedures", "Labs", "Medications / Drugs"],
        "alternate_provider_names": ["Consultant", "Doctor", "Doctor", "Doctor"],
        "show_provider_degree": False,
        "exclude_non_covered_superbill": False,
        "superbill_payment_mode": "Show Payments",
        "enable_invoice_round_off": True,
        "round_off_mode": "Round to nearest number",
        "round_off_label": "Round Off",
        "enable_associate_products": True
    }
    if pref and pref.data:
        try:
            saved = json.loads(pref.data)
            default_settings.update(saved)
        except Exception:
            pass
    return default_settings


@router.put("/api/settings/billing/account-settings")
@router.put("/settings/billing/account-settings")
def update_billing_account_settings(payload: Dict[str, Any], c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:account_settings'
        )
    )
    if not pref:
        pref = c.db.scalar(
            select(m.UserPreference).where(
                m.UserPreference.user_id == c.user.id,
                m.UserPreference.section == 'billing:account_settings'
            )
        )
    if not pref:
        pref = m.UserPreference(
            id=str(uuid.uuid4()),
            user_id=c.user.id,
            facility_id=c.facility_id,
            section='billing:account_settings',
            data=json.dumps(payload)
        )
        c.db.add(pref)
    else:
        pref.data = json.dumps(payload)
        if c.facility_id:
            pref.facility_id = c.facility_id
    c.db.commit()
    store = load_store()
    store["billing_account_settings"] = payload
    save_store(store)
    return {"message": "Billing settings saved"}


@router.get("/api/settings/billing/payment-methods")
@router.get("/settings/billing/payment-methods")
def list_payment_methods(c: context = Depends(context)):
    ensure_billing_defaults(c)
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'payment_method'
        )
    ).all()
    return [{"id": i.id, "name": i.name, "active": i.active} for i in items]


@router.post("/api/settings/billing/payment-methods")
@router.post("/settings/billing/payment-methods")
def add_payment_method(payload: Dict[str, str], c: context = Depends(context)):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Payment method name is required")
    item = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='payment_method',
        code=f"PM_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}",
        name=name,
        content=json.dumps({"name": name}),
        active=True
    )
    c.db.add(item)
    c.db.commit()
    return {"id": item.id, "message": "Payment method added"}


@router.delete("/api/settings/billing/payment-methods/{item_id}")
@router.delete("/settings/billing/payment-methods/{item_id}")
def delete_payment_method(item_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'payment_method',
            m.Catalog.id == item_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Payment method not found")
    c.db.delete(item)
    c.db.commit()
    return {"message": "Payment method removed"}


@router.get("/api/settings/billing/write-off-types")
@router.get("/settings/billing/write-off-types")
def list_write_off_types(c: context = Depends(context)):
    ensure_billing_defaults(c)
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'write_off_type'
        )
    ).all()
    return [{"id": i.id, "name": i.name, "active": i.active} for i in items]


@router.post("/api/settings/billing/write-off-types")
@router.post("/settings/billing/write-off-types")
def add_write_off_type(payload: Dict[str, str], c: context = Depends(context)):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Write-off type name is required")
    item = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='write_off_type',
        code=f"WO_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}",
        name=name,
        content=json.dumps({"name": name}),
        active=True
    )
    c.db.add(item)
    c.db.commit()
    return {"id": item.id, "message": "Write-off type added"}


@router.delete("/api/settings/billing/write-off-types/{item_id}")
@router.delete("/settings/billing/write-off-types/{item_id}")
def delete_write_off_type(item_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'write_off_type',
            m.Catalog.id == item_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Write-off type not found")
    c.db.delete(item)
    c.db.commit()
    return {"message": "Write-off type removed"}


@router.get("/api/settings/billing/taxes")
@router.get("/settings/billing/taxes")
def list_taxes(c: context = Depends(context)):
    ensure_billing_defaults(c)
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'tax_rate'
        )
    ).all()
    results = []
    for i in items:
        data = json.loads(i.content) if i.content else {}
        results.append({
            "id": i.id,
            "name": i.name,
            "percentage": data.get("percent", 0.0),
            "active": i.active
        })
    return results


@router.post("/api/settings/billing/taxes")
@router.post("/settings/billing/taxes")
def add_tax(payload: Dict[str, Any], c: context = Depends(context)):
    name = payload.get("name", "").strip()
    percent = float(payload.get("percentage", 0.0))
    if not name:
        raise HTTPException(status_code=400, detail="Tax name is required")
    item = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='tax_rate',
        code=f"TAX_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}",
        name=name,
        content=json.dumps({"name": name, "percent": percent}),
        active=True
    )
    c.db.add(item)
    c.db.commit()
    return {"id": item.id, "message": "Tax added successfully"}


@router.delete("/api/settings/billing/taxes/{item_id}")
@router.delete("/settings/billing/taxes/{item_id}")
def delete_tax(item_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'tax_rate',
            m.Catalog.id == item_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Tax not found")
    c.db.delete(item)
    c.db.commit()
    return {"message": "Tax removed"}


# ============================================================================
# 4. PATIENT BILLING SETTINGS TAB (AUTOMATION, TEMPLATES, REMINDERS)
# ============================================================================

DEFAULT_PATIENT_AUTOMATION = {
    "enable_automation": True,
    "invoice_delivery_mode": "Send Invoices with Scheduled Reminders",
    "invoice_sms_template": "$FACILITY_NAME has sent you an Invoice #$INVOICE_NUMBER. $INVOICE_DETAILS_LINK",
    "default_pdf_template": "--Select--",
    "statement_phr_template": "Send Patient Statement PHR Template",
    "statement_email_template": "Send Patient Statement Email Template",
    "statement_sms_template": "$FACILITY_NAME has sent you your Balance Due Statement. $STATEMENT_DETAILS_LINK",
    "reminder_days_interval": 30
}

@router.get("/api/settings/billing/patient-automation")
@router.get("/settings/billing/patient-automation")
def get_patient_billing_automation(c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:patient_automation'
        )
    )
    if pref and pref.data:
        return json.loads(pref.data)
    return DEFAULT_PATIENT_AUTOMATION


@router.put("/api/settings/billing/patient-automation")
@router.put("/settings/billing/patient-automation")
def update_patient_billing_automation(payload: Dict[str, Any], c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:patient_automation'
        )
    )
    if not pref:
        pref = m.UserPreference(
            id=str(uuid.uuid4()),
            user_id=c.user.id,
            facility_id=c.facility_id,
            section='billing:patient_automation',
            data=json.dumps(payload)
        )
        c.db.add(pref)
    else:
        pref.data = json.dumps(payload)
    c.db.commit()
    store = load_store()
    store["patient_billing_automation"] = payload
    save_store(store)
    return {"message": "Patient billing automation settings saved"}


# ============================================================================
# 5. PROCEDURE CODE FOR LAB TESTS TAB
# ============================================================================

@router.get("/api/settings/billing/lab-mappings")
@router.get("/settings/billing/lab-mappings")
def list_lab_mappings(lab: Optional[str] = None, q: Optional[str] = None, c: context = Depends(context)):
    ensure_billing_defaults(c)
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'lab_procedure_mapping'
        )
    ).all()
    results = []
    for item in items:
        data = json.loads(item.content) if item.content else {}
        if lab and lab != "all" and data.get("lab") != lab:
            continue
        if q and q.strip():
            term = q.strip().lower()
            if term not in item.name.lower() and term not in data.get("cpt_code", "").lower() and term not in data.get("cpt_desc", "").lower():
                continue
        results.append({
            "id": item.id,
            "test_name": item.name,
            "cpt_desc": data.get("cpt_desc", ""),
            "cpt_code": data.get("cpt_code", ""),
            "charge": data.get("charge", 0.0),
            "lab": data.get("lab", "BioChemistry")
        })
    return sorted(results, key=lambda x: x["test_name"].lower())


@router.put("/api/settings/billing/lab-mappings/{mapping_id}")
@router.put("/settings/billing/lab-mappings/{mapping_id}")
def update_lab_mapping(mapping_id: str, payload: Dict[str, Any], c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'lab_procedure_mapping',
            m.Catalog.id == mapping_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Lab mapping not found")
    data = json.loads(item.content) if item.content else {}
    data.update({
        "cpt_desc": payload.get("cpt_desc", "").strip(),
        "cpt_code": payload.get("cpt_code", "").strip(),
        "charge": float(payload.get("charge", 0.0))
    })
    item.content = json.dumps(data)
    c.db.commit()
    return {"message": "Lab mapping updated"}


@router.post("/api/settings/billing/lab-mappings/unmap")
@router.post("/settings/billing/lab-mappings/unmap")
def unmap_lab_mappings(payload: Dict[str, List[str]], c: context = Depends(context)):
    ids = payload.get("ids", [])
    if not ids:
        return {"message": "No tests specified"}
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'lab_procedure_mapping',
            m.Catalog.id.in_(ids)
        )
    ).all()
    for item in items:
        data = json.loads(item.content) if item.content else {}
        data["cpt_desc"] = ""
        data["cpt_code"] = ""
        data["charge"] = 0.0
        item.content = json.dumps(data)
    c.db.commit()
    return {"message": f"Unmapped {len(items)} lab test procedure codes"}


# ============================================================================
# 6. BILLING PACKAGES ENDPOINTS
# ============================================================================

@router.get("/api/settings/billing/packages-settings")
@router.get("/settings/billing/packages-settings")
def get_packages_settings(c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:packages_settings'
        )
    )
    if pref and pref.data:
        return json.loads(pref.data)
    return {"allow_expired_packages": True}


@router.put("/api/settings/billing/packages-settings")
@router.put("/settings/billing/packages-settings")
def update_packages_settings(payload: Dict[str, Any], c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:packages_settings'
        )
    )
    if not pref:
        pref = m.UserPreference(
            id=str(uuid.uuid4()),
            user_id=c.user.id,
            facility_id=c.facility_id,
            section='billing:packages_settings',
            data=json.dumps(payload)
        )
        c.db.add(pref)
    else:
        pref.data = json.dumps(payload)
    c.db.commit()
    store = load_store()
    store["billing_packages_settings"] = payload
    save_store(store)
    return {"message": "Billing package settings saved"}


@router.get("/api/settings/billing/packages")
@router.get("/settings/billing/packages")
def list_billing_packages(q: Optional[str] = None, c: context = Depends(context)):
    ensure_billing_defaults(c)
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'billing_package'
        )
    ).all()
    results = []
    for item in items:
        data = json.loads(item.content) if item.content else {}
        if q and q.strip():
            term = q.strip().lower()
            if term not in item.name.lower() and term not in item.code.lower():
                continue
        results.append({
            "id": item.id,
            "name": item.name,
            "code": item.code,
            "billing_code": data.get("billing_code", "--"),
            "charge": data.get("charge", item.price_paise / 100 if item.price_paise else 0.0),
            "period": data.get("period", "1 Month(s)"),
            "status": data.get("status", "Active" if item.active else "Inactive"),
            "patients_count": data.get("patients_count", 0),
            "procedures": data.get("procedures", []),
            "labs": data.get("labs", []),
            "include_products": data.get("include_products", False),
            "active": item.active
        })
    return results


@router.post("/api/settings/billing/packages")
@router.post("/settings/billing/packages")
def create_billing_package(payload: Dict[str, Any], c: context = Depends(context)):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Package name is required")

    code = payload.get("code", "").strip() or f"PKG_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}"
    charge = float(payload.get("charge", 0.0))
    item = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='billing_package',
        code=code,
        name=name,
        content=json.dumps({
            "name": name,
            "code": code,
            "billing_code": payload.get("billing_code", f"[{code}] {name}"),
            "charge": charge,
            "period": payload.get("period", "1 Month(s)"),
            "status": payload.get("status", "Active"),
            "patients_count": 0,
            "procedures": payload.get("procedures", []),
            "labs": payload.get("labs", []),
            "include_products": bool(payload.get("include_products", False))
        }),
        price_paise=int(charge * 100),
        active=True
    )
    c.db.add(item)
    c.db.commit()
    return {"id": item.id, "message": "Package created successfully"}


@router.put("/api/settings/billing/packages/{pkg_id}")
@router.put("/settings/billing/packages/{pkg_id}")
def update_billing_package(pkg_id: str, payload: Dict[str, Any], c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'billing_package',
            m.Catalog.id == pkg_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Billing package not found")
    data = json.loads(item.content) if item.content else {}
    if "name" in payload:
        item.name = payload["name"].strip()
    charge = float(payload.get("charge", data.get("charge", item.price_paise / 100 if item.price_paise else 0.0)))
    data.update({
        "name": item.name,
        "billing_code": payload.get("billing_code", data.get("billing_code", "--")),
        "charge": charge,
        "period": payload.get("period", data.get("period", "1 Month(s)")),
        "status": payload.get("status", data.get("status", "Active")),
        "procedures": payload.get("procedures", data.get("procedures", [])),
        "labs": payload.get("labs", data.get("labs", [])),
        "include_products": payload.get("include_products", data.get("include_products", False))
    })
    item.price_paise = int(charge * 100)
    item.content = json.dumps(data)
    c.db.commit()
    return {"message": "Billing package updated"}


@router.delete("/api/settings/billing/packages/{pkg_id}")
@router.delete("/settings/billing/packages/{pkg_id}")
def delete_billing_package(pkg_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'billing_package',
            m.Catalog.id == pkg_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Billing package not found")
    c.db.delete(item)
    c.db.commit()
    return {"message": "Billing package removed"}


# ============================================================================
# 7. INVOICE TEMPLATES ENDPOINTS
# ============================================================================

@router.get("/api/settings/billing/invoice-templates")
@router.get("/settings/billing/invoice-templates")
def list_invoice_templates(c: context = Depends(context)):
    ensure_billing_defaults(c)
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'invoice_template'
        )
    ).all()
    results = []
    for item in items:
        data = json.loads(item.content) if item.content else {}
        results.append({
            "id": item.id,
            "name": item.name,
            "code": item.code,
            "is_default": data.get("is_default", False),
            "is_active": item.active,
            "type": data.get("type", "standard")
        })
    return results


@router.put("/api/settings/billing/invoice-templates/{tmpl_id}/set-default")
@router.put("/settings/billing/invoice-templates/{tmpl_id}/set-default")
def set_default_invoice_template(tmpl_id: str, c: context = Depends(context)):
    items = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'invoice_template'
        )
    ).all()
    for item in items:
        data = json.loads(item.content) if item.content else {}
        if item.id == tmpl_id:
            data["is_default"] = True
            item.active = True
        else:
            data["is_default"] = False
        item.content = json.dumps(data)
    c.db.commit()
    return {"message": "Default invoice template set"}


@router.put("/api/settings/billing/invoice-templates/{tmpl_id}/toggle-active")
@router.put("/settings/billing/invoice-templates/{tmpl_id}/toggle-active")
def toggle_invoice_template_active(tmpl_id: str, c: context = Depends(context)):
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'invoice_template',
            m.Catalog.id == tmpl_id
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Template not found")
    item.active = not item.active
    data = json.loads(item.content) if item.content else {}
    data["is_active"] = item.active
    item.content = json.dumps(data)
    c.db.commit()
    return {"message": "Invoice template active status toggled", "is_active": item.active}


# ============================================================================
# 8. RECEIPT TEMPLATES & RAZORPAY
# ============================================================================

@router.get("/api/settings/billing/receipt-templates")
@router.get("/settings/billing/receipt-templates")
def get_receipt_templates(c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:receipt_templates'
        )
    )
    if pref and pref.data:
        return json.loads(pref.data)
    return {
        "receipt_prefix": "HYN-REC",
        "show_upi_qr": True,
        "footer_note": "Thank you for choosing Heal Your Heart Cardiology Centre. Keep this receipt for tax deduction under 80D.",
        "show_digital_stamp": True
    }


@router.put("/api/settings/billing/receipt-templates")
@router.put("/settings/billing/receipt-templates")
def update_receipt_templates(payload: Dict[str, Any], c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:receipt_templates'
        )
    )
    if not pref:
        pref = m.UserPreference(
            id=str(uuid.uuid4()),
            user_id=c.user.id,
            facility_id=c.facility_id,
            section='billing:receipt_templates',
            data=json.dumps(payload)
        )
        c.db.add(pref)
    else:
        pref.data = json.dumps(payload)
    c.db.commit()
    return {"message": "Receipt templates saved"}


@router.get("/api/settings/billing/razorpay")
@router.get("/settings/billing/razorpay")
def get_razorpay_settings(c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:razorpay'
        )
    )
    if pref and pref.data:
        return json.loads(pref.data)
    return {
        "enabled": True,
        "key_id": "rzp_live_HealYourHeartEHR2026",
        "key_secret": "••••••••••••••••••••••••",
        "auto_send_payment_links": True,
        "webhook_url": "https://api.healyourheart.in/webhooks/razorpay"
    }


@router.put("/api/settings/billing/razorpay")
@router.put("/settings/billing/razorpay")
def update_razorpay_settings(payload: Dict[str, Any], c: context = Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'billing:razorpay'
        )
    )
    if not pref:
        pref = m.UserPreference(
            id=str(uuid.uuid4()),
            user_id=c.user.id,
            facility_id=c.facility_id,
            section='billing:razorpay',
            data=json.dumps(payload)
        )
        c.db.add(pref)
    else:
        pref.data = json.dumps(payload)
    c.db.commit()
    return {"message": "Razorpay settings saved"}
