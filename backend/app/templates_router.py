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


def template_consultation_table(cursor):
    tables = {row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if "template_consultation_responses" in tables:
        return "template_consultation_responses"
    if "consultations" in tables:
        columns = {row[1] for row in cursor.execute("PRAGMA table_info(consultations)")}
        if "template_id" in columns:
            return "consultations"
    raise sqlite3.OperationalError("Template consultation response table is unavailable")


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
        query += " AND (t.is_practice = 1 OR t.is_library = 1)"
        if hide_email:
            query += " AND t.template_type != 'Email'"
    elif tab == "practice_templates":
        query += " AND (t.is_practice = 1 OR t.is_library = 1)"
        if hide_email:
            query += " AND t.template_type != 'Email'"
    elif tab == "email_templates":
        query += " AND t.template_type = 'Email'"
    elif tab == "template_library":
        query += " AND (t.is_library = 1 OR t.is_practice = 1)"
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
        sec_title = sec.get("title") or sec.get("name") or "Section"
        sec["title"] = sec_title
        sec["name"] = sec_title
        cursor.execute("SELECT * FROM template_components WHERE section_id = ? ORDER BY order_index ASC;", (sec["id"],))
        comp_rows = cursor.fetchall()

        components = []
        for c_row in comp_rows:
            comp = dict(c_row)
            comp["column_count"] = comp.get("column_count") or 3
            comp["is_mandatory"] = bool(comp.get("is_required") or comp.get("is_mandatory"))
            comp["is_required"] = comp["is_mandatory"]
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


def _clean_text(val: Any, max_len: int = 300, default: str = "") -> str:
    if val is None:
        return default
    text = str(val).strip()
    return text[:max_len] if text else default


def _write_options(cursor, comp_id, options, parent_option_id=None):
    for o_idx, opt in enumerate(options or []):
        if isinstance(opt, dict):
            label = opt.get("option_label") or opt.get("label") or ""
            value = opt.get("option_value") or opt.get("value") or label
            selected = 1 if opt.get("is_selected") else 0
            children = opt.get("children") or []
            expandable = 1 if (opt.get("is_expandable") or children) else 0
        else:
            label = str(opt)
            value = label
            selected = 0
            children = []
            expandable = 0

        cursor.execute("""
            INSERT INTO template_options (component_id, option_label, option_value, order_index,
                                          parent_option_id, is_selected, is_expandable)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            comp_id,
            _clean_text(label, 300),
            _clean_text(value, 300),
            o_idx,
            parent_option_id,
            selected,
            expandable,
        ))
        new_option_id = cursor.lastrowid

        if children:
            _write_options(cursor, comp_id, children, new_option_id)


def _write_sections(cursor, template_id, sections, relationships):
    tag_to_id = {}
    for s_idx, sec in enumerate(sections or []):
        title = sec.get("title") or sec.get("name") or f"Section {s_idx + 1}"
        category = sec.get("category") or "Subjective"
        column_layout = sec.get("column_layout", 1)

        cursor.execute("""
            INSERT INTO template_sections (template_id, title, category, order_index, column_layout)
            VALUES (?, ?, ?, ?, ?);
        """, (template_id, _clean_text(title, 120), _clean_text(category, 40), s_idx, column_layout))
        sec_id = cursor.lastrowid

        for c_idx, comp in enumerate(sec.get("components", [])):
            columns = comp.get("column_count") or 3
            try:
                columns = max(1, min(int(columns), 4))
            except Exception:
                columns = 3

            config_val = comp.get("config")
            if isinstance(config_val, (dict, list)):
                config_val = json.dumps(config_val)
            elif config_val is not None:
                config_val = str(config_val)

            is_req = 1 if (comp.get("is_required") or comp.get("is_mandatory")) else 0
            ctype = comp.get("component_type") or comp.get("type") or "Text Field"

            cursor.execute("""
                INSERT INTO template_components (section_id, component_type, label, placeholder,
                                                 is_required, default_value, order_index,
                                                 column_count, help_text, config)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                sec_id,
                _clean_text(ctype, 40, "Text Field"),
                _clean_text(comp.get("label"), 300, "Question"),
                _clean_text(comp.get("placeholder"), 300),
                is_req,
                comp.get("default_value"),
                c_idx,
                columns,
                _clean_text(comp.get("help_text"), 300),
                config_val,
            ))
            comp_id = cursor.lastrowid
            if comp.get("id"):
                tag_to_id[str(comp["id"])] = comp_id

            _write_options(cursor, comp_id, comp.get("options", []))

    for rel in (relationships or []):
        p_id = tag_to_id.get(str(rel.get("parent_component_id")), rel.get("parent_component_id"))
        c_id = tag_to_id.get(str(rel.get("child_component_id")), rel.get("child_component_id"))
        trig = rel.get("trigger_value") or rel.get("trigger") or ""
        if p_id and c_id:
            cursor.execute("""
                INSERT INTO template_relationships (template_id, parent_component_id, trigger_value, child_component_id)
                VALUES (?, ?, ?, ?);
            """, (template_id, p_id, _clean_text(trig, 300), c_id))


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
    content = data.get("content", "")
    tags = data.get("tags", "")
    is_active = 1 if data.get("is_active", True) else 0
    is_practice = 1 if data.get("is_practice", True) else 0
    is_library = 1 if data.get("is_library", False) else 0
    owner = data.get("owner_email", DEFAULT_OWNER_EMAIL)

    cursor.execute("""
        INSERT INTO templates (name, template_type, specialty, category, description, content, tags, is_active, is_practice, is_library, created_by, owner_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (name, ttype, specialty, category, desc, content, tags, is_active, is_practice, is_library, "Admin", owner))
    template_id = cursor.lastrowid

    # Roles / Permissions
    roles = data.get("roles") or ["Physician", "Physician Assistant"]
    for r_name in roles:
        cursor.execute("INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?);", (template_id, _clean_text(r_name, 60)))

    # Sections & Components
    if data.get("sections"):
        _write_sections(cursor, template_id, data["sections"], data.get("relationships"))

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

    desc = data.get("description")
    content = data.get("content")
    tags = data.get("tags")
    is_active = 1 if data.get("is_active", True) else 0

    cursor.execute("""
        UPDATE templates
        SET name = ?, template_type = ?, specialty = ?, category = ?, description = COALESCE(?, description),
            content = COALESCE(?, content), tags = COALESCE(?, tags), is_active = ?, updated_at = datetime('now')
        WHERE id = ?
    """, (name, data.get("template_type", "SOAP"), data.get("specialty", "General Medicine"),
          data.get("category", "General Medicine"), desc, content, tags, is_active, template_id))

    if "roles" in data and data["roles"] is not None:
        cursor.execute("DELETE FROM template_permissions WHERE template_id = ?", (template_id,))
        for r_name in data["roles"]:
            cursor.execute("INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?)", (template_id, _clean_text(r_name, 60)))

    if "sections" in data and data["sections"] is not None:
        cursor.execute("DELETE FROM template_relationships WHERE template_id = ?", (template_id,))
        cursor.execute("SELECT id FROM template_sections WHERE template_id = ?", (template_id,))
        for (sid,) in cursor.fetchall():
            cursor.execute("SELECT id FROM template_components WHERE section_id = ?", (sid,))
            for (cid,) in cursor.fetchall():
                cursor.execute("DELETE FROM template_options WHERE component_id = ?", (cid,))
            cursor.execute("DELETE FROM template_components WHERE section_id = ?", (sid,))
        cursor.execute("DELETE FROM template_sections WHERE template_id = ?", (template_id,))
        _write_sections(cursor, template_id, data["sections"], data.get("relationships"))

    conn.commit()
    conn.close()
    return {"id": template_id, "success": True}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM templates WHERE id = ?", (template_id,))
    cursor.execute("SELECT id FROM template_sections WHERE template_id = ?", (template_id,))
    for (sid,) in cursor.fetchall():
        cursor.execute("SELECT id FROM template_components WHERE section_id = ?", (sid,))
        for (cid,) in cursor.fetchall():
            cursor.execute("DELETE FROM template_options WHERE component_id = ?", (cid,))
        cursor.execute("DELETE FROM template_components WHERE section_id = ?", (sid,))
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
    raw_t = cursor.fetchone()
    if not raw_t:
        conn.close()
        raise HTTPException(404, "Template not found")
    t = dict(raw_t)

    new_name = f"{t['name']} (Copy)"
    cursor.execute("""
        INSERT INTO templates (name, template_type, specialty, category, description, content, tags, is_active, is_practice, is_library, created_by, owner_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, datetime('now'), datetime('now'))
    """, (new_name, t.get('template_type', 'SOAP'), t.get('specialty', 'General Medicine'), t.get('category', 'General Medicine'), t.get('description', ''), t.get('content', ''), t.get('tags', ''), t.get('is_active', 1), t.get('created_by', 'Admin'), t.get('owner_email', DEFAULT_OWNER_EMAIL)))
    new_id = cursor.lastrowid

    # Copy permissions
    cursor.execute("SELECT role_name FROM template_permissions WHERE template_id = ?", (template_id,))
    for p in cursor.fetchall():
        cursor.execute("INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?)", (new_id, p['role_name']))

    # Copy sections, components, options & relationships
    comp_map = {}
    opt_map = {}

    cursor.execute("SELECT id, title, category, order_index, column_layout FROM template_sections WHERE template_id = ? ORDER BY order_index ASC", (template_id,))
    sections = cursor.fetchall()
    for raw_sec in sections:
        sec = dict(raw_sec)
        cursor.execute("INSERT INTO template_sections (template_id, title, category, order_index, column_layout) VALUES (?, ?, ?, ?, ?)",
                       (new_id, sec['title'], sec['category'], sec['order_index'], sec.get('column_layout', 1)))
        new_sec_id = cursor.lastrowid
        cursor.execute("SELECT * FROM template_components WHERE section_id = ? ORDER BY order_index ASC", (sec['id'],))
        comps = cursor.fetchall()
        for raw_comp in comps:
            comp = dict(raw_comp)
            cursor.execute("""
                INSERT INTO template_components (section_id, component_type, label, placeholder, is_required, default_value, order_index, column_count, help_text, config)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (new_sec_id, comp['component_type'], comp['label'], comp.get('placeholder'), comp.get('is_required', 0), comp.get('default_value'), comp.get('order_index', 0), comp.get('column_count', 3), comp.get('help_text'), comp.get('config')))
            new_comp_id = cursor.lastrowid
            comp_map[comp['id']] = new_comp_id

            cursor.execute("SELECT * FROM template_options WHERE component_id = ? ORDER BY order_index ASC", (comp['id'],))
            for raw_opt in cursor.fetchall():
                opt = dict(raw_opt)
                new_p_opt = opt_map.get(opt['parent_option_id']) if opt.get('parent_option_id') else None
                cursor.execute("""
                    INSERT INTO template_options (component_id, option_label, option_value, order_index, parent_option_id, is_selected, is_expandable)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (new_comp_id, opt['option_label'], opt['option_value'], opt['order_index'], new_p_opt, opt.get('is_selected', 0), opt.get('is_expandable', 0)))
                opt_map[opt['id']] = cursor.lastrowid

    # Copy relationships
    cursor.execute("SELECT parent_component_id, trigger_value, child_component_id FROM template_relationships WHERE template_id = ?", (template_id,))
    for raw_rel in cursor.fetchall():
        rel = dict(raw_rel)
        new_p = comp_map.get(rel['parent_component_id'])
        new_c = comp_map.get(rel['child_component_id'])
        if new_p and new_c:
            cursor.execute("""
                INSERT INTO template_relationships (template_id, parent_component_id, trigger_value, child_component_id)
                VALUES (?, ?, ?, ?)
            """, (new_id, new_p, rel['trigger_value'], new_c))

    conn.commit()
    conn.close()
    return {"success": True, "id": new_id, "name": new_name}


@router.put("/templates/{template_id}/status")
def set_template_status(template_id: int, data: dict):
    is_active = 1 if data.get("is_active", True) else 0
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM templates WHERE id = ?", (template_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Template not found")
    cursor.execute("UPDATE templates SET is_active = ?, updated_at = datetime('now') WHERE id = ?", (is_active, template_id))
    conn.commit()
    conn.close()
    return {"success": True, "is_active": bool(is_active)}


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
@router.get("/templates/search")
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
def get_medications(condition: str = "", condition_key: str = "", category: str = "", search: str = ""):
    cond = (condition or condition_key or "").strip().lower()
    conn = get_con()
    cursor = conn.cursor()
    query = "SELECT * FROM medication_references WHERE 1=1"
    params = []
    if cond and cond != "all":
        query += " AND (LOWER(condition_key) = ? OR LOWER(condition_name) LIKE ?)"
        params.extend([cond, f"%{cond}%"])
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


@router.get("/medications/{med_id}")
def get_medication_by_id(med_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medication_references WHERE id = ?", (med_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Medication not found")
    return dict(row)


@router.post("/medications")
def create_medication(data: dict):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO medication_references (
            condition_key, condition_name, medication_name, generic_name,
            dosage_form, strength, standard_dosage, frequency, instructions, notes, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("condition_key", "general"),
        data.get("condition_name", "General Medicine"),
        data.get("medication_name", ""),
        data.get("generic_name", ""),
        data.get("dosage_form", "Tablet"),
        data.get("strength", ""),
        data.get("standard_dosage", ""),
        data.get("frequency", "OD"),
        data.get("instructions", ""),
        data.get("notes", ""),
        data.get("category", "General")
    ))
    new_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM medication_references WHERE id = ?", (new_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


@router.put("/medications/{med_id}")
def update_medication(med_id: int, data: dict):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE medication_references SET
            condition_key = ?, condition_name = ?, medication_name = ?, generic_name = ?,
            dosage_form = ?, strength = ?, standard_dosage = ?, frequency = ?,
            instructions = ?, notes = ?, category = ?
        WHERE id = ?
    """, (
        data.get("condition_key", "general"),
        data.get("condition_name", "General Medicine"),
        data.get("medication_name", ""),
        data.get("generic_name", ""),
        data.get("dosage_form", "Tablet"),
        data.get("strength", ""),
        data.get("standard_dosage", ""),
        data.get("frequency", "OD"),
        data.get("instructions", ""),
        data.get("notes", ""),
        data.get("category", "General"),
        med_id
    ))
    conn.commit()
    cursor.execute("SELECT * FROM medication_references WHERE id = ?", (med_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Medication not found")
    return dict(row)


@router.delete("/medications/{med_id}")
def delete_medication(med_id: int):
    conn = get_con()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM medication_references WHERE id = ?", (med_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Medication deleted"}


# --- Consultation Form Responses ---
@router.get("/consultations")
@router.get("/template-responses")
def list_consultations():
    conn = get_con()
    cursor = conn.cursor()
    response_table = template_consultation_table(cursor)
    cursor.execute(f"SELECT * FROM {response_table} ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        cursor.execute("SELECT * FROM template_responses WHERE consultation_id = ?", (d["id"],))
        d["responses"] = [dict(x) for x in cursor.fetchall()]
        results.append(d)
    conn.close()
    return results


@router.post("/responses")
@router.post("/consultations")
@router.post("/template-responses")
def save_consultation_responses(data: dict):
    conn = get_con()
    cursor = conn.cursor()
    response_table = template_consultation_table(cursor)
    pat_id = data.get("patient_id", 1)
    tpl_id = data.get("template_id", 1)
    notes = data.get("notes", "")
    enc_type = data.get("encounter_type", "Initial Consult")
    doc_name = data.get("doctor_name", "Dr. S. Ramasamy")
    responses = data.get("responses", [])

    cursor.execute("""
        INSERT INTO {response_table} (patient_id, template_id, doctor_name, notes, encounter_type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'Completed', datetime('now'), datetime('now'))
    """.format(response_table=response_table), (pat_id, tpl_id, doc_name, notes, enc_type))
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
@router.get("/consultations/{consultation_id}")
@router.get("/template-responses/{consultation_id}")
def get_consultation_responses(consultation_id: int):
    conn = get_con()
    cursor = conn.cursor()
    response_table = template_consultation_table(cursor)
    cursor.execute(f"SELECT * FROM {response_table} WHERE id = ?", (consultation_id,))
    c = cursor.fetchone()
    if not c:
        conn.close()
        raise HTTPException(404, "Consultation not found")
    c_data = dict(c)
    cursor.execute("SELECT * FROM template_responses WHERE consultation_id = ?", (consultation_id,))
    c_data["responses"] = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return c_data

