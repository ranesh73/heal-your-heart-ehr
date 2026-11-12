# PROJECT ARCHITECTURE & CODE CONVENTIONS
## Strict Guidelines for All Developers and Antigravity Agents

### 1. Zero Structural Changes Policy
- **DO NOT** reorganize project directories or introduce alternative folder structures.
- **DO NOT** rewrite existing modules or introduce new frameworks/libraries without explicit coordination.

### 2. Frontend Conventions (`frontend/`)
- **Core Stack:** React 19 + TypeScript + Vite.
- **Styling:**
  - All styling belongs in `frontend/src/styles.css`.
  - Follow the existing CharmHealth CSS classes pattern (`.charm-...`, `.table-wrap`, `.brand`, `.button`, etc.).
  - **DO NOT** add CSS Modules, styled-components, Emotion, Tailwind utility configs, or external UI component libraries (MUI, Ant Design, Chakra).
- **Routing:**
  - Standard Hash-based SPA routing managed in `frontend/src/main.tsx` (`parts[0]`, `navigate("/path")`).
  - **DO NOT** introduce React Router DOM, TanStack Router, or Next.js file-based routing.
- **Data Fetching & State:**
  - Use TanStack React Query (`useQuery`, `useMutation`) with the standard `api()` helper in `frontend/src/ui.tsx`.
  - Forms use `react-hook-form` + `zod`.
  - **DO NOT** introduce Redux, Zustand, MobX, Axios, or custom global store architectures.
- **File Placement:**
  - `frontend/src/main.tsx`: Shell, navigation bar, auth, dashboard launcher.
  - `frontend/src/patients.tsx`: Patient charts, clinical encounters, SOAP notes, vitals.
  - `frontend/src/charmChartNotesGlobal.tsx`: Global Chart Notes screen.
  - `frontend/src/operations.tsx`: Appointments, calendar views, billing, facility management.
  - `frontend/src/settings.tsx`: Practice settings and clinical catalogs.
  - `frontend/src/ui.tsx`: Core UI primitives (`Button`, `Modal`, `Input`, `Badge`, `Empty`).

### 3. Backend Conventions (`backend/`)
- **Core Stack:** FastAPI + SQLAlchemy 2.0 + SQLite / PostgreSQL.
- **Database Migrations:**
  - Any model or column change in `backend/app/models.py` **MUST** include an Alembic migration in `backend/migrations/versions/`.
  - Never alter local database schemas without a corresponding Alembic migration.
- **API Standards:**
  - Keep endpoints in existing router files (`backend/app/clinical.py`, `backend/app/main.py`, etc.).
  - Adhere to the existing auth and CSRF token session model (`api/auth/...`).

### 4. Build & Pre-Push Requirement
- Before committing or pushing any code, run:
  ```bash
  cd frontend
  npm run build
  ```
  It **MUST** pass with 0 errors (`tsc -b && vite build`).

### 5. Server Lifecycle & Post-Merge Protocol (Prevent Stale Endpoints)
- **Always Run Uvicorn with `--reload`**:
  ```bash
  uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
  Never run the dev backend without `--reload`. Without it, new routes merged from git or written to disk will not be loaded into memory and will return 404s.
- **Mandatory Post-Merge / Post-Pull Steps**:
  Whenever pulling or merging changes from git:
  1. **Run DB Migrations**:
     ```bash
     .venv\Scripts\alembic.exe -c backend/alembic.ini upgrade head
     ```
  2. **Run New Seeds**:
     Run any newly added seed scripts (e.g. `python scripts/seed_injection_catalogs.py`).
  3. **Verify Server Process**:
     Ensure backend restarted or reloaded automatically, and test health via `GET /api/health`.
  4. **Build Frontend**:
     Run `cd frontend && npm run build` to confirm 0 compilation errors.


