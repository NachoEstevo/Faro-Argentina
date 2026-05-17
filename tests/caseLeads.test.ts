import test from "node:test";
import assert from "node:assert/strict";

import { buildCaseLeads } from "../src/lib/data/caseLeads.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";

const receipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "14-1002-CON21",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "case-leads-test@1",
  row: { contrato_numero: "14-1002-CON21" },
});

const highPriorityCase = {
  id: "AR-CONTRACT-14-1002-CON21",
  countryCode: "AR",
  caseType: "procurement_contract",
  title: "Construccion de cubierta metalica",
  workNumber: "14-1002-CON21",
  year: 2021,
  procedureNumber: "14-0007-LPU20",
  agencyName: "Comision Nacional de Energia Atomica",
  agencyCode: "105",
  contractingUnit: "Compras CNEA",
  executionTerm: null,
  executionTermType: null,
  coordinates: { lat: -34.585722, lon: -58.389361 },
  evidenceLevel: "official_dataset",
  amount: { value: 120, currency: "ARS", label: "monto_contrato" },
  officialBudget: { value: 100, currency: "ARS", label: "presupuesto_oficial" },
  bidderCount: 1,
  offerCount: 1,
  supplierName: "Proveedor de prueba",
  supplierDocument: "30-70043585-3",
  relatedReceipts: [receipt],
  receipt,
  caveats: ["Contrato oficial; no prueba pagos por si solo."],
};

const lowerPriorityCase = {
  ...highPriorityCase,
  id: "CL-TENDER-1002-53-LP26",
  countryCode: "CL",
  title: "Convenio mantenimiento",
  coordinates: null,
  amount: { value: 1000, currency: "CLP", label: "monto_adjudicado_item_sum" },
  officialBudget: undefined,
  bidderCount: 13,
  claimCount: 12,
  awardActUrl: "https://www.mercadopublico.cl/award-act",
  supplierName: "Proveedor adjudicado",
  supplierDocument: "78.047.617-6",
  caveats: ["Adjudicacion oficial; no prueba pago efectivo."],
};

test("buildCaseLeads returns one prioritized lead per case", () => {
  const leads = buildCaseLeads([lowerPriorityCase, highPriorityCase], { limit: 10 });

  assert.equal(leads.length, 2);
  assert.equal(leads[0]?.caseId, "AR-CONTRACT-14-1002-CON21");
  assert.equal(leads[0]?.leadId, "AR-CONTRACT-14-1002-CON21-single_bidder");
  assert.equal(leads[0]?.primarySignal.code, "single_bidder");
  assert.equal(
    leads[0]?.sortScore,
    (leads[0]?.primarySignal.priority ?? 0) * 100 + Math.min(leads[0]?.signalCount ?? 0, 20),
  );
  assert.equal(leads[0]?.countryCode, "AR");
  assert.equal(leads[0]?.sourceId, "AR-CONTRATAR-CONTRATOS");
  assert.match(leads[0]?.why ?? "", /Competencia baja/);
  assert.match(leads[0]?.nextAction ?? "", /Abrir actas/);
});

test("buildCaseLeads supports country and query filters", () => {
  const leads = buildCaseLeads([lowerPriorityCase, highPriorityCase], {
    countryCode: "CL",
    query: "mantenimiento",
    limit: 10,
  });

  assert.equal(leads.length, 1);
  assert.equal(leads[0]?.caseId, "CL-TENDER-1002-53-LP26");
});

test("buildCaseLeads does not match nullish optional fields as query text", () => {
  const sparseCase = {
    id: "AR-SPARSE-1",
    countryCode: "AR",
    title: "Caso con campos faltantes",
    bidderCount: 2,
    supplierName: null,
    receipt,
    caveats: [],
  };

  assert.equal(buildCaseLeads([sparseCase], { query: "undefined", limit: 10 }).length, 0);
  assert.equal(buildCaseLeads([sparseCase], { query: "null", limit: 10 }).length, 0);
});

test("buildCaseLeads avoids accusation language", () => {
  const leads = buildCaseLeads([highPriorityCase], { limit: 10 });

  assert.doesNotMatch(JSON.stringify(leads), /corrup|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
});
