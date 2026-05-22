# Carpetas V2 Local Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let journalists and investigators manage multiple private local carpetas, switch between them clearly, and keep the existing Explorer save flow compatible.

**Architecture:** Keep the workflow browser-local for this slice. Add a small collection wrapper around existing `InvestigationWorkspace` records in `src/lib/client/investigationWorkspaceStorage.ts`, migrate the previous single-workspace key on read, and update `InvestigationsView` to render a visible carpeta selector without adding auth or a database.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, browser `localStorage`, repo-local CSS modules.

---

## Files

- Modify: `src/lib/client/investigationWorkspaceStorage.ts`
- Modify: `src/components/Investigations/InvestigationsView.tsx`
- Modify: `src/components/Investigations/InvestigationsChrome.tsx`
- Modify: `src/components/Investigations/InvestigationsView.module.css`
- Modify: `tests/investigationWorkspaceStorage.test.ts`
- Modify: `tests/investigationsViewIntegration.test.ts`

## Task 1: Storage Collection

- [x] **Step 1: Write failing tests**

Add tests in `tests/investigationWorkspaceStorage.test.ts` proving that:

- `readStoredInvestigationWorkspaceCollection()` migrates the existing single workspace key into a collection with `activeWorkspaceId`.
- `writeStoredInvestigationWorkspace()` upserts the active workspace without deleting other carpetas.
- `addCaseToStoredInvestigationWorkspace()` adds a case to the active carpeta.

Run:

```bash
node --experimental-strip-types --test tests/investigationWorkspaceStorage.test.ts
```

Expected: FAIL because collection helpers do not exist yet.

- [x] **Step 2: Implement minimal storage helpers**

Add:

- `INVESTIGATION_WORKSPACE_COLLECTION_STORAGE_KEY`
- `StoredInvestigationWorkspaceCollection`
- `readStoredInvestigationWorkspaceCollection`
- `writeStoredInvestigationWorkspaceCollection`
- `selectStoredInvestigationWorkspace`

Keep `readStoredInvestigationWorkspace`, `writeStoredInvestigationWorkspace`, and `addCaseToStoredInvestigationWorkspace` as compatible wrappers.

- [x] **Step 3: Verify focused tests pass**

Run:

```bash
node --experimental-strip-types --test tests/investigationWorkspaceStorage.test.ts
```

Expected: PASS.

## Task 2: Visible Multi-Carpeta UI

- [x] **Step 1: Write failing integration assertions**

Update `tests/investigationsViewIntegration.test.ts` to require:

- `readStoredInvestigationWorkspaceCollection`
- `writeStoredInvestigationWorkspaceCollection`
- `WorkspaceSwitcher`
- `Nueva carpeta`
- `Seleccionar carpeta`
- `Carpetas guardadas`

Run:

```bash
node --experimental-strip-types --test tests/investigationsViewIntegration.test.ts
```

Expected: FAIL because the UI still has a single active workspace.

- [x] **Step 2: Update `InvestigationsView` state**

Replace the single `workspace` state with:

- `workspaces`
- `activeWorkspaceId`
- `isCreatingWorkspace`

Derive `workspace` from the active id, and persist the full collection when the active workspace changes.

- [x] **Step 3: Add selector controls**

Add a `WorkspaceSwitcher` in `InvestigationsChrome.tsx` and render it in the sidebar. It should show existing carpetas with case/note counts, select a carpeta, and expose a visible `Nueva carpeta` action.

- [x] **Step 4: Add compact CSS**

Add sidebar-safe styles for the switcher. It must stay inside the sidebar, use stable dimensions, and keep long carpeta titles truncated.

- [x] **Step 5: Verify focused tests pass**

Run:

```bash
node --experimental-strip-types --test tests/investigationsViewIntegration.test.ts tests/investigationWorkspaceStorage.test.ts
```

Expected: PASS.

## Task 3: Product Validation

- [x] **Step 1: Run the release checks**

```bash
npm test
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 2: Commit and push**

```bash
git add docs/superpowers/plans/2026-05-22-carpetas-v2-local-workbench.md src/lib/client/investigationWorkspaceStorage.ts src/components/Investigations/InvestigationsView.tsx src/components/Investigations/InvestigationsChrome.tsx src/components/Investigations/InvestigationsView.module.css tests/investigationWorkspaceStorage.test.ts tests/investigationsViewIntegration.test.ts
git commit -m "Add local multi-carpeta workspace switcher"
git push argentina HEAD:main
```
