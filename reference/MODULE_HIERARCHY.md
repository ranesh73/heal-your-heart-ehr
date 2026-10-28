# Reference: Complete Application Module Hierarchy

## 1. Global Module Inventory
Every top-level application module accessible from the CharmHealth Home application launcher has been inspected and mapped.

---

### Module 1: Patients (`/ehr/physician/myPatients.do?ACTION=FETCH_PATIENTS`)
- **Primary Layout**: Full-width data grid with patient search header.
- **Top Actions**:
  - `+ Patient` (New patient registration modal).
  - `More Actions` (Export patient directory, bulk notification, print list).
- **Search & Filter Controls**:
  - `Search Patient by Name / ID` (Live autocomplete).
  - Column sorting on Record ID, Last Name, First Name, Date of Birth.
- **Grid Data Columns**:
  - Record ID (e.g. `HUHNKR7176`, `4R 0017`).
  - Last Name.
  - First Name.
  - Date of Birth / Age.
  - Mobile Phone.
  - Photo Thumbnail.
- **Navigation Action**: Clicking any row directly opens the Patient Chart workspace.

---

### Module 2: Calendar (`/ehr/physician/calendar2.do?method=showCalendar`)
- **Secondary Sub-Tabs**:
  1. `Calendar` (Main interactive scheduling grid).
  2. `Waiting List` (Patients queued for cancellations/openings).
  3. `Appointment Requests` (Pending online portal bookings).
  4. `Reports` (Daily schedule lists, provider utilization, no-show reports).
- **Calendar Grid Controls**:
  - View modes: Day, Week, Month, Resource (Beds/Rooms), List.
  - Date selector / navigation chevrons / "Today" quick button.
  - `Provider Quick Search` input.
  - `Provider Availability` toggle / sidebar panel.
- **Filters**:
  - `Facility*` dropdown (Heal Your Heart Neelankarai, Royapettah, etc.).
  - `Provider*` dropdown (Physicians and therapists).
  - `Visit Type` dropdown (New consultation, Follow-up, EECP 1st-35th Day sessions).
- **Actions**:
  - Click on time slot: Opens `New Appointment` modal.
  - Click on existing event: Opens appointment details drawer with Status update, Reschedule, Check In, Cancel, Open Chart Note.

---

### Module 3: Chart Notes (`/ehr/physician/reviewCharts.do?ACTION=FETCH_REVIEW_CHARTS_VIEW_HOME`)
- **Primary Layout**: Clinical encounter ledger.
- **Header Actions**:
  - `+ Consultation` (Initiates new clinical encounter).
- **Filter Bar**:
  - `Provider` dropdown (Filter by specific clinician or "All").
  - `Chart Status` dropdown (`Unsigned`, `Signed`, `To be Co-Signed`, `Co-Signed`).
  - `Appointment Status` dropdown (`All`, `Confirmed`, `Checked in`, `Completed`, `Discharged`).
  - Date range filters.
- **Grid Data Columns**:
  - Encounter Date & Time.
  - Patient Name & Record ID.
  - Provider.
  - Visit Type.
  - Status Badge (Unsigned in orange/red, Signed in green).
  - Actions (`Edit Chart`, `Preview`, `Sign`, `Delete`).

---

### Module 4: Labs (`/ehr/physician/medicalRecord.do?ACTION=FETCH_REVIEW_LABS_VIEW`)
- **Secondary Sub-Tabs**:
  - `Review Results` (Incoming diagnostic tests awaiting physician sign-off).
  - `Lab Orders` (Requisitions sent to diagnostic labs).
  - `Electronically Received` (HL7/API automated results).
- **Grid Data Columns**:
  - Order Date.
  - Patient Name & RID.
  - Test Name (e.g. Lipid Profile, Cardiac Enzymes, HbA1c).
  - Ordering Provider.
  - Performing Laboratory.
  - Status (Pending, Normal, Abnormal flag).
  - Action (`Review`, `Sign off`, `Add to Chart Note`).

---

### Module 5: Images (`/ehr/physician/imaging.do?method=showImageTab`)
- **Primary Layout**: Diagnostic radiology & scan document repository.
- **Features**:
  - Image order tracking (ECG, 2D Echo, Coronary Angiogram, Chest X-Ray).
  - File attachment / scan upload interface.
  - DICOM viewer integration / PDF report previewer.
  - Associate image order with clinical consultation note.

---

### Module 6: Documents (`/ehr/physician/documents.do?ACTION=DocumentsMainTab`)
- **Sub-Categories**:
  - `Inbox` (Unassigned scanned documents).
  - `Patient Documents` (Categorized by patient MRN).
  - `Practice Documents` (Institutional policies, forms).
- **Actions**:
  - `Upload Document` (Multi-file drag and drop).
  - Tagging, assigning to patient, assigning category (ID, Lab, Consent).

---

