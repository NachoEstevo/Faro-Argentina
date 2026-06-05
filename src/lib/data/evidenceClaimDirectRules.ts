import type { SignalCaseFile } from "./caseSignals.ts";
import type { EvidenceClaim } from "./evidenceClaimMatrix.ts";
import {
  clean,
  isPositive,
  numberOrNull,
  recordId,
  round,
} from "./evidenceClaimRuleUtils.ts";

export function officialRecordClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  return {
    code: "official_record",
    label: "Registro oficial",
    status: "supported",
    confidence: "high",
    sourceIds,
    evidence: `Fuente principal: ${caseFile.receipt.sourceId}. Registro: ${recordId(caseFile)}.`,
    caveat: "El registro oficial muestra que el expediente existe en la fuente; no prueba hechos fuera de esa fuente.",
    nextStep: "Abrir la fuente oficial y conservar el receipt antes de citar el expediente.",
  };
}

export function declaredAmountClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  if (caseFile.amount && isPositive(caseFile.amount.value)) {
    return {
      code: "declared_amount",
      label: "Monto declarado",
      status: "supported",
      confidence: "high",
      sourceIds,
      evidence: `${caseFile.amount.currency} ${round(caseFile.amount.value)} declarado por ${caseFile.receipt.sourceId}.`,
      caveat: "Monto declarado en la fuente; no equivale a pago, factura, certificado ni recepción de obra.",
      nextStep: "Comparar con contrato, presupuesto oficial, ampliaciones y documentos de ejecución.",
    };
  }
  return {
    code: "declared_amount",
    label: "Monto declarado",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "El expediente no expone un monto usable en el snapshot actual.",
    caveat: "La ausencia de monto puede ser una brecha de cobertura o formato; no es una señal de irregularidad.",
    nextStep: "Abrir la fuente oficial y buscar contrato, orden, adjudicación o partida con monto verificable.",
  };
}

export function officialBudgetClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  if (caseFile.officialBudget && isPositive(caseFile.officialBudget.value)) {
    return {
      code: "official_budget",
      label: "Presupuesto oficial",
      status: "supported",
      confidence: "high",
      sourceIds,
      evidence: `${caseFile.officialBudget.currency} ${round(caseFile.officialBudget.value)} declarado como presupuesto oficial.`,
      caveat: "El presupuesto oficial puede cambiar por ampliaciones o documentos no incluidos en este snapshot.",
      nextStep: "Revisar ampliaciones, dictámenes y documentos de adjudicación antes de comparar porcentajes.",
    };
  }
  return {
    code: "official_budget",
    label: "Presupuesto oficial",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "No hay presupuesto oficial estructurado para este expediente en el snapshot actual.",
    caveat: "Sin presupuesto oficial no se puede medir sobreprecio o variación desde Faro.",
    nextStep: "Buscar presupuesto oficial, ampliaciones y documentación de pliego en la fuente original.",
  };
}

export function supplierIdentityClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  if (clean(caseFile.supplierDocument)) {
    return {
      code: "supplier_identity",
      label: "Proveedor",
      status: "supported",
      confidence: "high",
      sourceIds,
      evidence: `${clean(caseFile.supplierName) || "Proveedor sin razón social"} / ${clean(caseFile.supplierDocument)}.`,
      caveat: "La identidad del proveedor no prueba pagos, calidad de ejecución ni vínculos no declarados.",
      nextStep: "Usar CUIT/documento exacto para pivots; evitar joins por nombres parecidos.",
    };
  }
  if (clean(caseFile.supplierName)) {
    return {
      code: "supplier_identity",
      label: "Proveedor",
      status: "partial",
      confidence: "medium",
      sourceIds,
      evidence: `Razón social declarada: ${clean(caseFile.supplierName)}.`,
      caveat: "Sin CUIT/documento exacto, el pivot de entidad debe tratarse como lectura parcial.",
      nextStep: "Buscar CUIT/documento en SIPRO, contrato o fuente original antes de relacionar expedientes.",
    };
  }
  return {
    code: "supplier_identity",
    label: "Proveedor",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "No hay proveedor identificado en este expediente.",
    caveat: "No se deben inferir proveedores por nombre de obra, organismo, monto o ubicación.",
    nextStep: "Abrir contrato/adjudicación o fuente complementaria con CUIT/documento.",
  };
}

export function competitionClaim(caseFile: SignalCaseFile, sourceIds: string[]): EvidenceClaim {
  const bidderCount = numberOrNull(caseFile.bidderCount);
  const offerCount = numberOrNull(caseFile.offerCount);
  if (bidderCount !== null || offerCount !== null) {
    return {
      code: "competition",
      label: "Competencia",
      status: "supported",
      confidence: "high",
      sourceIds,
      evidence: [
        bidderCount !== null ? `${bidderCount} oferente(s)` : "",
        offerCount !== null ? `${offerCount} oferta(s)` : "",
      ].filter(Boolean).join(" · "),
      caveat: "Cantidad de oferentes/ofertas prioriza revisión; no evalúa legalidad ni calidad técnica.",
      nextStep: "Abrir actas, ofertas y pliego; comparar con procedimientos similares del mismo rubro.",
    };
  }
  return {
    code: "competition",
    label: "Competencia",
    status: "not_supported",
    confidence: "high",
    sourceIds,
    evidence: "No hay cantidad de oferentes u ofertas estructurada para este expediente.",
    caveat: "Sin actas/ofertas no se puede evaluar concurrencia desde Faro.",
    nextStep: "Buscar acta de apertura, ofertas confirmadas o documentos de procedimiento.",
  };
}
