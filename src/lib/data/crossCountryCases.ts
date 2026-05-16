import { createEvidenceReceipt, type EvidenceReceipt } from "./evidenceReceipts.ts";
import { parseCsv } from "./argentinaWorks.ts";

export {
  buildArgentinaContractCases,
  type ArgentinaContractBuildContext,
  type ArgentinaContractRow,
  type ArgentinaLocationRow,
  type ArgentinaOfferRow,
  type ArgentinaOpeningActRow,
  type ArgentinaProcedureRow,
  type ArgentinaSupplierRow,
  type ArgentinaWorkLookupRow,
} from "./argentinaContracts.ts";

export type CrossCountryCode = "AR" | "PE" | "CL";
export type CrossCountryCaseType =
  | "budget_execution"
  | "procurement_process"
  | "procurement_contract";

export interface CrossCountryCaseFile {
  id: string;
  countryCode: CrossCountryCode;
  caseType: CrossCountryCaseType;
  workNumber: string;
  publicWorkNumber?: string | null;
  year: number | null;
  title: string;
  procedureNumber: string;
  agencyName: string;
  agencyCode: string;
  contractingUnit: string;
  executionTerm: string | null;
  executionTermType: string | null;
  coordinates: { lat: number; lon: number } | null;
  locationName?: string | null;
  locationSource?: string | null;
  publishedAt?: string | null;
  closedAt?: string | null;
  openingAt?: string | null;
  awardedAt?: string | null;
  awardActUrl?: string | null;
  awardNumber?: string | null;
  procedureState?: string | null;
  bidderCount?: number | null;
  offerCount?: number | null;
  claimCount?: number | null;
  buyerUnitCode?: string | null;
  buyerUnitRut?: string | null;
  buyerDepartment?: string | null;
  buyerRegion?: string | null;
  buyerCommune?: string | null;
  procurementMethodDetails?: string | null;
  itemCount?: number | null;
  awardedLineCount?: number | null;
  workProvince?: string | null;
  workDepartment?: string | null;
  workLocality?: string | null;
  evidenceLevel: "official_dataset";
  amount: {
    value: number;
    currency: string;
    label: string;
  } | null;
  officialBudget?: {
    value: number;
    currency: string;
    label: string;
  } | null;
  supplierName: string | null;
  supplierDocument: string | null;
  supplierLocality?: string | null;
  supplierProvince?: string | null;
  receipt: EvidenceReceipt;
  relatedReceipts?: EvidenceReceipt[];
  caveats: string[];
}

export interface PeruBudgetRow {
  ANO_EJE: string;
  MES_EJE: string;
  SEC_EJEC: string;
  EJECUTORA_NOMBRE: string;
  DEPARTAMENTO_META_NOMBRE: string;
  PRODUCTO_PROYECTO: string;
  PRODUCTO_PROYECTO_NOMBRE: string;
  ACTIVIDAD_ACCION_OBRA: string;
  ACTIVIDAD_ACCION_OBRA_NOMBRE: string;
  GENERICA_NOMBRE: string;
  ESPECIFICA_DET_NOMBRE: string;
  MONTO_DEVENGADO: string;
  MONTO_GIRADO: string;
}

export interface PeruContractRow {
  codigoentidad: string;
  codigoconvocatoria: string;
  descripcion_proceso: string;
  n_cod_contrato: string;
  codigo_contrato: string;
  num_contrato: string;
  num_item: string;
  monto_contratado_total: string;
  monto_contratado_item: string;
  moneda: string;
  ruc_contratista: string;
  ruc_destinatario_pago: string;
  urlcontrato: string;
  fecha_publicacion_contrato: string;
  fecha_suscripcion_contrato: string;
  fecha_vigencia_inicial?: string;
  fecha_vigencia_final?: string;
  fecha_vigencia_fin_actualizada?: string;
}

interface PeruOcdsBuildContext {
  source: BuildOptions;
  releases: PeruOcdsReleaseEntry[];
}

interface PeruOcdsReleaseEntry {
  tenderId: string;
  fetchUrl: string;
  package: {
    records?: Array<{
      ocid?: string;
      compiledRelease?: PeruOcdsCompiledRelease;
    }>;
    releases?: PeruOcdsCompiledRelease[];
  };
}

