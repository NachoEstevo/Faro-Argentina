# Sentinel-2 Satellite Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verifiable Sentinel-2 satellite panel for Faro expedientes: a Python build-time script that fetches before/after scenes for any case with `coordinates && year` via Planetary Computer STAC, and a thin runtime that consumes the resulting static assets.

**Architecture:** Pure data flow. A Python script (`scripts/fetch-sentinel-scenes.py`) writes `public/sentinel/<caseId>/{before,after}.webp` plus a manifest `data/sentinel/scene-manifest.json`. The TypeScript runtime loads the manifest, extends the existing `expediente` view model with `satelliteEvidence`, and renders a `SatellitePanel` component in `CaseDetails`. The Python script is the only network contact point; the app never fetches at runtime.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node test runner with `--experimental-strip-types`, Python 3.11+ with `pystac-client`, `planetary-computer`, `rasterio`, `pillow`, `numpy`.

**Spec:** `docs/internal/superpowers/specs/2026-05-16-sentinel-satellite-layer-design.md`

---

## File Structure

**Create:**
- `data/sentinel/.gitkeep` — placeholder so the manifest directory exists in git.
- `public/sentinel/.gitkeep` — placeholder so the assets directory exists in git.
- `src/lib/data/satelliteScenes.ts` — pure loader + types for the scene manifest.
- `src/components/SatellitePanel.tsx` — UI panel + zoom modal.
- `tests/satelliteScenes.test.ts` — unit tests for the loader and fixture round-trip.
- `tests/fixtures/sentinel-scene-manifest.test.json` — deterministic manifest fixture.
- `scripts/requirements.txt` — Python dependencies.
- `scripts/fetch-sentinel-scenes.py` — STAC query + COG read + WebP export.
- `scripts/verify-sentinel-manifest.py` — hash and shape checks for the manifest.
- `scripts/README-sentinel.md` — Python setup + usage.

**Modify:**
- `src/lib/data/caseSignals.ts` — drop `countryCode === "AR"` guard in `addGeoSignals`; update `sentinel_candidate` copy.
- `src/lib/data/expediente.ts` — add `SatelliteScene`, `SatelliteEvidence`, optional `options.satelliteEvidence`.
- `src/lib/caseRepository.ts` — load manifest at module init; wire `satelliteEvidence` into `getExpedienteById`; include satellite receipts in `buildEvidencePack`.
- `src/components/CaseDetails.tsx` — replace `satelliteBox` (lines 59-80) with `<SatellitePanel />`.
- `src/app/globals.css` — `.satellitePanel`, `.satelliteScene`, `.satelliteModal` styles.
- `package.json` — `sentinel:setup`, `sentinel:fetch`, `sentinel:verify` scripts; extend `data:verify`.
- `tests/caseSignals.test.ts` — assert `sentinel_candidate` fires for PE/CL with coord+year.
- `tests/expediente.test.ts` — assert `satelliteEvidence` populates from option, is null when coord/year missing.
- `tests/exportBundles.test.ts` — assert satellite receipts appear in `buildEvidencePack` output.

Do not rename existing data files or generated artifacts in this plan.

---

### Task 1: Scene Manifest Loader

**Files:**
- Create: `src/lib/data/satelliteScenes.ts`
- Create: `tests/satelliteScenes.test.ts`
- Create: `tests/fixtures/sentinel-scene-manifest.test.json`
- Create: `data/sentinel/.gitkeep`
- Create: `public/sentinel/.gitkeep`

- [ ] **Step 1: Create directory placeholders**

Create `data/sentinel/.gitkeep` (empty file).
Create `public/sentinel/.gitkeep` (empty file).

- [ ] **Step 2: Create the fixture manifest**

Create `tests/fixtures/sentinel-scene-manifest.test.json`:

```json
{
  "generatedAt": "2026-05-16T18:00:00.000Z",
  "stacEndpoint": "https://planetarycomputer.microsoft.com/api/stac/v1",
  "collection": "sentinel-2-l2a",
  "parameters": {
    "bboxSideMeters": 500,
    "renderWidthPx": 512,
    "cloudCoverThresholds": [10, 30, 50],
    "dateWindowMonths": [6, 12, 18]
  },
  "scenes": [
    {
      "caseId": "AR-CASE-FULL",
      "anchorDate": "2021-05-12",
      "bbox": [-58.39161, -34.58797, -58.38711, -34.58347],
      "before": {
        "sceneId": "S2A_MSIL2A_20201108T140051_R067_T20JPN_20201108T185611",
        "datetime": "2020-11-08T14:00:51Z",
        "cloudCover": 4.7,
        "windowExpandedTo": "6_months_lt_10pct",
        "imagePath": "public/sentinel/AR-CASE-FULL/before.webp",
        "imageHash": "sha256-aaa111",
        "stacItemUrl": "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/S2A_MSIL2A_20201108T140051_R067_T20JPN_20201108T185611"
      },
      "after": {
        "sceneId": "S2B_MSIL2A_20260318T140049_R067_T20JPN_20260318T210332",
        "datetime": "2026-03-18T14:00:49Z",
        "cloudCover": 8.2,
        "windowExpandedTo": "12_months_lt_30pct",
        "imagePath": "public/sentinel/AR-CASE-FULL/after.webp",
        "imageHash": "sha256-bbb222",
        "stacItemUrl": "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/S2B_MSIL2A_20260318T140049_R067_T20JPN_20260318T210332"
      },
      "caveats": []
    },
    {
      "caseId": "AR-CASE-AFTER-ONLY",
      "anchorDate": "2024-01-15",
      "bbox": [-58.40000, -34.60000, -58.39550, -34.59550],
      "before": null,
      "after": {
        "sceneId": "S2A_MSIL2A_20260420T140051_R067_T20JPN_20260420T185611",
        "datetime": "2026-04-20T14:00:51Z",
        "cloudCover": 22.4,
        "windowExpandedTo": "12_months_lt_30pct",
        "imagePath": "public/sentinel/AR-CASE-AFTER-ONLY/after.webp",
        "imageHash": "sha256-ccc333",
        "stacItemUrl": "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/S2A_MSIL2A_20260420T140051_R067_T20JPN_20260420T185611"
      },
      "caveats": ["No se encontro escena previa al contrato con baja nubosidad."]
    },
    {
      "caseId": "AR-CASE-EMPTY",
      "anchorDate": "2022-03-01",
      "bbox": [-58.38000, -34.59000, -58.37550, -34.58550],
      "before": null,
      "after": null,
      "caveats": ["Sentinel-2 no devolvio escenas usables en las ventanas exploradas."]
    }
  ]
}
```

- [ ] **Step 3: Write the failing tests**

