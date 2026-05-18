# Data Integrity And Quality Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Faro's data spine reproducible, measurable and honest enough to support more AR/PE/CL data without turning weak evidence into strong investigative claims.

**Architecture:** Fix evidence-byte reproducibility first, then rebuild generated datasets deterministically, then add a combined data-quality report and an auditable supplier identity layer. The UI should consume better-ranked data, but this sprint does not redesign UI.

**Tech Stack:** Next.js, TypeScript, Node test runner, static official snapshots under `data/official`, generated JSON datasets under `src/data`, existing Faro data modules.

---

## Current Baseline

Observed on 2026-05-17:

- Current branch: `codex/signal-hygiene-ranking`.
- Current uncommitted implementation work exists in signal ranking files.
- `npm run data:verify` checks 5 datasets, 371 cases, 633 receipts and 11 raw files.
- Current verifier failure has 266 errors:
  - 4 `raw file hash mismatch`;
  - 262 `related receipt hash mismatch`.
- Subagent read-only inspection found high-confidence line-ending drift:
  - several `data/official/**` text snapshots are LF in the working tree;
  - existing manifest/generated hashes match the CRLF version of those same files;
  - generated case files are stale relative to current raw bytes;
  - `source-catalog.json` key-field validation is not the failing cause.

The sprint should not run live `npm run data:fetch` as the first repair. Live fetch can change official data and make the debugging surface larger.

---

## Execution Strategy

Recommended execution:

1. Finish or isolate the current `codex/signal-hygiene-ranking` work before touching data files.
2. Execute Tasks 1-3 on a clean data-integrity branch or worktree.
3. After `npm run data:verify` and `tests/dataSpineVerifier.test.ts` pass, Tasks 4 and 5 can run in parallel with separate write sets.
4. Integrate, run the full validation gate, then update docs.

Subagent ownership if using subagent-driven execution:

- Worker A: Tasks 1-3 only. Owns `.gitattributes`, build timestamp helper, build scripts and generated data artifacts.
- Worker B: Task 4 only. Owns data quality report module, script and tests.
- Worker C: Task 5 only. Owns entity resolution module, signal context changes and tests.
- Parent agent: review diffs, run full validation, update docs, decide merge readiness.

Do not let workers edit the same files at the same time. In particular, Task 5 touches `src/lib/data/investigationSignalContext.ts`; Task 4 should not.

---

## File Map

Expected creates:

- `.gitattributes`
- `src/lib/data/dataBuildTimestamps.ts`
- `tests/dataBuildTimestamps.test.ts`
- `src/lib/data/dataQualityReport.ts`
- `tests/dataQualityReport.test.ts`
- `scripts/report-data-quality.ts`
- `src/lib/data/entityResolution.ts`
- `tests/entityResolution.test.ts`
- `docs/handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md`

Expected modifies:

- `package.json`
- `scripts/build-argentina-work-cases.ts`
- `scripts/build-cross-country-cases.ts`
- `src/lib/data/investigationSignalContext.ts`
- `src/lib/data/caseSignals.ts`
- `tests/caseSignals.test.ts`
- `tests/coverage.test.ts` only if the coverage report contract needs to reference the new report.
- `README.md`
- `docs/product/faro-product-context.md`

Expected generated data changes after Task 3:

- `src/data/argentinaWorkCases.json`
- `src/data/crossCountryCaseFiles.json`
- selected `data/official/**` text snapshots if their bytes must be restored to manifest CRLF.

---

### Task 1: Preserve Official Snapshot Bytes

**Files:**
- Create: `.gitattributes`

- [ ] **Step 1: Write the file**

Create `.gitattributes`:

```gitattributes
# Source, docs and generated metadata stay readable and deterministic.
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.json text eol=lf
*.md text eol=lf
*.css text eol=lf

# Official snapshots are evidence bytes. This override must come after
# generic patterns so JSON/CSV snapshots are not normalized by Git.
data/official/** -text
```

- [ ] **Step 2: Verify Git attributes**

Run:

```bash
git check-attr text -- \
  data/official/ar/onc-contratar-obras.csv \
  data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json \
  src/data/crossCountryCaseFiles.json
```

Expected:

```text
data/official/ar/onc-contratar-obras.csv: text: unset
data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json: text: unset
src/data/crossCountryCaseFiles.json: text: set
```

