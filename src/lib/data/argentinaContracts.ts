import { parseCsv } from "./argentinaWorks.ts";
import { createEvidenceReceipt, type EvidenceReceipt } from "./evidenceReceipts.ts";
import type { CrossCountryCaseFile } from "./crossCountryCases.ts";

export interface ArgentinaContractRow {
  contrato_numero: string;
  procedimiento_numero: string;
  procedimiento_nombre: string;
  uoc_codigo: string;
  uoc_descripcion: string;
  organismo_codigo_saf: string;
  organismo_nombre: string;
  expediente_procedimiento_numero: string;
  numero_obra: string;
  nombre_obra: string;
  contrato_perfeccionamiento_fecha: string;
  contratista_cuit: string;
  contratista_razon_social: string;
  contrato_monto: string;
  contrato_moneda: string;
}

export interface ArgentinaWorkLookupRow {
  numero_obra: string;
  nombre_obra?: string;
  latitud_1?: string;
  longitud_1?: string;
}

export interface ArgentinaSupplierRow {
  cuit___nit: string;
  razon_social: string;
  localidad: string;
  provincia: string;
}

interface BuildOptions {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  rawPath: string;
  fileHash: string;
  extractedAt: string;
  parserVersion: string;
}

interface RelatedSource<TRow> {
  rows: TRow[];
  source: BuildOptions;
}

export interface ArgentinaContractBuildContext {
  limit?: number;
  works?: RelatedSource<ArgentinaWorkLookupRow>;
  suppliers?: RelatedSource<ArgentinaSupplierRow>;
}

export function buildArgentinaContractCases(
  text: string,
  options: BuildOptions,
  limitOrContext: number | ArgentinaContractBuildContext = 50,
): CrossCountryCaseFile[] {
  const context = normalizeContext(limitOrContext);
  const worksByNumber = indexBy(context.works?.rows ?? [], (row) => clean(row.numero_obra));
  const suppliersByDocument = indexBy(
    context.suppliers?.rows ?? [],
    (row) => normalizeDocument(row.cuit___nit),
  );

  return parseCsv<ArgentinaContractRow>(text)
    .filter((row) => clean(row.contrato_numero).length > 0)
    .slice(0, context.limit)
    .map((row) => buildCase(row, options, context, worksByNumber, suppliersByDocument));
}

function buildCase(
  row: ArgentinaContractRow,
  options: BuildOptions,
  context: Required<Pick<ArgentinaContractBuildContext, "limit">> & ArgentinaContractBuildContext,
  worksByNumber: Map<string, ArgentinaWorkLookupRow>,
  suppliersByDocument: Map<string, ArgentinaSupplierRow>,
): CrossCountryCaseFile {
  const contractNumber = clean(row.contrato_numero);
  const workNumber = clean(row.numero_obra);
  const work = worksByNumber.get(workNumber);
  const supplier = suppliersByDocument.get(normalizeDocument(row.contratista_cuit));
  const amount = parseMoney(row.contrato_monto);
  const coordinates = work ? parseCoordinates(work.latitud_1, work.longitud_1) : null;
  const relatedReceipts = buildRelatedReceipts({ work, supplier, context, options });

  return {
    id: `AR-CONTRACT-${contractNumber}`,
    countryCode: "AR",
    caseType: "procurement_contract",
    workNumber: contractNumber,
    publicWorkNumber: workNumber || null,
    year: parseYear(clean(row.contrato_perfeccionamiento_fecha).slice(0, 4)),
    title: clean(row.nombre_obra) || clean(row.procedimiento_nombre) || contractNumber,
    procedureNumber: clean(row.procedimiento_numero),
    agencyName: clean(row.organismo_nombre),
    agencyCode: clean(row.organismo_codigo_saf),
    contractingUnit: clean(row.uoc_descripcion),
    executionTerm: null,
    executionTermType: null,
    coordinates,
    locationName: clean(work?.nombre_obra) || null,
    locationSource: coordinates ? context.works?.source.sourceId ?? null : null,
    evidenceLevel: "official_dataset",
    amount: amount === null
      ? null
      : { value: amount, currency: clean(row.contrato_moneda) || "ARS", label: "monto_contrato" },
    supplierName: clean(supplier?.razon_social) || clean(row.contratista_razon_social) || null,
    supplierDocument: clean(row.contratista_cuit) || null,
    supplierLocality: clean(supplier?.localidad) || null,
    supplierProvince: clean(supplier?.provincia) || null,
    receipt: createEvidenceReceipt({
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      sourceUrl: options.sourceUrl,
      rawPath: options.rawPath,
      snapshotHash: options.fileHash,
      recordId: contractNumber,
      locatorType: "official_dataset",
      extractedAt: options.extractedAt,
      parserVersion: options.parserVersion,
      row: { ...row },
    }),
    relatedReceipts,
    caveats: buildCaveats(Boolean(coordinates), Boolean(supplier)),
  };
}

