import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const aportesViewUrl = new URL("../src/components/Aportes/AportesView.tsx", import.meta.url);
const aportesStylesUrl = new URL("../src/components/Aportes/AportesView.module.css", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countryPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const floatingToggleUrl = new URL("../src/components/RegionalMap/FloatingModeToggle.tsx", import.meta.url);
const platformModeNavUrl = new URL("../src/components/PlatformModeNav.tsx", import.meta.url);
const resourcesSectionUrl = new URL("../src/components/RegionalMap/ResourcesSection.tsx", import.meta.url);

test("AportesView submits private contributions with file attachments", async () => {
  const source = await readFile(aportesViewUrl, "utf8");

  assert.match(source, /Ayudanos a mejorar Faro/);
  assert.match(source, /\/api\/aportes/);
  assert.match(source, /FaroMark compact/);
  assert.match(source, /sidebarBrandName}>Faro/);
  assert.match(source, /className=\{styles\.stepper\}/);
  assert.match(source, /Paso 1/);
  assert.match(source, /Paso 2/);
  assert.match(source, /Paso 3/);
  assert.match(source, /Datos necesarios/);
  assert.match(source, /Revisión/);
  assert.match(source, /Agregar fuente/);
  assert.match(source, /Corregir dato/);
  assert.match(source, /Subir archivo o foto/);
  assert.match(source, /Fuente para revisar/);
  assert.match(source, /Corrección de dato/);
  assert.match(source, /Archivo o foto/);
  assert.match(source, /buildCaseLinkSuggestions/);
  assert.match(source, /RelatedCaseField/);
  assert.match(source, /SearchSuggestionGroups/);
  assert.match(source, /name="relatedCase"/);
  assert.match(source, /Ayuda a orientar la revisión; no confirma relación y no se publica automáticamente/);
  assert.match(source, /resolveRelatedCaseValue/);
  assert.match(source, /setRelatedCase\(""\)/);
  assert.match(source, /setRelatedCaseQuery\(""\)/);
  assert.match(source, /aria-label=\{selectedCopy\.titleLabel\}/);
  assert.match(source, /aria-label=\{selectedCopy\.explanationLabel\}/);
  assert.doesNotMatch(source, /Sugerir pista|Reportar problema/);
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp,application\/pdf"/);
  assert.match(source, /Archivo de respaldo opcional/);
  assert.match(source, /Respaldo privado opcional/);
  assert.match(source, /Archivo o foto del aporte/);
  assert.doesNotMatch(source, /Fotos privadas/);
  assert.match(source, /material enviado/i);
  assert.match(source, /Material aportado por usuario/);
  assert.match(source, /Enviar sin contacto/);
  assert.match(source, /No pedimos nombre ni email/);
  assert.match(source, /type="radio"/);
  assert.match(source, /value="anonymous"/);
  assert.match(source, /value="contact"/);
  assert.match(source, /name="contactEmail"[\s\S]*required=\{privacyMode === "contact"\}/);
  assert.doesNotMatch(source, /role="radiogroup"/);
  assert.match(source, /no significa anonimato absoluto/i);
  assert.match(source, /nombre neutralizado/);
  assert.match(source, /metadatos EXIF o PDF/);
  assert.match(source, /\/aportes\/politica/);
  assert.match(source, /\/privacidad/);
  assert.match(source, /\/terminos/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /Publicar caso|Comunidad|Denuncia/);
});

test("AportesView keeps the form reference before async submission work", async () => {
  const source = await readFile(aportesViewUrl, "utf8");

  assert.match(source, /const formElement = event\.currentTarget;/);
  assert.match(source, /formElement\.reset\(\)/);
  assert.doesNotMatch(source, /event\.currentTarget\.reset\(\)/);
});

