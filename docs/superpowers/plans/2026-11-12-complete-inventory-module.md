# Complete Inventory Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive, production-quality, database-connected Inventory Management module integrated into Heal Your Heart EHR, including Inventory, Supplier, Category, and Reports tabs, two-column Add Inventory, Bulk Add Inventory, and idempotent import and searchable autocomplete for all 219 medicine master records.

**Architecture:** Extend existing SQLAlchemy models (`InventoryItem`, `StockMovement`, `InventoryRequisition`) with dedicated tables (`InventoryBatch`, `InventorySupplier`, `InventoryCategory`, `MedicineCatalog`, `InventoryReportExport`) via Alembic. Implement modular REST APIs in `backend/app/operations.py` with Pydantic validation in `schemas.py`. Build a professional React interface in `frontend/src/inventory/` matching Heal Your Heart's teal visual identity with 4 tabs, advanced multi-field autocomplete, and batch-level stock tracking.

**Tech Stack:** Python 3, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, React 19, TypeScript 5.7, Vite, Lucide-react, TanStack React Query.

**Spec:** User prompt in current conversation thread (`HEAL YOUR HEART EHR — COMPLETE INVENTORY MODULE IMPLEMENTATION`).

## Global Constraints

- Never modify, rename, replace, or delete `scripts/sync_master_db.py`.
- The mandatory database workflow commands remain: `git pull origin main` and `python scripts/sync_master_db.py`.
- Never create a parallel database, mock database, or temporary database. Single source of truth is `backend/data/ehr.db`.
- All 219 medicine records must be imported exactly as provided without altering spelling or fabricating stock/quantities.
- Prescribing a medication in an encounter must NOT silently reduce stock; only dispensing/stock-out transactions affect stock.
- All migrations must be non-destructive and reversible.
- All seed scripts must be strictly idempotent.
- Frontend must build with 0 TypeScript/build errors (`npx tsc -b && vite build`).
- Backend must pass Pyrefly type checking (`pyrefly check backend/app/`) and all pytest tests.

## Review Focus

1. **Autocomplete dropdown clipping:** Autocomplete dropdown in modals must use `z-index: 9999` and absolute positioning to avoid modal overflow clipping.
2. **Batch traceability:** Multiple batches for the same product must retain distinct batch numbers, expiry dates, and costs, with product stock calculated as sum of movements.
3. **Negative stock prevention:** Stock movements that would drive an inventory balance below zero must be rejected with HTTP 409 unless explicitly authorized.
4. **Catalogue-to-Product separation:** The 219 medicine catalogue entries must serve as a search formulary and must not automatically create artificial stock batches.
5. **Multi-facility isolation:** Inventory items, batches, movements, and suppliers must be scoped to the authenticated user's active facility (`c.facility_id`).

---

### Task 1: Database Models & Alembic Migration

