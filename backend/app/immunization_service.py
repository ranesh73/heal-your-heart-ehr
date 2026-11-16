"""Immunization Service: Vaccines catalog, CDC Vaccine Information Statements (VIS), and Vaccine Charts."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, and_, delete
from typing import Optional, List, Dict, Any
import json
import uuid
import re

from .identity import context
from . import models as m

router = APIRouter(tags=["settings-immunization"])

DEFAULT_VIS_RECORDS = [
    {"name": "DTaP (Diphtheria Tetanus Pertussis) Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_DTAP"},
    {"name": "Ebola Vaccine VIS", "published_date": "04/23/2020", "code": "VIS_EBOLA"},
    {"name": "Haemophilus Influenzae type b (Hib) Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_HIB"},
    {"name": "Hepatitis A Vaccine VIS", "published_date": "10/15/2021", "code": "VIS_HEPA"},
    {"name": "Hepatitis B Vaccine VIS", "published_date": "10/15/2021", "code": "VIS_HEPB"},
    {"name": "HPV (Human Papillomavirus) Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_HPV"},
    {"name": "Influenza (Flu) Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_FLU"},
    {"name": "Influenza (Flu) Vaccine (Live Intranasal) VIS", "published_date": "08/06/2021", "code": "VIS_FLU_NASAL"},
    {"name": "Japanese Encephalitis Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_JE"},
    {"name": "Live Zoster Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_ZOSTER"},
    {"name": "MMR (Measles, Mumps, Rubella) Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_MMR"},
    {"name": "Pneumococcal Conjugate (PCV) Vaccine VIS", "published_date": "05/12/2022", "code": "VIS_PCV"},
    {"name": "Pneumococcal Polysaccharide (PPSV23) Vaccine VIS", "published_date": "10/30/2019", "code": "VIS_PPSV23"},
    {"name": "Polio Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_POLIO"},
    {"name": "Rotavirus Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_ROTA"},
    {"name": "Tdap (Tetanus, Diphtheria, Pertussis) Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_TDAP"},
    {"name": "Varicella (Chickenpox) Vaccine VIS", "published_date": "08/06/2021", "code": "VIS_VARICELLA"},
]

DEFAULT_SCHEDULES = [
    {
        "name": "Vaccine Schedule 0-18 years",
        "code": "CHART_0_18",
        "description": "CDC standard recommended child and adolescent immunization schedule",
        "entries": [
            {"vaccine_name": "Hepatitis B Adult Recombinant (Engerix-B 20mcg)", "milestone": "Birth", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Rotavirus Vaccine", "milestone": "2 Months", "doses": 1, "route": "Oral (PO)"},
            {"vaccine_name": "DTaP (Diphtheria, Tetanus, Pertussis)", "milestone": "2 Months", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Pneumococcal Conjugate PCV20 (Prevnar 20)", "milestone": "2 Months", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Haemophilus Influenzae type b (Hib)", "milestone": "2 Months", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Polio Vaccine (IPV)", "milestone": "2 Months", "doses": 1, "route": "Subcutaneous (SC)"},
            {"vaccine_name": "Influenza, seasonal, quadrivalent (FluQuadri)", "milestone": "6 Months", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "MMR (Measles, Mumps, Rubella)", "milestone": "12 Months", "doses": 1, "route": "Subcutaneous (SC)"},
            {"vaccine_name": "Varicella (Chickenpox)", "milestone": "12 Months", "doses": 1, "route": "Subcutaneous (SC)"},
            {"vaccine_name": "Hepatitis A Vaccine", "milestone": "12 Months", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Tdap (Tetanus, Diphtheria, Pertussis - Boostrix)", "milestone": "11-12 Years", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "HPV (Human Papillomavirus)", "milestone": "11-12 Years", "doses": 2, "route": "Intramuscular (IM)"},
        ]
    },
    {
        "name": "Adult Cardiology Immunization Matrix",
        "code": "CHART_ADULT_CARDIO",
        "description": "Recommended immunization matrix for adult ischemic heart disease and heart failure patients",
        "entries": [
            {"vaccine_name": "Influenza, seasonal, quadrivalent (FluQuadri)", "milestone": "Annual", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Pneumococcal Conjugate PCV20 (Prevnar 20)", "milestone": "High Risk / Age 19-64", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Pneumococcal Polysaccharide (Pneumovax 23)", "milestone": "High Risk / Age 65+", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Tdap (Tetanus, Diphtheria, Pertussis - Boostrix)", "milestone": "Every 10 Years", "doses": 1, "route": "Intramuscular (IM)"},
            {"vaccine_name": "Live Zoster Vaccine VIS", "milestone": "Age 50+", "doses": 2, "route": "Intramuscular (IM)"},
        ]
    }
]


def parse_vaccine_content(content_str: str) -> Dict[str, Any]:
    """Parse vaccine content whether stored as JSON or legacy pipe format."""
    if not content_str:
        return {}
    if content_str.startswith("{") and content_str.endswith("}"):
        try:
            return json.loads(content_str)
        except Exception:
            pass

    # Legacy pipe format: display_name|route|site|description|cvx_code
    parts = content_str.split("|")
    res = {}
    if len(parts) >= 1 and parts[0]:
        res["display_name"] = parts[0]
    if len(parts) >= 2 and parts[1]:
        res["route"] = parts[1]
    if len(parts) >= 3 and parts[2]:
        res["site"] = parts[2]
    if len(parts) >= 4 and parts[3]:
        res["description"] = parts[3]
    if len(parts) >= 5 and parts[4]:
        res["cvx_code"] = parts[4]
    return res


def ensure_vis_and_charts(c):
    """Seed initial CDC VIS statements and standard charts if none exist for this facility."""
    vis_count = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vis',
            m.Catalog.active == True
        ).limit(1)
    )
    if not vis_count:
        for item in DEFAULT_VIS_RECORDS:
            content = json.dumps({"published_date": item["published_date"]})
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='vis',
                code=item["code"],
                name=item["name"],
                content=content,
                price_paise=0,
                active=True
            ))

    chart_count = c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vaccine_chart',
            m.Catalog.active == True
        ).limit(1)
    )
    if not chart_count:
        for chart in DEFAULT_SCHEDULES:
            content = json.dumps({
                "description": chart["description"],
                "entries": chart["entries"]
            })
            c.db.add(m.Catalog(
                id=str(uuid.uuid4()),
                facility_id=c.facility_id,
                kind='vaccine_chart',
                code=chart["code"],
                name=chart["name"],
                content=content,
                price_paise=0,
                active=True
            ))
    c.db.commit()


# ============================================================================
# 1. VACCINES LIST & MANAGEMENT
# ============================================================================

@router.get('/vaccines')
def list_vaccines(
    search: Optional[str] = Query(None, description="Search by vaccine name"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    c=Depends(context)
):
    """List vaccines with pagination, inventory status, and case-insensitive search."""
    ensure_vis_and_charts(c)

    # Fetch inventory items for this facility to check if vaccines are in inventory
    inv_items = c.db.scalars(
        select(m.InventoryItem).where(
            m.InventoryItem.facility_id == c.facility_id
        )
    ).all()

    inv_cat_ids = set()
    inv_names = set()
    for item in inv_items:
        if item.catalogue_id:
            inv_cat_ids.add(item.catalogue_id)
        if item.name:
            inv_names.add(item.name.strip().lower())

    stmt = select(m.Catalog).where(
        m.Catalog.facility_id == c.facility_id,
        m.Catalog.kind == 'vaccine',
        m.Catalog.active == True
    )

    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            m.Catalog.name.ilike(s),
            m.Catalog.code.ilike(s),
            m.Catalog.content.ilike(s)
        ))

    # Total count for real pagination
    all_matching = c.db.scalars(stmt.order_by(m.Catalog.name.asc())).all()
    total = len(all_matching)

    start_idx = (page - 1) * limit
    paginated_items = all_matching[start_idx:start_idx + limit]

    items = []
    for vac in paginated_items:
        meta = parse_vaccine_content(vac.content)
        # Check if added in inventory
        is_in_inv = (
            vac.id in inv_cat_ids or
            (vac.name and vac.name.strip().lower() in inv_names)
        )

        items.append({
            "id": vac.id,
            "code": vac.code,
            "name": vac.name,
            "vaccine_name": vac.name,
            "description": meta.get("description") or meta.get("display_name") or vac.name,
            "is_added_in_inventory": "Yes" if is_in_inv else "No",
            "is_in_inventory_bool": is_in_inv,
            "dose": meta.get("dose", ""),
            "dose_unit": meta.get("dose_unit", "mL"),
            "duration_of_protection": meta.get("duration_of_protection", ""),
            "diagnosis_code": meta.get("diagnosis_code", ""),
            "vis_ids": meta.get("vis_ids", []),
            "cvx_code": meta.get("cvx_code") or vac.code,
            "route": meta.get("route", "--"),
            "doses_count": meta.get("doses_count", 1),
            "schedule": meta.get("schedule", ""),
            "billing_code": meta.get("billing_code", ""),
            "emergency": meta.get("emergency", False)
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.post('/vaccines')
def create_vaccine(data: dict, c=Depends(context)):
    """Add a new vaccine to the master catalog and associate metadata."""
    c.allow({'admin', 'doctor'})
    name = (data.get('vaccine_name') or data.get('name') or '').strip()
    if not name:
        raise HTTPException(422, "Vaccine Name is mandatory")

    cvx = (data.get('cvx_code') or '').strip()
    # Generate unique code
    base_code = cvx if cvx else re.sub(r'[^A-Z0-9]', '_', name.upper())[:20]
    code = base_code
    counter = 1
    while c.db.scalar(
        select(m.Catalog.id).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vaccine',
            m.Catalog.code == code
        ).limit(1)
    ):
        code = f"{base_code[:16]}_{counter}"
        counter += 1

    content_data = {
        "description": data.get("description", "").strip(),
        "dose": data.get("dose", "").strip(),
        "dose_unit": data.get("dose_unit", "mL").strip(),
        "duration_of_protection": data.get("duration_of_protection", "").strip(),
        "diagnosis_code": data.get("diagnosis_code", "").strip(),
        "vis_ids": data.get("vis_ids", []),
        "cvx_code": cvx,
        "route": data.get("route", "").strip(),
        "doses_count": data.get("doses_count", 1),
        "schedule": data.get("schedule", "").strip(),
        "billing_code": data.get("billing_code", "").strip(),
        "emergency": bool(data.get("emergency", False)),
    }

    new_vac = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='vaccine',
        code=code,
        name=name,
        content=json.dumps(content_data),
        price_paise=0,
        active=True
    )
    c.db.add(new_vac)
    c.db.commit()

    return {
        "id": new_vac.id,
        "name": new_vac.name,
        "code": new_vac.code,
        "success": True,
        "message": f"Vaccine '{name}' created successfully"
    }


@router.delete('/vaccines/{vaccine_id}')
def delete_single_vaccine(vaccine_id: str, c=Depends(context)):
    """Delete a single vaccine from the catalog."""
    c.allow({'admin', 'doctor'})
    vac = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == vaccine_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vaccine'
        )
    )
    if not vac:
        raise HTTPException(404, "Vaccine not found")

    vac.active = False
    c.db.commit()
    return {"success": True, "deleted_id": vaccine_id}


@router.delete('/vaccines')
def delete_multiple_vaccines(data: dict, c=Depends(context)):
    """Bulk delete selected vaccines."""
    c.allow({'admin', 'doctor'})
    ids = data.get("ids", [])
    if not ids or not isinstance(ids, list):
        raise HTTPException(422, "Please select at least one vaccine record to delete")

    records = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.id.in_(ids),
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vaccine'
        )
    ).all()

    for vac in records:
        vac.active = False
    c.db.commit()

    return {"success": True, "deleted_count": len(records)}


# ============================================================================
# 2. VACCINE INFORMATION STATEMENTS (VIS)
# ============================================================================

@router.get('/vis')
def list_vis_statements(c=Depends(context)):
    """List Vaccine Information Statements (VIS) with published dates."""
    ensure_vis_and_charts(c)
    records = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vis',
            m.Catalog.active == True
        ).order_by(m.Catalog.name.asc())
    ).all()

    items = []
    for r in records:
        pub_date = "08/06/2021"
        try:
            parsed = json.loads(r.content or "{}")
            pub_date = parsed.get("published_date", pub_date)
        except Exception:
            pass

        items.append({
            "id": r.id,
            "name": r.name,
            "published_date": pub_date,
            "code": r.code
        })
    return items


# ============================================================================
# 3. VACCINE CHARTS & SCHEDULE BUILDER
# ============================================================================

@router.get('/charts')
def list_vaccine_charts(c=Depends(context)):
    """List all saved vaccine charts."""
    ensure_vis_and_charts(c)
    charts = c.db.scalars(
        select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vaccine_chart',
            m.Catalog.active == True
        ).order_by(m.Catalog.created_at.desc())
    ).all()

    items = []
    for ch in charts:
        parsed = {}
        try:
            parsed = json.loads(ch.content or "{}")
        except Exception:
            pass

        items.append({
            "id": ch.id,
            "name": ch.name,
            "code": ch.code,
            "description": parsed.get("description", ""),
            "entries": parsed.get("entries", []),
            "created_at": ch.created_at.isoformat() if ch.created_at else ""
        })
    return items


@router.post('/charts')
def save_vaccine_chart(data: dict, c=Depends(context)):
    """Save or update a vaccine chart with scheduled entries."""
    c.allow({'admin', 'doctor'})
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(422, "Vaccine Chart Name is required")

    chart_id = data.get("id")
    entries = data.get("entries", [])
    description = (data.get("description") or "").strip()

    content = json.dumps({
        "description": description,
        "entries": entries
    })

    if chart_id:
        existing = c.db.scalar(
            select(m.Catalog).where(
                m.Catalog.id == chart_id,
                m.Catalog.facility_id == c.facility_id,
                m.Catalog.kind == 'vaccine_chart'
            )
        )
        if existing:
            existing.name = name
            existing.content = content
            c.db.commit()
            return {"id": existing.id, "name": existing.name, "success": True}

    code = f"CHART_{re.sub(r'[^A-Z0-9]', '_', name.upper())[:18]}"
    new_chart = m.Catalog(
        id=str(uuid.uuid4()),
        facility_id=c.facility_id,
        kind='vaccine_chart',
        code=code,
        name=name,
        content=content,
        price_paise=0,
        active=True
    )
    c.db.add(new_chart)
    c.db.commit()

    return {"id": new_chart.id, "name": new_chart.name, "success": True}


@router.delete('/charts/{chart_id}')
def delete_vaccine_chart(chart_id: str, c=Depends(context)):
    """Delete a vaccine chart."""
    c.allow({'admin', 'doctor'})
    ch = c.db.scalar(
        select(m.Catalog).where(
            m.Catalog.id == chart_id,
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vaccine_chart'
        )
    )
    if not ch:
        raise HTTPException(404, "Vaccine chart not found")

    ch.active = False
    c.db.commit()
    return {"success": True, "deleted_id": chart_id}
