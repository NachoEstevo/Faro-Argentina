import test from "node:test";
import assert from "node:assert/strict";

import { buildCaseInvestigationChecklist } from "../src/lib/data/caseInvestigationChecklist.ts";
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
  parserVersion: "case-checklist-test@1",
  row: { contrato_numero: "46-0453-CON22" },
});

test("buildCaseInvestigationChecklist suggests Presupuesto Abierto only when a Mapa case exposes BAPIN", () => {
  const checklist = buildCaseInvestigationChecklist({
    id: "AR-MAPA-INV-1610",
    countryCode: "AR",
    caseType: "public_works_progress",
    title: "CIERRE DE MALLA RINCON DE MILBERG",
    workNumber: "NA70056",
    procedureNumber: "10",
    agencyName: "Ministerio de Obras Publicas",
    agencyCode: "",
    contractingUnit: "Agua y saneamiento",
    executionTerm: null,
    executionTermType: null,
    coordinates: null,
    workProvince: "BUENOS AIRES",
    workDepartment: "TIGRE",
    evidenceLevel: "official_dataset",
    amount: { value: 120_000_000, currency: "ARS", label: "monto_total" },
    physicalProgress: 100,
    financialProgress: 100,
    supplierName: null,
    supplierDocument: null,
    receipt: {
      ...receipt,
      sourceId: "AR-MAPA-INVERSIONES-OBRAS",
      sourceName: "Mapa de Inversiones Argentina obras",
      recordId: "1610",
    },
    caveats: ["Mapa de Inversiones informa avance y monto declarados; no confirma pagos por si solo."],
  } as ExpedienteCaseFile);

  assert.equal(checklist.checklistType, "faro_case_investigation_checklist_v1");
  assert.equal(checklist.readiness, "needs_source_cross");
  assert.equal(
    checklist.followUps.some((item) =>
      item.sourceId === "AR-PRESUPUESTO-ABIERTO-CREDITO-BAPIN" &&
      item.joinKey === "codigo_bapin_id" &&
      item.joinValue === "10" &&
      item.sourceStatus === "candidate"
    ),
    true,
  );
  assert.equal(checklist.doNotClaim.some((item) => /pago a proveedor/i.test(item)), true);
  assertNoAccusatoryCopy(checklist);
});

test("buildCaseInvestigationChecklist keeps contracts without BAPIN away from budget execution follow-ups", () => {
  const checklist = buildCaseInvestigationChecklist({
    id: "AR-CONTRACT-46-0453-CON22",
    countryCode: "AR",
    caseType: "procurement_contract",
    title: "Obra vial con contrato",
    workNumber: "46-0453-CON22",
    year: 2022,
    procedureNumber: "46-0012-LPU22",
    agencyName: "Direccion Nacional de Vialidad",
    agencyCode: "604",
    contractingUnit: "DNV",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -34.6, lon: -58.4 },
    evidenceLevel: "official_dataset",
    amount: { value: 120_000_000, currency: "ARS", label: "monto_contrato" },
    officialBudget: { value: 100_000_000, currency: "ARS", label: "presupuesto_oficial" },
    bidderCount: 2,
    supplierName: "Proveedor de prueba",
    supplierDocument: "30-70043585-3",
    receipt,
    caveats: ["Contrato oficial; no prueba pagos por si solo."],
  });

  assert.equal(checklist.followUps.some((item) => item.sourceId === "AR-PRESUPUESTO-ABIERTO-CREDITO-BAPIN"), false);
  assert.equal(checklist.gaps.some((gap) => gap.claimCode === "provider_payment" && gap.severity === "high"), true);
  assert.equal(checklist.label.includes("punto de partida"), true);
  assertNoAccusatoryCopy(checklist);
});

function assertNoAccusatoryCopy(value: unknown): void {
  assert.doesNotMatch(
    JSON.stringify(value),
    /fraude|corrup|culpable|delito|irregularidad|sospecha|ranking/i,
  );
}