**Files:**
- Create: `backend/migrations/versions/20261112_complete_inventory_module.py`
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`

**Steps:**
- [ ] Define `InventorySupplier`, `InventoryCategory`, `InventoryBatch`, `MedicineCatalog`, and `InventoryReportExport` in `backend/app/models.py`.
- [ ] Add new fields to `InventoryItem` (`group_name`, `product_code`, `hsn_code`, `trade_name`, `strength`, `strength_unit`, `route`, `dose_form`, `tax_percent`, `order_quantity`, `cost_price`, `retail_price`, `is_active`, `manufacturer`).
- [ ] Add `batch_id`, `batch_number`, `movement_type`, `reference` to `StockMovement` in `backend/app/models.py`.
- [ ] Create Alembic migration script `backend/migrations/versions/20261112_complete_inventory_module.py` with `upgrade()` and `downgrade()` functions.
- [ ] Run `alembic upgrade head` and verify tables in SQLite database `backend/data/ehr.db`.
- [ ] Add Pydantic validation schemas in `backend/app/schemas.py` for Product, Stock Batch, Bulk Entry, Supplier, Category, and Report Export.

---

### Task 2: 219 Medicine Master Catalogue & Idempotent Seeding

**Files:**
- Create: `scripts/seed_medicine_catalogs.py`
- Modify: `backend/app/seed.py`

**Steps:**
- [ ] Write `scripts/seed_medicine_catalogs.py` embedding all 219 exact `Product Name | Trade Name` records.
- [ ] Implement idempotent insertion into both `medicine_catalogs` table and `catalogs` table (`kind='medication'`).
- [ ] Execute `python scripts/seed_medicine_catalogs.py` and verify count = 219 records.
- [ ] Verify repeated execution produces exactly 219 records with 0 duplicates.

---

### Task 3: Backend REST APIs for Complete Inventory Module

**Files:**
- Modify: `backend/app/operations.py`

**Steps:**
- [ ] Implement `GET /api/inventory` supporting category filter, status filter, and search query `q`.
- [ ] Implement `POST /api/inventory` (create product + optional opening stock batch).
- [ ] Implement `PATCH /api/inventory/{identifier}` and `DELETE /api/inventory/{identifier}` (soft-delete / toggle active).
- [ ] Implement `GET /api/inventory/suppliers` and `POST /api/inventory/suppliers`.
- [ ] Implement `PATCH /api/inventory/suppliers/{identifier}` and `DELETE /api/inventory/suppliers/{identifier}`.
- [ ] Implement `GET /api/inventory/categories` and `POST /api/inventory/categories`.
- [ ] Implement `PATCH /api/inventory/categories/{identifier}` and `DELETE /api/inventory/categories/{identifier}`.
- [ ] Implement `POST /api/inventory/batches` and `GET /api/inventory/items/{identifier}/batches`.
- [ ] Implement `POST /api/inventory/bulk` to process multiple product/stock rows in a single database transaction.
- [ ] Implement `GET /api/inventory/reports/{report_type}` (Received List, Stock Flow, Inventory by Product, Inventory by Batch, Reorder Level, Reorder Level by Supplier, Expiry Report).
- [ ] Implement `GET /api/inventory/reports/export-history` and `POST /api/inventory/reports/export-history`.
- [ ] Implement `GET /api/inventory/medicines/catalog` for multi-field case-insensitive autocomplete across the 219 medicines.

---

### Task 4: Medicine & Product Autocomplete Component

**Files:**
- Create: `frontend/src/inventory/MedicineAutocomplete.tsx`

**Steps:**
- [ ] Build `MedicineAutocomplete` querying `/api/inventory/medicines/catalog?q=...`.
- [ ] Support debounced search (200ms), outside-click closing, and keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- [ ] Render matching product name and trade name in suggestion item with badge.
- [ ] Apply `z-index: 9999` and positioning to prevent modal clipping.
- [ ] Connect selection callback to populate `product_name`, `trade_name`, `dose_form`, etc.

---

### Task 5: Inventory Tab & Primary Data Table

**Files:**
- Create: `frontend/src/inventory/InventoryListTab.tsx`
- Create: `frontend/src/inventory/ProductDetailsModal.tsx`
- Create: `frontend/src/inventory/BatchListModal.tsx`
- Create: `frontend/src/inventory/StockMovementModal.tsx`

**Steps:**
- [ ] Build `InventoryListTab` with Header, `+ Inventory` button, and `+ Bulk Inventory` button.
- [ ] Implement 3 filters: Category dropdown, Status dropdown (All, Active, Inactive, Low Stock, Out of Stock), and Product search.
- [ ] Build 8-column data table: Checkbox, Product Name, Category, Latest Retail Price, Stock Quantity, Reorder Level, Quantity to be Ordered, Actions.
- [ ] Implement stock status badges: In Stock (green), Low Stock (amber), Out of Stock (red), Expired (rose), Inactive (gray).
- [ ] Build 3-dot row action menu: View Details, Edit Product, Add Stock, View Batches, Stock Movement History, Deactivate/Activate.
- [ ] Build `ProductDetailsModal`, `BatchListModal`, and `StockMovementModal`.

---

### Task 6: Add Inventory & Bulk Add Inventory Interfaces

**Files:**
- Create: `frontend/src/inventory/AddInventoryModal.tsx`
- Create: `frontend/src/inventory/BulkInventoryModal.tsx`

**Steps:**
- [ ] Build `AddInventoryModal` with two distinct columns:
  - Left: Product Details (Group, Category*, Product Name* with `MedicineAutocomplete`, Product ID, HSN Code, Trade Name, Strength, Strength Unit, Route, Dose Form, Tax, Reorder Level, Order Quantity).
  - Right: Stock Details (Stock Received Date*, Supplier dropdown with Add Supplier shortcut, Batch Number, Expiry Date, Quantity*, Cost Price / Item, Retail Price / Item*, Manufacturer, Storage Location, Pack, Reference Number).
- [ ] Implement `BulkInventoryModal` with shared top fields (Group, Category, Supplier, Received Date) and repeating rows supporting all 21 fields with Add Row, Remove Row, Copy Row, row-level validation, and atomic bulk save.

---

### Task 7: Supplier & Category Management Tabs

**Files:**
- Create: `frontend/src/inventory/SupplierTab.tsx`
- Create: `frontend/src/inventory/CategoryTab.tsx`
- Create: `frontend/src/inventory/SupplierModal.tsx`
- Create: `frontend/src/inventory/CategoryModal.tsx`

**Steps:**
- [ ] Build `SupplierTab` with 7-column table (Supplier Name, Contact Person, Contact Numbers [Work, Mobile, Fax], Address, Email, Notes, Actions).
- [ ] Build `SupplierModal` with field validation (required name, email regex, phone formatting).
- [ ] Wire immediate dropdown refresh so new suppliers are selectable in Add/Bulk inventory without page reload.
- [ ] Build `CategoryTab` with 4-column table (Category, Group, Description, Actions).
- [ ] Build `CategoryModal` with group dropdown and category name validation.

---

### Task 8: Reports & Export History Tab

**Files:**
- Create: `frontend/src/inventory/ReportsTab.tsx`

**Steps:**
- [ ] Build `ReportsTab` with internal tabs: `Reports` and `Reports Export History`.
- [ ] Implement 7 reports with date filters, category/supplier filters, summary metrics, and data tables:
  1. Received List Report
  2. Stock Flow Report
  3. Inventory Report (by Product)
  4. Inventory Report (by Batch)
  5. Reorder Level Report
  6. Reorder Level Report By Supplier
  7. Inventory Expiry Report
- [ ] Implement direct export for date periods <= 3 months and scheduled job export for periods > 3 months.
- [ ] Build Export History listing with report name, requested by, date range, status, and download action.

---

### Task 9: Complete Inventory Module Root & Global Navigation Integration

**Files:**
- Create: `frontend/src/inventory/InventoryPage.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/operations.tsx`

**Steps:**
- [ ] Build root `InventoryPage` in `frontend/src/inventory/InventoryPage.tsx` assembling the 4 horizontal tabs: Inventory, Supplier, Category, Reports.
- [ ] Apply authentic Heal Your Heart teal styling, subheaders, and responsive tabs.
- [ ] In `frontend/src/main.tsx`, verify exactly ONE Inventory tile on the global dashboard with route `/inventory` and icon `Package`.
- [ ] Route `/inventory` to the new `InventoryPage` in `frontend/src/main.tsx` and preserve compatibility in `operations.tsx`.

---

### Task 10: Verification, Build, Tests & Regression Audit

**Files:**
- Test scripts: `backend/tests/test_inventory_complete.py`

**Steps:**
- [ ] Write and run `backend/tests/test_inventory_complete.py` covering:
  - Database persistence and migrations.
  - All 219 medicine catalogue records present and searchable.
  - Category and Supplier CRUD.
  - Product creation, batch creation, and stock balance calculation.
  - Negative stock protection.
  - Bulk inventory entry.
  - Reports querying and export history.
- [ ] Run full existing test suite (`pytest tests`).
- [ ] Run Pyrefly static check on backend (`pyrefly check backend/app/`).
- [ ] Run TypeScript compilation check (`npx tsc -b`).
- [ ] Run frontend production build (`npm run build`).
- [ ] Verify regression on Patients, Appointments, Encounters, Injections, and Billing.
- [ ] Prepare comprehensive final delivery report.

