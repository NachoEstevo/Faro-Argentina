import { createHash } from "node:crypto";

export type LocatorType = "official_detail" | "official_search" | "official_dataset" | "missing";

export interface EvidenceReceiptInput {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  rawPath: string;
  snapshotHash: string;
  recordId: string;
  locatorType: LocatorType;
  extractedAt: string;
  parserVersion: string;
  row: Record<string, unknown>;
}

export interface EvidenceReceipt {
  receiptId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  rawPath: string;
  snapshotHash: string;
  fileHash: string;
  rowHash: string;
  recordId: string;
  locatorType: LocatorType;
  extractedAt: string;
  parserVersion: string;
}

export function createEvidenceReceipt(input: EvidenceReceiptInput): EvidenceReceipt {
  const receiptId = `${input.sourceId}-${input.recordId}`.replaceAll("/", "-");
  return {
    receiptId,
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    rawPath: input.rawPath,
    snapshotHash: input.snapshotHash,
    fileHash: input.snapshotHash,
    rowHash: `sha256-${hashStableJson(input.row)}`,
    recordId: input.recordId,
    locatorType: input.locatorType,
    extractedAt: input.extractedAt,
    parserVersion: input.parserVersion,
  };
}

export function shouldExposeReceiptInUi(receipt: EvidenceReceipt): boolean {
  return receipt.locatorType !== "missing" && receipt.snapshotHash.startsWith("sha256-");
}

function hashStableJson(value: Record<string, unknown>): string {
  const stable = Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = value[key];
      return result;
    }, {});
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
