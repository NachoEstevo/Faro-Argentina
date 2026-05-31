import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const investigationsViewUrl = new URL("../src/components/Investigations/InvestigationsView.tsx", import.meta.url);
const investigationsChromeUrl = new URL("../src/components/Investigations/InvestigationsChrome.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countryPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const floatingToggleUrl = new URL("../src/components/RegionalMap/FloatingModeToggle.tsx", import.meta.url);
const platformModeNavUrl = new URL("../src/components/PlatformModeNav.tsx", import.meta.url);
const regionalMapStylesUrl = new URL("../src/components/RegionalMap/RegionalMap.module.css", import.meta.url);
const aportesViewUrl = new URL("../src/components/Aportes/AportesView.tsx", import.meta.url);
const investigationsStylesUrl = new URL("../src/components/Investigations/InvestigationsView.module.css", import.meta.url);

test("InvestigationsView manages local workspaces, analysis and ZIP export", async () => {
  const source = [
    await readFile(investigationsViewUrl, "utf8"),
    await readFile(investigationsChromeUrl, "utf8"),
  ].join("\n");

  assert.match(source, /Carpeta de investigación/);
  assert.match(source, /FaroMark compact/);
  assert.match(source, /sidebarBrandName}>Faro/);
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
  assert.match(source, /useState<InvestigationCaseRelationReason>\("manual_hypothesis"\)/);
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
  assert.match(source, /WorkspaceSyncPanel/);
  assert.match(source, /buildInvestigationDossier/);
  assert.match(source, /Dossier de trabajo/);
  assert.match(source, /Resumen del dossier/);
  assert.match(source, /Matriz de evidencia/);
  assert.match(source, /Detalle plegado por expediente/);
  assert.match(source, /matrixSummary/);
  assert.match(source, /summarizeDossierGap/);
  assert.match(source, /Actores comunes/);
  assert.match(source, /Base de identidad/);
  assert.match(source, /Brechas para verificar/);
  assert.match(source, /Próximos pasos/);
  assert.match(source, /Crear carpeta de investigación/);
  assert.match(source, /Definí una pregunta de trabajo/);
  assert.match(source, /Abrir fuente oficial/);
  assert.match(source, /Guardar próximos pasos como nota/);
  assert.match(source, /buildSearchSuggestions/);
  assert.match(source, /SearchSuggestionGroups/);
  assert.match(source, /Buscar provincia, proveedor, CUIT, organismo, fuente o expediente/);
  assert.match(source, /Qué ayuda a verificar o qué queda pendiente/);
  assert.match(source, /Pregunta de investigación/);
  assert.match(source, /Buscar primer expediente/);
  assert.match(source, /Agregar más expedientes/);
  assert.match(source, /brecha: sin geometría oficial/);
  assert.match(source, /fuente oficial disponible/);
  assert.match(source, /handleSaveDossierNextSteps/);
  assert.match(source, /setActiveTab\("notas"\)/);
  assert.match(source, /noteList/);
  assert.match(source, /formatNoteDate/);
  assert.match(source, /contexto del usuario/i);
  assert.match(source, /\/api\/investigations\/workspaces/);
  assert.match(source, /SignInButton/);
  assert.match(source, /UserButton/);
  assert.match(source, /Cuenta privada/);
  assert.match(source, /Cargar cuenta/);
  assert.match(source, /Guardar cuenta/);
  assert.match(source, /Iniciar sesión/);
  assert.match(source, /sincronizar con tu cuenta/i);
  assert.doesNotMatch(source, /x-faro-workspace-code/);
  assert.doesNotMatch(source, /Código privado/);
  assert.match(source, /Carpetas guardadas/);
  assert.match(source, /Seleccionar carpeta/);
  assert.match(source, /Nueva carpeta/);
  assert.doesNotMatch(source, /<pre className=\{styles\.analysis\}/);
  assert.doesNotMatch(source, /Denuncia|Caso probado|Score de corrupción|Score de corrupcion|Publicar caso/);
});

