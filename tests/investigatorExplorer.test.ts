import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import {
  buildInvestigatorExplorer,
  type InvestigatorExplorerCase,
} from "../src/lib/data/investigatorExplorer.ts";
import type { ArgentinaWorkCase } from "../src/lib/data/argentinaWorks.ts";
import type { CrossCountryCaseFile } from "../src/lib/data/crossCountryCases.ts";

const argentinaCases = argentinaDataset.cases as ArgentinaWorkCase[];
const crossCountryCases = crossCountryDataset.cases as CrossCountryCaseFile[];
const allCases = [...argentinaCases, ...crossCountryCases] as InvestigatorExplorerCase[];

test("buildInvestigatorExplorer scans map and non-map cases across countries", () => {
  const explorer = buildInvestigatorExplorer(allCases, { limit: 500 });

  assert.equal(explorer.viewType, "faro_investigator_explorer_v1");
  assert.equal(explorer.stats.totalCases, allCases.length);
  assert.equal(explorer.rows.some((row) => row.countryCode === "AR" && row.hasOfficialGeometry), true);
  assert.equal(explorer.rows.some((row) => row.countryCode === "PE" && !row.hasOfficialGeometry), true);
  assert.equal(explorer.rows.some((row) => row.countryCode === "CL" && !row.hasOfficialGeometry), true);
  assert.equal(explorer.facets.some((facet) => facet.type === "source"), true);
});

test("buildInvestigatorExplorer searches by supplier, source, record id, and signal", () => {
  const supplierSearch = buildInvestigatorExplorer(allCases, { query: "warlet", limit: 50 });
  assert.equal(
    supplierSearch.rows.some((row) => row.caseId === "AR-CONTRACT-14-1002-CON21"),
    true,
  );

  const sourceSearch = buildInvestigatorExplorer(allCases, { query: "chilecompra", limit: 50 });
  assert.equal(sourceSearch.rows.every((row) => row.sourceName.toLowerCase().includes("chile")), true);

  const signalSearch = buildInvestigatorExplorer(allCases, { query: "competencia baja", limit: 50 });
  assert.equal(signalSearch.rows.some((row) => row.primarySignal?.code === "single_bidder"), true);
});

test("buildInvestigatorExplorer applies geometry, country, signal, and pivot filters", () => {
  const noGeometry = buildInvestigatorExplorer(allCases, {
    countries: ["PE", "CL"],
    geometry: "without",
    signalCode: "missing_official_geometry",
    limit: 80,
  });

  assert.equal(noGeometry.rows.length > 0, true);
  assert.equal(noGeometry.rows.every((row) => !row.hasOfficialGeometry), true);
  assert.equal(noGeometry.rows.every((row) => row.signalCodes.includes("missing_official_geometry")), true);

  const supplierFacet = buildInvestigatorExplorer(allCases, { query: "warlet", limit: 50 })
    .facets.find((facet) => facet.type === "supplier");

  assert.equal(supplierFacet?.label.includes("WARLET"), true);

  const pivoted = buildInvestigatorExplorer(allCases, {
    entity: supplierFacet ? { type: supplierFacet.type, key: supplierFacet.key } : undefined,
    limit: 50,
  });

  assert.equal(pivoted.activeEntity?.label.includes("WARLET"), true);
  assert.equal(pivoted.rows.length > 0, true);
  assert.equal(pivoted.rows.every((row) => row.entities.supplierKey === supplierFacet?.key), true);
});

test("buildInvestigatorExplorer keeps scanner copy non-accusatory", () => {
  const explorer = buildInvestigatorExplorer(allCases, { limit: 120 });

  assert.doesNotMatch(JSON.stringify(explorer), /corrup|fraude|delito|culpable/i);
});
