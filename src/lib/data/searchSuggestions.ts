import type { SignalCaseFile } from "./caseSignals.ts";

export type SearchSuggestionKind =
  | "case"
  | "supplier"
  | "agency"
  | "signal"
  | "identifier"
  | "source"
  | "document"
  | "alias"
  | "location";

export type SearchSuggestionCase = SignalCaseFile & {
  year?: number | null;
  agencyCode?: string;
  workProvince?: string | null;
  workDepartment?: string | null;
  workLocality?: string | null;
};

export interface SearchSuggestion {
  id: string;
  kind: SearchSuggestionKind;
  label: string;
  detail: string;
  query: string;
  caseId?: string;
}

export interface SearchSuggestionOptions {
  limit?: number;
}

interface StaticSuggestion {
  kind: "signal" | "alias";
  label: string;
  detail: string;
  query: string;
  keywords: string[];
}

const staticSuggestions: StaticSuggestion[] = [
  {
    kind: "alias",
    label: "DNV",
    detail: "Alias de organismo",
    query: "Dirección Nacional de Vialidad",
    keywords: ["dnv", "vialidad", "direccion nacional vialidad"],
  },
  {
    kind: "alias",
    label: "Lázaro Báez",
    detail: "Alias de persona/proveedor",
    query: "Grupo Baez",
    keywords: ["lazaro", "baez", "grupo baez", "austral construcciones"],
  },
  {
    kind: "signal",
    label: "1 oferente",
    detail: "Señal: competencia baja",
    query: "1 oferente",
    keywords: ["un oferente", "solo oferente", "competencia baja", "single bidder", "single_bidder"],
  },
  {
    kind: "signal",
    label: "Monto sobre presupuesto",
    detail: "Señal: monto mayor al presupuesto oficial",
    query: "monto sobre presupuesto",
    keywords: ["presupuesto oficial", "amount_over_official_budget"],
  },
  {
    kind: "signal",
    label: "Sin monto",
    detail: "Brecha: monto faltante",
    query: "sin monto",
    keywords: ["monto faltante", "missing amount", "missing_amount"],
  },
  {
    kind: "signal",
    label: "Contexto judicial",
    detail: "Fuente judicial oficial",
    query: "contexto judicial",
    keywords: ["causa judicial", "sentencia", "official_judicial_context"],
  },
  {
    kind: "signal",
    label: "Proveedor recurrente",
    detail: "Señal: recurrencia proveedor-organismo",
    query: "proveedor recurrente",
    keywords: ["ganador recurrente", "recurring supplier", "repeat_single_bid_winner"],
  },
  {
    kind: "signal",
    label: "Sin geometría",
    detail: "Brecha: falta ubicación oficial",
    query: "sin geometria",
    keywords: ["sin ubicacion", "missing geometry", "missing_official_geometry"],
  },
];

const queryAliases = [
  {
    match: "lazaro",
    expansions: ["baez", "grupo baez", "causa vialidad", "austral construcciones"],
  },
  {
    match: "dnv",
    expansions: ["direccion nacional vialidad", "vialidad"],
  },
  {
    match: "1 oferente",
    expansions: ["un oferente", "solo oferente", "competencia baja", "single bidder"],
  },
  {
    match: "un oferente",
    expansions: ["1 oferente", "competencia baja", "single bidder"],
  },
  {
    match: "sin monto",
    expansions: ["monto faltante", "missing amount"],
  },
];

