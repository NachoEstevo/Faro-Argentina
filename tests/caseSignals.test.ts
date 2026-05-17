import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCaseSignalContext,
  buildCaseSignalFeed,
  buildCaseSignals,
  selectLeadCaseSignal,
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
  assert.doesNotMatch(JSON.stringify(signals), /corrupt|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
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

test("buildCaseSignals marks judicial context as official context without map exposure", () => {
  const signals = buildCaseSignals({
    id: "AR-HIST-JUD-CUADERNOS-CAMARITA-COARCO",
    countryCode: "AR",
    caseType: "supplier_judicial_context",
    title: "La Camarita - proveedor mencionado y contrato Faro: COARCO SA",
    workNumber: "CUADERNOS-CAMARITA-COARCO",
    year: 2026,
    procedureNumber: "CFP 13816/2018",
    agencyName: "Tribunal Oral en lo Criminal Federal Nro. 7",
    agencyCode: "TOF7",
    contractingUnit: "Ministerio Publico Fiscal de la Nacion",
    executionTerm: null,
    executionTermType: null,
    coordinates: null,
    evidenceLevel: "official_dataset",
    amount: null,
    supplierName: "COARCO SA",
    supplierDocument: "30-51650063-4",
    judicialStatus: "Mencion en requerimiento MPF; juicio oral en curso.",
    contextSummary: "Fuente judicial oficial con contrato Faro relacionado por proveedor.",
    localMatchStatus: "Match exacto por razon social y CUIT en caso relacionado.",
    relatedCaseIds: ["AR-CONTRACT-451-1003-CON18"],
    relatedReceipts: [receipt],
    receipt,
    caveats: ["Contexto judicial; no afirma nada sobre el contrato relacionado."],
  });

  assert.equal(signals.some((signal) => signal.code === "official_judicial_context"), true);
  assert.equal(signals.some((signal) => signal.code === "missing_official_geometry"), true);
  assert.equal(signals.some((signal) => signal.code === "official_geometry"), false);
  assert.equal(signals.some((signal) => signal.code === "sentinel_candidate"), false);
  assert.equal(
    signals.find((signal) => signal.code === "official_judicial_context")?.leadEligible,
    true,
  );
  assert.doesNotMatch(JSON.stringify(signals), /corrupt|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
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
  assert.doesNotMatch(JSON.stringify(signals), /corrupt|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
});

test("buildCaseSignals labels administrative centroids without implying exact site geometry", () => {
  const signals = buildCaseSignals({
    id: "PE-CONTRACT-2328678-1",
    countryCode: "PE",
    title: "Servicio en Bagua",
    caseType: "procurement_contract",
    year: 2025,
    coordinates: { lat: -5.613, lon: -78.434 },
    geoEvidence: [
      {
        precision: "official_admin_centroid",
        granularity: "district",
        label: "LA PECA / BAGUA / AMAZONAS",
        sourceId: "PE-IDEP-LIMITE-DISTRITAL",
        sourceField: "descripcion_proceso",
        method: "official_text_admin_catalog_match",
        confidence: "medium",
        coordinates: { lat: -5.613, lon: -78.434 },
        exposeOnMap: true,
        satelliteEligible: false,
        caveat: "Centroide administrativo oficial; no es sitio exacto de ejecucion.",
      },
    ],
    receipt: {
      sourceId: "PE-OECE-CONTRATOS",
      sourceName: "OECE contratos",
      sourceUrl: "https://example.test",
    },
  });

  const geometry = signals.find((signal) => signal.code === "official_geometry");

  assert.equal(geometry?.label, "Referencia territorial validada");
  assert.match(geometry?.caveat ?? "", /no es sitio exacto/i);
  assert.equal(signals.some((signal) => signal.code === "sentinel_candidate"), false);
});

test("buildCaseSignals keeps map and satellite capability out of lead selection", () => {
  const signals = buildCaseSignals({
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
  });

  const officialGeometry = signals.find((signal) => signal.code === "official_geometry");
  const sentinelCandidate = signals.find((signal) => signal.code === "sentinel_candidate");

  assert.equal(officialGeometry?.displayGroup, "capability");
  assert.equal(officialGeometry?.leadEligible, false);
  assert.equal(sentinelCandidate?.displayGroup, "capability");
  assert.equal(sentinelCandidate?.leadEligible, false);
  assert.equal(selectLeadCaseSignal(signals), null);
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

test("buildCaseSignals uses collection context to surface recurring low-competition winners", () => {
  const repeatedCases = [
    buildSignalFixture({
      id: "AR-CONTRACT-381-1001-CON21",
      agencyName: "Estado Mayor General de La Fuerza Aerea",
      supplierName: "ANSAL CONSTRUCCIONES SRL",
      supplierDocument: "30-64071769-2",
      bidderCount: 1,
      amountValue: 4_014_549,
    }),
    buildSignalFixture({
      id: "AR-CONTRACT-381-1002-CON21",
      agencyName: "Estado Mayor General de La Fuerza Aerea",
      supplierName: "ANSAL CONSTRUCCIONES SRL",
      supplierDocument: "30-64071769-2",
      bidderCount: 1,
      amountValue: 9_500_000,
    }),
    buildSignalFixture({
      id: "AR-CONTRACT-381-1003-CON21",
      agencyName: "Estado Mayor General de La Fuerza Aerea",
      supplierName: "ANSAL CONSTRUCCIONES SRL",
      supplierDocument: "30-64071769-2",
      bidderCount: 2,
      amountValue: 12_000_000,
    }),
    buildSignalFixture({
      id: "AR-CONTRACT-105-1004-CON21",
      agencyName: "Comision Nacional de Energia Atomica",
      supplierName: "OTRO PROVEEDOR SA",
      supplierDocument: "30-11111111-1",
      bidderCount: 5,
      amountValue: 800_000,
    }),
  ];
  const context = buildCaseSignalContext(repeatedCases);

  const signals = buildCaseSignals(repeatedCases[0], context);

  assert.equal(signals.some((signal) => signal.code === "repeat_single_bid_winner"), true);
  assert.equal(signals.some((signal) => signal.code === "recurring_supplier_agency"), true);
  assert.equal(signals.some((signal) => signal.code === "supplier_concentration"), true);
  assert.equal(signals.find((signal) => signal.code === "repeat_single_bid_winner")?.family, "supplier");
  assert.equal(signals.find((signal) => signal.code === "repeat_single_bid_winner")?.confidence, "medium");
  assert.doesNotMatch(JSON.stringify(signals), /corrup|fraude|delito|culpable|estafa|abuso|favorit|incumpl|irregular/i);
});

test("buildCaseSignals marks missing amounts and possible supplier aliases as reviewable gaps", () => {
  const aliasCases = [
    buildSignalFixture({
      id: "AR-CONTRACT-14-0001-CON22",
      supplierName: "OBRAS DEL SUR S.A.",
      supplierDocument: null,
      bidderCount: 3,
      amountValue: null,
    }),
    buildSignalFixture({
      id: "AR-CONTRACT-14-0002-CON22",
      supplierName: "OBRAS DEL SUR SRL",
      supplierDocument: null,
      bidderCount: 2,
      amountValue: 1_000_000,
    }),
  ];
  const context = buildCaseSignalContext(aliasCases);

  const signals = buildCaseSignals(aliasCases[0], context);

  assert.equal(signals.some((signal) => signal.code === "missing_amount"), true);
  assert.equal(signals.some((signal) => signal.code === "possible_supplier_alias"), true);
  assert.equal(signals.find((signal) => signal.code === "missing_amount")?.family, "data_gap");
  assert.equal(signals.find((signal) => signal.code === "possible_supplier_alias")?.confidence, "low");
});

test("buildCaseSignals lowers recurrence confidence when supplier identity is name-only", () => {
  const repeatedCases = [
    buildSignalFixture({
      id: "AR-CONTRACT-14-2001-CON21",
      supplierName: "OBRAS DEL SUR S.A.",
      supplierDocument: null,
      bidderCount: 1,
      amountValue: 1_000_000,
    }),
    buildSignalFixture({
      id: "AR-CONTRACT-14-2002-CON21",
      supplierName: "OBRAS DEL SUR SRL",
      supplierDocument: null,
      bidderCount: 1,
      amountValue: 2_000_000,
    }),
  ];

  const context = buildCaseSignalContext(repeatedCases);
  const signals = buildCaseSignals(repeatedCases[0], context);
  const recurrence = signals.find((signal) => signal.code === "repeat_single_bid_winner");

  assert.equal(recurrence?.confidence, "low");
  assert.match(recurrence?.caveat ?? "", /nombre normalizado/);
});

function buildSignalFixture(overrides: {
  id: string;
  agencyName?: string;
  supplierName?: string | null;
  supplierDocument?: string | null;
  bidderCount?: number | null;
  amountValue?: number | null;
}) {
  return {
    id: overrides.id,
    countryCode: "AR",
    caseType: "procurement_contract",
    title: `Contrato ${overrides.id}`,
    workNumber: overrides.id.replace("AR-CONTRACT-", ""),
    year: 2021,
    procedureNumber: "381-0001-LPU21",
    agencyName: overrides.agencyName ?? "Estado Mayor General de La Fuerza Aerea",
    agencyCode: "381",
    contractingUnit: "Compras",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -31.4201, lon: -64.1888 },
    evidenceLevel: "official_dataset",
    amount: overrides.amountValue === null
      ? null
      : { value: overrides.amountValue ?? 1_000_000, currency: "ARS", label: "monto_contrato" },
    bidderCount: overrides.bidderCount ?? 1,
    offerCount: overrides.bidderCount ?? 1,
    supplierName: "supplierName" in overrides ? overrides.supplierName : "ANSAL CONSTRUCCIONES SRL",
    supplierDocument: "supplierDocument" in overrides ? overrides.supplierDocument : "30-64071769-2",
    receipt,
    caveats: ["Contrato oficial; no prueba pagos por si solo."],
  };
}
