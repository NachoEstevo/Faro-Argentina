import { createHash } from "node:crypto";

import { parseCsv } from "./argentinaWorks.ts";

export interface CsvSnapshotInput {
  sourceId: string;
  rawPath: string;
  text: string;
  keyColumns: string[];
}

export interface KeyColumnProfile {
  emptyCount: number;
  emptyRatio: number;
}

export interface CsvSnapshotProfile {
  sourceId: string;
  rawPath: string;
  fileHash: string;
  byteSize: number;
  rowCount: number;
  columns: string[];
  keyColumnProfiles: Record<string, KeyColumnProfile>;
}

export function profileCsvSnapshot(input: CsvSnapshotInput): CsvSnapshotProfile {
  const rows = parseCsv<Record<string, string>>(input.text);
  const columns = readHeader(input.text);
  const rowCount = rows.length;
  const keyColumnProfiles = Object.fromEntries(
    input.keyColumns.map((column) => [column, profileKeyColumn(rows, column)]),
  );

  return {
    sourceId: input.sourceId,
    rawPath: input.rawPath,
    fileHash: `sha256-${createHash("sha256").update(input.text).digest("hex")}`,
    byteSize: Buffer.byteLength(input.text, "utf8"),
    rowCount,
    columns,
    keyColumnProfiles,
  };
}

function profileKeyColumn(
  rows: Array<Record<string, string>>,
  column: string,
): KeyColumnProfile {
  const emptyCount = rows.filter((row) => clean(row[column]).length === 0).length;
  const emptyRatio = rows.length === 0 ? 1 : emptyCount / rows.length;
  return { emptyCount, emptyRatio };
}

function readHeader(text: string): string[] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.split(",").map((column) => column.trim());
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
