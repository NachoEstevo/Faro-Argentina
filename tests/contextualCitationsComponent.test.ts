import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const componentUrl = new URL("../src/components/ContextualCitations.tsx", import.meta.url);
const mapPanelUrl = new URL("../src/components/MapUI/panel/PanelTechDetails.tsx", import.meta.url);

test("ContextualCitations keeps journalism visibly separate from official evidence", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.match(source, /Contexto periodístico verificado/);
  assert.match(source, /Resumen de cobertura/);
  assert.match(source, /Referencia externa/);
  assert.match(source, /Fuente externa/);
  assert.match(source, /renderCitationIcon/);
  assert.match(source, /BadgeCheck/);
  assert.match(source, /RadioTower/);
  assert.doesNotMatch(source, /Rastro oficial/);
  assert.doesNotMatch(source, /evidencia oficial/i);
});

test("new map panel can surface contextual citations without folding them into official details", async () => {
  const source = await readFile(mapPanelUrl, "utf8");

  assert.match(source, /ContextualCitationsPanel/);
  assert.match(source, /caseFile\.contextualCitations/);
  assert.match(source, /compact/);
});
