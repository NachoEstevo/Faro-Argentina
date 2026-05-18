import type { PeruContractRow } from "./crossCountryCases.ts";

export interface PeruHistoricalYearRows {
  year: number;
  fetchUrl: string;
  fileHash: string;
  rowCount: number;
  rows: PeruContractRow[];
}

export interface PeruHistoricalSelectionOptions {
  years: number[];
  perYear: number;
  minimumAmountPen: number;
  existingCaseIds?: Set<string>;
}

export interface SelectedPeruHistoricalContract {
  sourceYear: number;
  rank: number;
  score: number;
  reasons: string[];
  row: PeruContractRow;
}

interface Candidate {
  sourceYear: number;
  amount: number;
  caseId: string;
  row: PeruContractRow;
}

export function selectPeruHistoricalContracts(
  rowsByYear: PeruHistoricalYearRows[],
  options: PeruHistoricalSelectionOptions,
): SelectedPeruHistoricalContract[] {
  const requestedYears = new Set(options.years);
  const seenCaseIds = new Set(options.existingCaseIds ?? []);
  const selected: SelectedPeruHistoricalContract[] = [];

  for (const yearRows of rowsByYear.filter((rowGroup) => requestedYears.has(rowGroup.year))) {
    const candidates = yearRows.rows
      .map((row) => toCandidate(row, yearRows.year, seenCaseIds))
      .filter((candidate): candidate is Candidate => candidate !== null)
      .filter((candidate) => candidate.amount >= options.minimumAmountPen)
      .sort((left, right) => right.amount - left.amount || left.caseId.localeCompare(right.caseId));

    const selectedForYear: Candidate[] = [];
    for (const candidate of candidates) {
      if (seenCaseIds.has(candidate.caseId)) continue;
      selectedForYear.push(candidate);
      seenCaseIds.add(candidate.caseId);
      if (selectedForYear.length >= options.perYear) break;
    }

    selected.push(...selectedForYear.map((candidate, index) => ({
      sourceYear: yearRows.year,
      rank: index + 1,
      score: candidate.amount,
      reasons: [
        "high_value_per_year",
        "official_contract_url",
        "dated_contract",
        "supplier_document_present",
      ],
      row: candidate.row,
    })));
  }

  return selected;
}

export function buildPeruHistoricalSnapshotRows(
  selected: SelectedPeruHistoricalContract[],
): Array<SelectedPeruHistoricalContract & { caseId: string }> {
  return selected.map((item) => ({
    ...item,
    caseId: buildPeruContractCaseId(item.row),
  }));
}

export function buildPeruContractCaseId(row: PeruContractRow): string {
  const item = clean(row.num_item) || "item";
  return `PE-CONTRACT-${clean(row.codigo_contrato)}-${item}`;
}

function toCandidate(
  row: PeruContractRow,
  sourceYear: number,
  existingCaseIds: Set<string>,
): Candidate | null {
  const caseId = buildPeruContractCaseId(row);
  if (existingCaseIds.has(caseId)) return null;
  if (!hasRequiredText(row.codigo_contrato)) return null;
  if (!hasRequiredText(row.codigoconvocatoria)) return null;
  if (!hasRequiredText(row.descripcion_proceso)) return null;
  if (!hasRequiredText(row.ruc_contratista)) return null;
  if (!isOfficialUrl(row.urlcontrato)) return null;
  if (normalizePeruCurrency(row.moneda) !== "PEN") return null;

  const amount = parseMoney(row.monto_contratado_item) ?? parseMoney(row.monto_contratado_total);
  if (amount === null || amount <= 0) return null;

  const signedYear = extractYear(row.fecha_suscripcion_contrato);
  const publishedYear = extractYear(row.fecha_publicacion_contrato);
  if (signedYear !== sourceYear && publishedYear !== sourceYear) return null;

  return { sourceYear, amount, caseId, row };
}

function hasRequiredText(value: string | null | undefined): boolean {
  return clean(value).length > 0;
}

function isOfficialUrl(value: string | null | undefined): boolean {
  return /^https?:\/\/.+/i.test(clean(value));
}

function normalizePeruCurrency(value: string | null | undefined): "PEN" | "OTHER" {
  const cleaned = clean(value).toLowerCase();
  return cleaned.includes("sol") ? "PEN" : "OTHER";
}

function parseMoney(value: string | null | undefined): number | null {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractYear(value: string | null | undefined): number | null {
  const normalized = normalizeDate(value);
  return normalized ? Number(normalized.slice(0, 4)) : null;
}

function normalizeDate(value: string | null | undefined): string | null {
  const cleaned = clean(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const serial = Number(cleaned);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  return new Date(Math.round((serial - 25569) * 86_400_000)).toISOString().slice(0, 10);
}

function clean(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}
