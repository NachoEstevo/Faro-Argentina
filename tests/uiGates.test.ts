import test from "node:test";
import assert from "node:assert/strict";

import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import {
  getMapExposureStatus,
  shouldExposeCaseOnMap,
} from "../src/lib/data/uiGates.ts";

const receipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-OBRAS",
  sourceName: "CONTRAT.AR obras",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv",
  rawPath: "data/official/ar/onc-contratar-obras.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "81-0009-OBR18",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "argentina-works@1",
  row: { numero_obra: "81-0009-OBR18" },
});

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

test("getMapExposureStatus blocks Argentina coordinates with suspicious signs", () => {
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
