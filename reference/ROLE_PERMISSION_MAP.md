# Reference: Role-Based Access Control & Permission Matrix

## 1. Role Architecture Overview
CharmHealth provides customizable role-based permissions that tailor the interface, modules, and permissible actions to each staff member's operational scope.

---

## 2. Role-Based Permissions Matrix

| Feature / Workspace Action | Doctor / Cardiologist | EECP Therapist | Front Desk / Reception | Clinical Assistant | Billing Officer | Administrator |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Patient Directory & Search** | Full | Full | Full | Full | Full | Full |
| **Register New Patient** | Yes | Yes | **Primary** | Yes | Yes | Yes |
| **Edit Patient Demographics** | Yes | Yes | **Primary** | Yes | Yes | Yes |
| **Calendar Scheduling** | Full | View/Book | **Primary** | View/Book | View | Full |
| **Patient Check-In** | Yes | Yes | **Primary** | Yes | No | Yes |
| **Create Consultation Note** | **Primary** | Restricted | No | Draft Only | No | Yes |
| **Sign & Lock Clinical Notes** | **Primary** | No | No | No | No | No |
| **Amend Finalized Notes** | **Primary** | No | No | No | No | No |
| **Order Prescriptions (Rx)** | **Primary** | No | No | No | No | No |
| **EECP Daily Session Charting** | Review/Order | **Primary** | No | Assist | No | View |
| **Order Labs & Imaging** | **Primary** | No | No | Draft | No | View |
| **Create Invoices & Bills** | Yes | No | Limited | No | **Primary** | Full |
| **Collect Payments & Receipts**| No | No | Yes | No | **Primary** | Full |
| **Manage Inventory & Tariffs**| View | Log Use | View | Log Use | View | **Primary** |
| **System Settings & Security** | Personal Only| Personal Only| Personal Only | Personal Only | Personal Only | **Full Master**|
| **View Audit Trails & Logs** | Limited | No | No | No | Limited | **Full** |

---

## 3. Role-Specific Workflow Safeguards
- **Signatures**: Only licensed clinicians (Doctors) possess digital signing privileges. Unsigned notes appear in the global and patient-level `Unsigned` queue.
- **Controlled Prescriptions**: Non-clinical staff (Reception, Billing) are restricted from accessing prescribing forms or modifying medication plans.
- **Audit Logging**: Every access to a patient record, note edit, prescription dispatch, and billing alteration records an immutable audit trail entry stamped with user ID, IP address, and timestamp.
