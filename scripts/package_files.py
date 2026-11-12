import os
import shutil
import zipfile
from pathlib import Path

BASE_DIR = Path(r"c:\Users\sanju\OneDrive\Desktop\HYH-EHR")
DESKTOP_DIR = Path(r"c:\Users\sanju\OneDrive\Desktop")

# Target folders and zip files
EXPORT_DIR = DESKTOP_DIR / "HYH-EHR-Settings-Package"
SETTINGS_ZIP = DESKTOP_DIR / "HYH-EHR-Settings-Package.zip"
PROJECT_ZIP = DESKTOP_DIR / "HYH-EHR-Full-Project.zip"

print(f"1. Creating Settings Module package directory: {EXPORT_DIR}")
if EXPORT_DIR.exists():
    shutil.rmtree(EXPORT_DIR)

EXPORT_DIR.mkdir(parents=True, exist_ok=True)
(EXPORT_DIR / "frontend" / "src" / "settings").mkdir(parents=True, exist_ok=True)
(EXPORT_DIR / "backend" / "app").mkdir(parents=True, exist_ok=True)
(EXPORT_DIR / "scripts").mkdir(parents=True, exist_ok=True)
(EXPORT_DIR / "tests").mkdir(parents=True, exist_ok=True)

# Copy Frontend Settings
shutil.copytree(BASE_DIR / "frontend" / "src" / "settings", EXPORT_DIR / "frontend" / "src" / "settings", dirs_exist_ok=True)
shutil.copy2(BASE_DIR / "frontend" / "src" / "styles.css", EXPORT_DIR / "frontend" / "src" / "styles.css")
shutil.copy2(BASE_DIR / "frontend" / "src" / "main.tsx", EXPORT_DIR / "frontend" / "src" / "main.tsx")
shutil.copy2(BASE_DIR / "frontend" / "tests" / "settings.spec.ts", EXPORT_DIR / "tests" / "settings.spec.ts")

# Copy Backend files
shutil.copy2(BASE_DIR / "backend" / "app" / "settings_router.py", EXPORT_DIR / "backend" / "app" / "settings_router.py")
shutil.copy2(BASE_DIR / "backend" / "app" / "identity.py", EXPORT_DIR / "backend" / "app" / "identity.py")
shutil.copy2(BASE_DIR / "backend" / "app" / "models.py", EXPORT_DIR / "backend" / "app" / "models.py")
shutil.copy2(BASE_DIR / "backend" / "app" / "schemas.py", EXPORT_DIR / "backend" / "app" / "schemas.py")
shutil.copy2(BASE_DIR / "backend" / "app" / "security.py", EXPORT_DIR / "backend" / "app" / "security.py")
shutil.copy2(BASE_DIR / "backend" / "app" / "main.py", EXPORT_DIR / "backend" / "app" / "main.py")

# Copy Scripts
shutil.copy2(BASE_DIR / "scripts" / "sync_charm_facilities.py", EXPORT_DIR / "scripts" / "sync_charm_facilities.py")
shutil.copy2(BASE_DIR / "scripts" / "sync_charm_members.py", EXPORT_DIR / "scripts" / "sync_charm_members.py")
shutil.copy2(BASE_DIR / "scripts" / "restore_all_ehr_data.py", EXPORT_DIR / "scripts" / "restore_all_ehr_data.py")
shutil.copy2(BASE_DIR / "scripts" / "verify_all_recording_features.mjs", EXPORT_DIR / "scripts" / "verify_all_recording_features.mjs")

# Create README inside package
readme_content = """# Heal Your Heart EHR - CharmHealth Settings Replication Package

This folder contains all the files implemented for the exact CharmHealth Settings System replication and the Facility section module.

## Contents:
- `frontend/src/settings/`:
  - `SettingsDashboard.tsx`: Complete 25-category CharmHealth Settings grid with live search.
  - `SettingsLayout.tsx`: Shared subpage layout with search pill, back arrow (`⬅`), and horizontal sibling tab strip.
  - `IndividualSettingPage.tsx`: Master router rendering ONLY the clicked setting's dedicated screen.
  - `SettingContentView.tsx`: Subpage renderer for all 24 other setting categories.
  - `FloatingToolbar.tsx`: 4-button floating toolbar (Addons, Refer a Friend, Shortcuts, Help) with Shift+K shortcut.
  - `facility/FacilityListPage.tsx`: Complete Facility List with 10 practice branches, + New Facility button, strikethrough for inactive facilities, and row action menu.
  - `facility/ManageMembersModal.tsx`: Manage Members modal with alert banner, mapped/unmapped filters, 2-column checklist.
  - `facility/AddFacilityPage.tsx`: Two-column Add/Edit Facility form with 19 configuration fields.
  - `facility/FacilityMembersPage.tsx`: Active/Invited tabs, filter bar, bracketed roles.
  - `facility/FacilityResourcesPage.tsx`: EECP Room 01..06 resources table and New Resource dialog.
  - `facility/KioskSetupPage.tsx`: Accounts table and Edit Account Details modal.
  - `facility/DepartmentsPage.tsx`: Diagnostic department and member assignment modal.
  - `facility/RolesPage.tsx`: 13 practice roles and granular permission editor.
  - `facility/FacilityNotificationsPage.tsx`: Criteria rules and recipient matrix.
- `frontend/src/styles.css`: Complete CSS design tokens matching CharmHealth (#166EB8 headers, #d97706 orange buttons, #0d9488 teal tabs, strikethroughs).
- `frontend/src/main.tsx`: Hash router updated for `#/settings/:category/:option`.
- `backend/app/settings_router.py`: Dedicated FastAPI router for settings persistence.
- `backend/app/identity.py`: Endpoints for facilities, facility members, and facility resources.
- `backend/app/models.py`: Database models for facilities, resources, roles, departments, kiosk accounts.
- `scripts/`: Data synchronization scripts and automated verification suite.
- `tests/settings.spec.ts`: Full Playwright E2E test suite (6/6 passing).
"""
with open(EXPORT_DIR / "README.md", "w", encoding="utf-8") as f:
    f.write(readme_content)

print(f"2. Creating ZIP archive for Settings Package: {SETTINGS_ZIP}")
with zipfile.ZipFile(SETTINGS_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(EXPORT_DIR):
        for file in files:
            file_path = Path(root) / file
            arcname = file_path.relative_to(EXPORT_DIR)
            zf.write(file_path, arcname)

print(f"3. Creating Full Clean Project ZIP: {PROJECT_ZIP}")
EXCLUDE_DIRS = {"node_modules", ".venv", ".git", "__pycache__", ".pytest_cache", "dist", "test-results", "playwright-report", "extracted_frames"}
EXCLUDE_EXTS = {".mp4", ".tsbuildinfo"}

with zipfile.ZipFile(PROJECT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(BASE_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if any(file.endswith(ext) for ext in EXCLUDE_EXTS):
                continue
            if file.startswith("scratch_") or file.startswith("charm_"):
                continue
            file_path = Path(root) / file
            arcname = file_path.relative_to(BASE_DIR)
            zf.write(file_path, arcname)

print("Packaging complete!")
print(f"Settings Folder: {EXPORT_DIR}")
print(f"Settings Zip:    {SETTINGS_ZIP}")
print(f"Full Project Zip:{PROJECT_ZIP}")
