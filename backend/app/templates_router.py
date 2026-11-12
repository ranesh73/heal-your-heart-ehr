import json
import sqlite3
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from .db import DB_FILE
from .security import context
from .template_types import (
    TEMPLATE_TYPES,
    LEGACY_TEMPLATE_TYPES,
    MEDICAL_CATEGORIES,
    MEDICAL_CONDITIONS,
    dropdown_template_types,
    dropdown_categories,
    normalize_template_type,
    condition_keywords,
)

router = APIRouter(prefix="/api")

LIST_COLUMNS = """
    t.id, t.name, t.template_type, t.specialty, t.category, t.description,
    t.tags, t.is_active, t.is_practice, t.is_library, t.created_by,
    t.owner_email, t.created_at, t.updated_at
"""

SPECIALTIES = ["All"] + list(MEDICAL_CATEGORIES)
DEFAULT_OWNER_EMAIL = "sanju2kguru@gmail.com"


def get_con():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def _row_to_template(row: sqlite3.Row, cursor: sqlite3.Cursor) -> Dict[str, Any]:
    data = dict(row)
    data["is_active"] = bool(data.get("is_active", 1))
    data["tags"] = data.get("tags") or ""
    data["tags_list"] = [t.strip() for t in data["tags"].split(",") if t.strip()]
    data["category"] = data.get("category") or data.get("specialty") or "General Medicine"

    cursor.execute("SELECT role_name FROM template_permissions WHERE template_id = ?;", (data["id"],))
    roles = [p["role_name"] for p in cursor.fetchall()]
    data["roles_list"] = roles
    data["accessible_to"] = ", ".join(roles) if roles else "All Roles"
    return data


# --- Reference endpoints ---
@router.get("/template-types")
def get_template_types():
    return dropdown_template_types()


@router.get("/template-types/meta")
def get_template_types_meta():
    return {
        "all_label": "All",
        "types": TEMPLATE_TYPES,
        "legacy_types": LEGACY_TEMPLATE_TYPES,
    }


@router.get("/template-categories")
def get_template_categories():
    return dropdown_categories()


@router.get("/medical-conditions")
def get_medical_conditions():
    return [
        {
            "key": c["key"],
            "label": c["label"],
            "category": c.get("category", "General Medicine"),
            "description": c.get("description", ""),
        }
        for c in MEDICAL_CONDITIONS
    ]


@router.get("/specialties")
def get_specialties():
    return SPECIALTIES