- [ ] **Step 3: Check that no unrelated files changed**

Run:

```bash
git status --short
```

Expected: `.gitattributes` is new. Existing prior work may still be present, but no new unrelated file should appear.

---

### Task 2: Make Data Build Timestamps Deterministic

**Files:**
- Create: `src/lib/data/dataBuildTimestamps.ts`
- Create: `tests/dataBuildTimestamps.test.ts`
- Modify: `scripts/build-argentina-work-cases.ts`
- Modify: `scripts/build-cross-country-cases.ts`

- [ ] **Step 1: Write the failing timestamp tests**

Create `tests/dataBuildTimestamps.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";

test("resolveDataBuildTimestamp prefers explicit env timestamp", () => {
  assert.equal(
    resolveDataBuildTimestamp({
      envTimestamp: "2026-05-17T12:30:00.000Z",
      manifestTimestamp: "2026-05-16T06:58:58.684Z",
    }),
    "2026-05-17T12:30:00.000Z",
  );
});

test("resolveDataBuildTimestamp falls back to manifest timestamp", () => {
  assert.equal(
    resolveDataBuildTimestamp({
      envTimestamp: undefined,
      manifestTimestamp: "2026-05-16T06:58:58.684Z",
    }),
    "2026-05-16T06:58:58.684Z",
  );
});

test("resolveDataBuildTimestamp rejects invalid explicit timestamp", () => {
  assert.throws(
    () => resolveDataBuildTimestamp({
      envTimestamp: "not-a-date",
      manifestTimestamp: "2026-05-16T06:58:58.684Z",
    }),
    /Invalid FARO_DATA_BUILD_TIMESTAMP/,
  );
});

test("resolveDataBuildTimestamp rejects missing deterministic inputs", () => {
  assert.throws(
    () => resolveDataBuildTimestamp({
      envTimestamp: undefined,
      manifestTimestamp: undefined,
    }),
    /missing snapshot manifest timestamp/,
  );
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --experimental-strip-types --test tests/dataBuildTimestamps.test.ts
```

Expected: fail because `dataBuildTimestamps.ts` does not exist.

- [ ] **Step 3: Implement timestamp resolver**

Create `src/lib/data/dataBuildTimestamps.ts`:

```ts
export function resolveDataBuildTimestamp({
  envTimestamp,
  manifestTimestamp,
}: {
  envTimestamp: string | undefined;
  manifestTimestamp: string | undefined;
}): string {
  const explicit = clean(envTimestamp);
  if (explicit) return assertIsoTimestamp(explicit, "Invalid FARO_DATA_BUILD_TIMESTAMP");

  const manifest = clean(manifestTimestamp);
  if (manifest) return assertIsoTimestamp(manifest, "Invalid snapshot manifest generatedAt");

  throw new Error("missing snapshot manifest timestamp");
}

function assertIsoTimestamp(value: string, message: string): string {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(message);
  return new Date(millis).toISOString();
}

function clean(value: string | undefined): string {
  return String(value ?? "").trim();
}
```

- [ ] **Step 4: Make both build scripts use the resolver**

In `scripts/build-argentina-work-cases.ts`, add imports:

```ts
import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";
```

Read the manifest near the existing path constants:

```ts
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { generatedAt?: string };
```

Replace:

```ts
const generatedAt = new Date().toISOString();
```

with:

```ts
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: manifest.generatedAt,
});
```

In `scripts/build-cross-country-cases.ts`, add the same import, read the same manifest path after constants, and replace:

```ts
const generatedAt = new Date().toISOString();
```

with:

```ts
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: manifest.generatedAt,
});
```

- [ ] **Step 5: Verify timestamp behavior**

Run:

```bash
node --experimental-strip-types --test tests/dataBuildTimestamps.test.ts
npm run data:build
node -e 'const a=require("./src/data/argentinaWorkCases.json"); const c=require("./src/data/crossCountryCaseFiles.json"); console.log(a.generatedAt); console.log(c.generatedAt)'
```

Expected:

```text
2026-05-16T06:58:58.684Z
2026-05-16T06:58:58.684Z
```

Use the actual manifest timestamp if it changes in future work.

---

### Task 3: Repair Data Spine Without Live Fetch

**Files:**
- Modify generated artifacts from `npm run data:build`.
- Potentially modify `data/official/**` bytes when restoring CRLF snapshots to match the existing manifest.

