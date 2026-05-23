export type CuratedCaseRole =
  | "judicial_context"
  | "validated_geometry"
  | "data_gap"
  | "entity_pattern";

export type CuratedMapState = "map_ready" | "not_map_ready";

export interface CuratedCase {
  caseId: string;
  countryCode: "AR";
  role: CuratedCaseRole;
  mapState: CuratedMapState;
  kicker: string;
  title: string;
  summary: string;
  officialBasis: string;
  caveat: string;
  nextStep: string;
  mapLabel: string;
  actions: Array<"open_case" | "open_source" | "save_to_folder" | "export">;
  tags: string[];
}

export const CURATED_CASES: CuratedCase[] = [
  {
    caseId: "AR-CONTRACT-46-1585-CON21",
    countryCode: "AR",
    role: "validated_geometry",
    mapState: "map_ready",
    kicker: "OBRA CON GEOMETRIA",
    title: "Ruta Nacional 3 Patagonia",
    summary: "Contrato, proveedor, monto y geometria oficial validada para abrir expediente y rastro oficial.",
    officialBasis: "CONTRAT.AR contratos.",
    caveat: "El contrato oficial no confirma pago ni avance fisico por si solo.",
    nextStep: "Cruzar con certificados, pagos, recepciones o avance fisico cuando existan fuentes oficiales.",
    mapLabel: "geometria oficial validada",
    actions: ["open_case", "open_source", "save_to_folder", "export"],
    tags: ["DNV", "RN 3", "Mapa"],
  },
  {
    caseId: "AR-MAPA-INV-1003129182",
    countryCode: "AR",
    role: "data_gap",
    mapState: "not_map_ready",
    kicker: "BRECHA DE DATOS",
    title: "Acueducto Rio Colorado",
    summary: "Obra con monto y avance declarado disponible, pero sin geometria oficial validada para mapa.",
    officialBasis: "Mapa de Inversiones Argentina.",
    caveat: "La fuente actual no permite dibujar la obra en mapa ni confirma pagos por si sola.",
    nextStep: "Buscar geometria oficial, certificados o pagos antes de tratarlo como caso territorial.",
    mapLabel: "sin punto de mapa validado",
    actions: ["open_case", "open_source", "save_to_folder", "export"],
    tags: ["Mapa de Inversiones", "Avance", "Sin geometria"],
  },
  {
    caseId: "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME",
    countryCode: "AR",
    role: "judicial_context",
    mapState: "not_map_ready",
    kicker: "CONTEXTO JUDICIAL",
    title: "Causa Vialidad",
    summary: "Fuente judicial oficial para leer contexto, estado documental y limites de alcance.",
    officialBasis: "CIJ / Poder Judicial de la Nacion.",
    caveat: "No identifica por si solo contratos actuales de Faro ni reemplaza expedientes administrativos.",
    nextStep: "Revisar fuente judicial y buscar matches administrativos exactos antes de relacionar obras modernas.",
    mapLabel: "sin punto de mapa validado",
    actions: ["open_case", "open_source", "save_to_folder", "export"],
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
    officialBasis: "Ministerio Publico Fiscal de la Nacion.",
    caveat: "El contexto judicial no afirma que contratos Faro relacionados sean hechos del juicio.",
    nextStep: "Separar match de proveedor de match documental de contrato antes de citar relaciones.",
    mapLabel: "sin punto de mapa validado",
    actions: ["open_case", "open_source", "save_to_folder", "export"],
    tags: ["MPF", "TOF 7", "Contexto"],
  },
];
