# Reference: Patient Chart & Clinical Encounter Architecture

## 1. Patient Chart Overview
The patient chart in CharmHealth operates as a unified clinical workstation centered around a patient's electronic health record. The test patient examined is:
- **Patient**: `Issac G`
- **Record ID (RID)**: `4R 0017`
- **Demographics**: `Male / 26 years (DOB: Mar 04, 2000)`
- **Phone**: `908-064-7648`
- **Email**: `issacrobinson2024@gmail.com`

---

## 2. Patient Header Banner & Quick Action Toolbar

### Header Strip Data Elements
- **Photo**: Patient profile picture thumbnail.
- **Identity**: Full Name (`Issac G`), Record ID (`[ 4R 0017 ]`), Sex & Age (`Male / 26`), DOB (`Mar 04, 2000`), Primary Phone (`908-064-7648`).
- **Clinical Snapshot Badges**:
  - `Allergies`: Real-time pill (e.g. `No Food/Env/Latex Allergies`).
  - `Visits`: `Last: Oct 01, 2026`, `Next: --`.
  - `Vitals`: `Wt: --`, `Ht: --`, `BMI: --`.
  - `Financial Balance`: `Patient: Rs.0.00`, `Insurance: Rs.0.00` (with "Show Details" trigger).
- **Actions Menu**: `+ Add` dropdown and `More Actions` dropdown.

### Quick Action Bar (Top of Chart)
- `Dashboard` (Primary view)
- `+ Consultation` (Launches Three-Pane encounter editor)
- `+ Quick Rx` (Rapid prescription modal)
- `+ Appointment` (Opens scheduling modal)
- `+ Task` (Assigns to-do associated with patient)
- `+ Message` (Composes internal or portal message)
- `+ Sticky` (Adds clinical sticky note)
- `+ Quick Note` (Inserts unstructured clinical memo)
- `+ Invoice` (Generates immediate fee invoice)

---

## 3. The 22 Patient Chart Navigation Sections

| # | Section Name | Key Sub-Tabs & Actions | Clinical Purpose |
| :- | :--- | :--- | :--- |
| 1 | **Dashboard** | `Face Sheet`, `Flowsheet`, `Treatment Plan`, `Health Screening`, `Timeline`, `Tag Cloud` | Comprehensive medical summary, vitals trends, EECP plan progress |
| 2 | **Patient Details** | `Demographics`, `Care Team`, `Medical History`, `Questionnaires`, `Edit Patient` | Registration info, contact details, emergency contacts, clinic branches |
| 3 | **Consultations** | `Last Visit`, `Unsigned (2)`, `To be Co-Signed`, `Past 6 Months`, `Past 1 Year`, `All`, `Past Reports` | Longitudinal encounter records, SOAP notes, chart sign/amend |
| 4 | **Diagnoses** | `Active Diagnoses`, `+ Diagnoses`, `Templates`, `Reconcile` | Problem list with ICD-10 codes, onset dates, status |
| 5 | **Medications** | `Medications`, `Supplements`, `+ Medication`, `Reconcile` | Active prescription orders, dosage, frequency, dispense instructions |
| 6 | **Allergies** | Drug, food, environmental, and latex allergy profiles (NKDA, NKFA, etc.) | Patient safety alerts and severe reaction histories |
| 7 | **Vitals** | Tabular and graphical logs of BP, HR, SpO2, Temperature, Height, Weight, BMI | Serial monitoring during visits and EECP sessions |
| 8 | **Injections** | Administered injections, dosages, lot numbers, anatomical sites | In-clinic medication delivery |
| 9 | **Vaccines** | Immunization history, scheduled vaccines, VIS disclosures | Preventive care records |
| 10 | **Lab Records** | Laboratory orders, received diagnostic reports, flagged abnormals | Blood work, lipid profiles, cardiac biomarkers |
| 11 | **Images** | Radiology orders, scan reports, ECGs, echocardiogram records | Cardiology diagnostic imaging |
| 12 | **Documents** | Uploaded documents, ID copies, signed patient consent forms | Non-structured file repository |
| 13 | **Referrals** | Inbound and outbound specialist consultations | Multi-provider coordination |
| 14 | **Appointments** | Past and upcoming bookings, visit types, status (Checked In, Arrived, etc.) | Patient schedule tracking |
| 15 | **Messages** | Clinical communications, patient portal threads, SMS logs | Patient & provider dialogue |
| 16 | **Chat History** | Instant chat transcripts between staff regarding patient care | Internal team coordination |
| 17 | **Tasks** | Patient-linked to-dos, follow-ups, test review reminders | Clinical task tracking |
| 18 | **Recalls** | Periodic re-examination alerts (e.g. 6-month post-EECP cardiac checkup) | Retention & follow-up care |
| 19 | **Alerts** | Clinical warning banners (e.g. high fall risk, severe CAD, pacemaker) | Critical safety notices |
| 20 | **Billing** | Invoices, receipts, packages (e.g. 35-session EECP package), balances | Financial transaction ledger |
| 21 | **Quick Notes** | Informal clinical remarks, administrative phone memos | Informal logging |
| 22 | **Amendments** | Addendums and audit adjustments made to finalized charts | Medicolegal compliance |

