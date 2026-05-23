import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { CURATED_CASES } from "../src/data/curatedCases.ts";
import { getCaseById } from "../src/lib/caseRepository.ts";
import { shouldExposeCaseOnMap } from "../src/lib/data/uiGates.ts";

const curatedCasesUrl = new URL("../src/data/curatedCases.ts", import.meta.url);
const regionalMapUrl = new URL("../src/components/RegionalMap/RegionalMap.tsx", import.meta.url);
const countryMapUrl = new URL("../src/components/RegionalMap/CountryMap.tsx", import.meta.url);
const trustStripUrl = new URL("../src/components/RegionalMap/TrustStrip.tsx", import.meta.url);

const forbiddenCopy = /corrup|fraude|culpable|sospech|obra fantasma|red de corrup/i;

test("curated cases are a small evidence-first set, not a forced grid", () => {
  assert.ok(CURATED_CASES.length >= 1);
  assert.ok(CURATED_CASES.length <= 5);
});

test("curated cases point to real Faro cases with receipts and caveats", () => {
  for (const curated of CURATED_CASES) {
    const caseFile = getCaseById(curated.caseId);
    assert.ok(caseFile, `${curated.caseId} should exist`);
    assert.ok(caseFile.receipt, `${curated.caseId} should have a receipt`);
    assert.ok(caseFile.caveats?.length, `${curated.caseId} should expose caveats`);
  }
});

test("curated editorial copy remains non-accusatory", () => {
  assert.doesNotMatch(JSON.stringify(CURATED_CASES), forbiddenCopy);
});

test("curated map state matches the official geometry gate", () => {
  for (const curated of CURATED_CASES) {
    const caseFile = getCaseById(curated.caseId);
    assert.ok(caseFile, `${curated.caseId} should exist`);
    assert.equal(
      curated.mapState === "map_ready",
      shouldExposeCaseOnMap(caseFile),
      `${curated.caseId} mapState should match map eligibility`,
    );
  }
});

test("curated cases include both map-ready and documentary/data-gap entries", () => {
  assert.ok(CURATED_CASES.some((caseFile) => caseFile.mapState === "map_ready"));
  assert.ok(CURATED_CASES.some((caseFile) => caseFile.mapState !== "map_ready"));
});

test("Mapa de Inversiones curated candidate is data-gap only", () => {
  const dataGap = CURATED_CASES.find((caseFile) => caseFile.caseId === "AR-MAPA-INV-1003129182");
  assert.ok(dataGap, "data-gap case should be curated");
  assert.equal(dataGap.role, "data_gap");
  assert.equal(dataGap.mapState, "not_map_ready");

  const caseFile = getCaseById(dataGap.caseId);
  assert.ok(caseFile, `${dataGap.caseId} should exist`);
  const dataGapCase = caseFile as typeof caseFile & {
    amount?: unknown;
    physicalProgress?: unknown;
    financialProgress?: unknown;
  };
  assert.equal(dataGapCase.receipt.sourceId, "AR-MAPA-INVERSIONES-OBRAS");
  assert.equal(dataGapCase.receipt.locatorType, "official_detail");
  assert.ok(dataGapCase.amount, "data-gap case should expose an official amount");
  assert.equal(typeof dataGapCase.physicalProgress, "number");
  assert.equal(typeof dataGapCase.financialProgress, "number");
  assert.equal(dataGapCase.coordinates, null);
  assert.equal(shouldExposeCaseOnMap(dataGapCase), false);
});

test("regional home keeps the map clean and links selected cases from the trust strip", async () => {
  const regionalMapSource = await readFile(regionalMapUrl, "utf8");
  const countryMapSource = await readFile(countryMapUrl, "utf8");
  const trustStripSource = await readFile(trustStripUrl, "utf8");
  const curatedDataSource = await readFile(curatedCasesUrl, "utf8");

  assert.doesNotMatch(regionalMapSource, /CuratedCasesPanel|faro-featured-host|curatedPanelHost/);
  assert.doesNotMatch(countryMapSource, /FeaturedCasesOverlay/);
  assert.match(trustStripSource, /Expedientes seleccionados/);
  assert.match(trustStripSource, /Seleccionados/);
  assert.match(trustStripSource, /preset=selected/);
  assert.match(curatedDataSource, /sin punto de mapa validado/i);
});