test("FaroExperience exposes Carpetas from the main mode toggle", async () => {
  const source = [
    await readFile(faroExperienceUrl, "utf8"),
    await readFile(platformModeNavUrl, "utf8"),
  ].join("\n");

  assert.match(source, /InvestigationsView/);
  assert.match(source, /"map" \| "explorer" \| "investigations" \| "aportes"/);
  assert.match(source, /viewMode === "investigations"/);
  assert.match(source, /FolderOpen/);
  assert.match(source, /switchViewMode\("investigations"\)/);
  assert.match(source, /Carpetas/);
  assert.doesNotMatch(source, /Mis carpetas/);
});

test("FaroExperience keeps private modes isolated from the map sidebar", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /const showMapChrome = viewMode === "map";/);
  assert.match(source, /const showBackControl = viewMode === "map";/);
  assert.match(source, /{showMapChrome && <MobileHeader/);
  assert.match(source, /{showMapChrome && \(\s*<CountrySidebar/s);
  assert.match(source, /<PlatformModeNav[\s\S]*activeMode=\{viewMode\}[\s\S]*variant="floating"/);
  assert.match(source, /<div className=\{styles\.overlayLayer\}>/);
  assert.doesNotMatch(source, /overlayLayerGlobal/);
});

test("InvestigationsView inherits platform work-view theme surfaces", async () => {
  const styles = await readFile(investigationsStylesUrl, "utf8");

  assert.match(styles, /background:\s*var\(--cf-workspace-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-sidebar-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-card-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-input-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-analysis-bg/);
  assert.match(styles, /\.sidebarBrandIdentity\s*\{[\s\S]*gap: 12px;/);
  assert.match(styles, /\.sidebarBrandName\s*\{[\s\S]*font-size: 22px;/);
  assert.match(styles, /\.content\s*\{[\s\S]*justify-content: center;[\s\S]*padding: clamp\(84px, 10vh, 104px\)/);
  assert.match(styles, /\.form,[\s\S]*\.workspace\s*\{[\s\S]*width: 100%;[\s\S]*max-width: 1080px;/);
  assert.match(styles, /\.title\s*\{[\s\S]*font-size: clamp\(36px, 4vw, 50px\);/);
  assert.match(styles, /\.tabs\s*\{[\s\S]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);[\s\S]*height: 50px;[\s\S]*overflow: hidden;/);
  assert.match(styles, /\.tabButton\s*\{[\s\S]*width: 100%;[\s\S]*height: 38px;[\s\S]*font-size: 13px;[\s\S]*white-space: nowrap;/);
  assert.match(styles, /\.tabButtonActive,[\s\S]*\.tabButton\[aria-selected="true"\]\s*\{[\s\S]*background: var\(--cf-accent\);[\s\S]*color: var\(--cf-on-accent\);/);
});

test("country route can open investigations mode directly", async () => {
  const source = await readFile(countryPageUrl, "utf8");

  assert.match(source, /mode\) === "investigations"/);
  assert.match(source, /"investigations"/);
});

test("regional landing exposes Carpetas while aportes mode can still link to it", async () => {
  const floatingSource = [
    await readFile(floatingToggleUrl, "utf8"),
    await readFile(platformModeNavUrl, "utf8"),
  ].join("\n");
  const stylesSource = await readFile(regionalMapStylesUrl, "utf8");
  const aportesSource = [
    await readFile(aportesViewUrl, "utf8"),
    await readFile(platformModeNavUrl, "utf8"),
  ].join("\n");

  assert.match(floatingSource, /buildPlatformModeHref/);
  assert.match(floatingSource, /mode: "investigations"/);
  assert.match(floatingSource, /Carpetas/);
  assert.doesNotMatch(floatingSource, /Mis carpetas/);
  assert.match(floatingSource, /Explorar/);
  assert.match(stylesSource, /text-decoration: none/);
  assert.match(stylesSource, /\.overlayLayer\s*\{[\s\S]*left: 0;[\s\S]*right: 0;/);
  assert.match(stylesSource, /\.backToGlobal\s*\{[\s\S]*left: calc\(var\(--sidebar-width\) \+ 20px\);/);
  assert.match(floatingSource, /FolderOpen/);
  assert.doesNotMatch(aportesSource, /variant="sidebar"|switchPlatformMode/);
  assert.match(aportesSource, /Carpetas/);
});