- [ ] **Step 1: Capture the failing baseline**

Run:

```bash
npm run data:verify
```

Expected before repair: non-zero exit with hash errors. Save the first 20 errors in the implementation notes or commit body.

- [ ] **Step 2: Restore current raw files to manifest bytes when the only difference is line endings**

Run this one-time repair command from repo root:

```bash
node - <<'NODE'
const { createHash } = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");

const manifest = JSON.parse(readFileSync("data/official/snapshot-manifest.json", "utf8"));

function hash(bytes) {
  return `sha256-${createHash("sha256").update(bytes).digest("hex")}`;
}

for (const snapshot of manifest.snapshots) {
  const path = snapshot.rawPath;
  const current = readFileSync(path);
  const currentHash = hash(current);
  if (currentHash === snapshot.fileHash) {
    console.log(`${snapshot.sourceId}: ok`);
    continue;
  }

  const text = current.toString("utf8");
  const crlfBytes = Buffer.from(text.replace(/\r?\n/g, "\r\n"), "utf8");
  const crlfHash = hash(crlfBytes);

  if (crlfHash !== snapshot.fileHash) {
    throw new Error(`${snapshot.sourceId}: manifest mismatch is not line-ending-only`);
  }

  writeFileSync(path, crlfBytes);
  console.log(`${snapshot.sourceId}: restored CRLF bytes`);
}
NODE
```

Expected:

- files whose current bytes already match manifest print `ok`;
- files affected only by LF/CRLF drift print `restored CRLF bytes`;
- the command throws if any mismatch is not explained by line endings.

- [ ] **Step 3: Rebuild generated data from repaired raw snapshots**

Run:

```bash
npm run data:build
```

Expected: command exits 0 and regenerates:

- `src/data/argentinaWorkCases.json`;
- `src/data/crossCountryCaseFiles.json`.

- [ ] **Step 4: Verify data spine alone**

Run:

```bash
npm run data:verify
node --experimental-strip-types --test tests/dataSpineVerifier.test.ts
```

Expected:

- `npm run data:verify` exits 0 with `errors: []`;
- `tests/dataSpineVerifier.test.ts` passes.

- [ ] **Step 5: Inspect data diffs before continuing**

Run:

```bash
git diff --stat
git diff -- data/official/snapshot-manifest.json data/official src/data/argentinaWorkCases.json src/data/crossCountryCaseFiles.json | sed -n '1,220p'
```

Expected:

- no `data/official/snapshot-manifest.json` change unless deliberately justified;
- `data/official/**` changes are line-ending restoration only;
- generated JSON changes are hash/timestamp/receipt sync, not semantic data invention.

Stop here if `npm run data:verify` still fails. Do not continue to signal/entity work on a red data spine.

---

### Task 4: Add Combined Data Quality Report

**Files:**
- Create: `src/lib/data/dataQualityReport.ts`
- Create: `tests/dataQualityReport.test.ts`
- Create: `scripts/report-data-quality.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for country/source/case quality**

Create `tests/dataQualityReport.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { buildDataQualityReport } from "../src/lib/data/dataQualityReport.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";

const receipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://datos.gob.ar",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-source",
  recordId: "14-1002-CON21",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "quality-test@1",
  row: { contrato_numero: "14-1002-CON21" },
});

