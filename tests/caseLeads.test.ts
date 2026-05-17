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

test("buildCaseLeads does not promote geometry or satellite capability as an investigation lead", () => {
  const geometryOnlyCase = {
    id: "AR-WORK-604-0001-OBR21",
    countryCode: "AR",
    caseType: "public_work",
    title: "Obra vial con geometria oficial",
    workNumber: "604-0001-OBR21",
    year: 2021,
    procedureNumber: "604-0001-LPU21",
    agencyName: "Direccion Nacional de Vialidad",
    agencyCode: "604",
    contractingUnit: "DNV",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -34.585722, lon: -58.389361 },
    evidenceLevel: "official_dataset",
    receipt,
    caveats: ["Obra oficial; falta cruzar pagos y avance."],
  };

  const leads = buildCaseLeads([geometryOnlyCase], { limit: 10 });

  assert.equal(leads.length, 0);
});

test("buildCaseLeads exposes official judicial context as a review lead", () => {
  const judicialReceipt = createEvidenceReceipt({
    sourceId: "AR-CIJ-VIALIDAD-VEREDICTO",
    sourceName: "CIJ Causa Vialidad",
    sourceUrl: "https://www.cij.gov.ar/login/d/sentencia.pdf",
    rawPath: "data/official/ar/cij-vialidad-context.json",
    snapshotHash: "sha256-judicial",
    recordId: "VIALIDAD-CFP-5048-SENTENCIA-FIRME",
    locatorType: "official_detail",
    extractedAt: "2026-05-16T00:00:00.000Z",
    parserVersion: "case-leads-test@1",
    row: { recordId: "VIALIDAD-CFP-5048-SENTENCIA-FIRME" },
  });
  const judicialCase = {
    id: "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME",
    countryCode: "AR",
    caseType: "judicial_context",
    title: "Causa Vialidad CFP 5048/2016/TO1",
    workNumber: "VIALIDAD-CFP-5048-SENTENCIA-FIRME",
    year: 2025,
    procedureNumber: "CFP 5048/2016/TO1",
    agencyName: "Tribunal Oral en lo Criminal Federal Nro. 2",
    agencyCode: "TOF2",
    contractingUnit: "Poder Judicial de la Nacion",
    coordinates: null,
    evidenceLevel: "official_dataset",
    amount: { value: 46_000_000_000, currency: "ARS", label: "monto contextual informado por MPF" },
    supplierName: "Grupo Baez",
    supplierDocument: null,
    judicialStatus: "Sentencia firme desde 2025-06-10.",
    contextSummary: "El Poder Judicial y el MPF documentan la Causa Vialidad.",
    receipt: judicialReceipt,
    caveats: ["Contexto judicial; abrir la fuente antes de citar."],
  };

  const leads = buildCaseLeads([judicialCase], { query: "baez", limit: 10 });

  assert.equal(leads.length, 1);
  assert.equal(leads[0]?.caseId, "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME");
  assert.equal(leads[0]?.primarySignal.code, "official_judicial_context");
  assert.equal(leads[0]?.primarySignal.kind, "context");
});

test("buildCaseLeads avoids accusation language", () => {
  const leads = buildCaseLeads([highPriorityCase], { limit: 10 });

  assert.doesNotMatch(JSON.stringify(leads), /corrup|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
});
