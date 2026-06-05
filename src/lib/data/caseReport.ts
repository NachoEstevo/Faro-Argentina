import type { CaseSignal, CaseSignalContext } from "./caseSignals.ts";
import { buildExpediente, type ExpedienteCaseFile, type ExpedienteReceipt } from "./expediente.ts";
import type { ArticleCitation } from "./articleCitations.ts";
import type { CuratedContributionEvidence, PublicCuratedContributionEvidence } from "./userContributions.ts";
import type { EvidenceClaimMatrix } from "./evidenceClaimMatrix.ts";
import type { CaseInvestigationChecklist } from "./caseInvestigationChecklist.ts";

export interface CaseReportFact {
  label: string;
  value: string;
}

export interface CaseReportSignal {
  label: string;
  summary: string;
  evidence: string;
  caveat: string;
  action: string;
}

export interface CaseReportCitation {
  title: string;
  sourceLabel: string;
  dateLabel: string;
  roleLabel: string;
  summary: string;
  caveat: string;
  url: string;
}

export interface CaseReportReceipt {
  receiptId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  recordId: string;
  locatorLabel: string;
  locatorNote: string;
}

export interface CaseReportTechnicalReceipt extends CaseReportReceipt {
  rawPath: string;
  snapshotHash: string;
  fileHash: string;
  rowHash: string;
  parserVersion: string;
  extractedAt: string;
}

export interface CaseReportView {
  reportType: "faro_case_report_v1";
  generatedAt: string;
  summary: {
    caseId: string;
    title: string;
    countryLabel: string;
    caseTypeLabel: string;
    plainLanguage: string;
    evidenceLevel: string;
  };
  keyFacts: CaseReportFact[];
  whyItAppeared: CaseReportSignal[];
  officialTrail: {
    primary: CaseReportReceipt;
    relatedReceipts: CaseReportReceipt[];
    description: string;
  };
  journalismContext: CaseReportCitation[];
  curatedEvidence: PublicCuratedContributionEvidence[];
  claimMatrix: EvidenceClaimMatrix;
  investigationChecklist: CaseInvestigationChecklist;
  caveats: string[];
  nextVerification: string[];
  technicalAppendix: {
    receipts: CaseReportTechnicalReceipt[];
  };
  actions: {
    officialSourceHref: string;
    printHref: string;
    evidenceJsonHref: string;
    caseJsonHref: string;
  };
}

export function buildCaseReportView(
  caseFile: ExpedienteCaseFile,
  signalContext?: CaseSignalContext,
  contextualCitations: ArticleCitation[] = [],
  curatedEvidence: CuratedContributionEvidence[] = [],
): CaseReportView {
  const expediente = buildExpediente(caseFile, signalContext, contextualCitations, curatedEvidence);
  const reportSignals = pickReportSignals(expediente.whyItAppeared);
  const receipts = [
    expediente.officialTrail.primary,
    ...expediente.officialTrail.related,
  ];

  return {
    reportType: "faro_case_report_v1",
    generatedAt: expediente.generatedAt,
    summary: {
      caseId: expediente.summary.caseId,
      title: expediente.summary.title,
      countryLabel: countryLabel(expediente.summary.countryCode),
      caseTypeLabel: caseTypeLabel(expediente.summary.caseType),
      plainLanguage: [
        "Este informe resume un expediente Faro en lenguaje simple.",
        expediente.summary.plainSummary,
        "La lectura se apoya en fuente oficial, receipts reproducibles y caveats visibles.",
      ].join(" "),
      evidenceLevel: expediente.summary.evidenceLevel,
    },
    keyFacts: [
      { label: "Organismo", value: expediente.summary.organismLabel },
      { label: "Proveedor", value: expediente.summary.supplierLabel },
      { label: "Monto", value: expediente.summary.amountLabel },
      { label: "Fecha o periodo", value: expediente.summary.dateLabel },
      { label: "Ubicacion", value: expediente.summary.locationLabel },
      { label: "Fuente oficial", value: expediente.officialTrail.primary.sourceName },
    ],
    whyItAppeared: reportSignals.map(toReportSignal),
    officialTrail: {
      primary: toReportReceipt(expediente.officialTrail.primary, { includeUrl: true }),
      relatedReceipts: expediente.officialTrail.related.map((receipt) =>
        toReportReceipt(receipt, { includeUrl: false })
      ),
      description: buildOfficialTrailDescription(expediente.investigationContext.sourceCount),
    },
    journalismContext: contextualCitations.map(toReportCitation),
    curatedEvidence: expediente.curatedEvidence,
    claimMatrix: expediente.claimMatrix,
    investigationChecklist: expediente.investigationChecklist,
    caveats: expediente.caveats,
    nextVerification: expediente.nextVerification,
    technicalAppendix: {
      receipts: receipts.map(toTechnicalReceipt),
    },
    actions: {
      officialSourceHref: expediente.actions.officialSourceHref,
      printHref: expediente.actions.reportHref,
      evidenceJsonHref: expediente.actions.downloadEvidenceHref,
      caseJsonHref: expediente.actions.caseJsonHref,
    },
  };
}

