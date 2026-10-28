# Reference: Form and Field Catalog

## 1. Patient Registration & Intake Form
- **Modal Title**: `Add Patient`
- **Fields**:
  - `First Name` (Text, Required, e.g. "Issac")
  - `Last Name` (Text, Required, e.g. "G")
  - `Date of Birth` (Date, Required, e.g. "2000-03-04")
  - `Sex` (Select: Male, Female, Other, Required)
  - `Mobile Phone` (Tel/Text, Required, 10 digits)
  - `Email` (Email, Optional)
  - `Address Line 1` (Text, Optional)
  - `Area / Locality` (Text, Optional)
  - `City` (Text, Optional)
  - `State / Province` (Text, Optional, e.g. "Tamil Nadu")
  - `Postal Code` (Text, Optional, e.g. "600097")
  - `Facilities` (Checkbox group / Multi-select: Neelankarai, Royapettah, Manapakkam)
- **Buttons**: `Register & Open Chart` (Primary), `Cancel`.

---

## 2. Appointment Booking Form
- **Modal Title**: `Book an appointment` / `Schedule EECP sessions`
- **Fields**:
  - `Patient` (Search & Select, Required)
  - `Provider / Therapist` (Select, Required, e.g. "Dr. Ramasamy S", "Dr. Elakkiya M")
  - `Facility` (Select, Required, e.g. "Heal Your Heart Neelankarai - HUH001")
  - `Start Date & Time` (Datetime-local, Required, e.g. `2026-10-27T09:00`)
  - `Duration · minutes` (Number, Default: 30 for consultation, 60 for EECP)
  - `Visit Type` (Select: "New consultation", "Follow-up", "EECP Daily Session")
  - `Appointment Mode` (Select: "In person", "Video / TeleHealth", "Phone")
  - `Resource / Bed` (Select, Optional: "Bed 1", "Bed 2", "Consultation Room 1")
  - `Number of appointments` (Number, 1 for single, up to 35 for EECP package)
  - `Repeat every · days` (Number, Default: 1)
  - `Skip Sundays` (Checkbox, Default: Checked)
  - `Reason / Scheduling note` (Textarea, Optional)
- **Buttons**: `Confirm booking` (Primary), `Cancel`.

---

## 3. Clinical SOAP Encounter Form (Three-Pane Encounter)
- **Encounter Meta Header**:
  - `Provider`: Clickable selector (`Dr. Ramasamy S`)
  - `Date`: Date picker (`Sep 28, 2026`)
  - `Facility`: Branch selector (`Heal Your Heart Neelankarai`)
  - `Visit Type`: Type selector (`Follow-up Visit`)
  - `Status`: Appointment status (`Checked in`)
- **Subjective (S)**:
  - `Chief Complaints` (Textarea with template insert support)
  - `Symptoms` (Post-EECP Checklist: Benefits maintained, Mild symptom increase, Symptoms improved, MACE)
  - `HPI`:
    - `Chest Pain`: Yes/No, CCS Class (I, II, III, IV), Exertional trigger
    - `Chest Pain Frequency per Week` (Number / Text)
    - `Nitroglycerin per Week` (Number / Text)
    - `Walking Time without Symptoms` (Minutes)
  - `Past Medical History (PMH)`:
    - CAD Diagnosis Duration (Years/Months)
    - PTCA Duration (Years/Months)
    - CABG Duration (Years/Months)
    - Myocardial Infarction Duration (Years/Months)
    - Diabetes (Type 1 / Type 2, Years)
    - Hypertension (Years)
    - Hyperlipidemia (Years)
  - `Review of Systems (ROS)`: General, GI, EECP Indications & Contraindications
- **Objective (O)**:
  - `Vitals`: Systolic BP, Diastolic BP, Heart Rate, Respiratory Rate, SpO2 (%), Temperature (°F/°C), Weight (kg), Height (cm), BMI (auto-calculated)
  - `Physical Examination`: General appearance, Cardiovascular exam (S1/S2, murmurs), Respiratory exam, Pedal edema check
- **Assessment (A)**:
  - `Assessment Notes`: Clinical synthesis of cardiac status and response to medical/EECP therapy
  - `Active Diagnoses`: ICD-10 selection (e.g. `I20.9` Angina pectoris, `I25.10` Atherosclerotic heart disease)
- **Plan (P)**:
  - `Prescriptions (Rx)`: Drug Name, Dosage form, Strength, Frequency (e.g. `0 - 1 - 0 - 0`), Duration, Dispense quantity, Dispense as Written toggle
  - `Lab Orders`: Selected diagnostic panels (Lipid Profile, Cardiac Biomarkers)
  - `Treatment Plan`: EECP counter-pulsation protocol recommendations
  - `Diet & Lifestyle`: Low sodium, low fat, supervised aerobic exercise
  - `Follow-up`: Return in X weeks/months
- **Actions**: `Save Draft`, `Preview Chart`, `Sign & Finalize`, `Amend`.

---

## 4. Invoice & Billing Form
- **Fields**:
  - `Patient` (Auto-filled or select)
  - `Encounter / Appointment Link` (Optional association)
  - `Invoice Date` (Date)
  - `Payment Terms` (Due on receipt, Net 15, Net 30)
  - `Line Items Table`:
    - Service / Procedure Code (e.g. `CPT 99214`, `EECP-35-PKG`)
    - Description
    - Unit Price (Tariff)
    - Quantity
    - Discount (%)
    - Tax Rate (GST / VAT %)
    - Total Amount
  - `Notes / Terms & Conditions` (Textarea)
- **Buttons**: `Save Invoice`, `Print / Download`, `Send to Patient`.

---

## 5. Payment Receipt Form
- **Fields**:
  - `Invoice Selection` (Select pending invoice)
  - `Payment Date` (Date)
  - `Amount Received` (Currency amount)
  - `Payment Method` (Cash, UPI / QR, Credit Card, Debit Card, Net Banking, Razorpay)
  - `Transaction Reference #` (Bank/UPI ref ID)
  - `Receipt Notes` (Optional remark)
- **Buttons**: `Record Payment`, `Print Receipt Voucher`.

---

## 6. Inventory Item Form
- **Fields**:
  - `Product Name` (Text, Required, e.g. "10 ML SYRINGE (DISPO VAN)")
  - `Product Code / SKU` (Text)
  - `Category` (Select: Consumables, Drugs, Syringes, IV Fluids, Supplements, Emergency)
  - `Unit of Measure` (Each, Box, Vial, Ampoule)
  - `Latest Purchase Price` (Currency)
  - `Latest Retail Price` (Currency)
  - `Current Stock Quantity` (Number)
  - `Reorder Threshold Level` (Number)
  - `Supplier` (Select from Supplier catalog)
- **Buttons**: `Save Product`, `Cancel`.
