import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const explorerViewUrl = new URL("../src/components/Explorer/ExplorerView.tsx", import.meta.url);
const explorerStylesUrl = new URL("../src/components/Explorer/Explorer.module.css", import.meta.url);
const platformModeNavUrl = new URL("../src/components/PlatformModeNav.tsx", import.meta.url);

test("ExplorerView consumes the tested investigator explorer view model", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /buildInvestigatorExplorer/);
});

test("ExplorerView avoids overconfident evidence-state copy", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.doesNotMatch(source, /Verificadas|Verificado|Sin datos/);
});

test("ExplorerView counts contextual signals as visible signals", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /filteredCasesWithPrimarySignal/);
  assert.doesNotMatch(source, /primarySignal\?\.kind === "watch"/);
});

test("ExplorerView labels judicial-context amounts as contextual", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /function amountDetailLabel/);
  assert.match(source, /Monto contextual/);
});

test("ExplorerView only shows map links for map-eligible geometry", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /shouldExposeCaseOnMap/);
  assert.match(source, /if \(!coords \|\| !shouldExposeCaseOnMap\(caseFile\)\) return null/);
});

test("ExplorerView groups compact pivots by type and supports multiple active pivots", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /activeFacets/);
  assert.match(source, /toggleFacet/);
  assert.match(source, /FACET_TYPE_OPTIONS/);
  assert.match(source, /entities: activeEntities/);
  assert.doesNotMatch(source, /const \[activeEntity/);
  assert.doesNotMatch(source, /signalOptions/);
});

test("ExplorerView renders agency and supplier pivots as name-only chips", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /formatFacetLabel\(facet\)/);
  assert.match(source, /function formatFacetLabel/);
  assert.match(source, /LEADING_AGENCY_CODE_PATTERN/);
  assert.match(source, /facet\.type === "agency"/);
  assert.match(source, /facet\.type === "supplier"/);
  assert.match(source, new RegExp(String.raw`label\.split\(" / "\)\[0\]`));
  assert.match(source, /shouldShowFacetCount\(group\.type\)/);
  assert.match(source, /type !== "agency" && type !== "supplier"/);
});

test("ExplorerView keeps filter controls fixed while pivots scroll", async () => {
  const source = await readFile(explorerViewUrl, "utf8");
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.match(source, /className=\{styles\.sidebarStaticFilters\}/);
  assert.match(source, /className=\{styles\.sidebarScrollRegion\}/);
  assert.match(source, /Ubicación en mapa/);
  assert.doesNotMatch(source, /<p className=\{styles\.filterGroupLabel\}>Geometría<\/p>/);
  assert.match(css, /\.sidebar\s*\{[\s\S]*overflow: hidden;/);
  assert.match(css, /\.sidebarScrollRegion\s*\{[\s\S]*flex: 1 1 auto;[\s\S]*min-height: 0;[\s\S]*overflow-y: auto;/);
});

test("ExplorerView opens public official source pages instead of raw receipt dataset URLs", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /getPublicOfficialSourceHref\(caseFile\.receipt\)/);
  assert.doesNotMatch(source, /href=\{caseFile\.receipt\.sourceUrl\}/);
});

test("ExplorerView shows article citations as context, not as official trail", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /ContextualCitationsPanel/);
  assert.match(source, /contextualCitations/);
  assert.doesNotMatch(source, /contextualCitations.*officialTrail/s);
});

test("ExplorerView promotes a readable report before technical JSON export", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /Informe PDF/);
  assert.match(source, /JSON técnico/);
  assert.match(source, /buildReportHref/);
});

test("ExplorerView lets investigators save expedientes into local case folders", async () => {
  const source = [
    await readFile(explorerViewUrl, "utf8"),
    await readFile(platformModeNavUrl, "utf8"),
  ].join("\n");
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.match(source, /addCaseToStoredInvestigationWorkspace/);
  assert.match(source, /onSwitchToInvestigations/);
  assert.match(source, /onSwitchToAportes/);
  assert.match(source, /Carpetas/);
  assert.match(source, /Aportar/);
  assert.doesNotMatch(source, /Mis carpetas/);
  assert.match(source, /Guardar en carpeta/);
  assert.match(source, /FolderPlus/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /Motivo/);
  assert.match(source, /Nota de relación/);
  assert.match(source, /Ver carpeta/);
  assert.match(css, /\.saveCaseButton/);
  assert.match(css, /\.detailFolderForm/);
});