interface PeruOcdsCompiledRelease {
  id?: string;
  ocid?: string;
  buyer?: {
    id?: string;
    name?: string;
  };
  tender?: {
    id?: string;
    procurementMethodDetails?: string;
    numberOfTenderers?: number | string | null;
    procuringEntity?: {
      id?: string;
      name?: string;
    };
    tenderers?: Array<{
      id?: string;
      name?: string;
    }>;
  };
  parties?: Array<{
    id?: string;
    name?: string;
    roles?: string[];
    address?: {
      locality?: string;
      region?: string;
      department?: string;
    };
  }>;
  awards?: Array<{
    id?: string;
    date?: string | null;
    suppliers?: Array<{
      id?: string;
      name?: string;
    }>;
  }>;
  contracts?: unknown[];
}

export interface ChileCompraSnapshot {
  details: Array<{
    Listado: ChileTender[];
    fetchWarning?: string;
  }>;
}

interface ChileTender {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado: number;
  Descripcion?: string;
  FechaCierre?: string | null;
  Estado?: string;
  Moneda?: string;
  MontoEstimado?: number | null;
  CantidadReclamos?: number | null;
  Comprador?: {
    CodigoOrganismo?: string;
    NombreOrganismo?: string;
    RutUnidad?: string;
    CodigoUnidad?: string;
    NombreUnidad?: string;
    RegionUnidad?: string;
    ComunaUnidad?: string;
  };
  Fechas?: {
    FechaPublicacion?: string | null;
    FechaAdjudicacion?: string | null;
    FechaCierre?: string | null;
  };
  Adjudicacion?: {
    Fecha?: string | null;
    Numero?: string;
    NumeroOferentes?: number;
    UrlActa?: string;
  } | null;
  Items?: {
    Cantidad?: number;
    Listado?: Array<{
      Cantidad?: number;
      Adjudicacion?: {
        RutProveedor?: string;
        NombreProveedor?: string;
        MontoUnitario?: number;
      } | null;
    }>;
  };
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

export function buildPeruBudgetCases(
  text: string,
  options: BuildOptions,
  limit = 25,
): CrossCountryCaseFile[] {
  return parseCsv<PeruBudgetRow>(text)
    .filter((row) => clean(row.EJECUTORA_NOMBRE).length > 0)
    .slice(0, limit)
    .map((row, index) => {
      const recordId = [
        clean(row.ANO_EJE),
        clean(row.SEC_EJEC),
        clean(row.PRODUCTO_PROYECTO),
        clean(row.ACTIVIDAD_ACCION_OBRA),
        index + 1,
      ].join("-");
      const amount = parseMoney(row.MONTO_DEVENGADO) ?? parseMoney(row.MONTO_GIRADO);
      return {
        id: `PE-BUDGET-${recordId}`,
        countryCode: "PE",
        caseType: "budget_execution",
        workNumber: recordId,
        year: parseYear(row.ANO_EJE),
        title: titleJoin(row.ACTIVIDAD_ACCION_OBRA_NOMBRE, row.ESPECIFICA_DET_NOMBRE),
        procedureNumber: clean(row.PRODUCTO_PROYECTO),
        agencyName: clean(row.EJECUTORA_NOMBRE),
        agencyCode: clean(row.SEC_EJEC),
        contractingUnit: titleJoin(row.DEPARTAMENTO_META_NOMBRE, row.GENERICA_NOMBRE),
        executionTerm: null,
        executionTermType: null,
        coordinates: null,
        evidenceLevel: "official_dataset",
        amount: amount === null ? null : { value: amount, currency: "PEN", label: "devengado" },
        supplierName: null,
        supplierDocument: null,
        receipt: createEvidenceReceipt({
          sourceId: options.sourceId,
          sourceName: options.sourceName,
          sourceUrl: options.sourceUrl,
          rawPath: options.rawPath,
          snapshotHash: options.fileHash,
          recordId,
          locatorType: "official_dataset",
          extractedAt: options.extractedAt,
          parserVersion: options.parserVersion,
          row: { ...row },
        }),
        caveats: [
          "Muestra ejecucion presupuestaria oficial, no un contrato ni pago a proveedor especifico.",
          "Snapshot parcial preparado con rango de bytes reproducible; usar bulk completo para investigacion final.",
        ],
      };
    });
}

export function buildPeruContractCases(
  rows: PeruContractRow[],
  options: BuildOptions,
  limit = 25,
  ocdsContext?: PeruOcdsBuildContext,
): CrossCountryCaseFile[] {
  const ocdsByTenderId = indexPeruOcdsReleases(ocdsContext?.releases ?? []);
  return rows
    .filter((row) => clean(row.codigo_contrato).length > 0)
    .slice(0, limit)
    .map((row) => {
      const contractCode = clean(row.codigo_contrato);
      const recordId = [contractCode, clean(row.num_item) || "item"].join("-");
      const amount = parseMoney(row.monto_contratado_item) ?? parseMoney(row.monto_contratado_total);
      const detailUrl = clean(row.urlcontrato);
      const signedDate = normalizeDate(row.fecha_suscripcion_contrato);
      const validity = buildValidityTerm(row);
      const ocdsRelease = ocdsByTenderId.get(clean(row.codigoconvocatoria));
      const ocdsInfo = extractPeruOcdsInfo(ocdsRelease, row);
      const relatedReceipts = buildPeruOcdsReceipts(ocdsRelease, ocdsInfo, ocdsContext);
      return {
        id: `PE-CONTRACT-${recordId}`,
        countryCode: "PE",
        caseType: "procurement_contract",
        workNumber: recordId,
        year: parseYear(signedDate?.slice(0, 4)),
        title: clean(row.descripcion_proceso) || clean(row.num_contrato) || contractCode,
        procedureNumber: clean(row.codigoconvocatoria),
        agencyName: ocdsInfo?.buyerName ?? `Entidad OECE ${clean(row.codigoentidad)}`,
        agencyCode: clean(row.codigoentidad),
        contractingUnit: clean(row.num_contrato),
        executionTerm: validity,
        executionTermType: validity ? "vigencia_contractual" : null,
        coordinates: null,
        awardedAt: ocdsInfo?.awardedAt ?? null,
        bidderCount: ocdsInfo?.bidderCount ?? null,
        procurementMethodDetails: ocdsInfo?.procurementMethodDetails ?? null,
        buyerDepartment: ocdsInfo?.buyerDepartment ?? null,
        buyerRegion: ocdsInfo?.buyerRegion ?? null,
        buyerCommune: ocdsInfo?.buyerCommune ?? null,
        evidenceLevel: "official_dataset",
        amount: amount === null ? null : { value: amount, currency: normalizePeruCurrency(row.moneda), label: "monto_contratado" },
        supplierName: ocdsInfo?.supplierName ?? null,
        supplierDocument: clean(row.ruc_contratista) || null,
        receipt: createEvidenceReceipt({
          sourceId: options.sourceId,
          sourceName: options.sourceName,
          sourceUrl: detailUrl || options.sourceUrl,
          rawPath: options.rawPath,
          snapshotHash: options.fileHash,
          recordId,
          locatorType: detailUrl ? "official_detail" : "official_dataset",
          extractedAt: options.extractedAt,
          parserVersion: options.parserVersion,
          row: { ...row },
        }),
        relatedReceipts,
        caveats: [
          "Contrato oficial OECE/SEACE; no confirma devengado ni pago efectivo por si solo.",
          ...(ocdsInfo ? ["Release OCDS oficial enlazado por codigo de convocatoria; revisar documentos antes de publicar."] : []),
          "El snapshot XLSX se conserva completo para reproducibilidad; la UI usa una muestra parseada.",
        ],
      };
    });
}

function indexPeruOcdsReleases(releases: PeruOcdsReleaseEntry[]): Map<string, PeruOcdsReleaseEntry> {
  return new Map(releases.map((release) => [clean(release.tenderId), release]));
}

function extractPeruOcdsInfo(
  release: PeruOcdsReleaseEntry | undefined,
  row: PeruContractRow,
): {
  buyerName: string | null;
  supplierName: string | null;
  awardedAt: string | null;
  bidderCount: number | null;
  procurementMethodDetails: string | null;
  buyerDepartment: string | null;
  buyerRegion: string | null;
  buyerCommune: string | null;
  receiptRow: Record<string, unknown>;
} | null {
  const record = release?.package.records?.[0];
  const compiled = record?.compiledRelease ?? release?.package.releases?.at(-1);
  if (!release || !compiled) return null;
  const buyerId = clean(compiled.buyer?.id) || clean(compiled.tender?.procuringEntity?.id);
  const buyerParty = findPeruParty(compiled.parties ?? [], buyerId, "buyer");
  const supplier = findPeruSupplier(compiled, row.ruc_contratista);
  const award = findPeruAward(compiled, row.ruc_contratista);
  return {
    buyerName: clean(compiled.buyer?.name) || clean(compiled.tender?.procuringEntity?.name) || null,
    supplierName: clean(supplier?.name) || null,
    awardedAt: normalizeDate(award?.date),
    bidderCount: toNumber(compiled.tender?.numberOfTenderers),
    procurementMethodDetails: clean(compiled.tender?.procurementMethodDetails) || null,
    buyerDepartment: clean(buyerParty?.address?.department) || null,
    buyerRegion: clean(buyerParty?.address?.region) || null,
    buyerCommune: clean(buyerParty?.address?.locality) || null,
    receiptRow: {
      tenderId: release.tenderId,
      ocid: record?.ocid ?? compiled.ocid,
      releaseId: compiled.id,
      buyer: compiled.buyer,
      tender: compiled.tender,
      awards: compiled.awards,
      contracts: compiled.contracts,
    },
  };
}

function buildPeruOcdsReceipts(
  release: PeruOcdsReleaseEntry | undefined,
  info: ReturnType<typeof extractPeruOcdsInfo>,
  context: PeruOcdsBuildContext | undefined,
): EvidenceReceipt[] | undefined {
  if (!release || !info || !context) return undefined;
  return [
    createEvidenceReceipt({
      ...context.source,
      sourceUrl: release.fetchUrl,
      snapshotHash: context.source.fileHash,
      recordId: release.tenderId,
      locatorType: "official_detail",
      parserVersion: "peru-ocds-release-link@1",
      row: info.receiptRow,
    }),
  ];
}

function findPeruSupplier(
  compiled: PeruOcdsCompiledRelease,
  document: string,
): { id?: string; name?: string } | undefined {
  const normalizedDocument = normalizePeruPartyId(document);
  const awardSupplier = (compiled.awards ?? [])
    .flatMap((award) => award.suppliers ?? [])
    .find((supplier) => normalizePeruPartyId(supplier.id) === normalizedDocument);
  if (awardSupplier) return awardSupplier;
  const tenderer = (compiled.tender?.tenderers ?? [])
    .find((supplier) => normalizePeruPartyId(supplier.id) === normalizedDocument);
  if (tenderer) return tenderer;
  return (compiled.parties ?? []).find((party) => normalizePeruPartyId(party.id) === normalizedDocument);
}

function findPeruAward(
  compiled: PeruOcdsCompiledRelease,
  document: string,
): NonNullable<PeruOcdsCompiledRelease["awards"]>[number] | undefined {
  const normalizedDocument = normalizePeruPartyId(document);
  return (compiled.awards ?? []).find((award) =>
    (award.suppliers ?? []).some((supplier) => normalizePeruPartyId(supplier.id) === normalizedDocument),
  ) ?? compiled.awards?.[0];
}

function findPeruParty(
  parties: NonNullable<PeruOcdsCompiledRelease["parties"]>,
  id: string,
  role: string,
) {
  return parties.find((party) => clean(party.id) === id)
    ?? parties.find((party) => party.roles?.includes(role));
}

function normalizePeruPartyId(value: string | null | undefined): string {
  return clean(value).toLowerCase().replace(/^pe-ruc-/, "");
}

export function buildChileCompraCases(
  snapshot: ChileCompraSnapshot,
  options: BuildOptions,
): CrossCountryCaseFile[] {
  return snapshot.details.flatMap((detail) => detail.Listado).map((tender) => {
    const recordId = clean(tender.CodigoExterno);
    const buyer = tender.Comprador ?? {};
    const award = summarizeChileAward(tender);
    const amount = award.amount ?? (typeof tender.MontoEstimado === "number" ? tender.MontoEstimado : null);
    const publishedAt = normalizeDate(tender.Fechas?.FechaPublicacion);
    const closedAt = normalizeDate(tender.Fechas?.FechaCierre ?? tender.FechaCierre);
    const awardedAt = normalizeDate(tender.Fechas?.FechaAdjudicacion ?? tender.Adjudicacion?.Fecha);
    const awardActUrl = clean(tender.Adjudicacion?.UrlActa) || null;
    const receiptUrl = awardActUrl ?? buildChileApiDetailUrl(recordId);
    return {
      id: `CL-TENDER-${recordId}`,
      countryCode: "CL",
      caseType: "procurement_process",
      workNumber: recordId,
      year: parseYear(awardedAt?.slice(0, 4) ?? publishedAt?.slice(0, 4) ?? recordId.match(/(\d{2})$/)?.[1]),
      title: clean(tender.Nombre) || recordId,
      procedureNumber: recordId,
      agencyName: clean(buyer.NombreOrganismo),
      agencyCode: clean(buyer.CodigoOrganismo),
      contractingUnit: titleJoin(buyer.NombreUnidad, buyer.RegionUnidad, buyer.ComunaUnidad),
      executionTerm: null,
      executionTermType: null,
      coordinates: null,
      publishedAt,
      closedAt,
      awardedAt,
      awardActUrl,
      awardNumber: clean(tender.Adjudicacion?.Numero) || null,
      bidderCount: toNumber(tender.Adjudicacion?.NumeroOferentes),
      claimCount: toNumber(tender.CantidadReclamos),
      buyerUnitCode: clean(buyer.CodigoUnidad) || null,
      buyerUnitRut: clean(buyer.RutUnidad) || null,
      buyerRegion: clean(buyer.RegionUnidad) || null,
      buyerCommune: clean(buyer.ComunaUnidad) || null,
      itemCount: toNumber(tender.Items?.Cantidad ?? tender.Items?.Listado?.length),
      awardedLineCount: award.awardedLineCount,
      evidenceLevel: "official_dataset",
      amount: amount === null ? null : {
        value: amount,
        currency: tender.Moneda ?? "CLP",
        label: award.amount === null ? "monto_estimado" : "monto_adjudicado_item_sum",
      },
      supplierName: award.supplierName,
      supplierDocument: award.supplierDocument,
      receipt: createEvidenceReceipt({
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        sourceUrl: receiptUrl,
        rawPath: options.rawPath,
        snapshotHash: options.fileHash,
        recordId,
        locatorType: "official_detail",
        extractedAt: options.extractedAt,
        parserVersion: options.parserVersion,
        row: { ...tender },
      }),
      caveats: [
        "Licitacion oficial de Mercado Publico; la adjudicacion no prueba pago efectivo.",
        "El monto adjudicado se calcula desde lineas adjudicadas cuando la API no entrega total unico.",
        "La API puede requerir ticket para reproducir el detalle.",
      ],
    };
  });
}

function summarizeChileAward(tender: ChileTender): {
  amount: number | null;
  supplierName: string | null;
  supplierDocument: string | null;
  awardedLineCount: number;
} {
  const awardedItems = (tender.Items?.Listado ?? [])
    .map((item) => ({
      supplierName: clean(item.Adjudicacion?.NombreProveedor),
      supplierDocument: clean(item.Adjudicacion?.RutProveedor),
      amount:
        typeof item.Adjudicacion?.MontoUnitario === "number"
          ? item.Adjudicacion.MontoUnitario * (item.Cantidad ?? 1)
          : null,
    }))
    .filter((item) => item.supplierName.length > 0 || item.amount !== null);

  if (awardedItems.length === 0) {
    return { amount: null, supplierName: null, supplierDocument: null, awardedLineCount: 0 };
  }

  const supplierName = Array.from(new Set(awardedItems.map((item) => item.supplierName).filter(Boolean))).join(", ");
  const supplierDocument = Array.from(new Set(awardedItems.map((item) => item.supplierDocument).filter(Boolean))).join(", ");
  const amount = awardedItems.reduce((total, item) => total + (item.amount ?? 0), 0);
  return {
    amount: Number.isFinite(amount) ? amount : null,
    supplierName: supplierName || null,
    supplierDocument: supplierDocument || null,
    awardedLineCount: awardedItems.length,
  };
}

function parseMoney(value: string): number | null {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseYear(value: string | undefined): number | null {
  const cleaned = clean(value);
  if (/^\d{4}$/.test(cleaned)) return Number(cleaned);
  if (/^\d{2}$/.test(cleaned)) return 2000 + Number(cleaned);
  return null;
}

function titleJoin(...parts: Array<string | undefined>): string {
  return parts.map(clean).filter(Boolean).join(" / ") || "Sin dato";
}

function normalizePeruCurrency(value: string): string {
  const cleaned = clean(value).toLowerCase();
  if (cleaned.includes("sol")) return "PEN";
  if (cleaned.includes("dolar") || cleaned.includes("dólar")) return "USD";
  return clean(value) || "PEN";
}

function buildValidityTerm(row: PeruContractRow): string | null {
  const start = normalizeDate(row.fecha_vigencia_inicial);
  const end = normalizeDate(row.fecha_vigencia_fin_actualizada) ?? normalizeDate(row.fecha_vigencia_final);
  if (start && end) return `${start} - ${end}`;
  return start ?? end;
}

function normalizeDate(value: string | null | undefined): string | null {
  const cleaned = clean(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const serial = Number(cleaned);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  return new Date(Math.round((serial - 25569) * 86_400_000)).toISOString().slice(0, 10);
}

function toNumber(value: string | number | null | undefined): number | null {
  const cleaned = clean(value);
  if (cleaned.length === 0) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildChileApiDetailUrl(recordId: string): string {
  return `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${encodeURIComponent(recordId)}&ticket=<redacted>`;
}

function clean(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}
