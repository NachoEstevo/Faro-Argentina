import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const explorerViewUrl = new URL("../src/components/Explorer/ExplorerView.tsx", import.meta.url);

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

  assert.match(source, /if \(row\.primarySignal\) signaledRows \+= 1/);
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

test("ExplorerView only offers country-specific search scopes", async () => {
  const source = await readFile(explorerViewUrl, "utf8");

  assert.match(source, /{ code: "AR", short: "AR", label: "Argentina" }/);
  assert.match(source, /{ code: "CL", short: "CL", label: "Chile" }/);
  assert.match(source, /{ code: "PE", short: "PE", label: "Perú" }/);
  assert.doesNotMatch(source, /code: "ALL"/);
  assert.doesNotMatch(source, /Todos/);
  assert.doesNotMatch(source, /countryScope === "ALL"/);
});
