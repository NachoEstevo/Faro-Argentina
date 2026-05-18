# Data Spine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Faro's official-data spine so every visible case can be traced from source catalog to raw snapshot, schema profile, receipt, canonical record and exportable evidence pack.

**Architecture:** Keep ingestion and normalization as small TypeScript modules first, backed by JSON artifacts that can later move to Postgres. The UI reads generated case files, while scripts own snapshots, hashes, schema profiling and receipts.

**Tech Stack:** Next.js, TypeScript, Node test runner, official CSV/API snapshots, JSON artifacts.

---

### Task 1: Source Catalog Contract

**Files:**
- Create: `src/lib/data/sourceCatalog.ts`
- Create: `data/sources/source-catalog.json`
- Test: `tests/sourceCatalog.test.ts`

**Step 1: Write the failing test**

Assert that the source catalog:
- contains Argentina, Peru and Chile MVP sources;
- rejects duplicate `sourceId`;
- requires official URLs and a declared access mode;
- groups sources by country and priority.

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: fail because `sourceCatalog.ts` does not exist.

**Step 3: Implement minimal catalog loader and validator**

Implement simple functions:
- `loadSourceCatalog`
- `validateSourceCatalog`
- `getMvpSourcesByCountry`

**Step 4: Run tests**

Run: `npm test`

Expected: pass.

### Task 2: Snapshot and Schema Profile Contract

**Files:**
- Create: `src/lib/data/snapshots.ts`
- Create: `tests/snapshots.test.ts`
- Modify: `scripts/build-argentina-work-cases.ts`

**Step 1: Write failing tests**

Assert that a raw CSV snapshot produces:
- SHA-256 hash;
- byte size;
- observed columns;
- row count;
- missing/empty ratio for key columns.

**Step 2: Implement minimal snapshot profiler**

Use existing `parseCsv` and Node `crypto`.

**Step 3: Connect Argentina work build script**

Write source metadata into the generated dataset using the snapshot profile, not ad hoc fields.

### Task 3: Evidence Receipt Contract

**Files:**
- Create: `src/lib/data/evidenceReceipts.ts`
- Create: `tests/evidenceReceipts.test.ts`
- Modify: `src/lib/data/argentinaWorks.ts`

**Step 1: Write failing tests**

Assert that every generated case:
- has a stable receipt id;
- has `locatorType`;
- has source URL, raw path, hash and parser version;
- includes caveats when locator is dataset-level.

**Step 2: Implement receipt helpers**

Create deterministic receipt IDs and locator types:
- `official_detail`
- `official_search`
- `official_dataset`
- `missing`

### Task 4: Canonical Records

**Files:**
- Create: `src/lib/data/canonicalRecords.ts`
- Create: `tests/canonicalRecords.test.ts`
- Modify: `src/lib/data/argentinaWorks.ts`

**Step 1: Write failing tests**

Assert that Argentina work rows produce canonical:
- `PublicWork`
- `PublicEntity`
- `GeoPoint`

**Step 2: Implement minimal canonical mapping**

Do not add generic abstractions beyond these real records.

### Task 5: Country Coverage Metrics

**Files:**
- Create: `src/lib/data/coverage.ts`
- Create: `tests/coverage.test.ts`
- Modify: `src/lib/caseRepository.ts`

**Step 1: Write failing tests**

Assert coverage reports:
- total sources;
- MVP source readiness;
- raw rows;
- records with coordinates;
- case files with receipts.

**Step 2: Implement coverage helpers**

Expose data for UI and future methodology panels.

### Task 6: Commit and Push

**Files:**
- All files above.

**Step 1: Run checks**

Run:
- `npm run data:build`
- `npm test`
- `npm run typecheck`
- `npm run build`

**Step 2: Commit**

Commit message: `Build Faro data spine`

**Step 3: Push**

Push branch `codex/data-spine` to origin.
