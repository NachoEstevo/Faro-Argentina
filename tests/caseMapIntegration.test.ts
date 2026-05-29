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

test("CaseMap uses the official Argenmap dark base layer outside Wayback mode", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /ARGENMAP_DARK_URL/);
  assert.match(source, /argenmap_oscuro@EPSG%3A3857@png\/\{z\}\/\{x\}\/\{-y\}\.png/);
  assert.match(source, /Instituto Geogr[aá]fico Nacional - Argenmap/);
  assert.doesNotMatch(source, /basemaps\.cartocdn\.com/);
});

test("CaseMap shows Wayback tile loading feedback and prefetches the active release first", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /waybackTileLoader/);
  assert.match(source, /loading:\s*\(\) => setTileLoadingState\("loading"\)/);
  assert.match(source, /load:\s*\(\) => setTileLoadingState\("ready"\)/);
  assert.match(source, /WaybackTilePrefetcher/);
  assert.match(source, /preloadWaybackTile\(activeTileUrl, "high"\)/);
  assert.match(source, /scheduleIdlePrefetch/);
  assert.match(source, /preloadWaybackTile\(url, "low"\)/);
});
