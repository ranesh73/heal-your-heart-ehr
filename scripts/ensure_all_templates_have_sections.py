import sqlite3
import os

def copy_template_structure(cursor, source_id, target_id):
    comp_map = {}
    opt_map = {}

    cursor.execute("""
        SELECT id, title, category, order_index, column_layout
        FROM template_sections
        WHERE template_id = ?
        ORDER BY order_index ASC
    """, (source_id,))
    sections = cursor.fetchall()

    for sec_id, title, cat, s_idx, col_layout in sections:
        cursor.execute("""
            INSERT INTO template_sections (template_id, title, category, order_index, column_layout)
            VALUES (?, ?, ?, ?, ?)
        """, (target_id, title, cat, s_idx, col_layout))
        new_sec_id = cursor.lastrowid

        cursor.execute("""
            SELECT id, component_type, label, placeholder, is_required, default_value,
                   order_index, column_count, help_text, config
            FROM template_components
            WHERE section_id = ?
            ORDER BY order_index ASC
        """, (sec_id,))
        components = cursor.fetchall()

        for c_id, ctype, label, ph, req, def_val, c_idx, c_cols, help_txt, cfg in components:
            cursor.execute("""
                INSERT INTO template_components (section_id, component_type, label, placeholder,
                                                is_required, default_value, order_index,
                                                column_count, help_text, config)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (new_sec_id, ctype, label, ph, req, def_val, c_idx, c_cols, help_txt, cfg))
            new_c_id = cursor.lastrowid
            comp_map[c_id] = new_c_id

            # Options
            cursor.execute("""
                SELECT id, option_label, option_value, order_index, parent_option_id,
                       is_selected, is_expandable
                FROM template_options
                WHERE component_id = ?
                ORDER BY order_index ASC
            """, (c_id,))
            options = cursor.fetchall()

            for opt_id, o_lbl, o_val, o_idx, p_opt_id, is_sel, is_exp in options:
                new_p_opt = opt_map.get(p_opt_id) if p_opt_id else None
                cursor.execute("""
                    INSERT INTO template_options (component_id, option_label, option_value,
                                                  order_index, parent_option_id, is_selected, is_expandable)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (new_c_id, o_lbl, o_val, o_idx, new_p_opt, is_sel, is_exp))
                new_opt_id = cursor.lastrowid
                opt_map[opt_id] = new_opt_id

    # Relationships
    cursor.execute("""
        SELECT parent_component_id, trigger_value, child_component_id
        FROM template_relationships
        WHERE template_id = ?
    """, (source_id,))
    for p_id, trig, c_id in cursor.fetchall():
        new_p = comp_map.get(p_id)
        new_c = comp_map.get(c_id)
        if new_p and new_c:
            cursor.execute("""
                INSERT INTO template_relationships (template_id, parent_component_id, trigger_value, child_component_id)
                VALUES (?, ?, ?, ?)
            """, (target_id, new_p, trig, new_c))


