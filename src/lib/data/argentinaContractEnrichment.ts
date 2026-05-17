import { createEvidenceReceipt, type EvidenceReceipt } from "./evidenceReceipts.ts";
import type { CrossCountryCaseFile } from "./crossCountryCases.ts";
import type {
  ArgentinaContractBuildContext,
  ArgentinaLocationRow,
  ArgentinaOfferRow,
  ArgentinaOpeningActRow,
  ArgentinaProcedureRow,
  ArgentinaSupplierRow,
  ArgentinaWorkLookupRow,
  BuildOptions,
} from "./argentinaContracts.ts";

export interface OfferStats {
  rows: ArgentinaOfferRow[];
  bidderCount: number;
  offerCount: number;
}

export function buildRelatedReceipts({
  work,
  supplier,
  procedure,
  locationRows,
  openingActs,
  offerStats,
  context,
  options,
  procedureNumber,
  workNumber,
}: {
  work: ArgentinaWorkLookupRow | undefined;
  supplier: ArgentinaSupplierRow | undefined;
  procedure: ArgentinaProcedureRow | undefined;
  locationRows: ArgentinaLocationRow[];
  openingActs: ArgentinaOpeningActRow[];
  offerStats: OfferStats | undefined;
  context: ArgentinaContractBuildContext;
  options: BuildOptions;
  procedureNumber: string;
  workNumber: string;
}): EvidenceReceipt[] {
  const receipts: EvidenceReceipt[] = [];
  pushReceipt(receipts, context.works?.source, work, clean(work?.numero_obra), options, "argentina-contract-work-link@1");
  pushReceipt(receipts, context.suppliers?.source, supplier, clean(supplier?.cuit___nit), options, "argentina-contract-supplier-link@1");
  pushReceipt(
    receipts,
    context.procedures?.source,
    procedure,
    clean(procedure?.procedimiento_numero),
    options,
    "argentina-contract-procedure-link@1",
  );

  if (locationRows.length > 0 && context.locations) {
    pushReceipt(
      receipts,
      context.locations.source,
      { numero_obra: workNumber, locations: locationRows },
      workNumber,
      options,
      "argentina-contract-location-link@1",
    );
  }
  if (offerStats && context.offers) {
    pushReceipt(
      receipts,
      context.offers.source,
      {
        procedimiento_numero: procedureNumber,
        bidderCount: offerStats.bidderCount,
        offerCount: offerStats.offerCount,
        offers: offerStats.rows,
      },
      procedureNumber,
      options,
      "argentina-contract-offer-stats@1",
    );
  }
  if (openingActs.length > 0 && context.openingActs) {
    pushReceipt(
      receipts,
      context.openingActs.source,
      { procedimiento_numero: procedureNumber, openingActs },
      procedureNumber,
      options,
      "argentina-contract-opening-act-link@1",
    );
  }
  return receipts;
}

export function buildCaveats({
  hasCoordinates,
  hasSupplier,
  hasCompetitionStats,
  hasLocation,
}: {
  hasCoordinates: boolean;
  hasSupplier: boolean;
  hasCompetitionStats: boolean;
  hasLocation: boolean;
}): string[] {
  return [
    "Contrato oficial de obra publica; no confirma pago ni avance fisico por si solo.",
    hasCoordinates
      ? "Ubicacion de obra cruzada con obra oficial por numero_obra; no se infiere desde el proveedor."
      : "La ubicacion de obra debe cruzarse con fuente geografica oficial antes de dibujarse en mapa.",
    hasLocation
      ? "Ubicacion administrativa declarada por CONTRAT.AR; puede haber multiples renglones por obra."
      : "Falta ubicacion administrativa declarada para esta obra.",
    hasSupplier
      ? "Datos de proveedor cruzados contra SIPRO; provincia/localidad del proveedor no equivalen a lugar de ejecucion."
      : "Proveedor tomado del contrato; falta cruce SIPRO para domicilio registrado.",
    hasCompetitionStats
      ? "Competencia calculada desde ofertas/actas de apertura; no equivale a evaluacion legal del proceso."
      : "Falta cruce de ofertas o acta de apertura para medir competencia del procedimiento.",
  ];
}

export function buildOfferStats(rows: ArgentinaOfferRow[]): Map<string, OfferStats> {
  const rowsByProcedure = groupBy(rows, (row) => clean(row.procedimiento_numero));
  const stats = new Map<string, OfferStats>();
  rowsByProcedure.forEach((procedureRows, procedureNumber) => {
    const bidders = new Set(
      procedureRows
        .map((row) => normalizeDocument(row.oferente_cuit) || clean(row.oferente_razon_social))
        .filter(Boolean),
    );
    stats.set(procedureNumber, {
      rows: procedureRows,
      bidderCount: bidders.size,
      offerCount: procedureRows.length,
    });
  });
  return stats;
}

export function summarizeLocation(rows: ArgentinaLocationRow[]) {
  if (rows.length === 0) return null;
  return {
    province: uniqueClean(rows.map((row) => row.provincia_nombre)).join(" / ") || null,
    department: uniqueClean(rows.map((row) => row.departamento_nombre)).join(" / ") || null,
    locality: uniqueClean(rows.map((row) => row.localidad_nombre)).join(" / ") || null,
  };
}

export function buildOfficialBudget(
  procedure: ArgentinaProcedureRow | undefined,
): { value: number; currency: string; label: string } | null {
  const value = parseMoney(procedure?.presupuesto_oficial_monto);
  if (value === null) return null;
  return { value, currency: "ARS", label: "presupuesto_oficial" };
}

export function normalizeDate(value: string | undefined): string | null {
  const cleaned = clean(value);
  const match = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function maxInteger(values: Array<string | undefined>): number | null {
  const parsed = values
    .map((value) => Number(clean(value)))
    .filter((value) => Number.isInteger(value));
  return parsed.length > 0 ? Math.max(...parsed) : null;
}

export function groupBy<TRow>(rows: TRow[], keyFor: (row: TRow) => string): Map<string, TRow[]> {
  const groups = new Map<string, TRow[]>();
  rows.forEach((row) => {
    const key = keyFor(row);
    if (key.length === 0) return;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  });
  return groups;
}

export function parseMoney(value: string | undefined): number | null {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDocument(value: string | undefined): string {
  return clean(value).replace(/\D/g, "");
}

export function clean(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

function pushReceipt(
  receipts: EvidenceReceipt[],
  source: BuildOptions | undefined,
  row: object | undefined,
  recordId: string,
  options: BuildOptions,
  parserVersion: string,
) {
  if (!source || !row || recordId.length === 0) return;
  receipts.push(createEvidenceReceipt({
    ...source,
    snapshotHash: source.fileHash,
    recordId,
    locatorType: "official_dataset",
    extractedAt: options.extractedAt,
    parserVersion,
    row: { ...row },
  }));
}

function uniqueClean(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}
