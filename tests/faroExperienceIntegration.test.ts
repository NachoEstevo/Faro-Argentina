import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { argentinaInitialMapCases } from "../src/lib/data/initialMapCases.ts";

const paisPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const appLayoutUrl = new URL("../src/app/layout.tsx", import.meta.url);
const adminLayoutUrl = new URL("../src/app/admin/layout.tsx", import.meta.url);
const signInLayoutUrl = new URL("../src/app/sign-in/layout.tsx", import.meta.url);
const signUpLayoutUrl = new URL("../src/app/sign-up/layout.tsx", import.meta.url);
const globalStylesUrl = new URL("../src/app/globals.css", import.meta.url);
const regionalMapUrl = new URL("../src/components/RegionalMap/RegionalMap.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const welcomeOverlayUrl = new URL("../src/components/RegionalMap/WelcomeOverlay.tsx", import.meta.url);
const regionalMapStylesUrl = new URL("../src/components/RegionalMap/RegionalMap.module.css", import.meta.url);
const guidedTourUrl = new URL("../src/components/RegionalMap/GuidedTour.tsx", import.meta.url);
const countrySidebarUrl = new URL("../src/components/RegionalMap/CountrySidebar.tsx", import.meta.url);
const mobileHeaderUrl = new URL("../src/components/RegionalMap/MobileHeader.tsx", import.meta.url);
const mapLegendUrl = new URL("../src/components/RegionalMap/MapLegend.tsx", import.meta.url);
const caseMapUrl = new URL("../src/components/CaseMap.tsx", import.meta.url);
const caseDetailsUrl = new URL("../src/components/CaseDetails.tsx", import.meta.url);
const casePanelUrl = new URL("../src/components/MapUI/CasePanel.tsx", import.meta.url);
const panelActionsUrl = new URL("../src/components/MapUI/panel/PanelActions.tsx", import.meta.url);
const panelImageryUrl = new URL("../src/components/MapUI/panel/PanelImagery.tsx", import.meta.url);
const casePanelStylesUrl = new URL("../src/components/MapUI/casePanel.module.css", import.meta.url);
const countriesUrl = new URL("../src/lib/data/countries.ts", import.meta.url);
const caseFileRouteUrl = new URL("../src/app/api/cases/[id]/case-file/route.ts", import.meta.url);
const staticExportsScriptUrl = new URL("../scripts/build-static-exports.ts", import.meta.url);

test("country route wires the selected Explorer preset into FaroExperience", async () => {
  const pageSource = await readFile(paisPageUrl, "utf8");
  const experienceSource = await readFile(faroExperienceUrl, "utf8");

  assert.match(pageSource, /readParam\(search\.preset\)/);
  assert.match(pageSource, /initialExplorerPreset/);
  assert.match(experienceSource, /initialExplorerPreset/);
  assert.match(experienceSource, /<ExplorerView[\s\S]*initialPreset=\{initialExplorerPreset\}/);
});

test("public map routes stay outside Clerk chrome while private routes keep Clerk", async () => {
  const layoutSource = await readFile(appLayoutUrl, "utf8");
  const adminLayoutSource = await readFile(adminLayoutUrl, "utf8");
  const signInLayoutSource = await readFile(signInLayoutUrl, "utf8");
  const signUpLayoutSource = await readFile(signUpLayoutUrl, "utf8");

  assert.match(layoutSource, /<body>\{children\}<\/body>/);
  assert.doesNotMatch(layoutSource, /import \{ ClerkProvider \} from "@clerk\/nextjs"/);

  assert.match(adminLayoutSource, /import \{ ClerkProvider \} from "@clerk\/nextjs"/);
  assert.match(adminLayoutSource, /<ClerkProvider>\{children\}<\/ClerkProvider>/);
  assert.match(signInLayoutSource, /import \{ ClerkProvider \} from "@clerk\/nextjs"/);
  assert.match(signInLayoutSource, /<ClerkProvider>\{children\}<\/ClerkProvider>/);
  assert.match(signUpLayoutSource, /import \{ ClerkProvider \} from "@clerk\/nextjs"/);
  assert.match(signUpLayoutSource, /<ClerkProvider>\{children\}<\/ClerkProvider>/);
});

test("FaroExperience preserves operational map case rendering", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");
  const caseMapSource = await readFile(caseMapUrl, "utf8");
  const casePanelSource = await readFile(casePanelUrl, "utf8");
  const panelActionsSource = await readFile(panelActionsUrl, "utf8");
  const caseDetailsSource = await readFile(caseDetailsUrl, "utf8");

  assert.match(source, /<CaseMap[\s\S]*cases=\{countryReviewCases\}/);
  assert.match(source, /<AportesView[\s\S]*cases=\{allCases\}/);
  assert.match(source, /useDeferredValue/);
  assert.match(source, /buildSearchSuggestionIndex/);
  assert.match(source, /buildSearchSuggestionsFromIndex/);
  assert.match(source, /!showMapChrome \? styles\.shellNoMapChrome : ""/);
  assert.match(source, /onSelectCase=\{setSelectedCaseId\}/);
  assert.match(source, /viewMode === "map"/);
  assert.match(source, /const hasOpenMapCase = viewMode === "map" && selectedCase !== null;/);
  assert.match(source, /\{!hasOpenMapCase && \(\s*<PlatformModeNav/);
  assert.match(source, /className=\{styles\.modeNavAnchor\}/);
  assert.match(source, /\{showMapChrome && !hasOpenMapCase && <GuidedTourButton/);
  assert.match(source, /const handleCloseMapCase = useCallback/);
  assert.match(source, /backToMap=\{hasOpenMapCase\}/);
  assert.match(source, /onBackToMap=\{handleCloseMapCase\}/);
  assert.match(source, /nextSearchParams\.delete\("case"\)/);
  assert.match(source, /title=\{activeContributionCaseId \? "Reportar dato" : "Aportar"\}/);
  assert.doesNotMatch(source, /traceMode|setTraceMode|onTraceModeChange/);
  assert.doesNotMatch(caseMapSource, /traceMode|import \{[^}]*\bCircle\b|<Circle\s/);
  assert.doesNotMatch(casePanelSource, /traceMode|onTraceModeChange/);
  assert.doesNotMatch(panelActionsSource, /Rastro visual|Route|traceMode|onTraceModeChange|actionWideActive/);
  assert.doesNotMatch(caseDetailsSource, /Rastro visual|traceMode|onTraceModeChange|traceBox|describeTraceContext/);
});

test("platform mode nav keeps a stable visual center across country views", async () => {
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(styles, /\.shellNoMapChrome\s*\{[\s\S]*--sidebar-width: 0px;/);
  assert.match(styles, /\.modeNavAnchor\s*\{[\s\S]*position: absolute;/);
  assert.match(styles, /\.modeNavAnchor\s*\{[\s\S]*left: 50%;/);
  assert.match(styles, /\.modeNavAnchor\s*\{[\s\S]*transform: translateX\(-50%\);/);
  assert.match(styles, /\.backToGlobal\s*\{[\s\S]*position: absolute;[\s\S]*left: 0;/);
  assert.match(styles, /\.topRightActions\s*\{[\s\S]*position: absolute;[\s\S]*right: 0;/);
  assert.match(styles, /\.tourButton,\s*\.contributeButton\s*\{[\s\S]*display: inline-flex;/);
  assert.match(styles, /\.modeNavAnchor\s*\{[\s\S]*max-width: calc\(100% - 430px\);/);
  assert.match(styles, /\.topRightActions:not\(\.topRightActionsWorkView\) \.contributeButton\s*\{[\s\S]*width: 42px;/);
  assert.match(styles, /\.topRightActions:not\(\.topRightActionsWorkView\) \.contributeButton span\s*\{[\s\S]*clip-path: inset\(50%\);/);
  assert.match(styles, /@media \(max-width: 1280px\)\s*\{[\s\S]*\.topRightActions \.contributeButton\s*\{[\s\S]*width: 42px;[\s\S]*padding: 0;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.backToGlobal\s*\{[\s\S]*display: none;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.modeNavAnchor\s*\{[\s\S]*position: fixed;[\s\S]*bottom: 18px;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.topRightActions:not\(\.topRightActionsWorkView\)\s*\{[\s\S]*position: fixed;[\s\S]*flex-direction: column;[\s\S]*right: 14px;[\s\S]*bottom: 64px;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.mapLegend\s*\{[\s\S]*display: none;/);
  assert.match(styles, /@media \(max-width: 900px\)\s*\{[\s\S]*\.mobileBrandText\s*\{[\s\S]*display: none;/);
});

test("case detail back control names the action instead of the country", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /const backControlLabel = selectedCaseId \? "Volver al mapa" : "Mapa general";/);
  assert.match(source, /const backControlAriaLabel = selectedCaseId[\s\S]*`Volver al mapa de \$\{country\.label\}`/);
  assert.match(source, /<span>\{backControlLabel\}<\/span>/);
  assert.doesNotMatch(source, /<span>\{selectedCaseId \? country\.label : "Mapa general"\}<\/span>/);
});

test("Explorer selections update the country URL so expedientes can be shared", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /usePathname, useRouter, useSearchParams/);
  assert.match(source, /const replaceExplorerCaseHref = useCallback/);
  assert.match(source, /nextSearchParams\.set\("mode", "explorer"\)/);
  assert.match(source, /if \(caseId\) nextSearchParams\.set\("case", caseId\);/);
  assert.match(source, /else nextSearchParams\.delete\("case"\);/);
  assert.match(source, /router\.replace\(nextHref, \{ scroll: false \}\)/);
  assert.match(source, /const handleSelectExplorerCase = useCallback/);
  assert.match(source, /const handleClearExplorerSelection = useCallback/);
  assert.match(source, /onSelectCase=\{handleSelectExplorerCase\}/);
  assert.match(source, /onClearSelection=\{handleClearExplorerSelection\}/);
});

test("Wayback timeline floats over the map with a mobile inline fallback", async () => {
  const experienceSource = await readFile(faroExperienceUrl, "utf8");
  const casePanelSource = await readFile(casePanelUrl, "utf8");
  const panelImagerySource = await readFile(panelImageryUrl, "utf8");
  const globalStyles = await readFile(globalStylesUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");
  const casePanelStyles = await readFile(casePanelStylesUrl, "utf8");

  assert.match(experienceSource, /import PanelImagery from "\.\/MapUI\/panel\/PanelImagery"/);
  assert.match(experienceSource, /const \[mobileCaseMapOpen, setMobileCaseMapOpen\] = useState\(false\)/);
  assert.match(experienceSource, /window\.matchMedia\("\(max-width: 720px\)"\)\.matches/);
  assert.match(experienceSource, /const showFloatingWaybackControl =/);
  assert.match(experienceSource, /mobileCaseMapOpen \? styles\.mapImageryControlMobileOpen : ""/);
  assert.match(experienceSource, /className=\{`casePanel \$\{mobileCaseMapOpen \? "casePanelMobileMapOpen" : ""\}`\}/);
  assert.match(experienceSource, /mobileMapOpen=\{mobileCaseMapOpen\}/);
  assert.match(experienceSource, /onMobileMapOpenChange=\{setMobileCaseMapOpen\}/);
  assert.match(experienceSource, /aria-label="Selector de imagen satelital"/);
  assert.match(experienceSource, /onActiveReleaseChange=\{handleWaybackReleaseChange\}/);
  assert.match(casePanelSource, /mobileMapOpen/);
  assert.match(casePanelSource, /onMobileMapOpenChange/);
  assert.match(casePanelSource, /Mapa satelital/);
  assert.match(casePanelSource, /styles\.mobileModeBar/);
  assert.match(casePanelSource, /styles\.mobileMapSummary/);
  assert.match(casePanelSource, /styles\.mobileInlineImagery/);
  assert.match(casePanelSource, /mode=explorer&case=\$\{encodeURIComponent\(caseFile\.id\)\}/);
  assert.match(casePanelSource, /styles\.mobileFullCaseLink/);
  assert.match(casePanelSource, /Ver expediente completo/);
  assert.match(casePanelSource, /<PanelImagery[\s\S]*onActiveReleaseChange=\{onWaybackReleaseChange\}/);
  assert.match(panelImagerySource, /Año de la imagen satelital/);
  assert.match(panelImagerySource, /Año visible/);
  assert.match(panelImagerySource, /styles\.imageryTicks/);
  assert.match(panelImagerySource, /styles\.imageryYearTick/);
  assert.match(panelImagerySource, /styles\.imageryTickYear/);
  assert.match(panelImagerySource, /styles\.imageryMobileThumbYear/);
  assert.match(panelImagerySource, /release\.year % 2 === 0/);
  assert.match(styles, /\.mapImageryControl\s*\{[\s\S]*bottom: 22px;[\s\S]*justify-content: center;/);
  assert.match(styles, /@media \(max-width: 720px\) \{[\s\S]*\.mapImageryControl\s*\{[\s\S]*display: none;/);
  assert.match(styles, /@media \(max-width: 720px\) \{[\s\S]*\.mapImageryControlMobileOpen\s*\{[\s\S]*bottom: calc\(132px \+ env\(safe-area-inset-bottom, 0px\)\);[\s\S]*display: flex;/);
  assert.match(styles, /\.mapImageryControlCard\s*\{[\s\S]*width: min\(460px, calc\(100% - 40px\)\);/);
  assert.match(globalStyles, /@media \(max-width: 720px\) \{[\s\S]*\.casePanel\s*\{[\s\S]*top: auto;[\s\S]*bottom: calc\(10px \+ env\(safe-area-inset-bottom, 0px\)\);[\s\S]*height: min\(74svh, 620px\);/);
  assert.match(globalStyles, /\.casePanel\.casePanelMobileMapOpen\s*\{[\s\S]*height: auto;/);
  assert.match(casePanelStyles, /\.imagerySummary\s*\{/);
  assert.match(casePanelStyles, /\.imageryReadout\s*\{[\s\S]*max-width: 48%;/);
  assert.match(casePanelStyles, /\.imageryMobileThumbYear\s*\{[\s\S]*display: none;/);
  assert.match(casePanelStyles, /\.imageryYearTickActive \.imageryTickLine\s*\{/);
  assert.match(casePanelStyles, /\.mobileModeBar,\s*\.mobileMapSummary,\s*\.mobileFullCaseLink\s*\{[\s\S]*display: none;/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.panel\s*\{[\s\S]*max-height: min\(74svh, 620px\);/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.panelMobileMapOpen \.scroll\s*\{[\s\S]*display: none;/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.panelMobileMapOpen \.mobileMapSummary\s*\{[\s\S]*display: grid;/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.mobileFullCaseLink\s*\{[\s\S]*display: flex;[\s\S]*background: linear-gradient\(135deg, #1f6f9f 0%, #75aadb 100%\);/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.imageryReadout\s*\{[\s\S]*display: none;/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.imageryMobileThumbYear\s*\{[\s\S]*display: block;/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.imageryTickYear\s*\{[\s\S]*display: none;/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.imagerySlider::-webkit-slider-thumb\s*\{[\s\S]*width: 21px;[\s\S]*height: 21px;/);
  assert.match(casePanelStyles, /\.mobileInlineImagery\s*\{[\s\S]*display: none;/);
  assert.match(casePanelStyles, /@media \(max-width: 720px\) \{[\s\S]*\.mobileInlineImagery\s*\{[\s\S]*display: none;/);
});

test("country route keeps the heavy investigator corpus out of the initial client payload", async () => {
  const pageSource = await readFile(paisPageUrl, "utf8");
  const experienceSource = await readFile(faroExperienceUrl, "utf8");
  const countriesSource = await readFile(countriesUrl, "utf8");
  const caseFileRouteSource = await readFile(caseFileRouteUrl, "utf8");

  assert.match(pageSource, /argentinaInitialMapCases/);
  assert.match(pageSource, /initialCases=\{argentinaInitialMapCases\}/);
  assert.match(pageSource, /fullCasesHref="\/exports\/faro-client-investigator-cases\.json"/);
  assert.match(pageSource, /explorerIndexHref="\/exports\/faro-client-explorer-index\.json"/);
  assert.doesNotMatch(pageSource, /caseRepository/);
  assert.doesNotMatch(pageSource, /investigatorCaseFiles/);
  assert.doesNotMatch(pageSource, /explorerCases=\{/);

  assert.match(experienceSource, /dynamic\(\(\) => import\("\.\/Explorer\/ExplorerView"\)/);
  assert.match(experienceSource, /needsExplorerIndex/);
  assert.match(experienceSource, /loadExplorerIndex/);
  assert.match(experienceSource, /fetch\(href, \{ cache: "no-cache" \}\)/);
  assert.match(experienceSource, /loadFullCaseCorpus/);
  assert.match(experienceSource, /fetch\(href, \{ cache: "force-cache" \}\)/);
  assert.match(experienceSource, /loadFullMapCase/);
  assert.match(experienceSource, /\/api\/cases\/\$\{encodeURIComponent\(caseId\)\}\/case-file/);
  assert.match(experienceSource, /CaseCorpusGate/);
  assert.match(experienceSource, /CasePanelGate/);
  assert.doesNotMatch(experienceSource, /dataset: CaseDataset/);
  assert.doesNotMatch(experienceSource, /filterExplorerCases/);

  assert.match(caseFileRouteSource, /getInitialMapCaseById/);
  assert.doesNotMatch(caseFileRouteSource, /getCaseById/);
  assert.match(caseFileRouteSource, /cache-control/);

  assert.match(countriesSource, /caseSummary/);
  assert.doesNotMatch(countriesSource, /caseRepository/);
});

test("static export build emits a compact Explorer index separately from full case data", async () => {
  const source = await readFile(staticExportsScriptUrl, "utf8");

  assert.match(source, /clientExplorerIndexFileName = "faro-client-explorer-index\.json"/);
  assert.match(source, /buildClientInvestigatorExplorerIndex\(investigatorCaseFiles, \{ countries: \["AR"\] \}\)/);
  assert.match(source, /artifactType: "faro_client_explorer_index"/);
  assert.match(source, /clientExplorerIndex/);
});

test("country map initial cases stay compact while preserving map signal fields", () => {
  const payloadBytes = Buffer.byteLength(JSON.stringify(argentinaInitialMapCases));

  assert.ok(payloadBytes < 750_000, `initial map payload should stay compact, got ${payloadBytes}`);
  assert.equal(argentinaInitialMapCases.length > 400, true);
  assert.equal(argentinaInitialMapCases.some((caseFile) => "relatedReceipts" in caseFile), false);
  assert.equal(argentinaInitialMapCases.some((caseFile) => "caveats" in caseFile), false);
  assert.equal(argentinaInitialMapCases.every((caseFile) => caseFile.receipt.sourceId && caseFile.receipt.sourceName), true);
  assert.equal(argentinaInitialMapCases.some((caseFile) => caseFile.coordinates), true);
  assert.equal(argentinaInitialMapCases.some((caseFile) => "bidderCount" in caseFile), true);
  assert.equal(argentinaInitialMapCases.some((caseFile) => "supplierName" in caseFile), true);
});

test("FaroExperience uses a cream map theme and keeps work-view theme toggles scoped", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");
  const casePanelStyles = await readFile(casePanelStylesUrl, "utf8");

  assert.match(source, /type InterfaceTheme = "dark" \| "light"/);
  assert.match(source, /type PlatformTheme = InterfaceTheme \| "mapCream"/);
  assert.match(source, /faro-interface-theme/);
  assert.match(source, /const activePlatformTheme: PlatformTheme = viewMode === "map" \? "mapCream" : interfaceTheme;/);
  assert.match(source, /data-platform-theme=\{activePlatformTheme\}/);
  assert.match(source, /viewMode !== "map" && \(\s*<InterfaceThemeToggle/);
  assert.match(source, /role="group" aria-label="Tema de interfaz"/);
  assert.match(source, /aria-label="Modo claro"/);
  assert.match(source, /aria-label="Modo oscuro"/);
  assert.match(source, /aria-pressed=\{theme === "light"\}/);
  assert.match(source, /aria-pressed=\{theme === "dark"\}/);
  assert.doesNotMatch(source, /<span>Claro<\/span>|<span>Oscuro<\/span>|const nextTheme/);

  assert.match(styles, /\.shell\[data-platform-theme="light"\]/);
  assert.match(styles, /\.shell\[data-platform-theme="mapCream"\]/);
  assert.match(styles, /--cf-bg: #eee8dc;/);
  assert.match(styles, /--cf-arg-sky: #75aadb;/);
  assert.match(styles, /--cf-arg-gold: #fcbf49;/);
  assert.match(styles, /\.shell\[data-platform-theme="light"\]\s*\{[\s\S]*--cf-workspace-sidebar-bg: rgba\(247, 242, 230, 0\.92\);/);
  assert.match(styles, /\.shell\[data-platform-theme="mapCream"\] \.sidebar\s*\{[\s\S]*linear-gradient\(180deg, rgba\(250, 246, 235, 0\.97\), rgba\(238, 232, 218, 0\.96\)\);/);
  assert.match(styles, /\.mapLegend\s*\{[\s\S]*background: color-mix\(in srgb, var\(--cf-bg-elev\) 92%, transparent\);/);
  assert.doesNotMatch(styles, /\.mapLegend\s*\{[\s\S]*background: rgba\(13, 15, 19, 0\.86\);/);
  assert.match(casePanelStyles, /--cp-surface: #f3eddf;/);
  assert.match(casePanelStyles, /--cp-text: #1f2a32;/);
  assert.match(casePanelStyles, /\.chips :global\(\.signalChip\.watch\)\s*\{[\s\S]*color: #755300;/);
  assert.match(casePanelStyles, /\.chips :global\(\.signalChip\.gap\)\s*\{[\s\S]*color: #1f5f8b;/);
  assert.match(styles, /\.interfaceThemeDock\s*\{[\s\S]*right: 18px;[\s\S]*top: 18px;[\s\S]*min-width: 78px;[\s\S]*min-height: 40px;/);
  assert.match(styles, /@media \(max-width: 600px\) \{[\s\S]*\.interfaceThemeDock\s*\{[\s\S]*right: 12px;[\s\S]*top: 16px;/);
  assert.doesNotMatch(styles, /\.interfaceThemeDock\s*\{[^}]*bottom: 72px;/);
  assert.match(styles, /\.interfaceThemeOption\s*\{/);
  assert.match(styles, /\.interfaceThemeOptionActive\s*\{[\s\S]*background: var\(--cf-accent\);/);
});

test("regional welcome CTA transitions into the country map", async () => {
  const source = await readFile(welcomeOverlayUrl, "utf8");
  const regionalSource = await readFile(regionalMapUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(source, /useRouter/);
  assert.match(source, /import Link from "next\/link"/);
  assert.match(source, /href=\{ctaHref\}/);
  assert.match(source, /onClick=\{handleEnterMap\}/);
  assert.match(source, /router\.prefetch\(ctaHref\)/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /Evidencia oficial de obra pública/);
  assert.match(source, /Mapa, contratos y expedientes públicos/);
  assert.match(source, /entering \? "Preparando mapa" : "Entrar al mapa"/);
  assert.match(source, /ArrowRight/);
  assert.match(regionalSource, /ctaHref="\/pais\/AR"/);
  assert.match(regionalSource, /const \[enteringMap, setEnteringMap\] = useState\(false\);/);
  assert.match(regionalSource, /enteringMap \? styles\.shellEnteringMap : ""/);
  assert.match(regionalSource, /onEnterStart=\{\(\) => setEnteringMap\(true\)\}/);
  assert.doesNotMatch(regionalSource, /setOverlayDismissed\(true\)|handleCTA|onCTA=\{handleCTA\}/);
  assert.doesNotMatch(source, /faro-mark-transparent|welcomeCTASource|<img/);
  assert.match(styles, /\.welcomeCTA\s*\{[\s\S]*padding: 0 20px 0 22px;/);
  assert.match(styles, /\.welcomeCTA\s*\{[\s\S]*background: rgba\(8, 12, 17, 0\.88\);/);
  assert.match(styles, /\.welcomeCTA\s*\{[\s\S]*text-decoration: none;/);
  assert.match(styles, /\.welcomeCopy\s*\{[\s\S]*max-width: 44ch;/);
  assert.match(styles, /\.shellWelcome\.shellEnteringMap \.leafletHost::after\s*\{[\s\S]*animation: welcomeMapCommit 760ms/);
  assert.match(styles, /\.welcomeOverlayEntering \.welcomeCTA\s*\{[\s\S]*animation: welcomeButtonCommit 720ms/);
  assert.match(styles, /\.shellWelcome \.leafletHost :global\(\.leaflet-tooltip\)\s*\{[\s\S]*display: none !important;/);
  assert.doesNotMatch(styles, /welcomeCTASource|welcomeCTA::before|welcomeCTA::after/);
});

test("regional welcome uses a paced entrance animation without forcing motion", async () => {
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(styles, /\.welcomeKicker\s*\{[\s\S]*animation: welcomeHeroReveal 720ms/);
  assert.match(styles, /\.welcomeHeadline\s*\{[\s\S]*animation: welcomeHeroReveal 760ms/);
  assert.match(styles, /\.welcomeCopy\s*\{[\s\S]*animation: welcomeHeroReveal 760ms/);
  assert.match(styles, /\.welcomeCTA\s*\{[\s\S]*animation: welcomeButtonReveal 780ms/);
  assert.match(styles, /\.shellWelcome \.leafletHost::after\s*\{[\s\S]*animation: welcomeMapSettle 980ms/);
  assert.match(styles, /\.shellWelcome\.shellEnteringMap \.leafletHost::after\s*\{[\s\S]*animation: welcomeMapCommit 760ms/);
  assert.match(styles, /\.welcomeOverlayEntering \.welcomeKicker,[\s\S]*\.welcomeOverlayEntering \.welcomeHeadline,[\s\S]*\.welcomeOverlayEntering \.welcomeCopy\s*\{[\s\S]*animation: welcomeCopyCommit 620ms/);
  assert.match(styles, /@keyframes welcomeHeroReveal\s*\{/);
  assert.match(styles, /@keyframes welcomeButtonReveal\s*\{/);
  assert.match(styles, /@keyframes welcomeMapSettle\s*\{/);
  assert.match(styles, /@keyframes welcomeMapCommit\s*\{/);
  assert.match(styles, /@keyframes welcomeButtonCommit\s*\{/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.welcomeKicker,[\s\S]*\.welcomeHeadline,[\s\S]*\.welcomeCopy,[\s\S]*\.welcomeCTA,[\s\S]*animation: none;/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.welcomeOverlayEntering \.welcomeKicker,[\s\S]*\.welcomeOverlayEntering \.welcomeCTAArrow\s*\{[\s\S]*animation: none;/);
});

test("regional welcome starts without sidebar chrome", async () => {
  const source = await readFile(regionalMapUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(source, /const overlayDismissed = false;/);
  assert.match(source, /!overlayDismissed \? styles\.shellWelcome : ""/);
  assert.match(source, /const showSidebar = overlayDismissed;/);
  assert.match(source, /showSidebar && sidebarCollapsed \? styles\.shellCollapsed : ""/);
  assert.match(source, /\{showSidebar && <MobileHeader onOpenMenu=\{handleOpenMobileMenu\} \/>}/);
  assert.match(source, /\{showSidebar && \(\s*<RegionalSidebar/);
  assert.match(source, /\{showSidebar && mobileMenuOpen && \(/);
  assert.match(styles, /\.shellWelcome\s*\{[\s\S]*--sidebar-width: 0px;/);
  assert.match(styles, /\.shellWelcome \.overlayLayer,\s*\.shellWelcome \.welcomeLayer\s*\{[\s\S]*left: 0;/);
  assert.match(styles, /@media \(min-width: 901px\) and \(max-width: 1180px\)\s*\{[\s\S]*\.shell\.shellWelcome\s*\{[\s\S]*--sidebar-width: 0px;/);
  assert.match(styles, /\.shellWelcome\s*\{[\s\S]*--cf-welcome-panel-bg: rgba\(12, 18, 24, 0\.9\);/);
  assert.match(styles, /\.settingRow\s*\{[\s\S]*text-decoration: none;/);
});

test("regional navigation omits the public Aportar action", async () => {
  const source = await readFile(regionalMapUrl, "utf8");

  assert.doesNotMatch(source, /FloatingModeToggle|PlatformModeNav|showSecondaryAction|Aportar/);
  assert.match(source, /<WelcomeOverlay[\s\S]*dismissed=\{overlayDismissed\}[\s\S]*entering=\{enteringMap\}/);
});

test("guided tutorial is wired to stable map UI targets", async () => {
  const experienceSource = await readFile(faroExperienceUrl, "utf8");
  const navSource = await readFile(new URL("../src/components/PlatformModeNav.tsx", import.meta.url), "utf8");
  const sidebarSource = await readFile(countrySidebarUrl, "utf8");
  const legendSource = await readFile(mapLegendUrl, "utf8");
  const tourSource = await readFile(guidedTourUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(experienceSource, /GuidedTourButton/);
  assert.match(experienceSource, /handleStartGuidedTour/);
  assert.match(experienceSource, /const GUIDED_TOUR_STORAGE_KEY = "faro-guided-tour-seen"/);
  assert.match(experienceSource, /const GUIDED_TOUR_SEEN_VALUE = "seen"/);
  assert.match(experienceSource, /hasAutoStartedGuidedTourRef/);
  assert.match(experienceSource, /if \(initialMode !== "map" \|\| initialCaseId \|\| initialEntryOpen\) return;/);
  assert.match(experienceSource, /if \(hasSeenGuidedTour\(\)\) return;/);
  assert.match(experienceSource, /window\.setTimeout\(handleStartGuidedTour, 650\)/);
  assert.match(experienceSource, /window\.localStorage\.setItem\(GUIDED_TOUR_STORAGE_KEY, GUIDED_TOUR_SEEN_VALUE\)/);
  assert.match(experienceSource, /onStartGuide=\{handleStartGuidedTour\}/);
  assert.match(experienceSource, /setGuidedTourOpen\(true\)/);
  assert.match(experienceSource, /data-tour="map-canvas"/);
  assert.match(experienceSource, /data-tour="map-viewport"/);
  assert.match(experienceSource, /data-tour="case-panel"/);
  assert.match(navSource, /data-tour="mode-nav"/);
  assert.match(navSource, /data-tour="mode-nav-items"/);
  assert.match(sidebarSource, /data-tour="search"/);
  assert.match(sidebarSource, /data-tour="filters"/);
  assert.match(sidebarSource, /data-tour="review-leads"/);
  assert.match(legendSource, /data-tour="legend"/);

  assert.match(tourSource, /type GuidedTourStepId/);
  assert.match(tourSource, /target: '\[data-tour="mode-nav-items"\]'/);
  assert.match(tourSource, /id: "map"[\s\S]*target: '\[data-tour="map-viewport"\]'[\s\S]*placement: "right"/);
  assert.match(tourSource, /aria-label="Abrir tutorial guiado"/);
  assert.match(tourSource, /title="Tutorial"/);
  assert.match(tourSource, /"modes"[\s\S]*"search"[\s\S]*"filters"[\s\S]*"map"[\s\S]*"legend"[\s\S]*"review-button"[\s\S]*"review-list"[\s\S]*"case-detail"/);
  assert.match(tourSource, /No cambian la evidencia ni convierten una pista en conclusión/);
  assert.match(tourSource, /no una acusación/);
  assert.match(styles, /\.tourButton,\s*\.contributeButton\s*\{/);
  assert.doesNotMatch(styles, /\.tourButton::after|tourButtonCue/);
  assert.match(styles, /\.mapTourTarget\s*\{[\s\S]*right: 420px;[\s\S]*left: var\(--sidebar-width\);/);
  assert.match(styles, /\.tourSpotlight\s*\{[\s\S]*box-shadow:[\s\S]*9999px/);
  assert.match(styles, /\.tourCard\s*\{/);
});

test("map chrome keeps drawer and tablet layout above floating controls", async () => {
  const styles = await readFile(regionalMapStylesUrl, "utf8");
  const globalStyles = await readFile(globalStylesUrl, "utf8");
  const mobileHeaderSource = await readFile(mobileHeaderUrl, "utf8");

  assert.match(mobileHeaderSource, /backToMap\?: boolean/);
  assert.match(mobileHeaderSource, /aria-label=\{backToMap \? "Volver al mapa" : "Abrir menú"\}/);
  assert.match(mobileHeaderSource, /backToMap \? <ArrowLeft size=\{20\} aria-hidden \/> : <Menu size=\{20\} aria-hidden \/>/);
  assert.match(mobileHeaderSource, /\{!backToMap && \(\s*<Link href="\/" className=\{styles\.mobileBrand\}/);
  assert.match(styles, /\.shellMobileMenuOpen \.overlayLayer\s*\{[\s\S]*z-index: 4;[\s\S]*pointer-events: none;/);
  assert.match(styles, /\.sidebar\s*\{[\s\S]*left: 0;[\s\S]*transition: none;/);
  assert.match(styles, /\.sidebar:not\(\.sidebarMobileOpen\)\s*\{[\s\S]*left: -320px;/);
  assert.match(styles, /\.sidebarMobileOpen\s*\{[\s\S]*left: 0;[\s\S]*z-index: 90;/);
  assert.match(styles, /\.shellMobileMenuOpen \.sidebarMobileOpen\s*\{[\s\S]*left: 0;[\s\S]*z-index: 90;/);
  assert.match(styles, /\.mobileBackdrop\s*\{[\s\S]*z-index: 60;/);
  assert.match(styles, /@media \(min-width: 901px\) and \(max-width: 1180px\)\s*\{[\s\S]*--sidebar-width: 320px;/);
  assert.match(styles, /@media \(min-width: 901px\) and \(max-width: 1180px\)\s*\{[\s\S]*\.shell\.shellCollapsed\s*\{[\s\S]*--sidebar-width: 64px;/);
  assert.match(styles, /@media \(min-width: 901px\) and \(max-width: 1180px\)\s*\{[\s\S]*\.mapLegend\s*\{[\s\S]*max-width: 210px;/);
  assert.match(styles, /@media \(min-width: 641px\) and \(max-width: 900px\)\s*\{[\s\S]*\.mobileBrand\s*\{[\s\S]*display: none;/);
  assert.match(styles, /@media \(min-width: 641px\) and \(max-width: 900px\)\s*\{[\s\S]*\.overlayTopBar\s*\{[\s\S]*top: 20px;[\s\S]*right: 18px;/);
  assert.match(styles, /@media \(min-width: 641px\) and \(max-width: 900px\)\s*\{[\s\S]*\.topRightActions\s*\{[\s\S]*right: 54px;/);
  assert.match(styles, /@media \(min-width: 641px\) and \(max-width: 900px\)\s*\{[\s\S]*\.topRightActions \.contributeButton\s*\{[\s\S]*width: 42px;[\s\S]*padding: 0;/);
  assert.match(globalStyles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.leafletRoot \.leaflet-top\.leaflet-right \.leaflet-control-zoom\s*\{[\s\S]*display: none !important;/);
});
