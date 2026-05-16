import { createEvidenceReceipt, type EvidenceReceipt } from "./evidenceReceipts.ts";
import { parseCsv } from "./argentinaWorks.ts";

export type CrossCountryCode = "PE" | "CL";
export type CrossCountryCaseType = "budget_execution" | "procurement_process";

export interface CrossCountryCaseFile {
  id: string;
  countryCode: CrossCountryCode;
  caseType: CrossCountryCaseType;
  workNumber: string;
  year: number | null;
  title: string;
  procedureNumber: string;
  agencyName: string;
  agencyCode: string;
  contractingUnit: string;
  executionTerm: string | null;
  executionTermType: string | null;
  coordinates: null;
  evidenceLevel: "official_dataset";
  amount: {
    value: number;
    currency: string;
    label: string;
  } | null;
  supplierName: string | null;
  receipt: EvidenceReceipt;
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
  Estado?: string;
  Moneda?: string;
  MontoEstimado?: number | null;
  Comprador?: {
    CodigoOrganismo?: string;
    NombreOrganismo?: string;
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
    NumeroOferentes?: number;
  } | null;
  Items?: {
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

export function buildChileCompraCases(
  snapshot: ChileCompraSnapshot,
  options: BuildOptions,
): CrossCountryCaseFile[] {
  return snapshot.details.flatMap((detail) => detail.Listado).map((tender) => {
    const recordId = clean(tender.CodigoExterno);
    const buyer = tender.Comprador ?? {};
    const award = summarizeChileAward(tender);
    const amount = award.amount ?? (typeof tender.MontoEstimado === "number" ? tender.MontoEstimado : null);
    return {
      id: `CL-TENDER-${recordId}`,
      countryCode: "CL",
      caseType: "procurement_process",
      workNumber: recordId,
      year: parseYear(tender.Fechas?.FechaPublicacion?.slice(0, 4) ?? recordId.match(/(\d{2})$/)?.[1]),
      title: clean(tender.Nombre) || recordId,
      procedureNumber: recordId,
      agencyName: clean(buyer.NombreOrganismo),
      agencyCode: clean(buyer.CodigoOrganismo),
      contractingUnit: titleJoin(buyer.NombreUnidad, buyer.RegionUnidad, buyer.ComunaUnidad),
      executionTerm: null,
      executionTermType: null,
      coordinates: null,
      evidenceLevel: "official_dataset",
      amount: amount === null ? null : { value: amount, currency: tender.Moneda ?? "CLP", label: award.amount === null ? "monto_estimado" : "monto_adjudicado" },
      supplierName: award.supplierName,
      receipt: createEvidenceReceipt({
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        sourceUrl: options.sourceUrl,
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
        "La API puede requerir ticket para reproducir el detalle.",
      ],
    };
  });
}

function summarizeChileAward(tender: ChileTender): {
  amount: number | null;
  supplierName: string | null;
} {
  const awardedItems = (tender.Items?.Listado ?? [])
    .map((item) => ({
      supplierName: clean(item.Adjudicacion?.NombreProveedor),
      amount:
        typeof item.Adjudicacion?.MontoUnitario === "number"
          ? item.Adjudicacion.MontoUnitario * (item.Cantidad ?? 1)
          : null,
    }))
    .filter((item) => item.supplierName.length > 0 || item.amount !== null);

  if (awardedItems.length === 0) return { amount: null, supplierName: null };

  const supplierName = Array.from(new Set(awardedItems.map((item) => item.supplierName).filter(Boolean))).join(", ");
  const amount = awardedItems.reduce((total, item) => total + (item.amount ?? 0), 0);
  return {
    amount: Number.isFinite(amount) ? amount : null,
    supplierName: supplierName || null,
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

function clean(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}
