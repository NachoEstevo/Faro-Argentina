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
  };
  cases: Array<{
    id: string;
    caveats?: string[];
    receipt?: {
      sourceId: string;
      rawPath: string;
      snapshotHash: string;
      fileHash: string;
      rowHash: string;
      locatorType: string;
      parserVersion: string;
    };
  }>;
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
  const sourceIds = new Set(sources.map((source) => source.sourceId));
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
      if (caseFile.receipt.sourceId !== dataset.source.sourceId) {
        errors.push(`${caseFile.id}: receipt source mismatch`);
      }
      if (caseFile.receipt.rawPath !== dataset.source.filePath) {
        errors.push(`${caseFile.id}: receipt raw path mismatch`);
      }
      if (caseFile.receipt.snapshotHash !== dataset.source.fileHash) {
        errors.push(`${caseFile.id}: receipt hash mismatch`);
      }
      if (!caseFile.receipt.rowHash.startsWith("sha256-")) {
        errors.push(`${caseFile.id}: missing row hash`);
      }
      if (caseFile.receipt.locatorType === "missing") {
        errors.push(`${caseFile.id}: missing locator`);
      }
      if (caseFile.receipt.parserVersion.trim().length === 0) {
        errors.push(`${caseFile.id}: missing parser version`);
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
