import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const aportesViewUrl = new URL("../src/components/Aportes/AportesView.tsx", import.meta.url);
const aportesStylesUrl = new URL("../src/components/Aportes/AportesView.module.css", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countryPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const floatingToggleUrl = new URL("../src/components/RegionalMap/FloatingModeToggle.tsx", import.meta.url);

test("AportesView submits private contributions with photo attachments", async () => {
  const source = await readFile(aportesViewUrl, "utf8");

  assert.match(source, /Ayudanos a mejorar Faro/);
  assert.match(source, /\/api\/aportes/);
  assert.match(source, /className=\{styles\.stepper\}/);
  assert.match(source, /Paso 1/);
  assert.match(source, /Paso 2/);
  assert.match(source, /Paso 3/);
  assert.match(source, /Datos y archivos/);
  assert.match(source, /Revisión/);
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(source, /Material aportado por usuario/);
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

  assert.match(source, /mode=aportes/);
  assert.match(source, /Aportar/);
  assert.match(source, /MessageSquarePlus/);
  assert.doesNotMatch(source, /Comunidad|Denuncia/);
});