function pickReportSignals(signals: CaseSignal[]): CaseSignal[] {
  const leadSignals = signals.filter((signal) => signal.leadEligible);
  const picked = leadSignals.length > 0 ? leadSignals : signals;
  return picked.slice(0, 3);
}

function toReportSignal(signal: CaseSignal): CaseReportSignal {
  return {
    label: signal.label,
    summary: signal.summary,
    evidence: signal.evidence,
    caveat: signal.caveat,
    action: signal.action,
  };
}

function toReportReceipt(
  receipt: ExpedienteReceipt,
  options: { includeUrl: boolean },
): CaseReportReceipt {
  return {
    receiptId: receipt.receiptId,
    sourceId: receipt.sourceId,
    sourceName: receipt.sourceName,
    sourceUrl: options.includeUrl ? receipt.publicSourceUrl : undefined,
    recordId: receipt.recordId,
    locatorLabel: receipt.locator.label,
    locatorNote: receipt.locator.note,
  };
}

function toTechnicalReceipt(receipt: ExpedienteReceipt): CaseReportTechnicalReceipt {
  return {
    ...toReportReceipt(receipt, { includeUrl: false }),
    sourceUrl: undefined,
    rawPath: receipt.rawPath,
    snapshotHash: receipt.snapshotHash,
    fileHash: receipt.fileHash,
    rowHash: receipt.rowHash,
    parserVersion: receipt.parserVersion,
    extractedAt: receipt.extractedAt,
  };
}

function toReportCitation(citation: ArticleCitation): CaseReportCitation {
  const primaryClaim = citation.claimSummaries[0]?.summary ?? "Referencia periodistica revisada para contexto.";
  return {
    title: `Nota de ${citation.publisher}`,
    sourceLabel: citation.authors.length > 0
      ? `${citation.publisher} / ${citation.authors.join(", ")}`
      : citation.publisher,
    dateLabel: citation.publishedAt.slice(0, 10),
    roleLabel: `Contexto: ${citation.ui.scopeLabel}`,
    summary: primaryClaim,
    caveat: citation.ui.caveat,
    url: citation.url,
  };
}

function buildOfficialTrailDescription(sourceCount: number): string {
  if (sourceCount <= 1) {
    return "El caso tiene una fuente oficial principal. Abrila antes de citar el expediente.";
  }
  return `El caso cruza ${sourceCount} fuentes oficiales. Revisalas antes de publicar conclusiones.`;
}

function countryLabel(countryCode: string): string {
  if (countryCode === "AR") return "Argentina";
  return countryCode;
}

function caseTypeLabel(caseType: string | null): string {
  if (caseType === "procurement_contract") return "Contrato";
  if (caseType === "procurement_process") return "Compra o adjudicacion";
  if (caseType === "budget_execution") return "Ejecucion presupuestaria";
  if (caseType === "public_works_progress") return "Obra con avance declarado";
  if (caseType === "public_work") return "Obra publica";
  if (caseType === "judicial_context") return "Contexto judicial";
  if (caseType === "historical_public_work") return "Obra historica";
  if (caseType === "supplier_judicial_context") return "Proveedor con contexto judicial";
  return "Expediente";
}
