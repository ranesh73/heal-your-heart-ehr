# Reference: Clinical Workflow & Transactional State Map

## 1. Core End-to-End Clinical Workflows

### Workflow 1: Patient Registration & Multi-Branch Assignment
```
[Front Desk / Reception] 
       │
       ▼
Click "+ Add Patient" ──► Modal: Basic Details (First/Last Name, DOB, Sex, Mobile, Address)
                               │
                               ▼
                        Branch Selection: Checkbox multi-select
                        - Neelankarai (HUH001)
                        - Royapettah (HUH002)
                        - Manapakkam (HUH003)
                               │
                               ▼
                        [Register & Open Chart]
                               │
                               ▼
                        Chart View Opened: Auto-assigns MRN/RID (e.g. HUHNKR7177)
```

---

### Workflow 2: Appointment Scheduling & Flow Lifecycle
```
[Select Slot on Calendar / "+ Appointment"]
       │
       ▼
Modal Form:
- Patient: Search & Select
- Provider / Therapist: Dr. Ramasamy / Staff
- Facility: Neelankarai
- Date & Time: 2026-10-26 09:00
- Visit Type: New Consultation / EECP Session
- Resource / Room: Bed 1 / Room A
       │
       ▼
[Confirm Booking] ──► State: "Confirmed"
       │
       ▼
Patient Arrives at Clinic ──► Reception clicks "Check In" ──► State: "Checked In"
       │
       ▼
Clinician opens encounter ──► State: "In Progress"
       │
       ▼
Chart Signed & Finalized ──► State: "Completed"
```

---

### Workflow 3: Three-Pane Clinical Encounter (SOAP Lifecycle)
```
[Click "+ Consultation" or "Edit Chart"]
       │
       ▼
Open Three-Pane Encounter Workspace:
- Left Pane: Verify Allergies, Current Meds, Problem List, Cardiac History
- Middle Pane: Review Prior Encounter or Click "Repeat Chart Note"
- Right Pane: Active SOAP Editor
       │
       ▼
Fill Structured Clinical Data:
- S: Chief complaints, Angina frequency, Nitroglycerin doses, Walking distance
- O: Physical examination, blood pressure, heart rate, heart sounds
- A: Cardiac assessment (Stable Angina, Ischemic Cardiomyopathy)
- P: Prescriptions, Lab orders, EECP Protocol recommendation
       │
       ▼
Draft Save ──► State: "Unsigned" (Editable, warning flag on dashboard)
       │
       ▼
[Sign Chart Note] ──► State: "Signed" (Legally locked, timestamped, physician credentials attached)
       │
       ▼
Need clinical correction? ──► [Amend Note] ──► State: "Amended" (Appends signed addendum with audit reason)
```

---

### Workflow 4: EECP Therapy Protocol & Session Tracking
```
1. Cardiologist Consultation: Diagnosis of CAD / Angina refractory to medical therapy.
2. Treatment Authorization: Doctor approves 35-Hour EECP Therapy Course.
3. Package Invoicing: Billing team generates 35-session package invoice with flexible installment plan.
4. Booking Engine: Generates 35 daily 1-hour sessions (Mon-Sat, skipping Sundays).
5. Daily Session Execution (Therapist):
   - Pre-session check: Resting BP, HR, arrhythmia check, contraindication screening.
   - Counter-pulsation operation: Sequential pneumatic cuff inflation (Calf -> Lower Thigh -> Upper Thigh) timed to ECG R-wave.
   - Operating pressure target: 200 - 300 mmHg.
   - Session charting: Log hours completed (e.g. Session 14/35), patient tolerance, post-session vitals.
```

---

### Workflow 5: Billing & Installment Receipting
```
1. Encounter or Service Completed ──► Click "+ Invoice"
2. Select Procedure Codes / Tariffs from catalog (e.g. Cardiology Consultation, EECP Single Session, EECP 35-Session Package).
3. System applies facility tax rules & fee schedules.
4. Invoice saved ──► State: "Unpaid" / "Partially Paid"
5. Record Payment Receipt:
   - Payment method: Cash / UPI / Card / Bank Wire / Simulated Gateway
   - Transaction reference number
   - Amount allocated to invoice
6. Receipt voucher generated with unique Receipt ID.
7. Balance Due automatically recalculates in the Patient Chart Header.
```
