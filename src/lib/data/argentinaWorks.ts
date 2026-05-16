import {
  createEvidenceReceipt,
  type EvidenceReceipt,
} from "./evidenceReceipts.ts";

export interface RawArgentinaWorkRow {
  procedimiento_numero: string;
  uoc_codigo: string;
  uoc_descripcion: string;
  organismo_codigo_saf: string;
  organismo_nombre: string;
  expediente_procedimiento_numero: string;
  numero_obra: string;
  nombre_obra: string;
  ues_nombre: string;
  plazo_ejecucion_obra: string;
  plazo_ejecucion_obra_tipo: string;
  latitud_1: string;
  longitud_1: string;
  latitud_2: string;
  longitud_2: string;
}

export type SourceReceipt = EvidenceReceipt;

export interface ArgentinaWorkCase {
  id: string;
  countryCode: "AR";
  workNumber: string;
  year: number | null;
  title: string;
  procedureNumber: string;
  agencyName: string;
  agencyCode: string;
  contractingUnit: string;
  executionTerm: string | null;
  executionTermType: string | null;
  coordinates: { lat: number; lon: number } | null;
  evidenceLevel: "official_dataset";
  receipt: SourceReceipt;
  caveats: string[];
}

interface BuildOptions {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  extractedAt: string;
  fileHash: string;
  rawPath: string;
  parserVersion: string;
}

export function parseCsv<T extends object = Record<string, string>>(text: string): T[] {
  const rows = parseCsvRows(text.trim());
  const header = rows[0] ?? [];
  return rows.slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        record[key] = row[index] ?? "";
      });
      return record as T;
    });
}

export function buildArgentinaWorkCases(
  rows: RawArgentinaWorkRow[],
  options: BuildOptions,
): ArgentinaWorkCase[] {
  return rows
    .filter((row) => clean(row.numero_obra).length > 0)
    .map((row) => {
      const workNumber = clean(row.numero_obra);
      return {
        id: `AR-WORK-${workNumber}`,
        countryCode: "AR",
        workNumber,
        year: parseProcedureYear(row.procedimiento_numero),
        title: clean(row.nombre_obra) || workNumber,
        procedureNumber: clean(row.procedimiento_numero),
        agencyName: clean(row.organismo_nombre),
        agencyCode: clean(row.organismo_codigo_saf),
        contractingUnit: clean(row.uoc_descripcion),
        executionTerm: nullable(row.plazo_ejecucion_obra),
        executionTermType: nullable(row.plazo_ejecucion_obra_tipo),
        coordinates: parseCoordinates(row.latitud_1, row.longitud_1),
        evidenceLevel: "official_dataset",
        receipt: createEvidenceReceipt({
          sourceId: options.sourceId,
          sourceName: options.sourceName,
          sourceUrl: options.sourceUrl,
          rawPath: options.rawPath,
          snapshotHash: options.fileHash,
          extractedAt: options.extractedAt,
          recordId: workNumber,
          locatorType: "official_dataset",
          parserVersion: options.parserVersion,
          row: { ...row },
        }),
        caveats: [
          "No confirma pagos ni avance físico por sí solo; muestra una obra declarada en fuente oficial.",
          "Las coordenadas corresponden al dataset oficial cuando están presentes.",
        ],
      };
    });
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      current = "";
      row = [];
      continue;
    }
    current += char;
  }

  row.push(current);
  rows.push(row);
  return rows;
}

function parseCoordinates(latRaw: string, lonRaw: string): { lat: number; lon: number } | null {
  const lat = Number(clean(latRaw));
  const lon = Number(clean(lonRaw));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function parseProcedureYear(procedureNumber: string): number | null {
  const match = clean(procedureNumber).match(/(\d{2})$/);
  if (!match) return null;
  const shortYear = Number(match[1]);
  if (!Number.isInteger(shortYear)) return null;
  return 2000 + shortYear;
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function nullable(value: string | null | undefined): string | null {
  const cleaned = clean(value);
  return cleaned.length > 0 ? cleaned : null;
}