test("ExplorerView renders the approved tabbed case detail structure", async () => {
  const source = await readFile(explorerViewUrl, "utf8");
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.match(source, /type ExplorerDetailTab = "resumen" \| "dinero" \| "actores" \| "evidencia" \| "mapa" \| "relacionados"/);
  assert.match(source, /CaseDetailSummary/);
  assert.match(source, /MoneyTrailStrip/);
  assert.match(source, /CaseDetailTabs/);
  assert.match(source, /Por qué mirar este expediente/);
  assert.match(source, /Próximo paso/);
  assert.match(source, /Dinero/);
  assert.match(source, /Actores/);
  assert.match(source, /Evidencia/);
  assert.match(source, /Mapa/);
  assert.match(source, /Relacionados/);
  assert.match(css, /\.moneyTrailStrip/);
  assert.match(css, /\.detailTabs/);
  assert.match(css, /\.detailTabButtonActive:hover\s*\{[\s\S]*color: var\(--cf-on-accent\);[\s\S]*\}/);
  assert.match(css, /\.detailTabPanel/);
});

test("ExplorerView only offers country-specific search scopes", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /{ code: "AR", short: "AR", label: "Argentina" }/);
  assert.doesNotMatch(source, /code: "ALL"/);
  assert.doesNotMatch(source, /Todos/);
  assert.doesNotMatch(source, /countryScope === "ALL"/);
});

test("ExplorerView renders concrete investigative search suggestions", async () => {
  const source = await readFile(explorerViewUrl, "utf8");
  const styles = await readFile(explorerStylesUrl, "utf8");

  assert.match(source, /buildSearchSuggestions/);
  assert.match(source, /Sugerencias de búsqueda/);
  assert.match(source, /suggestionKindLabel/);
  assert.match(source, /Proveedor/);
  assert.match(source, /CUIT/);
  assert.match(source, /Organismo/);
  assert.match(source, /Expediente/);
  assert.match(source, /Señal/);
  assert.match(source, /Alias/);
  assert.match(source, /Fuente/);
  assert.match(source, /Provincia/);
  assert.match(styles, /\.suggestionGrid/);
  assert.match(styles, /\.suggestionButton/);
});

test("ExplorerView supports a closed selected-expedientes preset", async () => {
  const source = await readFile(explorerViewUrl, "utf8");
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.match(source, /initialPreset/);
  assert.match(source, /CURATED_CASES/);
  assert.match(source, /selectedCaseIds/);
  assert.match(source, /selectedCasesForBanner/);
  assert.match(source, /Casos para presentar/);
  assert.match(source, /Criterio de selección/);
  assert.match(source, /presetBannerHeader/);
  assert.match(source, /presentationReason/);
  assert.match(source, /officialBasis/);
  assert.match(source, /caveat/);
  assert.match(source, /nextStep/);
  assert.match(source, /preset !== "selected"/);
  assert.match(source, /Ver todos los expedientes|Limpiar filtro/);
  assert.match(source, /preset === "selected"/);
  assert.match(source, /selectedDetailCase/);
  assert.match(source, /selectedCaseIds\.has\(selectedCase\.id\)/);
  assert.match(source, /clearPreset/);
  assert.match(source, /useSearchParams/);
  assert.match(source, /\.delete\("preset"\)/);
  assert.match(source, /router\.replace/);
  assert.match(source, /presetScopedCases/);
  assert.match(css, /\.presetBanner/);
  assert.match(css, /\[data-platform-theme="light"\]\) \.presetBanner/);
  assert.match(css, /\.presetBannerHeader/);
  assert.match(css, /\.presetRationaleList/);
  assert.match(css, /\.presetRationaleItem/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1280px\)/);
});
