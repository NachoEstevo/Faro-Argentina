import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const aportesViewUrl = new URL("../src/components/Aportes/AportesView.tsx", import.meta.url);
const aportesStylesUrl = new URL("../src/components/Aportes/AportesView.module.css", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countryPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const floatingToggleUrl = new URL("../src/components/RegionalMap/FloatingModeToggle.tsx", import.meta.url);
const resourcesSectionUrl = new URL("../src/components/RegionalMap/ResourcesSection.tsx", import.meta.url);

test("AportesView submits private contributions with file attachments", async () => {
  const source = await readFile(aportesViewUrl, "utf8");

  assert.match(source, /Ayudanos a mejorar Faro/);
  assert.match(source, /\/api\/aportes/);
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

test("Aportes sidebar mode switch stays inside the sidebar", async () => {
  const styles = await readFile(aportesStylesUrl, "utf8");

  assert.match(styles, /\.sidebar\s*\{[\s\S]*min-width: 0;[\s\S]*overflow: hidden;/);
  assert.match(styles, /\.modeSwitch\s*\{[\s\S]*display: grid;[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*width: 100%;[\s\S]*max-width: 100%;/);
  assert.match(styles, /\.modeButton\s*\{[\s\S]*justify-content: center;[\s\S]*min-width: 0;/);
  assert.doesNotMatch(styles, /\.modeSwitch\s*\{[\s\S]*width: fit-content;/);
});

test("AportesView inherits platform work-view theme surfaces", async () => {
  const styles = await readFile(aportesStylesUrl, "utf8");

  assert.match(styles, /background:\s*var\(--cf-workspace-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-sidebar-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-card-bg/);
  assert.match(styles, /background:\s*var\(--cf-workspace-input-bg/);
  assert.match(styles, /\.typeGrid\s*\{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(styles, /\.privacyModes/);
  assert.match(styles, /\.securityNote/);
});

test("FaroExperience exposes Aportes as a secondary action, not a primary mode tab", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /AportesView/);
  assert.match(source, /"map" \| "explorer" \| "aportes"/);
  assert.match(source, /viewMode === "aportes"/);
  assert.match(source, /MessageSquarePlus/);
  assert.match(source, /Aportar/);
  assert.match(source, /styles\.floatingActionButton/);
  assert.doesNotMatch(source, /aria-pressed=\{false\}[\s\S]*?Aportes[\s\S]*?<\/button>/);
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
  const source = await readFile(floatingToggleUrl, "utf8");
  const resourcesSource = await readFile(resourcesSectionUrl, "utf8");

  assert.match(source, /mode=aportes/);
  assert.match(source, /Aportar/);
  assert.match(source, /MessageSquarePlus/);
  assert.match(resourcesSource, /Privacidad y seguridad/);
  assert.match(resourcesSource, /\/privacidad/);
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
    assert.match(source, /24 de mayo de 2026/);
  }
});
