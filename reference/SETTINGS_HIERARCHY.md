# Reference: CharmHealth Settings System Hierarchy

## 1. Settings Architecture Overview
The Settings hub (`/ehr/physician/mySpace.do?ACTION=SETTINGS_TAB`) governs every clinical, administrative, financial, and security configuration in the EHR. CharmHealth groups settings into 25 distinct functional domains arranged in a searchable directory grid.

---

## 2. Exhaustive 25 Settings Categories & Nested Configuration Screens

### 1. Facility
- **Facility List**: Registered clinical branches (Neelankarai, Royapettah, etc.), addresses, facility codes, tax IDs, contact details.
- **Facility Members**: Practice staff directory, assigned credentials, clinical licenses, facility assignments.
- **Facility Resources**: Consultation rooms, EECP treatment beds, diagnostic equipment, availability rules.
- **Kiosk Setup**: Patient self-check-in tablet configuration and intake questionnaire mapping.
- **Notifications**: Automated facility alerts, critical lab arrival notices, schedule broadcast triggers.
- **Departments**: Internal divisions (Cardiology, EECP Department, General Medicine, Diagnostic Imaging).
- **Roles**: Custom role-based access control (Doctor, EECP Therapist, Receptionist, Billing Officer, Admin).

### 2. Calendar
- **Facility Timings**: Working days, standard clinic hours, weekend operation hours.
- **Provider Timings**: Individual physician & therapist shift schedules and off-duty blocks.
- **Online Appointments**: Public booking portal availability, advance notice windows, confirmation rules.
- **Web Embed**: Embeddable booking widget HTML/iFrame code for website integration.
- **Appointment Fields**: Custom fields required during appointment scheduling.
- **Appointment Status**: Status workflow states (Confirmed, Arrived, Checked In, In Progress, Completed, No Show, Cancelled).
- **Visit Types**: Visit categories with preset durations (New Consultation, Follow-up, EECP Daily Session, TeleHealth).
- **Event Types**: Blocked time, internal meetings, clinical training sessions.
- **Appointment Bot**: Automated scheduling assistant integration.
- **Schedule Rules**: Double-booking constraints, buffer times between sessions, patient limits.
- **Google Calendar**: Two-way synchronization settings with external calendars.
- **Preferences**: Calendar default views (Day, Week, Month, Resource), slot increments (15m, 30m, 60m).

### 3. Patient
- **Text / Voice Notifications**: SMS and automated IVR voice reminders for upcoming appointments.
- **Email Notifications**: Appointment confirmations, intake form links, clinic newsletters.
- **WhatsApp Notification**: Direct messaging integration for appointment updates and payment receipts.
- **Patient Registration**: Mandatory vs optional fields during front-desk patient intake.
- **Demographics**: Custom demographic data attributes, identification card types (Aadhaar, Passport, National ID).
- **Referral Source**: Inflow tracking channels (Physician referral, digital campaign, patient referral).
- **Categories**: Patient classification tags (VIP, Cardiac High Risk, Research Study, Chronic EECP).
- **Alerts**: Global clinical alert rules (e.g. Drug allergies, pacemaker contraindications).
- **Announcements**: Noticeboard messages presented in the patient portal.
- **Preferences**: Default communication channel preferences and MRN numbering rules.

### 4. Templates
- **My Templates**: Personal clinical SOAP templates authored by the logged-in physician.
- **Practice Templates**: Shared institutional SOAP note templates (e.g. Heal Your Heart Cardiology Initial, EECP Progress Note).
- **Email Templates**: Pre-configured email notices for discharge summaries, invoices, and lab notifications.
- **CharmHealth Library**: Community and specialty template exchange repository.

### 5. Questionnaires
- **Practice Questionnaires**: Digital intake assessments, medical histories, consent documents.
- **CharmHealth Library**: Pre-built standard questionnaires (PHQ-9, GAD-7, Cardiac Risk Index).
- **Preferences**: Automated questionnaire assignment rules triggered on specific visit types.

### 6. Documents
- **My Documents**: Private clinical reference materials and guidelines.
- **Practice Documents**: Practice-wide policies, patient brochures, consent packets.
- **CharmHealth Library**: Standard healthcare education handouts.
- **Document Categories**: Classification taxonomy (ID Proof, Lab Scan, External Record, Consent Form).

### 7. Consultation
- **DSI (Clinical Decision Support Interventions)**: Evidence-based alerts for drug interactions and risk flags.
- **Vitals**: Active vital sign parameters, custom vitals (e.g. Cuff Pressure, EECP Output Ratio), units of measurement.
- **Family Health History**: Hereditary condition checklist items (Coronary Artery Disease, Hypertension, Diabetes).
- **CCDA View**: Continuity of Care Document architecture formatting rules.
- **Visit Summary**: Clinical information included in after-visit summaries provided to patients.
- **Signature**: Digital signature capture, PIN requirement for chart finalization, auto-lock policies.
- **Preferences**: Auto-save interval, default SOAP section expand/collapse states.