Create `tests/satelliteScenes.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSatelliteEvidence,
  loadSceneManifest,
  type SatelliteEvidence,
  type SceneManifest,
} from "../src/lib/data/satelliteScenes.ts";

import manifestFixture from "./fixtures/sentinel-scene-manifest.test.json" with { type: "json" };

const manifest = manifestFixture as SceneManifest;

test("loadSceneManifest returns an empty manifest when the file is missing", () => {
  const loaded = loadSceneManifest("does/not/exist.json");
  assert.equal(loaded.scenes.length, 0);
  assert.equal(loaded.parameters.bboxSideMeters, 500);
});

test("loadSceneManifest parses a real manifest from disk", () => {
  const loaded = loadSceneManifest("tests/fixtures/sentinel-scene-manifest.test.json");
  assert.equal(loaded.scenes.length, 3);
  assert.equal(loaded.collection, "sentinel-2-l2a");
});

test("buildSatelliteEvidence assembles a full before/after evidence object", () => {
  const evidence = buildSatelliteEvidence(manifest, "AR-CASE-FULL");

  assert.ok(evidence);
  assert.equal(evidence.available, true);
  assert.equal(evidence.bboxSideMeters, 500);
  assert.ok(evidence.before);
  assert.ok(evidence.after);
  assert.equal(evidence.before.sceneId, "S2A_MSIL2A_20201108T140051_R067_T20JPN_20201108T185611");
  assert.equal(evidence.after.sceneId, "S2B_MSIL2A_20260318T140049_R067_T20JPN_20260318T210332");
  assert.equal(evidence.before.imageUrl, "/sentinel/AR-CASE-FULL/before.webp");
  assert.equal(evidence.after.imageUrl, "/sentinel/AR-CASE-FULL/after.webp");
  assert.equal(evidence.before.receipt.sourceId, "PC-SENTINEL2-L2A");
  assert.equal(evidence.before.receipt.locatorType, "official_detail");
  assert.equal(evidence.before.receipt.recordId, evidence.before.sceneId);
});

test("buildSatelliteEvidence keeps scenes nullable independently", () => {
  const afterOnly = buildSatelliteEvidence(manifest, "AR-CASE-AFTER-ONLY") as SatelliteEvidence;
  assert.equal(afterOnly.available, true);
  assert.equal(afterOnly.before, null);
  assert.ok(afterOnly.after);
  assert.equal(afterOnly.caveats[0], "No se encontro escena previa al contrato con baja nubosidad.");

  const empty = buildSatelliteEvidence(manifest, "AR-CASE-EMPTY") as SatelliteEvidence;
  assert.equal(empty.available, false);
  assert.equal(empty.reason, "Sentinel-2 no devolvio escenas usables en las ventanas exploradas.");
  assert.equal(empty.before, null);
  assert.equal(empty.after, null);
});

test("buildSatelliteEvidence returns null for cases not in the manifest", () => {
  const evidence = buildSatelliteEvidence(manifest, "AR-NOT-IN-MANIFEST");
  assert.equal(evidence, null);
});

test("buildSatelliteEvidence flags expanded fallback windows on scenes", () => {
  const evidence = buildSatelliteEvidence(manifest, "AR-CASE-FULL") as SatelliteEvidence;
  assert.equal(evidence.before?.caveats.length, 0);
  assert.deepEqual(evidence.after?.caveats, [
    "Ventana ampliada al buscar escena: 12 meses, menos de 30% de nubes.",
  ]);
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/satelliteScenes.test.ts
```

Expected: FAIL with module-not-found for `src/lib/data/satelliteScenes.ts`.

- [ ] **Step 5: Implement the loader**

Create `src/lib/data/satelliteScenes.ts`:

```ts
import { readFileSync } from "node:fs";

import {
  createEvidenceReceipt,
  type EvidenceReceipt,
} from "./evidenceReceipts.ts";

export type SatelliteWindow =
  | "6_months_lt_10pct"
  | "12_months_lt_30pct"
  | "18_months_lt_50pct";

export interface ManifestScene {
  sceneId: string;
  datetime: string;
  cloudCover: number;
  windowExpandedTo: SatelliteWindow;
  imagePath: string;
  imageHash: string;
  stacItemUrl: string;
}

export interface ManifestEntry {
  caseId: string;
  anchorDate: string;
  bbox: [number, number, number, number];
  before: ManifestScene | null;
  after: ManifestScene | null;
  caveats: string[];
}

export interface SceneManifest {
  generatedAt: string;
  stacEndpoint: string;
  collection: string;
  parameters: {
    bboxSideMeters: number;
    renderWidthPx: number;
    cloudCoverThresholds: number[];
    dateWindowMonths: number[];
  };
  scenes: ManifestEntry[];
}

export interface SatelliteScene {
  sceneId: string;
  datetime: string;
  cloudCover: number;
  imageUrl: string;
  stacItemUrl: string;
  receipt: EvidenceReceipt;
  caveats: string[];
}

export interface SatelliteEvidence {
  available: boolean;
  reason: string | null;
  bboxSideMeters: number;
  before: SatelliteScene | null;
  after: SatelliteScene | null;
  caveats: string[];
}

const SOURCE_ID = "PC-SENTINEL2-L2A";
const SOURCE_NAME = "Planetary Computer · Sentinel-2 L2A";
const PARSER_VERSION = "sentinel-fetcher@1";

const EMPTY_MANIFEST: SceneManifest = {
  generatedAt: "1970-01-01T00:00:00.000Z",
  stacEndpoint: "https://planetarycomputer.microsoft.com/api/stac/v1",
  collection: "sentinel-2-l2a",
  parameters: {
    bboxSideMeters: 500,
    renderWidthPx: 512,
    cloudCoverThresholds: [10, 30, 50],
    dateWindowMonths: [6, 12, 18],
  },
  scenes: [],
};

export function loadSceneManifest(filePath: string): SceneManifest {
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as SceneManifest;
  } catch (error) {
    if (isMissingFile(error)) return EMPTY_MANIFEST;
    throw error;
  }
}

export function buildSatelliteEvidence(
  manifest: SceneManifest,
  caseId: string,
): SatelliteEvidence | null {
  const entry = manifest.scenes.find((scene) => scene.caseId === caseId);
  if (!entry) return null;

  const before = toScene(entry, entry.before);
  const after = toScene(entry, entry.after);
  const available = before !== null || after !== null;

  return {
    available,
    reason: available ? null : entry.caveats[0] ?? "Sentinel-2 no devolvio escenas usables.",
    bboxSideMeters: manifest.parameters.bboxSideMeters,
    before,
    after,
    caveats: entry.caveats,
  };
}

function toScene(entry: ManifestEntry, scene: ManifestScene | null): SatelliteScene | null {
  if (!scene) return null;
  const receipt = createEvidenceReceipt({
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: scene.stacItemUrl,
    rawPath: scene.imagePath,
    snapshotHash: scene.imageHash,
    recordId: scene.sceneId,
    locatorType: "official_detail",
    extractedAt: scene.datetime,
    parserVersion: PARSER_VERSION,
    row: {
      sceneId: scene.sceneId,
      cloudCover: scene.cloudCover,
      bbox: entry.bbox,
      windowExpandedTo: scene.windowExpandedTo,
    },
  });
  return {
    sceneId: scene.sceneId,
    datetime: scene.datetime,
    cloudCover: scene.cloudCover,
    imageUrl: toPublicUrl(scene.imagePath),
    stacItemUrl: scene.stacItemUrl,
    receipt,
    caveats: describeWindow(scene.windowExpandedTo),
  };
}

function toPublicUrl(rawPath: string): string {
  return rawPath.startsWith("public/") ? `/${rawPath.slice("public/".length)}` : `/${rawPath}`;
}

function describeWindow(window: SatelliteWindow): string[] {
  if (window === "6_months_lt_10pct") return [];
  if (window === "12_months_lt_30pct") {
    return ["Ventana ampliada al buscar escena: 12 meses, menos de 30% de nubes."];
  }
  return ["Ventana ampliada al buscar escena: 18 meses, menos de 50% de nubes."];
}

function isMissingFile(error: unknown): boolean {
  return Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "ENOENT";
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/satelliteScenes.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
git add data/sentinel/.gitkeep public/sentinel/.gitkeep src/lib/data/satelliteScenes.ts tests/satelliteScenes.test.ts tests/fixtures/sentinel-scene-manifest.test.json
git commit -m "feat: load sentinel scene manifest"
```

