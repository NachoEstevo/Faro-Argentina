import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const explorerViewUrl = new URL("../src/components/Explorer/ExplorerView.tsx", import.meta.url);
const explorerStylesUrl = new URL("../src/components/Explorer/Explorer.module.css", import.meta.url);
const searchSuggestionGroupsUrl = new URL("../src/components/SearchSuggestionGroups.tsx", import.meta.url);
const searchSuggestionHelpersUrl = new URL("../src/components/SearchSuggestionGroups.helpers.ts", import.meta.url);
const searchSuggestionStylesUrl = new URL("../src/components/SearchSuggestionGroups.module.css", import.meta.url);
const platformModeNavUrl = new URL("../src/components/PlatformModeNav.tsx", import.meta.url);

test("ExplorerView consumes the tested investigator explorer view model", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /index: InvestigatorExplorerIndex/);
  assert.match(source, /buildInvestigatorExplorerFromIndex/);
  assert.match(source, /useDeferredValue/);
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

  assert.match(source, /sidebarBrandIdentity/);
  assert.match(source, /sidebarBrandName}>Faro/);
  assert.match(css, /\.sidebarBrandName\s*\{[\s\S]*font-size: 22px;/);
  assert.match(source, /className=\{styles\.sidebarStaticFilters\}/);
  assert.match(source, /className=\{styles\.sidebarScrollRegion\}/);
  assert.match(source, /Ubicación en mapa/);
  assert.doesNotMatch(source, /<p className=\{styles\.filterGroupLabel\}>Geometría<\/p>/);
  assert.match(css, /\.sidebar\s*\{[\s\S]*overflow: hidden;/);
  assert.match(css, /\.sidebarScrollRegion\s*\{[\s\S]*flex: 1 1 auto;[\s\S]*min-height: 0;[\s\S]*overflow-y: auto;/);
});

test("ExplorerView applies sidebar filters by returning from detail to the filtered list", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /const returnToFilteredList = \(\) => \{/);
  assert.match(source, /if \(selectedDetailCase\) onClearSelection\(\)/);
  assert.match(source, /const handleGeometryFilterChange = \(value: InvestigatorGeometryFilter\) => \{[\s\S]*returnToFilteredList\(\);[\s\S]*setGeometryFilter\(value\);/);
  assert.match(source, /const handleYearFromChange = \(value: number\) => \{[\s\S]*returnToFilteredList\(\);[\s\S]*setYearFrom\(value\);/);
  assert.match(source, /const handleYearToChange = \(value: number\) => \{[\s\S]*returnToFilteredList\(\);[\s\S]*setYearTo\(value\);/);
  assert.match(source, /const toggleFacet = \(facet: InvestigatorFacet\) => \{[\s\S]*returnToFilteredList\(\);[\s\S]*setActiveFacets/);
  assert.match(source, /const resetFilters = \(\) => \{[\s\S]*returnToFilteredList\(\);[\s\S]*setActiveFacets\(\[\]\);/);
});

test("ExplorerView uses one vertical content scroll surface", async () => {
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.match(css, /\.shell\s*\{[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.shell\s*\{[\s\S]*overflow-x: hidden;/);
  assert.match(css, /\.main\s*\{[\s\S]*height: auto;[\s\S]*overflow: visible;/);
  assert.doesNotMatch(css, /\.main\s*\{[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.sidebar\s*\{[\s\S]*position: sticky;[\s\S]*height: 100dvh;/);
});

test("ExplorerView keeps detail report actions below the floating mode nav", async () => {
  const source = await readFile(explorerViewUrl, "utf8");
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.match(source, /Informe PDF/);
  assert.match(source, /href=\{buildReportHref\(caseFile\.id\)\}/);
  assert.match(css, /\.main\s*\{[\s\S]*padding-top: 72px;/);
  assert.match(css, /@media \(max-width: 900px\)\s*\{[\s\S]*\.main\s*\{[\s\S]*padding-top: 124px;/);
  assert.match(css, /@media \(max-width: 900px\)\s*\{[\s\S]*\.detailTopBar\s*\{[\s\S]*top: 128px;/);
});

test("ExplorerView opens public official source pages instead of raw receipt dataset URLs", async () => {
  const source = await readFile(explorerViewUrl, "utf8");
  const topSourceActionStart = source.indexOf("href={sourceUrl}");
  const topSourceActionEnd = source.indexOf("{receiptLocator?.actionLabel", topSourceActionStart);
  const topSourceAction = source.slice(topSourceActionStart, topSourceActionEnd);

  assert.match(source, /getPublicOfficialSourceHref\(caseFile\.receipt\)/);
  assert.doesNotMatch(source, /href=\{caseFile\.receipt\.sourceUrl\}/);
  assert.match(topSourceAction, /onClick=\{handleSourceAction\}/);
  assert.doesNotMatch(topSourceAction, /target=|rel=/);
  assert.match(source, /navigator\.clipboard\.writeText\(sourceUrl\)/);
  assert.match(source, /window\.open\(sourceUrl, "_blank", "noopener,noreferrer"\)/);
  assert.match(source, /Enlace oficial copiado/);
  assert.match(source, /Enlace oficial:/);
  assert.match(source, /detailActionUrl/);
});

test("ExplorerView shows article citations as context, not as official trail", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /ContextualCitationsPanel/);
  assert.match(source, /contextualCitations/);
  assert.doesNotMatch(source, /contextualCitations.*officialTrail/s);
});

test("ExplorerView keeps technical JSON out of the common case detail actions", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /Informe PDF/);
  assert.doesNotMatch(source, /JSON técnico/);
  assert.doesNotMatch(source, /href=\{`\/api\/export\/\$\{encodeURIComponent\(caseFile\.id\)\}`\}/);
  assert.match(source, /buildReportHref/);
});

test("ExplorerView keeps case folders out of the public explorer workflow", async () => {
  const source = [
    await readFile(explorerViewUrl, "utf8"),
    await readFile(platformModeNavUrl, "utf8"),
  ].join("\n");
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.doesNotMatch(source, /addCaseToStoredInvestigationWorkspace/);
  assert.doesNotMatch(source, /onSwitchToInvestigations/);
  assert.doesNotMatch(source, /Carpetas|Guardar en carpeta|Ver carpeta/);
  assert.match(source, /Aportar/);
  assert.doesNotMatch(source, /Mis carpetas|FolderPlus|event\.stopPropagation\(\)/);
  assert.doesNotMatch(css, /\.saveCaseButton|\.detailFolderForm/);
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

test("ExplorerView keeps evidence details digestible with a compact status and advanced disclosure", async () => {
  const source = await readFile(explorerViewUrl, "utf8");
  const css = await readFile(explorerStylesUrl, "utf8");

  assert.match(source, /buildEvidenceClaimMatrix/);
  assert.match(source, /buildCaseInvestigationChecklist/);
  assert.match(source, /EvidenceClaimMatrixPanel/);
  assert.match(source, /InvestigationStatusPanel/);
  assert.match(source, /AdvancedEvidenceDetails/);
  assert.match(source, /Estado de investigación/);
  assert.match(source, /Próximo paso/);
  assert.match(source, /Ver matriz completa, receipts y caveats/);
  assert.match(source, /Qué prueba \/ qué falta/);
  assert.match(source, /Puede sostener/);
  assert.match(source, /Parcial \/ revisar/);
  assert.match(source, /No afirmar todavía/);
  assert.match(source, /No hay pago a proveedor soportado/);
  assert.match(css, /\.claimMatrixPanel/);
  assert.match(css, /\.investigationStatusPanel/);
  assert.match(css, /\.advancedEvidenceDetails/);
  assert.match(css, /\.claimMatrixColumns/);
  assert.match(css, /\.claimStatusSupported/);
  assert.match(css, /\.claimStatusMissing/);
});

test("ExplorerView keeps Argentina context out of the Explorer header", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.doesNotMatch(source, /COUNTRY_OPTIONS/);
  assert.doesNotMatch(source, /countrySelector/);
  assert.doesNotMatch(source, /CountryFlag/);
  assert.doesNotMatch(source, /aria-label="País"/);
  assert.doesNotMatch(source, /onSelectCountry/);
  assert.doesNotMatch(source, /code: "ALL"/);
  assert.doesNotMatch(source, /Todos/);
  assert.doesNotMatch(source, /countryScope === "ALL"/);
});

test("ExplorerView renders concrete investigative search suggestions", async () => {
  const source = [
    await readFile(explorerViewUrl, "utf8"),
    await readFile(searchSuggestionGroupsUrl, "utf8"),
    await readFile(searchSuggestionHelpersUrl, "utf8"),
  ].join("\n");
  const styles = [
    await readFile(explorerStylesUrl, "utf8"),
    await readFile(searchSuggestionStylesUrl, "utf8"),
  ].join("\n");

  assert.match(source, /buildSearchSuggestionIndex/);
  assert.match(source, /buildSearchSuggestionsFromIndex/);
  assert.match(source, /SearchSuggestionGroups/);
  assert.match(source, /Coincidencias/);
  assert.match(source, /groupSearchSuggestions/);
  assert.match(source, /suggestionCardDetail/);
  assert.match(source, /formatSuggestionCount/);
  assert.match(source, /formatSuggestionGroupCount/);
  assert.match(source, /Buscar provincia, localidad, ruta, proveedor, CUIT, organismo o expediente/);
  assert.match(source, /suggestionKindLabel/);
  assert.match(source, /Proveedor/);
  assert.match(source, /CUIT/);
  assert.match(source, /Organismo/);
  assert.match(source, /Expediente/);
  assert.match(source, /Señal/);
  assert.match(source, /Alias/);
  assert.match(source, /Fuente/);
  assert.match(source, /Provincia/);
  assert.match(styles, /\.groups/);
  assert.match(styles, /\.groupHead/);
  assert.match(styles, /\.match/);
  assert.match(styles, /--suggest-text: var\(--cf-workspace-text, var\(--cf-text/);
  assert.match(styles, /\.groupTitle/);
  assert.match(styles, /\.grid/);
  assert.match(styles, /\.button/);
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
  assert.match(source, /Abrir expediente/);
  assert.doesNotMatch(source, /Fechas clave/);
  assert.doesNotMatch(source, /Datos clave/);
  assert.match(source, /preset !== "selected"/);
  assert.match(source, /Ver todos los expedientes|Limpiar filtro/);
  assert.match(source, /preset === "selected"/);
  assert.match(source, /selectedDetailCase/);
  assert.match(source, /selectedCaseIds\.has\(selectedCase\.id\)/);
  assert.match(source, /clearPreset/);
  assert.match(source, /useSearchParams/);
  assert.match(source, /\.delete\("preset"\)/);
  assert.match(source, /router\.replace/);
  assert.match(source, /presetScopedRows/);
  assert.match(css, /\.presetBanner/);
  assert.match(css, /\[data-platform-theme="light"\]\) \.presetBanner/);
  assert.match(css, /background: var\(--cf-workspace-bg, var\(--cf-bg\)\);/);
  assert.match(css, /background: var\(--cf-workspace-sidebar-bg, var\(--cf-bg-elev\)\);/);
  assert.match(css, /background: var\(--cf-workspace-input-bg, var\(--cf-bg-elev\)\);/);
  assert.doesNotMatch(css, /background: #ffffff;|background: #f8fbfd;|background: #eef6fc;/);
  assert.match(css, /\.presetBannerHeader/);
  assert.match(css, /\.presetRationaleList/);
  assert.match(css, /\.presetRationaleItem/);
  assert.match(css, /min-height: 150px/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1280px\)/);
});
