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

export interface ReceiptLocatorPresentation {
  locatorType: LocatorType;
  label: string;
  actionLabel: string;
  note: string;
  isDirectRecord: boolean;
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

const receiptLocatorPresentations = {
  official_detail: {
    locatorType: "official_detail",
    label: "Detalle oficial",
    actionLabel: "Abrir registro",
    note: "Link al registro oficial especifico.",
    isDirectRecord: true,
  },
  official_search: {
    locatorType: "official_search",
    label: "Busqueda oficial",
    actionLabel: "Buscar registro",
    note: "Link de busqueda oficial usando el identificador del registro.",
    isDirectRecord: false,
  },
  official_dataset: {
    locatorType: "official_dataset",
    label: "Dataset oficial",
    actionLabel: "Abrir fuente",
    note: "Fuente oficial del dataset; no es un link directo al registro.",
    isDirectRecord: false,
  },
  missing: {
    locatorType: "missing",
    label: "Sin URL exacta",
    actionLabel: "Ver receipt",
    note: "Faro conserva el registro y hash, pero no hay URL oficial exacta.",
    isDirectRecord: false,
  },
} satisfies Record<LocatorType, ReceiptLocatorPresentation>;

export function describeReceiptLocator(
  locatorType: LocatorType,
): ReceiptLocatorPresentation {
  return receiptLocatorPresentations[locatorType];
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
