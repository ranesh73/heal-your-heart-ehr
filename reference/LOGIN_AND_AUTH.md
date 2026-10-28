# Reference: Authentication & Session Flow

## 1. Authentication Overview
CharmHealth uses a centralized single-sign-on (SSO) gateway at `accounts.charmtracker.com` before routing users to the facility selection and clinical workspaces at `ehr2.charmtracker.com`.

## 2. Authentication Entry Point & URLs
- **Primary EHR Entry URL**: `https://ehr2.charmtracker.com/ehr/main.do`
- **Redirect Gateway**: `https://accounts.charmtracker.com/signin?hide_signup=true&hide_secure=true&hide_gsignup=true&servicename=charmhealth&serviceurl=https://ehr.charmtracker.com%2Fehr%2Fmain.do`
- **Authenticated Facility Landing**: `https://ehr2.charmtracker.com/ehr/main.do` (Page Title: `Facility List`)
- **Main Practice Home Workspace**: `https://ehr2.charmtracker.com/ehr/physician/home.do?FACILITY_ID=<FACILITY_ID>`

---

## 3. Login Screen Architecture (Step-by-Step Flow)

### Step 1: Identifier Entry
- **Container**: Centered authentication card with shadow, border-radius (8px), brand logo.
- **Header**: "Sign in to access charmhealth".
- **Fields**:
  - `Email address or mobile number` (Single text input, auto-focused, autocomplete enabled).
- **Controls**:
  - `Next` (Primary action button, full width).
- **Footer**:
  - "© 2026, MedicalMine Inc. All Rights Reserved."

### Step 2: Credential Verification
- **Identifier Summary**: Displays entered email / phone with `Change` inline action link.
- **Fields**:
  - `Enter password` (Password input with toggle visibility eye icon).
- **Secondary Actions**:
  - `Forgot Password?` (Directs to self-service account recovery).
  - `Sign in with OTP / MFA` (When multi-factor authentication is configured).
- **Submission**:
  - Validates password length and format before sending encrypted payload.

---

## 4. Facility Selection Screen (`/ehr/main.do`)

Once authenticated, CharmHealth prompts users who belong to multiple facilities to select their active clinical practice.

### Header Banner (Height: 60px)
- **Left**: `CharmEHR` logo.
- **Right**:
  - User Display Name: `Ranesh B` (clickable text trigger).
  - User Photo Avatar: Circular thumbnail (40x40px).

### Facility Selection Grid
- **Prompt Banner**: "Select the facility you want to log on"
- **Registered Facilities for Heal Your Heart**:
  1. `Heal Your Heart Neelankarai - HUH001`
  2. `Heal Your Heart Royapettah - HUH002`
  3. `Dr.S.Ramasamy (Reg No:60626)`
  4. `Dr.S.Ramasamy (Royapettah)`
  5. `4R Health & Wellness`
  6. `Heal Your Heart - Manapakkam - HUH003`
  7. `Heal Your Heart-Madurai - 005`
  8. `Heal Your Heart-Tirunelveli - 004`
- **Card Layout**:
  - Medical facility icon / badge on left.
  - Practice Name and Facility Code on right.
  - Hover highlights row with subtle tint and pointer cursor.

---

## 5. User Profile Menu & Session Controls
Clicking the user's name or avatar in the global header opens a floating card:
- **User Avatar**: Large round profile picture.
- **User Identity Details**:
  - Full Name: `Ranesh B`
  - Assigned Roles / Specialization: `Charm Assistant, PA`
  - System User ID: `User ID : 20001463661` (with tooltip: "Unique identification number for CharmHealth...")
  - Primary Contact Email: `ranesh0708@gmail.com`
- **Session Actions**:
  - `Lock` (Locks workspace without terminating active session; requires re-entering password to resume).
  - `Sign Out` (Terminates current session, invalidates auth cookies, redirects back to login gateway).

---

## 6. Screenshots Captured
- Login Gateway: `reference/screenshots/authentication/charmhealth_login.png`
- Facility Selection Screen: `reference/screenshots/authentication/charmhealth_facility_selection.png`
- User Profile Popup Menu: `reference/screenshots/authentication/charmhealth_user_menu.png`