---

## 4. The Three-Pane Encounter Architecture (`threePaneEncounter.do`)

The core clinical charting interface in CharmHealth is a tripartite layout:

```
+--------------------------+------------------------------+---------------------------------------+
|        LEFT PANE         |         MIDDLE PANE          |              RIGHT PANE               |
|       (Width 300px)      |        (Width 308px)         |             (Width 416px)             |
|                          |                              |                                       |
| - Patient Summary Card   | - Quick Sub-tabs:            | - Encounter Meta Header:              |
|   (Photo, Wt, Ht, BMI,   |   [Chart Notes] [Flowsheet]  |   Provider: Dr. Ramasamy S [Change]   |
|    Last/Next Visit, RID) |   [Treatment Plan] [Labs]    |   Date: Sep 28, 2026 [Calendar]       |
|                          |   [Images] [Documents]       |   Facility: Neelankarai [Change]      |
| - Collapsible Accordions:|   [Questionnaires]           |   Visit Type: Follow-up [Change]      |
|   * Alerts (+)           |                              |   Status: Checked in [Change]         |
|   * Sticky Notes (+)     | - Historical Note Viewer:    |                                       |
|   * Allergies (+)        |   Reads prior signed note    | - SOAP Jump Bar (Left Edge):          |
|     (NKDA, NKFA, etc.)   |   (Subjective, Objective,    |   [S] CC, SYM, HPI, PMH, ROS          |
|   * Medications (+)      |    Assessment, Plan)         |   [O] V/S, PE                         |
|   * Diagnoses (+)        |                              |   [A] AN                              |
|   * Supplements (+)      | - "Repeat Chart Note" Action |   [P] RX, LAB, IMG, DR, LR, TN, F/U   |
|   * Medical History      |   Copies relevant items into |                                       |
|   * Surgical History     |   active chart note          | - Active SOAP Editor:                 |
|     (CAG, PTCA, CABG)    |                              |   * Chief Complaints input            |
|   * Social History       |                              |   * Cardiology / EECP Templates:      |
|     (Smoking, Alcohol)   |                              |     - Post-EECP Assessment checkboxes |
|   * Procedures           |                              |     - Chest pain frequency            |
|   * Tasks / Recalls      |                              |     - Nitroglycerin frequency         |
|                          |                              |     - Walking time without symptoms   |
| [Customize] [Collapse]   | [Expand Middle Layout]       | [Save] [Preview] [Close]              |
+--------------------------+------------------------------+---------------------------------------+
```

---

## 5. Visual Artifacts Captured
- Patient Chart Dashboard: `reference/screenshots/patients/charmhealth_patient_chart_dashboard.png`
- Patient Timeline: `reference/screenshots/patients/charmhealth_patient_timeline.png`
- Patient Details: `reference/screenshots/patients/charmhealth_patient_details.png`
- Consultations Directory: `reference/screenshots/consultations/charmhealth_consultations_list.png`
- Three-Pane Encounter: `reference/screenshots/consultations/charmhealth_three_pane_encounter.png`
- Patient Diagnoses: `reference/screenshots/patients/charmhealth_patient_diagnoses.png`
- Patient Medications: `reference/screenshots/patients/charmhealth_patient_medications.png`
- Patient Vitals: `reference/screenshots/patients/charmhealth_patient_vitals.png`
- Patient Appointments: `reference/screenshots/patients/charmhealth_patient_appointments.png`
- Patient Billing: `reference/screenshots/billing/charmhealth_patient_billing.png`
