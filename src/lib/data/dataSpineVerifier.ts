import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { SourceCatalogEntry } from "./sourceCatalog.ts";

interface VerifyDataset {
  source: {
    sourceId: string;
    filePath: string;
    fileHash: string;
  };
  snapshotProfile?: {
    fileHash?: string;
    columns?: string[];
  };
  cases: Array<{
    id: string;
    caveats?: string[];
    receipt?: VerifyReceipt;
    relatedReceipts?: VerifyReceipt[];
  }>;
}

interface VerifyReceipt {
  sourceId: string;
  rawPath: string;
  snapshotHash: string;
  fileHash: string;
  rowHash: string;
  locatorType: string;
  parserVersion: string;
}

export interface DataSpineVerificationReport {
  checkedDatasets: number;
  checkedCases: number;
  checkedReceipts: number;
  checkedRawFiles: number;
  errors: string[];
}

export async function verifyDataSpine({
  rootDir,
  sources,
  datasets,
}: {
  rootDir: URL;
  sources: SourceCatalogEntry[];
  datasets: VerifyDataset[];
}): Promise<DataSpineVerificationReport> {
  const errors: string[] = [];
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const sourceIds = new Set(sourceById.keys());
  const rawFileHashes = new Map<string, string>();
  let checkedCases = 0;
  let checkedReceipts = 0;

  for (const dataset of datasets) {
    if (!sourceIds.has(dataset.source.sourceId)) {
      errors.push(`${dataset.source.sourceId}: source missing from catalog`);
    }

    if (dataset.snapshotProfile?.fileHash !== dataset.source.fileHash) {
      errors.push(`${dataset.source.sourceId}: snapshot hash mismatch`);
    }
    validateCatalogKeyFields(dataset, sourceById.get(dataset.source.sourceId), errors);

    const rawHash = await hashRawFile(rootDir, dataset.source.filePath, errors);
    if (rawHash) {
      rawFileHashes.set(dataset.source.filePath, rawHash);
      if (rawHash !== dataset.source.fileHash) {
        errors.push(`${dataset.source.sourceId}: raw file hash mismatch`);
      }
    }

    for (const caseFile of dataset.cases) {
      checkedCases += 1;
      if (!caseFile.caveats || caseFile.caveats.length === 0) {
        errors.push(`${caseFile.id}: missing caveats`);
      }
      if (!caseFile.receipt) {
        errors.push(`${caseFile.id}: missing receipt`);
        continue;
      }

      checkedReceipts += 1;
      validateReceipt({
        caseId: caseFile.id,
        receipt: caseFile.receipt,
        label: "receipt",
        sourceIds,
        errors,
        expectedSourceId: dataset.source.sourceId,
        expectedRawPath: dataset.source.filePath,
        expectedHash: dataset.source.fileHash,
      });

      for (const relatedReceipt of caseFile.relatedReceipts ?? []) {
        checkedReceipts += 1;
        const relatedRawHash = await getRawFileHash({
          rootDir,
          relativePath: relatedReceipt.rawPath,
          rawFileHashes,
          errors,
        });
        validateReceipt({
          caseId: caseFile.id,
          receipt: relatedReceipt,
          label: "related receipt",
          sourceIds,
          errors,
          expectedHash: relatedRawHash ?? undefined,
        });
      }
    }
  }

  return {
    checkedDatasets: datasets.length,
    checkedCases,
    checkedReceipts,
    checkedRawFiles: rawFileHashes.size,
    errors,
  };
}

function validateCatalogKeyFields(
  dataset: VerifyDataset,
  source: SourceCatalogEntry | undefined,
  errors: string[],
) {
  if (!source || !dataset.snapshotProfile?.columns) return;
  const columns = new Set(dataset.snapshotProfile.columns);
  source.keyFields.forEach((keyField) => {
    if (!columns.has(keyField)) {
      errors.push(`${dataset.source.sourceId}: catalog keyField ${keyField} missing from snapshot`);
    }
  });
}

function validateReceipt({
  caseId,
  receipt,
  label,
  sourceIds,
  errors,
  expectedSourceId,
  expectedRawPath,
  expectedHash,
}: {
  caseId: string;
  receipt: VerifyReceipt;
  label: string;
  sourceIds: Set<string>;
  errors: string[];
  expectedSourceId?: string;
  expectedRawPath?: string;
  expectedHash?: string;
}) {
  if (!sourceIds.has(receipt.sourceId)) {
    errors.push(`${caseId}: ${label} source missing from catalog`);
  }
  if (expectedSourceId && receipt.sourceId !== expectedSourceId) {
    errors.push(`${caseId}: ${label} source mismatch`);
  }
  if (expectedRawPath && receipt.rawPath !== expectedRawPath) {
    errors.push(`${caseId}: ${label} raw path mismatch`);
  }
  if (expectedHash && receipt.snapshotHash !== expectedHash) {
    errors.push(`${caseId}: ${label} hash mismatch`);
  }
  if (!receipt.rowHash.startsWith("sha256-")) {
    errors.push(`${caseId}: missing ${label} row hash`);
  }
  if (receipt.locatorType === "missing") {
    errors.push(`${caseId}: missing ${label} locator`);
  }
  if (receipt.parserVersion.trim().length === 0) {
    errors.push(`${caseId}: missing ${label} parser version`);
  }
}

async function getRawFileHash({
  rootDir,
  relativePath,
  rawFileHashes,
  errors,
}: {
  rootDir: URL;
  relativePath: string;
  rawFileHashes: Map<string, string>;
  errors: string[];
}): Promise<string | null> {
  const cached = rawFileHashes.get(relativePath);
  if (cached) return cached;
  const hash = await hashRawFile(rootDir, relativePath, errors);
  if (hash) rawFileHashes.set(relativePath, hash);
  return hash;
}

async function hashRawFile(
  rootDir: URL,
  relativePath: string,
  errors: string[],
): Promise<string | null> {
  try {
    const bytes = await readFile(new URL(relativePath, rootDir));
    return `sha256-${createHash("sha256").update(bytes).digest("hex")}`;
  } catch (error) {
    errors.push(`${relativePath}: raw file unreadable`);
    return null;
  }
}
