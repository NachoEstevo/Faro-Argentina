import { createEvidenceReceipt, type EvidenceReceipt, type LocatorType } from "./evidenceReceipts.ts";

export type ArgentinaHistoricalJudicialCaseType =
  | "judicial_context"
  | "historical_public_work"
  | "supplier_judicial_context";

export interface ArgentinaHistoricalJudicialSnapshot {
  records: ArgentinaHistoricalJudicialRecord[];
}

export interface ArgentinaHistoricalJudicialRecord {
  contextId: string;
  caseType: ArgentinaHistoricalJudicialCaseType;
  title: string;
  year: number | null;
  procedureNumber: string;
  agencyName: string;
  agencyCode?: string | null;
  contractingUnit: string;
  supplierName?: string | null;
  supplierDocument?: string | null;
  amount?: HistoricalAmount | null;
  officialBudget?: HistoricalAmount | null;
  judicialStatus: string;
  contextSummary: string;
  localMatchStatus: string;
  sourceUrl: string;
  locatorType?: LocatorType;
  relatedSourceRefs?: RelatedSourceRef[];
  relatedLocalCaseIds?: string[];
  caveats: string[];
}

export interface RelatedSourceRef {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  recordId: string;
  locatorType?: LocatorType;
}

export interface HistoricalAmount {
  value: number;
  currency: string;
  label: string;
}

export interface ArgentinaHistoricalJudicialCase {
  id: string;
  countryCode: "AR";
  caseType: ArgentinaHistoricalJudicialCaseType;
  workNumber: string;
  year: number | null;
  title: string;
  procedureNumber: string;
  agencyName: string;
  agencyCode: string;
  contractingUnit: string;
  executionTerm: string | null;
  executionTermType: string | null;
  coordinates: null;
  evidenceLevel: "official_dataset";
  amount: HistoricalAmount | null;
  officialBudget?: HistoricalAmount | null;
  supplierName: string | null;
  supplierDocument: string | null;
  judicialStatus: string;
  contextSummary: string;
  localMatchStatus: string;
  relatedCaseIds: string[];
  receipt: EvidenceReceipt;
  relatedReceipts?: EvidenceReceipt[];
  caveats: string[];
}

export interface ArgentinaHistoricalJudicialBuildOptions {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  rawPath: string;
  fileHash: string;
  extractedAt: string;
  parserVersion: string;
  localReceiptsByCaseId?: Map<string, EvidenceReceipt>;
}

export function buildArgentinaHistoricalJudicialCases(
  records: ArgentinaHistoricalJudicialRecord[],
  options: ArgentinaHistoricalJudicialBuildOptions,
): ArgentinaHistoricalJudicialCase[] {
  return records.map((record) => {
    const relatedCaseIds = uniqueStrings(record.relatedLocalCaseIds ?? []);
    const relatedReceipts = buildRelatedReceipts(record, relatedCaseIds, options);
    return {
      id: `AR-HIST-JUD-${record.contextId}`,
      countryCode: "AR",
      caseType: record.caseType,
      workNumber: record.contextId,
      year: record.year,
      title: clean(record.title) || record.contextId,
      procedureNumber: clean(record.procedureNumber) || record.contextId,
      agencyName: clean(record.agencyName),
      agencyCode: clean(record.agencyCode) || "AR-JUDICIAL",
      contractingUnit: clean(record.contractingUnit),
      executionTerm: null,
      executionTermType: null,
      coordinates: null,
      evidenceLevel: "official_dataset",
      amount: normalizeAmount(record.amount),
      officialBudget: normalizeAmount(record.officialBudget),
      supplierName: nullable(record.supplierName),
      supplierDocument: nullable(record.supplierDocument),
      judicialStatus: clean(record.judicialStatus),
      contextSummary: clean(record.contextSummary),
      localMatchStatus: clean(record.localMatchStatus),
      relatedCaseIds,
      receipt: createEvidenceReceipt({
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        sourceUrl: record.sourceUrl || options.sourceUrl,
        rawPath: options.rawPath,
        snapshotHash: options.fileHash,
        extractedAt: options.extractedAt,
        recordId: record.contextId,
        locatorType: record.locatorType ?? "official_detail",
        parserVersion: options.parserVersion,
        row: { ...record },
      }),
      relatedReceipts,
      caveats: uniqueStrings([
        ...record.caveats,
        "Contexto judicial o historico; no convierte por si solo a otros registros Faro en casos judicializados.",
        "No se dibuja en mapa porque no hay geometria oficial validada para este registro.",
      ]),
    };
  });
}

function buildRelatedReceipts(
  record: ArgentinaHistoricalJudicialRecord,
  relatedCaseIds: string[],
  options: ArgentinaHistoricalJudicialBuildOptions,
): EvidenceReceipt[] {
  const officialReceipts = (record.relatedSourceRefs ?? []).map((sourceRef) =>
    createEvidenceReceipt({
      sourceId: sourceRef.sourceId,
      sourceName: sourceRef.sourceName,
      sourceUrl: sourceRef.sourceUrl,
      rawPath: options.rawPath,
      snapshotHash: options.fileHash,
      extractedAt: options.extractedAt,
      recordId: `${record.contextId}:${sourceRef.recordId}`,
      locatorType: sourceRef.locatorType ?? "official_detail",
      parserVersion: options.parserVersion,
      row: {
        contextId: record.contextId,
        sourceRef,
      },
    }),
  );
  const localReceipts = relatedCaseIds
    .map((caseId) => options.localReceiptsByCaseId?.get(caseId))
    .filter((receipt): receipt is EvidenceReceipt => receipt !== undefined);

  return dedupeReceipts([...officialReceipts, ...localReceipts]);
}

function normalizeAmount(amount: HistoricalAmount | null | undefined): HistoricalAmount | null {
  if (!amount || !Number.isFinite(amount.value) || amount.value <= 0) return null;
  return {
    value: amount.value,
    currency: clean(amount.currency),
    label: clean(amount.label),
  };
}

function dedupeReceipts(receipts: EvidenceReceipt[]): EvidenceReceipt[] {
  const seen = new Set<string>();
  return receipts.filter((receipt) => {
    const key = `${receipt.sourceId}:${receipt.recordId}:${receipt.rawPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(clean).filter((value) => value.length > 0)));
}

function nullable(value: string | null | undefined): string | null {
  const cleaned = clean(value);
  return cleaned.length > 0 ? cleaned : null;
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
