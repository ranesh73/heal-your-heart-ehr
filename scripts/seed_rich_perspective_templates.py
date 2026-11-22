import sqlite3
import json
import os

PRACTICE_TEMPLATES_CATALOG = [
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

# Ensure templates like "Diet for Healthy Heart_Practice" also map properly
PRACTICE_NAMES = set(t[0] for t in PRACTICE_TEMPLATES_CATALOG)
PRACTICE_NAMES.add("Diet for Healthy Heart_Practice")

def setup_flags(conn):
    c = conn.cursor()
    # 1. Reset all templates to is_practice = 0, is_library = 1
    c.execute("UPDATE templates SET is_practice = 0, is_library = 1")
    
    # 2. Set is_practice = 1 for the 57 practice catalogue templates
    for name, ttype, cat in PRACTICE_TEMPLATES_CATALOG:
        c.execute("""
            UPDATE templates 
            SET is_practice = 1, is_library = 0, template_type = ?, category = ?, specialty = ?
            WHERE LOWER(name) = LOWER(?)
        """, (ttype, cat, cat, name))
        
        # If not found, insert
        c.execute("SELECT id FROM templates WHERE LOWER(name) = LOWER(?)", (name,))
        if not c.fetchone():
            c.execute("""
                INSERT INTO templates (name, template_type, specialty, category, description, is_active, is_practice, is_library, created_by, owner_email)
                VALUES (?, ?, ?, ?, ?, 1, 1, 0, 'Dr. K. Rajagopal, MD', 'sanju2kguru@gmail.com')
            """, (name, ttype, cat, cat, f"Clinical practice protocol for {name}"))

    # Also make sure "Diet for Healthy Heart_Practice" has is_practice = 1
    c.execute("UPDATE templates SET is_practice = 1, is_library = 0 WHERE name = 'Diet for Healthy Heart_Practice'")

    conn.commit()
    print("Template practice/library flags configured successfully.")

def write_template_content(conn, template_name, template_type, category, sections_spec):
    c = conn.cursor()
    c.execute("SELECT id FROM templates WHERE LOWER(name) = LOWER(?)", (template_name,))
    row = c.fetchone()
    if not row:
        c.execute("""
            INSERT INTO templates (name, template_type, specialty, category, description, is_active, is_practice, is_library, created_by, owner_email)
            VALUES (?, ?, ?, ?, ?, 1, 1, 0, 'Dr. K. Rajagopal, MD', 'sanju2kguru@gmail.com')
        """, (template_name, template_type, category, category, f"Standard clinical practice protocol for {template_name}"))
        template_id = c.lastrowid
    else:
        template_id = row[0]
        c.execute("UPDATE templates SET template_type = ?, specialty = ?, category = ?, is_practice = 1, is_library = 0 WHERE id = ?", (template_type, category, category, template_id))

    # Clear existing sections, components, options, relationships
    c.execute("DELETE FROM template_relationships WHERE template_id = ?", (template_id,))
    c.execute("""
        DELETE FROM template_options WHERE component_id IN (
            SELECT c.id FROM template_components c 
            JOIN template_sections s ON c.section_id = s.id 
            WHERE s.template_id = ?
        )
    """, (template_id,))
    c.execute("""
        DELETE FROM template_components WHERE section_id IN (
            SELECT id FROM template_sections WHERE template_id = ?
        )
    """, (template_id,))
    c.execute("DELETE FROM template_sections WHERE template_id = ?", (template_id,))

    # Insert sections and components
    for s_idx, sec in enumerate(sections_spec):
        c.execute("""
            INSERT INTO template_sections (template_id, title, category, order_index, column_layout)
            VALUES (?, ?, ?, ?, ?)
        """, (template_id, sec["title"], sec.get("category", "Subjective"), s_idx, sec.get("column_layout", 1)))
        section_id = c.lastrowid

        for c_idx, comp in enumerate(sec.get("components", [])):
            config_json = json.dumps(comp.get("config")) if comp.get("config") else None
            c.execute("""
                INSERT INTO template_components (section_id, component_type, label, placeholder, is_required, default_value, order_index, column_count, help_text, config)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                section_id,
                comp["type"],
                comp["label"],
                comp.get("placeholder", ""),
                1 if comp.get("is_required") else 0,
                comp.get("default_value", ""),
                c_idx,
                comp.get("column_count", 3),
                comp.get("help_text", ""),
                config_json
            ))
            comp_id = c.lastrowid

            def insert_opts(options, parent_id=None):
                for o_idx, opt in enumerate(options):
                    if isinstance(opt, str):
                        c.execute("""
                            INSERT INTO template_options (component_id, option_label, option_value, order_index, parent_option_id, is_selected, is_expandable)
                            VALUES (?, ?, ?, ?, ?, 0, 0)
                        """, (comp_id, opt, opt, o_idx, parent_id))
                    elif isinstance(opt, dict):
                        lbl = opt.get("option_label", "")
                        val = opt.get("option_value", lbl)
                        exp = 1 if opt.get("is_expandable") or opt.get("children") else 0
                        sel = 1 if opt.get("is_selected") else 0
                        c.execute("""
                            INSERT INTO template_options (component_id, option_label, option_value, order_index, parent_option_id, is_selected, is_expandable)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (comp_id, lbl, val, o_idx, parent_id, sel, exp))
                        opt_id = c.lastrowid
                        if opt.get("children"):
                            insert_opts(opt["children"], opt_id)

            if comp.get("options"):
                insert_opts(comp["options"])

    conn.commit()
    print(f"  -> Template '{template_name}' populated with {len(sections_spec)} sections.")

def build_thyroid_template():
    # Table of foods to avoid with Tamil translations
    thyroid_avoid_rows = [
        [
            {"text": "Item / Food Name", "properties": {"bold": True, "fontSize": 13, "alignment": "left"}},
            {"text": "Tamil Translation", "properties": {"bold": True, "fontSize": 13, "alignment": "left"}},
            {"text": "Reason / Clinical Recommendation", "properties": {"bold": True, "fontSize": 13, "alignment": "left"}}
        ],
        [{"text": "Cassava", "properties": {"bold": True}}, {"text": "மரவள்ளிக் கிழங்கு", "properties": {}}, {"text": "Contains high cyanogenic glucosides; inhibits thyroidal iodine uptake", "properties": {}}],
        [{"text": "Lima Beans", "properties": {"bold": True}}, {"text": "பச்சைப்பயறு", "properties": {}}, {"text": "Contains linamarin, releases thiocyanate which blocks T4 synthesis", "properties": {}}],
        [{"text": "Sorghum", "properties": {"bold": True}}, {"text": "சோளம்", "properties": {}}, {"text": "High in cyanogenic glycosides; avoid especially in borderline iodine status", "properties": {}}],
        [{"text": "Sweet Potato", "properties": {"bold": True}}, {"text": "சர்க்கரைவள்ளிக்கிழங்கு", "properties": {}}, {"text": "Moderate goitrogenicity; consume well-cooked only, limit raw consumption", "properties": {}}],
        [{"text": "Flax seed", "properties": {"bold": True}}, {"text": "ஆளிவிதை", "properties": {}}, {"text": "Contains cyanogenic glycosides; roast well and do not consume excess raw", "properties": {}}],
        [{"text": "Cauliflower", "properties": {"bold": True}}, {"text": "காலிஃபிளவர்", "properties": {}}, {"text": "Glucosinolates release goitrin; must be thoroughly boiled/steamed", "properties": {}}],
        [{"text": "Broccoli", "properties": {"bold": True}}, {"text": "ப்ரோக்கோலி", "properties": {}}, {"text": "Inhibits thyroid peroxidase enzyme; steam thoroughly before eating", "properties": {}}],
        [{"text": "Cabbage", "properties": {"bold": True}}, {"text": "முட்டைக்கோஸ்", "properties": {}}, {"text": "High progoitrin content; strictly avoid raw cabbage salads/slaws", "properties": {}}],
        [{"text": "Bok Choy", "properties": {"bold": True}}, {"text": "சீனக்கோசு", "properties": {}}, {"text": "Cruciferous brassica; heat inactivates myrosinase enzyme", "properties": {}}],
        [{"text": "Radish", "properties": {"bold": True}}, {"text": "முள்ளங்கி", "properties": {}}, {"text": "Goitrogenic isothiocyanates; boil and discard water or consume in small quantity", "properties": {}}],
        [{"text": "Kale", "properties": {"bold": True}}, {"text": "கேல் கீரை", "properties": {}}, {"text": "Avoid raw kale smoothies; interferes with thyroid hormone generation", "properties": {}}],
        [{"text": "Brussels sprouts", "properties": {"bold": True}}, {"text": "ப்ரஸ்ஸல் ஸ்பிரௌட்ஸ்", "properties": {}}, {"text": "Highest concentration of goitrin among crucifers; limit portion and cook", "properties": {}}],
        [{"text": "Collard Greens", "properties": {"bold": True}}, {"text": "கலார்ட் கீரை", "properties": {}}, {"text": "Contains thiocyanates; blanch or cook before consumption", "properties": {}}],
        [{"text": "Arugula", "properties": {"bold": True}}, {"text": "அறுகுலா", "properties": {}}, {"text": "Contains glucosinolates; restrict raw quantity in hypothyroidism", "properties": {}}],
        [{"text": "Millet", "properties": {"bold": True}}, {"text": "குதிரைவாலி / தினை / வரகு / சோளம்", "properties": {}}, {"text": "C-glycosylflavones inhibit thyroid peroxidase (TPO); avoid as sole staple", "properties": {}}],
        [{"text": "Soy Products", "properties": {"bold": True}}, {"text": "சோயா / சோயாபீன் / டோஃபு", "properties": {}}, {"text": "Isoflavones (genistein/daidzein) block TPO; separate 4 hrs from levothyroxine", "properties": {}}],
        [{"text": "Onions", "properties": {"bold": True}}, {"text": "வெங்காயம்", "properties": {}}, {"text": "Contains flavonoids (quercetin); safe cooked, avoid excess raw juicing", "properties": {}}],
        [{"text": "Gluten", "properties": {"bold": True}}, {"text": "கோதுமை புரதம் (Gluten)", "properties": {}}, {"text": "Molecular mimicry trigger in autoimmune Hashimoto's thyroiditis", "properties": {}}],
    ]

    return [
        {
            "title": "Foods to Avoid for Thyroid Problem",
            "category": "Diet Recommendations",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Goitrogenic Foods & Foods to Restrict / Avoid in Thyroid Disorders",
                },
                {
                    "type": "Table",
                    "label": "Thyroid Goitrogenic Foods Reference Table",
                    "config": {"rows": thyroid_avoid_rows}
                },
                {
                    "type": "Multi Choice",
                    "label": "Identified Dietary Triggers in Patient History",
                    "column_count": 3,
                    "options": [
                        "Raw Cabbage / Cauliflower Salad",
                        "Raw Kale / Green Smoothies",
                        "Frequent Soy / Tofu Intake",
                        "Uncooked Radish (முள்ளங்கி)",
                        "Daily Millet as sole grain",
                        "Cassava / Tapioca frequent use",
                        "Gluten intolerance / Autoimmune Hashimoto's"
                    ]
                }
            ]
        },
        {
            "title": "Nutritional Recommendations for Thyroid Health",
            "category": "Plan",
            "components": [
                {
                    "type": "Single Choice",
                    "label": "Selenium & Zinc Dietary Support",
                    "column_count": 3,
                    "options": [
                        "Brazil nuts (1-2 daily for selenium)",
                        "Sunflower / Pumpkin seeds (zinc)",
                        "Adequate dietary intake confirmed",
                        "Supplementation recommended"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Iodine Balance Counseling",
                    "column_count": 3,
                    "options": [
                        "Standard iodized table salt in moderation",
                        "Avoid excess seaweed / kelp supplements",
                        "Maintain consistent dietary iodine"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Levothyroxine Administration Timing",
                    "column_count": 2,
                    "options": [
                        "Empty stomach 60 mins before breakfast with plain water",
                        "Wait 4 hours before iron/calcium/soy supplements or meals"
                    ]
                },
                {
                    "type": "Notes",
                    "label": "Personalized Thyroid Diet Counseling Notes",
                    "placeholder": "Enter patient-specific dietary restrictions, cooking instructions, and follow-up plan..."
                }
            ]
        }
    ]

def build_kidney_template():
    kidney_veg_rows = [
        [
            {"text": "Vegetable Name", "properties": {"bold": True, "fontSize": 13}},
            {"text": "Tamil Name", "properties": {"bold": True, "fontSize": 13}},
            {"text": "Potassium Content & Safe Preparation", "properties": {"bold": True, "fontSize": 13}}
        ],
        [{"text": "Cabbage", "properties": {"bold": True}}, {"text": "முட்டைக்கோஸ் (Muttaikose)", "properties": {}}, {"text": "Low potassium (<150mg/100g); safe steamed or cooked", "properties": {}}],
        [{"text": "Cauliflower", "properties": {"bold": True}}, {"text": "காலிஃபிளவர்", "properties": {}}, {"text": "Low potassium; excellent potato substitute", "properties": {}}],
        [{"text": "Bottle Gourd", "properties": {"bold": True}}, {"text": "சுரைக்காய் (Suraikai)", "properties": {}}, {"text": "Very low potassium, high water content, easy to digest", "properties": {}}],
        [{"text": "Ridge Gourd", "properties": {"bold": True}}, {"text": "பீர்க்கங்காய் (Peerkangai)", "properties": {}}, {"text": "Low potassium; peel fibrous ridges and cook with mild seasoning", "properties": {}}],
        [{"text": "Snake Gourd", "properties": {"bold": True}}, {"text": "புடலங்காய் (Pudalangai)", "properties": {}}, {"text": "Low potassium, renal safe vegetable", "properties": {}}],
        [{"text": "Ash Gourd", "properties": {"bold": True}}, {"text": "பூசணிக்காய் (Poosanikkai)", "properties": {}}, {"text": "Low potassium, cooling and hydrating", "properties": {}}],
        [{"text": "Lauki / White Gourd", "properties": {"bold": True}}, {"text": "வெள்ளை சுரைக்காய்", "properties": {}}, {"text": "Safe daily vegetable in CKD stages 3-5", "properties": {}}],
        [{"text": "French Beans", "properties": {"bold": True}}, {"text": "பீன்ஸ் (French Beans)", "properties": {}}, {"text": "Low potassium, rich in fiber", "properties": {}}],
        [{"text": "Cluster Beans", "properties": {"bold": True}}, {"text": "கொத்தவரங்காய் (Kothavarangai)", "properties": {}}, {"text": "Boil in water and discard cooking liquid to reduce potassium", "properties": {}}],
        [{"text": "Capsicum / Bell Pepper", "properties": {"bold": True}}, {"text": "குடைமிளகாய்", "properties": {}}, {"text": "Low potassium, high vitamin C; excellent for renal diet", "properties": {}}],
        [{"text": "Onion / Spring Onion", "properties": {"bold": True}}, {"text": "வெங்காயம் / வெங்காயத்தாள்", "properties": {}}, {"text": "Low potassium flavor enhancer to reduce salt need", "properties": {}}],
        [{"text": "Lady's Finger / Okra", "properties": {"bold": True}}, {"text": "வெண்டைக்காய்", "properties": {}}, {"text": "Moderate potassium; soak in water and cook well", "properties": {}}],
        [{"text": "Carrot", "properties": {"bold": True}}, {"text": "கேரட்", "properties": {}}, {"text": "Moderate potassium; consume in small portion, boil/leach first", "properties": {}}],
        [{"text": "Radish", "properties": {"bold": True}}, {"text": "முள்ளங்கி (Mullangi)", "properties": {}}, {"text": "Low potassium; good crunchy snack replacement", "properties": {}}],
        [{"text": "Cucumber", "properties": {"bold": True}}, {"text": "வெள்ளரிக்காய்", "properties": {}}, {"text": "Very low potassium, count water volume in fluid limit", "properties": {}}],
        [{"text": "Chow Chow", "properties": {"bold": True}}, {"text": "சௌ சௌ (Chow Chow)", "properties": {}}, {"text": "Low potassium gourd vegetable", "properties": {}}],
        [{"text": "Drumstick", "properties": {"bold": True}}, {"text": "முருங்கைக்காய்", "properties": {}}, {"text": "Moderate potassium; restrict to small portions, avoid leaves", "properties": {}}],
        [{"text": "Brinjal / Eggplant", "properties": {"bold": True}}, {"text": "கத்தரிக்காய்", "properties": {}}, {"text": "Low to moderate potassium; peel skin and cook thoroughly", "properties": {}}],
    ]

    return [
        {
            "title": "Avoid or Highly Restrict (Renal Contraindications)",
            "category": "Diet Recommendations",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "High-Risk Renal Foods to Strictly Avoid or Eliminate"
                },
                {
                    "type": "Multi Choice",
                    "label": "High-Protein / High-Nitrogen Foods to Restrict",
                    "column_count": 2,
                    "options": [
                        "Red Meat (Mutton, Beef, Pork)",
                        "Organ Meats (Liver, Kidney, Brain)",
                        "Commercial Whey / Bodybuilding Protein Powders",
                        "Processed Meats (Sausages, Bacon, Salami)"
                    ]
                },
                {
                    "type": "Multi Choice",
                    "label": "High-Potassium Foods to Avoid",
                    "column_count": 2,
                    "options": [
                        "Bananas, Mangoes, Oranges, Kiwis",
                        "Dried Fruits (Raisins, Prunes, Apricots, Dates)",
                        "Coconut Water (Elaneer / இளநீர்)",
                        "Potatoes, Sweet Potatoes, Tomatoes (unleached)"
                    ]
                },
                {
                    "type": "Multi Choice",
                    "label": "High-Phosphorus & High-Sodium Foods to Avoid",
                    "column_count": 2,
                    "options": [
                        "Dark Colas & Bottled Sodas (Phosphoric acid)",
                        "Processed Cheeses & Packaged Bakery Snacks",
                        "Pickles, Papad, Salted Nuts, Canned Soups",
                        "Potassium-based Salt Substitutes (Sendha namak / Lo-salt)"
                    ]
                }
            ]
        },
        {
            "title": "Safe & Low-Potassium Vegetables (Tamil Translations)",
            "category": "Diet Recommendations",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Renal Safe Vegetables Table (with Local Tamil Names & Preparation Guidance)"
                },
                {
                    "type": "Table",
                    "label": "Safe Low-Potassium Vegetables Table",
                    "config": {"rows": kidney_veg_rows}
                }
            ]
        },
        {
            "title": "Renal Nutritional Targets & Guidelines",
            "category": "Plan",
            "components": [
                {
                    "type": "Single Choice",
                    "label": "Protein Prescription Target",
                    "column_count": 3,
                    "options": [
                        "0.6 - 0.8 g/kg/day (Non-dialysis CKD Stage 3-5)",
                        "1.0 - 1.2 g/kg/day (Hemodialysis maintenance)",
                        "Normal protein intake (Early CKD / Microalbuminuria)"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Daily Fluid Intake Limit",
                    "column_count": 3,
                    "options": [
                        "1.0 Liter/day (Strict fluid restriction / Oliguria)",
                        "1.2 - 1.5 Liters/day (Moderate restriction)",
                        "Urine volume + 500 mL/day output-guided",
                        "No restriction (Normal GFR / Polyuria)"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Daily Sodium Limit",
                    "column_count": 3,
                    "options": [
                        "< 1,500 mg/day (< 3g salt/day)",
                        "< 2,000 mg/day (1 level teaspoon salt)",
                        "Strict no added salt"
                    ]
                },
                {
                    "type": "Notes",
                    "label": "Renal Diet Counseling & Follow-up Notes",
                    "placeholder": "Enter laboratory correlations (eGFR, Serum Creatinine, K+, PO4), dietary leaching techniques, and review schedule..."
                }
            ]
        }
    ]

def build_healthy_heart_template():
    orac_rows = [
        [
            {"text": "Herb / Spice", "properties": {"bold": True, "fontSize": 13}},
            {"text": "ORAC Score (µmol TE/100g)", "properties": {"bold": True, "fontSize": 13, "alignment": "center"}},
            {"text": "Cardiovascular Mechanism & Benefit", "properties": {"bold": True, "fontSize": 13}}
        ],
        [{"text": "Clove (கிராம்பு)", "properties": {"bold": True}}, {"text": "314,446", "properties": {"alignment": "center", "bold": True}}, {"text": "Highest antioxidant activity; potent inhibitor of lipid peroxidation and platelet aggregation", "properties": {}}],
        [{"text": "Cinnamon (இலவங்கப்பட்டை)", "properties": {"bold": True}}, {"text": "267,537", "properties": {"alignment": "center", "bold": True}}, {"text": "Enhances insulin sensitivity, lowers circulating triglycerides and LDL cholesterol", "properties": {}}],
        [{"text": "Oregano", "properties": {"bold": True}}, {"text": "159,277", "properties": {"alignment": "center", "bold": True}}, {"text": "Carvacrol protects vascular endothelium from oxidative inflammatory cytokines", "properties": {}}],
        [{"text": "Turmeric (மஞ்சள்)", "properties": {"bold": True}}, {"text": "102,700", "properties": {"alignment": "center", "bold": True}}, {"text": "Curcumin restores endothelial nitric oxide synthase (eNOS) and limits plaque progression", "properties": {}}],
        [{"text": "Cocoa (Dark Chocolate ≥70%)", "properties": {"bold": True}}, {"text": "80,933", "properties": {"alignment": "center", "bold": True}}, {"text": "Rich in flavan-3-ols; improves coronary flow reserve and arterial elasticity", "properties": {}}],
        [{"text": "Cumin (சீரகம்)", "properties": {"bold": True}}, {"text": "76,800", "properties": {"alignment": "center", "bold": True}}, {"text": "Aids metabolic clearance of oxidized LDL and stimulates antioxidant enzymes", "properties": {}}],
        [{"text": "Parsley", "properties": {"bold": True}}, {"text": "74,349", "properties": {"alignment": "center", "bold": True}}, {"text": "High in apigenin and myristicin; natural vascular diuretic and blood pressure support", "properties": {}}],
        [{"text": "Basil (துளசி / Holy Basil)", "properties": {"bold": True}}, {"text": "67,553", "properties": {"alignment": "center", "bold": True}}, {"text": "Adaptogenic polyphenols reduce stress-induced cortisol and vascular vasoconstriction", "properties": {}}],
        [{"text": "Ginger (இஞ்சி)", "properties": {"bold": True}}, {"text": "28,811", "properties": {"alignment": "center", "bold": True}}, {"text": "Gingerols inhibit COX-2 and attenuate vascular atherosclerosis", "properties": {}}],
        [{"text": "Thyme", "properties": {"bold": True}}, {"text": "27,426", "properties": {"alignment": "center", "bold": True}}, {"text": "Thymol provides microvascular protection and protects cell membranes", "properties": {}}],
    ]

    return [
        {
            "title": "Top Antioxidant Herbs & Spices (ORAC Scores Table)",
            "category": "Diet Recommendations",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Oxygen Radical Absorbance Capacity (ORAC) of Cardioprotective Herbs & Spices"
                },
                {
                    "type": "Table",
                    "label": "ORAC Cardiovascular Antioxidants Table",
                    "config": {"rows": orac_rows}
                },
                {
                    "type": "Multi Choice",
                    "label": "Antioxidant Herbs Prescribed for Daily Kitchen Incorporation",
                    "column_count": 3,
                    "options": [
                        "Clove powder in warm water/tea",
                        "Ceylon Cinnamon 1/2 tsp daily",
                        "Turmeric with black pepper (piperine)",
                        "Cumin seed decoction (சீரகத் தண்ணீர்)",
                        "Fresh Ginger with lemon",
                        "Tulsi (Holy Basil) daily infusion"
                    ]
                }
            ]
        },
        {
            "title": "Omega Fatty Acid Heart Protection",
            "category": "Diet Recommendations",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Cardiovascular Morbidity Reduction with Omega-3 Fatty Acids"
                },
                {
                    "type": "Multi Choice",
                    "label": "Clinical Evidence Benefits of Omega-3",
                    "column_count": 3,
                    "options": [
                        "Reduces risk of fatal heart attack by 25%",
                        "Reduces sudden cardiac death (arrhythmia) by 45%",
                        "Lowers serum triglycerides by 20% to 30%",
                        "Anti-inflammatory plaque stabilization effect",
                        "Improves arterial compliance and vasodilation"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Prescribed Omega-3 Source",
                    "column_count": 3,
                    "options": [
                        "Flaxseeds (Ground freshly 1-2 tbsp daily)",
                        "Chia seeds (soaked in water 1 tbsp daily)",
                        "Walnuts (3-4 whole halves daily)",
                        "Fatty Fish (Salmon, Mackerel, Sardines 2x/wk)",
                        "Pharmaceutical Omega-3 Ethyl Esters (EPA/DHA 1000mg)"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Recommended Cooking Oils (Zero Trans-Fat)",
                    "column_count": 3,
                    "options": [
                        "Cold-pressed Mustard Oil (Kadugu ennai)",
                        "Cold-pressed Sesame Oil (Gingelly / Nalla ennai)",
                        "Extra Virgin Olive Oil (Raw on salads/steamed veg)",
                        "Strictly eliminate reused/reheated vegetable oils",
                        "Zero Vanaspati / Margarine / Commercial palm oil"
                    ]
                }
            ]
        },
        {
            "title": "Cardiovascular Diet Prescription & Lifestyle Targets",
            "category": "Plan",
            "components": [
                {
                    "type": "Single Choice",
                    "label": "Daily Sodium Restriction Target",
                    "column_count": 3,
                    "options": [
                        "< 1,500 mg/day (Strict cardiac sodium limit for HTN/CAD)",
                        "< 2,000 mg/day (Standard healthy heart limit)",
                        "Dietary DASH sodium approach"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Daily Soluble Fiber Goal",
                    "column_count": 3,
                    "options": [
                        "≥ 30 g/day (Oats, Fenugreek / வெந்தயம், Psyllium, Legumes)",
                        "25 - 30 g/day (Standard dietary goal)",
                        "Supplemental fiber added"
                    ]
                },
                {
                    "type": "Notes",
                    "label": "Cardiologist Nutritional Counseling Plan",
                    "placeholder": "Enter patient compliance targets, body weight goal, lipid panel review date, and physical exercise coordination..."
                }
            ]
        }
    ]

