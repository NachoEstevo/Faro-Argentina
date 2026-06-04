export type SourceCandidateStatus =
  | "recommended_prototype"
  | "evaluating"
  | "blocked"
  | "integrated";

export interface SourceCandidate {
  id: string;
  name: string;
  status: SourceCandidateStatus;
  officialUrl: string;
  evidenceLane: string;
  usefulFields: string[];
  joinRule: string;
  canSupport: string;
  caveat: string;
  nextStep: string;
}

export interface SourceCandidatePipeline {
  viewType: "faro_source_candidate_pipeline_v1";
  candidates: SourceCandidate[];
  summary: {
    total: number;
    recommendedPrototype: number;
    evaluating: number;
    blocked: number;
    integrated: number;
  };
  admissionRules: string[];
}

export const SOURCE_CANDIDATES: SourceCandidate[] = [
  {
    id: "ar-presupuesto-abierto-credito-bapin",
    name: "Presupuesto Abierto - crédito por BAPIN",
    status: "recommended_prototype",
    officialUrl: "https://www.presupuestoabierto.gob.ar/api/",
    evidenceLane: "Ejecución presupuestaria declarada",
    usefulFields: [
      "codigo_bapin_id",
      "credito_devengado",
      "credito_pagado",
      "ultima_actualizacion_fecha",
    ],
    joinRule: "Solo unir con Mapa de Inversiones cuando ambos lados exponen el mismo BAPIN oficial.",
    canSupport: "Comparar devengado/pagado presupuestario a nivel BAPIN o apertura presupuestaria.",
    caveat: "No prueba pago a un proveedor, factura, certificado ni recepción de obra.",
    nextStep: "Prototipo read-only con cinco casos Mapa que tengan codigobapin y guardar receipt por query.",
  },
  {
    id: "ar-presupuesto-abierto-pef",
    name: "Presupuesto Abierto - ejecución física",
    status: "evaluating",
    officialUrl: "https://www.presupuestoabierto.gob.ar/api/",
    evidenceLane: "Ejecución física presupuestaria",
    usefulFields: [
      "programa_id",
      "proyecto_id",
      "obra_id",
      "ejecutado_acumulado_trim",
    ],
    joinRule: "Usar solo clasificadores presupuestarios; no unir por nombres, montos o cercanía geográfica.",
    canSupport: "Contexto de metas físicas programadas y ejecutadas cuando el clasificador coincide.",
    caveat: "Puede agrupar varias obras y no reemplaza certificado, inspección ni acta de recepción.",
    nextStep: "Revisar si el clasificador permite un subconjunto defendible antes de escribir parser.",
  },
  {
    id: "ar-contratar-historico-1169",
    name: "CONTRAT.AR histórico Decreto 1169/2018",
    status: "evaluating",
    officialUrl: "https://datos.gob.ar/dataset/jgm-contratar-historico",
    evidenceLane: "Ejecución/certificación histórica",
    usefulFields: [
      "bapin",
      "avance_fisico",
      "monto_certificado",
      "ampliaciones_al_contrato_original_porcentaje",
    ],
    joinRule: "Mantenerlo como dataset histórico por período; no mezclar con contratos actuales sin llave documentada.",
    canSupport: "Certificación y avance histórico para obras alcanzadas por ese régimen.",
    caveat: "Monto certificado no equivale a pago y la cobertura no representa contratos actuales.",
    nextStep: "Perfilar schema, fechas y llaves antes de decidir si entra como fuente separada.",
  },
  {
    id: "ar-sigen-agn-reportes",
    name: "SIGEN / AGN reportes revisados",
    status: "blocked",
    officialUrl: "https://www.sigen.gob.ar/archivoweb/Buscador.aspx",
    evidenceLane: "Contexto de control externo",
    usefulFields: [
      "organismo",
      "año",
      "número de informe",
      "alcance del informe",
    ],
    joinRule: "Solo cita manual revisada por informe; no usar como feed tabular automático.",
    canSupport: "Contexto documental de auditoría cuando el informe se revisa y cita explícitamente.",
    caveat: "No es fuente row-level para cerrar pagos, avances o relaciones entre expedientes.",
    nextStep: "Diseñar flujo editorial de citas antes de cualquier exposición pública.",
  },
];

export function buildSourceCandidatePipeline(
  candidates: SourceCandidate[] = SOURCE_CANDIDATES,
): SourceCandidatePipeline {
  const summary = {
    total: candidates.length,
    recommendedPrototype: candidates.filter((candidate) => candidate.status === "recommended_prototype").length,
    evaluating: candidates.filter((candidate) => candidate.status === "evaluating").length,
    blocked: candidates.filter((candidate) => candidate.status === "blocked").length,
    integrated: candidates.filter((candidate) => candidate.status === "integrated").length,
  };
  return {
    viewType: "faro_source_candidate_pipeline_v1",
    candidates,
    summary,
    admissionRules: [
      "La fuente debe ser oficial o documentalmente verificable.",
      "Debe conservar URL/query, snapshot, hash, receipt y fecha de extracción.",
      "La llave de cruce debe estar declarada por la fuente; no se aceptan joins por nombres parecidos.",
      "Cada campo nuevo debe declarar qué afirmación permite y qué no permite.",
      "Si el cruce no devuelve filas, se registra brecha de datos, no valor cero.",
    ],
  };
}

export function labelSourceCandidateStatus(status: SourceCandidateStatus): string {
  if (status === "recommended_prototype") return "Prototipo recomendado";
  if (status === "evaluating") return "En evaluación";
  if (status === "blocked") return "Bloqueada";
  return "Integrada";
}
