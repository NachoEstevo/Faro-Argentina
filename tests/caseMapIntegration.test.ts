import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const caseMapUrl = new URL("../src/components/CaseMap.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const casePanelUrl = new URL("../src/components/MapUI/CasePanel.tsx", import.meta.url);
const panelImageryUrl = new URL("../src/components/MapUI/panel/PanelImagery.tsx", import.meta.url);
const regionalMapStylesUrl = new URL("../src/components/RegionalMap/RegionalMap.module.css", import.meta.url);

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

test("CaseMap hover tooltip surfaces useful official context without accusation wording", async () => {
  const source = await readFile(caseMapUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(source, /buildCaseSignalContext\(mapCases as SignalCaseFile\[\]\)/);
  assert.match(source, /buildCaseSignals\(caseFile as SignalCaseFile, signalContext\)/);
  assert.match(source, /selectPrimaryCaseSignal\(signals\)/);
  assert.match(source, /HoverTooltipOverlay/);
  assert.match(source, /click: \(\) => \{[\s\S]*setHoveredCaseId\(null\);[\s\S]*onSelectCase\(caseFile\.id\);/);
  assert.match(source, /mouseover: \(\) => setHoveredCaseId\(caseFile\.id\)/);
  assert.match(source, /mouseout: \(\) => \{/);
  assert.match(source, /latLngToContainerPoint/);
  assert.match(source, /clampNumber/);
  assert.match(source, /caseMapHoverLayer/);
  assert.match(source, /caseMapHoverCard/);
  assert.match(source, /caseMapTooltipPointer/);
  assert.doesNotMatch(source, /<Tooltip direction="top"/);
  assert.match(source, /"Organismo"/);
  assert.match(source, /"Proveedor"/);
  assert.match(source, /"Monto"/);
  assert.match(source, /"Proced\."/);
  assert.match(source, /return rows\.slice\(0, 2\)/);
  assert.match(source, /MAX_TOOLTIP_TITLE_LENGTH = 72/);
  assert.match(source, /MAX_TOOLTIP_ROW_LENGTH = 38/);
  assert.match(source, /MAX_TOOLTIP_SIGNAL_LENGTH = 34/);
  assert.match(source, /Señal de revisión/);
  assert.match(source, /Abrir expediente/);
  assert.doesNotMatch(source, /caseMapTooltipSignalSummary/);
  assert.doesNotMatch(source, /return rows\.slice\(0, 4\)/);
  assert.match(styles, /\.leafletHost :global\(\.caseMapTooltipFacts\)/);
  assert.match(styles, /\.leafletHost :global\(\.caseMapHoverLayer\)/);
  assert.match(styles, /\.leafletHost :global\(\.caseMapHoverCard\)/);
  assert.match(styles, /\.leafletHost :global\(\.caseMapTooltipPointer\)/);
  assert.match(styles, /\.leafletHost :global\(\.caseMapTooltipSignal-watch\)/);
  assert.match(styles, /--cf-tooltip-bg: #fffaf0/);
  assert.match(styles, /width: min\(312px, calc\(100vw - 32px\)\) !important/);
  assert.match(styles, /max-width: min\(312px, calc\(100vw - 32px\)\) !important/);
  assert.match(styles, /\.caseMapTooltipSignal\) \{[\s\S]*max-width: 100%;[\s\S]*overflow: hidden;/);
  assert.match(styles, /\.caseMapTooltipSignalLabel\) \{[\s\S]*-webkit-line-clamp: 2;[\s\S]*white-space: normal;/);
  assert.match(styles, /opacity: 1 !important/);
  assert.doesNotMatch(source, /corrupci[oó]n|fraude|culpable|delito|irregularidad/i);
});

test("CaseMap keeps selected case zoom independent from Wayback state", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /map\.flyTo\(\[selectedCase\.coordinates\.lat, selectedCase\.coordinates\.lon\], WAYBACK_TARGET_ZOOM/);
  assert.doesNotMatch(source, /const targetZoom = waybackActive \? WAYBACK_TARGET_ZOOM : 8/);
});

test("CaseMap keeps filter changes from moving the current map viewport", async () => {
  const source = await readFile(caseMapUrl, "utf8");
  const faroSource = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /resetViewToken: number/);
  assert.match(source, /const lastResetTokenRef = useRef\(resetViewToken\)/);
  assert.match(source, /if \(resetViewToken === lastResetTokenRef\.current\) return;/);
  assert.match(source, /map\.flyToBounds\(coordinates,/);
  assert.doesNotMatch(source, /const boundsKey = useMemo/);
  assert.doesNotMatch(source, /targetKey = selectedId \? `case:\$\{selectedId\}` : `bounds:\$\{boundsKey\}`/);
  assert.match(faroSource, /const \[mapResetToken, setMapResetToken\] = useState\(0\)/);
  assert.match(faroSource, /resetViewToken=\{mapResetToken\}/);
  assert.match(faroSource, /setSelectedCaseId\(""\);\s*setMapResetToken\(\(token\) => token \+ 1\);/);
});

test("CaseMap uses the official Argenmap light base layer outside Wayback mode", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /ARGENMAP_LIGHT_URL/);
  assert.match(source, /capabaseargenmap@EPSG%3A3857@png\/\{z\}\/\{x\}\/\{-y\}\.png/);
  assert.match(source, /Instituto Geogr[aá]fico Nacional - Argenmap/);
  assert.doesNotMatch(source, /basemaps\.cartocdn\.com/);
});

test("CaseMap keeps map motion and tile fills tuned for dense Argentina markers", async () => {
  const source = await readFile(caseMapUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(source, /const MAP_TILE_KEEP_BUFFER = 4/);
  assert.match(source, /const MARKER_CANVAS_HIT_TOLERANCE = 12/);
  assert.match(source, /const MAP_TILE_PREFETCH_RADIUS = 1/);
  assert.match(source, /const MAX_PREFETCHED_ARGENMAP_TILES = 180/);
  assert.match(source, /createCanvasRenderer\(\{ padding: 0\.5, tolerance: MARKER_CANVAS_HIT_TOLERANCE \}\)/);
  assert.match(source, /preferCanvas/);
  assert.match(source, /inertiaDeceleration=\{2600\}/);
  assert.match(source, /zoomAnimationThreshold=\{4\}/);
  assert.match(source, /keepBuffer=\{MAP_TILE_KEEP_BUFFER\}/);
  assert.match(source, /updateWhenZooming=\{false\}/);
  assert.match(source, /<ArgenmapTileWarmup enabled=\{!waybackTileUrl\} \/>/);
  assert.match(source, /prefetchArgenmapNextZoomTiles\(map\)/);
  assert.match(source, /buildArgenmapTileUrl\(targetZoom, x, y\)/);
  assert.match(source, /preloadTileImage\(url, "low"\)/);
  assert.match(styles, /\.leafletHost\s*\{[\s\S]*radial-gradient/);
  assert.match(styles, /\.leafletHost :global\(\.leaflet-tile\)\s*\{[\s\S]*transition: opacity 160ms ease-out;/);
  assert.match(styles, /\.leafletHost :global\(\.leaflet-overlay-pane canvas\)/);
});

test("CaseMap keeps overview zoom on whole Leaflet steps for responsive wheel zoom", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /const ARGENTINA_OVERVIEW_CENTER: \[number, number\] = \[-38\.4, -64\.4\]/);
  assert.match(source, /const ARGENTINA_INITIAL_ZOOM = 5/);
  assert.match(source, /const ARGENTINA_OVERVIEW_ZOOM = 5/);
  assert.match(source, /const ARGENTINA_OVERVIEW_MAX_ZOOM = 6/);
  assert.match(source, /const ARGENTINA_OVERVIEW_FIT_THRESHOLD = 120/);
  assert.match(source, /map\.flyTo\(ARGENTINA_OVERVIEW_CENTER, ARGENTINA_OVERVIEW_ZOOM/);
  assert.match(source, /<ZoomControl position="topright" \/>/);
  assert.doesNotMatch(source, /zoomSnap=\{0\.25\}/);
  assert.doesNotMatch(source, /const ARGENTINA_INITIAL_ZOOM = 5\.25/);
});

test("CaseMap shows Wayback tile loading feedback and prefetches the active release first", async () => {
  const source = [
    await readFile(caseMapUrl, "utf8"),
    await readFile(faroExperienceUrl, "utf8"),
    await readFile(casePanelUrl, "utf8"),
    await readFile(panelImageryUrl, "utf8"),
    await readFile(regionalMapStylesUrl, "utf8"),
  ].join("\n");

  assert.match(source, /onWaybackTileLoadingChange\(true\)/);
  assert.match(source, /onWaybackTileLoadingChange\(false\)/);
  assert.match(source, /waybackTileLoading/);
  assert.match(source, /mapTileStatusRegion/);
  assert.match(source, /mapTileSpinner/);
  assert.match(source, /Cargando imagen satelital/);
  assert.doesNotMatch(source, /mapTileStatusOrb/);
  assert.doesNotMatch(source, /imageryTileLoader/);
  assert.match(source, /WaybackTilePrefetcher/);
  assert.match(source, /preloadWaybackTile\(activeTileUrl, "high"\)/);
  assert.match(source, /scheduleIdlePrefetch/);
  assert.match(source, /preloadWaybackTile\(url, "low"\)/);
});
