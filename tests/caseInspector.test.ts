import test from "node:test";
import assert from "node:assert/strict";

import { buildCaseSignalContext } from "../src/lib/data/caseSignals.ts";
import { buildCaseInspector } from "../src/lib/data/caseInspector.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import type { ExpedienteCaseFile } from "../src/lib/data/expediente.ts";

const primaryReceipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "14-1002-CON21",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "case-inspector-test@1",
  row: { contrato_numero: "14-1002-CON21" },
});

const relatedReceipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-OFERTAS",
  sourceName: "CONTRAT.AR ofertas",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.3/download/onc-contratar-ofertas.csv",
  rawPath: "data/official/ar/onc-contratar-ofertas.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "14-1002-CON21-OFER-1",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "case-inspector-test@1",
  row: { contrato_numero: "14-1002-CON21", oferta: "1" },
});

const caseFile: ExpedienteCaseFile = {
  id: "AR-CONTRACT-40/31-1003-CON21",
  countryCode: "AR",
  caseType: "procurement_contract",
  title: "Reparacion parcial edificio",
  workNumber: "40/31-1003-CON21",
  year: 2021,
  procedureNumber: "40/31-0054-LPU21",
  agencyName: "Estado Mayor General de La Fuerza Aerea",
  agencyCode: "381",
  contractingUnit: "OUC INFRA",
  executionTerm: null,
  executionTermType: null,
  coordinates: { lat: -31.4201, lon: -64.1888 },
  evidenceLevel: "official_dataset",
  amount: { value: 4014549.87, currency: "ARS", label: "ARS 4.014.549,87" },
  officialBudget: null,
  bidderCount: 1,
  offerCount: 1,
  supplierName: "ANSAL CONSTRUCCIONES SRL",
  supplierDocument: "30-64071769-2",
  relatedReceipts: [relatedReceipt],
  receipt: primaryReceipt,
  caveats: ["Contrato oficial; no prueba pagos por si solo."],
};

test("buildCaseInspector creates a compact inspector for scanner selection", () => {
  const inspector = buildCaseInspector(caseFile);

  assert.equal(inspector.inspectorType, "faro_case_inspector_v1");
  assert.equal(inspector.caseId, "AR-CONTRACT-40/31-1003-CON21");
  assert.equal(inspector.title, "Reparacion parcial edificio");
  assert.equal(inspector.kicker, "AR / Contrato");
  assert.equal(inspector.facts.length, 4);
  assert.deepEqual(
    inspector.facts.map((fact) => fact.label),
    ["Organismo", "Proveedor", "Monto", "Rastro"],
  );
  assert.equal(inspector.primarySignal?.code, "single_bidder");
  assert.equal(inspector.officialTrail.relatedCount, 1);
  assert.equal(inspector.officialTrail.locatorLabel, "Dataset oficial");
});

test("buildCaseInspector keeps actions encoded and points to full expediente", () => {
  const inspector = buildCaseInspector(caseFile);

  assert.equal(
    inspector.actions.downloadEvidenceHref,
    "/api/export/AR-CONTRACT-40%2F31-1003-CON21",
  );
  assert.equal(
    inspector.actions.caseJsonHref,
    "/api/cases/AR-CONTRACT-40%2F31-1003-CON21",
  );
  assert.equal(inspector.actions.canOpenFullExpediente, true);
});

test("buildCaseInspector keeps compact copy non-accusatory", () => {
  const inspector = buildCaseInspector(caseFile);

  assert.doesNotMatch(JSON.stringify(inspector), /corrup|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
});

test("buildCaseInspector can prioritize contextual supplier signals", () => {
  const relatedCases = [
    caseFile,
    { ...caseFile, id: "AR-CONTRACT-40/31-1004-CON21", workNumber: "40/31-1004-CON21" },
    { ...caseFile, id: "AR-CONTRACT-40/31-1005-CON21", workNumber: "40/31-1005-CON21", bidderCount: 2 },
  ];
  const context = buildCaseSignalContext(relatedCases);

  const inspector = buildCaseInspector(caseFile, context);

  assert.equal(inspector.primarySignal?.code, "repeat_single_bid_winner");
  assert.match(inspector.summary, /Contrato/);
  assert.match(inspector.nextAction, /pliegos|oferentes|contratos/i);
});
