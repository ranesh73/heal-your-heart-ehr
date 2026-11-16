"""
The Practice Templates catalogue for Heal Your Heart Neelankarai.

`seed_practice_catalog()` makes the Practice Templates list contain exactly
the 57 clinic templates listed in PRACTICE_TEMPLATES and nothing else.

It is deliberately non-destructive:

  * templates that are not in the catalogue are un-flagged (`is_practice = 0`)
    rather than deleted, so no row and no authored structure is ever lost
  * templates already in the catalogue keep their id, sections, components
    and conditional rules
  * RENAMES maps previously-seeded structured templates onto their catalogue
    name so their clinical content carries over instead of being duplicated

Run it again at any time - it converges on the same state.
"""

from ..database import get_db_connection, DEFAULT_OWNER_EMAIL

SEED_AUTHOR = "Dr. K. Rajagopal, MD"
DEFAULT_ROLES = ["Physician", "Physician Assistant"]

# Structured templates seeded under an older name -> catalogue name. Renaming
# preserves their sections/components rather than creating an empty duplicate.
RENAMES = {
    "Diabetes Management Template": "Diabetes Management Template_Practice",
    "Vaso-Meditech EECP SOAP Protocol": "Vaso-Meditech EECP SOAP_Practice",
}

# (name, template_type, category)
PRACTICE_TEMPLATES = [
    ("Admission Discharge Summary", "Reports", "General Medicine"),
    ("Adverse Event Report Form_Practice", "Reports", "Administrative"),
    ("AFB Sputum", "Lab Record", "Lab"),
    ("Allergy Profile", "Lab Record", "Lab"),
    ("Anemia Profile", "Lab Record", "Lab"),
    ("Assessment Notes 08-05-2024_Practice", "Assessment Notes", "General Medicine"),
    ("Blood Group", "Lab Record", "Lab"),
    ("Chief Complaints_Practice", "Chief Complaints", "General Medicine"),
    ("Coronary Aniography_Practice", "Imaging", "Cardiac"),
    ("Diabetes Management Template_Practice", "SOAP", "Diabetes"),
    ("Diet for Anemia_Practice", "Diet Recommendations", "Nutrition"),
    ("Diet for BP Patient_Practice", "Diet Recommendations", "Hypertension"),
    ("Diet For Cholesterol_Practice", "Diet Recommendations", "Nutrition"),
    ("Diet for Diabetes_Practice", "Diet Recommendations", "Diabetes"),
    ("Diet for Healthy Heart/Healthy Life_Practice", "Diet Recommendations", "Cardiac"),
    ("Diet for Kidney Disease_Practice", "Diet Recommendations", "Kidney / Urinary"),
    ("Diet for Thyroid Problem_Practice", "Diet Recommendations", "Thyroid"),
    ("Discharge Summary", "Reports", "General Medicine"),
    ("DM1 Practice", "SOAP", "Diabetes"),
    ("D_copy", "SOAP", "General Medicine"),
    ("eGFR", "Lab Record", "Kidney / Urinary"),
    ("Heart Failure Patient Diet_Practice", "Diet Recommendations", "Cardiac"),
    ("Heart Failure Plus", "SOAP", "Cardiac"),
    ("HUH - EECP Routine", "Treatment Notes", "EECP"),
    ("HUH - EECP Routine Out", "Treatment Notes", "EECP"),
    ("HUH - Medication List_copy", "Prescription", "Pharmacy"),
    ("HUH EECP SOAP_Practice", "SOAP", "EECP"),
    ("HUH-Cardio Diabetic", "SOAP", "Cardiac"),
    ("HUH-CD Diabetic Routine", "Follow up", "Diabetes"),
    ("HUH-CD-Diabetic", "SOAP", "Diabetes"),
    ("Lab Orders", "Lab Record", "Lab"),
    ("Master Health Checkup", "Reports", "Preventive"),
    ("Metabolic Profile", "Lab Record", "Lab"),
    ("Patient Transfer Sheet_Practice", "Reports", "Administrative"),
    ("Peripheral Blood Smear", "Lab Record", "Lab"),
    ("Renal Profile", "Lab Record", "Kidney / Urinary"),
    ("Risk prediction for contrast-induced nephropathy_Practice", "Assessment Notes", "Kidney / Urinary"),
    ("Routine Stool", "Lab Record", "Lab"),
    ("Send Invoice Email Template (OTP)", "Send Invoice - Email", "Billing"),
    ("Send Patient Statement Email Template", "Send Statement - Email", "Billing"),
    ("Send Patient Statement PHR Template", "Send Statement - PHR Message", "Billing"),
    ("Send Receipt Email Template (OTP)", "Send Receipt - Email", "Billing"),
    ("SendInvoiceEmailTemplate", "Send Invoice - Email", "Billing"),
    ("SendInvoicePHRTemplate", "Send Invoice - PHR Message", "Billing"),
    ("SendReceiptEmailTemplate", "Send Receipt - Email", "Billing"),
    ("SendReceiptPHRTemplate", "Send Receipt - PHR Message", "Billing"),
    ("Symptom", "Symptoms", "General Medicine"),
    ("Symptoms_Practice", "Symptoms", "Cardiac"),
    ("Syrub / oint/vit", "Prescription", "Pharmacy"),
    ("Treadmill Test (TMT )_Practice", "Imaging", "Cardiac"),
    ("Urine C/S", "Lab Record", "Lab"),
    ("Urine Micro Albumin", "Lab Record", "Kidney / Urinary"),
    ("Vaso-Meditech EECP Event Reporting Form_Practice", "Reports", "EECP"),
    ("Vaso-Meditech EECP SOAP_Practice", "SOAP", "EECP"),
    ("Vaso-Meditech Follow-up", "Follow up", "EECP"),
    ("Vasomeditech EECP Diagnosis", "Diagnosis", "EECP"),
    ("Vasomeditech EECP Social History_Practice", "Social History", "EECP"),
]

