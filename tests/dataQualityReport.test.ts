import test from "node:test";
import assert from "node:assert/strict";

import { buildDataQualityReport } from "../src/lib/data/dataQualityReport.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";

const receipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://datos.gob.ar",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-source",
  recordId: "14-1002-CON21",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "quality-test@1",
  row: { contrato_numero: "14-1002-CON21" },
});

test("buildDataQualityReport summarizes country readiness without hiding gaps", () => {
  const report = buildDataQualityReport({
    generatedAt: "2026-05-17T00:00:00.000Z",
    verification: {
      checkedDatasets: 1,
      checkedCases: 2,
      checkedReceipts: 2,
      checkedRawFiles: 1,
      errors: [],
    },
    datasets: [{
      source: { sourceId: "AR-CONTRATAR-CONTRATOS" },
      stats: { rawRows: 2, caseFiles: 2, mapReadyCases: 1 },
      cases: [
        {
          id: "AR-CONTRACT-14-1002-CON21",
          countryCode: "AR",
          caseType: "procurement_contract",
          title: "Contrato con competencia baja",
          year: 2021,
          workNumber: "14-1002-CON21",
          procedureNumber: "14-0007-LPU20",
          agencyName: "Comision Nacional de Energia Atomica",
          coordinates: { lat: -34.58, lon: -58.38 },
          amount: { value: 100, currency: "ARS", label: "monto_contrato" },
          bidderCount: 1,
          supplierName: "Proveedor SA",
          supplierDocument: "30-70043585-3",
          receipt,
          caveats: ["Contrato oficial; falta pago."],
        },
        {
          id: "AR-CONTRACT-14-1003-CON21",
          countryCode: "AR",
          caseType: "procurement_contract",
          title: "Contrato sin monto",
          year: 2021,
          workNumber: "14-1003-CON21",
          procedureNumber: "14-0008-LPU20",
          agencyName: "Comision Nacional de Energia Atomica",
          coordinates: null,
          amount: null,
          bidderCount: null,
          supplierName: null,
          supplierDocument: null,
          receipt,
          caveats: ["Contrato oficial; falta monto."],
        },
      ],
    }],
  });

  assert.equal(report.verification.errors, 0);
  assert.equal(report.totals.cases, 2);
  assert.equal(report.byCountry.AR.cases, 2);
  assert.equal(report.byCountry.AR.withAmount, 1);
  assert.equal(report.byCountry.AR.withSupplierDocument, 1);
  assert.equal(report.byCountry.AR.withMapEligibleGeometry, 1);
  assert.equal(report.byCountry.AR.withLeadEligibleSignal, 2);
  assert.equal(report.byCountry.AR.signals.single_bidder, 1);
  assert.equal(report.byCountry.AR.signals.missing_amount, 1);
});

test("buildDataQualityReport keeps verification failures visible as blockers", () => {
  const report = buildDataQualityReport({
    generatedAt: "2026-05-17T00:00:00.000Z",
    verification: {
      checkedDatasets: 1,
      checkedCases: 1,
      checkedReceipts: 1,
      checkedRawFiles: 1,
      errors: ["AR-CONTRATAR-CONTRATOS: raw file hash mismatch"],
    },
    datasets: [{
      source: { sourceId: "AR-CONTRATAR-CONTRATOS" },
      stats: { rawRows: 1, caseFiles: 0, mapReadyCases: 0 },
      cases: [],
    }],
  });

  assert.equal(report.verification.errors, 1);
  assert.deepEqual(report.blockers, [
    "Data spine has 1 verification error(s). Fix receipts and raw hashes before expanding data.",
  ]);
});

test("buildDataQualityReport counts collection-aware supplier signals", () => {
  const report = buildDataQualityReport({
    generatedAt: "2026-05-17T00:00:00.000Z",
    verification: {
      checkedDatasets: 1,
      checkedCases: 3,
      checkedReceipts: 3,
      checkedRawFiles: 1,
      errors: [],
    },
    datasets: [{
      source: { sourceId: "AR-CONTRATAR-CONTRATOS" },
      stats: { rawRows: 3, caseFiles: 3, mapReadyCases: 0 },
      cases: [1, 2, 3].map((index) => ({
        id: `AR-CONTRACT-381-100${index}-CON21`,
        countryCode: "AR",
        caseType: "procurement_contract",
        title: `Contrato recurrente ${index}`,
        year: 2021,
        workNumber: `381-100${index}-CON21`,
        procedureNumber: "381-0001-LPU21",
        agencyName: "Estado Mayor General de La Fuerza Aerea",
        coordinates: null,
        amount: { value: 1000 * index, currency: "ARS", label: "monto_contrato" },
        bidderCount: 1,
        supplierName: "ANSAL CONSTRUCCIONES SRL",
        supplierDocument: "30-64071769-2",
        receipt,
        caveats: ["Contrato oficial; falta pago."],
      })),
    }],
  });

  assert.equal(report.byCountry.AR.signals.repeat_single_bid_winner, 3);
  assert.equal(report.byCountry.AR.signals.recurring_supplier_agency, 3);
  assert.equal(report.byCountry.AR.signals.supplier_concentration, 3);
  assert.equal(report.byCountry.AR.withLeadEligibleSignal, 3);
});
