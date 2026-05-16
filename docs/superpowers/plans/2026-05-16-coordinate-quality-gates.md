# Coordinate Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Faro trust only validated official coordinates for map exposure and geography-related signals, without inventing, geocoding or auto-correcting locations.

**Architecture:** Add a pure coordinate-quality module that classifies existing official coordinates by country. Wire that module into map exposure and case signals so invalid geometry becomes a visible data-quality gap instead of a map point. Add a report builder/script so data work can inspect bad coordinates and duplicates before expanding sources.

**Tech Stack:** Next.js, TypeScript, Node test runner, static generated JSON datasets, existing Faro data modules.

---

## Scope

This plan is for the core geography trust layer only.

In scope:

- classify existing coordinates;
- block invalid coordinates from the map;
- block false "official geometry" signals;
- report coordinate quality by country and case;
- document the new command and rule.

Out of scope:

- no satellite imagery work;
- no coordinate correction by intuition;
- no geocoding from names, supplier addresses or agency addresses;
- no new country/source expansion;
- no UI redesign beyond preserving existing behavior with cleaner data.

## File Map

- Create `src/lib/data/coordinateQuality.ts`
  - Owns country bounds, coordinate statuses and pure classification helpers.
- Create `tests/coordinateQuality.test.ts`
  - Covers valid, missing, placeholder, sign-suspect, duplicated-value and outside-country cases.
- Modify `src/lib/data/uiGates.ts`
  - Requires `valid_official_geometry` before exposing a case on the map.
- Modify `tests/uiGates.test.ts`
  - Updates map exposure tests to include country-aware coordinate gating.
- Modify `src/lib/data/caseSignals.ts`
  - Emits `official_geometry` only for valid official geometry.
  - Emits `geometry_needs_review` for invalid official coordinates.
  - Keeps `missing_official_geometry` for absent coordinates.
  - Does not add any satellite feature.
- Modify `tests/caseSignals.test.ts`
  - Verifies invalid coordinates do not become map/satellite-ready signals.
- Create `src/lib/data/coordinateQualityReport.ts`
  - Builds country/status counts and duplicate/conflicting coordinate diagnostics.
- Create `tests/coordinateQualityReport.test.ts`
  - Verifies report counts and duplicate handling.
- Create `scripts/report-coordinate-quality.ts`
  - Prints the report from current generated case files.
- Modify `package.json`
  - Adds `data:geo-report`.
- Modify `README.md` and `docs/handoffs/2026-05-16-data-quality-and-coverage-handoff.md`
  - Documents the geography rule and report command.

---

### Task 1: Coordinate Quality Classifier