YES_NO = [{"option_label": "Yes"}, {"option_label": "No"}]


def _severity_scale():
    return [{"option_label": str(n)} for n in range(1, 11)]


# ---------------------------------------------------------------------------
# Starter structures.
#
# "Symptoms_Practice" is the worked example from the brief: independent
# Yes/No screening questions, each with its own follow-up branch that is only
# revealed when the parent answer is "Yes".
# ---------------------------------------------------------------------------
STARTER_STRUCTURES = {
    "Symptoms_Practice": {
        "sections": [
            {
                "title": "Symptoms",
                "category": "Subjective",
                "components": [
                    {"tag": "cp", "type": "Yes/No Question", "label": "Chest Pain?", "options": YES_NO},
                    {"tag": "cp_sev", "type": "Rating Scale", "label": "Pain Severity",
                     "column_count": 4, "options": _severity_scale()},
                    {"tag": "cp_loc", "type": "Simple Question", "label": "Pain Location",
                     "placeholder": "e.g. Retrosternal, radiating to left arm"},
                    {"tag": "cp_dur", "type": "Simple Question", "label": "Pain Duration",
                     "placeholder": "e.g. 10 minutes"},
                    {"tag": "cp_char", "type": "Single Choice", "label": "Pain Character",
                     "column_count": 4,
                     "options": [{"option_label": o} for o in ["Sharp", "Dull", "Pressure", "Burning"]]},
                    {"tag": "cp_rad", "type": "Simple Question", "label": "Radiation",
                     "placeholder": "e.g. Left arm, jaw, back"},

                    {"tag": "db", "type": "Yes/No Question", "label": "Difficulty in Breathing?", "options": YES_NO},
                    {"tag": "db_onset", "type": "Single Choice", "label": "Onset",
                     "column_count": 2, "options": [{"option_label": "Sudden"}, {"option_label": "Gradual"}]},
                    {"tag": "db_dur", "type": "Simple Question", "label": "Duration",
                     "placeholder": "e.g. 2 days"},
                    {"tag": "db_sev", "type": "Single Choice", "label": "Severity",
                     "column_count": 3,
                     "options": [{"option_label": o} for o in ["Mild", "Moderate", "Severe"]]},

                    {"tag": "pal", "type": "Yes/No Question", "label": "Palpitations?", "options": YES_NO},
                    {"tag": "pal_trig", "type": "Single Choice", "label": "Palpitation Trigger",
                     "column_count": 3,
                     "options": [{"option_label": o} for o in ["At rest", "On exertion", "Emotional stress"]]},

                    {"tag": "diz", "type": "Yes/No Question", "label": "Dizziness?", "options": YES_NO},
                    {"tag": "nau", "type": "Yes/No Question", "label": "Nausea?", "options": YES_NO},
                ],
            },
            {
                "title": "Physical Examination",
                "category": "Objective",
                "components": [
                    {"type": "Simple Question", "label": "Blood Pressure", "placeholder": "mmHg"},
                    {"type": "Simple Question", "label": "Heart Rate", "placeholder": "bpm"},
                    {"type": "Simple Question", "label": "Temperature", "placeholder": "°C"},
                    {"type": "Simple Question", "label": "Oxygen Saturation", "placeholder": "%"},
                ],
            },
            {
                "title": "Assessment",
                "category": "Assessment",
                "components": [{"type": "Notes", "label": "Clinical Assessment"}],
            },
            {
                "title": "Treatment Notes",
                "category": "Plan",
                "components": [{"type": "Notes", "label": "Treatment Notes"}],
            },
        ],
        # parent tag, trigger answer, child tag
        "rules": [
            ("cp", "Yes", "cp_sev"), ("cp", "Yes", "cp_loc"), ("cp", "Yes", "cp_dur"),
            ("cp", "Yes", "cp_char"), ("cp", "Yes", "cp_rad"),
            ("db", "Yes", "db_onset"), ("db", "Yes", "db_dur"), ("db", "Yes", "db_sev"),
            ("pal", "Yes", "pal_trig"),
        ],
    },
}


