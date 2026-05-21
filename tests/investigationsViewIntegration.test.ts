import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const investigationsViewUrl = new URL("../src/components/Investigations/InvestigationsView.tsx", import.meta.url);
const investigationsChromeUrl = new URL("../src/components/Investigations/InvestigationsChrome.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countryPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const floatingToggleUrl = new URL("../src/components/RegionalMap/FloatingModeToggle.tsx", import.meta.url);
const aportesViewUrl = new URL("../src/components/Aportes/AportesView.tsx", import.meta.url);

test("InvestigationsView manages local workspaces, analysis and ZIP export", async () => {
  const source = [
    await readFile(investigationsViewUrl, "utf8"),
    await readFile(investigationsChromeUrl, "utf8"),
  ].join("\n");

  assert.match(source, /Carpeta de investigación/);
  assert.match(source, /\/api\/investigations\/case-pack/);
  assert.match(source, /\/api\/investigations\/analyze/);
  assert.match(source, /localStorage/);
  assert.match(source, /buildInvestigationZip/);
  assert.match(source, /Exportar carpeta ZIP/);
  assert.match(source, /Generar análisis de trabajo/);
  assert.match(source, /INVESTIGATION_RELATION_REASON_OPTIONS/);
  assert.match(source, /Motivo de relación/);
  assert.match(source, /Nota de relación/);
  assert.match(source, /Resumen de carpeta/);
  assert.match(source, /Motivos declarados/);
  assert.doesNotMatch(source, /Denuncia|Caso probado|Score de corrupción|Score de corrupcion|Publicar caso/);
});

test("FaroExperience keeps Investigaciones routeable but hides the public Investigaciones tab", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /InvestigationsView/);
  assert.match(source, /"map" \| "explorer" \| "aportes" \| "investigations"/);
  assert.match(source, /viewMode === "investigations"/);
  assert.doesNotMatch(source, /FolderOpen/);
  assert.doesNotMatch(source, /aria-pressed=\{false\}[\s\S]*?Investigaciones[\s\S]*?<\/button>/);
});

test("FaroExperience keeps private modes isolated from the map sidebar", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /const showMapChrome = viewMode === "map";/);
  assert.match(source, /{showMapChrome && <MobileHeader/);
  assert.match(source, /{showMapChrome && \(\s*<CountrySidebar/s);
  assert.match(source, /const showOverlayChrome = viewMode === "map" \|\| viewMode === "explorer";/);
});

test("country route can open investigations mode directly", async () => {
  const source = await readFile(countryPageUrl, "utf8");

  assert.match(source, /mode\) === "investigations"/);
  assert.match(source, /"investigations"/);
});

test("regional landing hides Investigaciones while aportes mode can still link to it", async () => {
  const floatingSource = await readFile(floatingToggleUrl, "utf8");
  const aportesSource = await readFile(aportesViewUrl, "utf8");

  assert.doesNotMatch(floatingSource, /mode=investigations/);
  assert.doesNotMatch(floatingSource, /Investigaciones/);
  assert.doesNotMatch(floatingSource, /FolderOpen/);
  assert.match(aportesSource, /onSwitchToInvestigations/);
  assert.match(aportesSource, /Investigaciones/);
});
