import { parseCsv } from "./argentinaWorks.ts";
import { createEvidenceReceipt } from "./evidenceReceipts.ts";
import type { ArgentinaContractCaseFile } from "./argentinaContractCases.ts";
import { attachFx, yearAsAnchor } from "./fxAttach.ts";
import {
  buildCaveats,
  buildOfferStats,
  buildOfficialBudget,
  buildRelatedReceipts,
  clean,
  groupBy,
  maxInteger,
  normalizeDate,
  normalizeDocument,
  parseMoney,
  summarizeLocation,
  type OfferStats,
} from "./argentinaContractEnrichment.ts";

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

export interface ArgentinaProcedureRow {
  procedimiento_numero: string;
  procedimiento_nombre?: string;
  procedimiento_objeto?: string;
  procedimiento_estado?: string;
  procedimiento_tipo?: string;
  presupuesto_oficial_monto?: string;
  publicacion_contratar_fecha?: string;
  consultas_fin_fecha?: string;
}

export interface ArgentinaOfferRow {
  procedimiento_numero: string;
  oferente_cuit: string;
  oferente_razon_social: string;
  oferta_monto: string;
  evaluada_si_no?: string;
  desestimada_si_no?: string;
  orden_merito?: string;
}

export interface ArgentinaLocationRow {
  numero_obra: string;
  provincia_nombre?: string;
  departamento_nombre?: string;
  localidad_nombre?: string;
  renglon_numero?: string;
}

export interface ArgentinaOpeningActRow {
  procedimiento_numero: string;
  id_acta_apertura?: string;
  fecha_creacion?: string;
  cantidad_ofertas_confirmadas?: string;
  id_oferta?: string;
  id_proveedor?: string;
  razon_social?: string;
}

export interface BuildOptions {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  rawPath: string;
  fileHash: string;
  extractedAt: string;
  parserVersion: string;
  fxRegistry?: import("./fx.ts").FxSeriesRegistry;
}

export interface RelatedSource<TRow> {
  rows: TRow[];
  source: BuildOptions;
}

export interface ArgentinaContractBuildContext {
  limit?: number;
  works?: RelatedSource<ArgentinaWorkLookupRow>;
  suppliers?: RelatedSource<ArgentinaSupplierRow>;
  procedures?: RelatedSource<ArgentinaProcedureRow>;
  offers?: RelatedSource<ArgentinaOfferRow>;
  locations?: RelatedSource<ArgentinaLocationRow>;
  openingActs?: RelatedSource<ArgentinaOpeningActRow>;
}

export function buildArgentinaContractCases(
  text: string,
  options: BuildOptions,
  limitOrContext: number | ArgentinaContractBuildContext = 50,
): ArgentinaContractCaseFile[] {
  const context = normalizeContext(limitOrContext);
  const worksByNumber = indexBy(context.works?.rows ?? [], (row) => clean(row.numero_obra));
  const suppliersByDocument = indexBy(
    context.suppliers?.rows ?? [],
    (row) => normalizeDocument(row.cuit___nit),
  );
  const proceduresByNumber = indexBy(
    context.procedures?.rows ?? [],
    (row) => clean(row.procedimiento_numero),
  );
  const locationsByWork = groupBy(
    context.locations?.rows ?? [],
    (row) => clean(row.numero_obra),
  );
  const openingActsByProcedure = groupBy(
    context.openingActs?.rows ?? [],
    (row) => clean(row.procedimiento_numero),
  );
  const offerStatsByProcedure = buildOfferStats(context.offers?.rows ?? []);

  return uniqueContractRows(parseCsv<ArgentinaContractRow>(text))
    .slice(0, context.limit)
    .map((row) =>
      buildCase({
        row,
        options,
        context,
        worksByNumber,
        suppliersByDocument,
        proceduresByNumber,
        locationsByWork,
        openingActsByProcedure,
        offerStatsByProcedure,
      })
    );
}

function uniqueContractRows(rows: ArgentinaContractRow[]): ArgentinaContractRow[] {
  const seen = new Set<string>();
  const uniqueRows: ArgentinaContractRow[] = [];
  for (const row of rows) {
    const contractNumber = clean(row.contrato_numero);
    if (!contractNumber || seen.has(contractNumber)) continue;
    seen.add(contractNumber);
    uniqueRows.push(row);
  }
  return uniqueRows;
}

