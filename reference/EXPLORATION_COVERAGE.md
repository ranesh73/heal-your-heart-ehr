# Reference: Exploration Coverage Matrix

## 1. Executive Summary & Verification Metrics
A comprehensive, live exploration of the CharmHealth EHR portal was conducted via Playwright MCP. Starting from the central authentication gateway, through facility selection, into the home application launcher, all global modules, the complete 22-section patient chart for test patient `Issac G`, the Three-Pane Encounter interface, and all 25 settings categories were mapped and documented.

---

## 2. Quantitative Coverage Counts

| Domain | Discovered | Inspected | Status |
| :--- | :---: | :---: | :--- |
| **Authentication & Session Flows** | 3 | 3 | **100% Fully Inspected** |
| **Global Application Launcher Modules** | 14 | 14 | **100% Fully Inspected** |
| **Patient Chart Navigation Sections** | 22 | 22 | **100% Fully Inspected** |
| **Three-Pane Encounter Panes & Subsystems**| 3 | 3 | **100% Fully Inspected** |
| **Settings System Categories** | 25 | 25 | **100% Fully Inspected** |
| **Sanitized Screenshots Captured** | 20 | 20 | **100% Verified** |

---

## 3. Detailed Hierarchical Coverage Matrix

### 3.1 Authentication & Global Shell
- [x] **Login Gateway**: User/Phone input, password visibility toggle, forgot password link, validation (`Fully Inspected`)
- [x] **Facility Selection**: Multi-facility list (Neelankarai, Royapettah, Manapakkam, etc.) (`Fully Inspected`)
- [x] **Global Header**: Logo, Patient search with live autocomplete, TeleHealth pill, Branch switcher, Notifications, Settings, Profile avatar (`Fully Inspected`)
- [x] **User Profile Menu**: Name, role ("Charm Assistant, PA"), user ID, email, Lock, Sign Out (`Fully Inspected`)
- [x] **Collaboration Quick Bar**: Pins, Chats, Channels, Threads, People (`Fully Inspected`)
- [x] **Telephony Widget**: Dialpad layout, keypad 0-9, country code selector (`Fully Inspected`)

### 3.2 Global Modules (14/14)
- [x] **Patients**: Directory table, search, filters, `+ Patient` modal trigger (`Fully Inspected`)
- [x] **Calendar**: Day/Week/Month/Resource views, waiting list, appointment requests, reports, provider availability drawer (`Fully Inspected`)
- [x] **Chart Notes**: Global consultation ledger, Unsigned/Signed/Co-signed filters, provider selector (`Fully Inspected`)
- [x] **Labs**: Diagnostic results review, orders, electronic integrations (`Fully Inspected`)
- [x] **Images**: Radiology orders, scan reports, image attachments (`Fully Inspected`)
- [x] **Documents**: Document inbox, patient categorization, upload interface (`Fully Inspected`)
- [x] **Injections**: Injectable administration ledger, dosage, lot tracking (`Fully Inspected`)
- [x] **Referrals**: Inbound and outbound specialist referrals (`Fully Inspected`)
- [x] **Messages**: Multi-folder clinical messaging client (`Fully Inspected`)
- [x] **Channels**: Team communication channels (`Fully Inspected`)
- [x] **Tasks**: Task manager, patient associations, status filters (`Fully Inspected`)
- [x] **Billing**: Revenue dashboard, Invoices list, Receipts list (`Fully Inspected`)
- [x] **Inventory**: Product catalog, stock quantities, suppliers, categories, reorder reports (`Fully Inspected`)
- [x] **Analytics**: Default reports and custom ad-hoc report generator (`Fully Inspected`)

### 3.3 Patient Chart Sections (22/22) for `Issac G` (RID: 4R 0017)
- [x] **Dashboard**: Face Sheet, Flowsheet, Treatment Plan, Health Screening, Timeline, Tag Cloud (`Fully Inspected`)
- [x] **Patient Details**: Demographics, Care Team, Medical History, Questionnaires, Edit Patient form (`Fully Inspected`)
- [x] **Consultations**: Encounter history, signed and unsigned lists, "Edit Chart" and "Delete" actions (`Fully Inspected`)
- [x] **Three-Pane Encounter (`threePaneEncounter.do`)**:
  - *Left Pane*: Patient card, Allergies (NKDA/NKFA/NKEA/NKLA), Meds, Diagnoses, Surgical history (CAG, PTCA, CABG), Social history (`Fully Inspected`)
  - *Middle Pane*: Prior encounter reader, quick tabs, "Repeat Chart Note" action (`Fully Inspected`)
  - *Right Pane*: SOAP Note editor, Encounter meta (Provider, Date, Branch, Visit Type, Status), SOAP quick-jump rail (S/O/A/P), Cardiology/EECP templates (`Fully Inspected`)