test("AportesView does not surface raw JavaScript errors to users", async () => {
  const source = await readFile(aportesViewUrl, "utf8");

  assert.match(source, /formatSubmitFailureMessage/);
  assert.doesNotMatch(source, /setStatusText\(error instanceof Error \? error\.message/);
});

test("AportesView relies on the global platform nav instead of a local sidebar nav", async () => {
  const source = await readFile(aportesViewUrl, "utf8");

  assert.doesNotMatch(source, /PlatformModeNav/);
  assert.doesNotMatch(source, /variant="sidebar"/);
  assert.doesNotMatch(source, /switchPlatformMode/);
});

test("AportesView inherits platform work-view theme surfaces", async () => {
  const styles = await readFile(aportesStylesUrl, "utf8");

  assert.match(styles, /background:\s*var\(--cf-workspace-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-sidebar-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-card-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-input-bg/);
  assert.match(styles, /\.sidebarBrandIdentity\s*\{[\s\S]*gap: 12px;/);
  assert.match(styles, /\.sidebarBrandName\s*\{[\s\S]*font-size: 22px;/);
  assert.match(styles, /\.content\s*\{[\s\S]*justify-content: center;[\s\S]*padding: clamp\(84px, 10vh, 104px\)/);
  assert.match(styles, /\.form\s*\{[\s\S]*width: 100%;[\s\S]*max-width: 1080px;/);
  assert.match(styles, /\.title\s*\{[\s\S]*font-size: clamp\(36px, 4vw, 50px\);/);
  assert.match(styles, /\.step\s*\{[\s\S]*min-height: 62px;[\s\S]*padding: 10px 12px;/);
  assert.match(styles, /\.typeButton\s*\{[\s\S]*min-height: 98px;[\s\S]*padding: 14px;/);
  assert.match(styles, /\.typeGrid\s*\{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(styles, /\.privacyModes/);
  assert.match(styles, /\.securityNote/);
});

test("FaroExperience exposes Aportes as a secondary action, not a primary mode tab", async () => {
  const source = [
    await readFile(faroExperienceUrl, "utf8"),
    await readFile(platformModeNavUrl, "utf8"),
  ].join("\n");

  assert.match(source, /AportesView/);
  assert.match(source, /<AportesView[\s\S]*cases=\{allCases\}/);
  assert.match(source, /type PlatformMode = "map" \| "explorer" \| "investigations" \| "aportes"/);
  assert.match(source, /viewMode === "aportes"/);
  assert.match(source, /MessageSquarePlus/);
  assert.match(source, /Aportar/);
  assert.match(source, /mode="aportes"/);
  assert.match(source, /styles\.secondary/);
  assert.doesNotMatch(source, /Aportes[\s\S]*?aria-pressed=\{false\}/);
});

test("FaroExperience only enables Wayback for satellite-eligible map evidence", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /shouldEnableWaybackForCase/);
  assert.match(source, /satelliteEligible/);
  assert.match(source, /!selectedCaseWaybackEligible/);
});

test("country route can open the aportes mode directly", async () => {
  const source = await readFile(countryPageUrl, "utf8");

  assert.match(source, /mode\) === "aportes"/);
  assert.match(source, /"aportes"/);
});

test("regional landing exposes Aportes as a secondary action", async () => {
  const source = [
    await readFile(floatingToggleUrl, "utf8"),
    await readFile(platformModeNavUrl, "utf8"),
  ].join("\n");
  const resourcesSource = await readFile(resourcesSectionUrl, "utf8");

  assert.match(source, /buildPlatformModeHref/);
  assert.match(source, /mode="aportes"/);
  assert.match(source, /Aportar/);
  assert.match(source, /MessageSquarePlus/);
  assert.match(resourcesSource, /Metodología/);
  assert.match(resourcesSource, /\/metodologia/);
  assert.match(resourcesSource, /Datos abiertos/);
  assert.match(resourcesSource, /\/datos/);
  assert.match(resourcesSource, /Privacidad y seguridad/);
  assert.match(resourcesSource, /\/privacidad/);
  assert.match(resourcesSource, /Reportar un error/);
  assert.match(resourcesSource, /\/pais\/AR\?mode=aportes/);
  assert.doesNotMatch(resourcesSource, /github\.com\/NachoEstevo\/Faro/);
  assert.doesNotMatch(resourcesSource, /target="_blank"|externalLinkProps/);
  assert.doesNotMatch(source, /Comunidad|Denuncia/);
});

test("legal policy pages exist as static app routes", async () => {
  const routeUrls = [
    new URL("../src/app/privacidad/page.tsx", import.meta.url),
    new URL("../src/app/terminos/page.tsx", import.meta.url),
    new URL("../src/app/seguridad/page.tsx", import.meta.url),
    new URL("../src/app/aportes/politica/page.tsx", import.meta.url),
  ];

  for (const routeUrl of routeUrls) {
    const source = await readFile(routeUrl, "utf8");
    assert.match(source, /LegalDocument/);
    assert.match(source, /mayo de 2026/);
  }

  const privacySource = await readFile(routeUrls[0], "utf8");
  const securitySource = await readFile(routeUrls[2], "utf8");
  const policySource = await readFile(routeUrls[3], "utf8");
  assert.match(privacySource, /Retencion/);
  assert.match(privacySource, /transferencias internacionales/);
  assert.match(securitySource, /Metadatos de archivos/);
  assert.match(securitySource, /URLs publicas permanentes/);
  assert.match(policySource, /Modo sin contacto/);
  assert.match(policySource, /Retencion y descarte/);
});
