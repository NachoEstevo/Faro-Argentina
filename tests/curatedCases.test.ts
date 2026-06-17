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
const presentationPackageUrl = new URL("../docs/presentation/2026-05-25-institutional-demo-package.md", import.meta.url);

const forbiddenCopy = /corrup|fraude|culpable|sospech|obra fantasma|red de corrup/i;

test("curated cases are a small evidence-first set, not a forced grid", () => {
  assert.ok(CURATED_CASES.length >= 1);
  assert.ok(CURATED_CASES.length <= 6);
});

test("curated cases point to real Faro cases with receipts and caveats", () => {
  for (const curated of CURATED_CASES) {
    const caseFile = getCaseById(curated.caseId);
    assert.ok(caseFile, `${curated.caseId} should exist`);
    assert.ok(caseFile.receipt, `${curated.caseId} should have a receipt`);
    assert.ok(caseFile.caveats?.length, `${curated.caseId} should expose caveats`);
    assert.ok(curated.presentationReason.length >= 40, `${curated.caseId} should explain why it is selected`);
    assert.ok(curated.nextStep.length >= 40, `${curated.caseId} should expose a next verification step`);
  }
});

test("curated cases expose compact chronology and investigation facts", () => {
  for (const curated of CURATED_CASES) {
    assert.equal(curated.timeline.length, 3, `${curated.caseId} should expose three timeline anchors`);
    assert.equal(curated.keyFacts.length, 3, `${curated.caseId} should expose three key facts`);
    assert.ok(curated.contextNote.length >= 60, `${curated.caseId} should explain the evidence boundary`);

    for (const item of curated.timeline) {
      assert.ok(item.label.length > 0, `${curated.caseId} timeline item should have a label`);
      assert.ok(item.value.length > 0, `${curated.caseId} timeline item should have a value`);
      assert.ok(item.source.length > 0, `${curated.caseId} timeline item should have a source`);
    }
  }
});

test("curated chronology avoids known overclaims", () => {
  const rn3 = CURATED_CASES.find((caseFile) => caseFile.caseId === "AR-CONTRACT-46-1585-CON21");
  assert.ok(rn3, "RN3 selected case should exist");
  assert.doesNotMatch(JSON.stringify(rn3.timeline), /11\/02\/2022|firma|Contrato/i);

  const camposDelTuyu = CURATED_CASES.find((caseFile) => caseFile.caseId === "AR-CONTRACT-74-0052-CON23");
  assert.ok(camposDelTuyu, "Campos del Tuyu selected case should exist");
  assert.match(camposDelTuyu.contextNote, /revisar pliegos y actas/i);
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

test("institutional package stays grounded in selected cases and evidence boundaries", async () => {
  const source = await readFile(presentationPackageUrl, "utf8");

  assert.doesNotMatch(source, forbiddenCopy);
  assert.match(source, /Faro no acusa/);
  assert.match(source, /\/pais\/AR\?mode=explorer&preset=selected/);
  assert.match(source, /\/pais\/AR\?mode=aportes/);
  assert.doesNotMatch(source, /\/pais\/AR\?mode=investigations/);
  assert.match(source, /\/admin\/aportes/);
  assert.match(source, /\/expediente\/AR-CONTRACT-74-0052-CON23\/informe/);
  assert.match(source, /Frontera de evidencia/);
  assert.match(source, /Que no afirmar/);

  for (const curated of CURATED_CASES) {
    assert.match(source, new RegExp(curated.caseId), `${curated.caseId} should be in the package`);
  }
});
