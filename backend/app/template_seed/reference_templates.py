"""
The two structured clinical templates shown in the CharmHealth reference
screenshots, expressed as data for the template viewer.

`seed_reference_templates()` is idempotent and conservative:

  * a template is created only when no row with that name exists
  * an existing template's structure is rebuilt only when it does not yet
    carry the reference sections, so a clinician's later edits are kept
  * nothing is ever deleted from an unrelated template

Component types used here are the ones the frontend viewer dispatches on.
Nested options (`children`) drive the hierarchical checkbox trees.

Names must match `practice_catalog.PRACTICE_TEMPLATES` exactly; if they drift,
the catalogue renames the row and this module then re-creates the old name on
the next start, duplicating the template on every restart.
"""

from ..database import get_db_connection, DEFAULT_OWNER_EMAIL

SEED_AUTHOR = "Dr. K. Rajagopal, MD"
DEFAULT_ROLES = ["Physician", "Physician Assistant"]

SYMPTOM_SCORE_OPTIONS = ["0 – None", "1 – Mild", "2 – Moderate", "3 – Severe"]


DIABETES_TEMPLATE = {
    "name": "Diabetes Management Template_Practice",
    "template_type": "SOAP",
    "category": "Diabetes",
    "description": "Comprehensive Type 2 Diabetes clinic note with symptom scoring, "
                   "glycaemic control review and complication screening.",
    "tags": "diabetes, soap, hba1c, symptom score, glycemic",
    # Rebuild the structure only if this section title is absent.
    "signature_section": "Symptoms",
    "sections": [
        {
            "title": "Symptoms",
            "category": "Subjective",
            "components": [
                {
                    "component_type": "Heading",
                    "label": "Section A: Symptom Checklist (Score 0 = None, 1 = Mild, "
                             "2 = Moderate, 3 = Severe)",
                },
                {
                    "component_type": "Single Choice",
                    "label": "Polyuria (Excessive urination)",
                    "column_count": 3,
                    "options": SYMPTOM_SCORE_OPTIONS,
                },
                {
                    "component_type": "Single Choice",
                    "label": "Polyphagia (Increased hunger)",
                    "column_count": 3,
                    "options": SYMPTOM_SCORE_OPTIONS,
                },
                {
                    "component_type": "Single Choice",
                    "label": "Fatigue / Weakness (Low energy)",
                    "column_count": 3,
                    "options": SYMPTOM_SCORE_OPTIONS,
                },
                {
                    "component_type": "Single Choice",
                    "label": "Polydipsia (Excessive thirst)",
                    "column_count": 3,
                    "options": SYMPTOM_SCORE_OPTIONS,
                },
                {
                    "component_type": "Single Choice",
                    "label": "Mood Changes (Irritability / depression / anxiety)",
                    "column_count": 3,
                    "options": SYMPTOM_SCORE_OPTIONS,
                },
                {
                    "component_type": "Calculated Field",
                    "label": "Total Symptom Score:",
                },
                {
                    "component_type": "Interpretation",
                    "label": "Interpretation:",
                    "column_count": 3,
                    "options": [
                        "0–6 → Well Controlled / Minimal Symptoms",
                        # Stored exactly as CharmHealth exported it, entity and
                        # all. The viewer decodes it so the clinician sees "&".
                        "7–15 → Mild to Moderate Symptoms (needs lifestyle &amp; "
                        "dose adjustment)",
                        "15 → Poor Symptom Control (consider therapy review)",
                    ],
                },
            ],
        },
        {
            "title": "History of Present Illness",
            "category": "Subjective",
            "components": [
                {
                    "component_type": "Single Choice",
                    "label": "Type of Diabetes",
                    "column_count": 3,
                    "options": ["Type 1", "Type 2", "Gestational", "Others"],
                },
                {
                    "component_type": "Text Field",
                    "label": "Duration of Diabetes:",
                },
                {
                    "component_type": "Single Choice",
                    "label": "Diet Compliance",
                    "column_count": 3,
                    "options": ["Excellent", "Good", "Poor"],
                },
                {
                    # One option per full-width row, as in the reference.
                    "component_type": "Single Choice",
                    "label": "Physical Activity ≥150 min/wk",
                    "column_count": 1,
                    "options": ["Yes", "No"],
                },
                {
                    "component_type": "Single Choice",
                    "label": "Sleep Quality 7–8 hrs",
                    "column_count": 1,
                    "options": ["Yes", "No"],
                },
                {
                    "component_type": "Single Choice",
                    "label": "Tobacco / Alcohol Use",
                    "column_count": 3,
                    "options": ["Never", "Current", "Ex-user"],
                },
                {
                    "component_type": "Notes",
                    "label": "Additional History:",
                },
            ],
        },
        {
            "title": "Objective",
            "category": "Objective",
            "components": [
                {
                    "component_type": "Heading",
                    "label": "Section B: Vitals, Anthropometry and Laboratory Values",
                },
                {
                    "component_type": "Table",
                    "label": "Clinical Measurements",
                    "options": [
                        "Weight: (kg)",
                        "Body Mass Index: (kg/m²)",
                        "Blood Pressure: (mmHg)",
                        "Fasting Blood Sugar: (mg/dL)",
                        "Post-Prandial Blood Sugar: (mg/dL)",
                        "HbA1c: (%)",
                    ],
                },
                {
                    "component_type": "Multi Choice",
                    "label": "Complication Screening Completed",
                    "column_count": 3,
                    "options": [
                        "Fundus / Retinopathy",
                        "Foot / Neuropathy",
                        "Urine Microalbumin",
                        "Serum Creatinine / eGFR",
                        "Lipid Profile",
                        "ECG",
                    ],
                },
            ],
        },
        {
            "title": "Assessment & Plan",
            "category": "Assessment",
            "components": [
                {
                    "component_type": "Single Choice",
                    "label": "Glycaemic Control Status",
                    "column_count": 3,
                    "options": ["Good (HbA1c < 7%)", "Suboptimal (7–8%)", "Poor (> 8%)"],
                },
                {
                    "component_type": "Notes",
                    "label": "Plan / Medication Adjustment:",
                },
                {
                    "component_type": "Date",
                    "label": "Next Review Date:",
                },
            ],
        },
    ],
}


