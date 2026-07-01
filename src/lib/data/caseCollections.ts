import type { CountryCode } from "./sourceCatalog.ts";
import type { ArticleCitation } from "./articleCitations.ts";
import {
  buildCaseSignalContextsByCountry,
  buildCaseSignals,
  type CaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";

export interface ExportableCaseFile {
  id: string;
  countryCode: CountryCode;
  title: string;
  caveats: string[];
  caseType?: string;
  supplierName?: string | null;
  supplierDocument?: string | null;
  relatedReceipts?: Array<ExportableCaseFile["receipt"]>;
  receipt: {
    receiptId: string;
    sourceId: string;
    sourceName: string;
    sourceUrl: string;
    rawPath: string;
    snapshotHash: string;
    fileHash: string;
    rowHash: string;
    recordId: string;
    locatorType: string;
    extractedAt: string;
    parserVersion: string;
  };
}

export type ExportableCaseFileWithSignals = ExportableCaseFile & {
  signals: CaseSignal[];
};

export interface CaseCollectionFilters {
  countryCode?: CountryCode;
  sourceId?: string;
  caseType?: string;
  query?: string;
}

export interface CaseCollectionPack {
  packType: "faro_case_collection";
  generatedAt: string;
  filters: CaseCollectionFilters;
  stats: {
    caseFiles: number;
    receipts: number;
    sources: number;
    signals: number;
    contextualCitations: number;
  };
  sourceIds: string[];
  cases: ExportableCaseFileWithSignals[];
  receipts: ExportableCaseFile["receipt"][];
  contextualCitations: ArticleCitation[];
  signals: Array<CaseSignal & {
    caseId: string;
    countryCode: CountryCode;
    caseTitle: string;
    sourceId: string;
  }>;
  caveats: string[];
  verificationSteps: string[];
}

export function filterCaseFiles(
  cases: ExportableCaseFile[],
  filters: CaseCollectionFilters,
): ExportableCaseFile[] {
  const query = clean(filters.query).toLowerCase();
  return cases.filter((caseFile) => {
    if (filters.countryCode && caseFile.countryCode !== filters.countryCode) return false;
    if (filters.sourceId && caseFile.receipt.sourceId !== filters.sourceId) return false;
    if (filters.caseType && caseFile.caseType !== filters.caseType) return false;
    if (query.length === 0) return true;
    return [
      caseFile.id,
      caseFile.title,
      caseFile.receipt.recordId,
      caseFile.receipt.sourceName,
    ].join(" ").toLowerCase().includes(query);
  });
}

export function buildCaseCollectionPack(
  cases: ExportableCaseFile[],
  filters: CaseCollectionFilters,
  contextualCitations: ArticleCitation[] = [],
): CaseCollectionPack {
  const filteredCases = filterCaseFiles(cases, filters);
  const signalContextCases = filterCaseFiles(cases, {
    countryCode: filters.countryCode,
    sourceId: filters.sourceId,
    caseType: filters.caseType,
  });
  const signalContexts = buildCaseSignalContextsByCountry(signalContextCases as SignalCaseFile[]);
  const casesWithSignals = filteredCases.map((caseFile) => ({
    ...caseFile,
    signals: buildCaseSignals(caseFile as SignalCaseFile, signalContexts.get(caseFile.countryCode)),
  }));
  const signals = casesWithSignals.flatMap((caseFile) =>
    caseFile.signals.map((signal) => ({
      ...signal,
      caseId: caseFile.id,
      countryCode: caseFile.countryCode,
      caseTitle: caseFile.title,
      sourceId: caseFile.receipt.sourceId,
    })),
  );
  const receipts = filteredCases.flatMap((caseFile) => [
    caseFile.receipt,
    ...(caseFile.relatedReceipts ?? []),
  ]);
  const filteredCaseIds = new Set(filteredCases.map((caseFile) => caseFile.id));
  const filteredContextualCitations = contextualCitations.filter((citation) =>
    citation.status === "active" &&
    citation.linkedCaseIds.some((caseId) => filteredCaseIds.has(caseId))
  );
  const sourceIds = Array.from(new Set(receipts.map((receipt) => receipt.sourceId))).sort();
  return {
    packType: "faro_case_collection",
    generatedAt: new Date().toISOString(),
    filters,
    stats: {
      caseFiles: filteredCases.length,
      receipts: receipts.length,
      sources: sourceIds.length,
      signals: signals.length,
      contextualCitations: filteredContextualCitations.length,
    },
    sourceIds,
    cases: casesWithSignals,
    receipts,
    contextualCitations: filteredContextualCitations,
    signals: signals.sort((left, right) =>
      right.priority - left.priority || left.caseId.localeCompare(right.caseId),
    ),
    caveats: Array.from(new Set(filteredCases.flatMap((caseFile) => caseFile.caveats))).sort(),
    verificationSteps: [
      "Abrir cada fuente oficial indicada en los receipts.",
      "Reproducir el snapshot usando rawPath, hash y parserVersion.",
      "Cruzar contratos, presupuesto, pagos y avance antes de publicar conclusiones.",
      "Usar referencias periodisticas solo como contexto; no sustituyen receipts oficiales.",
      "No publicar conclusiones fuertes sin revisión documental adicional.",
    ],
  };
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
