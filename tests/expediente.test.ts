import test from "node:test";
import assert from "node:assert/strict";

import { buildExpediente, type ExpedienteCaseFile } from "../src/lib/data/expediente.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import type { SignalCaseFile } from "../src/lib/data/caseSignals.ts";

const primaryReceipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "14-1002-CON21",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "expediente-test@1",
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
  parserVersion: "expediente-test@1",
  row: { contrato_numero: "14-1002-CON21", oferta: "1" },
});

test("buildExpediente creates a procurement contract expediente from official receipts", () => {
  const caseFile: ExpedienteCaseFile = {
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
    amount: { value: 120, currency: "ARS", label: "ARS 120" },
    officialBudget: { value: 100, currency: "ARS", label: "ARS 100" },
    bidderCount: 1,
    offerCount: 1,
    supplierName: "Proveedor de prueba",
    supplierDocument: "30-70043585-3",
    relatedReceipts: [relatedReceipt],
    receipt: primaryReceipt,
    caveats: ["Contrato oficial; no prueba pagos por si solo."],
  };

  const expediente = buildExpediente(caseFile);

  assert.equal(expediente.expedienteType, "faro_expediente_v1");
  assert.equal(expediente.summary.caseId, "AR-CONTRACT-14-1002-CON21");
  assert.match(expediente.summary.plainSummary, /Contrato/);
  assert.equal(expediente.whyItAppeared.length > 0, true);
  assert.equal(expediente.officialTrail.primary.locator.label, "Dataset oficial");
  assert.equal(expediente.officialTrail.related.length, 1);
  assert.equal(expediente.officialTrail.related[0]?.sourceId, "AR-CONTRATAR-OFERTAS");
  assert.equal(expediente.actions.downloadEvidenceHref, "/api/export/AR-CONTRACT-14-1002-CON21");
  assert.equal(expediente.actions.caseJsonHref, "/api/cases/AR-CONTRACT-14-1002-CON21");
  assert.equal(expediente.nextVerification.length > 0, true);
});

test("buildExpediente marks cases without coordinates as missing official geometry", () => {
  const expediente = buildExpediente({
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
    amount: { value: 113868.79, currency: "PEN", label: "PEN 113.868,79" },
    supplierName: null,
    supplierDocument: "20487924050",
    receipt: primaryReceipt,
    caveats: ["Contrato oficial; falta geometria oficial para mapa."],
  });

  assert.equal(expediente.summary.locationLabel, "Sin geometria oficial");
  assert.equal(
    expediente.whyItAppeared.some((signal) => signal.code === "missing_official_geometry"),
    true,
  );
});

const minimalSignalCaseFile: SignalCaseFile = {
  id: "AR-MINIMAL-1",
  countryCode: "AR",
  title: "Caso minimo",
  receipt: {
    sourceId: "AR-MINIMAL",
    sourceName: "Fuente minima",
    sourceUrl: "https://example.test/source",
  },
  relatedReceipts: [{ sourceId: "AR-RELATED-MINIMAL" }],
};

const minimalRelatedReceiptCaseFile: SignalCaseFile = {
  id: "AR-MINIMAL-RELATED-1",
  countryCode: "AR",
  title: "Caso con receipt primario completo",
  receipt: primaryReceipt,
  relatedReceipts: [{ sourceId: "AR-RELATED-MINIMAL" }],
};

if (false) {
  // @ts-expect-error buildExpediente requires full EvidenceReceipt metadata for reproducible official trail entries.
  buildExpediente(minimalSignalCaseFile);

  // @ts-expect-error buildExpediente requires full EvidenceReceipt metadata for related receipts too.
  buildExpediente(minimalRelatedReceiptCaseFile);
}