EECP_TEMPLATE = {
    "name": "Vaso-Meditech EECP SOAP_Practice",
    "template_type": "SOAP",
    "category": "EECP",
    "description": "Vaso-Meditech EECP treatment protocol covering angina "
                   "classification, session pressure log and functional response.",
    "tags": "eecp, angina, ccs, counterpulsation, vaso-meditech, chest pain",
    "signature_section": "History of Present Illness",
    "marker_component": "Post-EECP assessment",
    "sections": [
        {
            "title": "History of Present Illness",
            "category": "Subjective",
            "components": [
                {
                    "component_type": "Centered Heading",
                    "label": "Initial Assessment",
                },
                {
                    # Hierarchical angina classification tree: Chest Pain? -> Yes -> CCS | With Exertion | At Rest
                    "component_type": "Check List",
                    "label": "Chest Pain?",
                    "column_count": 1,
                    "options": [
                        {"option_label": "No"},
                        {
                            "option_label": "Yes",
                            "children": [
                                {
                                    "option_label": "CCS",
                                    "children": [
                                        {"option_label": "Class I"},
                                        {"option_label": "Class II"},
                                        {"option_label": "Class III"},
                                        {"option_label": "Class IV"},
                                    ],
                                },
                                {
                                    "option_label": "With Exertion",
                                    "is_expandable": True,
                                    "children": [
                                        {"option_label": "Running"},
                                        {"option_label": "Walking up Stairs"},
                                        {"option_label": "Walking up a Slope"},
                                        {
                                            "option_label": "Walking on Flat Surface",
                                            "is_expandable": True,
                                            "children": [
                                                {"option_label": "More than 1/2 km"},
                                                {"option_label": "Less than 1/2 km"},
                                                {"option_label": "Less than 100 m"},
                                            ],
                                        },
                                    ],
                                },
                                {"option_label": "At Rest"},
                            ],
                        },
                    ],
                },
                {
                    "component_type": "Table",
                    "label": "Angina Frequency Log",
                    "options": [
                        "Chest Pain Frequency per Week: (No. of times per week)",
                        "S/L Nitroglycerin per Week: (No. taken per week)",
                        "Walking Time without Symptoms: (min.)",
                    ],
                },
                {
                    # Shortness of Breath hierarchy: No, Yes -> NYHA | With Exercise | At Rest
                    "component_type": "Check List",
                    "label": "Shortness of Breath?",
                    "column_count": 1,
                    "options": [
                        {"option_label": "No"},
                        {
                            "option_label": "Yes",
                            "children": [
                                {
                                    "option_label": "NYHA",
                                    "children": [
                                        {"option_label": "Class I"},
                                        {"option_label": "Class II"},
                                        {"option_label": "Class III"},
                                        {"option_label": "Class IV"},
                                    ],
                                },
                                {
                                    "option_label": "With Exercise",
                                    "is_expandable": True,
                                    "children": [
                                        {"option_label": "Running"},
                                        {"option_label": "Walking up Stairs"},
                                        {"option_label": "Walking up a Slope"},
                                        {
                                            "option_label": "Walking on Flat Surface",
                                            "is_expandable": True,
                                            "children": [
                                                {"option_label": "More than 1/2 km"},
                                                {"option_label": "Less than 1/2 km"},
                                                {"option_label": "Less than 100 m"},
                                            ],
                                        },
                                    ],
                                },
                                {"option_label": "At Rest"},
                            ],
                        },
                    ],
                },
                {
                    # Edema of Legs: No, Yes -> Improving | Worsening | Stable
                    "component_type": "Check List",
                    "label": "Edema of Legs?",
                    "column_count": 1,
                    "options": [
                        {"option_label": "No"},
                        {
                            "option_label": "Yes",
                            "children": [
                                {"option_label": "Improving"},
                                {"option_label": "Worsening"},
                                {"option_label": "Stable"},
                            ],
                        },
                    ],
                },
                {
                    "component_type": "Single Choice",
                    "label": "Trouble breathing while lying flat?",
                    "column_count": 2,
                    "options": ["Yes", "No"],
                },
            ],
        },
        {
            "title": "Symptoms",
            "category": "Subjective",
            "components": [
                {
                    "component_type": "Check List",
                    "label": "Post-EECP assessment",
                    "column_count": 1,
                    "options": [
                        {"option_label": "The patient maintain the benefits."},
                        {"option_label": "Mild increase in the symptoms compared to post-EECP."},
                        {"option_label": "Recurrent symptoms to pre-EECP level."},
                        {"option_label": "Symptoms improved better than post EECP level."},
                        {"option_label": "Major adverse cardiac event."},
                    ],
                },
            ],
        },
        {
            "title": "Objective",
            "category": "Objective",
            "components": [
                {
                    "component_type": "Heading",
                    "label": "Vascular Readiness and Cuff Suitability",
                },
                {
                    "component_type": "Single Choice",
                    "label": "Femoral & Dorsalis Pedis Pulses",
                    "column_count": 3,
                    "options": ["Normal Palpable (+2)", "Diminished (+1)", "Absent (Severe PVD)"],
                },
                {
                    "component_type": "Table",
                    "label": "Baseline Haemodynamics",
                    "options": [
                        "Resting Blood Pressure: (mmHg)",
                        "Resting Heart Rate: (bpm)",
                        "Left Ventricular Ejection Fraction: (%)",
                        "Baseline SpO2: (%)",
                    ],
                },
                {
                    "component_type": "Single Choice",
                    "label": "Contraindication Screening",
                    "column_count": 1,
                    "options": [
                        "Cleared (No Contraindications)",
                        "Severe Aortic Regurgitation (Excluded)",
                        "Active Deep Vein Thrombosis (Excluded)",
                        "Severe Arrhythmia / Frequent PVCs",
                    ],
                },
            ],
        },
        {
            "title": "Assessment",
            "category": "Assessment",
            "components": [
                {
                    "component_type": "Single Choice",
                    "label": "Baseline CCS Angina Class",
                    "column_count": 2,
                    "options": [
                        "Class I (Mild exertion only)",
                        "Class II (Slight limitation)",
                        "Class III (Marked limitation, walking 1 block)",
                        "Class IV (Inability to carry out activity)",
                    ],
                },
                {
                    "component_type": "Calculated Field",
                    "label": "Diastolic Augmentation Ratio (D/S):",
                },
                {
                    "component_type": "Interpretation",
                    "label": "Interpretation:",
                    "column_count": 3,
                    "options": [
                        "D/S ≥ 1.5 → Optimal counterpulsation achieved",
                        "D/S 1.0–1.5 → Acceptable, review cuff fit &amp; pressure",
                        "D/S &lt; 1.0 → Suboptimal, re-assess timing and vascular status",
                    ],
                },
            ],
        },
        {
            "title": "Plan",
            "category": "Plan",
            "components": [
                {
                    "component_type": "Notes",
                    "label": "Recommended Course:",
                    "default_value": "Course of 35 one-hour sessions (1 hr/day, 6 days/wk). "
                                     "Initial cuff pressure 220–260 mmHg, titrated to achieve "
                                     "a D/S ratio ≥ 1.5.",
                },
                {
                    "component_type": "Number Field",
                    "label": "Sessions Prescribed:",
                    "default_value": "35",
                },
                {
                    "component_type": "Date",
                    "label": "Planned Start Date:",
                },
            ],
        },
    ],
}