function buildCase({
  row,
  options,
  context,
  worksByNumber,
  suppliersByDocument,
  proceduresByNumber,
  locationsByWork,
  openingActsByProcedure,
  offerStatsByProcedure,
}: {
  row: ArgentinaContractRow;
  options: BuildOptions;
  context: Required<Pick<ArgentinaContractBuildContext, "limit">> & ArgentinaContractBuildContext;
  worksByNumber: Map<string, ArgentinaWorkLookupRow>;
  suppliersByDocument: Map<string, ArgentinaSupplierRow>;
  proceduresByNumber: Map<string, ArgentinaProcedureRow>;
  locationsByWork: Map<string, ArgentinaLocationRow[]>;
  openingActsByProcedure: Map<string, ArgentinaOpeningActRow[]>;
  offerStatsByProcedure: Map<string, OfferStats>;
}): ArgentinaContractCaseFile {
  const contractNumber = clean(row.contrato_numero);
  const workNumber = clean(row.numero_obra);
  const procedureNumber = clean(row.procedimiento_numero);
  const work = worksByNumber.get(workNumber);
  const supplier = suppliersByDocument.get(normalizeDocument(row.contratista_cuit));
  const procedure = proceduresByNumber.get(procedureNumber);
  const locationRows = locationsByWork.get(workNumber) ?? [];
  const location = summarizeLocation(locationRows);
  const openingActs = openingActsByProcedure.get(procedureNumber) ?? [];
  const offerStats = offerStatsByProcedure.get(procedureNumber);
  const openingOfferCount = maxInteger(openingActs.map((act) => act.cantidad_ofertas_confirmadas));
  const amount = parseMoney(row.contrato_monto);
  const coordinates = work ? parseCoordinates(work.latitud_1, work.longitud_1) : null;
  const procedureTitle = clean(procedure?.procedimiento_nombre)
    || clean(row.procedimiento_nombre)
    || clean(procedure?.procedimiento_objeto);
  const title = selectContractTitle({
    workTitle: work?.nombre_obra,
    contractWorkTitle: row.nombre_obra,
    procedureTitle,
    fallback: contractNumber,
  });

  return {
    id: `AR-CONTRACT-${contractNumber}`,
    countryCode: "AR",
    caseType: "procurement_contract",
    workNumber: contractNumber,
    publicWorkNumber: workNumber || null,
    year: parseYear(clean(row.contrato_perfeccionamiento_fecha).slice(0, 4)),
    title,
    procedureNumber,
    agencyName: clean(row.organismo_nombre),
    agencyCode: clean(row.organismo_codigo_saf),
    contractingUnit: clean(row.uoc_descripcion),
    executionTerm: null,
    executionTermType: null,
    coordinates,
    locationName: clean(work?.nombre_obra) || null,
    locationSource: coordinates ? context.works?.source.sourceId ?? null : null,
    workProvince: location?.province ?? null,
    workDepartment: location?.department ?? null,
    workLocality: location?.locality ?? null,
    publishedAt: normalizeDate(procedure?.publicacion_contratar_fecha),
    closedAt: normalizeDate(procedure?.consultas_fin_fecha),
    openingAt: normalizeDate(openingActs[0]?.fecha_creacion),
    procedureState: clean(procedure?.procedimiento_estado) || null,
    procurementMethodDetails: clean(procedure?.procedimiento_tipo) || null,
    bidderCount: offerStats?.bidderCount ?? openingOfferCount,
    offerCount: offerStats?.offerCount ?? openingOfferCount,
    evidenceLevel: "official_dataset",
    amount: attachFx(
      amount === null
        ? null
        : { value: amount, currency: clean(row.contrato_moneda) || "ARS", label: "monto_contrato" },
      [
        { field: "contract_signed", date: normalizeDate(row.contrato_perfeccionamiento_fecha) },
        { field: "opening", date: normalizeDate(openingActs[0]?.fecha_creacion) },
        { field: "published", date: normalizeDate(procedure?.publicacion_contratar_fecha) },
        { field: "year", date: yearAsAnchor(normalizeDate(row.contrato_perfeccionamiento_fecha)) },
      ],
      options.fxRegistry,
    ),
    officialBudget: attachFx(
      buildOfficialBudget(procedure),
      [
        { field: "contract_signed", date: normalizeDate(row.contrato_perfeccionamiento_fecha) },
        { field: "opening", date: normalizeDate(openingActs[0]?.fecha_creacion) },
        { field: "published", date: normalizeDate(procedure?.publicacion_contratar_fecha) },
        { field: "year", date: yearAsAnchor(normalizeDate(row.contrato_perfeccionamiento_fecha)) },
      ],
      options.fxRegistry,
    ),
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
    relatedReceipts: buildRelatedReceipts({
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
    }),
    caveats: buildCaveats({
      hasCoordinates: Boolean(coordinates),
      hasSupplier: Boolean(supplier),
      hasCompetitionStats: Boolean(offerStats || openingOfferCount !== null),
      hasLocation: locationRows.length > 0,
    }),
  };
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

function selectContractTitle({
  workTitle,
  contractWorkTitle,
  procedureTitle,
  fallback,
}: {
  workTitle?: string;
  contractWorkTitle?: string;
  procedureTitle?: string;
  fallback: string;
}): string {
  const informativeWorkTitle = [workTitle, contractWorkTitle]
    .map((value) => clean(value))
    .find((value) => value.length > 0 && !isGenericWorkTitle(value));

  return informativeWorkTitle
    || clean(procedureTitle)
    || clean(workTitle)
    || clean(contractWorkTitle)
    || fallback;
}

function isGenericWorkTitle(value: string): boolean {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return normalized === "VIALIDAD";
}

function indexBy<TRow>(rows: TRow[], keyFor: (row: TRow) => string): Map<string, TRow> {
  const index = new Map<string, TRow>();
  rows.forEach((row) => {
    const key = keyFor(row);
    if (key.length > 0 && !index.has(key)) index.set(key, row);
  });
  return index;
}

function parseYear(value: string | undefined): number | null {
  const cleaned = clean(value);
  if (/^\d{4}$/.test(cleaned)) return Number(cleaned);
  return null;
}