**Files:**
- Create: `src/lib/data/coordinateQuality.ts`
- Test: `tests/coordinateQuality.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/coordinateQuality.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  assessCoordinateQuality,
  hasValidOfficialGeometry,
} from "../src/lib/data/coordinateQuality.ts";

test("assessCoordinateQuality accepts official coordinates inside Argentina bounds", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-VALID",
    countryCode: "AR",
    coordinates: { lat: -34.609296, lon: -58.390555 },
  });

  assert.equal(quality.status, "valid_official_geometry");
  assert.equal(quality.exposeOnMap, true);
  assert.deepEqual(quality.reasons, []);
});

test("assessCoordinateQuality treats missing coordinates as a data gap", () => {
  const quality = assessCoordinateQuality({
    caseId: "PE-CONTRACT-NO-GEO",
    countryCode: "PE",
    coordinates: null,
  });

  assert.equal(quality.status, "missing_geometry");
  assert.equal(quality.exposeOnMap, false);
  assert.deepEqual(quality.reasons, ["missing_geometry"]);
});

test("assessCoordinateQuality blocks placeholder coordinates", () => {
  const zero = assessCoordinateQuality({
    caseId: "AR-WORK-ZERO",
    countryCode: "AR",
    coordinates: { lat: 0, lon: 0 },
  });
  const sample = assessCoordinateQuality({
    caseId: "AR-WORK-SAMPLE",
    countryCode: "AR",
    coordinates: { lat: 0.123456, lon: 0.123456 },
  });

  assert.equal(zero.status, "placeholder_geometry");
  assert.equal(sample.status, "placeholder_geometry");
  assert.equal(zero.exposeOnMap, false);
  assert.equal(sample.exposeOnMap, false);
});

test("assessCoordinateQuality identifies coordinates that look like missing signs", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-SIGN",
    countryCode: "AR",
    coordinates: { lat: 30.6297222, lon: 66.2694444 },
  });

  assert.equal(quality.status, "sign_suspect");
  assert.equal(quality.exposeOnMap, false);
  assert.match(quality.summary, /signo/i);
});

test("assessCoordinateQuality identifies duplicated coordinate values", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-DUPLICATED",
    countryCode: "AR",
    coordinates: { lat: -34.609296, lon: -34.609296 },
  });

  assert.equal(quality.status, "duplicated_value_geometry");
  assert.equal(quality.exposeOnMap, false);
});

test("assessCoordinateQuality blocks coordinates outside expected country bounds", () => {
  const quality = assessCoordinateQuality({
    caseId: "CL-TENDER-USA",
    countryCode: "CL",
    coordinates: { lat: 38.8977, lon: -77.0365 },
  });

  assert.equal(quality.status, "outside_country_bounds");
  assert.equal(quality.exposeOnMap, false);
});

test("hasValidOfficialGeometry is true only for validated official geometry", () => {
  assert.equal(hasValidOfficialGeometry({
    caseId: "AR-WORK-VALID",
    countryCode: "AR",
    coordinates: { lat: -34.609296, lon: -58.390555 },
  }), true);

  assert.equal(hasValidOfficialGeometry({
    caseId: "AR-WORK-ZERO",
    countryCode: "AR",
    coordinates: { lat: 0, lon: 0 },
  }), false);
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
node --experimental-strip-types --test tests/coordinateQuality.test.ts
```

Expected: fail with module not found for `coordinateQuality.ts`.

- [ ] **Step 3: Implement the minimal classifier**

Create `src/lib/data/coordinateQuality.ts`:

