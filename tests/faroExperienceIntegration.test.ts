import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { argentinaInitialMapCases } from "../src/lib/data/initialMapCases.ts";

const paisPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const regionalMapStylesUrl = new URL("../src/components/RegionalMap/RegionalMap.module.css", import.meta.url);
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

test("FaroExperience preserves operational map case rendering", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /<CaseMap[\s\S]*cases=\{countryReviewCases\}/);
  assert.match(source, /<AportesView[\s\S]*cases=\{allCases\}/);
  assert.match(source, /useDeferredValue/);
  assert.match(source, /buildSearchSuggestionIndex/);
  assert.match(source, /buildSearchSuggestionsFromIndex/);
  assert.match(source, /onSelectCase=\{setSelectedCaseId\}/);
  assert.match(source, /viewMode === "map"/);
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

test("FaroExperience scopes light and dark themes to work views only", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(source, /type InterfaceTheme = "dark" \| "light"/);
  assert.match(source, /faro-interface-theme/);
  assert.match(source, /const activePlatformTheme = viewMode === "map" \? "dark" : interfaceTheme;/);
  assert.match(source, /data-platform-theme=\{activePlatformTheme\}/);
  assert.match(source, /viewMode !== "map" && \(\s*<InterfaceThemeToggle/);
  assert.match(source, /const nextTheme: InterfaceTheme = theme === "dark" \? "light" : "dark";/);
  assert.match(source, /aria-label=\{nextLabel\}/);
  assert.match(source, /<ThemeIcon size=\{15\} aria-hidden \/>/);
  assert.doesNotMatch(source, /<span>Claro<\/span>|<span>Oscuro<\/span>|role="group" aria-label="Tema de interfaz"/);

  assert.match(styles, /\.shell\[data-platform-theme="light"\]/);
  assert.match(styles, /\.interfaceThemeDock\s*\{[\s\S]*width: 38px;[\s\S]*height: 38px;/);
  assert.doesNotMatch(styles, /\.interfaceThemeButton|\.interfaceThemeButtonActive/);
});

test("map chrome keeps drawer and tablet layout above floating controls", async () => {
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(styles, /\.shellMobileMenuOpen \.overlayLayer\s*\{[\s\S]*z-index: 4;[\s\S]*pointer-events: none;/);
  assert.match(styles, /\.sidebar\s*\{[\s\S]*left: 0;[\s\S]*transition: none;/);
  assert.match(styles, /\.sidebar:not\(\.sidebarMobileOpen\)\s*\{[\s\S]*left: -320px;/);
  assert.match(styles, /\.sidebarMobileOpen\s*\{[\s\S]*left: 0;[\s\S]*z-index: 90;/);
  assert.match(styles, /\.shellMobileMenuOpen \.sidebarMobileOpen\s*\{[\s\S]*left: 0;[\s\S]*z-index: 90;/);
  assert.match(styles, /\.mobileBackdrop\s*\{[\s\S]*z-index: 60;/);
  assert.match(styles, /@media \(min-width: 901px\) and \(max-width: 1180px\)\s*\{[\s\S]*--sidebar-width: 320px;/);
  assert.match(styles, /@media \(min-width: 901px\) and \(max-width: 1180px\)\s*\{[\s\S]*\.mapLegend\s*\{[\s\S]*max-width: 210px;/);
});
