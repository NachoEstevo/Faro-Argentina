import type { SignalCaseFile } from "./caseSignals.ts";
import {
  buildEvidenceClaimMatrix,
  type EvidenceClaim,
  type EvidenceClaimCode,
  type EvidenceClaimMatrix,
} from "./evidenceClaimMatrix.ts";
import { bapinLikeIdentifier, clean } from "./evidenceClaimRuleUtils.ts";

export type CaseInvestigationReadiness = "strong_start" | "needs_source_cross" | "limited";
export type CaseInvestigationGapSeverity = "high" | "medium" | "low";
export type CaseInvestigationSourceStatus = "integrated" | "candidate" | "manual_review";

export interface CaseInvestigationGap {
  claimCode: EvidenceClaimCode;
  label: string;
  severity: CaseInvestigationGapSeverity;
  whatIsMissing: string;
  whyItMatters: string;
  nextStep: string;
}

export interface CaseInvestigationFollowUp {
  claimCode: EvidenceClaimCode;
  sourceId: string;
  sourceName: string;
  sourceStatus: CaseInvestigationSourceStatus;
  joinKey: string;
  joinValue: string;
  action: string;
  caveat: string;
}

export interface CaseInvestigationChecklist {
  checklistType: "faro_case_investigation_checklist_v1";
  caseId: string;
  readiness: CaseInvestigationReadiness;
  label: string;
  summary: string;
  gaps: CaseInvestigationGap[];
  followUps: CaseInvestigationFollowUp[];
  doNotClaim: string[];
}

const GAP_PRIORITY: EvidenceClaimCode[] = [
  "provider_payment",
  "budget_execution",
  "official_location",
  "supplier_identity",
  "competition",
  "declared_progress",
  "official_budget",
  "declared_amount",
  "judicial_context",
  "official_record",
];

export function buildCaseInvestigationChecklist(
  caseFile: SignalCaseFile,
  matrix: EvidenceClaimMatrix = buildEvidenceClaimMatrix(caseFile),
): CaseInvestigationChecklist {
  const gaps = buildGaps(matrix.claims);
  const followUps = buildFollowUps(caseFile, matrix.claims);
  const readiness = resolveReadiness(matrix, gaps, followUps);

  return {
    checklistType: "faro_case_investigation_checklist_v1",
    caseId: caseFile.id,
    readiness,
    label: labelReadiness(readiness),
    summary: summarizeReadiness(readiness, gaps, followUps),
    gaps: gaps.slice(0, 6),
    followUps,
    doNotClaim: buildDoNotClaim(matrix.claims).slice(0, 5),
  };
}

function buildGaps(claims: EvidenceClaim[]): CaseInvestigationGap[] {
  return claims
    .filter((claim) => claim.status !== "supported")
    .map((claim) => ({
      claimCode: claim.code,
      label: claim.label,
      severity: gapSeverity(claim),
      whatIsMissing: claim.status === "partial" ? claim.caveat : claim.evidence,
      whyItMatters: gapWhyItMatters(claim),
      nextStep: claim.nextStep,
    }))
    .sort((left, right) =>
      severityRank(left.severity) - severityRank(right.severity) ||
      claimPriority(left.claimCode) - claimPriority(right.claimCode)
    );
}

function buildFollowUps(
  caseFile: SignalCaseFile,
  claims: EvidenceClaim[],
): CaseInvestigationFollowUp[] {
  const followUps: CaseInvestigationFollowUp[] = [];
  const bapin = cleanBapin(caseFile);
  const budgetClaim = claims.find((claim) => claim.code === "budget_execution");

  if (
    caseFile.receipt.sourceId === "AR-MAPA-INVERSIONES-OBRAS" &&
    bapin &&
    budgetClaim?.status === "partial"
  ) {
    followUps.push({
      claimCode: "budget_execution",
      sourceId: "AR-PRESUPUESTO-ABIERTO-CREDITO-BAPIN",
      sourceName: "Presupuesto Abierto - crédito por BAPIN",
      sourceStatus: "candidate",
      joinKey: "codigo_bapin_id",
      joinValue: bapin,
      action: "Probar query read-only por BAPIN y guardar URL, columnas, fecha de actualización, hash y caveat antes de integrar.",
      caveat: "El cruce puede mostrar ejecución presupuestaria declarada, no pago a proveedor.",
    });
  }

  const paymentClaim = claims.find((claim) => claim.code === "provider_payment");
  if (paymentClaim?.status === "not_supported") {
    followUps.push({
      claimCode: "provider_payment",
      sourceId: "AR-PAYMENT-SOURCE-PENDING",
      sourceName: "Fuente oficial de pagos/certificados pendiente",
      sourceStatus: "manual_review",
      joinKey: "llave_exacta_pendiente",
      joinValue: clean(caseFile.procedureNumber) || clean(caseFile.workNumber) || caseFile.id,
      action: paymentClaim.nextStep,
      caveat: paymentClaim.caveat,
    });
  }

  return followUps;
}