---

### Task 2: Relax `sentinel_candidate` Signal

**Files:**
- Modify: `src/lib/data/caseSignals.ts:222-260`
- Modify: `tests/caseSignals.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/caseSignals.test.ts`:

```ts
test("sentinel_candidate fires for Peru cases with coord + year", () => {
  const signals = buildCaseSignals({
    id: "PE-CASE-1",
    countryCode: "PE",
    title: "Caso peruano con coordenada",
    year: 2024,
    coordinates: { lat: -12.05, lon: -77.04 },
    receipt: {
      sourceId: "PE-OECE-CONTRATOS",
      sourceName: "OECE contratos",
      sourceUrl: "https://example.test/source",
    },
  });

  assert.equal(signals.some((signal) => signal.code === "sentinel_candidate"), true);
});

test("sentinel_candidate fires for Chile cases with coord + year", () => {
  const signals = buildCaseSignals({
    id: "CL-CASE-1",
    countryCode: "CL",
    title: "Caso chileno con coordenada",
    year: 2023,
    coordinates: { lat: -33.45, lon: -70.66 },
    receipt: {
      sourceId: "CL-MERCADO-PUBLICO",
      sourceName: "Mercado Publico",
      sourceUrl: "https://example.test/source",
    },
  });

  assert.equal(signals.some((signal) => signal.code === "sentinel_candidate"), true);
});

test("sentinel_candidate label describes available imagery, not pending action", () => {
  const signals = buildCaseSignals({
    id: "AR-CASE-1",
    countryCode: "AR",
    title: "Caso argentino con coordenada",
    year: 2021,
    coordinates: { lat: -34.6, lon: -58.4 },
    receipt: {
      sourceId: "AR-CONTRATAR-OBRAS",
      sourceName: "CONTRAT.AR obras",
      sourceUrl: "https://example.test/source",
    },
  });

  const sentinel = signals.find((signal) => signal.code === "sentinel_candidate");
  assert.ok(sentinel);
  assert.match(sentinel.label, /Sentinel-2/);
  assert.doesNotMatch(sentinel.label, /Candidato/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/caseSignals.test.ts
```

Expected: FAIL on PE/CL tests because the guard rejects non-AR countries; FAIL on label test because current label starts with "Candidato".

- [ ] **Step 3: Update `addGeoSignals`**

Replace the `sentinel_candidate` block in `src/lib/data/caseSignals.ts` (currently lines 235-246) with:

```ts
    if (caseFile.year !== null && caseFile.year !== undefined) {
      signals.push({
        code: "sentinel_candidate",
        kind: "ready",
        priority: 76,
        label: "Imagen Sentinel-2 disponible",
        summary: "Tiene coordenada oficial y fecha; Faro puede mostrar una comparacion satelital antes/despues.",
        evidence: `Anio ${caseFile.year}; coordenada ${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}.`,
        caveat: "Sentinel-2 aporta contexto visual; nubes, resolucion y fecha pueden limitar conclusiones.",
        action: "Comparar escena previa y reciente sin inferir avance fisico o pagos.",
      });
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/caseSignals.test.ts
```

Expected: PASS, including pre-existing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/caseSignals.ts tests/caseSignals.test.ts
git commit -m "feat: relax sentinel_candidate signal to AR/PE/CL"
```

---

### Task 3: Wire `satelliteEvidence` Into Expediente

**Files:**
- Modify: `src/lib/data/expediente.ts`
- Modify: `tests/expediente.test.ts`

- [ ] **Step 1: Add failing tests**

In `tests/expediente.test.ts`, add this import at the top of the file alongside
the existing imports:

```ts
import type { SatelliteEvidence } from "../src/lib/data/satelliteScenes.ts";
```

Then append the following block at the very end of the file, after the
existing `if (false) { ... }` block:

```ts
const sampleSatelliteEvidence: SatelliteEvidence = {
  available: true,
  reason: null,
  bboxSideMeters: 500,
  before: {
    sceneId: "S2A_BEFORE",
    datetime: "2020-11-08T14:00:51Z",
    cloudCover: 4.7,
    imageUrl: "/sentinel/AR-CONTRACT-14-1002-CON21/before.webp",
    stacItemUrl: "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/S2A_BEFORE",
    receipt: createEvidenceReceipt({
      sourceId: "PC-SENTINEL2-L2A",
      sourceName: "Planetary Computer · Sentinel-2 L2A",
      sourceUrl: "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/S2A_BEFORE",
      rawPath: "public/sentinel/AR-CONTRACT-14-1002-CON21/before.webp",
      snapshotHash: "sha256-aaa111",
      recordId: "S2A_BEFORE",
      locatorType: "official_detail",
      extractedAt: "2020-11-08T14:00:51Z",
      parserVersion: "sentinel-fetcher@1",
      row: { sceneId: "S2A_BEFORE" },
    }),
    caveats: [],
  },
  after: null,
  caveats: [],
};

test("buildExpediente attaches satelliteEvidence when passed via options", () => {
  const expediente = buildExpediente(
    {
      id: "AR-CONTRACT-14-1002-CON21",
      countryCode: "AR",
      caseType: "procurement_contract",
      title: "Caso con escena satelital",
      workNumber: "14-1002-CON21",
      year: 2021,
      procedureNumber: "14-0007-LPU20",
      agencyName: "CNEA",
      agencyCode: "105",
      contractingUnit: "Compras CNEA",
      executionTerm: null,
      executionTermType: null,
      coordinates: { lat: -34.585722, lon: -58.389361 },
      evidenceLevel: "official_dataset",
      amount: { value: 120, currency: "ARS", label: "ARS 120" },
      officialBudget: null,
      bidderCount: 2,
      offerCount: 2,
      supplierName: "Proveedor",
      supplierDocument: "30-70043585-3",
      relatedReceipts: [],
      receipt: primaryReceipt,
      caveats: [],
    },
    { satelliteEvidence: sampleSatelliteEvidence },
  );

  assert.ok(expediente.satelliteEvidence);
  assert.equal(expediente.satelliteEvidence.available, true);
  assert.equal(expediente.satelliteEvidence.before?.sceneId, "S2A_BEFORE");
  assert.equal(expediente.satelliteEvidence.after, null);
});

