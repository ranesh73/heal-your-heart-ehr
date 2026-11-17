## Pull Request Description
<!-- Provide a clear summary of changes, motivation, and context. -->

### Changes Summary
- 

---

## 4-Person Team Guardrail & Hygiene Checklist
Before merging into `main`, ensure each of the following verification checks is completed:

- [ ] **Interactive Handlers & Modals:** Every new or modified button, dropdown item, and three-dot (`...`) menu action opens its intended view/modal and persists end-to-end.
- [ ] **Modal Spacing & Alignment:** All modals render with aligned headers, top-right `×` close button, single scrollbar, and visible pinned footer (no broad child selectors like `.modal > div` or `.modal > form` added to `styles.css`).
- [ ] **Database Migration Linear Chain:** Ran `alembic heads` from `backend/` and confirmed a single linear head with no split branches.
- [ ] **Automated Tests:** Ran `pytest` from `backend/` and confirmed 100% test pass rate with no regressions.
- [ ] **Frontend Build Verification:** Ran `npm run build` (`tsc -b && vite build`) in `frontend/` and confirmed 0 errors and 0 unused variable warnings.
- [ ] **Zero Conflict Markers:** Confirmed no residual Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) exist in the PR.