function buildDoNotClaim(claims: EvidenceClaim[]): string[] {
  return claims
    .filter((claim) => claim.status === "not_supported")
    .sort((left, right) => claimPriority(left.code) - claimPriority(right.code))
    .map((claim) => doNotClaimText(claim));
}

function resolveReadiness(
  matrix: EvidenceClaimMatrix,
  gaps: CaseInvestigationGap[],
  followUps: CaseInvestigationFollowUp[],
): CaseInvestigationReadiness {
  const supported = matrix.summary.supported;
  const highGaps = gaps.filter((gap) => gap.severity === "high").length;
  const hasCandidateCross = followUps.some((item) => item.sourceStatus === "candidate");
  const missingCore = missingCoreClaims(matrix.claims);

  if (hasCandidateCross) return "needs_source_cross";
  if (missingCore >= 2 || supported < 3) return "limited";
  if (highGaps > 1) return "needs_source_cross";
  return "strong_start";
}

function gapSeverity(claim: EvidenceClaim): CaseInvestigationGapSeverity {
  if (claim.code === "provider_payment") return "high";
  if (claim.code === "official_location" && claim.status === "not_supported") return "high";
  if (claim.code === "budget_execution" || claim.code === "supplier_identity") return "medium";
  if (claim.status === "partial") return "medium";
  return "low";
}

function gapWhyItMatters(claim: EvidenceClaim): string {
  if (claim.code === "provider_payment") {
    return "Evita tratar contratos, avances o crédito presupuestario como pago efectivo.";
  }
  if (claim.code === "budget_execution") {
    return "Permite separar rastro presupuestario de pago a proveedor y conservar la llave oficial.";
  }
  if (claim.code === "official_location") {
    return "Define si el expediente puede usarse en mapa o verificación territorial sin inferir coordenadas.";
  }
  if (claim.code === "supplier_identity") {
    return "Sin CUIT/documento exacto, los pivots por proveedor pueden mezclar entidades distintas.";
  }
  if (claim.code === "competition") {
    return "Sin actas u ofertas estructuradas, Faro no puede describir concurrencia del proceso.";
  }
  return "Reduce el riesgo de sacar el expediente del alcance que la fuente realmente sostiene.";
}

function doNotClaimText(claim: EvidenceClaim): string {
  if (claim.code === "provider_payment") return "No afirmar pago a proveedor con el corpus actual.";
  if (claim.code === "official_location") return "No afirmar punto exacto de obra sin geometría oficial validada.";
  if (claim.code === "budget_execution") return "No afirmar ejecución presupuestaria integrada sin query y receipt.";
  if (claim.code === "supplier_identity") return "No relacionar proveedor sin CUIT/documento o fuente exacta.";
  if (claim.code === "judicial_context") return "No relacionar contexto judicial sin documento que una los hechos.";
  return `No afirmar ${claim.label.toLowerCase()} sin fuente complementaria.`;
}

function labelReadiness(readiness: CaseInvestigationReadiness): string {
  if (readiness === "strong_start") return "Buen punto de partida";
  if (readiness === "needs_source_cross") return "Requiere cruce de fuente";
  return "Pista limitada";
}

function summarizeReadiness(
  readiness: CaseInvestigationReadiness,
  gaps: CaseInvestigationGap[],
  followUps: CaseInvestigationFollowUp[],
): string {
  if (readiness === "strong_start") {
    return "Hay evidencia oficial suficiente para iniciar revisión y brechas explícitas para no sobreinterpretar.";
  }
  if (readiness === "needs_source_cross") {
    const candidate = followUps.find((item) => item.sourceStatus === "candidate");
    if (candidate) {
      return `Existe llave oficial ${candidate.joinKey}=${candidate.joinValue}, pero el resultado todavia no esta integrado.`;
    }
    return "Hay datos oficiales utiles, pero faltan documentos clave antes de usarlo como soporte fuerte.";
  }
  const firstGap = gaps[0]?.label.toLowerCase() ?? "datos centrales";
  return `Falta ${firstGap} antes de tomarlo como punto de partida robusto.`;
}

function missingCoreClaims(claims: EvidenceClaim[]): number {
  return claims.filter((claim) =>
    ["official_record", "declared_amount", "supplier_identity", "official_location"].includes(claim.code) &&
    claim.status === "not_supported"
  ).length;
}

function cleanBapin(caseFile: SignalCaseFile): string | null {
  const value = bapinLikeIdentifier(caseFile);
  if (!value) return null;
  return value.replace(/^bapin[-:\s]*/i, "").trim();
}

function severityRank(severity: CaseInvestigationGapSeverity): number {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

function claimPriority(code: EvidenceClaimCode): number {
  const index = GAP_PRIORITY.indexOf(code);
  return index === -1 ? GAP_PRIORITY.length : index;
}