- [x] **Diagnoses**: Active problem list, ICD-10 codes, onset dates, Reconcile action (`Fully Inspected`)
- [x] **Medications**: Active Rx orders, dosage/frequency, Dispense as Written, Reconcile action (`Fully Inspected`)
- [x] **Allergies**: Drug, food, environmental allergy records (`Fully Inspected`)
- [x] **Vitals**: Serial vital signs table and graph viewer (`Fully Inspected`)
- [x] **Injections**: Patient-specific injection logs (`Fully Inspected`)
- [x] **Vaccines**: Immunization records and vaccine chart (`Fully Inspected`)
- [x] **Lab Records**: Diagnostic results, ordering provider (`Fully Inspected`)
- [x] **Images**: Scan attachments and imaging reports (`Fully Inspected`)
- [x] **Documents**: Patient-linked files, ID cards, signed consents (`Fully Inspected`)
- [x] **Referrals**: Referring physician records (`Fully Inspected`)
- [x] **Appointments**: Schedule history and upcoming bookings (`Fully Inspected`)
- [x] **Messages**: Patient portal message history (`Fully Inspected`)
- [x] **Chat History**: Internal clinical coordination chats (`Fully Inspected`)
- [x] **Tasks**: Patient-specific to-dos and follow-up reminders (`Fully Inspected`)
- [x] **Recalls**: Periodic cardiac re-examination alerts (`Fully Inspected`)
- [x] **Alerts**: Clinical warning flags (`Fully Inspected`)
- [x] **Billing**: Patient financial ledger, invoices, receipts (`Fully Inspected`)
- [x] **Quick Notes**: Unstructured clinical notes (`Fully Inspected`)
- [x] **Amendments**: Signed chart addendums and audit trails (`Fully Inspected`)

### 3.4 Settings System (25/25)
- [x] **Facility**: Facility List, Facility Members, Facility Resources, Kiosk Setup, Notifications, Departments, Roles (`Fully Inspected`)
- [x] **Calendar**: Facility Timings, Provider Timings, Online Appointments, Web Embed, Appointment Fields, Statuses, Visit Types, Event Types, Bot, Schedule Rules, Google Cal, Preferences (`Fully Inspected`)
- [x] **Patient**: Text/Voice, Email, WhatsApp, Registration, Demographics, Referral Sources, Categories, Alerts, Announcements, Preferences (`Fully Inspected`)
- [x] **Templates**: My Templates, Practice Templates, Email Templates, Charm Library (`Fully Inspected`)
- [x] **Questionnaires**: Practice Questionnaires, Charm Library, Preferences (`Fully Inspected`)
- [x] **Documents**: My Documents, Practice Documents, Library, Categories (`Fully Inspected`)
- [x] **Consultation**: DSI, Vitals, Family History, CCDA View, Visit Summary, Signature, Preferences (`Fully Inspected`)
- [x] **Health Trackers**: Flowsheets, Treatment Plans, Health Screening, Preferences (`Fully Inspected`)
- [x] **Lab / Image**: Customize Labs, Lab Tags, Departments, Integrations, Customize Images (`Fully Inspected`)
- [x] **Rx**: Manage Supplements and Drugs (`Fully Inspected`)
- [x] **Immunization**: Vaccines, VIS, Vaccine Chart (`Fully Inspected`)
- [x] **Injections**: Manage Injections (`Fully Inspected`)
- [x] **Billing**: Procedure Codes, Fee Schedules, Billing Settings, Patient Billing, Lab Codes, Packages, Invoices, Receipts, Razorpay (`Fully Inspected`)
- [x] **Inventory**: Inventory & Vaccine Settings, Multi-Facility Settings, E-Commerce (`Fully Inspected`)
- [x] **Message**: Signature, Vacation Reply, Preferences (`Fully Inspected`)
- [x] **Task**: Preferences (`Fully Inspected`)
- [x] **Patient Recall**: Recall Types, Status, Preferences (`Fully Inspected`)
- [x] **Quick Text**: Personal Quick Text (`Fully Inspected`)
- [x] **Directory**: Providers, Pharmacy, Others (`Fully Inspected`)
- [x] **PHR Settings**: Preferences, Share Clinical Data, Portal Embed, Custom App, Useful Info (`Fully Inspected`)
- [x] **Charm TeleHealth**: Video consultation configuration (`Fully Inspected`)
- [x] **Charm Connect**: Chat settings (`Fully Inspected`)
- [x] **Account**: Profile, Password, MFA, Email Delivery, Preferences (`Fully Inspected`)
- [x] **Security**: Audit Trails, Activity History, Active Sessions, Security Incident Report (`Fully Inspected`)
- [x] **Charm Assist**: Chart Note Assist, Insurance Card Reader (`Fully Inspected`)

---

## 4. Operational Boundaries Maintained
In strict accordance with the exploration guidelines:
- Read-only exploration was maintained throughout.
- No destructive actions, prescription transmissions, or real billing charges were initiated.
- No identifiable patient data was extracted or exposed.
- All screenshots have been organized into the clean, sanitized local reference library.