test("buildDataQualityReport summarizes country readiness without hiding gaps", () => {
  const report = buildDataQualityReport({
    generatedAt: "2026-05-17T00:00:00.000Z",
    verification: {
      checkedDatasets: 1,
      checkedCases: 2,
      checkedReceipts: 2,
      checkedRawFiles: 1,
      errors: [],
    },
    datasets: [{
      source: { sourceId: "AR-CONTRATAR-CONTRATOS" },
      stats: { rawRows: 2, caseFiles: 2, mapReadyCases: 1 },
      cases: [
        {
          id: "AR-CONTRACT-14-1002-CON21",
          countryCode: "AR",
          caseType: "procurement_contract",
          title: "Contrato con competencia baja",
          year: 2021,
          workNumber: "14-1002-CON21",
          procedureNumber: "14-0007-LPU20",
          agencyName: "Comision Nacional de Energia Atomica",
          coordinates: { lat: -34.58, lon: -58.38 },
          amount: { value: 100, currency: "ARS", label: "monto_contrato" },
          bidderCount: 1,
          supplierName: "Proveedor SA",
          supplierDocument: "30-70043585-3",
          receipt,
          caveats: ["Contrato oficial; falta pago."],
        },
        {
          id: "AR-CONTRACT-14-1003-CON21",
          countryCode: "AR",
          caseType: "procurement_contract",
          title: "Contrato sin monto",
          year: 2021,
          workNumber: "14-1003-CON21",
          procedureNumber: "14-0008-LPU20",
          agencyName: "Comision Nacional de Energia Atomica",
          coordinates: null,
          amount: null,
          bidderCount: null,
          supplierName: null,
          supplierDocument: null,
          receipt,
          caveats: ["Contrato oficial; falta monto."],
        },
      ],
    }],
  });

  assert.equal(report.verification.errors, 0);
  assert.equal(report.totals.cases, 2);
  assert.equal(report.byCountry.AR.cases, 2);
  assert.equal(report.byCountry.AR.withAmount, 1);
  assert.equal(report.byCountry.AR.withSupplierDocument, 1);
  assert.equal(report.byCountry.AR.withMapEligibleGeometry, 1);
  assert.equal(report.byCountry.AR.withLeadEligibleSignal, 2);
  assert.equal(report.byCountry.AR.signals.single_bidder, 1);
  assert.equal(report.byCountry.AR.signals.missing_amount, 1);
});

