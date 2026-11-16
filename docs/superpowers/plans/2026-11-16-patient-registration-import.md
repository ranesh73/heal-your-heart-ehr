# Patient Registration & Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CharmHealth EHR parity for patient registration (full-screen 3-column view) and patient import workflow (CSV modal, template download, validation, duplicate check, ingestion, inactive toggle).

**Architecture:** Frontend dedicated full-screen view (`AddPatientView`) and modal (`ImportPatientsModal`) integrated into `PatientsPage`. Backend FastAPI endpoints for CSV template download, CSV parsing/ingestion with duplicate handling, and active/inactive patient listing filter.

**Tech Stack:** React 19, TypeScript, Vite, FastAPI, SQLAlchemy, SQLite/PostgreSQL, Playwright for verification.

**Spec:** `docs/superpowers/specs/2026-11-16-patient-registration-import-design.md`

## Global Constraints
- Do not introduce a new database or fallback SQLite file.
- Do not make destructive schema migrations.
- Keep all changes strictly scoped to the Patients module.
- `npm run build` (`tsc -b && vite build`) must pass with 0 errors.

## Review Focus
1. CSV import with missing required columns: Must return clear 400/422 validation errors without crashing.
2. CSV import with duplicate patients: Must detect duplicates by MRN, email, or phone and skip/report them safely.
3. Registration form date vs age toggle: When DOB is selected, parses date `dd/mm/yyyy`; when Age is selected, computes estimated DOB.
4. Active vs Inactive patient listing: Toggling between Active and Inactive updates page title and loads correct records.
5. Navigation after Add vs Add and Open: `Add` returns to list; `Add and Open` navigates to `/patients/{id}`.

---

### Task 1: Backend Patient Import & Filter Endpoints
**Files:**
- Modify: `backend/app/patients.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/test_patient_import.py`

- [ ] Step 1.1: Write backend tests for CSV template download, CSV import endpoint, and active/inactive patient filtering.
- [ ] Step 1.2: Run tests to confirm failure.
- [ ] Step 1.3: Update `backend/app/patients.py` with:
  - `GET /api/patients` with `active: bool | None = None`
  - `GET /api/patients/import/template`
  - `POST /api/patients/import` (CSV parsing, duplicate detection, patient & facility creation)
- [ ] Step 1.4: Run tests and verify they pass.

---

### Task 2: Frontend Add Patient View (3-Column Layout)
**Files:**
- Create: `frontend/src/patientRegistration.tsx`
- Modify: `frontend/src/styles.css`

- [ ] Step 2.1: Implement `AddPatientView` component with:
  - Header with title `Add Patient` and buttons `Add`, `Add and Open`, `Cancel`.
  - Column 1: Demographics, Avatar circle with camera badge, `First Name *` (purple badge), `Last Name *` (purple badge), `[ DOB | Age ] *` toggle, `Sex *`, `Pronouns`, `Facilities` multi-select checkbox list, `Patient IDs` dynamic rows with upload link and `More` link.
  - Column 2: Address Lines 1 & 2, Area, City, District, State, Country, Postal Code, Mobile Phone (`P` badge), Home Phone (`P` badge), `Email *`, Emergency Contact details, Patient Preferences (Communication channel, Notification radios).
  - Column 3: PHR Registration radios, Additional Info (Category, Outstation, NRI, Foreign Citizen, Insurance, Insurance Status, Blood Group), Referral Source (Source, Specific Source).
- [ ] Step 2.2: Add authentic CharmHealth styling in `frontend/src/styles.css`.
- [ ] Step 2.3: Typecheck with `npm run build`.

---

### Task 3: Frontend Patient Import Modal & QRDA I File Picker
**Files:**
- Create: `frontend/src/patientImport.tsx`
- Modify: `frontend/src/styles.css`

- [ ] Step 3.1: Implement `ImportPatientsModal` component matching frame 19:
  - Title `Import Patients` with `✕` close button.
  - Info notice with required columns list and `*You can only import a maximum of 500 patients.`
  - Download Sample CSV Template link invoking `GET /api/patients/import/template`.
  - File input `Select a csv file:` [ Choose File ].
  - Import action invoking `POST /api/patients/import` and showing progress, summary (imported, skipped, errors).
- [ ] Step 3.2: Typecheck with `npm run build`.

---

### Task 4: Integrate into PatientsPage & More Actions Dropdown
**Files:**
- Modify: `frontend/src/patients.tsx`

- [ ] Step 4.1: Update `PatientsPage` header:
  - Orange `+ Patient` button.
  - `⋮` (More Actions) button with popup dropdown (`Import Patients`, `Import Patients in QRDA I Format`, divider, `Show Inactive Patients` / `Show Active Patients`).
  - Wire QRDA I file picker.
  - Wire switching between `list` view and `AddPatientView`.
  - Wire `ImportPatientsModal`.
  - Wire active/inactive state and dynamic title.
- [ ] Step 4.2: Typecheck with `npm run build`.

---

### Task 5: End-to-End Verification with Playwright
**Files:**
- Create: `frontend/scripts/verify_patient_workflow.mjs`

- [ ] Step 5.1: Write Playwright test verifying:
  - Patients page header buttons and More Actions menu.
  - Opening Add Patient full-screen view.
  - Submitting new patient with `Add` and checking list.
  - Submitting new patient with `Add and Open` and checking chart redirect.
  - Opening Import modal, downloading CSV template, uploading test CSV, verifying import.
  - Toggling Show Inactive Patients and verifying title / list.
- [ ] Step 5.2: Run test and capture screenshots.
- [ ] Step 5.3: Ensure zero build errors and clean state.
