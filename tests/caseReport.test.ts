import test from "node:test";
import assert from "node:assert/strict";

import {
  getCaseReportById,
  getExpedienteById,
} from "../src/lib/caseRepository.ts";
import { buildCaseReportView } from "../src/lib/data/caseReport.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import type { ExpedienteCaseFile } from "../src/lib/data/expediente.ts";

const vialidadCaseId = "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME";

test("getCaseReportById builds a plain-language report for non-technical users", () => {
  const report = getCaseReportById(vialidadCaseId);

  assert.ok(report);
  assert.equal(report.reportType, "faro_case_report_v1");
  assert.equal(report.summary.caseId, vialidadCaseId);
  assert.equal(report.summary.countryLabel, "Argentina");
  assert.match(report.summary.plainLanguage, /fuente oficial|expediente|registro/i);
  assert.equal(report.keyFacts.some((fact) => fact.label === "Organismo"), true);
  assert.equal(report.keyFacts.some((fact) => fact.label === "Fuente oficial"), true);
  assert.equal(report.actions.printHref, `/expediente/${encodeURIComponent(vialidadCaseId)}/informe`);
  assert.equal(report.actions.evidenceJsonHref, `/api/export/${encodeURIComponent(vialidadCaseId)}`);
});

test("getCaseReportById separates journalism context from official proof", () => {
  const report = getCaseReportById(vialidadCaseId);

  assert.ok(report);
  assert.equal(report.journalismContext.length >= 2, true);
  assert.equal(
    report.journalismContext.every((citation) =>
      /contexto/i.test(citation.roleLabel) &&
      /no reemplaza/i.test(citation.caveat)
    ),
    true,
  );
  assert.equal(
    report.officialTrail.relatedReceipts.some((receipt) => /AP|CHEQUEADO|REUTERS/i.test(receipt.sourceId)),
    false,
  );
});

test("getCaseReportById keeps hashes in a technical appendix instead of the main reading flow", () => {
  const report = getCaseReportById(vialidadCaseId);

  assert.ok(report);
  const readingFlow = JSON.stringify({
    summary: report.summary,
    keyFacts: report.keyFacts,
    whyItAppeared: report.whyItAppeared,
    officialTrail: report.officialTrail,
    nextVerification: report.nextVerification,
  });

  assert.doesNotMatch(readingFlow, /rawPath|snapshotHash|rowHash|parserVersion|sha256-/i);
  assert.equal(report.technicalAppendix.receipts.length >= 1, true);
  assert.match(report.technicalAppendix.receipts[0]?.snapshotHash ?? "", /^sha256-/);
  assert.match(report.technicalAppendix.receipts[0]?.rawPath ?? "", /^data\//);
});

test("case report copy remains careful and non-accusatory", () => {
  const report = getCaseReportById(vialidadCaseId);

  assert.ok(report);
  assert.doesNotMatch(
    JSON.stringify(report),
    /corrup|fraude|culpable|robo|estafa|delito probado|ranking de sospechosos/i,
  );
});

test("expediente actions expose a report href distinct from technical JSON", () => {
  const expediente = getExpedienteById(vialidadCaseId);

  assert.ok(expediente);
  assert.equal(expediente.actions.reportHref, `/expediente/${encodeURIComponent(vialidadCaseId)}/informe`);
  assert.equal(expediente.actions.downloadEvidenceHref, `/api/export/${encodeURIComponent(vialidadCaseId)}`);
});

test("case report shows the official catalog page instead of direct dataset downloads", () => {
  const receipt = createEvidenceReceipt({
    sourceId: "AR-CONTRATAR-CONTRATOS",
    sourceName: "CONTRAT.AR contratos",
    sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
    rawPath: "data/official/ar/onc-contratar-contratos.csv",
    snapshotHash: "sha256-snapshot",
    recordId: "14-1002-CON21",
    locatorType: "official_dataset",
    extractedAt: "2026-05-16T00:00:00.000Z",
    parserVersion: "case-report-test@1",
    row: { contrato_numero: "14-1002-CON21" },
  });
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
    supplierName: "Proveedor de prueba",
    supplierDocument: "30-70043585-3",
    receipt,
    caveats: ["Contrato oficial; no prueba pagos por si solo."],
  };

  const report = buildCaseReportView(caseFile);

  assert.equal(
    report.officialTrail.primary.sourceUrl,
    "https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar",
  );
  assert.equal(report.officialTrail.primary.sourceUrl.includes("/download/"), false);
  assert.equal(report.actions.officialSourceHref, report.officialTrail.primary.sourceUrl);
  assert.equal(report.technicalAppendix.receipts[0]?.sourceUrl, undefined);
});
