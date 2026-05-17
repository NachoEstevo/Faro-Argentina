import test from "node:test";
import assert from "node:assert/strict";

import {
  getCaseReportById,
  getExpedienteById,
} from "../src/lib/caseRepository.ts";

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
