import type { SignalCaseFile } from "./caseSignals.ts";

export function sourceIdsForCase(caseFile: SignalCaseFile): string[] {
  return uniqueStrings([
    caseFile.receipt.sourceId,
    ...(caseFile.relatedReceipts ?? []).map((receipt) => receipt.sourceId),
  ]);
}

export function recordId(caseFile: SignalCaseFile): string {
  return clean(caseFile.workNumber) ||
    clean(caseFile.procedureNumber) ||
    readString(caseFile, "publicWorkNumber") ||
    caseFile.id;
}

export function bapinLikeIdentifier(caseFile: SignalCaseFile): string | null {
  const value = clean(caseFile.procedureNumber);
  if (!value) return null;
  if (caseFile.receipt.sourceId === "AR-MAPA-INVERSIONES-OBRAS" && /^\d+$/.test(value)) return value;
  if (/bapin/i.test(value) || /^\d{4,}$/.test(value)) return value;
  return null;
}

export function isJudicialContextCase(caseFile: SignalCaseFile): boolean {
  return caseFile.caseType === "judicial_context" ||
    caseFile.caseType === "historical_public_work" ||
    caseFile.caseType === "supplier_judicial_context";
}

export function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function round(value: number): string {
  return Math.round(value).toLocaleString("es-AR");
}

export function readString(caseFile: SignalCaseFile, field: string): string {
  const value = (caseFile as unknown as Record<string, unknown>)[field];
  return typeof value === "string" ? clean(value) : "";
}

export function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}