test("buildDataQualityReport keeps verification failures visible as blockers", () => {
  const report = buildDataQualityReport({
    generatedAt: "2026-05-17T00:00:00.000Z",
    verification: {
      checkedDatasets: 1,
      checkedCases: 1,
      checkedReceipts: 1,
      checkedRawFiles: 1,
      errors: ["AR-CONTRATAR-CONTRATOS: raw file hash mismatch"],
    },
    datasets: [{
      source: { sourceId: "AR-CONTRATAR-CONTRATOS" },
      stats: { rawRows: 1, caseFiles: 0, mapReadyCases: 0 },
      cases: [],
    }],
  });

  assert.equal(report.verification.errors, 1);
  assert.deepEqual(report.blockers, [
    "Data spine has 1 verification error(s). Fix receipts and raw hashes before expanding data.",
  ]);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --experimental-strip-types --test tests/dataQualityReport.test.ts
```

Expected: fail because `dataQualityReport.ts` does not exist.

- [ ] **Step 3: Implement the report builder**

Create `src/lib/data/dataQualityReport.ts`:

```ts
import { buildCaseSignals, selectLeadCaseSignal, type SignalCaseFile } from "./caseSignals.ts";
import { assessCoordinateQuality } from "./coordinateQuality.ts";
import type { DataSpineVerificationReport } from "./dataSpineVerifier.ts";

export interface DataQualityDataset {
  source: { sourceId: string };
  stats: { rawRows: number; caseFiles: number; mapReadyCases: number };
  cases: SignalCaseFile[];
}

export interface DataQualityCountry {
  cases: number;
  rawRows: number;
  withReceipt: number;
  withAmount: number;
  withSupplierName: number;
  withSupplierDocument: number;
  withAnySupplierIdentity: number;
  withOfficialGeometry: number;
  withMapEligibleGeometry: number;
  withLeadEligibleSignal: number;
  signals: Record<string, number>;
}

export interface DataQualityReport {
  generatedAt: string;
  totals: {
    datasets: number;
    cases: number;
    rawRows: number;
  };
  verification: {
    checkedDatasets: number;
    checkedCases: number;
    checkedReceipts: number;
    checkedRawFiles: number;
    errors: number;
  };
  byCountry: Record<string, DataQualityCountry>;
  blockers: string[];
}

export function buildDataQualityReport({
  generatedAt,
  verification,
  datasets,
}: {
  generatedAt: string;
  verification: DataSpineVerificationReport;
  datasets: DataQualityDataset[];
}): DataQualityReport {
  const byCountry: Record<string, DataQualityCountry> = {};
  let totalCases = 0;
  let totalRawRows = 0;

  for (const dataset of datasets) {
    totalRawRows += dataset.stats.rawRows;

    for (const caseFile of dataset.cases) {
      totalCases += 1;
      const country = byCountry[caseFile.countryCode] ?? emptyCountry();
      country.cases += 1;
      country.rawRows += 0;
      if (caseFile.receipt) country.withReceipt += 1;
      if (caseFile.amount?.value && caseFile.amount.value > 0) country.withAmount += 1;
      if (clean(caseFile.supplierName)) country.withSupplierName += 1;
      if (clean(caseFile.supplierDocument)) country.withSupplierDocument += 1;
      if (clean(caseFile.supplierName) || clean(caseFile.supplierDocument)) {
        country.withAnySupplierIdentity += 1;
      }
      if (caseFile.coordinates) country.withOfficialGeometry += 1;
      if (assessCoordinateQuality(caseFile).exposeOnMap) country.withMapEligibleGeometry += 1;

      const signals = buildCaseSignals(caseFile);
      if (selectLeadCaseSignal(signals)) country.withLeadEligibleSignal += 1;
      for (const signal of signals) {
        country.signals[signal.code] = (country.signals[signal.code] ?? 0) + 1;
      }

      byCountry[caseFile.countryCode] = country;
    }
  }

  for (const dataset of datasets) {
    const countryCode = dataset.cases[0]?.countryCode;
    if (!countryCode) continue;
    const country = byCountry[countryCode] ?? emptyCountry();
    country.rawRows += dataset.stats.rawRows;
    byCountry[countryCode] = country;
  }

  return {
    generatedAt,
    totals: {
      datasets: datasets.length,
      cases: totalCases,
      rawRows: totalRawRows,
    },
    verification: {
      checkedDatasets: verification.checkedDatasets,
      checkedCases: verification.checkedCases,
      checkedReceipts: verification.checkedReceipts,
      checkedRawFiles: verification.checkedRawFiles,
      errors: verification.errors.length,
    },
    byCountry,
    blockers: buildBlockers(verification),
  };
}

function emptyCountry(): DataQualityCountry {
  return {
    cases: 0,
    rawRows: 0,
    withReceipt: 0,
    withAmount: 0,
    withSupplierName: 0,
    withSupplierDocument: 0,
    withAnySupplierIdentity: 0,
    withOfficialGeometry: 0,
    withMapEligibleGeometry: 0,
    withLeadEligibleSignal: 0,
    signals: {},
  };
}

function buildBlockers(verification: DataSpineVerificationReport): string[] {
  if (verification.errors.length === 0) return [];
  return [
    `Data spine has ${verification.errors.length} verification error(s). Fix receipts and raw hashes before expanding data.`,
  ];
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
```

- [ ] **Step 4: Add CLI script**

Create `scripts/report-data-quality.ts`:

```ts
import { readFile } from "node:fs/promises";

import { buildDataQualityReport } from "../src/lib/data/dataQualityReport.ts";
import { verifyDataSpine } from "../src/lib/data/dataSpineVerifier.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

const rootDir = new URL("../", import.meta.url);

const catalog = await readJson<SourceCatalogEntry[]>("data/sources/source-catalog.json");
const argentinaDataset = await readJson<Parameters<typeof buildDataQualityReport>[0]["datasets"][number]>(
  "src/data/argentinaWorkCases.json",
);
const crossCountryDataset = await readJson<{
  generatedAt: string;
  datasets: Parameters<typeof buildDataQualityReport>[0]["datasets"];
}>("src/data/crossCountryCaseFiles.json");

const datasets = [
  argentinaDataset,
  ...crossCountryDataset.datasets,
];

const verification = await verifyDataSpine({
  rootDir,
  sources: catalog,
  datasets,
});

const report = buildDataQualityReport({
  generatedAt: crossCountryDataset.generatedAt ?? argentinaDataset.generatedAt,
  verification,
  datasets,
});

console.log(JSON.stringify(report, null, 2));

if (report.blockers.length > 0) {
  process.exitCode = 1;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(new URL(path, rootDir), "utf8")) as T;
}
```

- [ ] **Step 5: Add package script**

Modify `package.json`:

```json
"data:quality-report": "node --experimental-strip-types scripts/report-data-quality.ts"
```

Keep the existing scripts unchanged.

- [ ] **Step 6: Verify report**

Run:

```bash
node --experimental-strip-types --test tests/dataQualityReport.test.ts
npm run data:quality-report
```

Expected:

- tests pass;
- report prints JSON;
- after Task 3 is complete, `npm run data:quality-report` exits 0.

---

### Task 5: Add Auditable Supplier Entity Resolution

**Files:**
- Create: `src/lib/data/entityResolution.ts`
- Create: `tests/entityResolution.test.ts`
- Modify: `src/lib/data/investigationSignalContext.ts`
- Modify: `src/lib/data/caseSignals.ts`
- Modify: `tests/caseSignals.test.ts`

- [ ] **Step 1: Write failing identity tests**

Create `tests/entityResolution.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { resolveSupplierIdentity } from "../src/lib/data/entityResolution.ts";

test("resolveSupplierIdentity uses document keys when available", () => {
  const identity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "WARLET S.A.",
    supplierDocument: "30-70043585-3",
  });

  assert.deepEqual(identity, {
    key: "supplier:AR:doc:30700435853",
    method: "document",
    confidence: "high",
    label: "WARLET S.A. / 30-70043585-3",
    document: "30700435853",
    normalizedName: "WARLET",
    aliasKey: "WARLET",
  });
});