def populate_db(db_path):
    if not os.path.exists(db_path):
        print(f"Skipping non-existent {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Find templates with sections
    cursor.execute("""
        SELECT t.id, t.name
        FROM templates t
        WHERE (SELECT count(*) FROM template_sections s WHERE s.template_id = t.id) > 0
    """)
    has_sec = {name: tid for tid, name in cursor.fetchall()}

    # Find templates with 0 sections
    cursor.execute("""
        SELECT t.id, t.name, t.template_type, t.category
        FROM templates t
        WHERE (SELECT count(*) FROM template_sections s WHERE s.template_id = t.id) = 0
    """)
    zero_sec = cursor.fetchall()

    print(f"\nProcessing {db_path}...")
    print(f"  Templates with sections: {len(has_sec)}")
    print(f"  Templates with 0 sections: {len(zero_sec)}")

    populated = 0
    for tid, name, ttype, cat in zero_sec:
        # Match rule priority
        source_id = None
        clean_name = name.replace("_Practice", "").strip()

        if f"{clean_name} Assessment" in has_sec:
            source_id = has_sec[f"{clean_name} Assessment"]
        elif f"{clean_name} Follow-up" in has_sec:
            source_id = has_sec[f"{clean_name} Follow-up"]
        elif clean_name in has_sec:
            source_id = has_sec[clean_name]
        elif f"{clean_name}_Practice" in has_sec:
            source_id = has_sec[f"{clean_name}_Practice"]
        elif "Diet" in name:
            if "Heart" in name or "Cardiac" in name:
                source_id = has_sec.get("Heart Failure Patient Diet", has_sec.get("Diet for BP Patient"))
            elif "Anemia" in name:
                source_id = has_sec.get("Diet for Anemia")
            else:
                source_id = has_sec.get("Diet for BP Patient")
        elif "EECP" in name:
            if "Session" in name or "Routine" in name:
                source_id = has_sec.get("EECP Daily Session Treatment Log", has_sec.get("Vaso-Meditech EECP SOAP_Practice"))
            elif "Follow" in name:
                source_id = has_sec.get("EECP Follow-up")
            elif "Event" in name or "Report" in name:
                source_id = has_sec.get("EECP Treatment Summary")
            else:
                source_id = has_sec.get("Vaso-Meditech EECP SOAP_Practice")
        elif "Diabetic" in name or "Diabetes" in name or name == "DM1 Practice":
            source_id = has_sec.get("Diabetes Management Template_Practice")
        elif ttype == "Lab Record" or "Lab" in name or "Profile" in name or "Blood" in name or "Urine" in name or "Sputum" in name or "Stool" in name:
            source_id = has_sec.get("Laboratory Review", has_sec.get("Blood Glucose Monitoring"))
        elif ttype == "Imaging" or "Imaging" in name or "TMT" in name or "Aniography" in name or "Echo" in name:
            source_id = has_sec.get("Imaging Review")
        elif ttype == "Reports" or "Summary" in name or "Report" in name or "Sheet" in name or "Checkup" in name:
            source_id = has_sec.get("EECP Treatment Summary")
        elif ttype == "Prescription" or "Medication" in name or "Syrub" in name:
            source_id = has_sec.get("General Prescription", has_sec.get("Diabetes Assessment"))
        elif ttype.startswith("Send") or "Email" in ttype or "PHR" in ttype or "Email" in name or "PHR" in name:
            source_id = has_sec.get("Appointment Reminder Email")
        elif ttype == "Symptoms":
            source_id = has_sec.get("Symptoms_Practice", has_sec.get("General Health Check"))
        elif ttype == "Physical Examination":
            source_id = has_sec.get("Cardiovascular Examination", has_sec.get("General Health Check"))
        elif ttype == "Follow up":
            source_id = has_sec.get("Cardiac Follow-up", has_sec.get("General Health Check"))
        elif ttype == "SOAP":
            source_id = has_sec.get("General Health Check")
        else:
            source_id = has_sec.get("General Health Check")

        if source_id:
            copy_template_structure(cursor, source_id, tid)
            populated += 1

    conn.commit()

    # Re-verify
    cursor.execute("""
        SELECT count(*)
        FROM templates t
        WHERE (SELECT count(*) FROM template_sections s WHERE s.template_id = t.id) > 0
    """)
    final_with_sec = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM templates")
    total_t = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM template_sections")
    total_sec = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM template_components")
    total_comp = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM template_options")
    total_opt = cursor.fetchone()[0]

    conn.close()

    print(f"  Populated {populated} templates.")
    print(f"  Result: {final_with_sec} / {total_t} templates now have full sections!")
    print(f"  Total sections: {total_sec}, components: {total_comp}, options: {total_opt}")


if __name__ == "__main__":
    populate_db("backend/data/ehr.db")
    populate_db("backend/seed_data/ehr_master.db")
