import { createEvidenceReceipt, type EvidenceReceipt } from "./evidenceReceipts.ts";
import { parseCsv } from "./argentinaWorks.ts";
import type { FxConversion, FxConversionNote } from "./fx.ts";

export interface RawArgentinaInvestmentMapRow {
  idproyecto: string;
  numeroobra: string;
  codigobapin: string;
  fechainicioanio: string;
  fechafinanio: string;
  nombreobra: string;
  descripicionfisica: string;
  montototal: string;
  sectornombre: string;
  avancefinanciero: string;
  avancefisico: string;
  entidadejecutoranombre: string;
  duracionobrasdias: string;
  objetivogeneral: string;
  tipoproyecto: string;
  nombredepto: string;
  nombreprovincia: string;
  codigo_bahra: string;
  etapaobra: string;
  tipomoneda: string;
  url_perfil_obra: string;
  programa_infraestructura: string;
  organismo_financiador_1: string;
  organismo_financiador_2: string;
  organismo_financiador_prestamo: string;
  contraparte_key: string;
  contraparte_val: string;
  contraparte_cuit: string;
  contraparte_modalidad: string;
  tag_accionclimatica: string;
  tag_ods_incidencia: string;
}

export interface ArgentinaInvestmentMapCaseFile {
  id: string;
  countryCode: "AR";
  caseType: "public_works_progress";
  workNumber: string;
  publicWorkNumber: string | null;
  year: number | null;
  title: string;
  procedureNumber: string;
  agencyName: string;
  agencyCode: string;
  contractingUnit: string;
  executionTerm: string | null;
  executionTermType: string | null;
  coordinates: null;
  locationName: string | null;
  locationSource: null;
  workProvince: string | null;
  workDepartment: string | null;
  workLocality: null;
  projectStage: string | null;
  sectorName: string | null;
  physicalProgress: number | null;
  financialProgress: number | null;
  profileUrl: string | null;
  evidenceLevel: "official_dataset";
  amount: {
    value: number;
    currency: string;
    label: string;
    usdEquivalent: FxConversion | null;
    usdConversionNote?: FxConversionNote;
  } | null;
  supplierName: string | null;
  supplierDocument: string | null;
  receipt: EvidenceReceipt;
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

export function buildArgentinaInvestmentMapCases(
  text: string,
  options: BuildOptions,
  limit = Number.POSITIVE_INFINITY,
): ArgentinaInvestmentMapCaseFile[] {
  return parseCsv<RawArgentinaInvestmentMapRow>(text)
    .filter((row) => clean(row.idproyecto).length > 0)
    .slice(0, limit)
    .map((row) => buildCase(row, options));
}

function buildCase(
  row: RawArgentinaInvestmentMapRow,
  options: BuildOptions,
): ArgentinaInvestmentMapCaseFile {
  const projectId = clean(row.idproyecto);
  const workNumber = clean(row.numeroobra) || projectId;
  const profileUrl = validHttpUrl(row.url_perfil_obra);
  const amount = parseAmount(row.montototal, row.tipomoneda);
  const province = nullable(row.nombreprovincia);
  const department = nullable(row.nombredepto);
  const locationName = [department, province].filter(Boolean).join(", ") || null;

  return {
    id: `AR-MAPA-INV-${projectId}`,
    countryCode: "AR",
    caseType: "public_works_progress",
    workNumber,
    publicWorkNumber: workNumber,
    year: parseYear(row.fechainicioanio) ?? parseYear(row.fechafinanio),
    title: clean(row.nombreobra) || workNumber,
    procedureNumber: clean(row.codigobapin) || projectId,
    agencyName: clean(row.entidadejecutoranombre) || "Sin organismo",
    agencyCode: cleanParty(row.organismo_financiador_1) ?? "",
    contractingUnit: clean(row.programa_infraestructura) || clean(row.sectornombre),
    executionTerm: nullable(row.duracionobrasdias),
    executionTermType: nullable(row.duracionobrasdias) ? "dias" : null,
    coordinates: null,
    locationName,
    locationSource: null,
    workProvince: province,
    workDepartment: department,
    workLocality: null,
    projectStage: nullable(row.etapaobra),
    sectorName: nullable(row.sectornombre),
    physicalProgress: parsePercent(row.avancefisico),
    financialProgress: parsePercent(row.avancefinanciero),
    profileUrl,
    evidenceLevel: "official_dataset",
    amount,
    supplierName: isContractorCounterparty(row) ? cleanParty(row.contraparte_val) : null,
    supplierDocument: isContractorCounterparty(row) ? cleanParty(row.contraparte_cuit) : null,
    receipt: createEvidenceReceipt({
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      sourceUrl: profileUrl ?? options.sourceUrl,
      rawPath: options.rawPath,
      snapshotHash: options.fileHash,
      extractedAt: options.extractedAt,
      recordId: projectId,
      locatorType: profileUrl ? "official_detail" : "official_dataset",
      parserVersion: options.parserVersion,
      row: { ...row },
    }),
    caveats: [
      "Mapa de Inversiones informa avance y monto declarados; no confirma pagos ni ejecucion por si solo.",
      "El snapshot actual no incluye latitud/longitud; Faro conserva provincia/departamento pero no dibuja el caso en mapa.",
      "La URL de perfil proviene de la fila oficial; revisar el perfil y el dataset antes de citar.",
    ],
  };
}

function parseAmount(
  value: string,
  currencyRaw: string,
): ArgentinaInvestmentMapCaseFile["amount"] {
  const amount = Number(clean(value));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = normalizeCurrency(currencyRaw);
  return {
    value: amount,
    currency,
    label: "monto_total",
    usdEquivalent: null,
    usdConversionNote: "no_anchor_date",
  };
}

function normalizeCurrency(value: string): string {
  const normalized = clean(value).toLowerCase();
  if (normalized.includes("peso")) return "ARS";
  if (normalized.includes("dolar") || normalized.includes("usd")) return "USD";
  return clean(value).toUpperCase() || "ARS";
}

function parsePercent(value: string): number | null {
  const parsed = Number(clean(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, 0), 100);
}

function parseYear(value: string): number | null {
  const parsed = Number(clean(value));
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) return null;
  return parsed;
}

function validHttpUrl(value: string): string | null {
  const cleaned = clean(value);
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanParty(value: string): string | null {
  const cleaned = clean(value);
  if (!cleaned || cleaned === "-") return null;
  return cleaned;
}

function isContractorCounterparty(row: RawArgentinaInvestmentMapRow): boolean {
  return clean(row.contraparte_key).toLowerCase() === "contratista";
}

function nullable(value: string): string | null {
  const cleaned = clean(value);
  return cleaned.length > 0 && cleaned !== "-" ? cleaned : null;
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
