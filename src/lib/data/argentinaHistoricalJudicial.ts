import { createEvidenceReceipt, type EvidenceReceipt, type LocatorType } from "./evidenceReceipts.ts";
import { attachFx } from "./fxAttach.ts";

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
  amount?: HistoricalAmountInput | null;
  officialBudget?: HistoricalAmountInput | null;
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
  usdEquivalent: import("./fx.ts").FxConversion | null;
  usdConversionNote?: import("./fx.ts").FxConversionNote;
}

export interface HistoricalAmountInput {
  value: number;
  currency: string;
  label: string;
  usdEquivalent?: import("./fx.ts").FxConversion | null;
  usdConversionNote?: import("./fx.ts").FxConversionNote;
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
  fxRegistry?: import("./fx.ts").FxSeriesRegistry;
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
      title: polishCuratedSpanishCopy(clean(record.title)) || record.contextId,
      procedureNumber: clean(record.procedureNumber) || record.contextId,
      agencyName: polishCuratedSpanishCopy(clean(record.agencyName)),
      agencyCode: clean(record.agencyCode) || "AR-JUDICIAL",
      contractingUnit: polishCuratedSpanishCopy(clean(record.contractingUnit)),
      executionTerm: null,
      executionTermType: null,
      coordinates: null,
      evidenceLevel: "official_dataset",
      amount: normalizeAmount(record.amount, record.year, options.fxRegistry),
      officialBudget: normalizeAmount(record.officialBudget, record.year, options.fxRegistry),
      supplierName: nullable(record.supplierName),
      supplierDocument: nullable(record.supplierDocument),
      judicialStatus: polishCuratedSpanishCopy(clean(record.judicialStatus)),
      contextSummary: polishCuratedSpanishCopy(clean(record.contextSummary)),
      localMatchStatus: polishCuratedSpanishCopy(clean(record.localMatchStatus)),
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
        ...record.caveats.map((caveat) => polishCuratedSpanishCopy(caveat)),
        "Contexto judicial o histórico; no convierte por sí solo a otros registros Faro en casos judicializados.",
        "No se dibuja en mapa porque no hay geometría oficial validada para este registro.",
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
        sourceName: polishCuratedSpanishCopy(sourceRef.sourceName),
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

function polishCuratedSpanishCopy(value: string): string {
  return value
    .replaceAll("Ministerio Publico Fiscal de la Nacion", "Ministerio Público Fiscal de la Nación")
    .replaceAll("Banco Central de la Republica Argentina", "Banco Central de la República Argentina")
    .replaceAll("Comunicacion", "Comunicación")
    .replaceAll("acusacion", "acusación")
    .replaceAll("Camara", "Cámara")
    .replace(/\bpublica\b/g, "pública")
    .replaceAll("por si solo", "por sí solo")
    .replaceAll("geometria", "geometría")
    .replaceAll("historico", "histórico")
    .replaceAll("documentacion", "documentación")
    .replaceAll("razon social", "razón social")
    .replaceAll("categoria", "categoría")
    .replaceAll("adjudicacion", "adjudicación")
    .replaceAll("cesion", "cesión")
    .replaceAll("segun", "según")
    .replaceAll("ubicacion", "ubicación")
    .replaceAll("verificacion", "verificación")
    .replaceAll("recaudacion", "recaudación")
    .replaceAll("declaracion", "declaración")
    .replaceAll("encontro", "encontró")
    .replaceAll("recuperacion", "recuperación");
}

function normalizeAmount(
  amount: HistoricalAmountInput | null | undefined,
  year: number | null | undefined,
  fxRegistry: import("./fx.ts").FxSeriesRegistry | undefined,
): HistoricalAmount | null {
  if (!amount || !Number.isFinite(amount.value) || amount.value <= 0) return null;
  const base = {
    value: amount.value,
    currency: clean(amount.currency),
    label: clean(amount.label),
  };
  const yearAnchor = year && Number.isFinite(year) ? `${year}-01-01` : null;
  return attachFx(base, [{ field: "year", date: yearAnchor }], fxRegistry) as HistoricalAmount;
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