### Module 7: Injections (`/ehr/physician/routing.do?ACTION=injectionMainTab`)
- **Primary Layout**: Clinical injection order and administration ledger.
- **Columns**: Patient, Drug/Injectable Name, Dosage, Route (IM/IV/SC), Ordered By, Administered By, Administration Timestamp, Lot Number, Expiration Date.

---

### Module 8: Referrals (`/ehr/physician/referral.do?method=openReferralMainTab`)
- **Sub-Tabs**:
  - `Inbound Referrals` (Patients referred into Heal Your Heart from external cardiologists/physicians).
  - `Outbound Referrals` (Patients sent to tertiary cardiac surgical centers or allied specialists).
- **Fields**: Referring Provider, Practice Name, Specialty, Clinical Summary Reason, Status (Pending, Scheduled, Completed, Report Received).

---

### Module 9: Messages (`/ehr/messagesAction.do?ACTION=FETCH_ALL_MESSAGES`)
- **Layout**: Split two-pane email/message client.
- **Folders**:
  - `Inbox`
  - `Sent`
  - `Drafts`
  - `Trash`
  - `Patient Messages`
  - `Staff Messages`
- **Actions**: `Compose Message`, `Reply`, `Forward`, `Link to Patient Chart`.

---

### Module 10: Channels (`/ehr/physician/chatSettings.do?method=fetchChannelsLayout`)
- **Primary Layout**: Real-time team communication rooms (Zoho Cliq integrated channels).
- **Channels**:
  - `#announcements`
  - `#general-clinical`
  - `#eecp-team`
  - `#front-desk`
  - `#billing-updates`

---

### Module 11: Tasks (`/ehr/todoAction.do?action=FETCH_TODOS`)
- **Filter Tabs**:
  - `My Tasks`
  - `Assigned by Me`
  - `Overdue`
  - `Completed`
- **Fields**: Task Title, Patient Association, Assigned To, Priority (Low, Medium, High, Urgent), Due Date, Status checkbox.

---

### Module 12: Billing (`/ehr/physician/billing.do?method=showBillingMain`)
- **Secondary Sub-Tabs**:
  1. `Dashboard` (Revenue graphs, outstanding accounts receivable, payments collected today).
  2. `Invoices` (Searchable ledger of all patient invoices with paid/unpaid status).
  3. `Receipts` (Payment receipts, installment allocations, receipt vouchers).
- **Actions**:
  - `+ Create Invoice`
  - `+ Record Payment / Receipt`
  - `Generate Statement`

---

### Module 13: Inventory (`/ehr/inventory.do?method=view`)
- **Secondary Sub-Tabs**:
  1. `Inventory` (Product catalog and active stock levels).
  2. `Supplier` (Vendor directory, purchase orders).
  3. `Category` (Consumables, Drugs, Syringes, IV Fluids, Supplements).
  4. `Reports` (Stock movement ledger, reorder warnings, expired batch reports).
- **Actions**:
  - `+ Add Inventory`
  - `Bulk Inventory`
  - `Import / Export Inventory`
  - `Product Update`

---

### Module 14: Analytics (`/ehr/physician/reports.do?ACTION=FETCH_REPORTS`)
- **Sub-Tabs**:
  1. `Default Reports` (Pre-configured clinical, operational, and financial reports).
  2. `Custom Reports` (Ad-hoc report builder with custom filters, columns, and date ranges).
- **Report Categories**:
  - Patient Demographics & Growth
  - Encounter & Appointment Statistics
  - EECP Protocol Compliance & Hours Completed
  - Financial Collections & Tariff Distribution

---

## 2. Visual Artifacts Captured
- Patients List: `reference/screenshots/patients/charmhealth_patients_list.png`
- Calendar: `reference/screenshots/calendar/charmhealth_calendar.png`
- Chart Notes: `reference/screenshots/consultations/charmhealth_global_chart_notes.png`
- Labs: `reference/screenshots/labs/charmhealth_labs.png`
- Images: `reference/screenshots/images/charmhealth_images.png`
- Documents: `reference/screenshots/documents/charmhealth_documents.png`
- Injections: `reference/screenshots/other/charmhealth_injections.png`
- Referrals: `reference/screenshots/other/charmhealth_referrals.png`
- Messages: `reference/screenshots/communication/charmhealth_messages.png`
- Channels: `reference/screenshots/communication/charmhealth_channels.png`
- Tasks: `reference/screenshots/communication/charmhealth_tasks.png`
- Billing Overview: `reference/screenshots/billing/charmhealth_global_billing.png`
- Invoices: `reference/screenshots/billing/charmhealth_invoices_list.png`
- Receipts: `reference/screenshots/billing/charmhealth_receipts_list.png`
- Inventory: `reference/screenshots/inventory/charmhealth_inventory.png`
- Analytics: `reference/screenshots/analytics/charmhealth_analytics.png`
