# Reference: Global Navigation & Shell Architecture

## 1. Global Shell Structure
The CharmHealth EHR interface features a persistent global header and utility rail supporting rapid access across all clinical workflows.

```
+--------------------------------------------------------------------------------------------------------------------+
| [CharmEHR Logo]    [Search Patient by Name / ID  (🔍)] [+ Add Patient]       [Enable TeleHealth] [Facility ▼] [🔔] [⚙] [👤] |
+--------------------------------------------------------------------------------------------------------------------+
|                                                                                                                    |
|                                            MAIN CONTENT / WORKSPACE                                               |
|                                                                                                                    |
+--------------------------------------------------------------------------------------------------------------------+
| [Pins] [Chats (1)] [Channels] [Threads] [People]                                                   [Phone Dialpad] |
+--------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Top Header Specifications
- **Height**: 60px (Home screen) / 45px (Module screens & 3-pane encounter).
- **Background**: Solid white (`#FFFFFF`) with bottom border `#E2E8F0`.
- **Components**:
  1. **Brand Mark**: `CharmEHR` svg/png on left (clickable; always routes back to Home launcher).
  2. **Patient Search Bar**:
     - Position: Center-left on Home screen, integrated in sub-header on child screens.
     - Dimensions: Height 46px on Home, 32px on module headers.
     - Placeholder: `Search Patient by Name / ID`.
     - Action icon: `Add Patient` (`+` badge button) positioned adjacent to search.
     - Behavior: Search queries patient database live on keypress and renders autocomplete card with RID, DOB, Phone, and photo.
  3. **Header Action Group (Right Side)**:
     - **TeleHealth Button**: Teal/green pill badge (`Enable TeleHealth`).
     - **Facility Selector**:
       - Text display of active branch: e.g. `Heal Your Heart Neelankarai - ..`
       - Downward chevron trigger.
       - Opens dropdown displaying all associated facilities allowing seamless multi-branch switching.
     - **Notifications Bell**: `Member Notifications` icon with unread badge counter.
     - **Settings Gear**: `Settings` icon; opens comprehensive settings system.
     - **User Profile Avatar**: Photo thumbnail with dropdown for profile information, `Lock`, and `Sign Out`.

---

## 3. Application Launcher (Home Dashboard Grid)
The primary landing screen presents a clean grid of 14 core functional modules:

| Module Icon | Name | Primary Function |
| :--- | :--- | :--- |
| 🗂️ | **Patients** | Patient directory, registration, search, demographics, full chart access |
| 📅 | **Calendar** | Day/Week/Month/Resource scheduling, provider availability, appointment booking |
| 📝 | **Chart Notes** | Global consultation directory, unsigned charts, SOAP note reviews |
| 🔬 | **Labs** | Diagnostic orders, incoming results review, lab integration status |
| 🖼️ | **Images** | Radiology orders, DICOM / scan uploads, imaging reports |
| 📁 | **Documents** | Document inbox, scan attachments, signed patient consent forms |
| 💉 | **Injections** | Administration logs, injection orders, vial tracking |
| 🔄 | **Referrals** | Inbound/outbound specialist referrals, communication tracking |
| ✉️ | **Messages** | Internal clinical messaging, patient portal communications, SMS |
| 📢 | **Channels** | Multi-disciplinary collaboration rooms, practice announcements |
| ✅ | **Tasks** | Practice task management, patient-specific to-dos, assignments |
| 💳 | **Billing** | Invoices, receipts, packages, payments, fee schedules, claims |
| 📦 | **Inventory** | Product catalogs, stock levels, reorder alerts, supplier tracking |
| 📊 | **Analytics** | Practice operational metrics, clinical quality reports, financial analytics |

---

## 4. Persistent Sidebar & Peripheral Utilities
- **Right Floating Rail**:
  - `Refer a Friend` (Gift icon)
  - `Add-ons` (Extension puzzle icon)
  - `Help` (Question circle icon)
  - `Keyboard Shortcuts` (`Shift+K` trigger icon)
- **Bottom Left Collaboration Bar**:
  - `My Pins`
  - `Chats` (Zoho Cliq integrated messenger with unread count `1`)
  - `Channels`
  - `Threads`
  - `People`
- **Bottom Right Dialpad**:
  - Telephony widget with keypad for direct patient calling.

---

## 5. Visual Artifacts
- Home Dashboard: `reference/screenshots/home/charmhealth_home_dashboard.png`
- Global Navigation Header: `reference/screenshots/home/charmhealth_home.png`