### 8. Health Trackers
- **Flowsheets**: Serial longitudinal tracking parameters (Blood pressure trends, lipid panels, EECP session counters).
- **Treatment Plan**: Multi-session treatment protocol definitions (e.g. 35-Hour EECP Therapy Plan).
- **Health Screening**: Preventive screening intervals (Lipid profile every 6 months, annual ECG).
- **Preferences**: Visualization thresholds, target ranges for vitals.

### 9. Lab / Image
- **Customize Labs**: Practice laboratory catalog, test panels (Cardiac Panel, Lipid Panel, Renal Function).
- **Lab Tags**: Diagnostic grouping tags.
- **Lab Departments**: Pathology, Biochemistry, Microbiology, Cardiology Diagnostics.
- **Lab Integration Requests**: Electronic lab exchange configurations.
- **Customize Images**: Imaging catalog (ECG, 2D Echocardiogram, Coronary Angiogram, Treadmill Test).

### 10. Rx
- **Manage Supplements and Drugs**: Medication formulary, generic names, custom compounded preparations, cardiology drugs.

### 11. Immunization
- **Vaccines**: Vaccine catalog, CVX code mapping.
- **VIS (Vaccine Information Statements)**: Required educational disclosures.
- **Vaccine Chart**: Recommended immunization scheduling matrix.

### 12. Injections
- **Manage Injections**: Injectable medication catalog, predefined dosages, administration routes.

### 13. Billing
- **Procedure Codes**: CPT / service code catalog, tariffs, descriptions.
- **Fee Schedules**: Tiered pricing profiles (Standard, Insurance, Institutional, Package Discount).
- **Billing Settings**: Tax rates (GST / VAT), payment terms, invoice numbering prefixes, currency symbols.
- **Patient Billing Settings**: Self-pay installment policies, balance limits.
- **Procedure Code for Lab Tests**: Automatic procedure code billing mapping when labs are ordered.
- **Billing Packages**: Multi-session package definitions (e.g. 35 Sessions EECP Treatment Package).
- **Invoice Templates**: Layout, header logos, payment terms, bank account details.
- **Receipt Templates**: Payment voucher design and receipt numbering sequence.
- **Razorpay**: Online payment gateway integration, UPI, card, and net-banking configuration.

### 14. Inventory
- **Inventory and Vaccine Settings**: Stock threshold warnings, batch number tracking, expiry date alerts.
- **Multi Facility / Store Settings**: Stock transfers and tracking across Neelankarai, Royapettah, etc.
- **E-Commerce Settings**: Patient online pharmacy and supplement store integration.

### 15. Message
- **Signature**: Electronic signature text appended to patient and staff messages.
- **Vacation Reply**: Out-of-office automated response routing.
- **My Preferences**: Message notifications, audio alerts, inbox categorization.

### 16. Task
- **My Preferences**: Default task priority, automated task creation on unsigned charts, notification frequency.

### 17. Patient Recall
- **Recall Types**: Recall reasons (Annual cardiac review, 6-month post-EECP evaluation, follow-up ECG).
- **Recall Status**: Status tracking (Scheduled, Contacted, Completed, Declined).
- **Recall Preferences**: Automated recall notification rules.

### 18. Quick Text
- **Personal Quick Text**: Snippet expansion macros (e.g. `.eecp` expands into full counter-pulsation protocol notes).

### 19. Directory
- **Providers**: External specialist and referring physician directory.
- **Pharmacy**: Local pharmacy partner contact information and addresses.
- **Others**: Diagnostic centers, emergency response contacts.

### 20. PHR Settings (Patient Health Record / Portal)
- **Preferences**: Patient portal feature toggles (Appointment requests, lab reports, invoices, messaging).
- **Share Clinical Data**: Granular control over which chart sections patients can view online.
- **Patient Portal Embed**: Code for embedding patient portal login on practice website.
- **Custom App**: Branded mobile application settings for iOS and Android.
- **Useful Info**: Practice FAQs, clinic hours, contact guidelines displayed inside portal.

### 21. Charm TeleHealth
- Video consultation integration, camera/microphone test configurations, virtual waiting rooms.

### 22. Charm Connect
- Team instant messaging channels, group collaboration, staff presence.

### 23. Account
- **My Profile**: Name, designation, phone, email, bio.
- **Change Password**: Password update and complexity verification.
- **Multi-Factor Authentication**: TOTP / SMS 2FA configuration.
- **Check Email Delivery**: Diagnostic audit for undelivered patient emails.
- **Preferences**: Timezone (`Asia/Kolkata`), date format (`MMM DD, YYYY`).

### 24. Security
- **Audit Trails**: Complete chronological audit log of patient chart opens, edits, exports, and deletions.
- **Activity History**: User authentication timestamps, IP addresses, browser agents.
- **Active Sessions**: Currently active logged-in browser sessions with remote kill capability.
- **Security Incident Report**: Security event reporting and compliance documentation.

### 25. Charm Assist
- **Chart Note Assist**: AI clinical dictation, SOAP note summarization, voice-to-text.
- **Insurance Card Reader**: Optical character recognition (OCR) scanner for health cards.

---

## 3. Visual Artifacts Captured
- Settings Overview: `reference/screenshots/settings/charmhealth_settings_overview.png`
