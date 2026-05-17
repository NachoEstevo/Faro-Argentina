import { assessCoordinateQuality } from "./coordinateQuality.ts";
import {
  buildCaseSignalContext,
  buildCaseSignalContextsByCountry,
  type CaseSignalContext,
} from "./investigationSignalContext.ts";

export type CaseSignalKind = "watch" | "ready" | "gap" | "context";
export type CaseSignalFamily =
  | "competition"
  | "money"
  | "supplier"
  | "traceability"
  | "geo_visual"
  | "data_gap"
  | "context";
export type CaseSignalSeverity = "low" | "medium" | "high";
export type CaseSignalConfidence = "low" | "medium" | "high";

export { buildCaseSignalContext, buildCaseSignalContextsByCountry, type CaseSignalContext };

export interface CaseSignal {
  code: string;
  kind: CaseSignalKind;
  family?: CaseSignalFamily;
  severity?: CaseSignalSeverity;
  confidence?: CaseSignalConfidence;
  priority: number;
  label: string;
  summary: string;
  evidence: string;
  caveat: string;
  action: string;
  relatedCaseIds?: string[];
  sourceIds?: string[];
}

export interface CaseSignalFeedItem extends CaseSignal {
  caseId: string;
  countryCode: string;
  caseTitle: string;
  sourceId: string;
}

export interface CaseSignalFeed {
  feedType: "faro_case_signal_feed";
  generatedAt: string;
  stats: {
    cases: number;
    signals: number;
  };
  signals: CaseSignalFeedItem[];
}

export interface SignalCaseFile {
  id: string;
  countryCode: string;
  title: string;
  caseType?: string;
  workNumber?: string;
  procedureNumber?: string;
  agencyName?: string;
  agencyCode?: string;
  contractingUnit?: string;
  executionTerm?: string | null;
  executionTermType?: string | null;
  evidenceLevel?: string;
  year?: number | null;
  coordinates?: { lat: number; lon: number } | null;
  amount?: { value: number; currency: string; label: string } | null;
  officialBudget?: { value: number; currency: string; label: string } | null;
  bidderCount?: number | null;
  offerCount?: number | null;
  claimCount?: number | null;
  awardActUrl?: string | null;
  supplierName?: string | null;
  supplierDocument?: string | null;
  relatedReceipts?: Array<{ sourceId: string }>;
  receipt: {
    sourceId: string;
    sourceName: string;
    sourceUrl: string;
  };
  caveats?: string[];
}

export function buildCaseSignals(caseFile: SignalCaseFile, context?: CaseSignalContext): CaseSignal[] {
  const signals: CaseSignal[] = [];

  addCompetitionSignals(signals, caseFile);
  addBudgetSignals(signals, caseFile);
  addAmountGapSignals(signals, caseFile);
  addClaimSignals(signals, caseFile);
  addTraceabilitySignals(signals, caseFile);
  addAggregateSupplierSignals(signals, caseFile, context);
  addGeoSignals(signals, caseFile);
  addVerificationGapSignals(signals, caseFile);

  return signals.sort((left, right) => right.priority - left.priority || left.code.localeCompare(right.code));
}

export function buildCaseSignalFeed(
  cases: SignalCaseFile[],
  contextCases: SignalCaseFile[] = cases,
): CaseSignalFeed {
  const contextsByCountry = buildCaseSignalContextsByCountry(contextCases);
  const signals = cases
    .flatMap((caseFile) =>
      buildCaseSignals(caseFile, contextsByCountry.get(caseFile.countryCode)).map((signal) => ({
        ...signal,
        caseId: caseFile.id,
        countryCode: caseFile.countryCode,
        caseTitle: caseFile.title,
        sourceId: caseFile.receipt.sourceId,
      })),
    )
    .sort((left, right) => right.priority - left.priority || left.caseId.localeCompare(right.caseId));

  return {
    feedType: "faro_case_signal_feed",
    generatedAt: new Date().toISOString(),
    stats: {
      cases: cases.length,
      signals: signals.length,
    },
    signals,
  };
}

function addCompetitionSignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  const bidderCount = numberOrNull(caseFile.bidderCount);
  if (bidderCount === null) return;

  if (bidderCount === 1) {
    signals.push({
      code: "single_bidder",
      kind: "watch",
      family: "competition",
      severity: "high",
      confidence: "high",
      priority: 100,
      label: "Competencia baja",
      summary: "El registro oficial muestra 1 oferente. Es una pista para revisar pliego, rubro y justificacion del procedimiento.",
      evidence: "Cantidad de oferentes declarada por fuente oficial: 1.",
      caveat: "Un solo oferente no alcanza como conclusion; puede tener explicacion documental o de mercado.",
      action: "Abrir actas/ofertas y comparar con procedimientos similares.",
    });
    return;
  }

  if (bidderCount <= 3) {
    signals.push({
      code: "limited_competition",
      kind: "watch",
      family: "competition",
      severity: "medium",
      confidence: "high",
      priority: 82,
      label: "Competencia limitada",
      summary: `El registro oficial muestra ${bidderCount} oferentes. Conviene revisar si hubo barreras, rubro muy especifico o baja concurrencia repetida.`,
      evidence: `Cantidad de oferentes declarada por fuente oficial: ${bidderCount}.`,
      caveat: "La cantidad de oferentes es una senal de priorizacion, no una conclusion.",
      action: "Comparar ofertas, pliego, fechas y compras del mismo rubro.",
    });
    return;
  }

  signals.push({
    code: "competition_measured",
    kind: "context",
    family: "competition",
    severity: "low",
    confidence: "high",
    priority: 38,
    label: "Competencia medida",
    summary: `La fuente oficial informa ${bidderCount} oferentes para este proceso.`,
    evidence: `Cantidad de oferentes declarada por fuente oficial: ${bidderCount}.`,
    caveat: "Faro no evalua calidad de ofertas ni requisitos tecnicos sin documentos adicionales.",
    action: "Usar el dato como contexto al revisar monto y adjudicacion.",
  });
}

function addBudgetSignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  const amount = caseFile.amount;
  const officialBudget = caseFile.officialBudget;
  if (!amount || !officialBudget || amount.currency !== officialBudget.currency) return;
  if (!isPositive(amount.value) || !isPositive(officialBudget.value)) return;
  if (amount.value <= officialBudget.value * 1.05) return;

  const percent = Math.round(((amount.value - officialBudget.value) / officialBudget.value) * 100);
  signals.push({
    code: "amount_over_official_budget",
    kind: "watch",
    family: "money",
    severity: "medium",
    confidence: "medium",
    priority: 92,
    label: "Monto sobre presupuesto",
    summary: `El monto registrado supera el presupuesto oficial por aproximadamente ${percent}%.`,
    evidence: `${amount.currency} ${round(amount.value)} frente a presupuesto oficial ${round(officialBudget.value)}.`,
    caveat: "El presupuesto oficial puede cambiar por ampliaciones o documentos no incluidos en este snapshot.",
    action: "Buscar ampliaciones, dictamen de evaluacion y detalle de adjudicacion.",
  });
}

function addAmountGapSignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  if (!caseFile.caseType?.startsWith("procurement_")) return;
  if (caseFile.amount && isPositive(caseFile.amount.value)) return;

  signals.push({
    code: "missing_amount",
    kind: "gap",
    family: "data_gap",
    severity: "medium",
    confidence: "high",
    priority: 78,
    label: "Monto faltante",
    summary: "El caso tiene registro oficial de compra, contrato o adjudicacion, pero no expone un monto usable en este snapshot.",
    evidence: `Fuente principal: ${caseFile.receipt.sourceId}.`,
    caveat: "La falta de monto puede ser un problema de cobertura, formato o etapa del proceso; no alcanza como conclusion por si sola.",
    action: "Abrir fuente oficial y buscar contrato, orden, adjudicacion o partida presupuestaria con monto verificable.",
  });
}

function addClaimSignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  const claimCount = numberOrNull(caseFile.claimCount);
  if (claimCount === null || claimCount < 10) return;

  signals.push({
    code: "high_claim_volume",
    kind: "watch",
    family: "competition",
    severity: claimCount >= 100 ? "high" : "medium",
    confidence: "medium",
    priority: claimCount >= 100 ? 88 : 74,
    label: "Reclamos asociados",
    summary: `La fuente oficial informa ${claimCount} reclamos asociados al proceso o comprador.`,
    evidence: `Cantidad de reclamos oficial: ${claimCount}.`,
    caveat: "Los reclamos no alcanzan como conclusion; indican que vale abrir documentos y contexto.",
    action: "Revisar acta, preguntas, reclamos y respuesta de la entidad compradora.",
  });
}

function addTraceabilitySignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  if (caseFile.awardActUrl) {
    signals.push({
      code: "official_award_act",
      kind: "ready",
      family: "traceability",
      severity: "low",
      confidence: "high",
      priority: 72,
      label: "Acta oficial disponible",
      summary: "Hay un enlace oficial directo al acta o detalle de adjudicacion.",
      evidence: caseFile.awardActUrl,
      caveat: "El acta debe leerse junto con bases, ofertas y eventuales pagos.",
      action: "Abrir acta oficial y citarla desde el receipt.",
    });
  }

  const relatedCount = caseFile.relatedReceipts?.length ?? 0;
  if (relatedCount > 0) {
    signals.push({
      code: "cross_source_evidence",
      kind: "ready",
      family: "traceability",
      severity: "low",
      confidence: "high",
      priority: 68,
      label: "Evidencia cruzada",
      summary: `Este caso enlaza ${relatedCount} receipt${relatedCount === 1 ? "" : "s"} adicional${relatedCount === 1 ? "" : "es"} de fuentes oficiales.`,
      evidence: (caseFile.relatedReceipts ?? []).map((receipt) => receipt.sourceId).join(", "),
      caveat: "Mas fuentes mejoran trazabilidad, pero no reemplazan verificacion documental.",
      action: "Abrir receipts relacionados y reproducir el cruce.",
    });
  }

  if (caseFile.supplierName || caseFile.supplierDocument) {
    signals.push({
      code: "supplier_identified",
      kind: "context",
      family: "supplier",
      severity: "low",
      confidence: "high",
      priority: 44,
      label: "Proveedor identificado",
      summary: "El caso tiene proveedor o documento fiscal para seguir el rastro.",
      evidence: [caseFile.supplierName, caseFile.supplierDocument].filter(Boolean).join(" / "),
      caveat: "Identificar proveedor no implica beneficio indebido.",
      action: "Buscar recurrencia del proveedor por organismo, rubro y territorio.",
    });
  }
}

function addAggregateSupplierSignals(
  signals: CaseSignal[],
  caseFile: SignalCaseFile,
  context: CaseSignalContext | undefined,
) {
  if (!context) return;
  const metrics = context.caseMetricsById.get(caseFile.id);
  const supplierProfile = metrics?.supplierProfile;
  const supplierAgencyProfile = metrics?.supplierAgencyProfile;
  const aliasGroup = metrics?.aliasGroup;
  if (!supplierProfile || !supplierAgencyProfile) return;

  if (supplierAgencyProfile.singleBidCaseCount >= 2) {
    signals.push({
      code: "repeat_single_bid_winner",
      kind: "watch",
      family: "supplier",
      severity: "high",
      confidence: "medium",
      priority: 106,
      label: "Ganador recurrente con baja competencia",
      summary: `El proveedor aparece como ganador en ${supplierAgencyProfile.singleBidCaseCount} contratos del mismo organismo con 1 oferente registrado.`,
      evidence: `${supplierAgencyProfile.agencyLabel}: ${supplierAgencyProfile.singleBidCaseCount} contratos con 1 oferente; ${supplierAgencyProfile.caseCount} contratos del proveedor en ese organismo.`,
      caveat: "La recurrencia con baja competencia prioriza revision; no alcanza para explicar el patron por si sola.",
      action: "Comparar pliegos, oferentes, fechas y justificacion del organismo en los contratos relacionados.",
      relatedCaseIds: supplierAgencyProfile.caseIds.filter((caseId) => caseId !== caseFile.id).slice(0, 8),
    });
  }

  if (supplierAgencyProfile.caseCount >= 3) {
    signals.push({
      code: "recurring_supplier_agency",
      kind: "watch",
      family: "supplier",
      severity: "medium",
      confidence: "medium",
      priority: 96,
      label: "Proveedor recurrente por organismo",
      summary: `El proveedor aparece en ${supplierAgencyProfile.caseCount} contratos del mismo organismo dentro del set analizado.`,
      evidence: `${supplierAgencyProfile.agencyLabel}: ${supplierAgencyProfile.caseCount} contratos; monto acumulado con monto informado: ${round(supplierAgencyProfile.totalAmount)}.`,
      caveat: "Un proveedor recurrente puede reflejar especializacion o mercado chico; requiere comparar rubro, pliegos y competencia.",
      action: "Abrir los contratos relacionados y revisar si se repiten rubro, unidad compradora, requisitos y oferentes.",
      relatedCaseIds: supplierAgencyProfile.caseIds.filter((caseId) => caseId !== caseFile.id).slice(0, 8),
    });
  }

  const concentrationRatio = supplierProfile.caseCount > 0
    ? supplierAgencyProfile.caseCount / supplierProfile.caseCount
    : 0;
  if (supplierProfile.caseCount >= 3 && supplierAgencyProfile.caseCount >= 3 && concentrationRatio >= 0.6) {
    signals.push({
      code: "supplier_concentration",
      kind: "watch",
      family: "supplier",
      severity: "medium",
      confidence: "medium",
      priority: 90,
      label: "Concentracion proveedor-organismo",
      summary: `En este set, ${Math.round(concentrationRatio * 100)}% de los contratos del proveedor aparecen asociados al mismo organismo.`,
      evidence: `${supplierAgencyProfile.caseCount} de ${supplierProfile.caseCount} contratos del proveedor se concentran en ${supplierAgencyProfile.agencyLabel}.`,
      caveat: "La concentracion depende del alcance del dataset cargado; debe validarse con mas fuentes y periodo completo.",
      action: "Ampliar periodo/fuentes y comparar contra otros proveedores del mismo rubro.",
      relatedCaseIds: supplierAgencyProfile.caseIds.filter((caseId) => caseId !== caseFile.id).slice(0, 8),
    });
  }

  if (aliasGroup && aliasGroup.variants.length >= 2) {
    signals.push({
      code: "possible_supplier_alias",
      kind: "gap",
      family: "supplier",
      severity: "low",
      confidence: "low",
      priority: 64,
      label: "Posible alias de proveedor",
      summary: "Hay nombres de proveedor muy similares en el set que conviene revisar antes de contar entidades como separadas.",
      evidence: aliasGroup.variants.slice(0, 4).join(" / "),
      caveat: "La similitud de nombre no confirma identidad; debe verificarse con CUIT/RUC/RUT, domicilio o registro societario.",
      action: "Comparar identificador fiscal, domicilio, representantes y registros oficiales del proveedor.",
      relatedCaseIds: aliasGroup.caseIds.filter((caseId) => caseId !== caseFile.id).slice(0, 8),
    });
  }
}

function addGeoSignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  const coordinateQuality = assessCoordinateQuality({
    caseId: caseFile.id,
    countryCode: caseFile.countryCode,
    coordinates: caseFile.coordinates ?? null,
  });

  if (coordinateQuality.status === "valid_official_geometry" && caseFile.coordinates) {
    signals.push({
      code: "official_geometry",
      kind: "ready",
      family: "geo_visual",
      severity: "low",
      confidence: "high",
      priority: 58,
      label: "Ubicacion oficial validada",
      summary: "El caso tiene coordenadas declaradas por fuente oficial y puede aparecer en el mapa.",
      evidence: `${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}`,
      caveat: "La coordenada ubica el caso, no prueba avance fisico ni pagos.",
      action: "Abrir mapa, fuente y expediente antes de interpretar el punto.",
    });

    if (caseFile.countryCode === "AR" && caseFile.year !== null && caseFile.year !== undefined) {
      signals.push({
        code: "sentinel_candidate",
        kind: "ready",
        family: "geo_visual",
        severity: "medium",
        confidence: "medium",
        priority: 76,
        label: "Candidato Sentinel-2",
        summary: "Tiene fecha aproximada y coordenada oficial suficientes para preparar una comparacion satelital antes/despues.",
        evidence: `Anio ${caseFile.year}; coordenada ${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}.`,
        caveat: "Sentinel-2 aporta contexto visual; nubes, resolucion y fecha pueden limitar conclusiones.",
        action: "Buscar escena anterior al contrato y ultima escena disponible.",
      });
    }
    return;
  }

  if (coordinateQuality.status === "missing_geometry") {
    signals.push({
      code: "missing_official_geometry",
      kind: "gap",
      family: "data_gap",
      severity: "medium",
      confidence: "high",
      priority: 52,
      label: "Sin geometria oficial",
      summary: "El caso es verificable por fuente, pero no se dibuja en mapa porque falta una coordenada oficial confiable.",
      evidence: `Fuente principal: ${caseFile.receipt.sourceId}.`,
      caveat: "Faro no infiere ubicaciones desde nombres cuando no hay geometria oficial suficiente.",
      action: "Cruzar con catastro, UBIGEO, comuna o dataset territorial oficial antes de mapear.",
    });
    return;
  }

  signals.push({
    code: "geometry_needs_review",
    kind: "gap",
    family: "data_gap",
    severity: "medium",
    confidence: "high",
    priority: 56,
    label: "Geometria requiere revision",
    summary: "La fuente incluye coordenadas, pero no pasan los controles geograficos para dibujarlas como ubicacion oficial validada.",
    evidence: `${coordinateQuality.summary} Fuente principal: ${caseFile.receipt.sourceId}.`,
    caveat: "Faro preserva la coordenada como dato de fuente, pero no la dibuja ni la corrige sin verificacion oficial.",
    action: "Revisar fuente, expediente o dataset territorial oficial antes de usar la coordenada en mapa.",
  });
}

function addVerificationGapSignals(signals: CaseSignal[], caseFile: SignalCaseFile) {
  if (!caseFile.caseType?.startsWith("procurement_")) return;

  signals.push({
    code: "payment_verification_gap",
    kind: "gap",
    family: "data_gap",
    severity: "medium",
    confidence: "high",
    priority: 48,
    label: "Falta pago/avance",
    summary: "El registro muestra compra, contrato o adjudicacion; todavia falta cruzar pago efectivo y avance cuando aplique.",
    evidence: `Tipo de caso: ${caseFile.caseType}.`,
    caveat: "Adjudicar o contratar no significa que el dinero se haya pagado ni que la obra haya avanzado.",
    action: "Cruzar con ejecucion presupuestaria, pagos, recepciones y avance fisico.",
  });
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function round(value: number): string {
  return Math.round(value).toLocaleString("es-AR");
}
