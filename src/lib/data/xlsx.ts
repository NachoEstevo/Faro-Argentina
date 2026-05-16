import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export interface XlsxReadOptions {
  sheetPath?: string;
  limit?: number;
}

export interface XlsxSheetRows {
  sheetPath: string;
  dimension: string | null;
  rows: Array<Record<string, string>>;
}

export interface XlsxSnapshotProfile {
  sourceId: string;
  rawPath: string;
  fileHash: string;
  byteSize: number;
  sheetPath: string;
  dimension: string | null;
  rowCount: number;
  columns: string[];
}

export function readXlsxRows(buffer: Buffer, options: XlsxReadOptions = {}): XlsxSheetRows {
  const entries = readZipEntries(buffer);
  const sheetPath = options.sheetPath ?? "xl/worksheets/sheet1.xml";
  const sheetXml = readZipText(entries, sheetPath);
  const sharedStrings = entries.has("xl/sharedStrings.xml")
    ? readSharedStrings(readZipText(entries, "xl/sharedStrings.xml"))
    : [];
  const dimension = sheetXml.match(/<dimension[^>]*ref="([^"]+)"/)?.[1] ?? null;
  const rowMatches = sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g);
  const parsedRows: string[][] = [];
  const maxRows = options.limit === undefined ? Number.POSITIVE_INFINITY : options.limit + 1;

  for (const match of rowMatches) {
    parsedRows.push(parseRow(match[1] ?? "", sharedStrings));
    if (parsedRows.length >= maxRows) break;
  }

  const headers = (parsedRows[0] ?? []).map((header) => header.trim());
  const rows = parsedRows.slice(1).map((row) => rowToObject(headers, row));
  return { sheetPath, dimension, rows };
}

export function profileXlsxSnapshot({
  sourceId,
  rawPath,
  buffer,
}: {
  sourceId: string;
  rawPath: string;
  buffer: Buffer;
}): XlsxSnapshotProfile {
  const sheet = readXlsxRows(buffer, { limit: 1 });
  const columns = sheet.rows[0] ? Object.keys(sheet.rows[0]) : [];
  return {
    sourceId,
    rawPath,
    fileHash: `sha256-${createHash("sha256").update(buffer).digest("hex")}`,
    byteSize: buffer.byteLength,
    sheetPath: sheet.sheetPath,
    dimension: sheet.dimension,
    rowCount: inferXlsxRowCount(sheet.dimension),
    columns,
  };
}

export function inferXlsxRowCount(dimension: string | null): number {
  if (!dimension) return 0;
  const lastCell = dimension.includes(":") ? dimension.split(":").at(-1) : dimension;
  const rowMatch = lastCell?.match(/\d+$/);
  const rowsIncludingHeader = rowMatch ? Number(rowMatch[0]) : 0;
  return Math.max(rowsIncludingHeader - 1, 0);
}

function parseRow(rowXml: string, sharedStrings: string[]): string[] {
  const cells: string[] = [];
  const cellMatches = rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g);
  for (const match of cellMatches) {
    const attributes = match[1] ?? "";
    const body = match[2] ?? "";
    const ref = getAttribute(attributes, "r");
    const columnIndex = ref ? columnIndexFromRef(ref) : cells.length;
    cells[columnIndex] = readCellValue(body, getAttribute(attributes, "t"), sharedStrings);
  }
  return cells.map((value) => value ?? "");
}

function readCellValue(body: string, type: string | null, sharedStrings: string[]): string {
  if (type === "inlineStr") return readInlineText(body);
  const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
  if (type === "s") return sharedStrings[Number(rawValue)] ?? "";
  return decodeXml(rawValue);
}

function readInlineText(body: string): string {
  return Array.from(body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))
    .map((match) => decodeXml(match[1] ?? ""))
    .join("");
}

function readSharedStrings(xml: string): string[] {
  return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map((match) =>
    readInlineText(match[1] ?? ""),
  );
}

function rowToObject(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((record, header, index) => {
    if (header.length > 0) record[header] = row[index] ?? "";
    return record;
  }, {});
}

function getAttribute(attributes: string, name: string): string | null {
  return attributes.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
}

function columnIndexFromRef(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  return [...letters].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function decodeXml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function readZipText(entries: Map<string, Buffer>, path: string): string {
  const entry = entries.get(path);
  if (!entry) throw new Error(`Missing XLSX entry: ${path}`);
  return entry.toString("utf8");
}

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const directoryOffset = findCentralDirectoryOffset(buffer);
  const totalEntries = buffer.readUInt16LE(directoryOffset + 10);
  let cursor = buffer.readUInt32LE(directoryOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid ZIP directory");
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.toString("utf8", cursor + 46, cursor + 46 + fileNameLength);
    entries.set(fileName, readLocalFile(buffer, localHeaderOffset, compressedSize, method));
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readLocalFile(
  buffer: Buffer,
  localHeaderOffset: number,
  compressedSize: number,
  method: number,
): Buffer {
  if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error("Invalid ZIP local file");
  }
  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const start = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(start, start + compressedSize);
  if (method === 0) return compressed;
  if (method === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP compression method: ${method}`);
}

function findCentralDirectoryOffset(buffer: Buffer): number {
  for (let cursor = buffer.length - 22; cursor >= 0; cursor -= 1) {
    if (buffer.readUInt32LE(cursor) === 0x06054b50) return cursor;
  }
  throw new Error("ZIP central directory not found");
}
