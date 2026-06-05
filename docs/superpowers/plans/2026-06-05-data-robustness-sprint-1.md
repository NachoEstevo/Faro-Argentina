# Data Robustness Sprint 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic evidence-claim matrix and aggregate coverage so Faro shows exactly what each expediente can and cannot support.

**Architecture:** Add one focused data module under `src/lib/data` and thread it through existing expediente/report/export/quality builders. Keep route handlers and UI untouched for this sprint; JSON/report payloads become stronger without changing the visual product.

**Tech Stack:** TypeScript, Node test runner, existing Faro generated case files and receipts.

---

### Task 1: Evidence Claim Matrix

**Files:**
- Create: `src/lib/data/evidenceClaimMatrix.ts`
- Test: `tests/evidenceClaimMatrix.test.ts`

- [ ] Write failing tests for supported supplier/competition/location claims, unsupported payment, and partial BAPIN budget trail.
- [ ] Run `node --experimental-strip-types --test tests/evidenceClaimMatrix.test.ts` and confirm failure because the module does not exist.
- [ ] Implement `buildEvidenceClaimMatrix(caseFile, options?)` with no fuzzy joins and no external fetches.
- [ ] Re-run the focused test until green.

### Task 2: Product Payload Integration

**Files:**
- Modify: `src/lib/data/expediente.ts`
- Modify: `src/lib/data/caseReport.ts`
- Modify: `src/lib/caseRepository.ts`
- Test: `tests/expediente.test.ts`
- Test: `tests/caseReport.test.ts`
- Test: `tests/exportBundles.test.ts`

- [ ] Extend `ExpedienteView`, `CaseReportView`, and `EvidencePack` with `claimMatrix`.
- [ ] Add tests proving the claim matrix is present and that payment remains unsupported in exports.
- [ ] Run focused tests for expediente/report/export.

### Task 3: Aggregate Data Quality Coverage

**Files:**
- Modify: `src/lib/data/dataQualityReport.ts`
- Modify: `scripts/report-data-quality.ts`
- Test: `tests/dataQualityReport.test.ts`

- [ ] Add `claimCoverage` to the country-level quality report.
- [ ] Count supported, partial and not-supported claim states by claim code.
- [ ] Add tests for coverage counts and blockers preserving visibility.
- [ ] Run `node --experimental-strip-types --test tests/dataQualityReport.test.ts`.

### Task 4: Source Admission Documentation

**Files:**
- Modify: `docs/product/faro-product-context.md`
- Modify: `docs/operations/production-runbook.md`
- Modify: `README.md`

- [ ] Document the matrix as the operating contract for claims.
- [ ] Document BAPIN/Presupuesto Abierto as a prototype lane only.
- [ ] Document that payment verification requires a future source that explicitly supports provider-level payment.

### Task 5: Validation

**Commands:**
- `npm run data:verify`
- `npm run data:geo-report`
- `npm run data:quality-report`
- `npm test`
- `npm run typecheck`
- `npm run build`

- [ ] Run all commands.
- [ ] Fix only failures related to this sprint.
- [ ] Review the final diff for overclaiming, invented data, unrelated changes and user-facing trust regressions.
