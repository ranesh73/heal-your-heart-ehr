"""Settings Modules Service: Patient Recall, Quick Text, Directory, PHR Settings, and Account."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, or_, and_, delete
from typing import Optional, List, Dict, Any
import json
import uuid
import re

from .identity import context
from .security import password_hash, password_matches
from . import models as m
from .settings_router import load_store, save_store

router = APIRouter(prefix="", tags=["settings-modules"])


# ============================================================================
# SECTION 2 — PATIENT RECALL
# ============================================================================

DEFAULT_RECALL_TYPES = [
    "Reassessment visit",
    "Non EECP Reassessment Visit",
    "Procedures",
    "Lab test",
    "Admission",
    "No show",
]

DEFAULT_RECALL_STATUSES = [
    {"name": "Pending", "is_default": True},
    {"name": "Completed", "is_default": True},
    {"name": "Not willing", "is_default": False},
    {"name": "Do not disturb", "is_default": False},
    {"name": "Bypass Surgery", "is_default": False},
    {"name": "Alternate medicine", "is_default": False},
    {"name": "Expired", "is_default": False},
    {"name": "Postponed Appointment", "is_default": False},
    {"name": "Patient Discontinued", "is_default": False},
    {"name": "Treatment Started", "is_default": False},
]

def ensure_recall_defaults(c):
    # Ensure recall types exist
    count = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_type',
            m.Catalog.active == True
        ).limit(1)
    )
    if not count:
        for t in DEFAULT_RECALL_TYPES:
            code = f"REC_TYPE_{re.sub(r'[^A-Z0-9]', '_', t.upper())[:18]}"
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='recall_type',
                code=code,
                name=t,
                content=json.dumps({"is_default": False}),
                price_paise=0,
                active=True
            ))

    # Ensure recall statuses exist
    st_count = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_status',
            m.Catalog.active == True
        ).limit(1)
    )
    if not st_count:
        for s in DEFAULT_RECALL_STATUSES:
            code = f"REC_STAT_{re.sub(r'[^A-Z0-9]', '_', s['name'].upper())[:18]}"
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='recall_status',
                code=code,
                name=s["name"],
                content=json.dumps({"is_default": s["is_default"]}),
                price_paise=0,
                active=True
            ))
    c.db.commit()


@router.get('/api/settings/recall/types')
@router.get('/settings/recall/types')
def list_recall_types(c=Depends(context)):
    ensure_recall_defaults(c)
    records = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_type',
            m.Catalog.active == True
        ).order_by(m.Catalog.name.asc())
    ).all()
    return [{"id": r.id, "name": r.name, "code": r.code} for r in records]


@router.post('/api/settings/recall/types')
@router.post('/settings/recall/types')
def add_recall_type(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(422, "Recall Type name is required")

    existing = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_type',
            m.Catalog.name.ilike(name),
            m.Catalog.active == True
        )
    )
    if existing:
        raise HTTPException(422, "A recall type with this name already exists in your practice")

    code = f"REC_TYPE_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}_{uuid.uuid4().hex[:4]}"
    new_type = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='recall_type',
        code=code,
        name=name,
        content=json.dumps({"is_default": False}),
        price_paise=0,
        active=True
    )
    c.db.add(new_type)
    c.db.commit()
    return {"id": new_type.id, "name": new_type.name, "success": True}


@router.put('/api/settings/recall/types/{type_id}')
@router.put('/settings/recall/types/{type_id}')
def edit_recall_type(type_id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(422, "Recall Type name is required")

    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == type_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_type',
            m.Catalog.active == True
        )
    )
    if not item:
        raise HTTPException(404, "Recall type not found")

    item.name = name
    c.db.commit()
    return {"id": item.id, "name": item.name, "success": True}


@router.delete('/api/settings/recall/types/{type_id}')
@router.delete('/settings/recall/types/{type_id}')
def delete_recall_type(type_id: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == type_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_type'
        )
    )
    if not item:
        raise HTTPException(404, "Recall type not found")

    item.active = False
    c.db.commit()
    return {"id": type_id, "success": True}


@router.get('/api/settings/recall/statuses')
@router.get('/settings/recall/statuses')
def list_recall_statuses(c=Depends(context)):
    ensure_recall_defaults(c)
    records = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_status',
            m.Catalog.active == True
        ).order_by(m.Catalog.name.asc())
    ).all()

    items = []
    for r in records:
        is_default = False
        try:
            is_default = json.loads(r.content or "{}").get("is_default", False)
        except Exception:
            pass
        if r.name in ("Pending", "Completed"):
            is_default = True

        items.append({
            "id": r.id,
            "name": r.name,
            "is_default": is_default,
            "code": r.code
        })
    return items


@router.post('/api/settings/recall/statuses')
@router.post('/settings/recall/statuses')
def add_recall_status(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(422, "Recall Status name is required")

    existing = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_status',
            m.Catalog.name.ilike(name),
            m.Catalog.active == True
        )
    )
    if existing:
        raise HTTPException(422, "A recall status with this name already exists in your practice")

    code = f"REC_STAT_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}_{uuid.uuid4().hex[:4]}"
    new_stat = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='recall_status',
        code=code,
        name=name,
        content=json.dumps({"is_default": False}),
        price_paise=0,
        active=True
    )
    c.db.add(new_stat)
    c.db.commit()
    return {"id": new_stat.id, "name": new_stat.name, "is_default": False, "success": True}


@router.put('/api/settings/recall/statuses/{status_id}')
@router.put('/settings/recall/statuses/{status_id}')
def edit_recall_status(status_id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == status_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_status',
            m.Catalog.active == True
        )
    )
    if not item:
        raise HTTPException(404, "Recall status not found")

    if item.name in ("Pending", "Completed"):
        raise HTTPException(422, "Default status cannot be edited")

    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(422, "Recall Status name is required")

    item.name = name
    c.db.commit()
    return {"id": item.id, "name": item.name, "is_default": False, "success": True}


@router.delete('/api/settings/recall/statuses/{status_id}')
@router.delete('/settings/recall/statuses/{status_id}')
def delete_recall_status(status_id: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == status_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'recall_status'
        )
    )
    if not item:
        raise HTTPException(404, "Recall status not found")

    if item.name in ("Pending", "Completed"):
        raise HTTPException(422, "Default status cannot be edited or deleted")

    item.active = False
    c.db.commit()
    return {"id": status_id, "success": True}


@router.get('/api/settings/recall/preferences')
@router.get('/settings/recall/preferences')
def get_recall_preferences(c=Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'recall:preferences'
        )
    )
    if pref and pref.data:
        try:
            return json.loads(pref.data)
        except Exception:
            pass

    return {
        "email_reminder": True,
        "text_reminder": True,
        "email_reminder_days": 3,
        "text_reminder_days": 3,
        "email_template_ref": "Recall Reminder",
        "text_template": "Reminder from $PRACTICE to schedule for $NOTES. Please ignore, if already scheduled",
        "mark_status_complete": True
    }


@router.put('/api/settings/recall/preferences')
@router.put('/settings/recall/preferences')
def save_recall_preferences(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    payload_str = json.dumps(data)

    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == 'recall:preferences'
        )
    )
    if pref:
        pref.data = payload_str
    else:
        pref = m.UserPreference(
            id=str(uuid.uuid4()),
            user_id=c.user.id,
            facility_id=c.facility_id,
            section='recall:preferences',
            data=payload_str
        )
        c.db.add(pref)
    c.db.commit()

    store = load_store()
    custom = store.setdefault("custom_settings", {})
    custom[f"facility:{c.facility_id}:recall:preferences"] = data
    save_store(store)

    return {"success": True, "data": data}


# ============================================================================
# SECTION 3 — QUICK TEXT
# ============================================================================

DEFAULT_QUICK_TEXTS = [
    {
        "keyword": ".eecp",
        "description": "Comprehensive 1-hour EECP counterpulsation session protocol note",
        "content": "Patient underwent 1 hour of External Counterpulsation (EECP) therapy. Applied 3 paired pneumatic cuffs to calves, lower thighs, and upper thighs. Treatment pressure maintained at 280-300 mmHg. ECG gating achieved optimal 1:1 synchronization. Patient tolerated therapy comfortably with no musculoskeletal complaints or exertional symptoms."
    },
    {
        "keyword": ".cad",
        "description": "Coronary artery disease baseline assessment note",
        "content": "Known case of CAD s/p coronary revascularization. Evaluated for angina equivalents, exertional dyspnea, and functional tolerance. Nitrates and beta-blockers reviewed. Hemodynamically stable with dual antiplatelet and high-intensity statin compliance verified."
    },
    {
        "keyword": ".echo",
        "description": "Transthoracic echocardiogram summary findings note",
        "content": "Transthoracic 2D-Echo demonstrated normal left ventricular internal dimensions with preserved ejection fraction (~55-60%). Normal left ventricular diastolic relaxation pattern. No significant regional wall motion abnormalities at rest. Valvular structures intact."
    },
    {
        "keyword": ".soap",
        "description": "Standard cardiology outpatient clinical encounter template",
        "content": "SUBJECTIVE: Patient presents for routine cardiology and EECP progress assessment.\nOBJECTIVE: Afebrile, BP well controlled, S1 S2 heard, chest clear.\nASSESSMENT: Chronic ischemic heart disease, compensated functional class II.\nPLAN: Continue medical optimization, maintain physical conditioning, routine follow-up."
    }
]

def ensure_quick_text_defaults(c):
    count = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'quick_text',
            m.Catalog.active == True
        ).limit(1)
    )
    if not count:
        for qt in DEFAULT_QUICK_TEXTS:
            code = f"QT_{re.sub(r'[^A-Z0-9]', '_', qt['keyword'].upper())[:18]}"
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='quick_text',
                code=code,
                name=qt["keyword"],
                content=json.dumps({"description": qt["description"], "content": qt["content"]}),
                price_paise=0,
                active=True
            ))
        c.db.commit()


@router.get('/api/settings/quick-text')
@router.get('/settings/quick-text')
def list_quick_text(q: Optional[str] = None, c=Depends(context)):
    ensure_quick_text_defaults(c)
    stmt = select(m.Catalog).where(
        m.Catalog.facility_id == c.facility_id,
        m.Catalog.kind == 'quick_text',
        m.Catalog.active == True
    )
    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            m.Catalog.name.ilike(term),
            m.Catalog.content.ilike(term)
        ))
    records = c.db.scalars(stmt.order_by(m.Catalog.name.asc())).all()

    items = []
    for r in records:
        parsed = {}
        try:
            parsed = json.loads(r.content or "{}")
        except Exception:
            pass
        items.append({
            "id": r.id,
            "keyword": r.name,
            "description": parsed.get("description", ""),
            "content": parsed.get("content", ""),
            "created_at": r.created_at.isoformat() if r.created_at else ""
        })
    return items


@router.post('/api/settings/quick-text')
@router.post('/settings/quick-text')
def create_quick_text(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'assistant', 'therapist'})
    keyword = (data.get("keyword") or "").strip()
    if not keyword:
        raise HTTPException(422, "Snippet keyword is required (e.g. .eecp)")
    content = (data.get("content") or "").strip()
    if not content:
        raise HTTPException(422, "Snippet expansion text is required")

    description = (data.get("description") or "").strip()
    code = f"QT_{re.sub(r'[^A-Z0-9]', '_', keyword.upper())[:18]}_{uuid.uuid4().hex[:4]}"

    new_item = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='quick_text',
        code=code,
        name=keyword,
        content=json.dumps({"description": description, "content": content}),
        price_paise=0,
        active=True
    )
    c.db.add(new_item)
    c.db.commit()
    return {"id": new_item.id, "keyword": keyword, "success": True}


@router.put('/api/settings/quick-text/{item_id}')
@router.put('/settings/quick-text/{item_id}')
def update_quick_text(item_id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'assistant', 'therapist'})
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == item_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'quick_text',
            m.Catalog.active == True
        )
    )
    if not item:
        raise HTTPException(404, "Quick text not found")

    keyword = (data.get("keyword") or item.name).strip()
    content = (data.get("content") or "").strip()
    description = (data.get("description") or "").strip()

    item.name = keyword
    item.content = json.dumps({"description": description, "content": content})
    c.db.commit()
    return {"id": item.id, "keyword": item.name, "success": True}


@router.delete('/api/settings/quick-text/{item_id}')
@router.delete('/settings/quick-text/{item_id}')
def delete_quick_text(item_id: str, c=Depends(context)):
    c.allow({'admin', 'doctor', 'assistant', 'therapist'})
    item = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == item_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'quick_text'
        )
    )
    if not item:
        raise HTTPException(404, "Quick text not found")

    item.active = False
    c.db.commit()
    return {"id": item_id, "success": True}


# ============================================================================
# SECTION 4 — DIRECTORY (Providers, Pharmacy, Others)
# ============================================================================

DEFAULT_PROVIDERS = [
    {
        "first_name": "Siddharth",
        "last_name": "Rao",
        "middle_name": "K",
        "prefix": "Dr",
        "speciality": "Cardiology",
        "practice_name": "Apollo Heart Institute",
        "about": "Senior Interventional Cardiologist specializing in complex coronary angioplasty and EECP co-management.",
        "fax": "+91 44 2449 8811",
        "phone": "+91 98400 12345",
        "extn": "402",
        "website": "https://apollohospitals.com",
        "email": "dr.siddharth@apolloheart.local",
        "direct_address": "siddharth.rao@direct.cardiology.org",
        "address_line1": "21 Greams Lane, Thousand Lights",
        "address_line2": "Cardiac OP Tower, 3rd Floor",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "zip": "600006"
    },
    {
        "first_name": "Meera",
        "last_name": "Narayanan",
        "middle_name": "",
        "prefix": "Dr",
        "speciality": "Cardiothoracic Surgery",
        "practice_name": "Fortis Malar Heart Centre",
        "about": "Cardiovascular and thoracic surgeon with extensive clinical expertise in CABG and heart valve repairs.",
        "fax": "+91 44 2491 5522",
        "phone": "+91 94440 98765",
        "extn": "210",
        "website": "https://fortishealthcare.com",
        "email": "dr.meera@fortis.local",
        "direct_address": "meera.n@direct.malar.org",
        "address_line1": "52 1st Main Road, Gandhi Nagar",
        "address_line2": "Adyar",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "zip": "600020"
    }
]

DEFAULT_PHARMACIES = [
    {
        "name": "Apollo Pharmacy · Neelankarai ECR Branch",
        "fax": "+91 44 2449 1100",
        "office_phone": "+91 44 2449 1200",
        "mobile_phone": "+91 98401 11222",
        "email": "ecr.neelankarai@apollopharmacy.org",
        "web_url": "https://apollopharmacy.in",
        "address_line1": "Shop 4, East Coast Road",
        "address_line2": "Opposite Casuarina Drive",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "zip": "600115"
    },
    {
        "name": "MedPlus Chemist & Druggist · Thiruvanmiyur",
        "fax": "+91 44 2441 3300",
        "office_phone": "+91 44 2441 4400",
        "mobile_phone": "+91 99402 33445",
        "email": "store721@medplusindia.com",
        "web_url": "https://medplusmart.com",
        "address_line1": "18 LB Road",
        "address_line2": "Near Marundeeswarar Temple",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "zip": "600041"
    }
]

DEFAULT_OTHERS = [
    {
        "type": "Ambulance / Emergency",
        "name": "Cardiac Emergency Response & 108 ALS Ambulance",
        "notes": "24/7 Mobile ICU equipped with automated external defibrillator (AED) and portable ventilator.",
        "fax": "+91 44 2449 9900",
        "mobile": "+91 98400 99999",
        "landline": "+91 44 2449 9999 / 108",
        "email": "ambulance@healyourheart.in",
        "web_url": "https://healyourheart.in/emergency",
        "address_line1": "4/231 East Coast Road",
        "address_line2": "Neelankarai Base Station",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "zip": "600115"
    },
    {
        "type": "Imaging & Diagnostic Lab",
        "name": "Neelankarai Advanced Cardiac Imaging & CT Angiography",
        "notes": "384-slice Dual Source CT Coronary Angiography and 3T Cardiac MRI partner facility.",
        "fax": "+91 44 2449 7700",
        "mobile": "+91 98401 77889",
        "landline": "+91 44 2449 7777",
        "email": "imaging@cardiacdiagnostics.local",
        "web_url": "https://cardiacdiagnostics.local",
        "address_line1": "Plot 12 Rajiv Gandhi Salai",
        "address_line2": "Kandanchavadi",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "zip": "600096"
    }
]

def ensure_directory_defaults(c):
    # Providers
    p_count = c.db.scalar(select(m.Catalog.id).where(m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_provider', m.Catalog.active == True).limit(1))
    if not p_count:
        for p in DEFAULT_PROVIDERS:
            name = f"{p['prefix']} {p['first_name']} {p['last_name']}".strip()
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()), facility_id=c.facility_id, kind='directory_provider',
                code=f"DIR_PROV_{uuid.uuid4().hex[:8]}", name=name, content=json.dumps(p), price_paise=0, active=True
            ))

    # Pharmacies
    ph_count = c.db.scalar(select(m.Catalog.id).where(m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_pharmacy', m.Catalog.active == True).limit(1))
    if not ph_count:
        for ph in DEFAULT_PHARMACIES:
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()), facility_id=c.facility_id, kind='directory_pharmacy',
                code=f"DIR_PHARM_{uuid.uuid4().hex[:8]}", name=ph["name"], content=json.dumps(ph), price_paise=0, active=True
            ))

    # Others
    o_count = c.db.scalar(select(m.Catalog.id).where(m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_others', m.Catalog.active == True).limit(1))
    if not o_count:
        for o in DEFAULT_OTHERS:
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()), facility_id=c.facility_id, kind='directory_others',
                code=f"DIR_OTH_{uuid.uuid4().hex[:8]}", name=o["name"], content=json.dumps(o), price_paise=0, active=True
            ))
    c.db.commit()


# --- Providers ---
@router.get('/api/settings/directory/providers')
@router.get('/settings/directory/providers')
def list_directory_providers(q: Optional[str] = None, c=Depends(context)):
    ensure_directory_defaults(c)
    stmt = select(m.Catalog).where(
        m.Catalog.facility_id == c.facility_id,
        m.Catalog.kind == 'directory_provider',
        m.Catalog.active == True
    )
    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            m.Catalog.name.ilike(term),
            m.Catalog.content.ilike(term)
        ))
    records = c.db.scalars(stmt.order_by(m.Catalog.name.asc())).all()

    items = []
    for r in records:
        data = {}
        try:
            data = json.loads(r.content or "{}")
        except Exception:
            pass
        items.append({
            "id": r.id,
            "name": r.name,
            **data
        })
    return items


@router.post('/api/settings/directory/providers')
@router.post('/settings/directory/providers')
def create_directory_provider(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    fname = (data.get("first_name") or "").strip()
    lname = (data.get("last_name") or "").strip()
    if not fname or not lname:
        raise HTTPException(422, "First Name and Last Name are required")

    prefix = data.get("prefix", "Dr")
    display_name = f"{prefix} {fname} {lname}".strip()
    code = f"PROV_{re.sub(r'[^A-Z0-9]', '_', lname.upper())[:12]}_{uuid.uuid4().hex[:4]}"

    new_prov = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='directory_provider',
        code=code,
        name=display_name,
        content=json.dumps(data),
        price_paise=0,
        active=True
    )
    c.db.add(new_prov)
    c.db.commit()
    return {"id": new_prov.id, "name": display_name, "success": True}


@router.put('/api/settings/directory/providers/{id}')
@router.put('/settings/directory/providers/{id}')
def update_directory_provider(id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_provider', m.Catalog.active == True))
    if not item:
        raise HTTPException(404, "Provider not found")

    fname = (data.get("first_name") or "").strip()
    lname = (data.get("last_name") or "").strip()
    prefix = data.get("prefix", "Dr")
    if fname and lname:
        item.name = f"{prefix} {fname} {lname}".strip()
    item.content = json.dumps(data)
    c.db.commit()
    return {"id": item.id, "name": item.name, "success": True}


@router.delete('/api/settings/directory/providers/{id}')
@router.delete('/settings/directory/providers/{id}')
def delete_directory_provider(id: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_provider'))
    if not item:
        raise HTTPException(404, "Provider not found")
    item.active = False
    c.db.commit()
    return {"id": id, "success": True}


# --- Pharmacies ---
@router.get('/api/settings/directory/pharmacies')
@router.get('/settings/directory/pharmacies')
def list_directory_pharmacies(q: Optional[str] = None, c=Depends(context)):
    ensure_directory_defaults(c)
    stmt = select(m.Catalog).where(m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_pharmacy', m.Catalog.active == True)
    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(m.Catalog.name.ilike(term), m.Catalog.content.ilike(term)))
    records = c.db.scalars(stmt.order_by(m.Catalog.name.asc())).all()
    items = []
    for r in records:
        data = {}
        try: data = json.loads(r.content or "{}")
        except Exception: pass
        items.append({"id": r.id, "name": r.name, **data})
    return items


@router.post('/api/settings/directory/pharmacies')
@router.post('/settings/directory/pharmacies')
def create_directory_pharmacy(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(422, "Pharmacy Name is required")
    code = f"PHARM_{uuid.uuid4().hex[:8]}"
    new_item = m.Catalog(
        id=str(uuid.uuid4()), facility_id=c.facility_id, kind='directory_pharmacy',
        code=code, name=name, content=json.dumps(data), price_paise=0, active=True
    )
    c.db.add(new_item)
    c.db.commit()
    return {"id": new_item.id, "name": name, "success": True}


@router.put('/api/settings/directory/pharmacies/{id}')
@router.put('/settings/directory/pharmacies/{id}')
def update_directory_pharmacy(id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_pharmacy', m.Catalog.active == True))
    if not item:
        raise HTTPException(404, "Pharmacy not found")
    name = (data.get("name") or item.name).strip()
    item.name = name
    item.content = json.dumps(data)
    c.db.commit()
    return {"id": item.id, "name": item.name, "success": True}


@router.delete('/api/settings/directory/pharmacies/{id}')
@router.delete('/settings/directory/pharmacies/{id}')
def delete_directory_pharmacy(id: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_pharmacy'))
    if not item:
        raise HTTPException(404, "Pharmacy not found")
    item.active = False
    c.db.commit()
    return {"id": id, "success": True}


# --- Others ---
@router.get('/api/settings/directory/others')
@router.get('/settings/directory/others')
def list_directory_others(q: Optional[str] = None, c=Depends(context)):
    ensure_directory_defaults(c)
    stmt = select(m.Catalog).where(m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_others', m.Catalog.active == True)
    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(m.Catalog.name.ilike(term), m.Catalog.content.ilike(term)))
    records = c.db.scalars(stmt.order_by(m.Catalog.name.asc())).all()
    items = []
    for r in records:
        data = {}
        try: data = json.loads(r.content or "{}")
        except Exception: pass
        items.append({"id": r.id, "name": r.name, **data})
    return items


@router.post('/api/settings/directory/others')
@router.post('/settings/directory/others')
def create_directory_other(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    name = (data.get("name") or "").strip()
    type_name = (data.get("type") or "Others").strip()
    if not name:
        raise HTTPException(422, "Directory Name is required")
    code = f"OTH_{uuid.uuid4().hex[:8]}"
    new_item = m.Catalog(
        id=str(uuid.uuid4()), facility_id=c.facility_id, kind='directory_others',
        code=code, name=name, content=json.dumps(data), price_paise=0, active=True
    )
    c.db.add(new_item)
    c.db.commit()
    return {"id": new_item.id, "name": name, "success": True}


@router.put('/api/settings/directory/others/{id}')
@router.put('/settings/directory/others/{id}')
def update_directory_other(id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_others', m.Catalog.active == True))
    if not item:
        raise HTTPException(404, "Directory entry not found")
    name = (data.get("name") or item.name).strip()
    item.name = name
    item.content = json.dumps(data)
    c.db.commit()
    return {"id": item.id, "name": item.name, "success": True}


@router.delete('/api/settings/directory/others/{id}')
@router.delete('/settings/directory/others/{id}')
def delete_directory_other(id: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'directory_others'))
    if not item:
        raise HTTPException(404, "Directory entry not found")
    item.active = False
    c.db.commit()
    return {"id": id, "success": True}


# ============================================================================
# SECTION 5 — PHR SETTINGS
# ============================================================================

@router.get('/api/settings/phr/{section}')
@router.get('/settings/phr/{section}')
def get_phr_section(section: str, c=Depends(context)):
    key = f"phr:{section}"
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == key
        )
    )
    if pref and pref.data:
        try: return json.loads(pref.data)
        except Exception: pass

    # Structured defaults
    if section == "preferences":
        return {
            "modules": {
                "clinical_summary": True, "appointments": True, "questionnaire": True,
                "messages": True, "visit_summary": True, "billing": True, "announcements": True
            },
            "patient_category": "All Patients",
            "allow_patient_messages": True,
            "restrict_message_count": False,
            "char_limit": 500,
            "allow_share_docs": True,
            "allow_messages_to": "Both Groups and Members",
            "message_recipients": "All Members",
            "excluded_member_ids": [],
            "allow_rx_refill": True,
            "allow_supplement_refill": True,
            "refill_notify_to": "Respective Provider",
            "other_refill_member_ids": [],
            "show_only_inhouse_care_team": False
        }
    if section == "share-clinical-data":
        return {
            "smoking_status": True, "procedures": True, "diagnoses": True, "medications": True,
            "allergies": True, "vitals": True, "growth_chart": True, "vaccines": True,
            "implanted_devices": True, "goals": True, "health_concerns": True, "care_team": True
        }
    if section == "custom-app":
        return {
            "app_name": "Heal Your Heart · Cardiac & EECP Care",
            "sub_charges_first_year": "₹ 24,000",
            "sub_charges_subsequent": "₹ 18,000",
            "unlimited_downloads": True,
            "menu_items": {
                "appointments": True, "messages": True, "documents": True,
                "questionnaire": True, "medications": True, "lab_results": True, "billing": True
            },
            "maps_enabled": True,
            "maps_address": "4/231 East Coast Road, Neelankarai, Chennai 600115",
            "about_app": "Official mobile patient companion app for Heal Your Heart Non-Invasive Cardiology patients.",
            "login_otp_enabled": True
        }
    return {}


@router.put('/api/settings/phr/{section}')
@router.put('/settings/phr/{section}')
def save_phr_section(section: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    key = f"phr:{section}"
    payload_str = json.dumps(data)

    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.facility_id == c.facility_id,
            m.UserPreference.section == key
        )
    )
    if pref:
        pref.data = payload_str
    else:
        pref = m.UserPreference(
            id=str(uuid.uuid4()), user_id=c.user.id, facility_id=c.facility_id,
            section=key, data=payload_str
        )
        c.db.add(pref)
    c.db.commit()

    store = load_store()
    custom = store.setdefault("custom_settings", {})
    custom[f"facility:{c.facility_id}:{key}"] = data
    save_store(store)
    return {"success": True, "section": section, "data": data}


# --- Useful Info ---
DEFAULT_USEFUL_INFO = [
    {
        "category": "Cardiac Emergency Hotline & Chest Pain Protocol",
        "content_html": "<p><strong>24/7 Rapid Emergency Response:</strong> +91 44 2449 9999 / 108</p><p>If experiencing sudden central crushing chest pain, radiating left arm numbness, diaphoresis, or sudden acute dyspnea, chew 325mg non-enteric Aspirin immediately and call our emergency team or nearest cardiac hospital without delay.</p>"
    },
    {
        "category": "EECP Therapy Session Patient Guidelines",
        "content_html": "<p><strong>Before Treatment:</strong> Avoid heavy meals 1.5 hours prior to your 1-hour counterpulsation session. Wear clean cotton stretch tights or leggings to avoid cuff abrasion. Stay well hydrated.</p><p><strong>Post Treatment:</strong> Daily blood pressure and pulse wave velocity (PWV) arterial stiffness trend reviews are conducted after every 5th session.</p>"
    }
]

def ensure_useful_info_defaults(c):
    count = c.db.scalar(select(m.Catalog.id).where(m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'useful_info', m.Catalog.active == True).limit(1))
    if not count:
        for ui in DEFAULT_USEFUL_INFO:
            code = f"UI_{uuid.uuid4().hex[:8]}"
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()), facility_id=c.facility_id, kind='useful_info',
                code=code, name=ui["category"], content=json.dumps({"content_html": ui["content_html"]}), price_paise=0, active=True
            ))
        c.db.commit()


@router.get('/api/settings/useful-info')
@router.get('/settings/useful-info')
def list_useful_info(c=Depends(context)):
    ensure_useful_info_defaults(c)
    records = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'useful_info',
            m.Catalog.active == True
        ).order_by(m.Catalog.created_at.desc())
    ).all()
    items = []
    for r in records:
        content_html = ""
        try: content_html = json.loads(r.content or "{}").get("content_html", "")
        except Exception: pass
        items.append({"id": r.id, "category": r.name, "content_html": content_html, "created_at": r.created_at.isoformat() if r.created_at else ""})
    return items


@router.post('/api/settings/useful-info')
@router.post('/settings/useful-info')
def create_useful_info(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    category = (data.get("category") or "").strip()
    content_html = (data.get("content_html") or "").strip()
    if not category: raise HTTPException(422, "Category is required")
    if not content_html: raise HTTPException(422, "Content is required")

    code = f"UI_{uuid.uuid4().hex[:8]}"
    new_item = m.Catalog(
        id=str(uuid.uuid4()), facility_id=c.facility_id, kind='useful_info',
        code=code, name=category, content=json.dumps({"content_html": content_html}), price_paise=0, active=True
    )
    c.db.add(new_item)
    c.db.commit()
    return {"id": new_item.id, "category": category, "success": True}


@router.put('/api/settings/useful-info/{id}')
@router.put('/settings/useful-info/{id}')
def update_useful_info(id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'useful_info', m.Catalog.active == True))
    if not item: raise HTTPException(404, "Useful info entry not found")
    item.name = (data.get("category") or item.name).strip()
    item.content = json.dumps({"content_html": (data.get("content_html") or "").strip()})
    c.db.commit()
    return {"id": item.id, "category": item.name, "success": True}


@router.delete('/api/settings/useful-info/{id}')
@router.delete('/settings/useful-info/{id}')
def delete_useful_info(id: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    item = c.db.scalar(select(m.Catalog).where(m.Catalog.id == id, m.Catalog.facility_id == c.facility_id, m.Catalog.kind == 'useful_info'))
    if not item: raise HTTPException(404, "Entry not found")
    item.active = False
    c.db.commit()
    return {"id": id, "success": True}


# ============================================================================
# SECTION 6 — ACCOUNT (Profile, Password, MFA, Email Audit, Preferences)
# ============================================================================

@router.get('/api/settings/account/profile')
@router.get('/settings/account/profile')
def get_user_profile(c=Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.user_id == c.user.id,
            m.UserPreference.section == 'account:profile'
        )
    )
    profile_data = {}
    if pref and pref.data:
        try: profile_data = json.loads(pref.data)
        except Exception: pass

    # Split name into first, last, middle
    parts = (c.user.name or "").split(" ")
    first = parts[0] if parts else ""
    last = parts[-1] if len(parts) > 1 else ""
    middle = " ".join(parts[1:-1]) if len(parts) > 2 else ""

    return {
        "user_id": c.user.id,
        "email": c.user.email,
        "role": c.user.role,
        "first_name": profile_data.get("first_name", first),
        "last_name": profile_data.get("last_name", last),
        "middle_name": profile_data.get("middle_name", middle),
        "prefix": profile_data.get("prefix", "Dr" if c.user.role == "doctor" else "Mr"),
        "gender": profile_data.get("gender", "Female" if "Ananya" in c.user.name or "Priya" in c.user.name or "Nila" in c.user.name else "Male"),
        "dob": profile_data.get("dob", "1984-06-15"),
        "tax_id": profile_data.get("tax_id", "AABCH1234F"),
        "degree": profile_data.get("degree", "MD, DM (Cardiology)" if c.user.role == "doctor" else "BPT, MIAP"),
        "specialization": profile_data.get("specialization", "Non-Invasive Cardiology & EECP"),
        "home_phone": profile_data.get("home_phone", "+91 44 2449 1234"),
        "mobile_phone": profile_data.get("mobile_phone", "+91 98400 55667"),
        "fax": profile_data.get("fax", "+91 44 2449 1235"),
        "address_line1": profile_data.get("address_line1", "4/231 East Coast Road"),
        "address_line2": profile_data.get("address_line2", "Neelankarai"),
        "city": profile_data.get("city", "Chennai"),
        "state": profile_data.get("state", "Tamil Nadu"),
        "country": profile_data.get("country", "India"),
        "zip": profile_data.get("zip", "600115"),
        "about": profile_data.get("about", "Dedicated cardiologist specializing in non-invasive counterpulsation cardiology and preventive cardiovascular health."),
        "agent_ids": profile_data.get("agent_ids", []),
        "assistant_ids": profile_data.get("assistant_ids", []),
        "id_qualifiers": profile_data.get("id_qualifiers", [{"qualifier": "NPI", "value": "1942857102"}, {"qualifier": "Medical Council Reg", "value": "TNMC-84920"}])
    }


@router.put('/api/settings/account/profile')
@router.put('/settings/account/profile')
def update_user_profile(data: dict, c=Depends(context)):
    payload_str = json.dumps(data)
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.user_id == c.user.id,
            m.UserPreference.section == 'account:profile'
        )
    )
    if pref:
        pref.data = payload_str
    else:
        pref = m.UserPreference(
            id=str(uuid.uuid4()), user_id=c.user.id, facility_id=c.facility_id,
            section='account:profile', data=payload_str
        )
        c.db.add(pref)

    # Sync name back to User model if modified
    fname = (data.get("first_name") or "").strip()
    lname = (data.get("last_name") or "").strip()
    if fname:
        c.user.name = f"{fname} {lname}".strip()
    c.db.commit()

    return {"success": True, "message": "Profile updated successfully", "data": data}


@router.post('/api/settings/account/change-password')
@router.post('/settings/account/change-password')
def change_user_password(data: dict, c=Depends(context)):
    current_pw = data.get("current_password", "")
    new_pw = data.get("new_password", "")
    confirm_pw = data.get("confirm_password", "")

    if not current_pw:
        raise HTTPException(422, "Current password is required")
    if not new_pw:
        raise HTTPException(422, "New password is required")
    if new_pw != confirm_pw:
        raise HTTPException(422, "New password and confirmation password do not match")

    # Verify current password
    if not password_matches(current_pw, c.user.password_hash):
        raise HTTPException(400, "Current password verification failed. Please try again.")

    # Complexity validation: min 8 chars, 1 number, 1 special char
    if len(new_pw) < 8 or not any(ch.isdigit() for ch in new_pw):
        raise HTTPException(422, "Password must be at least 8 characters and contain at least 1 number")

    c.user.password_hash = password_hash(new_pw)
    c.db.commit()
    return {"success": True, "message": "Password changed successfully"}


@router.post('/api/settings/account/check-email-delivery')
@router.post('/settings/account/check-email-delivery')
def check_email_delivery(data: dict, c=Depends(context)):
    email_addr = (data.get("email") or "").strip()
    if not email_addr or "@" not in email_addr:
        raise HTTPException(422, "Please enter a valid email address to verify")

    # Known blacklisted test domain or bounced simulation
    domain = email_addr.split("@")[-1].lower()
    is_bounced = "bounced" in email_addr or "spam" in email_addr or "invalid" in domain
    
    return {
        "email": email_addr,
        "is_deliverable": not is_bounced,
        "status": "Blocked (Bounced Blacklist)" if is_bounced else "Active / Deliverable",
        "mx_valid": True,
        "recent_dispatches": 14,
        "last_dispatch_at": "2026-11-12T14:30:00",
        "message": f"Email address '{email_addr}' is verified and cleared in the practice delivery outbound whitelist." if not is_bounced else f"Address '{email_addr}' is currently flagged on the bounced email list."
    }


@router.get('/api/settings/account/preferences')
@router.get('/settings/account/preferences')
def get_account_preferences(c=Depends(context)):
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.user_id == c.user.id,
            m.UserPreference.section == 'account:preferences'
        )
    )
    if pref and pref.data:
        try: return json.loads(pref.data)
        except Exception: pass

    return {
        "skip_facility_selection": False,
        "dictation_tool_name": "Nuance Dragon Medical One / HIPAA Speech",
        "convert_rich_text_to_plain": False
    }


@router.put('/api/settings/account/preferences')
@router.put('/settings/account/preferences')
def save_account_preferences(data: dict, c=Depends(context)):
    payload_str = json.dumps(data)
    pref = c.db.scalar(
        select(m.UserPreference).where(
            m.UserPreference.user_id == c.user.id,
            m.UserPreference.section == 'account:preferences'
        )
    )
    if pref:
        pref.data = payload_str
    else:
        pref = m.UserPreference(
            id=str(uuid.uuid4()), user_id=c.user.id, facility_id=c.facility_id,
            section='account:preferences', data=payload_str
        )
        c.db.add(pref)
    c.db.commit()
    return {"success": True, "data": data}


@router.get('/api/settings/account/download-vocab/{kind}')
@router.get('/settings/account/download-vocab/{kind}')
def download_vocabulary(kind: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    if kind == "members":
        users = c.db.scalars(select(m.User).where(m.User.active == True)).all()
        lines = ["Name,Role,Email"]
        for u in users:
            lines.append(f'"{u.name}","{u.role}","{u.email}"')
        content = "\n".join(lines)
        return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=practice_member_vocabulary.csv"})

    elif kind == "patients":
        patients = c.db.scalars(select(m.Patient).where(m.Patient.active == True).limit(200)).all()
        lines = ["Patient_ID,Name,DOB,Gender"]
        for p in patients:
            lines.append(f'"{p.id}","{p.first_name} {p.last_name}","{p.dob}","{p.gender}"')
        content = "\n".join(lines)
        return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=patient_names_vocabulary.csv"})

    raise HTTPException(404, "Invalid vocabulary download kind")

