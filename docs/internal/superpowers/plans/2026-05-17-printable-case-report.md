# Printable Case Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plain-language, print-ready case report that non-technical Faro users can save as a PDF.

**Architecture:** Build a small report view model from the existing expediente and evidence pack data, then render it in a dedicated App Router page with print CSS. Keep JSON exports as technical evidence, but make the report the primary user-facing download action.

**Tech Stack:** Next.js App Router, React server components, existing Faro data repository, Node test runner, CSS modules, no new dependency.

---

### Task 1: Report View Model

**Files:**
- Create: `src/lib/data/caseReport.ts`
- Modify: `src/lib/data/expediente.ts`
- Modify: `src/lib/caseRepository.ts`
- Test: `tests/caseReport.test.ts`
- Test: `tests/exportBundles.test.ts`

- [ ] Add failing tests for `getCaseReportById`, `reportHref`, contextual journalism separation, technical appendix, and non-accusatory copy.
- [ ] Implement `buildCaseReportView` from `buildExpediente`, receipts, signals, caveats, next steps, and contextual citations.
- [ ] Add `reportHref` to expediente actions and repository accessors.

### Task 2: Printable Route

**Files:**
- Create: `src/app/expediente/[id]/informe/page.tsx`
- Create: `src/components/PrintableCaseReport.tsx`
- Create: `src/components/PrintableCaseReport.module.css`
- Create: `src/components/ReportPrintButton.tsx`
- Test: `tests/printableCaseReport.test.ts`

- [ ] Add failing source-level tests that the page uses the report view model, includes a print button, and keeps technical JSON secondary.
- [ ] Render a calm report with sections: summary, key facts, why it appeared, official trail, journalism context, next verification, and appendix.
- [ ] Add print styles that hide browser-only controls and fit the report on white paper.

### Task 3: Product Actions

**Files:**
- Modify: `src/components/CaseDetails.tsx`
- Modify: `src/components/CaseInspector.tsx`
- Modify: `src/components/Explorer/ExplorerView.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/Explorer/Explorer.module.css`
- Test: `tests/caseInspector.test.ts`
- Test: `tests/explorerViewIntegration.test.ts`

- [ ] Add failing tests for visible report links in Explorer and inspector actions.
- [ ] Make `Informe PDF` / `Guardar PDF` the primary non-technical action.
- [ ] Keep `JSON técnico` available but visually secondary.

### Task 4: Verification

**Files:**
- No production files.

- [ ] Run focused report, inspector, export, and explorer tests.
- [ ] Run `npm run data:verify`, `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Open the local report route in a browser and verify the printable surface renders.