```ts
import type { CountryCode } from "./sourceCatalog.ts";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export type CoordinateStatus =
  | "valid_official_geometry"
  | "missing_geometry"
  | "invalid_coordinate"
  | "placeholder_geometry"
  | "duplicated_value_geometry"
  | "sign_suspect"
  | "outside_country_bounds";

export interface CoordinateCandidate {
  caseId?: string;
  countryCode: CountryCode | string;
  coordinates: GeoPoint | null;
}

export interface CoordinateQuality {
  status: CoordinateStatus;
  exposeOnMap: boolean;
  reasons: CoordinateStatus[];
  summary: string;
  coordinates: GeoPoint | null;
  countryCode: string;
}

interface CountryBounds {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

const COUNTRY_BOUNDS: Record<CountryCode, CountryBounds> = {
  AR: { latMin: -56, latMax: -21, lonMin: -74, lonMax: -53 },
  PE: { latMin: -19, latMax: 1, lonMin: -82, lonMax: -68 },
  CL: { latMin: -56, latMax: -17, lonMin: -76, lonMax: -66 },
};

const PLACEHOLDERS = [
  { lat: 0, lon: 0 },
  { lat: 0.123456, lon: 0.123456 },
];

export function assessCoordinateQuality(candidate: CoordinateCandidate): CoordinateQuality {
  const coordinates = candidate.coordinates;
  const countryCode = String(candidate.countryCode);

  if (!coordinates) {
    return buildQuality("missing_geometry", countryCode, null, "No tiene coordenada oficial.");
  }

  if (!isFinitePoint(coordinates)) {
    return buildQuality("invalid_coordinate", countryCode, coordinates, "La coordenada no es numerica o esta fuera del rango global.");
  }

  if (isKnownPlaceholder(coordinates)) {
    return buildQuality("placeholder_geometry", countryCode, coordinates, "La coordenada parece placeholder y no debe dibujarse.");
  }

  if (isDuplicatedValue(coordinates)) {
    return buildQuality("duplicated_value_geometry", countryCode, coordinates, "Latitud y longitud tienen el mismo valor; requiere revision contra fuente oficial.");
  }

  const bounds = COUNTRY_BOUNDS[countryCode as CountryCode];
  if (!bounds) {
    return buildQuality("outside_country_bounds", countryCode, coordinates, "No hay bounds configurados para este pais.");
  }

  if (isInsideBounds(coordinates, bounds)) {
    return {
      status: "valid_official_geometry",
      exposeOnMap: true,
      reasons: [],
      summary: "Coordenada oficial dentro de los bounds esperados del pais.",
      coordinates,
      countryCode,
    };
  }

  if (looksLikeMissingSign(coordinates, bounds)) {
    return buildQuality("sign_suspect", countryCode, coordinates, "La coordenada queda fuera del pais, pero cambiando signos entraria en bounds; no se corrige automaticamente.");
  }

  return buildQuality("outside_country_bounds", countryCode, coordinates, "La coordenada cae fuera de los bounds esperados del pais.");
}

export function hasValidOfficialGeometry(candidate: CoordinateCandidate): boolean {
  return assessCoordinateQuality(candidate).status === "valid_official_geometry";
}

function buildQuality(
  status: Exclude<CoordinateStatus, "valid_official_geometry">,
  countryCode: string,
  coordinates: GeoPoint | null,
  summary: string,
): CoordinateQuality {
  return {
    status,
    exposeOnMap: false,
    reasons: [status],
    summary,
    coordinates,
    countryCode,
  };
}

function isFinitePoint(point: GeoPoint): boolean {
  return Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lon >= -180 &&
    point.lon <= 180;
}

function isKnownPlaceholder(point: GeoPoint): boolean {
  return PLACEHOLDERS.some((placeholder) =>
    nearlyEqual(point.lat, placeholder.lat) && nearlyEqual(point.lon, placeholder.lon),
  );
}

function isDuplicatedValue(point: GeoPoint): boolean {
  return nearlyEqual(point.lat, point.lon);
}

function isInsideBounds(point: GeoPoint, bounds: CountryBounds): boolean {
  return point.lat >= bounds.latMin &&
    point.lat <= bounds.latMax &&
    point.lon >= bounds.lonMin &&
    point.lon <= bounds.lonMax;
}

function looksLikeMissingSign(point: GeoPoint, bounds: CountryBounds): boolean {
  const candidates = [
    { lat: -point.lat, lon: point.lon },
    { lat: point.lat, lon: -point.lon },
    { lat: -point.lat, lon: -point.lon },
  ];
  return candidates.some((candidate) => isInsideBounds(candidate, bounds));
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001;
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
node --experimental-strip-types --test tests/coordinateQuality.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/coordinateQuality.ts tests/coordinateQuality.test.ts
git commit -m "feat: add coordinate quality classifier"
```

---

### Task 2: Gate Map Exposure With Coordinate Quality

**Files:**
- Modify: `src/lib/data/uiGates.ts`
- Modify: `tests/uiGates.test.ts`

- [ ] **Step 1: Update the failing tests**

Modify `tests/uiGates.test.ts` so map candidates include `countryCode` and invalid geometry is blocked:

```ts
test("shouldExposeCaseOnMap only exposes cases with validated coordinates, receipt and caveats", () => {
  const caseFile = {
    countryCode: "AR",
    coordinates: { lat: -34.585722, lon: -58.389361 },
    evidenceLevel: "official_dataset",
    receipt,
    caveats: ["Coordenada declarada por fuente oficial."],
  };

  assert.equal(shouldExposeCaseOnMap(caseFile), true);
});

test("getMapExposureStatus explains why a case is not map-ready", () => {
  const status = getMapExposureStatus({
    countryCode: "AR",
    coordinates: null,
    evidenceLevel: "official_dataset",
    receipt: { ...receipt, locatorType: "missing" },
    caveats: [],
  });

  assert.equal(status.expose, false);
  assert.deepEqual(status.reasons, [
    "missing_geometry",
    "missing_receipt",
    "missing_caveats",
  ]);
});

test("shouldExposeCaseOnMap rejects official coordinates outside country bounds", () => {
  const status = getMapExposureStatus({
    countryCode: "AR",
    coordinates: { lat: 30.6297222, lon: 66.2694444 },
    evidenceLevel: "official_dataset",
    receipt,
    caveats: ["Coordenada declarada por fuente oficial."],
  });

  assert.equal(status.expose, false);
  assert.deepEqual(status.reasons, ["sign_suspect"]);
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
node --experimental-strip-types --test tests/uiGates.test.ts
```