test("resolveSupplierIdentity falls back to normalized name with lower confidence", () => {
  const identity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Obras del Sur S.R.L.",
    supplierDocument: null,
  });

  assert.equal(identity?.key, "supplier:AR:name:OBRAS DEL SUR");
  assert.equal(identity?.method, "normalized_name");
  assert.equal(identity?.confidence, "low");
  assert.equal(identity?.aliasKey, "OBRAS DEL SUR");
});

test("resolveSupplierIdentity keeps countries separated", () => {
  const ar = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Proveedor Regional SA",
    supplierDocument: "123",
  });
  const cl = resolveSupplierIdentity({
    countryCode: "CL",
    supplierName: "Proveedor Regional SA",
    supplierDocument: "123",
  });

  assert.notEqual(ar?.key, cl?.key);
});

test("resolveSupplierIdentity returns null when supplier data is missing", () => {
  assert.equal(resolveSupplierIdentity({
    countryCode: "PE",
    supplierName: null,
    supplierDocument: null,
  }), null);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --experimental-strip-types --test tests/entityResolution.test.ts
```

Expected: fail because `entityResolution.ts` does not exist.

- [ ] **Step 3: Implement identity resolver**

Create `src/lib/data/entityResolution.ts`:

```ts
export type SupplierIdentityMethod = "document" | "normalized_name";
export type SupplierIdentityConfidence = "high" | "low";

export interface SupplierIdentityInput {
  countryCode: string;
  supplierName: string | null | undefined;
  supplierDocument: string | null | undefined;
}

export interface SupplierIdentity {
  key: string;
  method: SupplierIdentityMethod;
  confidence: SupplierIdentityConfidence;
  label: string;
  document: string | null;
  normalizedName: string | null;
  aliasKey: string | null;
}

export function resolveSupplierIdentity(input: SupplierIdentityInput): SupplierIdentity | null {
  const countryCode = clean(input.countryCode).toUpperCase();
  const document = normalizeDocument(input.supplierDocument);
  const normalizedName = normalizeSupplierName(input.supplierName);
  const aliasKey = buildSupplierAliasKey(input.supplierName);
  const label = [clean(input.supplierName), clean(input.supplierDocument)].filter(Boolean).join(" / ");

  if (document) {
    return {
      key: `supplier:${countryCode}:doc:${document}`,
      method: "document",
      confidence: "high",
      label: label || document,
      document,
      normalizedName,
      aliasKey,
    };
  }

  if (aliasKey) {
    return {
      key: `supplier:${countryCode}:name:${aliasKey}`,
      method: "normalized_name",
      confidence: "low",
      label: label || aliasKey,
      document: null,
      normalizedName,
      aliasKey,
    };
  }

  return null;
}

export function buildSupplierAliasKey(value: string | null | undefined): string | null {
  const normalized = normalizeSupplierName(value)
    ?.replace(/\bS A S\b/g, " ")
    .replace(/\bS A\b/g, " ")
    .replace(/\bS R L\b/g, " ")
    .replace(/\b(SA|SAS|SRL|SACI|SCA|UTE|SPA|LTDA|EIRL)\b/g, " ")
    .replace(/\b(SOCIEDAD|ANONIMA|RESPONSABILIDAD|LIMITADA|GESTION|INVERSIONES)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized && normalized.length >= 6 ? normalized : null;
}

export function normalizeSupplierName(value: string | null | undefined): string | null {
  const normalized = clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeDocument(value: string | null | undefined): string | null {
  const normalized = clean(value).replace(/\D/g, "");
  return normalized.length > 0 ? normalized : null;
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
```

- [ ] **Step 4: Wire resolver into signal context**

In `src/lib/data/investigationSignalContext.ts`:

1. Import:

```ts
import {
  buildSupplierAliasKey,
  resolveSupplierIdentity,
  type SupplierIdentityConfidence,
  type SupplierIdentityMethod,
} from "./entityResolution.ts";
```

2. Add fields to `SupplierProfile`:

```ts
identityMethod: SupplierIdentityMethod;
identityConfidence: SupplierIdentityConfidence;
```

3. Add the same fields to `MutableSupplierProfile`.

4. Replace `buildSupplierKey(caseFile)` usage with:

```ts
const supplierIdentity = resolveSupplierIdentity(caseFile);
if (!supplierIdentity) continue;
const supplierKey = supplierIdentity.key;
```

5. Use:

```ts
const supplierLabel = supplierIdentity.label;
```

6. Set profile fields:

```ts
identityMethod: supplierIdentity.method,
identityConfidence: supplierIdentity.confidence,
```

7. Replace local `buildAliasKey` calls with `buildSupplierAliasKey`.

8. Delete local `buildSupplierKey`, `buildAliasKey` and `normalizeDocument` helpers after tests pass.

- [ ] **Step 5: Make supplier signals honest about identity confidence**

In `src/lib/data/caseSignals.ts`, inside `addAggregateSupplierSignals`:

For `repeat_single_bid_winner` and `recurring_supplier_agency`, set confidence based on supplier profile:

```ts
const identityCaveat = supplierProfile.identityConfidence === "low"
  ? " Faro agrupo este proveedor por nombre normalizado porque falta documento fiscal confiable."
  : "";
```

Use confidence:

```ts
confidence: supplierProfile.identityConfidence === "low" ? "low" : "medium",
```

Append to caveat:

```ts
caveat: `La recurrencia depende del alcance del dataset cargado y no prueba direccionamiento.${identityCaveat}`,
```

For `supplier_concentration`, also use low confidence when identity is name-only.

- [ ] **Step 6: Add regression signal test**

Append to `tests/caseSignals.test.ts`:

```ts
test("buildCaseSignals lowers recurrence confidence when supplier identity is name-only", () => {
  const repeatedCases = [
    buildSignalFixture({
      id: "AR-CONTRACT-14-2001-CON21",
      supplierName: "OBRAS DEL SUR S.A.",
      supplierDocument: null,
      bidderCount: 1,
      amountValue: 1_000_000,
    }),
    buildSignalFixture({
      id: "AR-CONTRACT-14-2002-CON21",
      supplierName: "OBRAS DEL SUR SRL",
      supplierDocument: null,
      bidderCount: 1,
      amountValue: 2_000_000,
    }),
  ];

  const context = buildCaseSignalContext(repeatedCases);
  const signals = buildCaseSignals(repeatedCases[0], context);
  const recurrence = signals.find((signal) => signal.code === "repeat_single_bid_winner");

  assert.equal(recurrence?.confidence, "low");
  assert.match(recurrence?.caveat ?? "", /nombre normalizado/);
});
```

- [ ] **Step 7: Verify entity layer**

Run:

```bash
node --experimental-strip-types --test tests/entityResolution.test.ts tests/caseSignals.test.ts tests/investigatorExplorer.test.ts tests/caseLeads.test.ts
```

Expected: all listed tests pass.

---

### Task 6: Documentation And Handoff

**Files:**
- Create: `docs/handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md`
- Modify: `README.md`
- Modify: `docs/product/faro-product-context.md`

- [ ] **Step 1: Create handoff**

Create `docs/handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md`:

```md
# Data Integrity And Quality Sprint Handoff

Fecha: 2026-05-17

## Objetivo

Este sprint convierte la base de datos chica de Faro en una base verificable y medible. Antes de sumar mas paises, fuentes o detectores, Faro debe poder demostrar que sus snapshots, hashes, receipts, geometria y agrupacion de proveedores son reproducibles.

## Que cambia

- `data/official/**` queda tratado como evidencia byte-for-byte. Git no debe normalizar line endings.
- `npm run data:build` usa un timestamp deterministico basado en `data/official/snapshot-manifest.json` o `FARO_DATA_BUILD_TIMESTAMP`.
- `npm run data:verify` vuelve a ser el gate principal para receipts y hashes.
- `npm run data:quality-report` resume cobertura por pais, fuente, monto, proveedor, geometria y senales.
- La identidad de proveedor queda separada entre documento fiscal confiable y nombre normalizado de baja confianza.

## Como interpretar proveedor recurrente

Una recurrencia con documento fiscal tiene mayor confianza. Una recurrencia solo por nombre normalizado sigue siendo util como pista, pero debe mostrarse con caveat y menor confianza. Faro no debe afirmar que dos nombres parecidos son la misma empresa sin documento, domicilio, registro societario u otra evidencia oficial.

## Gate antes de cargar mas datos

Antes de agregar nuevos datasets:

1. `npm run data:verify` debe pasar.
2. `npm run data:quality-report` no debe mostrar blockers.
3. `npm run data:geo-report` debe mostrar los casos fuera de mapa como brechas, no como puntos visibles.
4. `npm test`, `npm run typecheck` y `npm run build` deben pasar.
```

- [ ] **Step 2: Update README commands**

Add a short data section to `README.md`:

```md
## Data trust commands

- `npm run data:build`: rebuilds generated case datasets from local official snapshots.
- `npm run data:verify`: verifies source catalog, raw hashes, snapshot profiles and receipts.
- `npm run data:geo-report`: reports coordinate quality and map eligibility.
- `npm run data:quality-report`: reports country/source coverage, supplier identity coverage and lead-signal coverage.

Do not run `npm run data:fetch` as a routine repair step. It can refresh external sources and change the evidence baseline.
```

- [ ] **Step 3: Update product context**

In `docs/product/faro-product-context.md`, add:

```md
## Data trust principle

Faro should prefer fewer cases with receipts, hashes and caveats over more cases with unclear provenance. A case can remain searchable even when it is not map-ready or lead-eligible; the product should show the gap instead of hiding or inventing evidence.
```

- [ ] **Step 4: Verify docs are ASCII and links are local**

Run:

```bash
LC_ALL=C grep -RIn '[^ -~]' README.md docs/handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md docs/product/faro-product-context.md || true
```

Expected: no output for the newly added sections.

---

### Task 7: Full Validation Gate

**Files:**
- All files changed by Tasks 1-6.

- [ ] **Step 1: Run focused data verification**

Run:

```bash
npm run data:verify
node --experimental-strip-types --test tests/dataSpineVerifier.test.ts tests/dataBuildTimestamps.test.ts tests/dataQualityReport.test.ts tests/entityResolution.test.ts
```

Expected:

- `data:verify` exits 0;
- all focused tests pass.

- [ ] **Step 2: Run existing data/product tests most likely to regress**

Run:

```bash
node --experimental-strip-types --test \
  tests/caseSignals.test.ts \
  tests/caseLeads.test.ts \
  tests/investigatorExplorer.test.ts \
  tests/expediente.test.ts \
  tests/exportBundles.test.ts \
  tests/coverage.test.ts \
  tests/coordinateQualityReport.test.ts \
  tests/canonicalRecords.test.ts
```

Expected: all pass.

- [ ] **Step 3: Run reports**

Run:

```bash
npm run data:geo-report
npm run data:quality-report
```

Expected:

- `data:geo-report` exits 0 and prints country/status counts;
- `data:quality-report` exits 0 and has `blockers: []`.

- [ ] **Step 4: Run full project gate**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected:

- `npm test` passes all tests;
- `typecheck` exits 0;
- `build` exits 0.

- [ ] **Step 5: Inspect final diff before commit**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected:

- `.DS_Store` is not staged;
- no whitespace errors;
- diffs are limited to data integrity, data quality report, entity identity and docs.

---

### Task 8: Commit Strategy

Use small commits if executing locally:

1. `chore: preserve official snapshot bytes`
2. `fix: make data spine reproducible`
3. `feat: add data quality report`
4. `feat: add auditable supplier identity`
5. `docs: document data integrity gates`

Before pushing:

```bash
git log --oneline --decorate -5
git status --short --branch
```

Expected: clean branch except intentionally ignored local files.

Do not merge to `main` until `npm test`, `npm run typecheck`, `npm run build`, `npm run data:verify`, `npm run data:geo-report` and `npm run data:quality-report` have all passed in the same final state.
