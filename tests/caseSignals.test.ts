import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCaseSignalFeed,
  buildCaseSignals,
} from "../src/lib/data/caseSignals.ts";
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
  parserVersion: "case-signals-test@1",
  row: { contrato_numero: "14-1002-CON21" },
});

test("buildCaseSignals explains why a low-competition contract is worth reviewing", () => {
  const signals = buildCaseSignals({
    id: "AR-CONTRACT-14-1002-CON21",
    countryCode: "AR",
    caseType: "procurement_contract",
    title: "Construccion de puente",
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
  });

  assert.equal(signals[0]?.code, "single_bidder");
  assert.match(signals[0]?.summary ?? "", /1 oferente/);
  assert.equal(signals.some((signal) => signal.code === "amount_over_official_budget"), true);
  assert.equal(signals.some((signal) => signal.code === "sentinel_candidate"), true);
  assert.doesNotMatch(JSON.stringify(signals), /corrupt|fraude|delito|culpable/i);
});

test("buildCaseSignals surfaces evidence gaps instead of inventing map context", () => {
  const signals = buildCaseSignals({
    id: "PE-CONTRACT-2328678-1",
    countryCode: "PE",
    caseType: "procurement_contract",
    title: "Contratacion de maquinaria pesada",
    workNumber: "2328678-1",
    year: 2025,
    procedureNumber: "1122118",
    agencyName: "Gobierno Regional de Amazonas",
    agencyCode: "010373",
    contractingUnit: "ORDEN DE SERVICIO N. 373",
    executionTerm: "2025-06-03 - 2025-06-11",
    executionTermType: "vigencia_contractual",
    coordinates: null,
    evidenceLevel: "official_dataset",
    amount: { value: 113868.79, currency: "PEN", label: "monto_contratado" },
    supplierName: null,
    supplierDocument: "20487924050",
    receipt,
    caveats: ["Contrato oficial; falta geometria oficial para mapa."],
  });

  assert.equal(signals.some((signal) => signal.code === "missing_official_geometry"), true);
  assert.equal(signals.some((signal) => signal.code === "payment_verification_gap"), true);
});

test("buildCaseSignals does not treat invalid coordinates as official geometry", () => {
  const signals = buildCaseSignals({
    id: "AR-WORK-BAD-GEO",
    countryCode: "AR",
    caseType: "public_work",
    title: "Obra con coordenada sospechosa",
    workNumber: "46/8-0004-OBR20",
    year: 2020,
    procedureNumber: "46/8-0072-LPU19",
    agencyName: "Direccion Nacional de Vialidad",
    agencyCode: "604",
    contractingUnit: "8 La Rioja - DNV",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: 30.6297222, lon: 66.2694444 },
    evidenceLevel: "official_dataset",
    receipt,
    caveats: ["Coordenada declarada por fuente oficial; requiere QA geografico."],
  });

  assert.equal(signals.some((signal) => signal.code === "official_geometry"), false);
  assert.equal(signals.some((signal) => signal.code === "sentinel_candidate"), false);
  assert.equal(signals.some((signal) => signal.code === "geometry_needs_review"), true);
  assert.doesNotMatch(JSON.stringify(signals), /corrupt|fraude|delito|culpable/i);
});

test("buildCaseSignalFeed ranks concrete review leads across cases", () => {
  const feed = buildCaseSignalFeed([
    {
      id: "CL-TENDER-1002-53-LP26",
      countryCode: "CL",
      caseType: "procurement_process",
      title: "Convenio mantenimiento",
      workNumber: "1002-53-LP26",
      year: 2026,
      procedureNumber: "1002-53-LP26",
      agencyName: "Ministerio de Obras Publicas",
      agencyCode: "7248",
      contractingUnit: "Direccion de Vialidad",
      executionTerm: null,
      executionTermType: null,
      coordinates: null,
      evidenceLevel: "official_dataset",
      amount: { value: 1000, currency: "CLP", label: "monto_adjudicado_item_sum" },
      supplierName: "Proveedor adjudicado",
      supplierDocument: "78.047.617-6",
      bidderCount: 13,
      claimCount: 211,
      awardActUrl: "https://www.mercadopublico.cl/award-act",
      receipt,
      caveats: ["Licitacion oficial; no prueba pago efectivo."],
    },
  ]);

  assert.equal(feed.stats.cases, 1);
  assert.equal(feed.stats.signals > 0, true);
  assert.equal(feed.signals[0]?.caseId, "CL-TENDER-1002-53-LP26");
  assert.equal(feed.signals[0]?.code, "high_claim_volume");
  assert.equal(feed.signals.some((signal) => signal.code === "official_award_act"), true);
});
