import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import {
  buildInvestigatorExplorer,
  type InvestigatorExplorerCase,
} from "../src/lib/data/investigatorExplorer.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
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

  assert.doesNotMatch(JSON.stringify(explorer), /corrup|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
});

test("buildInvestigatorExplorer keeps ubiquitous capability signals out of default signal pivots", () => {
  const explorer = buildInvestigatorExplorer(allCases, { limit: 500 });

  assert.equal(
    explorer.facets.some((facet) =>
      facet.type === "signal" &&
      ["official_geometry", "sentinel_candidate", "supplier_identified", "payment_verification_gap"].includes(facet.key)
    ),
    false,
  );
  assert.equal(
    explorer.rows.some((row) => row.signalCodes.includes("sentinel_candidate")),
    true,
  );
});

test("buildInvestigatorExplorer leaves cases without lead-eligible signals navigable but not primary-ranked", () => {
  const contextOnlyCase = buildExplorerFixture("AR-CONTRACT-381-1004-CON21", 5) as InvestigatorExplorerCase;
  const explorer = buildInvestigatorExplorer([contextOnlyCase], { limit: 20 });
  const row = explorer.rows[0];

  assert.equal(row?.primarySignal, null);
  assert.equal(row?.signalCodes.includes("payment_verification_gap"), true);
  assert.equal(row?.signalCodes.includes("sentinel_candidate"), true);
  assert.equal(explorer.facets.some((facet) => facet.type === "signal"), false);
});

test("buildInvestigatorExplorer exposes collection-aware supplier signals as searchable facets", () => {
  const recurringCases = [
    buildExplorerFixture("AR-CONTRACT-381-1001-CON21", 1),
    buildExplorerFixture("AR-CONTRACT-381-1002-CON21", 1),
    buildExplorerFixture("AR-CONTRACT-381-1003-CON21", 2),
  ] as InvestigatorExplorerCase[];

  const explorer = buildInvestigatorExplorer(recurringCases, {
    signalCode: "repeat_single_bid_winner",
    limit: 20,
  });

  assert.equal(explorer.rows.length, 3);
  assert.equal(explorer.rows.every((row) => row.signalCodes.includes("repeat_single_bid_winner")), true);
  assert.equal(
    explorer.facets.some((facet) => facet.type === "signal" && facet.key === "recurring_supplier_agency"),
    true,
  );

  const search = buildInvestigatorExplorer(recurringCases, { query: "ganador recurrente", limit: 20 });
  assert.equal(search.rows.some((row) => row.primarySignal?.code === "repeat_single_bid_winner"), true);
});

test("buildInvestigatorExplorer scopes supplier recurrence by filtered country", () => {
  const mixedCountryCases = [
    buildExplorerFixture("AR-CONTRACT-381-1001-CON21", 1),
    buildExplorerFixture("AR-CONTRACT-381-1002-CON21", 1),
    buildExplorerFixture("PE-CONTRACT-381-1003-CON21", 1, { countryCode: "PE" }),
  ] as InvestigatorExplorerCase[];

  const explorer = buildInvestigatorExplorer(mixedCountryCases, { countries: ["PE"], limit: 20 });

  assert.equal(explorer.rows.length, 1);
  assert.equal(explorer.rows[0]?.countryCode, "PE");
  assert.equal(explorer.rows[0]?.signalCodes.includes("repeat_single_bid_winner"), false);
});

function buildExplorerFixture(
  id: string,
  bidderCount: number,
  overrides: Partial<Pick<InvestigatorExplorerCase, "countryCode" | "agencyName">> = {},
) {
  return {
    id,
    countryCode: overrides.countryCode ?? "AR",
    caseType: "procurement_contract",
    title: `Contrato ${id}`,
    workNumber: id.replace("AR-CONTRACT-", ""),
    year: 2021,
    procedureNumber: "381-0001-LPU21",
    agencyName: overrides.agencyName ?? "Estado Mayor General de La Fuerza Aerea",
    agencyCode: "381",
    contractingUnit: "Compras",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -31.4201, lon: -64.1888 },
    evidenceLevel: "official_dataset",
    amount: { value: 1_000_000, currency: "ARS", label: "monto_contrato" },
    bidderCount,
    offerCount: bidderCount,
    supplierName: "ANSAL CONSTRUCCIONES SRL",
    supplierDocument: "30-64071769-2",
    receipt: createEvidenceReceipt({
      sourceId: "AR-CONTRATAR-CONTRATOS",
      sourceName: "CONTRAT.AR contratos",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
      rawPath: "data/official/ar/onc-contratar-contratos.csv",
      snapshotHash: "sha256-snapshot",
      recordId: id,
      locatorType: "official_dataset",
      extractedAt: "2026-05-16T00:00:00.000Z",
      parserVersion: "investigator-explorer-test@1",
      row: { contrato_numero: id },
    }),
    caveats: ["Contrato oficial; no prueba pagos por si solo."],
  };
}