REFERENCE_TEMPLATES = [DIABETES_TEMPLATE, EECP_TEMPLATE]


def _insert_options(cursor, comp_id, options, parent_option_id=None):
    """Insert a component's options depth-first, preserving nesting."""
    for idx, opt in enumerate(options or []):
        if isinstance(opt, dict):
            label = opt.get("option_label", "")
            children = opt.get("children") or []
            selected = 1 if opt.get("is_selected") else 0
            expandable = 1 if (opt.get("is_expandable") or children) else 0
        else:
            label = str(opt)
            children = []
            selected = 0
            expandable = 0

        cursor.execute("""
            INSERT INTO template_options (component_id, option_label, option_value, order_index,
                                          parent_option_id, is_selected, is_expandable)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (comp_id, label, label, idx, parent_option_id, selected, expandable))

        if children:
            _insert_options(cursor, comp_id, children, cursor.lastrowid)


def _write_structure(cursor, template_id, sections):
    """Replace this template's section tree with the reference structure."""
    cursor.execute("DELETE FROM template_relationships WHERE template_id = ?;", (template_id,))
    cursor.execute("DELETE FROM template_sections WHERE template_id = ?;", (template_id,))

    for s_idx, section in enumerate(sections):
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
                VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?);
            """, (
                section_id,
                comp["component_type"],
                comp["label"],
                comp.get("placeholder", ""),
                comp.get("default_value"),
                c_idx,
                comp.get("column_count", 3),
                comp.get("help_text"),
            ))
            _insert_options(cursor, cursor.lastrowid, comp.get("options", []))


def seed_reference_templates(verbose=True):
    """Create or structurally enrich the two reference screenshot templates."""
    conn = get_db_connection()
    cursor = conn.cursor()
    created, enriched, skipped = [], [], []

    for spec in REFERENCE_TEMPLATES:
        cursor.execute("SELECT id FROM templates WHERE LOWER(name) = ?;", (spec["name"].lower(),))
        row = cursor.fetchone()

        if row is None:
            cursor.execute("""
                INSERT INTO templates (name, template_type, specialty, category, description,
                                       content, tags, is_active, is_practice, is_library,
                                       created_by, owner_email)
                VALUES (?, ?, ?, ?, ?, '', ?, 1, 1, 0, ?, ?);
            """, (
                spec["name"], spec["template_type"], spec["category"], spec["category"],
                spec["description"], spec["tags"], SEED_AUTHOR, DEFAULT_OWNER_EMAIL,
            ))
            template_id = cursor.lastrowid
            for role in DEFAULT_ROLES:
                cursor.execute(
                    "INSERT INTO template_permissions (template_id, role_name) VALUES (?, ?);",
                    (template_id, role),
                )
            _write_structure(cursor, template_id, spec["sections"])
            created.append(spec["name"])
            continue

        template_id = row["id"]

        # Already carries the reference structure (or a clinician has since
        # authored their own section by that name) - leave it untouched.
        if spec.get("marker_component"):
            cursor.execute(
                "SELECT 1 FROM template_components tc "
                "JOIN template_sections ts ON tc.section_id = ts.id "
                "WHERE ts.template_id = ? AND tc.label = ? LIMIT 1;",
                (template_id, spec["marker_component"]),
            )
            already_done = bool(cursor.fetchone())
        else:
            cursor.execute(
                "SELECT 1 FROM template_sections WHERE template_id = ? AND title = ? LIMIT 1;",
                (template_id, spec["signature_section"]),
            )
            already_done = bool(cursor.fetchone())

        if already_done:
            skipped.append(spec["name"])
            continue

        cursor.execute("""
            UPDATE templates
            SET description = ?, tags = ?, category = ?, specialty = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
        """, (spec["description"], spec["tags"], spec["category"], spec["category"], template_id))
        _write_structure(cursor, template_id, spec["sections"])
        enriched.append(spec["name"])

    conn.commit()
    conn.close()

    if verbose:
        for name in created:
            print(f"Created reference template: {name}")
        for name in enriched:
            print(f"Enriched reference template with structured sections: {name}")
        for name in skipped:
            print(f"Reference template already structured, left untouched: {name}")

    return created, enriched, skipped