# --- Templates Listing ---
@router.get("/templates")
def get_templates(
    tab: str = "my_templates",
    template_type: str = "All",
    category: str = "All",
    specialty: str = "All",
    condition: str = "",
    search: str = "",
    status: str = "all",
    owner: str = DEFAULT_OWNER_EMAIL,
):
    conn = get_con()
    cursor = conn.cursor()

    query = f"SELECT {LIST_COLUMNS} FROM templates t WHERE 1=1"
    params = []

    requested_type = normalize_template_type(template_type) if template_type != "All" else None
    hide_email = requested_type != "Email"

    if tab == "my_templates":
        query += " AND t.is_practice = 1 AND (t.owner_email = ? OR t.owner_email IS NULL OR t.owner_email = '')"
        params.append(owner)
        if hide_email:
            query += " AND t.template_type != 'Email'"
    elif tab == "practice_templates":
        query += " AND t.is_practice = 1"
        if hide_email:
            query += " AND t.template_type != 'Email'"
    elif tab == "email_templates":
        query += " AND t.template_type = 'Email'"
    elif tab == "template_library":
        query += " AND t.is_library = 1"
    elif tab == "common_medication":
        if hide_email:
            query += " AND t.template_type != 'Email'"

    if requested_type:
        query += " AND t.template_type = ?"
        params.append(requested_type)

    if category and category != "All":
        query += " AND (t.category = ? OR t.specialty = ?)"
        params.extend([category, category])

    if specialty and specialty != "All":
        query += " AND t.specialty = ?"
        params.append(specialty)

    if status == "active":
        query += " AND t.is_active = 1"
    elif status == "inactive":
        query += " AND t.is_active = 0"

    keywords = condition_keywords(condition)
    if keywords:
        clauses = []
        for word in keywords:
            clauses.append(
                "(LOWER(t.name) LIKE ? OR LOWER(IFNULL(t.description,'')) LIKE ?"
                " OR LOWER(IFNULL(t.tags,'')) LIKE ? OR LOWER(IFNULL(t.category,'')) LIKE ?"
                " OR LOWER(t.specialty) LIKE ?)"
            )
            params.extend([f"%{word.lower()}%"] * 5)
        query += " AND (" + " OR ".join(clauses) + ")"
    elif condition:
        term = f"%{condition.lower()}%"
        query += (" AND (LOWER(t.name) LIKE ? OR LOWER(IFNULL(t.description,'')) LIKE ?"
                  " OR LOWER(IFNULL(t.tags,'')) LIKE ?)")
        params.extend([term, term, term])

    if search:
        term = f"%{search.lower()}%"
        query += (" AND (LOWER(t.name) LIKE ? OR LOWER(t.template_type) LIKE ?"
                  " OR LOWER(IFNULL(t.category,'')) LIKE ? OR LOWER(t.specialty) LIKE ?"
                  " OR LOWER(IFNULL(t.description,'')) LIKE ? OR LOWER(IFNULL(t.tags,'')) LIKE ?)")
        params.extend([term] * 6)

    query += " ORDER BY t.name COLLATE NOCASE ASC;"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    results = [_row_to_template(r, cursor) for r in rows]
    conn.close()
    return results


# --- Template Details ---
@router.get("/templates/{template_id}")
def get_template_details(template_id: int):
    conn = get_con()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM templates WHERE id = ?;", (template_id,))
    t_row = cursor.fetchone()
    if not t_row:
        conn.close()
        raise HTTPException(404, "Template not found")

    template = _row_to_template(t_row, cursor)
    template["content"] = t_row["content"] if "content" in t_row.keys() else ""
    template["roles"] = template["roles_list"]

    cursor.execute("SELECT * FROM template_sections WHERE template_id = ? ORDER BY order_index ASC;", (template_id,))
    section_rows = cursor.fetchall()

    sections = []
    for s_row in section_rows:
        sec = dict(s_row)
        cursor.execute("SELECT * FROM template_components WHERE section_id = ? ORDER BY order_index ASC;", (sec["id"],))
        comp_rows = cursor.fetchall()

        components = []
        for c_row in comp_rows:
            comp = dict(c_row)
            comp["column_count"] = comp.get("column_count") or 3
            if comp.get("config"):
                try:
                    comp["config"] = json.loads(comp["config"])
                except Exception:
                    pass
            cursor.execute(
                "SELECT * FROM template_options WHERE component_id = ? ORDER BY order_index ASC;",
                (comp["id"],),
            )
            options = []
            for opt in cursor.fetchall():
                o = dict(opt)
                o["parent_option_id"] = o.get("parent_option_id")
                o["is_selected"] = bool(o.get("is_selected"))
                o["is_expandable"] = bool(o.get("is_expandable"))
                options.append(o)
            comp["options"] = options
            components.append(comp)

        sec["components"] = components
        sections.append(sec)

    template["sections"] = sections

    # Relationships (Horizontal Hierarchy)
    cursor.execute("""
        SELECT r.id, r.parent_component_id, r.trigger_value, r.child_component_id,
               pc.label as parent_label, cc.label as child_label
        FROM template_relationships r
        JOIN template_components pc ON r.parent_component_id = pc.id
        JOIN template_components cc ON r.child_component_id = cc.id
        WHERE r.template_id = ?;
    """, (template_id,))
    template["relationships"] = [dict(rel) for rel in cursor.fetchall()]

    conn.close()
    return template