export function normalizeSearchText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, " ")
    .replace(/[–—−]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function caseMatchesSearch(caseFile: SearchSuggestionCase, query: string | null | undefined): boolean {
  const normalizedQueries = expandSearchQuery(query);
  if (normalizedQueries.length === 0) return true;

  const haystack = normalizeSearchText(buildCaseSearchText(caseFile));
  return normalizedQueries.some((normalizedQuery) =>
    terms(normalizedQuery).every((term) => haystack.includes(term)),
  );
}

export function buildSearchSuggestions(
  cases: SearchSuggestionCase[],
  query: string,
  options: SearchSuggestionOptions = {},
): SearchSuggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  const limit = clampLimit(options.limit);
  const suggestions: SearchSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of staticSuggestions) {
    if (!matchesSuggestionText([suggestion.label, suggestion.detail, ...suggestion.keywords].join(" "), query)) {
      continue;
    }
    addSuggestion(suggestions, seen, {
      id: `${suggestion.kind}:${normalizeSearchText(suggestion.query)}`,
      kind: suggestion.kind,
      label: suggestion.label,
      detail: suggestion.detail,
      query: suggestion.query,
    });
  }

  const initialCaseTarget = Math.min(limit, suggestions.length + 3);
  for (const caseFile of cases) {
    if (!caseMatchesSearch(caseFile, query)) continue;
    addCaseSuggestion(suggestions, seen, caseFile);
    if (suggestions.length >= initialCaseTarget) break;
  }

  for (const caseFile of cases) {
    addEntitySuggestions(suggestions, seen, caseFile, query);
    if (suggestions.length >= limit) break;
  }

  for (const caseFile of cases) {
    if (!caseMatchesSearch(caseFile, query)) continue;
    addCaseSuggestion(suggestions, seen, caseFile);
    if (suggestions.length >= limit) break;
  }

  return suggestions.slice(0, limit);
}

function addCaseSuggestion(
  suggestions: SearchSuggestion[],
  seen: Set<string>,
  caseFile: SearchSuggestionCase,
) {
  addSuggestion(suggestions, seen, {
    id: `case:${caseFile.id}`,
    kind: "case",
    label: caseFile.title,
    detail: `${labelCaseType(caseFile.caseType)} · ${caseFile.receipt.sourceName}`,
    query: caseFile.title,
    caseId: caseFile.id,
  });
}

function addEntitySuggestions(
  suggestions: SearchSuggestion[],
  seen: Set<string>,
  caseFile: SearchSuggestionCase,
  query: string,
) {
  addFieldSuggestion({
    suggestions,
    seen,
    kind: "supplier",
    label: caseFile.supplierName,
    detail: caseFile.supplierDocument ? `Proveedor · ${caseFile.supplierDocument}` : "Proveedor",
    query,
    candidateText: [caseFile.supplierName, caseFile.supplierDocument].join(" "),
  });
  addFieldSuggestion({
    suggestions,
    seen,
    kind: "document",
    label: caseFile.supplierDocument,
    detail: "CUIT / documento de proveedor",
    query,
    candidateText: [caseFile.supplierDocument, compactIdentifier(caseFile.supplierDocument)].join(" "),
  });
  addFieldSuggestion({
    suggestions,
    seen,
    kind: "agency",
    label: caseFile.agencyName,
    detail: "Organismo",
    query,
    candidateText: [caseFile.agencyName, caseFile.agencyCode, caseFile.contractingUnit].join(" "),
  });
  addFieldSuggestion({
    suggestions,
    seen,
    kind: "source",
    label: caseFile.receipt.sourceName,
    detail: caseFile.receipt.sourceId,
    query,
    candidateText: [caseFile.receipt.sourceName, caseFile.receipt.sourceId].join(" "),
  });
  [caseFile.procedureNumber, caseFile.workNumber].forEach((identifier) => {
    addFieldSuggestion({
      suggestions,
      seen,
      kind: "identifier",
      label: identifier,
      detail: "Identificador oficial",
      query,
      candidateText: identifier,
    });
  });
  addFieldSuggestion({
    suggestions,
    seen,
    kind: "location",
    label: caseFile.workProvince,
    detail: "Provincia",
    query,
    candidateText: caseFile.workProvince,
  });
  addFieldSuggestion({
    suggestions,
    seen,
    kind: "location",
    label: caseFile.workDepartment,
    detail: "Departamento",
    query,
    candidateText: caseFile.workDepartment,
  });
  addFieldSuggestion({
    suggestions,
    seen,
    kind: "location",
    label: caseFile.workLocality,
    detail: "Localidad",
    query,
    candidateText: caseFile.workLocality,
  });
}

