import {
  buildCaseSignals,
  type CaseSignalContext,
  type CaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";
import {
  describeReceiptLocator,
  type EvidenceReceipt,
  type ReceiptLocatorPresentation,
} from "./evidenceReceipts.ts";

export type ExpedienteCaseFile = Omit<SignalCaseFile, "receipt" | "relatedReceipts"> & {
  receipt: EvidenceReceipt;
  relatedReceipts?: EvidenceReceipt[];
};

export type ExpedienteReceipt = EvidenceReceipt & {
  locator: ReceiptLocatorPresentation;
};

export interface ExpedienteView {
  expedienteType: "faro_expediente_v1";
  generatedAt: string;
  summary: {
    caseId: string;
    countryCode: string;
    caseType: string | null;
    title: string;
    plainSummary: string;
    amountLabel: string;
    organismLabel: string;
    supplierLabel: string;
    dateLabel: string;
    locationLabel: string;
    evidenceLevel: string;
  };
  whyItAppeared: CaseSignal[];
  officialTrail: {
    primary: ExpedienteReceipt;
    related: ExpedienteReceipt[];
  };
  investigationContext: {
    hasOfficialGeometry: boolean;
    relatedReceiptCount: number;
    sourceCount: number;
  };
  actions: {
    officialSourceHref: string;
    downloadEvidenceHref: string;
    caseJsonHref: string;
  };
  caveats: string[];
  nextVerification: string[];
}

const verificationSteps = [
  "Abrir la fuente oficial indicada en el receipt.",
  "Cruzar pagos, avance fisico y documentos antes de publicar conclusiones.",
];

export function buildExpediente(caseFile: ExpedienteCaseFile, signalContext?: CaseSignalContext): ExpedienteView {
  const signals = buildCaseSignals(caseFile, signalContext);
  const primaryReceipt = toExpedienteReceipt(caseFile.receipt);
  const relatedReceipts = (caseFile.relatedReceipts ?? []).map((receipt) =>
    toExpedienteReceipt(receipt),
  );
  const encodedCaseId = encodeURIComponent(caseFile.id);
  const sourceIds = new Set([
    primaryReceipt.sourceId,
    ...relatedReceipts.map((receipt) => receipt.sourceId),
  ]);

  return {
    expedienteType: "faro_expediente_v1",
    generatedAt: new Date().toISOString(),
    summary: {
      caseId: caseFile.id,
      countryCode: caseFile.countryCode,
      caseType: caseFile.caseType ?? null,
      title: caseFile.title,
      plainSummary: buildPlainSummary(caseFile),
      amountLabel: caseFile.amount?.label ?? "Sin monto oficial",
      organismLabel: firstPresent(caseFile.agencyName, caseFile.contractingUnit, caseFile.agencyCode),
      supplierLabel: firstPresent(caseFile.supplierName, caseFile.supplierDocument, "Sin proveedor identificado"),
      dateLabel: buildDateLabel(caseFile),
      locationLabel: buildLocationLabel(caseFile),
      evidenceLevel: caseFile.evidenceLevel ?? "sin nivel declarado",
    },
    whyItAppeared: signals,
    officialTrail: {
      primary: primaryReceipt,
      related: relatedReceipts,
    },
    investigationContext: {
      hasOfficialGeometry: Boolean(caseFile.coordinates),
      relatedReceiptCount: relatedReceipts.length,
      sourceCount: sourceIds.size,
    },
    actions: {
      officialSourceHref: primaryReceipt.sourceUrl,
      downloadEvidenceHref: `/api/export/${encodedCaseId}`,
      caseJsonHref: `/api/cases/${encodedCaseId}`,
    },
    caveats: uniqueStrings([
      ...(caseFile.caveats ?? []),
      ...signals.map((signal) => signal.caveat),
    ]),
    nextVerification: buildNextVerification(signals),
  };
}

function toExpedienteReceipt(receipt: EvidenceReceipt): ExpedienteReceipt {
  return {
    ...receipt,
    locator: describeReceiptLocator(receipt.locatorType),
  };
}

function buildPlainSummary(caseFile: ExpedienteCaseFile): string {
  const typeLabel = describeCaseType(caseFile.caseType);
  const amount = caseFile.amount?.label ? ` por ${caseFile.amount.label}` : "";
  const organism = firstPresent(caseFile.agencyName, caseFile.contractingUnit);
  const procedure = firstPresent(caseFile.procedureNumber, caseFile.workNumber);

  return `${typeLabel}: ${caseFile.title}${amount}. Organismo: ${organism}. Identificador: ${procedure}.`;
}

function describeCaseType(caseType: string | undefined): string {
  if (caseType === "procurement_contract") return "Contrato";
  if (caseType === "procurement_process") return "Proceso de compra";
  if (caseType === "public_work") return "Obra publica";
  if (caseType === "judicial_context") return "Contexto judicial";
  if (caseType === "historical_public_work") return "Obra historica";
  if (caseType === "supplier_judicial_context") return "Proveedor con contexto judicial";
  return "Caso";
}

function buildDateLabel(caseFile: ExpedienteCaseFile): string {
  if (caseFile.executionTerm) return caseFile.executionTerm;
  if (caseFile.year !== null && caseFile.year !== undefined) return String(caseFile.year);
  return "Sin fecha oficial";
}

function buildLocationLabel(caseFile: ExpedienteCaseFile): string {
  if (!caseFile.coordinates) return "Sin geometria oficial";
  return `${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}`;
}

function buildNextVerification(signals: CaseSignal[]): string[] {
  const signalActions = signals
    .filter((signal) => signal.kind === "watch" || signal.kind === "gap")
    .map((signal) => signal.action);

  return uniqueStrings([...signalActions, ...verificationSteps]);
}

function firstPresent(...values: Array<string | null | undefined>): string {
  return values.find((value) => value !== null && value !== undefined && value.trim().length > 0) ?? "Sin dato oficial";
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}
