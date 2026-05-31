import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import argentinaContractDataset from "../src/data/argentinaContractCases.json" with { type: "json" };
import {
  buildInvestigatorExplorer,
  buildInvestigatorExplorerFromIndex,
  buildInvestigatorExplorerIndex,
  type InvestigatorExplorerCase,
} from "../src/lib/data/investigatorExplorer.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import type { ArgentinaWorkCase } from "../src/lib/data/argentinaWorks.ts";
import type { ArgentinaContractCaseFile } from "../src/lib/data/argentinaContractCases.ts";

const argentinaCases = argentinaDataset.cases as ArgentinaWorkCase[];
const argentinaContractCases = argentinaContractDataset.cases as ArgentinaContractCaseFile[];
const allCases = [...argentinaCases, ...argentinaContractCases] as InvestigatorExplorerCase[];

test("buildInvestigatorExplorer scans map and non-map Argentina cases", () => {
  const explorer = buildInvestigatorExplorer(allCases, { limit: 500 });

  assert.equal(explorer.viewType, "faro_investigator_explorer_v1");
  assert.equal(explorer.stats.totalCases, allCases.length);
  assert.equal(explorer.rows.some((row) => row.countryCode === "AR" && row.hasOfficialGeometry), true);
  assert.equal(explorer.rows.some((row) => row.countryCode === "AR" && !row.hasOfficialGeometry), true);
  assert.equal(explorer.facets.some((facet) => facet.type === "source"), true);
});

test("buildInvestigatorExplorer summary stats count the filtered set, not only shown rows", () => {
  const cases = [
    buildExplorerFixture("AR-CONTRACT-381-1001-CON21", 1),
    buildExplorerFixture("AR-CONTRACT-381-1002-CON21", 2, { coordinates: null }),
    buildExplorerFixture("AR-CONTRACT-381-1003-CON21", 3, { coordinates: null }),
  ] as InvestigatorExplorerCase[];
  const explorer = buildInvestigatorExplorer(cases, { limit: 1 });

  assert.equal(explorer.rows.length, 1);
  assert.equal(explorer.stats.filteredCases, 3);
  assert.equal(explorer.stats.filteredCasesWithoutMapGeometry, 2);
  assert.equal(explorer.stats.filteredCasesWithPrimarySignal, 3);
});

test("buildInvestigatorExplorer searches by supplier, source, record id, and signal", () => {
  const supplierSearch = buildInvestigatorExplorer(allCases, { query: "warlet", limit: 50 });
  assert.equal(
    supplierSearch.rows.some((row) => row.caseId === "AR-CONTRACT-14-1002-CON21"),
    true,
  );

  const sourceSearch = buildInvestigatorExplorer(allCases, { query: "contrat.ar", limit: 50 });
  assert.equal(sourceSearch.rows.every((row) => row.sourceName.toLowerCase().includes("contrat.ar")), true);

  const signalSearch = buildInvestigatorExplorer(allCases, { query: "competencia baja", limit: 50 });
  assert.equal(signalSearch.rows.some((row) => row.primarySignal?.code === "single_bidder"), true);
});

test("buildInvestigatorExplorerFromIndex filters a reusable row index", () => {
  const index = buildInvestigatorExplorerIndex(allCases, { countries: ["AR"] });
  const firstIndexedRow = index.rows[0];
  const supplierSearch = buildInvestigatorExplorerFromIndex(index, { query: "warlet", limit: 50 });
  const sourceSearch = buildInvestigatorExplorerFromIndex(index, { query: "contrat.ar", limit: 50 });

  assert.equal(index.rows.length, allCases.length);
  assert.equal(index.rows[0], firstIndexedRow);
  assert.equal(
    supplierSearch.rows.some((row) => row.caseId === "AR-CONTRACT-14-1002-CON21"),
    true,
  );
  assert.equal(sourceSearch.rows.every((row) => row.sourceName.toLowerCase().includes("contrat.ar")), true);
});

test("buildInvestigatorExplorer searches by official location fields used by suggestions", () => {
  const cases = [
    buildExplorerFixture("AR-CONTRACT-381-1001-CON21", 1, {
      workProvince: "CATAMARCA",
      workDepartment: "BELÉN",
      workLocality: "LONDRES",
    }),
    buildExplorerFixture("AR-CONTRACT-381-1002-CON21", 1, {
      workProvince: "BUENOS AIRES",
      workDepartment: "MERCEDES",
      workLocality: "MERCEDES",
    }),
  ] as InvestigatorExplorerCase[];

  const byProvince = buildInvestigatorExplorer(cases, { query: "CATAMARCA", limit: 20 });
  const byDepartment = buildInvestigatorExplorer(cases, { query: "BELEN", limit: 20 });
  const byLocality = buildInvestigatorExplorer(cases, { query: "LONDRES", limit: 20 });

  assert.deepEqual(byProvince.rows.map((row) => row.caseId), ["AR-CONTRACT-381-1001-CON21"]);
  assert.deepEqual(byDepartment.rows.map((row) => row.caseId), ["AR-CONTRACT-381-1001-CON21"]);
  assert.deepEqual(byLocality.rows.map((row) => row.caseId), ["AR-CONTRACT-381-1001-CON21"]);
});