function buildRelatedReceipts({
  work,
  supplier,
  context,
  options,
}: {
  work: ArgentinaWorkLookupRow | undefined;
  supplier: ArgentinaSupplierRow | undefined;
  context: ArgentinaContractBuildContext;
  options: BuildOptions;
}): EvidenceReceipt[] {
  const receipts: EvidenceReceipt[] = [];
  if (work && context.works) {
    receipts.push(createEvidenceReceipt({
      ...context.works.source,
      snapshotHash: context.works.source.fileHash,
      recordId: clean(work.numero_obra),
      locatorType: "official_dataset",
      extractedAt: options.extractedAt,
      parserVersion: "argentina-contract-work-link@1",
      row: { ...work },
    }));
  }
  if (supplier && context.suppliers) {
    receipts.push(createEvidenceReceipt({
      ...context.suppliers.source,
      snapshotHash: context.suppliers.source.fileHash,
      recordId: clean(supplier.cuit___nit),
      locatorType: "official_dataset",
      extractedAt: options.extractedAt,
      parserVersion: "argentina-contract-supplier-link@1",
      row: { ...supplier },
    }));
  }
  return receipts;
}

function buildCaveats(hasCoordinates: boolean, hasSupplier: boolean): string[] {
  return [
    "Contrato oficial de obra publica; no confirma pago ni avance fisico por si solo.",
    hasCoordinates
      ? "Ubicacion de obra cruzada con obra oficial por numero_obra; no se infiere desde el proveedor."
      : "La ubicacion de obra debe cruzarse con fuente geografica oficial antes de dibujarse en mapa.",
    hasSupplier
      ? "Datos de proveedor cruzados contra SIPRO; provincia/localidad del proveedor no equivalen a lugar de ejecucion."
      : "Proveedor tomado del contrato; falta cruce SIPRO para domicilio registrado.",
  ];
}

function normalizeContext(
  limitOrContext: number | ArgentinaContractBuildContext,
): Required<Pick<ArgentinaContractBuildContext, "limit">> & ArgentinaContractBuildContext {
  if (typeof limitOrContext === "number") return { limit: limitOrContext };
  return { ...limitOrContext, limit: limitOrContext.limit ?? 50 };
}

function parseCoordinates(
  latRaw: string | undefined,
  lonRaw: string | undefined,
): { lat: number; lon: number } | null {
  const lat = Number(clean(latRaw));
  const lon = Number(clean(lonRaw));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function indexBy<TRow>(rows: TRow[], keyFor: (row: TRow) => string): Map<string, TRow> {
  const index = new Map<string, TRow>();
  rows.forEach((row) => {
    const key = keyFor(row);
    if (key.length > 0 && !index.has(key)) index.set(key, row);
  });
  return index;
}

function parseMoney(value: string): number | null {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseYear(value: string | undefined): number | null {
  const cleaned = clean(value);
  if (/^\d{4}$/.test(cleaned)) return Number(cleaned);
  return null;
}

function normalizeDocument(value: string | undefined): string {
  return clean(value).replace(/\D/g, "");
}

function clean(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}
