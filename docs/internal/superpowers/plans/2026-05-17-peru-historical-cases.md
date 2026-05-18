# Peru Historical Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, verified set of older Peru OECE contract expedientes for each year from 2018 through 2024 without importing the full historical corpus into the app.

**Architecture:** Keep the official XLSX downloads as upstream sources, but version only a compact selected snapshot with row-level receipts. Selection is deterministic and conservative: high-value PEN contracts per year with official contract URL, contract code, tender code, supplier document and signed/publication year. OCDS releases are fetched only for selected tender IDs, and map exposure still uses existing official administrative centroid rules.

**Tech Stack:** TypeScript data scripts, Node built-in test runner, existing Faro receipt/data-spine verifier, official OECE XLSX/OCDS endpoints.

---

### Task 1: XLSX Streaming Reader

**Files:**
- Modify: `src/lib/data/xlsx.ts`
- Test: `tests/xlsx.test.ts`

- [ ] Add a failing test that calls `readXlsxRowsStreamed` on the official 2025 OECE workbook and filters rows by high amount without loading the whole sheet XML through `Buffer.toString()`.
- [ ] Implement a streaming row visitor over the XLSX worksheet entry using the existing ZIP metadata parser and `node:zlib`.
- [ ] Run `node --experimental-strip-types --test tests/xlsx.test.ts` and confirm the existing XLSX tests still pass.

### Task 2: Deterministic Peru Historical Selector

**Files:**
- Create: `src/lib/data/peruHistoricalContracts.ts`
- Test: `tests/peruHistoricalContracts.test.ts`

- [ ] Add a failing test proving the selector returns a fixed number of high-value, complete rows for each requested year.
- [ ] Add a failing test proving it excludes rows without official URL, amount, contract code, tender code, supplier document, or matching year.
- [ ] Implement `selectPeruHistoricalContracts` with explicit `reasons`, `rank`, `score`, and `sourceYear`.
- [ ] Run `node --experimental-strip-types --test tests/peruHistoricalContracts.test.ts`.

### Task 3: Fetch Compact Historical Snapshot

**Files:**
- Create: `scripts/fetch-peru-historical-contracts.ts`
- Modify: `package.json`
- Generate: `data/official/pe/oece-contratos-historicos-seleccionados.json`
- Generate: `data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json`

- [ ] Add a script that downloads OECE contract XLSX files for 2018-2024 to memory, streams rows, selects a bounded number per year, fetches OCDS releases for the selected tender IDs, and writes compact JSON snapshots.
- [ ] Add `data:fetch:pe-historical` to `package.json`.
- [ ] Run the script and inspect the generated year counts before using it in the build.

### Task 4: Build Historical Cases Into Faro

**Files:**
- Modify: `scripts/build-cross-country-cases.ts`
- Modify: `data/sources/source-catalog.json`
- Generate: `src/data/crossCountryCaseFiles.json`

- [ ] Add a source catalog entry for `PE-OECE-CONTRATOS-HISTORICOS`.
- [ ] Read the selected historical snapshot and build cases using the existing `buildPeruContractCases` path.
- [ ] Add the historical OCDS snapshot as related receipt evidence.
- [ ] Dedupe against current PE contract cases by final case ID.
- [ ] Run `npm run data:build`.

### Task 5: Verification And Audit

**Files:**
- Test: `tests/dataSpineVerifier.test.ts`
- Test: `tests/crossCountryCases.test.ts`
- Test: `tests/peruHistoricalContracts.test.ts`

- [ ] Add a test asserting PE has cases in each year from 2018 through 2024.
- [ ] Run `node --experimental-strip-types --test tests/peruHistoricalContracts.test.ts tests/xlsx.test.ts tests/crossCountryCases.test.ts`.
- [ ] Run `npm run data:verify`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Manually review a sample of selected historical rows for obvious false positives before reporting completion.
