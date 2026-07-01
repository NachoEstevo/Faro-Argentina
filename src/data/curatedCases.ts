export type CuratedCaseRole =
  | "judicial_context"
  | "validated_geometry"
  | "data_gap"
  | "entity_pattern";

export type CuratedMapState = "map_ready" | "not_map_ready";

export interface CuratedTimelineItem {
  label: string;
  value: string;
  source: string;
}

export interface CuratedKeyFact {
  label: string;
  value: string;
}

export interface CuratedCase {
  caseId: string;
  countryCode: "AR";
  role: CuratedCaseRole;
  mapState: CuratedMapState;
  kicker: string;
  title: string;
  summary: string;
  presentationReason: string;
  officialBasis: string;
  caveat: string;
  nextStep: string;
  timeline: CuratedTimelineItem[];
  keyFacts: CuratedKeyFact[];
  contextNote: string;
  mapLabel: string;
  actions: Array<"open_case" | "open_source" | "export">;
  tags: string[];
}

export const CURATED_CASES: CuratedCase[] = [
  {
    caseId: "AR-CONTRACT-46-1585-CON21",
    countryCode: "AR",
    role: "validated_geometry",
    mapState: "map_ready",
    kicker: "OBRA CON GEOMETRÍA",
    title: "Ruta Nacional 3 Patagonia",
    summary: "Contrato, proveedor, monto y geometría oficial validada para abrir expediente y rastro oficial.",
    presentationReason: "Muestra el flujo completo: punto oficial, contrato, proveedor, monto, fuente y caveats.",
    officialBasis: "CONTRAT.AR contratos.",
    caveat: "El contrato oficial no confirma pago ni avance físico por sí solo.",
    nextStep: "Cruzar con certificados, pagos, recepciones o avance físico cuando existan fuentes oficiales.",
    timeline: [
      { label: "Publicación", value: "02/09/2021", source: "CONTRAT.AR procedimientos" },
      { label: "Cierre de consultas", value: "04/10/2021", source: "CONTRAT.AR procedimientos" },
      { label: "Acta de apertura", value: "15/10/2021", source: "CONTRAT.AR actas" },
    ],
    keyFacts: [
      { label: "Monto", value: "ARS 6.692,98 M" },
      { label: "Competencia", value: "2 oferentes" },
      { label: "Lugar", value: "Caleta Olivia, Santa Cruz" },
    ],
    contextNote: "Contrato moderno de DNV con geometría oficial; no debe mezclarse automáticamente con Causa Vialidad.",
    mapLabel: "geometría oficial validada",
    actions: ["open_case", "open_source", "export"],
    tags: ["DNV", "RN 3", "Mapa"],
  },
  {
    caseId: "AR-MAPA-INV-1003129182",
    countryCode: "AR",
    role: "data_gap",
    mapState: "not_map_ready",
    kicker: "BRECHA DE DATOS",
    title: "Acueducto Río Colorado",
    summary: "Obra con monto y avance declarado disponible, pero sin geometría oficial validada para mapa.",
    presentationReason: "Sirve para explicar que Faro también muestra brechas: hay dato oficial, pero no punto confiable.",
    officialBasis: "Mapa de Inversiones Argentina.",
    caveat: "La fuente actual no permite dibujar la obra en mapa ni confirma pagos por sí sola.",
    nextStep: "Buscar geometría oficial, certificados o pagos antes de tratarlo como caso territorial.",
    timeline: [
      { label: "Inicio", value: "2023", source: "Mapa de Inversiones" },
      { label: "Fin previsto", value: "2026", source: "Mapa de Inversiones" },
      { label: "Duración", value: "750 días", source: "Mapa de Inversiones" },
    ],
    keyFacts: [
      { label: "Monto", value: "ARS 124.165,7 M" },
      { label: "Avance físico", value: "6,11 %" },
      { label: "Avance financiero", value: "6,32 %" },
    ],
    contextNote: "El dato de avance existe, pero el snapshot no trae coordenadas: Faro lo conserva como brecha, no como punto.",
    mapLabel: "sin punto de mapa validado",
    actions: ["open_case", "open_source", "export"],
    tags: ["Mapa de Inversiones", "Avance", "Sin geometría"],
  },
  {
    caseId: "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME",
    countryCode: "AR",
    role: "judicial_context",
    mapState: "not_map_ready",
    kicker: "CONTEXTO JUDICIAL",
    title: "Causa Vialidad",
    summary: "Fuente judicial oficial para leer contexto, estado documental y límites de alcance.",
    presentationReason: "Permite separar contexto judicial oficial de contratos administrativos actuales.",
    officialBasis: "CIJ / Poder Judicial de la Nación.",
    caveat: "No identifica por sí solo contratos actuales de Faro ni reemplaza expedientes administrativos.",
    nextStep: "Revisar fuente judicial y buscar matches administrativos exactos antes de relacionar obras modernas.",
    timeline: [
      { label: "Periodo analizado", value: "2003-2015", source: "MPF / CIJ" },
      { label: "Veredicto TOF2", value: "06/12/2022", source: "CIJ" },
      { label: "Firmeza", value: "10/06/2025", source: "CIJ" },
    ],
    keyFacts: [
      { label: "Alcance", value: "51 procesos viales" },
      { label: "Jurisdicción", value: "Santa Cruz" },
      { label: "Match Faro", value: "sin unión directa CONTRAT.AR" },
    ],
    contextNote: "Faro tiene el contexto judicial y algunos extractos históricos; la carga completa de las 51 obras requiere otro sprint de datos.",
    mapLabel: "sin punto de mapa validado",
    actions: ["open_case", "open_source", "export"],
    tags: ["CIJ", "Contexto", "Vialidad"],
  },
  {
    caseId: "AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026",
    countryCode: "AR",
    role: "judicial_context",
    mapState: "not_map_ready",
    kicker: "CONTEXTO JUDICIAL",
    title: "Cuadernos / La Camarita",
    summary: "Fuente fiscal oficial para revisar entidades mencionadas y cruces documentales posibles.",
    presentationReason: "Explica cómo usar menciones oficiales como contexto, no como conclusión automática.",
    officialBasis: "Ministerio Público Fiscal de la Nación.",
    caveat: "El contexto judicial no afirma que contratos Faro relacionados sean hechos del juicio.",
    nextStep: "Separar match de proveedor de match documental de contrato antes de citar relaciones.",
    timeline: [
      { label: "Causa base", value: "2018", source: "MPF" },
      { label: "Req. elevación", value: "20/11/2019", source: "MPF" },
      { label: "Lectura", value: "09/12/2025", source: "MPF" },
    ],
    keyFacts: [
      { label: "Tramo", value: "La Camarita" },
      { label: "Tribunal", value: "TOF 7" },
      { label: "Estado", value: "juicio en curso al snapshot" },
    ],
    contextNote: "Es contexto de red y entidades mencionadas; no convierte contratos Faro en hechos del juicio.",
    mapLabel: "sin punto de mapa validado",
    actions: ["open_case", "open_source", "export"],
    tags: ["MPF", "TOF 7", "Contexto"],
  },
  {
    caseId: "AR-CONTRACT-74-0052-CON23",
    countryCode: "AR",
    role: "validated_geometry",
    mapState: "map_ready",
    kicker: "CONTRATO COMPARABLE",
    title: "Sistema cloacal en Parque Nacional Campos del Tuyu",
    summary: "Contrato con geometría oficial validada, presupuesto oficial, monto adjudicado y proveedor identificado.",
    presentationReason: "Aporta otro organismo y un caso chico pero completo para demostrar que el método no depende de un solo sector.",
    officialBasis: "CONTRAT.AR contratos.",
    caveat: "El contrato oficial no confirma pago, avance físico ni calidad de ejecución por sí solo.",
    nextStep: "Revisar actas, ampliaciones, certificados de avance y recepción de obra si existen fuentes oficiales.",
    timeline: [
      { label: "Publicación", value: "29/09/2022", source: "CONTRAT.AR procedimientos" },
      { label: "Acta de apertura", value: "18/11/2022", source: "CONTRAT.AR actas" },
      { label: "Contrato", value: "31/01/2023", source: "CONTRAT.AR contratos" },
    ],
    keyFacts: [
      { label: "Monto", value: "ARS 14,68 M" },
      { label: "Presupuesto", value: "ARS 12,23 M" },
      { label: "Competencia", value: "1 oferente" },
    ],
    contextNote: "Caso chico con geometría y rastro económico completo; la baja competencia exige revisar pliegos y actas antes de concluir.",
    mapLabel: "geometría oficial validada",
    actions: ["open_case", "open_source", "export"],
    tags: ["Parques Nacionales", "Saneamiento", "Mapa"],
  },
];
