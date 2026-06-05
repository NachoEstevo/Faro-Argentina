import type { SignalCaseFile } from "./caseSignals.ts";
import { assessCoordinateQuality } from "./coordinateQuality.ts";
import type { EvidenceClaim } from "./evidenceClaimMatrix.ts";
import {
  bapinLikeIdentifier,
  clean,
  isJudicialContextCase,
  numberOrNull,
  readString,
} from "./evidenceClaimRuleUtils.ts";

export function officialLocationClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  const coordinateQuality = assessCoordinateQuality({
    caseId: caseFile.id,
    countryCode: caseFile.countryCode,
    coordinates: caseFile.coordinates ?? null,
  });
  const geoLabel = caseFile.geoEvidence?.find((evidence) => evidence.exposeOnMap)?.label;
  if (coordinateQuality.exposeOnMap) {
    return {
      code: "official_location",
      label: "Ubicación oficial",
      status: "supported",
      confidence: geoLabel ? "medium" : "high",
      sourceIds,
      evidence: geoLabel ?? `Latitud ${caseFile.coordinates?.lat}; longitud ${caseFile.coordinates?.lon}.`,
      caveat: geoLabel
        ? "Puede ser referencia administrativa oficial; no necesariamente sitio exacto de ejecución."
        : "La geometría pasa el gate de mapa, pero debe revisarse antes de hacer análisis satelital fino.",
      nextStep: "Abrir fuente oficial y confirmar si la coordenada es sitio de obra o referencia administrativa.",
    };
  }
  if (caseFile.coordinates) {
    return partialLocation(sourceIds, "Hay coordenadas en el registro, pero no son elegibles para mapa.");
  }
  const administrativeLocation = [
    readString(caseFile, "workProvince"),
    readString(caseFile, "workDepartment"),
    readString(caseFile, "workLocality"),
    readString(caseFile, "locationName"),
  ].filter(Boolean).join(" / ");
  if (administrativeLocation) return partialLocation(sourceIds, administrativeLocation);
  return {
    code: "official_location",
    label: "Ubicación oficial",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "No hay ubicación oficial usable en el snapshot actual.",
    caveat: "No geocodificar ni inferir coordenadas desde texto, organismo o proveedor.",
    nextStep: "Buscar ubicación oficial en fuente original o dataset territorial verificable.",
  };
}

export function declaredProgressClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  const physical = numberOrNull(caseFile.physicalProgress);
  const financial = numberOrNull(caseFile.financialProgress);
  if (physical !== null || financial !== null) {
    return {
      code: "declared_progress",
      label: "Avance declarado",
      status: "supported",
      confidence: "high",
      sourceIds,
      evidence: [
        physical !== null ? `avance físico ${physical}%` : "",
        financial !== null ? `avance financiero ${financial}%` : "",
      ].filter(Boolean).join(" · "),
      caveat: "Avance declarado por fuente oficial; no reemplaza certificado, inspección ni recepción.",
      nextStep: "Cruzar con certificados, pagos, actas de recepción o verificación territorial.",
    };
  }
  return {
    code: "declared_progress",
    label: "Avance declarado",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "No hay avance físico/financiero estructurado para este expediente.",
    caveat: "Sin fuente de avance no se debe inferir ejecución desde monto, contrato o mapa.",
    nextStep: "Buscar Mapa de Inversiones, certificados, actas o inspecciones oficiales.",
  };
}

export function providerPaymentClaim(): EvidenceClaim {
  return {
    code: "provider_payment",
    label: "Pago a proveedor",
    status: "not_supported",
    confidence: "high",
    sourceIds: [],
    evidence: "Ninguna fuente integrada actual prueba pago efectivo a proveedor para el expediente.",
    caveat: "Contrato, adjudicación, avance o crédito presupuestario no prueba pago a un proveedor.",
    nextStep: "Buscar una fuente oficial de pagos, certificados, órdenes de pago o ejecución financiera con llave exacta.",
  };
}

export function judicialContextClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  if (isJudicialContextCase(caseFile)) {
    return {
      code: "judicial_context",
      label: "Contexto judicial",
      status: "supported",
      confidence: "high",
      sourceIds,
      evidence: clean(caseFile.judicialStatus) || clean(caseFile.contextSummary) || `Fuente: ${caseFile.receipt.sourceId}.`,
      caveat: "El contexto judicial no prueba por sí solo nada sobre otros contratos Faro sin match documental exacto.",
      nextStep: "Abrir fuente judicial y verificar alcance, estado procesal y relación documental antes de citar.",
    };
  }
  return {
    code: "judicial_context",
    label: "Contexto judicial",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "No hay fuente judicial integrada para este expediente.",
    caveat: "No relacionar con causas judiciales por proveedor, zona o monto sin documento que lo sostenga.",
    nextStep: "Buscar expediente judicial, resolución o fuente oficial y registrar el match exacto si existe.",
  };
}

export function budgetExecutionClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  const bapin = bapinLikeIdentifier(caseFile);
  if (caseFile.receipt.sourceId === "AR-MAPA-INVERSIONES-OBRAS" && bapin) {
    return {
      code: "budget_execution",
      label: "Rastro presupuestario BAPIN",
      status: "partial",
      confidence: "medium",
      sourceIds,
      evidence: `Identificador BAPIN/proyecto en fuente Mapa: ${bapin}.`,
      caveat: "Presupuesto Abierto todavía no está integrado en este corpus; BAPIN permite un próximo cruce, no una conclusión.",
      nextStep: "Probar query read-only contra Presupuesto Abierto por BAPIN y guardar receipt por query antes de exponer resultados.",
    };
  }
  return {
    code: "budget_execution",
    label: "Rastro presupuestario BAPIN",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "No hay cruce presupuestario BAPIN integrado para este expediente.",
    caveat: "No unir con Presupuesto Abierto por nombres, montos, CUIT o ubicación cercana.",
    nextStep: "Usar solo una llave BAPIN o clasificador oficial documentado para el futuro cruce.",
  };
}

function partialLocation(sourceIds: string[], evidence: string): EvidenceClaim {
  return {
    code: "official_location",
    label: "Ubicación oficial",
    status: "partial",
    confidence: "medium",
    sourceIds,
    evidence,
    caveat: "Faro conserva la brecha y no dibuja el punto porque la geometría no pasó validación.",
    nextStep: "Buscar geometría oficial, perfil de obra o documento territorial antes de mapear.",
  };
}
