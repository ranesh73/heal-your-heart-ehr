"""
PHR Settings Administration Router for Heal Your Heart EHR.
Controls all patient portal feature toggles, clinical data sharing, custom app menu,
useful info contacts/policies, and announcements from Settings -> PHR Settings.
"""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select, desc
from pydantic import BaseModel

from . import models as m
from .security import context, CLINICAL
from .phr_service import (
    get_or_create_phr_settings,
    FACILITIES_CONFIG,
    DEFAULT_MODULES,
    DEFAULT_MESSAGING_PREFS,
    DEFAULT_SHARED_CLINICAL_SECTIONS,
    DEFAULT_REFILL_PREFS,
    DEFAULT_PRACTICE_PREFS,
    DEFAULT_CUSTOM_APP_MENU,
)

router = APIRouter(prefix="/api/settings/phr", tags=["PHR Settings"])


class UsefulInfoInput(BaseModel):
    title: str
    category: str  # 'Contact', 'Policy', 'Link'
    content_or_url: str
    display_order: int = 0
    is_active: bool = True


class AnnouncementInput(BaseModel):
    title: str
    body: str
    facility_id: Optional[str] = None


@router.get("")
def get_phr_settings(c=Depends(context)):
    c.allow(CLINICAL)
    setting = get_or_create_phr_settings(c.db)

    # Fetch active staff members for selection chips in preferences
    staff = c.db.scalars(
        select(m.User).where(m.User.active == True).order_by(m.User.name)
    ).all()
    staff_list = [{"id": s.id, "name": s.name, "role": s.role} for s in staff]

    # Fetch facilities from db or fallback to config
    db_facs = c.db.scalars(select(m.Facility)).all()
    facilities_data = []
    for cfg in FACILITIES_CONFIG:
        # Match with db facility if possible
        matched = next((f for f in db_facs if cfg["code"] in f.name or cfg["name"].split(" - ")[0] in f.name), None)
        facilities_data.append({
            "id": matched.id if matched else cfg["id"],
            "name": cfg["name"],
            "code": cfg["code"],
            "address": cfg["address"],
            "phone": cfg["phone"],
            "embed_code": cfg["embed_code"],
            "portal_url": f"https://ehr.healyourheart.in/phr/login?facility_id={cfg['code']}",
        })

    return {
        "modules": json.loads(setting.modules_json or "{}") or DEFAULT_MODULES,
        "messaging_prefs": json.loads(setting.messaging_prefs_json or "{}") or DEFAULT_MESSAGING_PREFS,
        "shared_clinical_sections": json.loads(setting.shared_clinical_sections_json or "{}") or DEFAULT_SHARED_CLINICAL_SECTIONS,
        "refill_prefs": json.loads(setting.refill_prefs_json or "{}") or DEFAULT_REFILL_PREFS,
        "practice_prefs": json.loads(setting.practice_prefs_json or "{}") or DEFAULT_PRACTICE_PREFS,
        "custom_app_menu": json.loads(setting.custom_app_menu_json or "{}") or DEFAULT_CUSTOM_APP_MENU,
        "facilities": facilities_data,
        "staff_members": staff_list,
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
    }


@router.put("/preferences")
def update_phr_preferences(payload: Dict[str, Any] = Body(...), c=Depends(context)):
    c.allow(CLINICAL)
    setting = get_or_create_phr_settings(c.db)

    if "modules" in payload:
        setting.modules_json = json.dumps(payload["modules"])
    if "messaging_prefs" in payload:
        setting.messaging_prefs_json = json.dumps(payload["messaging_prefs"])
    if "refill_prefs" in payload:
        setting.refill_prefs_json = json.dumps(payload["refill_prefs"])
    if "practice_prefs" in payload:
        setting.practice_prefs_json = json.dumps(payload["practice_prefs"])

    setting.updated_at = m.now()
    c.db.commit()
    c.audit("update_phr_preferences", setting)
    return {"status": "ok", "message": "PHR Preferences successfully updated"}


@router.put("/share-clinical-data")
def update_shared_clinical_data(payload: Dict[str, Any] = Body(...), c=Depends(context)):
    c.allow(CLINICAL)
    setting = get_or_create_phr_settings(c.db)

    sections = payload.get("shared_clinical_sections", payload)
    setting.shared_clinical_sections_json = json.dumps(sections)
    setting.updated_at = m.now()
    c.db.commit()
    c.audit("update_phr_shared_clinical_data", setting)
    return {"status": "ok", "message": "Shared Clinical Data permissions saved"}