test("buildInvestigatorExplorer applies geometry, country, signal, and pivot filters", () => {
  const noGeometry = buildInvestigatorExplorer(allCases, {
    countries: ["AR"],
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

test("buildInvestigatorExplorer applies multiple pivot filters grouped by type", () => {
  const cases = [
    buildExplorerFixture("AR-CONTRACT-381-1001-CON21", 1, {
      agencyName: "Agencia Norte",
      supplierName: "Proveedor A",
    }),
    buildExplorerFixture("AR-CONTRACT-381-1002-CON21", 1, {
      agencyName: "Agencia Norte",
      supplierName: "Proveedor B",
    }),
    buildExplorerFixture("AR-CONTRACT-381-1003-CON21", 1, {
      agencyName: "Agencia Sur",
      supplierName: "Proveedor A",
    }),
  ] as InvestigatorExplorerCase[];
  const base = buildInvestigatorExplorer(cases, { limit: 20 });
  const agencyNorte = base.facets.find((facet) => facet.type === "agency" && facet.label === "Agencia Norte");
  const supplierA = base.facets.find((facet) => facet.type === "supplier" && facet.label.includes("Proveedor A"));
  const supplierB = base.facets.find((facet) => facet.type === "supplier" && facet.label.includes("Proveedor B"));

  const filtered = buildInvestigatorExplorer(cases, {
    entities: [
      { type: "agency", key: agencyNorte?.key ?? "" },
      { type: "supplier", key: supplierA?.key ?? "" },
      { type: "supplier", key: supplierB?.key ?? "" },
    ],
    limit: 20,
  });

  assert.deepEqual(
    filtered.rows.map((row) => row.caseId).sort(),
    ["AR-CONTRACT-381-1001-CON21", "AR-CONTRACT-381-1002-CON21"],
  );
  assert.equal(filtered.activeEntities.length, 3);
  assert.equal(filtered.rows.every((row) => row.entities.agencyKey === agencyNorte?.key), true);
});

test("buildInvestigatorExplorer uses the coordinate quality gate for geometry status", () => {
  const placeholderGeometryCase = buildExplorerFixture("AR-CONTRACT-381-1009-CON21", 2, {
    coordinates: { lat: 0, lon: 0 },
  }) as InvestigatorExplorerCase;

  const explorer = buildInvestigatorExplorer([placeholderGeometryCase], {
    geometry: "without",
    limit: 20,
  });

  assert.equal(explorer.rows.length, 1);
  assert.equal(explorer.rows[0]?.hasOfficialGeometry, false);
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

test("buildInvestigatorExplorer scopes supplier recurrence to filtered Argentina rows", () => {
  const scopedCases = [
    buildExplorerFixture("AR-CONTRACT-381-1001-CON21", 1),
    buildExplorerFixture("AR-CONTRACT-381-1002-CON21", 1),
    buildExplorerFixture("AR-CONTRACT-105-1003-CON21", 1, {
      agencyName: "Comision Nacional de Energia Atomica",
      supplierName: "OTRO PROVEEDOR SA",
    }),
  ] as InvestigatorExplorerCase[];

  const explorer = buildInvestigatorExplorer(scopedCases, {
    entities: [{ type: "agency", key: "comision nacional de energia atomica" }],
    limit: 20,
  });

  assert.equal(explorer.rows.length, 1);
  assert.equal(explorer.rows[0]?.countryCode, "AR");
  assert.equal(explorer.rows[0]?.signalCodes.includes("repeat_single_bid_winner"), false);
});

function buildExplorerFixture(
  id: string,
  bidderCount: number,
  overrides: {
    countryCode?: string;
    agencyName?: string;
    coordinates?: { lat: number; lon: number } | null;
    supplierName?: string;
    workProvince?: string;
    workDepartment?: string;
    workLocality?: string;
  } = {},
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
    coordinates: Object.hasOwn(overrides, "coordinates")
      ? overrides.coordinates ?? null
      : { lat: -31.4201, lon: -64.1888 },
    evidenceLevel: "official_dataset",
    amount: { value: 1_000_000, currency: "ARS", label: "monto_contrato" },
    bidderCount,
    offerCount: bidderCount,
    supplierName: overrides.supplierName ?? "ANSAL CONSTRUCCIONES SRL",
    supplierDocument: "30-64071769-2",
    workProvince: overrides.workProvince ?? null,
    workDepartment: overrides.workDepartment ?? null,
    workLocality: overrides.workLocality ?? null,
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