Expected: fail because `MapCandidate` does not require/use `countryCode`.

- [ ] **Step 3: Update the map gate**

Modify `src/lib/data/uiGates.ts`:

```ts
import { assessCoordinateQuality } from "./coordinateQuality.ts";
import { shouldExposeReceiptInUi, type EvidenceReceipt } from "./evidenceReceipts.ts";

interface MapCandidate {
  countryCode: string;
  coordinates: { lat: number; lon: number } | null;
  evidenceLevel: string;
  receipt: EvidenceReceipt;
  caveats: string[];
}

export interface UiExposureStatus {
  expose: boolean;
  reasons: string[];
}

export function getMapExposureStatus(caseFile: MapCandidate): UiExposureStatus {
  const reasons: string[] = [];
  const coordinateQuality = assessCoordinateQuality({
    countryCode: caseFile.countryCode,
    coordinates: caseFile.coordinates,
  });

  if (!coordinateQuality.exposeOnMap) reasons.push(...coordinateQuality.reasons);
  if (!shouldExposeReceiptInUi(caseFile.receipt)) reasons.push("missing_receipt");
  if (caseFile.caveats.length === 0) reasons.push("missing_caveats");
  if (caseFile.evidenceLevel !== "official_dataset") reasons.push("unsupported_evidence_level");

  return {
    expose: reasons.length === 0,
    reasons,
  };
}

export function shouldExposeCaseOnMap(caseFile: MapCandidate): boolean {
  return getMapExposureStatus(caseFile).expose;
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
node --experimental-strip-types --test tests/uiGates.test.ts
```

Expected: pass.

- [ ] **Step 5: Run repository tests that depend on map filtering**

Run:

```bash
node --experimental-strip-types --test tests/uiGates.test.ts tests/mapMarkers.test.ts tests/coverage.test.ts tests/explorerCases.test.ts
```