function addFieldSuggestion({
  suggestions,
  seen,
  kind,
  label,
  detail,
  query,
  candidateText,
}: {
  suggestions: SearchSuggestion[];
  seen: Set<string>;
  kind: Exclude<SearchSuggestionKind, "case" | "signal" | "alias">;
  label: string | null | undefined;
  detail: string;
  query: string;
  candidateText: string | null | undefined;
}) {
  const cleanLabel = String(label ?? "").trim();
  if (!cleanLabel) return;
  if (!matchesSuggestionText(candidateText, query)) return;
  addSuggestion(suggestions, seen, {
    id: `${kind}:${normalizeSearchText(cleanLabel)}`,
    kind,
    label: cleanLabel,
    detail,
    query: cleanLabel,
  });
}

function addSuggestion(
  suggestions: SearchSuggestion[],
  seen: Set<string>,
  suggestion: SearchSuggestion,
) {
  if (seen.has(suggestion.id)) return;
  seen.add(suggestion.id);
  suggestions.push(suggestion);
}

function matchesSuggestionText(value: string | null | undefined, query: string): boolean {
  const haystack = normalizeSearchText(value);
  return expandSearchQuery(query).some((normalizedQuery) =>
    terms(normalizedQuery).every((term) => haystack.includes(term)),
  );
}

function buildCaseSearchText(caseFile: SearchSuggestionCase): string {
  const parts = [
    caseFile.id,
    caseFile.title,
    caseFile.workNumber,
    caseFile.procedureNumber,
    caseFile.agencyName,
    caseFile.agencyCode,
    caseFile.contractingUnit,
    caseFile.supplierName,
    caseFile.supplierDocument,
    caseFile.judicialStatus,
    caseFile.contextSummary,
    caseFile.localMatchStatus,
    caseFile.workProvince,
    caseFile.workDepartment,
    caseFile.workLocality,
    caseFile.receipt.sourceId,
    caseFile.receipt.sourceName,
    buildDerivedSearchHints(caseFile),
  ];

  return parts.filter((value): value is string => value !== null && value !== undefined).join(" ");
}

function compactIdentifier(value: string | null | undefined): string {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "");
}

function buildDerivedSearchHints(caseFile: SearchSuggestionCase): string {
  const hints: string[] = [];
  if (caseFile.bidderCount === 1 || caseFile.offerCount === 1) {
    hints.push("1 oferente un oferente solo oferente competencia baja single bidder");
  }
  if (!caseFile.amount || !Number.isFinite(caseFile.amount.value) || caseFile.amount.value <= 0) {
    hints.push("sin monto monto faltante missing amount");
  }
  if (
    caseFile.amount &&
    caseFile.officialBudget &&
    caseFile.amount.currency === caseFile.officialBudget.currency &&
    caseFile.amount.value > caseFile.officialBudget.value * 1.05
  ) {
    hints.push("monto sobre presupuesto presupuesto oficial amount over official budget");
  }
  if (!caseFile.coordinates) {
    hints.push("sin geometria sin ubicacion missing geometry");
  } else {
    hints.push("con geometria con ubicacion mapa");
  }
  if (
    caseFile.caseType === "judicial_context" ||
    caseFile.caseType === "historical_public_work" ||
    caseFile.caseType === "supplier_judicial_context"
  ) {
    hints.push("contexto judicial causa judicial sentencia");
  }
  if (normalizeSearchText([caseFile.supplierName, caseFile.title, caseFile.contextSummary].join(" ")).includes("baez")) {
    hints.push("lazaro baez lazaro");
  }
  return hints.join(" ");
}

function expandSearchQuery(query: string | null | undefined): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const expanded = new Set([normalized]);
  for (const alias of queryAliases) {
    if (!terms(alias.match).every((term) => normalized.includes(term))) continue;
    alias.expansions.map(normalizeSearchText).forEach((value) => {
      if (value) expanded.add(value);
    });
  }
  return Array.from(expanded);
}

function terms(value: string): string[] {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function labelCaseType(caseType: string | undefined): string {
  if (caseType === "judicial_context") return "Contexto judicial";
  if (caseType === "historical_public_work") return "Obra historica";
  if (caseType === "supplier_judicial_context") return "Proveedor judicial";
  if (caseType === "procurement_contract") return "Contrato";
  if (caseType === "public_work") return "Obra";
  return "Expediente";
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 8;
  return Math.min(Math.max(Math.trunc(Number(limit)), 1), 12);
}
