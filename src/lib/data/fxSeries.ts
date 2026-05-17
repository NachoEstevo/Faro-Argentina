import type { FxRateEntry, FxSeries, FxSourceMeta } from "./fx.ts";

export interface FxSeriesProfile {
  currency: string;
  dateColumn: string;
  rateColumn: string;
  dateFormat: "iso" | "dd/MM/yyyy";
  delimiter: "," | ";";
  sourceMeta: FxSourceMeta;
}

export function parseFxCsv(text: string, profile: FxSeriesProfile): FxSeries {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return new Map();

  const header = splitRow(lines[0], profile.delimiter);
  const dateIndex = header.indexOf(profile.dateColumn);
  const rateIndex = header.indexOf(profile.rateColumn);
  if (dateIndex === -1 || rateIndex === -1) {
    throw new Error(
      `parseFxCsv: missing required columns (${profile.dateColumn}, ${profile.rateColumn}) in header: ${header.join("|")}`,
    );
  }

  const series: FxSeries = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitRow(lines[i], profile.delimiter);
    const date = normalizeDate(cells[dateIndex], profile.dateFormat);
    const rate = parseRate(cells[rateIndex], profile.delimiter);
    if (date === null || rate === null) continue;
    const entry: FxRateEntry = { rate, sourceMeta: profile.sourceMeta };
    series.set(date, entry);
  }
  return series;
}

function splitRow(line: string, delimiter: "," | ";"): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

function normalizeDate(
  raw: string | undefined,
  format: FxSeriesProfile["dateFormat"],
): string | null {
  if (!raw) return null;
  if (format === "iso") {
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
  }
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function parseRate(raw: string | undefined, delimiter: "," | ";"): number | null {
  if (!raw) return null;
  const normalized = delimiter === ";" ? raw.replace(",", ".") : raw;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}