def build_diabetes_template():
    symptom_scores = ["0 – None", "1 – Mild", "2 – Moderate", "3 – Severe"]

    return [
        {
            "title": "Symptoms Checklist & Scoring",
            "category": "Subjective",
            "components": [
                {
                    "type": "Heading",
                    "label": "Section A: Symptom Checklist (Score 0 = None, 1 = Mild, 2 = Moderate, 3 = Severe)"
                },
                {"type": "Single Choice", "label": "Polyuria (Excessive urination)", "column_count": 3, "options": symptom_scores},
                {"type": "Single Choice", "label": "Polyphagia (Increased hunger)", "column_count": 3, "options": symptom_scores},
                {"type": "Single Choice", "label": "Fatigue / Weakness (Low energy)", "column_count": 3, "options": symptom_scores},
                {"type": "Single Choice", "label": "Polydipsia (Excessive thirst)", "column_count": 3, "options": symptom_scores},
                {"type": "Single Choice", "label": "Mood Changes (Irritability / depression / anxiety)", "column_count": 3, "options": symptom_scores},
                {"type": "Calculated Field", "label": "Total Symptom Score:"},
                {
                    "type": "Interpretation",
                    "label": "Interpretation:",
                    "column_count": 3,
                    "options": [
                        "0–6 → Well Controlled / Minimal Symptoms",
                        "7–15 → Mild to Moderate Symptoms (needs lifestyle & dose adjustment)",
                        ">15 → Poor Symptom Control (urgent therapy review)"
                    ]
                }
            ]
        },
        {
            "title": "History of Present Illness",
            "category": "Subjective",
            "components": [
                {"type": "Single Choice", "label": "Type of Diabetes", "column_count": 4, "options": ["Type 1", "Type 2", "Gestational", "LADA / Others"]},
                {"type": "Text Field", "label": "Duration of Diabetes:", "placeholder": "e.g. 8 years"},
                {"type": "Single Choice", "label": "Diet Compliance", "column_count": 3, "options": ["Excellent", "Good", "Poor"]},
                {"type": "Single Choice", "label": "Physical Activity ≥150 min/wk", "column_count": 2, "options": ["Yes", "No"]},
                {"type": "Single Choice", "label": "Sleep Quality 7–8 hrs", "column_count": 2, "options": ["Yes", "No"]},
                {"type": "Single Choice", "label": "Tobacco / Alcohol Use", "column_count": 3, "options": ["Never", "Current", "Ex-user"]},
                {"type": "Notes", "label": "Additional History:", "placeholder": "Prior hypoglycemic episodes, hospitalizations..."}
            ]
        },
        {
            "title": "Antidiabetic Pharmacotherapy Regimen",
            "category": "Plan",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Pharmacological Regimen & Oral Antidiabetic Drugs (OADs)"
                },
                {
                    "type": "Single Choice",
                    "label": "Metformin Monotherapy",
                    "column_count": 3,
                    "options": [
                        "Low Dose (≤ 1 gm/day - 500mg BD / 850mg OD)",
                        "High Dose (> 1 gm max 2 gm/day - 1000mg BD)",
                        "Not Prescribed / Contraindicated (eGFR < 30)"
                    ]
                },
                {
                    "type": "Multi Choice",
                    "label": "Non-Metformin Monotherapy / Second-Line Agents",
                    "column_count": 3,
                    "options": [
                        "Sulfonylureas (Glimepiride, Gliclazide, Glipizide)",
                        "DPP-4 Inhibitors (Sitagliptin, Vildagliptin, Linagliptin, Teneligliptin)",
                        "SGLT-2 Inhibitors (Dapagliflozin, Empagliflozin, Canagliflozin)",
                        "GLP-1 Receptor Agonists (Semaglutide, Dulaglutide, Liraglutide)",
                        "Thiazolidinediones / TZD (Pioglitazone)",
                        "Alpha-Glucosidase Inhibitors (Voglibose, Acarbose)",
                        "Meglitinides (Repaglinide)"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Dual Therapy Combination",
                    "column_count": 3,
                    "options": [
                        "Metformin + SGLT2 Inhibitor (Cardio-Renal protection)",
                        "Metformin + DPP-4 Inhibitor (Weight neutral, low hypo risk)",
                        "Metformin + Sulfonylurea (Cost effective)",
                        "Metformin + GLP-1 RA (Weight loss & ASCVD benefit)",
                        "Non-Metformin Dual Therapy",
                        "None / Triple Therapy"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Insulin Regimen (if applicable)",
                    "column_count": 3,
                    "options": [
                        "Basal Insulin (Glargine / Degludec at bedtime)",
                        "Premix Insulin (30/70 or 50/50 before breakfast & dinner)",
                        "Basal-Bolus Regimen (Glargine + Aspart/Lispro TID)",
                        "Not on Insulin"
                    ]
                }
            ]
        },
        {
            "title": "Diabetic Foot Examination",
            "category": "Objective",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Diabetic Foot & Neuropathy Evaluation"
                },
                {
                    "type": "Multi Choice",
                    "label": "Foot Inspection Findings",
                    "column_count": 3,
                    "options": [
                        "Normal intact skin bilaterally",
                        "Skin dryness / Fissures / Cracks",
                        "Callus formation (pressure points)",
                        "Active Diabetic Ulcer",
                        "Fungal infection / Tinea pedis",
                        "Structural deformity / Claw toes / Charcot foot"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "10-g Semmes-Weinstein Monofilament Sensation",
                    "column_count": 3,
                    "options": [
                        "Intact bilaterally (10/10 sites felt)",
                        "Reduced sensation (Loss of protective sensation)",
                        "Absent sensation bilaterally"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Peripheral Dorsalis Pedis & Posterior Tibial Pulses",
                    "column_count": 3,
                    "options": [
                        "Palpable & normal bilaterally",
                        "Diminished / Weak bilaterally",
                        "Absent bilaterally (requires Doppler study)"
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Vibration Perception Threshold (VPT Biothesiometry)",
                    "column_count": 4,
                    "options": [
                        "Normal (< 15 Volts)",
                        "Mild neuropathy (15 - 20 Volts)",
                        "Moderate neuropathy (20 - 25 Volts)",
                        "Severe neuropathy (> 25 Volts - High Ulcer Risk)"
                    ]
                }
            ]
        },
        {
            "title": "Physical Examination & Clinical Auscultation",
            "category": "Objective",
            "components": [
                {
                    "type": "Single Choice",
                    "label": "Lungs Auscultation",
                    "column_count": 4,
                    "options": ["Normal Vesicular Breath Sounds", "Bilateral Basal Crepitations", "Expiratory Wheeze / Rhonchi", "Other"]
                },
                {
                    "type": "Single Choice",
                    "label": "Heart Auscultation",
                    "column_count": 4,
                    "options": ["Normal S1 and S2", "Systolic Murmur", "Diastolic Murmur", "S3 / Gallop Present"]
                },
                {
                    "type": "Single Choice",
                    "label": "Current Cardiac Rhythm",
                    "column_count": 3,
                    "options": [
                        "Normal Sinus Rhythm",
                        "Pacemaker Dependent",
                        "LBBB (Left Bundle Branch Block)",
                        "RBBB (Right Bundle Branch Block)",
                        "Atrial Fibrillation",
                        "Other Arrhythmia"
                    ]
                },
                {
                    "type": "Table",
                    "label": "Vitals & Metabolic Laboratory Values",
                    "options": [
                        "Weight: (kg)",
                        "Blood Pressure: (mmHg)",
                        "Fasting Blood Sugar: (mg/dL)",
                        "Post-Prandial Blood Sugar: (mg/dL)",
                        "HbA1c: (%)",
                        "Serum Creatinine: (mg/dL)",
                        "Urine Albumin-to-Creatinine Ratio (UACR): (mg/g)"
                    ]
                }
            ]
        },
        {
            "title": "Assessment & Plan",
            "category": "Assessment",
            "components": [
                {
                    "type": "Single Choice",
                    "label": "Glycaemic Control Status",
                    "column_count": 3,
                    "options": ["Good (HbA1c < 7%)", "Suboptimal (7–8%)", "Poor (> 8%)"]
                },
                {
                    "type": "Notes",
                    "label": "Medication Adjustments & Plan:",
                    "placeholder": "Adjust doses, lifestyle modifications, diabetic educator referral..."
                },
                {
                    "type": "Date",
                    "label": "Next Review Date:"
                }
            ]
        }
    ]

def build_eecp_template(template_name):
    return [
        {
            "title": "History of Present Illness",
            "category": "Subjective",
            "components": [
                {"type": "Centered Heading", "label": "Initial Clinical Assessment"},
                {
                    "type": "Check List",
                    "label": "Chest Pain?",
                    "column_count": 1,
                    "options": [
                        {"option_label": "No"},
                        {
                            "option_label": "Yes",
                            "children": [
                                {
                                    "option_label": "CCS Angina Class",
                                    "children": [
                                        {"option_label": "Class I - Angina with strenuous exertion"},
                                        {"option_label": "Class II - Angina with moderate exertion"},
                                        {"option_label": "Class III - Angina with mild exertion / walking 1-2 blocks"},
                                        {"option_label": "Class IV - Angina at rest"}
                                    ]
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
                                                {"option_label": "Less than 100 meters"}
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "option_label": "Chest Pain Frequency",
                                    "children": [
                                        {"option_label": "Rare (< 1 episode/month)"},
                                        {"option_label": "Weekly (1-3 episodes/week)"},
                                        {"option_label": "Daily (1-2 episodes/day)"},
                                        {"option_label": "Multiple times daily (> 3 episodes/day)"}
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "Table",
                    "label": "Angina Frequency & Medication Log",
                    "options": [
                        "Angina frequency per week (episodes)",
                        "Nitroglycerin / Sorbitrate tablets per week",
                        "Walking time without symptoms (minutes)",
                        "Peak exercise tolerance before angina (METs)"
                    ]
                },
                {
                    "type": "Check List",
                    "label": "Shortness of Breath?",
                    "column_count": 1,
                    "options": [
                        {"option_label": "No"},
                        {
                            "option_label": "Yes",
                            "children": [
                                {
                                    "option_label": "NYHA Functional Class",
                                    "children": [
                                        {"option_label": "Class I - No limitation of physical activity"},
                                        {"option_label": "Class II - Slight limitation; comfortable at rest"},
                                        {"option_label": "Class III - Marked limitation; comfortable only at rest"},
                                        {"option_label": "Class IV - Inability to carry on physical activity; symptoms at rest"}
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "Check List",
                    "label": "Edema of Legs?",
                    "column_count": 1,
                    "options": [
                        {"option_label": "Absent"},
                        {
                            "option_label": "Present",
                            "children": [
                                {"option_label": "Improving"},
                                {"option_label": "Worsening"},
                                {"option_label": "Stable"}
                            ]
                        }
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Trouble breathing while lying flat? (Orthopnea)",
                    "column_count": 2,
                    "options": ["Yes", "No"]
                },
                {
                    "type": "Single Choice",
                    "label": "Waking up with sudden shortness of breath at night? (PND)",
                    "column_count": 2,
                    "options": ["Yes", "No"]
                }
            ]
        },
        {
            "title": "EECP Indications & Candidacy",
            "category": "Subjective",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Primary Indication & Non-Invasive Revascularization Pathway"
                },
                {
                    "type": "Check List",
                    "label": "CABG / PTCA Not Indicated / Refractory Angina",
                    "column_count": 1,
                    "options": [
                        {
                            "option_label": "CABG / PTCA Not Indicated",
                            "is_expandable": True,
                            "children": [
                                {"option_label": "Advanced Age"},
                                {"option_label": "Diffused Distal Disease (Small caliber vessels)"},
                                {"option_label": "Target Lesion Inaccessible / Chronic Total Occlusion (CTO)"},
                                {"option_label": "Cardiac Syndrome X (Microvascular angina)"},
                                {"option_label": "Predominantly Non-Viable Myocardium (Akinetic zone)"},
                                {"option_label": "Only for Quality of Life (Symptom relief)"},
                                {"option_label": "Asymptomatic (Severe ischemia on TMT)"},
                                {"option_label": "Conservative Medical Management Not Tried / Exhausted"}
                            ]
                        },
                        {
                            "option_label": "Co-Morbid Condition Precluding Surgery",
                            "children": [
                                {"option_label": "Severe Renal Dysfunction (Creatinine > 3.0)"},
                                {"option_label": "Severe COPD / Chronic Respiratory Failure"},
                                {"option_label": "Hostile Chest / Previous Multiple Sternotomies"},
                                {"option_label": "Stroke / Advanced Cerebrovascular Disease"}
                            ]
                        },
                        {"option_label": "Secondary EECP (Repeat course for recurrence of symptoms)"},
                        {"option_label": "S/P EECP Maintenance"},
                        {"option_label": "Heart Failure (Ischemic / Idiopathic Dilated Cardiomyopathy LVEF < 35%)"}
                    ]
                }
            ]
        },
        {
            "title": "Contraindications & Oxygen Protocol",
            "category": "Objective",
            "components": [
                {
                    "type": "Centered Heading",
                    "label": "Safety Clearance & Absolute / Relative Contraindication Screening"
                },
                {
                    "type": "Check List",
                    "label": "Absolute Contraindications (Must be ABSENT before starting EECP)",
                    "column_count": 1,
                    "options": [
                        {"option_label": "Aortic Aneurysm (Thoracic or Abdominal)"},
                        {"option_label": "Severe Aortic Regurgitation (Incompetent valve)"},
                        {"option_label": "Severe Uncontrolled Hypertension (BP ≥ 180 / ≥ 120 mmHg)"},
                        {"option_label": "Uncontrolled Rapid Arrhythmia (HR > 120 bpm, AF with RVR)"},
                        {"option_label": "Acute Heart Failure Syndrome / Pulmonary Edema"},
                        {"option_label": "Pregnancy"},
                        {"option_label": "Active Deep Vein Thrombosis (DVT within 3 months)"}
                    ]
                },
                {
                    "type": "Check List",
                    "label": "Relative Contraindications & Precautions",
                    "column_count": 1,
                    "options": [
                        {"option_label": "Bleeding Diathesis / Active Anticoagulation (Target INR < 3.0)"},
                        {"option_label": "Severe Peripheral Artery Disease / Stasis Ulcers"},
                        {"option_label": "Severe Varicose Veins / Venous Ulcers"},
                        {"option_label": "Severe Calcified Femoral Vessels"}
                    ]
                },
                {
                    "type": "Single Choice",
                    "label": "Oxygen Supplementation Protocol",
                    "column_count": 3,
                    "options": [
                        "Complete Oxygen Protocol (Continuous 2-4 L/min via nasal cannula)",
                        "Partial Oxygen Protocol (First 30 mins: keep SpO2 > 97%; Second 30 mins: only if SpO2 < 96%)",
                        "Short Duration Oxygen (PRN during initial pressurization only)",
                        "Room Air (No supplemental oxygen required; SpO2 stable > 98%)"
                    ]
                }
            ]
        },
        {
            "title": "Objective: Hemodynamics & Counterpulsation Parameters",
            "category": "Objective",
            "components": [
                {
                    "type": "Table",
                    "label": "Baseline & Session Hemodynamic Monitoring",
                    "options": [
                        "Pre-Treatment Blood Pressure (mmHg)",
                        "Pre-Treatment Resting Heart Rate (bpm)",
                        "Baseline Oxygen Saturation SpO2 (%)",
                        "Treatment Pressure: Calves (mmHg: 180 - 260)",
                        "Treatment Pressure: Lower Thighs (mmHg: 200 - 280)",
                        "Treatment Pressure: Upper Thighs / Buttocks (mmHg: 220 - 300)",
                        "Peak Diastolic Augmentation Ratio (D/S Ratio): (Target > 1.2)",
                        "Post-Treatment Blood Pressure (mmHg)",
                        "Post-Treatment Heart Rate (bpm)"
                    ]
                },
                {
                    "type": "Check List",
                    "label": "Post-EECP Clinical Assessment & Functional Evolution",
                    "column_count": 1,
                    "options": [
                        {"option_label": "Symptoms improved significantly better than pre-EECP level"},
                        {"option_label": "Symptoms stable / No change during current session"},
                        {"option_label": "Mild increase in the symptoms compared to post-EECP"},
                        {"option_label": "Recurrent symptoms to pre-EECP level"}
                    ]
                }
            ]
        },
        {
            "title": "Treatment Plan & Course Prescription",
            "category": "Plan",
            "components": [
                {
                    "type": "Number Field",
                    "label": "Sessions Prescribed (1 Hour each):",
                    "default_value": "35"
                },
                {
                    "type": "Single Choice",
                    "label": "Treatment Frequency:",
                    "column_count": 3,
                    "options": ["1 Session Daily (5-6 days/week)", "2 Sessions Daily (with 1 hr rest interval)", "Maintenance (2-3 sessions/week)"]
                },
                {
                    "type": "Date",
                    "label": "Planned Course Start Date:"
                },
                {
                    "type": "Notes",
                    "label": "Physician Instructions & Follow-up Goals:",
                    "default_value": "Complete 35 hours course of EECP therapy. Monitor daily D/S ratio, BP, and nitroglycerin consumption. Advise walking after session as tolerated."
                }
            ]
        }
    ]

def seed_all():
    db_paths = ['backend/data/ehr.db', 'backend/seed_data/ehr_master.db']
    for p in db_paths:
        if os.path.exists(p):
            print(f"\n================ Processing Database: {p} ================")
            conn = sqlite3.connect(p)
            setup_flags(conn)

            print("Writing rich template contents...")
            write_template_content(conn, "Diet for Thyroid Problem_Practice", "Diet Recommendations", "Thyroid", build_thyroid_template())
            write_template_content(conn, "Diet for Kidney Disease_Practice", "Diet Recommendations", "Kidney / Urinary", build_kidney_template())
            write_template_content(conn, "Diet for Healthy Heart/Healthy Life_Practice", "Diet Recommendations", "Cardiac", build_healthy_heart_template())
            write_template_content(conn, "Diet for Healthy Heart_Practice", "Diet Recommendations", "Cardiac", build_healthy_heart_template())
            write_template_content(conn, "Diabetes Management Template_Practice", "SOAP", "Diabetes", build_diabetes_template())
            write_template_content(conn, "HUH EECP SOAP_Practice", "SOAP", "EECP", build_eecp_template("HUH EECP SOAP_Practice"))
            write_template_content(conn, "Vaso-Meditech EECP SOAP_Practice", "SOAP", "EECP", build_eecp_template("Vaso-Meditech EECP SOAP_Practice"))
            
            conn.close()
            print(f"Done with {p}.")

if __name__ == '__main__':
    seed_all()
