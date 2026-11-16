# Global Catalogue Search Integration Across the Entire EHR

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a centralized, database-connected, multi-catalogue search service (`/api/catalogue/search`) and a universal, accessible frontend autocomplete component (`CatalogAutocomplete`), and integrate it across every module where medicines, drugs, injections, inventory items, and clinical orderables are searched and selected.

**Architecture:**
- **Backend:** Unified search service in `backend/app/catalogue_service.py` mounted at `/api/catalogue/search` handling scoped catalogue types (`all`, `medicine`, `injection`, `inventory`, `lab`, `imaging`, `vaccine`). Enhance existing `/api/injections/catalog` and `/api/catalogs` so all existing and new callers receive synchronized, case-insensitive, deduplicated results across `injection_catalogs`, `medicine_catalogs`, `catalogs`, and `inventory_items`.
- **Frontend:** Universal `<CatalogAutocomplete />` in `frontend/src/components/CatalogAutocomplete.tsx` with keyboard navigation, match highlighting, debounced queries, `z-index: 99999`, and modal overflow prevention. Drop-in wrappers for existing `InjectionAutocomplete` and `MedicineAutocomplete`.
- **Integration Points:**
  1. Global Injections (`charmInjectionsGlobal.tsx`): Fix search filter to search injection name, and integrate `CatalogAutocomplete` in Add Order.
  2. Patient Dashboard Injections (`clinicalWorkflows.tsx`): `AddInjectionModal` and `AddPatientInjectionOrderModal`.
  3. Patient Prescriptions & Medication Orders: `AddPrescriptionModal` in `clinicalWorkflows.tsx`, `AddPrescriptionModal` in `charmTemplates.tsx`, and `RecordForm` in `forms.tsx`.
  4. Inventory Intake: `AddInventoryModal` and `BulkInventoryModal` in `frontend/src/inventory/`.
  5. Clinical Orders: Lab, Imaging, and Injection order selection.

---

### Task 1: Backend Central Catalogue Search Service

**Files:**
- Create: `backend/app/catalogue_service.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/clinical.py`
- Modify: `backend/app/identity.py`

**Steps:**
- [ ] Create `backend/app/catalogue_service.py` implementing `search_catalogue(db, facility_id, q, search_type, limit)`.
- [ ] Support search types: `all`, `medicine` (`drug`, `medication`), `injection`, `inventory`, `lab`, `imaging`, `vaccine`.
- [ ] Unify search across `InjectionCatalog`, `MedicineCatalog`, `Catalog`, and `InventoryItem`.
- [ ] Implement case-insensitive, partial-match, whitespace-tolerant matching across `name`, `trade_name`, `normalized_name`, `product_code`.
- [ ] Mount route `GET /api/catalogue/search` in `main.py` / `catalogue_service.py`.
- [ ] In `backend/app/clinical.py`, ensure `GET /api/injections/catalog` matches all active injection records regardless of casing.
- [ ] In `backend/app/identity.py`, ensure `GET /api/catalogs?kind=medication` and `kind=injection` query both local facility catalogs and master formulary/injection tables so no records are missed.

---

### Task 2: Universal Frontend Component `<CatalogAutocomplete />`

**Files:**
- Create: `frontend/src/components/CatalogAutocomplete.tsx`
- Modify: `frontend/src/InjectionAutocomplete.tsx`
- Modify: `frontend/src/inventory/MedicineAutocomplete.tsx`

**Steps:**
- [ ] Build `CatalogAutocomplete.tsx` supporting `type="all" | "medicine" | "injection" | "inventory" | "lab" | "imaging" | "vaccine"`.
- [ ] Add debounced search (150ms), loading spinner, keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), click-outside closing.
- [ ] Display rich metadata: item name, trade name, strength, route, dose form, and type badge (`Medication`, `Injection`, `Inventory`, etc.).
- [ ] Set `z-index: 99999` and absolute styling to guarantee no clipping in modals.
- [ ] Maintain `catalogueId` / `id` link indicator.
- [ ] Update `InjectionAutocomplete.tsx` and `MedicineAutocomplete.tsx` to wrap or delegate cleanly to `CatalogAutocomplete` ensuring 100% backward compatibility.

---

### Task 3: Global Injection Module Search & Orders Integration

**Files:**
- Modify: `frontend/src/charmInjectionsGlobal.tsx`

**Steps:**
- [ ] In `charmInjectionsGlobal.tsx` (lines 213-225), update `filteredInjections` search filter so the search bar matches drug name, injection catalogue name, lot number, and doctor name in addition to patient name/MRN.
- [ ] In `AddInjectionOrderModal`, connect `CatalogAutocomplete` with `type="injection"` and ensure `catalogue_id` is preserved when saving.
- [ ] In `QuickAdministerModal`, ensure `catalogue_id` is passed to the backend injection record.

---

### Task 4: Patient Dashboard Injections & Medication Search Integration

**Files:**
- Modify: `frontend/src/clinicalWorkflows.tsx`
- Modify: `frontend/src/charmTemplates.tsx`
- Modify: `frontend/src/forms.tsx`

**Steps:**
- [ ] In `clinicalWorkflows.tsx` (`AddInjectionModal` & `AddPatientInjectionOrderModal`), ensure injection selection uses centralized autocomplete with `type="injection"` and auto-populates dosage/strength/route.
- [ ] In `clinicalWorkflows.tsx` (`AddPrescriptionModal`), replace the basic 8-item catalog dropdown with `<CatalogAutocomplete type="medicine" ... />` so all 219 master medicines + practice formulary are searchable with live dropdown.
- [ ] In `charmTemplates.tsx` (`AddPrescriptionModal`), replace the raw `<input placeholder="Enter Trade Name">` on line 1142 with `<CatalogAutocomplete type="medicine" ... />`.
- [ ] In `forms.tsx` (`DynamicForm`), add support for catalogue autocomplete on medication and injection record forms.

---

### Task 5: Testing & Verification

**Files:**
- Modify: `backend/tests/test_workflows.py`

**Steps:**
- [ ] Add `test_centralized_catalogue_search` in `backend/tests/test_workflows.py` verifying:
  - Injection search for "Deform" returns "Deform 20ml" with catalogue ID.
  - Medicine search for "ISOSORBIDE" and "Atorva" returns exact records.
  - Multi-category search (`type="all"`).
- [ ] Run pytest: `cd backend; $env:PYTHONPATH="."; pytest tests`.
- [ ] Run TypeScript check: `cd frontend; npx tsc -b`.
- [ ] Run frontend build: `cd frontend; npm run build`.
- [ ] Verify live endpoints on ports 8000 and 5173.

