# Design Specification: Patient Registration & Import Workflow (CharmHealth Parity)

**Date**: 2026-11-16  
**Status**: Approved  
**Author**: Antigravity  

---

## 1. Objectives & Scope
Reverse-engineer and implement full functional parity with CharmHealth EHR's Patients module as observed in `Screen Recording 2026-11-16 122628.mp4`.

### Scope
1. **Patients Page Header & Action Controls**:
   - Orange primary button `+ Patient` (`#f59e0b` / `#ea580c`).
   - Adjacent `⋮` button with tooltip `"More Actions"`.
   - Dropdown menu options:
     - `Import Patients`
     - `Import Patients in QRDA I Format`
     - Divider line
     - `Show Inactive Patients` / `Show Active Patients` (dynamic based on current filter).
2. **Full-Screen "Add Patient" View**:
   - Switches workspace view seamlessly without modal scrolling clipping.
   - Top action bar: Title `Add Patient` on left; Buttons `Add` (orange primary), `Add and Open` (secondary), `Cancel` (secondary) on right.
   - Column 1: Demographics, Avatar circle with turquoise camera badge, `First Name *` (purple badge), `Last Name *` (purple badge), `[ DOB | Age ] *` toggle pill, `Sex *` dropdown, `Pronouns` dropdown, Facilities multi-select checkbox list, `Patient IDs` dynamic list with upload link.
   - Column 2: Address Line 1 & 2, Area, City (search placeholder), District, State, Country (default India), Postal Code, Mobile Phone (`P` badge), Home Phone (`P` badge), `Email *`, Emergency Contact (Name, Phone), Patient Preferences (Communication channel, Email/Text notification radios).
   - Column 3: PHR Registration radios (`To Patient`, `To Patient Representative`, `Not Required`), Additional Info (Category, Outstation, NRI, Foreign Citizen, Insurance, Insurance Status, Blood Group dropdown), Referral Source (Source dropdown, Specific Source dropdown).
3. **CSV Patient Import Workflow**:
   - 1:1 replica of CharmHealth frame 19 modal.
   - Format notice with info icon:
     `Patient Record ID, First Name, Last Name, Gender, Date Of Birth(mm/dd/yyyy), Email, Home Phone, Mobile Phone, Work Phone, AddressLine1, AddressLine2, City, Country, State, Zip Code, Caregiver First Name, Caregiver Last Name.`
   - Maximum 500 patients notice.
   - Download Sample CSV Template link.
   - File picker with validation preview and batch import.
4. **QRDA I Import Option**:
   - Accepts `.xml` or `.zip` file for Quality Reporting Document Architecture Category I.
5. **Active / Inactive Patient Switching**:
   - Dynamic page heading (`Patients` vs `Inactive Patients`).
   - Backend query filter supporting active/inactive patient lists.

---

## 2. Architecture & Contracts

### Backend Services (`backend/app/patients.py` & `backend/app/schemas.py`)
- **`GET /api/patients`**:
  - Add `active: bool | None = True` parameter. When `active=False`, returns only inactive patients (`m.Patient.active == False`). When `active=True`, returns only active patients (`m.Patient.active == True`).
- **`GET /api/patients/import/template`**:
  - Returns `text/csv` stream with headers and sample records matching CharmHealth specification.
- **`POST /api/patients/import`**:
  - Form data / file upload accepting `.csv`.
  - Parses headers: `Patient Record ID`, `First Name`, `Last Name`, `Gender`, `Date Of Birth`, `Email`, `Home Phone`, `Mobile Phone`, `Work Phone`, `AddressLine1`, `AddressLine2`, `City`, `Country`, `State`, `Zip Code`, `Caregiver First Name`, `Caregiver Last Name`.
  - Validates required fields: Record ID, First Name, Last Name, Gender, DOB.
  - Checks for duplicate MRN/phone/email. If duplicate found and override not provided, reports conflict; otherwise links or imports cleanly.
  - Generates `Patient` row and binds `PatientFacility` to the current branch (`c.facility_id`).
  - Returns JSON summary: `{ "imported": N, "skipped": N, "errors": [...], "records": [...] }`.
- **Database Safety**:
  - Preserves existing schema and SQLite/PostgreSQL tables. No destructive alterations.

### Frontend (`frontend/src/patients.tsx`, `frontend/src/forms.tsx`, `frontend/src/styles.css`)
- **State Management in `PatientsPage`**:
  - `viewMode: 'list' | 'add'`
  - `showInactive: boolean`
  - `importOpen: boolean`
  - `moreMenuOpen: boolean`
- **Component Decomposition**:
  - `AddPatientView`: Full 3-column form with form validation, `Add` (saves & returns), `Add and Open` (saves & navigates to chart), `Cancel` (returns).
  - `ImportPatientsModal`: Modal matching frame 19 with CSV upload, template download, preview table, error display.
  - `PatientsTable`: Updated table supporting active/inactive listings with status indicator.

---

## 3. Verification & Acceptance Criteria
1. Frontend compiles cleanly: `npm run build` succeeds with zero errors.
2. Playwright automation tests:
   - Header shows orange `+ Patient` and `⋮` button.
   - Clicking `⋮` opens menu with `Import Patients`, `Import Patients in QRDA I Format`, `Show Inactive Patients`.
   - Clicking `+ Patient` renders the full 3-column `Add Patient` view with all required fields and buttons.
   - Filling form and clicking `Add` creates patient and updates directory list.
   - Clicking `Add and Open` creates patient and navigates to chart.
   - Clicking `Cancel` returns to directory list.
   - Opening `Import Patients` modal, downloading sample CSV template, uploading CSV file, importing records, and verifying records appear in directory list.
   - Toggling `Show Inactive Patients` switches title to `Inactive Patients` and toggles menu label to `Show Active Patients`.