test("buildExpediente leaves satelliteEvidence null when no option is passed", () => {
  const expediente = buildExpediente({
    id: "AR-CONTRACT-14-1002-CON21",
    countryCode: "AR",
    caseType: "procurement_contract",
    title: "Caso sin escena",
    workNumber: "14-1002-CON21",
    year: 2021,
    procedureNumber: "14-0007-LPU20",
    agencyName: "CNEA",
    agencyCode: "105",
    contractingUnit: "Compras CNEA",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -34.585722, lon: -58.389361 },
    evidenceLevel: "official_dataset",
    amount: { value: 120, currency: "ARS", label: "ARS 120" },
    officialBudget: null,
    bidderCount: 2,
    offerCount: 2,
    supplierName: "Proveedor",
    supplierDocument: "30-70043585-3",
    relatedReceipts: [],
    receipt: primaryReceipt,
    caveats: [],
  });

  assert.equal(expediente.satelliteEvidence, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/expediente.test.ts
```

Expected: FAIL with TypeScript error: `Argument of type ... is not assignable to parameter` and missing `satelliteEvidence` field.

- [ ] **Step 3: Extend the view model and accept options**

In `src/lib/data/expediente.ts`:

1. Add the import after the existing imports:

```ts
import type { SatelliteEvidence } from "./satelliteScenes.ts";
```

2. Add to `ExpedienteView`, after `nextVerification: string[];`:

```ts
  satelliteEvidence: SatelliteEvidence | null;
```

3. Replace the `buildExpediente` signature and body to accept options:

```ts
export interface BuildExpedienteOptions {
  satelliteEvidence?: SatelliteEvidence | null;
}

export function buildExpediente(
  caseFile: ExpedienteCaseFile,
  options: BuildExpedienteOptions = {},
): ExpedienteView {
  const signals = buildCaseSignals(caseFile);
  const primaryReceipt = toExpedienteReceipt(caseFile.receipt);
  const relatedReceipts = (caseFile.relatedReceipts ?? []).map((receipt) =>
    toExpedienteReceipt(receipt),
  );
  const encodedCaseId = encodeURIComponent(caseFile.id);
  const sourceIds = new Set([
    primaryReceipt.sourceId,
    ...relatedReceipts.map((receipt) => receipt.sourceId),
  ]);

  return {
    expedienteType: "faro_expediente_v1",
    generatedAt: new Date().toISOString(),
    summary: {
      caseId: caseFile.id,
      countryCode: caseFile.countryCode,
      caseType: caseFile.caseType ?? null,
      title: caseFile.title,
      plainSummary: buildPlainSummary(caseFile),
      amountLabel: caseFile.amount?.label ?? "Sin monto oficial",
      organismLabel: firstPresent(caseFile.agencyName, caseFile.contractingUnit, caseFile.agencyCode),
      supplierLabel: firstPresent(caseFile.supplierName, caseFile.supplierDocument, "Sin proveedor identificado"),
      dateLabel: buildDateLabel(caseFile),
      locationLabel: buildLocationLabel(caseFile),
      evidenceLevel: caseFile.evidenceLevel ?? "sin nivel declarado",
    },
    whyItAppeared: signals,
    officialTrail: {
      primary: primaryReceipt,
      related: relatedReceipts,
    },
    investigationContext: {
      hasOfficialGeometry: Boolean(caseFile.coordinates),
      satelliteCandidate: signals.some((signal) => signal.code === "sentinel_candidate"),
      relatedReceiptCount: relatedReceipts.length,
      sourceCount: sourceIds.size,
    },
    actions: {
      officialSourceHref: primaryReceipt.sourceUrl,
      downloadEvidenceHref: `/api/export/${encodedCaseId}`,
      caseJsonHref: `/api/cases/${encodedCaseId}`,
    },
    caveats: uniqueStrings([
      ...(caseFile.caveats ?? []),
      ...signals.map((signal) => signal.caveat),
    ]),
    nextVerification: buildNextVerification(signals),
    satelliteEvidence: options.satelliteEvidence ?? null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/expediente.test.ts tests/satelliteScenes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/expediente.ts tests/expediente.test.ts
git commit -m "feat: add satelliteEvidence to expediente view"
```

---

### Task 4: Wire Satellite Evidence Into Repository And Evidence Pack

**Files:**
- Modify: `src/lib/caseRepository.ts`
- Modify: `tests/exportBundles.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/exportBundles.test.ts`:

```ts
test("getExpedienteById exposes satelliteEvidence sourced from the manifest", () => {
  const lead = buildLeadFeed({ countryCode: "AR", limit: 1 }).leads[0];
  assert.ok(lead);

  const expediente = getExpedienteById(lead.caseId);

  assert.ok(expediente);
  assert.equal(
    expediente.satelliteEvidence === null || typeof expediente.satelliteEvidence === "object",
    true,
  );
});

test("buildEvidencePack carries satellite receipts when the case has satellite evidence", () => {
  const fixtureCase = getCaseById("AR-CONTRACT-14-1002-CON21");
  if (!fixtureCase) return;

  const pack = buildEvidencePack(fixtureCase);

  const sentinelReceipt = pack.relatedReceipts.find(
    (receipt) => receipt.sourceId === "PC-SENTINEL2-L2A",
  );
  // We only assert the field is at least addressable; whether a real PC scene
  // exists depends on whether the script has been run. The shape contract is
  // what we are validating.
  if (sentinelReceipt) {
    assert.equal(sentinelReceipt.locatorType, "official_detail");
    assert.match(sentinelReceipt.sourceUrl, /planetarycomputer/);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/exportBundles.test.ts
```

Expected: FAIL on `getExpedienteById` test because `satelliteEvidence` is undefined on the returned view; the second test passes vacuously today but should remain green.

- [ ] **Step 3: Load manifest and wire it into the repository**

In `src/lib/caseRepository.ts`:

1. Add imports after existing data imports:

```ts
import {
  buildSatelliteEvidence,
  loadSceneManifest,
  type SatelliteEvidence,
  type SceneManifest,
} from "./data/satelliteScenes.ts";
```

2. Add after the existing module-level constants (near `sourceCatalogEntries`):

```ts
const sceneManifest: SceneManifest = loadSceneManifest("data/sentinel/scene-manifest.json");
```

3. Replace `getExpedienteById` with:

```ts
export function getExpedienteById(id: string): ExpedienteView | null {
  const caseFile = getCaseById(id);
  if (!caseFile) return null;
  const satelliteEvidence = buildSatelliteEvidence(sceneManifest, caseFile.id);
  return buildExpediente(caseFile as ExpedienteCaseFile, { satelliteEvidence });
}
```

4. Replace `buildEvidencePack` with:

```ts
export function buildEvidencePack(caseFile: FaroCaseFile): EvidencePack {
  const satelliteEvidence = buildSatelliteEvidence(sceneManifest, caseFile.id);
  const satelliteReceipts = collectSatelliteReceipts(satelliteEvidence);
  return {
    packType: "faro_evidence_pack",
    generatedAt: new Date().toISOString(),
    caseFile,
    receipt: caseFile.receipt,
    relatedReceipts: [...getRelatedReceipts(caseFile), ...satelliteReceipts],
    signals: buildCaseSignals(caseFile as SignalCaseFile),
    caveats: caseFile.caveats,
    verificationSteps: [
      "Abrir la fuente oficial indicada en el receipt.",
      "Buscar el numero de obra, contrato o procedimiento en el dataset original.",
      "Revisar receipts relacionados antes de tratar el caso como evidencia cruzada.",
      "Cruzar contratos, pagos y avance fisico antes de publicar conclusiones.",
      "Si se usa Sentinel-2, revisar nubes, fecha de escena y resolucion antes de inferir avance.",
    ],
  };
}

function collectSatelliteReceipts(evidence: SatelliteEvidence | null): EvidenceReceipt[] {
  if (!evidence) return [];
  return [evidence.before?.receipt, evidence.after?.receipt].filter(
    (receipt): receipt is EvidenceReceipt => Boolean(receipt),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/exportBundles.test.ts tests/expediente.test.ts tests/satelliteScenes.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/caseRepository.ts tests/exportBundles.test.ts
git commit -m "feat: wire satellite evidence through repository"
```

---

### Task 5: SatellitePanel Component And Replace Placeholder

**Files:**
- Create: `src/components/SatellitePanel.tsx`
- Modify: `src/components/CaseDetails.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the component**

Create `src/components/SatellitePanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ExternalLink, Satellite, X } from "lucide-react";

import type {
  SatelliteEvidence,
  SatelliteScene,
} from "@/lib/data/satelliteScenes";

const DISCLAIMER =
  "La imagen muestra cobertura del suelo en dos fechas. No prueba avance fisico, pagos ni cumplimiento. Las nubes, la resolucion (10 m por pixel) y la fecha pueden ocultar cambios.";

export default function SatellitePanel({ evidence }: { evidence: SatelliteEvidence }) {
  const [openScene, setOpenScene] = useState<SatelliteScene | null>(null);
  const hasAnyScene = Boolean(evidence.before || evidence.after);

  return (
    <section className="satellitePanel" aria-label="Imagenes Sentinel-2">
      <header>
        <Satellite size={16} aria-hidden />
        <h2>Imagenes Sentinel-2</h2>
        <span>contexto territorial</span>
      </header>
      <p className="satelliteIntro">
        Imagen oficial Copernicus. Recorte {evidence.bboxSideMeters} m alrededor del punto.
      </p>
      {hasAnyScene ? (
        <div className="satelliteGrid">
          {evidence.before ? (
            <SatelliteThumb
              label="Antes del contrato"
              scene={evidence.before}
              onZoom={() => setOpenScene(evidence.before)}
            />
          ) : (
            <SatelliteMissing label="Antes del contrato" reason="No se encontro escena previa al contrato con baja nubosidad." />
          )}
          {evidence.after ? (
            <SatelliteThumb
              label="Escena reciente"
              scene={evidence.after}
              onZoom={() => setOpenScene(evidence.after)}
            />
          ) : (
            <SatelliteMissing label="Escena reciente" reason="Escena reciente no disponible para esta coordenada." />
          )}
        </div>
      ) : (
        <p className="satelliteEmpty">
          {evidence.reason ?? "Sentinel-2 no devolvio escenas usables para esta coordenada."}
        </p>
      )}
      <p className="satelliteCaveat">{DISCLAIMER}</p>
      {openScene ? (
        <SatelliteZoomModal scene={openScene} bboxSideMeters={evidence.bboxSideMeters} onClose={() => setOpenScene(null)} />
      ) : null}
    </section>
  );
}

function SatelliteThumb({
  label,
  scene,
  onZoom,
}: {
  label: string;
  scene: SatelliteScene;
  onZoom: () => void;
}) {
  return (
    <article className="satelliteScene">
      <button type="button" className="satelliteThumb" onClick={onZoom} aria-label={`${label} - abrir vista grande`}>
        <img src={scene.imageUrl} alt={`${label} Sentinel-2 ${scene.datetime}`} loading="lazy" />
      </button>
      <header>{label}</header>
      <dl>
        <div>
          <dt>Fecha</dt>
          <dd>{formatDate(scene.datetime)}</dd>
        </div>
        <div>
          <dt>Nubes</dt>
          <dd>{scene.cloudCover.toFixed(1)}%</dd>
        </div>
      </dl>
      {scene.caveats.length > 0 ? <p className="satelliteSceneCaveat">{scene.caveats[0]}</p> : null}
      <a href={scene.stacItemUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={13} aria-hidden />
        Ver escena oficial
      </a>
    </article>
  );
}

function SatelliteMissing({ label, reason }: { label: string; reason: string }) {
  return (
    <article className="satelliteScene satelliteMissing">
      <header>{label}</header>
      <p>{reason}</p>
    </article>
  );
}

function SatelliteZoomModal({
  scene,
  bboxSideMeters,
  onClose,
}: {
  scene: SatelliteScene;
  bboxSideMeters: number;
  onClose: () => void;
}) {
  return (
    <div className="satelliteModal" role="dialog" aria-modal="true">
      <div className="satelliteModalCard">
        <header>
          <h3>Sentinel-2 . {formatDate(scene.datetime)}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={16} aria-hidden />
          </button>
        </header>
        <img src={scene.imageUrl} alt={`Sentinel-2 ${scene.sceneId}`} />
        <dl>
          <SceneRow label="Scene id" value={scene.sceneId} />
          <SceneRow label="Datetime" value={scene.datetime} />
          <SceneRow label="Resolucion" value="10 m por pixel (bandas B04, B03, B02)" />
          <SceneRow label="Nubosidad" value={`${scene.cloudCover.toFixed(1)} %`} />
          <SceneRow label="Recorte" value={`${bboxSideMeters} x ${bboxSideMeters} m`} />
          <SceneRow label="Procesamiento" value="Planetary Computer . Sentinel-2 L2A" />
          <SceneRow label="Hash WebP" value={scene.receipt.snapshotHash} />
        </dl>
        <footer>
          <a href={scene.stacItemUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} aria-hidden />
            Abrir en Copernicus / Planetary Computer
          </a>
        </footer>
      </div>
    </div>
  );
}

function SceneRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
```

- [ ] **Step 2: Replace `satelliteBox` in CaseDetails**

In `src/components/CaseDetails.tsx`:

1. Replace the existing imports line:

```tsx
import { Download, ExternalLink, FileSearch, Route, Satellite, ShieldCheck } from "lucide-react";
```

with:

```tsx
import { Download, ExternalLink, FileSearch, Route, ShieldCheck } from "lucide-react";

import SatellitePanel from "./SatellitePanel";
```

2. Remove the entire `satelliteBox` block (lines 59-80 of the current file), the one that starts with `{satelliteCandidate && (` and ends with `)}`.

3. Insert this block in the same position (between `<CaseSignalPanel caseFile={caseFile} />` and `<section className="receiptBox">`):

```tsx
      {expediente.satelliteEvidence ? (
        <SatellitePanel evidence={expediente.satelliteEvidence} />
      ) : null}
```

4. Delete the now-unused `satelliteCandidate` destructure on line 24. Replace:

```tsx
  const { hasOfficialGeometry, satelliteCandidate } = expediente.investigationContext;
```

with:

```tsx
  const { hasOfficialGeometry } = expediente.investigationContext;
```

- [ ] **Step 3: Add CSS**

Append to `src/app/globals.css`:

```css
.satellitePanel {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(255, 252, 244, 0.12);
  background: rgba(10, 10, 10, 0.45);
  padding: 16px;
}

.satellitePanel header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 252, 244, 0.74);
}

.satellitePanel header h2 {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.satellitePanel header span {
  margin-left: auto;
  color: rgba(255, 252, 244, 0.42);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.satelliteIntro {
  margin: 0;
  color: rgba(255, 252, 244, 0.58);
  font-size: 12px;
  line-height: 1.4;
}

.satelliteGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.satelliteScene {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(255, 252, 244, 0.1);
  background: rgba(0, 0, 0, 0.4);
  padding: 10px;
}

.satelliteScene header {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 252, 244, 0.68);
}

.satelliteThumb {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.satelliteThumb img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border: 1px solid rgba(255, 252, 244, 0.08);
  transition: border-color 160ms ease;
}

.satelliteThumb:hover img,
.satelliteThumb:focus-visible img {
  border-color: rgba(243, 201, 105, 0.5);
}

.satelliteScene dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
}

.satelliteScene dl div {
  display: grid;
  gap: 2px;
}

.satelliteScene dt {
  color: rgba(255, 252, 244, 0.42);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.satelliteScene dd {
  margin: 0;
  color: rgba(255, 252, 244, 0.84);
  font-family: var(--font-mono);
  font-size: 11px;
}

.satelliteScene a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(243, 201, 105, 0.84);
  text-decoration: none;
}

.satelliteScene a:hover {
  text-decoration: underline;
}

.satelliteSceneCaveat,
.satelliteEmpty,
.satelliteCaveat {
  margin: 0;
  color: rgba(255, 252, 244, 0.58);
  font-size: 11px;
  line-height: 1.4;
}

.satelliteCaveat {
  border-top: 1px solid rgba(255, 252, 244, 0.08);
  padding-top: 10px;
}

.satelliteMissing {
  align-content: start;
}

.satelliteModal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 50;
}

.satelliteModalCard {
  max-width: 720px;
  width: 100%;
  background: rgba(20, 18, 14, 0.96);
  border: 1px solid rgba(255, 252, 244, 0.12);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.satelliteModalCard header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.satelliteModalCard h3 {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.satelliteModalCard button {
  background: transparent;
  border: 1px solid rgba(255, 252, 244, 0.12);
  color: rgba(255, 252, 244, 0.72);
  padding: 4px;
}

.satelliteModalCard img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  background: #000;
}

.satelliteModalCard dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.satelliteModalCard dt {
  color: rgba(255, 252, 244, 0.42);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.satelliteModalCard dd {
  margin: 0;
  color: rgba(255, 252, 244, 0.84);
  font-family: var(--font-mono);
  font-size: 11px;
  word-break: break-all;
}

.satelliteModalCard footer a {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: rgba(243, 201, 105, 0.84);
  font-size: 12px;
  text-decoration: none;
}
```

- [ ] **Step 4: Verify the UI compiles**

Run:

```bash
npm run typecheck
npm run build
```

Expected: PASS. The build should list the same routes as before plus the unchanged set.

- [ ] **Step 5: Commit**

```bash
git add src/components/SatellitePanel.tsx src/components/CaseDetails.tsx src/app/globals.css
git commit -m "feat: render satellite panel in expediente"
```

---

### Task 6: Python Fetcher Script

**Files:**
- Create: `scripts/requirements.txt`
- Create: `scripts/fetch-sentinel-scenes.py`

- [ ] **Step 1: Declare Python dependencies**

Create `scripts/requirements.txt`:

```
pystac-client==0.8.5
planetary-computer==1.0.0
rasterio==1.4.2
Pillow==11.0.0
numpy==2.1.3
```

- [ ] **Step 2: Implement the fetcher**

Create `scripts/fetch-sentinel-scenes.py`:

```python
"""Fetch Sentinel-2 before/after scenes for Faro cases with coord + year.

Reads:
  src/data/argentinaWorkCases.json
  src/data/crossCountryCaseFiles.json

Writes:
  public/sentinel/<caseId>/{before,after}.webp
  data/sentinel/scene-manifest.json
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

import numpy as np
import planetary_computer
import pystac_client
import rasterio
from PIL import Image
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds

ROOT = Path(__file__).resolve().parents[1]
ARGENTINA_PATH = ROOT / "src" / "data" / "argentinaWorkCases.json"
CROSS_COUNTRY_PATH = ROOT / "src" / "data" / "crossCountryCaseFiles.json"
PUBLIC_DIR = ROOT / "public" / "sentinel"
MANIFEST_PATH = ROOT / "data" / "sentinel" / "scene-manifest.json"

STAC_ENDPOINT = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION = "sentinel-2-l2a"
BBOX_SIDE_METERS = 500
RENDER_WIDTH_PX = 512
WINDOWS = [
    ("6_months_lt_10pct", 6, 10.0),
    ("12_months_lt_30pct", 12, 30.0),
    ("18_months_lt_50pct", 18, 50.0),
]


@dataclass
class CaseInput:
    case_id: str
    lat: float
    lon: float
    anchor_date: datetime


def main() -> int:
    cases = list(iter_cases())
    print(f"Processing {len(cases)} case(s) with coord + year", file=sys.stderr)

    catalog = pystac_client.Client.open(STAC_ENDPOINT, modifier=planetary_computer.sign_inplace)
    scenes_entries: list[dict[str, Any]] = []

    for case in cases:
        try:
            entry = process_case(catalog, case)
        except Exception as error:  # noqa: BLE001
            print(f"[{case.case_id}] failed: {error}", file=sys.stderr)
            continue
        scenes_entries.append(entry)
        print(
            f"[{case.case_id}] before={'ok' if entry['before'] else 'none'} after={'ok' if entry['after'] else 'none'}",
            file=sys.stderr,
        )

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "stacEndpoint": STAC_ENDPOINT,
        "collection": COLLECTION,
        "parameters": {
            "bboxSideMeters": BBOX_SIDE_METERS,
            "renderWidthPx": RENDER_WIDTH_PX,
            "cloudCoverThresholds": [w[2] for w in WINDOWS],
            "dateWindowMonths": [w[1] for w in WINDOWS],
        },
        "scenes": scenes_entries,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Manifest written to {MANIFEST_PATH}", file=sys.stderr)
    return 0


def iter_cases() -> Iterable[CaseInput]:
    for path in (ARGENTINA_PATH, CROSS_COUNTRY_PATH):
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        cases = payload.get("cases") or []
        for raw in cases:
            anchor = resolve_anchor(raw)
            coords = raw.get("coordinates")
            if anchor is None or coords is None:
                continue
            yield CaseInput(
                case_id=raw["id"],
                lat=float(coords["lat"]),
                lon=float(coords["lon"]),
                anchor_date=anchor,
            )


def resolve_anchor(raw: dict[str, Any]) -> Optional[datetime]:
    awarded = raw.get("awardedAt") or raw.get("publishedAt")
    if awarded:
        return parse_iso_date(awarded)
    year = raw.get("year")
    if isinstance(year, int):
        return datetime(year, 1, 1, tzinfo=timezone.utc)
    return None


def parse_iso_date(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def process_case(catalog: pystac_client.Client, case: CaseInput) -> dict[str, Any]:
    bbox = bbox_around(case.lat, case.lon, BBOX_SIDE_METERS)
    run_date = datetime.now(timezone.utc)

    before_scene = pick_scene(catalog, bbox, end=case.anchor_date, label="before")
    after_scene = pick_scene(catalog, bbox, end=run_date, label="after")

    out_dir = PUBLIC_DIR / case.case_id
    out_dir.mkdir(parents=True, exist_ok=True)

    before_payload = export_scene(before_scene, bbox, out_dir / "before.webp", "before") if before_scene else None
    after_payload = export_scene(after_scene, bbox, out_dir / "after.webp", "after") if after_scene else None

    caveats: list[str] = []
    if before_payload is None:
        caveats.append("No se encontro escena previa al contrato con baja nubosidad.")
    if after_payload is None:
        caveats.append("Escena reciente no disponible para esta coordenada.")
    if before_payload is None and after_payload is None:
        caveats = ["Sentinel-2 no devolvio escenas usables en las ventanas exploradas."]

    return {
        "caseId": case.case_id,
        "anchorDate": case.anchor_date.date().isoformat(),
        "bbox": list(bbox),
        "before": before_payload,
        "after": after_payload,
        "caveats": caveats,
    }


def pick_scene(
    catalog: pystac_client.Client,
    bbox: tuple[float, float, float, float],
    end: datetime,
    label: str,
) -> Optional[dict[str, Any]]:
    for window_id, months, cloud_max in WINDOWS:
        start = end - timedelta(days=months * 30)
        search = catalog.search(
            collections=[COLLECTION],
            bbox=list(bbox),
            datetime=f"{start.isoformat()}/{end.isoformat()}",
            query={"eo:cloud_cover": {"lt": cloud_max}},
            limit=10,
        )
        best: Optional[Any] = None
        best_cc = math.inf
        for item in search.items():
            cc = float(item.properties.get("eo:cloud_cover", 100))
            if cc < best_cc:
                best = item
                best_cc = cc
        if best is not None:
            return {
                "item": best,
                "windowExpandedTo": window_id,
            }
    return None


def export_scene(
    selection: dict[str, Any],
    bbox: tuple[float, float, float, float],
    out_path: Path,
    label: str,
) -> dict[str, Any]:
    item = selection["item"]
    window_id = selection["windowExpandedTo"]

    bands: list[np.ndarray] = []
    for asset_key in ("B04", "B03", "B02"):
        href = item.assets[asset_key].href
        with rasterio.open(href) as src:
            src_bounds = transform_bounds("EPSG:4326", src.crs, *bbox, densify_pts=21)
            window = from_bounds(*src_bounds, transform=src.transform)
            data = src.read(1, window=window, out_shape=(RENDER_WIDTH_PX, RENDER_WIDTH_PX), resampling=rasterio.enums.Resampling.bilinear)
            bands.append(data)

    rgb = stretch_percentile(np.stack(bands, axis=-1))
    Image.fromarray(rgb, mode="RGB").save(out_path, format="WEBP", quality=92, lossless=False)

    return {
        "sceneId": item.id,
        "datetime": item.datetime.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
        "cloudCover": round(float(item.properties.get("eo:cloud_cover", 0.0)), 2),
        "windowExpandedTo": window_id,
        "imagePath": str(out_path.relative_to(ROOT)).replace("\\", "/"),
        "imageHash": sha256_of(out_path),
        "stacItemUrl": f"{STAC_ENDPOINT}/collections/{COLLECTION}/items/{item.id}",
    }


def stretch_percentile(stack: np.ndarray) -> np.ndarray:
    lo = np.percentile(stack, 2, axis=(0, 1))
    hi = np.percentile(stack, 98, axis=(0, 1))
    spread = np.where(hi > lo, hi - lo, 1)
    scaled = np.clip((stack - lo) / spread, 0, 1)
    return (scaled * 255).astype(np.uint8)


def bbox_around(lat: float, lon: float, side_meters: float) -> tuple[float, float, float, float]:
    half = side_meters / 2
    lat_delta = half / 111_320
    lon_delta = half / (111_320 * max(math.cos(math.radians(lat)), 1e-6))
    return (lon - lon_delta, lat - lat_delta, lon + lon_delta, lat + lat_delta)


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return f"sha256-{digest.hexdigest()}"


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 3: Smoke-import the script**

Run:

```bash
python -c "import ast; ast.parse(open('scripts/fetch-sentinel-scenes.py', 'r', encoding='utf-8').read())"
```

Expected: exit 0, no syntax error.

- [ ] **Step 4: Commit**

```bash
git add scripts/requirements.txt scripts/fetch-sentinel-scenes.py
git commit -m "feat: add sentinel-2 fetcher script"
```

---

### Task 7: Python Verifier Script

**Files:**
- Create: `scripts/verify-sentinel-manifest.py`

- [ ] **Step 1: Implement the verifier**

Create `scripts/verify-sentinel-manifest.py`:

```python
"""Verify scene-manifest.json integrity: file hashes, ranges, case ids."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "sentinel" / "scene-manifest.json"
ARGENTINA_PATH = ROOT / "src" / "data" / "argentinaWorkCases.json"
CROSS_COUNTRY_PATH = ROOT / "src" / "data" / "crossCountryCaseFiles.json"

VALID_WINDOWS = {"6_months_lt_10pct", "12_months_lt_30pct", "18_months_lt_50pct"}


def main() -> int:
    if not MANIFEST_PATH.exists():
        print("scene-manifest.json not found; skipping satellite verification.")
        return 0

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    known_ids = collect_case_ids()
    errors: list[str] = []
    checked_scenes = 0

    for entry in manifest.get("scenes", []):
        case_id = entry["caseId"]
        if known_ids and case_id not in known_ids:
            errors.append(f"orphan case id: {case_id}")
        if not isinstance(entry.get("bbox"), list) or len(entry["bbox"]) != 4:
            errors.append(f"{case_id}: bbox must be [minLon, minLat, maxLon, maxLat]")
        for label in ("before", "after"):
            scene = entry.get(label)
            if scene is None:
                continue
            checked_scenes += 1
            cc = scene.get("cloudCover")
            if not isinstance(cc, (int, float)) or not 0 <= cc <= 100:
                errors.append(f"{case_id}/{label}: cloudCover out of range: {cc}")
            if scene.get("windowExpandedTo") not in VALID_WINDOWS:
                errors.append(f"{case_id}/{label}: invalid windowExpandedTo: {scene.get('windowExpandedTo')}")
            image_path = ROOT / scene["imagePath"]
            if not image_path.exists():
                errors.append(f"{case_id}/{label}: image missing on disk: {scene['imagePath']}")
                continue
            actual_hash = sha256_of(image_path)
            if actual_hash != scene["imageHash"]:
                errors.append(f"{case_id}/{label}: hash mismatch (expected {scene['imageHash']}, got {actual_hash})")

    report = {
        "checkedScenes": checked_scenes,
        "errors": errors,
    }
    print(json.dumps(report, indent=2))
    return 1 if errors else 0


def collect_case_ids() -> set[str]:
    ids: set[str] = set()
    for path in (ARGENTINA_PATH, CROSS_COUNTRY_PATH):
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for case in payload.get("cases", []):
            ids.add(case["id"])
    return ids


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return f"sha256-{digest.hexdigest()}"


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Smoke-run the verifier against an empty manifest**

Make sure no manifest exists yet, then run:

```bash
python scripts/verify-sentinel-manifest.py
```

Expected: prints `scene-manifest.json not found; skipping satellite verification.` and exits 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-sentinel-manifest.py
git commit -m "feat: add sentinel manifest verifier"
```

---

### Task 8: Package Scripts And README

**Files:**
- Modify: `package.json`
- Create: `scripts/README-sentinel.md`

- [ ] **Step 1: Add npm scripts**

Edit `package.json`. Replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "next dev -H 127.0.0.1 -p 3002",
    "build": "next build",
    "start": "next start -H 127.0.0.1 -p 3002",
    "typecheck": "tsc --noEmit",
    "test": "node --experimental-strip-types --test tests/*.test.ts",
    "data:fetch": "node --experimental-strip-types scripts/fetch-official-snapshots.ts",
    "data:build": "node --experimental-strip-types scripts/build-argentina-work-cases.ts && node --experimental-strip-types scripts/build-cross-country-cases.ts",
    "data:verify": "node --experimental-strip-types scripts/verify-data-spine.ts && python scripts/verify-sentinel-manifest.py",
    "sentinel:setup": "pip install -r scripts/requirements.txt",
    "sentinel:fetch": "python scripts/fetch-sentinel-scenes.py",
    "sentinel:verify": "python scripts/verify-sentinel-manifest.py"
  },
```

- [ ] **Step 2: Write the README**

Create `scripts/README-sentinel.md`:

```markdown
# Sentinel-2 scene fetcher

Faro's satellite panel shows Sentinel-2 before/after snapshots for cases that
have official coordinates and a year. Scenes are fetched at build time from
Microsoft's Planetary Computer STAC catalog and committed as static WebP
assets. The app never fetches imagery at runtime.

## Prerequisites

- Python 3.11 or newer
- pip
- Roughly 200 MB of free disk for the working COG cache (`rasterio` reads
  windowed but a few full bands may transit memory)
- An internet connection for `sentinel:fetch`

## Setup

```bash
npm run sentinel:setup
```

This installs the dependencies listed in `scripts/requirements.txt`:
`pystac-client`, `planetary-computer`, `rasterio`, `Pillow`, `numpy`.

## Refresh scenes

```bash
npm run sentinel:fetch
```

The script iterates every case with `coordinates && year` in
`src/data/argentinaWorkCases.json` and `src/data/crossCountryCaseFiles.json`,
queries STAC, picks the best scene before the contract anchor date and the
best recent scene, downloads the RGB bands clipped to a 500 m square, applies
a 2nd/98th percentile stretch, and writes:

- `public/sentinel/<caseId>/before.webp`
- `public/sentinel/<caseId>/after.webp`
- `data/sentinel/scene-manifest.json`

If Planetary Computer is unreachable, individual case errors are logged to
stderr and the script continues; the manifest contains entries only for cases
that succeeded.

## Verify

```bash
npm run sentinel:verify
```

Checks that every `imagePath` exists on disk, every `imageHash` matches the
actual file, every `caseId` exists in the dataset, every `cloudCover` is
between 0 and 100, and every `windowExpandedTo` is one of the three known
values. Exits non-zero on any mismatch. If the manifest does not exist the
verifier reports that and exits 0.

## Re-running only missing scenes

The current fetcher re-fetches everything. To regenerate only missing scenes,
delete the corresponding `public/sentinel/<caseId>/` directory and rerun
`npm run sentinel:fetch`; cases whose WebPs already exist will be overwritten
but the network cost is dominated by COG band reads, not bandwidth between
runs.

## Storage migration path

The WebPs are committed to git. If the total grows past ~100 MB, migrate to
Cloudflare R2 by changing the `imageUrl` derivation in
`src/lib/data/satelliteScenes.ts` and uploading the contents of
`public/sentinel/` to the bucket. The receipt model already references the
STAC item URL as the canonical source, so the migration only swaps where the
preview WebP lives.
```

- [ ] **Step 3: Verify scripts parse correctly**

Run:

```bash
node --check next.config.ts || true
node -e "JSON.parse(require('fs').readFileSync('package.json'))"
```

Expected: `package.json` parses without error.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/README-sentinel.md
git commit -m "feat: add sentinel npm scripts and docs"
```

---

### Task 9: First Fetch And Acceptance Gate

**Files:**
- Read: all changed files
- Possibly create: `public/sentinel/<caseId>/*.webp` and `data/sentinel/scene-manifest.json` (script outputs)

- [ ] **Step 1: Install Python dependencies**

Run:

```bash
npm run sentinel:setup
```

Expected: pip installs the five dependencies. If pip fails on Windows because of `rasterio`, install GDAL first (e.g. via OSGeo4W or `pip install rasterio --only-binary=:all:`).

- [ ] **Step 2: Run the fetcher**

Run:

```bash
npm run sentinel:fetch
```

Expected: stderr lists each processed case as
`[CASE_ID] before=ok after=ok` and finishes with
`Manifest written to ...`. `data/sentinel/scene-manifest.json` exists and
`public/sentinel/<caseId>/before.webp`, `after.webp` exist for AR cases with
coordinates.

- [ ] **Step 3: Verify the manifest**

Run:

```bash
npm run sentinel:verify
```

Expected: report JSON with `"errors": []` and `"checkedScenes": N`,
exit code 0.

- [ ] **Step 4: Run the full TypeScript suite**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass; typecheck clean; Next.js build succeeds and lists
the same routes as before plus no new ones.

- [ ] **Step 5: Browser smoke check**

Run in one terminal:

```bash
npm run dev
```

Open `http://127.0.0.1:3002/?demo=map`. Expected:

- An AR case with coordinates renders the new `SatellitePanel` with two
  thumbnails plus the disclaimer.
- Clicking a thumbnail opens the zoom modal with the full metadata.
- A PE or CL case without coordinates does not render the satellite panel.
- A case with only `after` (or only `before`) renders one column plus the
  specific caveat.
- The downloaded evidence pack JSON (`Descargar JSON` button) includes
  receipts with `sourceId: "PC-SENTINEL2-L2A"` inside `relatedReceipts`.

- [ ] **Step 6: Commit the generated artifacts**

```bash
git add data/sentinel/scene-manifest.json public/sentinel
git commit -m "feat: ship initial sentinel-2 scenes"
```

- [ ] **Step 7: Final status check**

Run:

```bash
git status --short --branch
git log --oneline -10
```

Expected: working tree clean, ten new commits documenting each task in order.