Expected: pass. If a test expected the old map-ready count, update the expected count to reflect only validated geography and include a comment that invalid official coordinates are intentionally hidden.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/uiGates.ts tests/uiGates.test.ts tests/coverage.test.ts tests/explorerCases.test.ts tests/mapMarkers.test.ts
git commit -m "fix: block invalid coordinates from map exposure"
```

---

### Task 3: Make Geography Signals Honest

**Files:**
- Modify: `src/lib/data/caseSignals.ts`
- Modify: `tests/caseSignals.test.ts`

- [ ] **Step 1: Add failing signal tests**

Add this test to `tests/caseSignals.test.ts`:

```ts
test("buildCaseSignals does not treat invalid coordinates as official geometry", () => {
  const signals = buildCaseSignals({
    id: "AR-WORK-BAD-GEO",
    countryCode: "AR",
    caseType: "public_work",
    title: "Obra con coordenada sospechosa",
    workNumber: "46/8-0004-OBR20",
    year: 2020,
    procedureNumber: "46/8-0072-LPU19",
    agencyName: "Direccion Nacional de Vialidad",
    agencyCode: "604",
    contractingUnit: "8 La Rioja - DNV",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: 30.6297222, lon: 66.2694444 },
    evidenceLevel: "official_dataset",
    receipt,
    caveats: ["Coordenada declarada por fuente oficial; requiere QA geografico."],
  });

  assert.equal(signals.some((signal) => signal.code === "official_geometry"), false);
  assert.equal(signals.some((signal) => signal.code === "sentinel_candidate"), false);
  assert.equal(signals.some((signal) => signal.code === "geometry_needs_review"), true);
  assert.doesNotMatch(JSON.stringify(signals), /corrupt|fraude|delito|culpable/i);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --experimental-strip-types --test tests/caseSignals.test.ts
```

Expected: fail because invalid coordinates still emit `official_geometry`.

- [ ] **Step 3: Update `caseSignals.ts`**

Import the classifier:

```ts
import { assessCoordinateQuality } from "./coordinateQuality.ts";
```

Replace `addGeoSignals` with:

```ts
function addGeoSignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  const coordinateQuality = assessCoordinateQuality({
    countryCode: caseFile.countryCode,
    coordinates: caseFile.coordinates ?? null,
  });

  if (coordinateQuality.status === "valid_official_geometry" && caseFile.coordinates) {
    signals.push({
      code: "official_geometry",
      kind: "ready",
      priority: 58,
      label: "Ubicacion oficial validada",
      summary: "El caso tiene coordenadas declaradas por fuente oficial y pasan el gate geografico de Faro.",
      evidence: `${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}`,
      caveat: "La coordenada ubica el caso, no prueba avance fisico ni pagos.",
      action: "Abrir mapa, fuente y expediente antes de interpretar el punto.",
    });

    if (caseFile.countryCode === "AR" && caseFile.year !== null && caseFile.year !== undefined) {
      signals.push({
        code: "sentinel_candidate",
        kind: "ready",
        priority: 76,
        label: "Candidato Sentinel-2",
        summary: "Tiene fecha aproximada y coordenada oficial validada suficientes para que otro flujo prepare una comparacion satelital.",
        evidence: `Anio ${caseFile.year}; coordenada ${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}.`,
        caveat: "Este flujo no analiza imagenes satelitales; solo evita enviar coordenadas invalidas.",
        action: "Usar solo si el pipeline satelital confirma escena, nubes, fecha y resolucion.",
      });
    }
    return;
  }

  if (coordinateQuality.status === "missing_geometry") {
    signals.push({
      code: "missing_official_geometry",
      kind: "gap",
      priority: 52,
      label: "Sin geometria oficial",
      summary: "El caso es verificable por fuente, pero no se dibuja en mapa porque falta una coordenada oficial confiable.",
      evidence: `Fuente principal: ${caseFile.receipt.sourceId}.`,
      caveat: "Faro no infiere ubicaciones desde nombres cuando no hay geometria oficial suficiente.",
      action: "Cruzar con catastro, UBIGEO, comuna o dataset territorial oficial antes de mapear.",
    });
    return;
  }

  signals.push({
    code: "geometry_needs_review",
    kind: "gap",
    priority: 56,
    label: "Geometria requiere revision",
    summary: coordinateQuality.summary,
    evidence: caseFile.coordinates
      ? `Coordenada declarada: ${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}.`
      : `Fuente principal: ${caseFile.receipt.sourceId}.`,
    caveat: "Faro conserva la coordenada como dato de fuente, pero no la dibuja ni la corrige sin verificacion oficial.",
    action: "Revisar la fila original y cruzar con una fuente territorial oficial antes de usarla.",
  });
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
node --experimental-strip-types --test tests/caseSignals.test.ts tests/investigatorExplorer.test.ts tests/caseInspector.test.ts
```

Expected: pass. If copy assertions changed from "Ubicacion oficial" to "Ubicacion oficial validada", update the expected copy only where the new label is intentional.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/caseSignals.ts tests/caseSignals.test.ts tests/investigatorExplorer.test.ts tests/caseInspector.test.ts
git commit -m "fix: make geography signals depend on validated coordinates"
```

---

### Task 4: Coordinate Quality Report

**Files:**
- Create: `src/lib/data/coordinateQualityReport.ts`
- Create: `tests/coordinateQualityReport.test.ts`
- Create: `scripts/report-coordinate-quality.ts`
- Modify: `package.json`

- [ ] **Step 1: Write report tests**

Create `tests/coordinateQualityReport.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { buildCoordinateQualityReport } from "../src/lib/data/coordinateQualityReport.ts";

test("buildCoordinateQualityReport counts statuses by country", () => {
  const report = buildCoordinateQualityReport([
    {
      id: "AR-WORK-VALID",
      countryCode: "AR",
      title: "Obra valida",
      coordinates: { lat: -34.6, lon: -58.4 },
    },
    {
      id: "AR-WORK-ZERO",
      countryCode: "AR",
      title: "Obra placeholder",
      coordinates: { lat: 0, lon: 0 },
    },
    {
      id: "PE-CONTRACT-NO-GEO",
      countryCode: "PE",
      title: "Contrato sin geo",
      coordinates: null,
    },
  ]);

  assert.equal(report.totalCases, 3);
  assert.equal(report.byCountry.AR.totalCases, 2);
  assert.equal(report.byCountry.AR.byStatus.valid_official_geometry, 1);
  assert.equal(report.byCountry.AR.byStatus.placeholder_geometry, 1);
  assert.equal(report.byCountry.PE.byStatus.missing_geometry, 1);
  assert.equal(report.mapEligibleCases, 1);
});

test("buildCoordinateQualityReport detects duplicated case ids with mixed geometry", () => {
  const report = buildCoordinateQualityReport([
    {
      id: "AR-WORK-DUP",
      countryCode: "AR",
      title: "Obra duplicada",
      coordinates: { lat: 0.123456, lon: 0.123456 },
    },
    {
      id: "AR-WORK-DUP",
      countryCode: "AR",
      title: "Obra duplicada",
      coordinates: { lat: -34.614959, lon: -58.37624 },
    },
  ]);

  assert.equal(report.duplicateCaseIds.length, 1);
  assert.equal(report.duplicateCaseIds[0]?.caseId, "AR-WORK-DUP");
  assert.deepEqual(report.duplicateCaseIds[0]?.statuses.sort(), [
    "placeholder_geometry",
    "valid_official_geometry",
  ]);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
node --experimental-strip-types --test tests/coordinateQualityReport.test.ts
```

Expected: fail with module not found for `coordinateQualityReport.ts`.

- [ ] **Step 3: Implement the report builder**

Create `src/lib/data/coordinateQualityReport.ts`:

```ts
import {
  assessCoordinateQuality,
  type CoordinateStatus,
  type GeoPoint,
} from "./coordinateQuality.ts";

interface ReportCase {
  id: string;
  countryCode: string;
  title: string;
  coordinates: GeoPoint | null;
}

export interface CoordinateQualityCountrySummary {
  totalCases: number;
  mapEligibleCases: number;
  byStatus: Partial<Record<CoordinateStatus, number>>;
}

export interface DuplicateCaseGeometrySummary {
  caseId: string;
  countryCode: string;
  title: string;
  count: number;
  statuses: CoordinateStatus[];
}

export interface CoordinateQualityReport {
  generatedAt: string;
  totalCases: number;
  mapEligibleCases: number;
  byCountry: Record<string, CoordinateQualityCountrySummary>;
  duplicateCaseIds: DuplicateCaseGeometrySummary[];
}

export function buildCoordinateQualityReport(cases: ReportCase[]): CoordinateQualityReport {
  const byCountry: Record<string, CoordinateQualityCountrySummary> = {};
  const byCaseId = new Map<string, ReportCase[]>();
  let mapEligibleCases = 0;

  for (const caseFile of cases) {
    const quality = assessCoordinateQuality(caseFile);
    const country = caseFile.countryCode;
    byCountry[country] ??= { totalCases: 0, mapEligibleCases: 0, byStatus: {} };
    byCountry[country].totalCases += 1;
    byCountry[country].byStatus[quality.status] =
      (byCountry[country].byStatus[quality.status] ?? 0) + 1;

    if (quality.exposeOnMap) {
      byCountry[country].mapEligibleCases += 1;
      mapEligibleCases += 1;
    }

    byCaseId.set(caseFile.id, [...(byCaseId.get(caseFile.id) ?? []), caseFile]);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    mapEligibleCases,
    byCountry,
    duplicateCaseIds: buildDuplicateSummaries(byCaseId),
  };
}

function buildDuplicateSummaries(byCaseId: Map<string, ReportCase[]>): DuplicateCaseGeometrySummary[] {
  return Array.from(byCaseId.entries())
    .filter(([, cases]) => cases.length > 1)
    .map(([caseId, cases]) => ({
      caseId,
      countryCode: cases[0]?.countryCode ?? "",
      title: cases[0]?.title ?? caseId,
      count: cases.length,
      statuses: Array.from(new Set(
        cases.map((caseFile) => assessCoordinateQuality(caseFile).status),
      )),
    }))
    .sort((left, right) => right.count - left.count || left.caseId.localeCompare(right.caseId));
}
```

- [ ] **Step 4: Add the script**

Create `scripts/report-coordinate-quality.ts`:

```ts
import argentinaPayload from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryPayload from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import { buildCoordinateQualityReport } from "../src/lib/data/coordinateQualityReport.ts";

const argentinaCases = (argentinaPayload as { cases: unknown[] }).cases;
const crossCountryCases = (crossCountryPayload as { cases: unknown[] }).cases;

const report = buildCoordinateQualityReport([
  ...toReportCases(argentinaCases),
  ...toReportCases(crossCountryCases),
]);

console.log(JSON.stringify(report, null, 2));

function toReportCases(cases: unknown[]) {
  return cases.map((caseFile) => {
    const value = caseFile as {
      id: string;
      countryCode: string;
      title: string;
      coordinates: { lat: number; lon: number } | null;
    };
    return {
      id: value.id,
      countryCode: value.countryCode,
      title: value.title,
      coordinates: value.coordinates,
    };
  });
}
```

Modify `package.json` scripts:

```json
"data:geo-report": "node --experimental-strip-types scripts/report-coordinate-quality.ts"
```

- [ ] **Step 5: Run tests and report**

Run:

```bash
node --experimental-strip-types --test tests/coordinateQualityReport.test.ts
npm run data:geo-report
```

Expected:

- tests pass;
- report prints JSON with `totalCases`, `mapEligibleCases`, `byCountry`, and `duplicateCaseIds`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/coordinateQualityReport.ts tests/coordinateQualityReport.test.ts scripts/report-coordinate-quality.ts package.json
git commit -m "feat: add coordinate quality report"
```

---

### Task 5: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/handoffs/2026-05-16-data-quality-and-coverage-handoff.md`

- [ ] **Step 1: Document the new command in README**

Add this command under "Comandos De Datos Y Verificacion":

```bash
npm run data:geo-report
```

Add this note under "Estado Actual Y Proxima Prioridad":

```md
La regla geografica de Faro es conservadora: una coordenada oficial solo llega al
mapa si pasa QA por pais. Coordenadas placeholder, fuera de bounds, duplicadas o
sospechosas quedan como brecha de datos y no se corrigen automaticamente.
```

- [ ] **Step 2: Update the data handoff**

In `docs/handoffs/2026-05-16-data-quality-and-coverage-handoff.md`, add this under the coordinate QA task:

```md
Comando esperado despues de implementar el gate:

```bash
npm run data:geo-report
```

El reporte debe usarse antes de dar casos al mapa o al flujo satelital.
```

- [ ] **Step 3: Run full safe verification**

Run:

```bash
node --experimental-strip-types --test tests/coordinateQuality.test.ts tests/coordinateQualityReport.test.ts tests/uiGates.test.ts tests/caseSignals.test.ts tests/investigatorExplorer.test.ts tests/caseInspector.test.ts
npm run data:geo-report
npm run typecheck
npm run build
```

Expected:

- focused tests pass;
- geo report runs;
- typecheck passes;
- build passes.

Do not require `npm test` to pass until the existing `data:verify` hash mismatch is fixed. If `npm test` is run, document that known data-spine failure separately and do not hide it.

- [ ] **Step 4: Final commit**

```bash
git add README.md docs/handoffs/2026-05-16-data-quality-and-coverage-handoff.md
git commit -m "docs: document coordinate quality gate"
```

---

## Self-Review

- This plan does not add satellite features.
- This plan does not infer, correct, geocode or invent coordinates.
- Invalid official coordinates are preserved as evidence/source data but blocked
  from map exposure.
- The map gate, geography signals and reporting all use the same classifier.
- The plan leaves broader data expansion for a later source-coverage sprint.
