# Data Robustness Sprint 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to implement this plan task-by-task. This plan intentionally avoids new
> production ingestion unless official receipts and keys are available.

**Goal:** Add a conservative investigation checklist that turns Faro's evidence
claim matrix into actionable next steps, source-crossing readiness and quality
coverage without overclaiming.

**Architecture:** Add one focused data module under `src/lib/data`, thread it
through existing expediente/report/export builders, render a compact Explorer
panel, and extend the data-quality report. Keep route handlers thin and avoid
new dependencies.

**Tech Stack:** TypeScript, Node test runner, existing generated case files and
official receipts.

---

### Task 1: Case Investigation Checklist

**Files:**
- Create: `src/lib/data/caseInvestigationChecklist.ts`
- Test: `tests/caseInvestigationChecklist.test.ts`

- [x] Write failing tests for Mapa+BAPIN follow-up, contract-without-BAPIN gap,
      payment remaining unsupported, and banned accusatory copy.
- [x] Run focused test and confirm failure.
- [x] Implement deterministic checklist from `EvidenceClaimMatrix` and case
      fields only.
- [x] Re-run focused test until green.

### Task 2: Product Payload Integration

**Files:**
- Modify: `src/lib/data/expediente.ts`
- Modify: `src/lib/data/caseReport.ts`
- Modify: `src/lib/caseRepository.ts`
- Tests: `tests/expediente.test.ts`, `tests/caseReport.test.ts`,
  `tests/exportBundles.test.ts`

- [x] Add `investigationChecklist` to expediente, case report and evidence pack.
- [x] Test that exports preserve next-step and do-not-claim context.
- [x] Test that Presupuesto Abierto appears only as a candidate follow-up.

### Task 3: Explorer And Printable Report Surface

**Files:**
- Modify: `src/components/Explorer/ExplorerView.tsx`
- Modify: `src/components/Explorer/Explorer.module.css`
- Modify: `src/components/PrintableCaseReport.tsx`
- Modify: `src/components/PrintableCaseReport.module.css`
- Tests: `tests/explorerViewIntegration.test.ts`,
  `tests/printableCaseReport.test.ts`

- [x] Render a compact "Brechas y proximos cruces" panel in Explorer.
- [x] Render the same information in printable reports with white-background
      printable styling.
- [x] Keep UI copy restrained and non-accusatory.

### Task 4: Aggregate Data Quality Coverage

**Files:**
- Modify: `src/lib/data/dataQualityReport.ts`
- Test: `tests/dataQualityReport.test.ts`

- [x] Add country-level `investigationReadiness` counts.
- [x] Add `sourceFollowUps` counts by candidate source.
- [x] Add BAPIN potential count without marking it integrated.

### Task 5: Documentation

**Files:**
- Modify: `docs/product/faro-product-context.md`
- Modify: `docs/operations/production-runbook.md`
- Modify: `README.md`

- [x] Document the checklist as an operational layer over the claim matrix.
- [x] Document Presupuesto Abierto/BAPIN as candidate follow-up until query
      receipts exist.
- [x] Document that no-row results are data gaps, not zero execution.

### Task 6: Validation And Review

**Commands:**
- `node --experimental-strip-types --test tests/caseInvestigationChecklist.test.ts`
- `node --experimental-strip-types --test tests/expediente.test.ts tests/caseReport.test.ts tests/exportBundles.test.ts tests/explorerViewIntegration.test.ts tests/printableCaseReport.test.ts tests/dataQualityReport.test.ts`
- `npm run data:verify`
- `npm run data:geo-report`
- `npm run data:quality-report`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

- [x] Fix only failures related to this sprint.
- [x] Review diff for overclaiming, fuzzy joins, invented data and unrelated
      churn.
- [x] Confirm whether the local app is already running; if not, start it and
      visually inspect Explorer/report surfaces.