@router.put("/custom-app")
def update_custom_app_menu(payload: Dict[str, Any] = Body(...), c=Depends(context)):
    c.allow(CLINICAL)
    setting = get_or_create_phr_settings(c.db)

    setting.custom_app_menu_json = json.dumps(payload)
    setting.updated_at = m.now()
    c.db.commit()
    c.audit("update_phr_custom_app_menu", setting)
    return {"status": "ok", "message": "Custom App Menu configuration saved"}


# ============================================================================
# USEFUL INFO ENDPOINTS
# ============================================================================

@router.get("/useful-info")
def list_useful_info(c=Depends(context)):
    c.allow(CLINICAL)
    items = c.db.scalars(
        select(m.PhrUsefulInfo).order_by(m.PhrUsefulInfo.display_order, m.PhrUsefulInfo.created_at)
    ).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category,
            "content_or_url": item.content_or_url,
            "display_order": item.display_order,
            "is_active": item.is_active,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]


@router.post("/useful-info")
def create_useful_info(data: UsefulInfoInput, c=Depends(context)):
    c.allow(CLINICAL)
    item = m.PhrUsefulInfo(
        id=str(uuid4()),
        title=data.title.strip(),
        category=data.category.strip(),
        content_or_url=data.content_or_url.strip(),
        display_order=data.display_order,
        is_active=data.is_active,
        created_at=m.now(),
        version=1,
    )
    c.db.add(item)
    c.db.commit()
    c.audit("create_phr_useful_info", item)
    return {"status": "ok", "id": item.id}


@router.put("/useful-info/{item_id}")
def update_useful_info(item_id: str, data: UsefulInfoInput, c=Depends(context)):
    c.allow(CLINICAL)
    item = c.db.get(m.PhrUsefulInfo, item_id)
    if not item:
        raise HTTPException(404, "Useful Info entry not found")
    item.title = data.title.strip()
    item.category = data.category.strip()
    item.content_or_url = data.content_or_url.strip()
    item.display_order = data.display_order
    item.is_active = data.is_active
    item.version += 1
    c.db.commit()
    c.audit("update_phr_useful_info", item)
    return {"status": "ok", "message": "Updated successfully"}


@router.delete("/useful-info/{item_id}")
def delete_useful_info(item_id: str, c=Depends(context)):
    c.allow(CLINICAL)
    item = c.db.get(m.PhrUsefulInfo, item_id)
    if not item:
        raise HTTPException(404, "Useful Info entry not found")
    c.db.delete(item)
    c.db.commit()
    c.audit("delete_phr_useful_info", item)
    return {"status": "ok", "message": "Deleted successfully"}


# ============================================================================
# ANNOUNCEMENTS ENDPOINTS
# ============================================================================

@router.get("/announcements")
def list_announcements(c=Depends(context)):
    c.allow(CLINICAL)
    announcements = c.db.scalars(
        select(m.PhrAnnouncement).order_by(desc(m.PhrAnnouncement.published_at))
    ).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "body": a.body,
            "facility_id": a.facility_id,
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in announcements
    ]


@router.post("/announcements")
def create_announcement(data: AnnouncementInput, c=Depends(context)):
    c.allow(CLINICAL)
    item = m.PhrAnnouncement(
        id=str(uuid4()),
        title=data.title.strip(),
        body=data.body.strip(),
        facility_id=data.facility_id,
        published_at=m.now(),
        created_by=c.user.id,
        created_at=m.now(),
        version=1,
    )
    c.db.add(item)
    c.db.commit()
    c.audit("create_phr_announcement", item)
    return {"status": "ok", "id": item.id}


@router.delete("/announcements/{item_id}")
def delete_announcement(item_id: str, c=Depends(context)):
    c.allow(CLINICAL)
    item = c.db.get(m.PhrAnnouncement, item_id)
    if not item:
        raise HTTPException(404, "Announcement not found")
    c.db.delete(item)
    c.db.commit()
    c.audit("delete_phr_announcement", item)
    return {"status": "ok", "message": "Deleted successfully"}
