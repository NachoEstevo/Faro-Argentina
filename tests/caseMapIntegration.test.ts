import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const caseMapUrl = new URL("../src/components/CaseMap.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const casePanelUrl = new URL("../src/components/MapUI/CasePanel.tsx", import.meta.url);
const panelImageryUrl = new URL("../src/components/MapUI/panel/PanelImagery.tsx", import.meta.url);
const casePanelStylesUrl = new URL("../src/components/MapUI/casePanel.module.css", import.meta.url);

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
  const source = [
    await readFile(caseMapUrl, "utf8"),
    await readFile(faroExperienceUrl, "utf8"),
    await readFile(casePanelUrl, "utf8"),
    await readFile(panelImageryUrl, "utf8"),
    await readFile(casePanelStylesUrl, "utf8"),
  ].join("\n");

  assert.match(source, /onWaybackTileLoadingChange\(true\)/);
  assert.match(source, /onWaybackTileLoadingChange\(false\)/);
  assert.match(source, /waybackTileLoading/);
  assert.match(source, /tilesLoading/);
  assert.match(source, /imageryTileLoader/);
  assert.match(source, /Cargando vista satelital/);
  assert.match(source, /WaybackTilePrefetcher/);
  assert.match(source, /preloadWaybackTile\(activeTileUrl, "high"\)/);
  assert.match(source, /scheduleIdlePrefetch/);
  assert.match(source, /preloadWaybackTile\(url, "low"\)/);
});
