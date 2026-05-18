import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const caseMapUrl = new URL("../src/components/CaseMap.tsx", import.meta.url);

test("CaseMap filters markers through the map eligibility gate", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /isMapMarkerEligible/);
  assert.match(source, /cases\.filter\(isMapMarkerEligible\)/);
  assert.doesNotMatch(source, /caseFile\.coordinates !== null/);
});

test("CaseMap labels administrative centroid markers as references", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /official_admin_centroid/);
  assert.match(source, /Referencia comunal, no ubicacion exacta/);
  assert.match(source, /dashArray/);
});

test("CaseMap keeps selected case zoom independent from Wayback state", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /map\.flyTo\(\[selectedCase\.coordinates\.lat, selectedCase\.coordinates\.lon\], WAYBACK_TARGET_ZOOM/);
  assert.doesNotMatch(source, /const targetZoom = waybackActive \? WAYBACK_TARGET_ZOOM : 8/);
});