# --- Template Create / Edit / Delete ---
@router.post("/templates")
def create_template(data: dict):
    conn = get_con()
    cursor = conn.cursor()
    name = (data.get("name") or "").strip()
    if not name:
        conn.close()
        raise HTTPException(422, "Template name is required")

    ttype = data.get("template_type", "SOAP")
    specialty = data.get("specialty", "General Medicine")
    category = data.get("category", specialty)
    desc = data.get("description", "")
    tags = data.get("tags", "")
    is_active = 1 if data.get("is_active", True) else 0
    is_practice = 1 if data.get("is_practice", True) else 0
    is_library = 1 if data.get("is_library", False) else 0
    owner = data.get("owner_email", DEFAULT_OWNER_EMAIL)

    cursor.execute("""
        INSERT INTO templates (name, template_type, specialty, category, description, tags, is_active, is_practice, is_library, created_by, owner_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (name, ttype, specialty, category, desc, tags, is_active, is_practice, is_library, "Admin", owner))
    template_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": template_id, "name": name, "success": True}


@router.put("/templates/{template_id}")
def update_template(template_id: int, data: dict):
    conn = get_con()
    cursor = conn.cursor()
    name = (data.get("name") or "").strip()
    if not name:
        conn.close()
        raise HTTPException(422, "Template name is required")

    cursor.execute("""
        UPDATE templates
        SET name = ?, template_type = ?, specialty = ?, category = ?, description = ?, tags = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
    """, (name, data.get("template_type", "SOAP"), data.get("specialty", "General Medicine"),
          data.get("category", "General Medicine"), data.get("description", ""), data.get("tags", ""),
          1 if data.get("is_active", True) else 0, template_id))
    conn.commit()
    conn.close()
    return {"id": template_id, "success": True}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM templates WHERE id = ?", (template_id,))
    cursor.execute("DELETE FROM template_sections WHERE template_id = ?", (template_id,))
    cursor.execute("DELETE FROM template_relationships WHERE template_id = ?", (template_id,))
    cursor.execute("DELETE FROM template_permissions WHERE template_id = ?", (template_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Template deleted"}


@router.post("/templates/{template_id}/duplicate")
def duplicate_template(template_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM templates WHERE id = ?", (template_id,))
    t = cursor.fetchone()
    if not t:
        conn.close()
        raise HTTPException(404, "Template not found")

    new_name = f"{t['name']} (Copy)"
    cursor.execute("""
        INSERT INTO templates (name, template_type, specialty, category, description, tags, is_active, is_practice, is_library, created_by, owner_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (new_name, t['template_type'], t['specialty'], t['category'], t['description'], t['tags'], t['is_active'], 1, 0, t['created_by'], t['owner_email']))
    new_id = cursor.lastrowid

    # Copy sections & components
    cursor.execute("SELECT * FROM template_sections WHERE template_id = ?", (template_id,))
    sections = cursor.fetchall()
    for sec in sections:
        cursor.execute("INSERT INTO template_sections (template_id, name, order_index) VALUES (?, ?, ?)",
                       (new_id, sec['name'], sec['order_index']))
        new_sec_id = cursor.lastrowid
        cursor.execute("SELECT * FROM template_components WHERE section_id = ?", (sec['id'],))
        comps = cursor.fetchall()
        for comp in comps:
            cursor.execute("""
                INSERT INTO template_components (template_id, section_id, label, component_type, order_index, config, is_mandatory, column_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (new_id, new_sec_id, comp['label'], comp['component_type'], comp['order_index'], comp['config'], comp['is_mandatory'], comp['column_count']))
            new_comp_id = cursor.lastrowid
            cursor.execute("SELECT * FROM template_options WHERE component_id = ?", (comp['id'],))
            for opt in cursor.fetchall():
                cursor.execute("""
                    INSERT INTO template_options (component_id, option_label, option_value, order_index, parent_option_id, is_selected, is_expandable)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (new_comp_id, opt['option_label'], opt['option_value'], opt['order_index'], opt['parent_option_id'], opt['is_selected'], opt['is_expandable']))

    conn.commit()
    conn.close()
    return {"success": True, "id": new_id, "name": new_name}


@router.post("/templates/{template_id}/share")
def share_template(template_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("UPDATE templates SET is_practice = 1 WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Template shared to practice"}


@router.post("/templates/{template_id}/import")
def import_template(template_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("UPDATE templates SET is_practice = 1 WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Template imported to practice"}


@router.put("/templates/{template_id}/roles")
def update_roles(template_id: int, data: dict):
    conn = get_con()
    cursor = conn.cursor()
    roles = data.get("roles", [])
    cursor.execute("DELETE FROM template_permissions WHERE template_id = ?", (template_id,))
    for r in roles:
        cursor.execute("INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?)", (template_id, r))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Roles updated"}


@router.put("/templates/{template_id}/default-values")
def update_defaults(template_id: int, data: dict):
    return {"success": True, "message": "Default values updated"}


# --- Search Templates ---
@router.get("/search/templates")
def search_templates(q: str = ""):
    conn = get_con()
    cursor = conn.cursor()
    term = f"%{q.lower()}%"
    cursor.execute(f"""
        SELECT {LIST_COLUMNS} FROM templates t
        WHERE LOWER(t.name) LIKE ? OR LOWER(t.template_type) LIKE ? OR LOWER(IFNULL(t.tags, '')) LIKE ?
        ORDER BY t.name ASC LIMIT 50;
    """, (term, term, term))
    rows = cursor.fetchall()
    results = [_row_to_template(r, cursor) for r in rows]
    conn.close()
    return results


# --- Medications Reference Catalog ---
@router.get("/medications")
def get_medications(condition_key: str = "", category: str = "", search: str = ""):
    conn = get_con()
    cursor = conn.cursor()
    query = "SELECT * FROM medication_references WHERE 1=1"
    params = []
    if condition_key and condition_key != "all":
        query += " AND (LOWER(condition_key) = ? OR LOWER(condition_name) LIKE ?)"
        params.extend([condition_key.lower(), f"%{condition_key.lower()}%"])
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
    if search:
        p = f"%{search.lower()}%"
        query += " AND (LOWER(medication_name) LIKE ? OR LOWER(generic_name) LIKE ? OR LOWER(condition_name) LIKE ?)"
        params.extend([p, p, p])
    query += " ORDER BY condition_name ASC, medication_name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# --- Consultation Form Responses ---
@router.post("/responses")
def save_consultation_responses(data: dict):
    conn = get_con()
    cursor = conn.cursor()
    pat_id = data.get("patient_id", 1)
    tpl_id = data.get("template_id", 1)
    notes = data.get("notes", "")
    enc_type = data.get("encounter_type", "Initial Consult")
    doc_name = data.get("doctor_name", "Dr. S. Ramasamy")
    responses = data.get("responses", [])

    cursor.execute("""
        INSERT INTO consultations (patient_id, template_id, doctor_name, notes, encounter_type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'Completed', datetime('now'), datetime('now'))
    """, (pat_id, tpl_id, doc_name, notes, enc_type))
    cons_id = cursor.lastrowid

    for resp in responses:
        comp_id = resp.get("component_id")
        comp_lbl = resp.get("component_label", "")
        r_val = resp.get("response_value", "")
        cursor.execute("""
            INSERT INTO template_responses (consultation_id, component_id, component_label, response_value, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (cons_id, comp_id, comp_lbl, r_val))

    conn.commit()
    conn.close()
    return {"success": True, "consultation_id": cons_id, "message": "Consultation saved"}


@router.get("/responses/{consultation_id}")
def get_consultation_responses(consultation_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consultations WHERE id = ?", (consultation_id,))
    c = cursor.fetchone()
    if not c:
        conn.close()
        raise HTTPException(404, "Consultation not found")
    c_data = dict(c)
    cursor.execute("SELECT * FROM template_responses WHERE consultation_id = ?", (consultation_id,))
    c_data["responses"] = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return c_data
