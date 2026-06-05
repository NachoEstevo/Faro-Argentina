import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEvidenceClaimMatrix,
  type EvidenceClaimCode,
} from "../src/lib/data/evidenceClaimMatrix.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import type { ExpedienteCaseFile } from "../src/lib/data/expediente.ts";

const receipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "46-0453-CON22",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "claim-matrix-test@1",
  row: { contrato_numero: "46-0453-CON22" },
});

test("buildEvidenceClaimMatrix distinguishes supported contract facts from unsupported provider payment", () => {
  const caseFile: ExpedienteCaseFile = {
    id: "AR-CONTRACT-46-0453-CON22",
    countryCode: "AR",
    caseType: "procurement_contract",
    title: "Obra vial con contrato",
    workNumber: "46-0453-CON22",
    year: 2022,
    procedureNumber: "46-0012-LPU22",
    agencyName: "Dirección Nacional de Vialidad",
    agencyCode: "604",
    contractingUnit: "DNV",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -34.6, lon: -58.4 },
    evidenceLevel: "official_dataset",
    amount: { value: 120_000_000, currency: "ARS", label: "monto_contrato" },
    officialBudget: { value: 100_000_000, currency: "ARS", label: "presupuesto_oficial" },
    bidderCount: 2,
    offerCount: 2,
    supplierName: "Proveedor de prueba",
    supplierDocument: "30-70043585-3",
    receipt,
    caveats: ["Contrato oficial; no prueba pagos por si solo."],
  };

  const matrix = buildEvidenceClaimMatrix(caseFile);

  assert.equal(matrix.matrixType, "faro_evidence_claim_matrix_v1");
  assert.equal(claim(matrix, "supplier_identity").status, "supported");
  assert.equal(claim(matrix, "competition").status, "supported");
  assert.equal(claim(matrix, "declared_amount").status, "supported");
  assert.equal(claim(matrix, "official_budget").status, "supported");
  assert.equal(claim(matrix, "provider_payment").status, "not_supported");
  assert.match(claim(matrix, "provider_payment").caveat, /no prueba pago/i);
  assert.equal(matrix.summary.supported >= 5, true);
  assert.equal(matrix.summary.notSupported >= 1, true);
});

test("buildEvidenceClaimMatrix treats BAPIN as a partial budget trail until Presupuesto Abierto is integrated", () => {
  const matrix = buildEvidenceClaimMatrix({
    id: "AR-MAPA-INV-129182",
    countryCode: "AR",
    caseType: "public_works_progress",
    title: "Acueducto Rio Colorado",
    workNumber: "129182",
    procedureNumber: "BAPIN-129182",
    agencyName: "Secretaría de Infraestructura y Política Hídrica",
    agencyCode: "",
    contractingUnit: "Agua y saneamiento",
    executionTerm: null,
    executionTermType: null,
    coordinates: null,
    workProvince: "LA PAMPA",
    workDepartment: "PUELEN",
    evidenceLevel: "official_dataset",
    amount: { value: 124_165_715_681, currency: "ARS", label: "monto_total" },
    physicalProgress: 12,
    financialProgress: 9,
    supplierName: null,
    supplierDocument: null,
    receipt: {
      ...receipt,
      sourceId: "AR-MAPA-INVERSIONES-OBRAS",
      sourceName: "Mapa de Inversiones Argentina obras",
      recordId: "129182",
    },
    caveats: [
      "Mapa de Inversiones informa avance y monto declarados; no confirma pagos ni ejecucion por si solo.",
    ],
  } as ExpedienteCaseFile);

  assert.equal(claim(matrix, "declared_progress").status, "supported");
  assert.equal(claim(matrix, "official_location").status, "partial");
  assert.equal(claim(matrix, "budget_execution").status, "partial");
  assert.match(claim(matrix, "budget_execution").nextStep, /Presupuesto Abierto/i);
  assert.equal(claim(matrix, "supplier_identity").status, "not_supported");
  assert.equal(claim(matrix, "provider_payment").status, "not_supported");
});

function claim(
  matrix: ReturnType<typeof buildEvidenceClaimMatrix>,
  code: EvidenceClaimCode,
) {
  const value = matrix.claims.find((candidate) => candidate.code === code);
  assert.ok(value, `missing claim ${code}`);
  return value;
}
