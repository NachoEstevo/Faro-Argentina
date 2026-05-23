import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const investigationsViewUrl = new URL("../src/components/Investigations/InvestigationsView.tsx", import.meta.url);
const investigationsChromeUrl = new URL("../src/components/Investigations/InvestigationsChrome.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countryPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const floatingToggleUrl = new URL("../src/components/RegionalMap/FloatingModeToggle.tsx", import.meta.url);
const regionalMapStylesUrl = new URL("../src/components/RegionalMap/RegionalMap.module.css", import.meta.url);
const aportesViewUrl = new URL("../src/components/Aportes/AportesView.tsx", import.meta.url);
const investigationsStylesUrl = new URL("../src/components/Investigations/InvestigationsView.module.css", import.meta.url);

test("InvestigationsView manages local workspaces, analysis and ZIP export", async () => {
  const source = [
    await readFile(investigationsViewUrl, "utf8"),
    await readFile(investigationsChromeUrl, "utf8"),
  ].join("\n");

  assert.match(source, /Carpeta de investigación/);
  assert.match(source, /\/api\/investigations\/case-pack/);
  assert.match(source, /\/api\/investigations\/analyze/);
  assert.match(source, /readStoredInvestigationWorkspace/);
  assert.match(source, /writeStoredInvestigationWorkspace/);
  assert.match(source, /readStoredInvestigationWorkspaceCollection/);
  assert.match(source, /writeStoredInvestigationWorkspaceCollection/);
  assert.match(source, /buildInvestigationZip/);
  assert.match(source, /Exportar carpeta ZIP/);
  assert.match(source, /Generar análisis de trabajo/);
  assert.match(source, /INVESTIGATION_RELATION_REASON_OPTIONS/);
  assert.match(source, /Motivo de relación/);
  assert.match(source, /Nota de relación/);
  assert.match(source, /Resumen de carpeta/);
  assert.match(source, /Motivos declarados/);
  assert.match(source, /WorkspaceTabs/);
  assert.match(source, /"resumen" \| "expedientes" \| "notas" \| "analisis" \| "exportar"/);
  assert.match(source, /Resumen/);
  assert.match(source, /Expedientes/);
  assert.match(source, /Notas/);
  assert.match(source, /Análisis/);
  assert.match(source, /Exportar/);
  assert.match(source, /AnalysisMarkdown/);
  assert.match(source, /parseInvestigationAnalysisBlocks/);
  assert.match(source, /analysisTable/);
  assert.match(source, /WorkspaceSwitcher/);
  assert.match(source, /Carpetas guardadas/);
  assert.match(source, /Seleccionar carpeta/);
  assert.match(source, /Nueva carpeta/);
  assert.doesNotMatch(source, /<pre className=\{styles\.analysis\}/);
  assert.doesNotMatch(source, /Denuncia|Caso probado|Score de corrupción|Score de corrupcion|Publicar caso/);
});

test("FaroExperience exposes Carpetas from the main mode toggle", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /InvestigationsView/);
  assert.match(source, /"map" \| "explorer" \| "aportes" \| "investigations"/);
  assert.match(source, /viewMode === "investigations"/);
  assert.match(source, /FolderOpen/);
  assert.match(source, /setViewMode\("investigations"\)/);
  assert.match(source, /Carpetas/);
  assert.doesNotMatch(source, /Mis carpetas/);
});

test("FaroExperience keeps private modes isolated from the map sidebar", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /const showMapChrome = viewMode === "map";/);
  assert.match(source, /{showMapChrome && <MobileHeader/);
  assert.match(source, /{showMapChrome && \(\s*<CountrySidebar/s);
  assert.match(source, /const showOverlayChrome = viewMode === "map" \|\| viewMode === "explorer";/);
});

test("InvestigationsView inherits platform work-view theme surfaces", async () => {
  const styles = await readFile(investigationsStylesUrl, "utf8");

  assert.match(styles, /background:\s*var\(--cf-workspace-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-sidebar-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-card-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-input-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-analysis-bg/);
});

test("country route can open investigations mode directly", async () => {
  const source = await readFile(countryPageUrl, "utf8");

  assert.match(source, /mode\) === "investigations"/);
  assert.match(source, /"investigations"/);
});

test("regional landing exposes Carpetas while aportes mode can still link to it", async () => {
  const floatingSource = await readFile(floatingToggleUrl, "utf8");
  const stylesSource = await readFile(regionalMapStylesUrl, "utf8");
  const aportesSource = await readFile(aportesViewUrl, "utf8");

  assert.match(floatingSource, /mode=investigations/);
  assert.match(floatingSource, /Carpetas/);
  assert.doesNotMatch(floatingSource, /Mis carpetas/);
  assert.match(floatingSource, /Explorar/);
  assert.match(stylesSource, /text-decoration: none/);
  assert.match(floatingSource, /FolderOpen/);
  assert.match(aportesSource, /onSwitchToInvestigations/);
  assert.match(aportesSource, /Carpetas/);
});
