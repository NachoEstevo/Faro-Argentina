import type { CaseSignal, CaseSignalContext } from "./caseSignals.ts";
import { buildExpediente, type ExpedienteCaseFile } from "./expediente.ts";

export interface CaseInspectorFact {
  label: string;
  value: string;
}

export interface CaseInspectorView {
  inspectorType: "faro_case_inspector_v1";
  caseId: string;
  title: string;
  kicker: string;
  summary: string;
  facts: CaseInspectorFact[];
  primarySignal: CaseSignal | null;
  officialTrail: {
    sourceName: string;
    locatorLabel: string;
    locatorNote: string;
    relatedCount: number;
    sourceCount: number;
  };
  actions: {
    officialSourceHref: string;
    downloadEvidenceHref: string;
    caseJsonHref: string;
    canOpenFullExpediente: boolean;
  };
  caveat: string;
  nextAction: string;
}

export function buildCaseInspector(caseFile: ExpedienteCaseFile, signalContext?: CaseSignalContext): CaseInspectorView {
  const expediente = buildExpediente(caseFile, signalContext);
  const primarySignal = expediente.whyItAppeared[0] ?? null;
  const trail = expediente.officialTrail.primary;

  return {
    inspectorType: "faro_case_inspector_v1",
    caseId: expediente.summary.caseId,
    title: expediente.summary.title,
    kicker: `${expediente.summary.countryCode} / ${labelCaseType(expediente.summary.caseType)}`,
    summary: expediente.summary.plainSummary,
    facts: [
      { label: "Organismo", value: expediente.summary.organismLabel },
      { label: "Proveedor", value: expediente.summary.supplierLabel },
      { label: "Monto", value: expediente.summary.amountLabel },
      {
        label: "Rastro",
        value: `${trail.locator.label}${expediente.investigationContext.relatedReceiptCount ? ` + ${expediente.investigationContext.relatedReceiptCount}` : ""}`,
      },
    ],
    primarySignal,
    officialTrail: {
      sourceName: trail.sourceName,
      locatorLabel: trail.locator.label,
      locatorNote: trail.locator.note,
      relatedCount: expediente.investigationContext.relatedReceiptCount,
      sourceCount: expediente.investigationContext.sourceCount,
    },
    actions: {
      officialSourceHref: expediente.actions.officialSourceHref,
      downloadEvidenceHref: expediente.actions.downloadEvidenceHref,
      caseJsonHref: expediente.actions.caseJsonHref,
      canOpenFullExpediente: true,
    },
    caveat: primarySignal?.caveat ?? expediente.caveats[0] ?? "Revisar la fuente oficial antes de concluir.",
    nextAction: primarySignal?.action ?? expediente.nextVerification[0] ?? "Abrir la fuente oficial indicada.",
  };
}

function labelCaseType(caseType: string | null): string {
  if (caseType === "procurement_contract") return "Contrato";
  if (caseType === "procurement_process") return "Adjudicacion";
  if (caseType === "budget_execution") return "Presupuesto";
  if (caseType === "public_work") return "Obra";
  if (caseType === "judicial_context") return "Judicial";
  if (caseType === "historical_public_work") return "Obra historica";
  if (caseType === "supplier_judicial_context") return "Proveedor judicial";
  return "Expediente";
}
