import json
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from .db import get_db

router = APIRouter(prefix="/api/waiting-list")


@router.get("")
def list_waiting_entries(db=Depends(get_db)):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS waiting_list_entries (
            id TEXT PRIMARY KEY,
            facility_id TEXT,
            data_json TEXT,
            created_at TEXT
        )
    """))
    rows = db.execute(text("SELECT id, facility_id, data_json, created_at FROM waiting_list_entries ORDER BY created_at DESC")).fetchall()
    result = []
    for r in rows:
        try:
            entry = json.loads(r[2])
            if isinstance(entry, dict):
                entry["id"] = r[0]
                result.append(entry)
        except Exception:
            pass
    return result


@router.post("")
def save_waiting_entry(entry: dict, db=Depends(get_db)):
    if not isinstance(entry, dict):
        raise HTTPException(400, "Entry must be a JSON object")
    
    entry_id = str(entry.get("id") or f"wl_{uuid4().hex[:12]}")
    entry["id"] = entry_id
    facility_id = entry.get("facility_id") or ""
    created_at = entry.get("created_at") or datetime.now(timezone.utc).isoformat()
    entry["created_at"] = created_at
    data_json = json.dumps(entry)

    db.execute(text("""
        CREATE TABLE IF NOT EXISTS waiting_list_entries (
            id TEXT PRIMARY KEY,
            facility_id TEXT,
            data_json TEXT,
            created_at TEXT
        )
    """))
    existing = db.execute(text("SELECT id FROM waiting_list_entries WHERE id = :id"), {"id": entry_id}).fetchone()
    if existing:
        db.execute(
            text("UPDATE waiting_list_entries SET facility_id = :fac, data_json = :data WHERE id = :id"),
            {"id": entry_id, "fac": facility_id, "data": data_json}
        )
    else:
        db.execute(
            text("INSERT INTO waiting_list_entries (id, facility_id, data_json, created_at) VALUES (:id, :fac, :data, :created_at)"),
            {"id": entry_id, "fac": facility_id, "data": data_json, "created_at": created_at}
        )
    return entry


@router.delete("/{entry_id}")
def delete_waiting_entry(entry_id: str, db=Depends(get_db)):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS waiting_list_entries (
            id TEXT PRIMARY KEY,
            facility_id TEXT,
            data_json TEXT,
            created_at TEXT
        )
    """))
    db.execute(text("DELETE FROM waiting_list_entries WHERE id = :id"), {"id": entry_id})
    return {"status": "ok", "id": entry_id}
