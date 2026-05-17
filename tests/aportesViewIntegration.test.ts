import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const aportesViewUrl = new URL("../src/components/Aportes/AportesView.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countryPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const floatingToggleUrl = new URL("../src/components/RegionalMap/FloatingModeToggle.tsx", import.meta.url);

test("AportesView submits private contributions with photo attachments", async () => {
  const source = await readFile(aportesViewUrl, "utf8");

  assert.match(source, /Ayudanos a mejorar Faro/);
  assert.match(source, /\/api\/aportes/);
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

test("FaroExperience exposes Aportes beside Map and Explorer without treating it as a case mode", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /AportesView/);
  assert.match(source, /"map" \| "explorer" \| "aportes"/);
  assert.match(source, /setViewMode\("aportes"\)/);
  assert.match(source, /Aportes/);
});

test("country route can open the aportes mode directly", async () => {
  const source = await readFile(countryPageUrl, "utf8");

  assert.match(source, /mode\) === "aportes"/);
  assert.match(source, /"aportes"/);
});

test("regional landing toggle links to Aportes without public-community language", async () => {
  const source = await readFile(floatingToggleUrl, "utf8");

  assert.match(source, /mode=aportes/);
  assert.match(source, /Aportes/);
  assert.doesNotMatch(source, /Comunidad|Denuncia/);
});
