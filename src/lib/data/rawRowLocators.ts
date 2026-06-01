import { readFile } from "node:fs/promises";

import { parseCsv } from "./argentinaWorks.ts";
import { hashEvidenceReceiptRow } from "./evidenceReceipts.ts";
import type { SourceCatalogEntry } from "./sourceCatalog.ts";

export interface RawRowReceipt {
  sourceId: string;
  rawPath: string;
  rowHash: string;
  recordId: string;
}

export type RawRowReceiptStatus =
  | "exact"
  | "missing"
  | "duplicate"
  | "hash_mismatch"
  | "unsupported";

export interface RawRowReceiptVerification {
  status: RawRowReceiptStatus;
  message?: string;
}

interface CsvLocator {
  format: "csv";
  keyField: string;
}

interface JsonLocator {
  format: "json";
  recordPath: string[];
  keyField: string;
  supportsReceipt?: (receipt: RawRowReceipt) => boolean;
}

type RawRowLocator = CsvLocator | JsonLocator;

const sourceLocators = {
  "AR-CONTRATAR-OBRAS": { format: "csv", keyField: "numero_obra" },
  "AR-CONTRATAR-CONTRATOS": { format: "csv", keyField: "contrato_numero" },
  "AR-CONTRATAR-PROCEDIMIENTOS": { format: "csv", keyField: "procedimiento_numero" },
  "AR-SIPRO-PROVEEDORES": { format: "csv", keyField: "cuit___nit" },
  "AR-MAPA-INVERSIONES-OBRAS": { format: "csv", keyField: "idproyecto" },
  "AR-CIJ-VIALIDAD-VEREDICTO": {
    format: "json",
    recordPath: ["records"],
    keyField: "contextId",
    supportsReceipt: isPrimaryJsonContextReceipt,
  },
  "AR-MPF-VIALIDAD-ALEGATO": {
    format: "json",
    recordPath: ["records"],
    keyField: "contextId",
    supportsReceipt: isPrimaryJsonContextReceipt,
  },
  "AR-MPF-CUADERNOS-CAMARITA": {
    format: "json",
    recordPath: ["records"],
    keyField: "contextId",
    supportsReceipt: isPrimaryJsonContextReceipt,
  },
} satisfies Record<string, RawRowLocator>;

export async function verifyRawRowReceipt({
  rootDir,
  receipt,
  source,
  rawRowsByPath,
}: {
  rootDir: URL;
  receipt: RawRowReceipt;
  source: SourceCatalogEntry | undefined;
  rawRowsByPath: Map<string, Array<Record<string, unknown>> | null>;
}): Promise<RawRowReceiptVerification> {
  const locator = resolveLocator(receipt, source);
  if (!locator) return { status: "unsupported" };
  if ("supportsReceipt" in locator && locator.supportsReceipt && !locator.supportsReceipt(receipt)) {
    return { status: "unsupported" };
  }

  const rows = await getRawRows(rootDir, receipt.rawPath, locator, rawRowsByPath);
  if (!rows) {
    return {
      status: "missing",
      message: `row missing for ${receipt.sourceId} recordId ${receipt.recordId} (raw snapshot could not be parsed for row lookup; source schema drift or file readability issue)`,
    };
  }

  const candidates = rows.filter((row) => clean(row[locator.keyField]) === clean(receipt.recordId));
  if (candidates.length === 0) {
    return {
      status: "missing",
      message: `row missing for ${receipt.sourceId} recordId ${receipt.recordId} (raw row not found; source freshness or locator schema drift)`,
    };
  }

  const exactMatches = candidates.filter((row) => hashEvidenceReceiptRow(row) === receipt.rowHash);
  if (exactMatches.length === 1) return { status: "exact" };
  if (exactMatches.length > 1) {
    return {
      status: "duplicate",
      message: `duplicate row for ${receipt.sourceId} recordId ${receipt.recordId} (multiple raw rows share the locator and row hash)`,
    };
  }

  return {
    status: "hash_mismatch",
    message: `row hash mismatch for ${receipt.sourceId} recordId ${receipt.recordId} (${candidates.length} raw row candidate(s) found; source freshness or parser/schema drift)`,
  };
}

function resolveLocator(
  receipt: RawRowReceipt,
  source: SourceCatalogEntry | undefined,
): RawRowLocator | null {
  const sourceLocator = sourceLocators[receipt.sourceId as keyof typeof sourceLocators];
  if (sourceLocator) return sourceLocator;

  if (source?.format === "csv" && source.keyFields.length === 1) {
    return { format: "csv", keyField: source.keyFields[0] };
  }

  return null;
}

async function getRawRows(
  rootDir: URL,
  rawPath: string,
  locator: RawRowLocator,
  rawRowsByPath: Map<string, Array<Record<string, unknown>> | null>,
): Promise<Array<Record<string, unknown>> | null> {
  const cached = rawRowsByPath.get(rawPath);
  if (cached !== undefined) return cached;

  try {
    const text = await readFile(new URL(rawPath, rootDir), "utf8");
    const rows = locator.format === "csv"
      ? parseCsv<Record<string, string>>(text)
      : readJsonRows(text, locator.recordPath);
    rawRowsByPath.set(rawPath, rows);
    return rows;
  } catch {
    rawRowsByPath.set(rawPath, null);
    return null;
  }
}

function readJsonRows(text: string, recordPath: string[]): Array<Record<string, unknown>> {
  const parsed = JSON.parse(text) as unknown;
  const records = recordPath.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, parsed);
  if (!Array.isArray(records)) return [];
  return records.filter((record): record is Record<string, unknown> =>
    Boolean(record) && typeof record === "object" && !Array.isArray(record)
  );
}

function isPrimaryJsonContextReceipt(receipt: RawRowReceipt): boolean {
  return !receipt.recordId.includes(":");
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}