def _write_structure(cursor, template_id, spec):
    """Write a starter structure's sections, components and rules."""
    cursor.execute("DELETE FROM template_relationships WHERE template_id = ?;", (template_id,))
    cursor.execute("DELETE FROM template_sections WHERE template_id = ?;", (template_id,))

    tag_to_id = {}
    for s_idx, section in enumerate(spec["sections"]):
        cursor.execute("""
            INSERT INTO template_sections (template_id, title, category, order_index, column_layout)
            VALUES (?, ?, ?, ?, 1);
        """, (template_id, section["title"], section.get("category", "Subjective"), s_idx))
        section_id = cursor.lastrowid

        for c_idx, comp in enumerate(section.get("components", [])):
            cursor.execute("""
                INSERT INTO template_components (section_id, component_type, label, placeholder,
                                                 is_required, default_value, order_index,
                                                 column_count, help_text)
                VALUES (?, ?, ?, ?, 0, '', ?, ?, NULL);
            """, (
                section_id, comp["type"], comp["label"], comp.get("placeholder", ""),
                c_idx, comp.get("column_count", 3),
            ))
            comp_id = cursor.lastrowid
            if comp.get("tag"):
                tag_to_id[comp["tag"]] = comp_id

            for o_idx, opt in enumerate(comp.get("options", [])):
                label = opt["option_label"] if isinstance(opt, dict) else str(opt)
                cursor.execute("""
                    INSERT INTO template_options (component_id, option_label, option_value,
                                                  order_index, parent_option_id, is_selected, is_expandable)
                    VALUES (?, ?, ?, ?, NULL, 0, 0);
                """, (comp_id, label, label, o_idx))

    for parent_tag, trigger, child_tag in spec.get("rules", []):
        if parent_tag in tag_to_id and child_tag in tag_to_id:
            cursor.execute("""
                INSERT INTO template_relationships (template_id, parent_component_id,
                                                    trigger_value, child_component_id)
                VALUES (?, ?, ?, ?);
            """, (template_id, tag_to_id[parent_tag], trigger, tag_to_id[child_tag]))


def seed_practice_catalog(verbose=True):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Carry structured templates over to their catalogue name.
    renamed = []
    for old_name, new_name in RENAMES.items():
        cursor.execute("SELECT id FROM templates WHERE LOWER(name) = ?;", (new_name.lower(),))
        if cursor.fetchone():
            continue  # catalogue name already present - nothing to carry over
        cursor.execute("SELECT id FROM templates WHERE LOWER(name) = ?;", (old_name.lower(),))
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "UPDATE templates SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                (new_name, row["id"]),
            )
            renamed.append(f"{old_name} -> {new_name}")

    # 2. Ensure every catalogue template exists and is flagged as practice.
    created, updated = [], []
    catalog_ids = []
    for name, ttype, category in PRACTICE_TEMPLATES:
        cursor.execute("SELECT id, template_type FROM templates WHERE LOWER(name) = ?;", (name.lower(),))
        row = cursor.fetchone()

        if row is None:
            cursor.execute("""
                INSERT INTO templates (name, template_type, specialty, category, description,
                                       content, tags, is_active, is_practice, is_library,
                                       created_by, owner_email)
                VALUES (?, ?, ?, ?, ?, '', ?, 1, 1, 0, ?, ?);
            """, (
                name, ttype, category, category,
                f"{category} clinical template used across the practice.",
                category.lower(), SEED_AUTHOR, DEFAULT_OWNER_EMAIL,
            ))
            template_id = cursor.lastrowid
            for role in DEFAULT_ROLES:
                cursor.execute(
                    "INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?);",
                    (template_id, role),
                )
            created.append(name)
        else:
            template_id = row["id"]
            cursor.execute("""
                UPDATE templates
                SET template_type = ?, is_practice = 1, is_active = 1, owner_email = ?
                WHERE id = ?;
            """, (ttype, DEFAULT_OWNER_EMAIL, template_id))
            updated.append(name)

        catalog_ids.append(template_id)

        # Give the worked example its starter structure once.
        starter = STARTER_STRUCTURES.get(name)
        if starter:
            cursor.execute("SELECT COUNT(*) AS n FROM template_sections WHERE template_id = ?;", (template_id,))
            if cursor.fetchone()["n"] == 0:
                _write_structure(cursor, template_id, starter)

    # 3. Un-flag everything else so the list shows exactly the catalogue.
    #    Rows are KEPT - only the practice flag is cleared, so nothing is lost
    #    and a template can be restored by setting is_practice = 1 again.
    placeholders = ",".join("?" * len(catalog_ids))
    cursor.execute(
        f"SELECT COUNT(*) AS n FROM templates WHERE is_practice = 1 AND id NOT IN ({placeholders});",
        catalog_ids,
    )
    archived_count = cursor.fetchone()["n"]
    cursor.execute(
        f"UPDATE templates SET is_practice = 0 WHERE is_practice = 1 AND id NOT IN ({placeholders});",
        catalog_ids,
    )

    conn.commit()
    conn.close()

    if verbose:
        for line in renamed:
            print(f"Practice catalogue rename: {line}")
        print(
            f"Practice catalogue: {len(created)} created, {len(updated)} retained, "
            f"{archived_count} non-catalogue template(s) un-flagged (rows kept)."
        )

    return created, updated, archived_count
