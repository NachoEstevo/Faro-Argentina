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
  matchCount?: number;
  caseId?: string;
}

export interface SearchSuggestionOptions {
  limit?: number;
}

export interface SearchSuggestionIndex {
  staticCandidates: SearchSuggestionCandidate[];
  entityCandidates: SearchSuggestionCandidate[];
  caseCandidates: SearchSuggestionCandidate[];
}

export interface CaseLinkSuggestionIndex {
  caseCandidates: SearchSuggestionCandidate[];
  identifierCandidates: SearchSuggestionCandidate[];
  sourceCandidates: SearchSuggestionCandidate[];
}

interface SearchSuggestionCandidate {
  suggestion: SearchSuggestion;
  searchText: string;
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
  return buildSearchSuggestionsFromIndex(buildSearchSuggestionIndex(cases), query, options);
}

export function buildSearchSuggestionIndex(cases: SearchSuggestionCase[]): SearchSuggestionIndex {
  return {
    staticCandidates: buildStaticSuggestionCandidates(),
    entityCandidates: cases.flatMap(buildEntitySuggestionCandidates),
    caseCandidates: cases.map(buildCaseSuggestionCandidate),
  };
}

export function buildSearchSuggestionsFromIndex(
  index: SearchSuggestionIndex,
  query: string,
  options: SearchSuggestionOptions = {},
): SearchSuggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  const limit = clampLimit(options.limit);
  const suggestions: SearchSuggestion[] = [];
  const byId = new Map<string, SearchSuggestion>();
  const normalizedQueries = expandSearchQuery(query);

  for (const candidate of index.staticCandidates) {
    if (!matchesNormalizedSuggestionText(candidate.searchText, normalizedQueries)) continue;
    addSuggestion(suggestions, byId, { ...candidate.suggestion });
  }

  for (const candidate of index.entityCandidates) {
    if (!matchesNormalizedSuggestionText(candidate.searchText, normalizedQueries)) continue;
    addSuggestion(suggestions, byId, { ...candidate.suggestion });
  }

  let caseSuggestions = 0;
  for (const candidate of index.caseCandidates) {
    if (!matchesNormalizedSuggestionText(candidate.searchText, normalizedQueries)) continue;
    addSuggestion(suggestions, byId, { ...candidate.suggestion });
    caseSuggestions += 1;
    if (caseSuggestions >= limit * 3) break;
  }

  return suggestions
    .sort((left, right) => compareSearchSuggestions(left, right, normalizedQuery))
    .slice(0, limit);
}

export function buildCaseLinkSuggestions(
  cases: SearchSuggestionCase[],
  query: string,
  options: SearchSuggestionOptions = {},
): SearchSuggestion[] {
  return buildCaseLinkSuggestionsFromIndex(buildCaseLinkSuggestionIndex(cases), query, options);
}

export function buildCaseLinkSuggestionIndex(cases: SearchSuggestionCase[]): CaseLinkSuggestionIndex {
  const identifierCandidates: SearchSuggestionCandidate[] = [];
  const sourceCandidates: SearchSuggestionCandidate[] = [];

  for (const caseFile of cases) {
    [caseFile.procedureNumber, caseFile.workNumber].forEach((identifier) => {
      addFieldCandidate(identifierCandidates, {
        kind: "identifier",
        label: identifier,
        detail: "Identificador oficial",
        candidateText: identifier,
      });
    });
    addFieldCandidate(sourceCandidates, {
      kind: "source",
      label: caseFile.receipt.sourceName,
      detail: caseFile.receipt.sourceId,
      candidateText: [caseFile.receipt.sourceName, caseFile.receipt.sourceId].join(" "),
    });
  }

  return {
    caseCandidates: cases.map(buildCaseLinkSuggestionCandidate),
    identifierCandidates,
    sourceCandidates,
  };
}

export function buildCaseLinkSuggestionsFromIndex(
  index: CaseLinkSuggestionIndex,
  query: string,
  options: SearchSuggestionOptions = {},
): SearchSuggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  const limit = clampLimit(options.limit);
  const suggestions: SearchSuggestion[] = [];
  const byId = new Map<string, SearchSuggestion>();
  const normalizedQueries = expandSearchQuery(query);

  let caseSuggestions = 0;
  for (const candidate of index.caseCandidates) {
    if (!matchesNormalizedSuggestionText(candidate.searchText, normalizedQueries)) continue;
    addSuggestion(suggestions, byId, { ...candidate.suggestion });
    caseSuggestions += 1;
    if (caseSuggestions >= limit * 3) break;
  }

  for (const candidate of index.identifierCandidates) {
    if (!matchesNormalizedSuggestionText(candidate.searchText, normalizedQueries)) continue;
    addSuggestion(suggestions, byId, { ...candidate.suggestion });
  }

  for (const candidate of index.sourceCandidates) {
    if (!matchesNormalizedSuggestionText(candidate.searchText, normalizedQueries)) continue;
    addSuggestion(suggestions, byId, { ...candidate.suggestion });
  }

  return suggestions
    .sort((left, right) => compareSearchSuggestions(left, right, normalizedQuery))
    .slice(0, limit);
}

function addCaseSuggestion(
  suggestions: SearchSuggestion[],
  byId: Map<string, SearchSuggestion>,
  caseFile: SearchSuggestionCase,
) {
  addSuggestion(suggestions, byId, {
    id: `case:${caseFile.id}`,
    kind: "case",
    label: caseFile.title,
    detail: `${labelCaseType(caseFile.caseType)} · ${caseFile.receipt.sourceName}`,
    query: caseFile.title,
    caseId: caseFile.id,
  });
}

function buildCaseSuggestionCandidate(caseFile: SearchSuggestionCase): SearchSuggestionCandidate {
  return {
    suggestion: {
      id: `case:${caseFile.id}`,
      kind: "case",
      label: caseFile.title,
      detail: `${labelCaseType(caseFile.caseType)} · ${caseFile.receipt.sourceName}`,
      query: caseFile.title,
      caseId: caseFile.id,
    },
    searchText: normalizeSearchText(buildCaseSearchText(caseFile)),
  };
}

function buildCaseLinkSuggestionCandidate(caseFile: SearchSuggestionCase): SearchSuggestionCandidate {
  return {
    suggestion: {
      id: `case:${caseFile.id}`,
      kind: "case",
      label: caseFile.title,
      detail: `${labelCaseType(caseFile.caseType)} · ${caseFile.receipt.sourceName}`,
      query: caseFile.title,
      caseId: caseFile.id,
    },
    searchText: normalizeSearchText(buildCaseLinkSearchText(caseFile)),
  };
}

function buildStaticSuggestionCandidates(): SearchSuggestionCandidate[] {
  return staticSuggestions.map((suggestion) => ({
    suggestion: {
      id: `${suggestion.kind}:${normalizeSearchText(suggestion.query)}`,
      kind: suggestion.kind,
      label: suggestion.label,
      detail: suggestion.detail,
      query: suggestion.query,
    },
    searchText: normalizeSearchText([suggestion.label, suggestion.detail, ...suggestion.keywords].join(" ")),
  }));
}

function buildEntitySuggestionCandidates(caseFile: SearchSuggestionCase): SearchSuggestionCandidate[] {
  const candidates: SearchSuggestionCandidate[] = [];
  addFieldCandidate(candidates, {
    kind: "supplier",
    label: caseFile.supplierName,
    detail: caseFile.supplierDocument ? `Proveedor · ${caseFile.supplierDocument}` : "Proveedor",
    candidateText: [caseFile.supplierName, caseFile.supplierDocument].join(" "),
  });
  addFieldCandidate(candidates, {
    kind: "document",
    label: caseFile.supplierDocument,
    detail: "CUIT / documento de proveedor",
    candidateText: [caseFile.supplierDocument, compactIdentifier(caseFile.supplierDocument)].join(" "),
  });
  addFieldCandidate(candidates, {
    kind: "agency",
    label: caseFile.agencyName,
    detail: "Organismo",
    candidateText: [caseFile.agencyName, caseFile.agencyCode, caseFile.contractingUnit].join(" "),
  });
  addFieldCandidate(candidates, {
    kind: "source",
    label: caseFile.receipt.sourceName,
    detail: caseFile.receipt.sourceId,
    candidateText: [caseFile.receipt.sourceName, caseFile.receipt.sourceId].join(" "),
  });
  [caseFile.procedureNumber, caseFile.workNumber].forEach((identifier) => {
    addFieldCandidate(candidates, {
      kind: "identifier",
      label: identifier,
      detail: "Identificador oficial",
      candidateText: identifier,
    });
  });
  addFieldCandidate(candidates, {
    kind: "location",
    label: caseFile.workProvince,
    detail: "Provincia",
    candidateText: caseFile.workProvince,
  });
  addFieldCandidate(candidates, {
    kind: "location",
    label: caseFile.workDepartment,
    detail: "Departamento",
    candidateText: caseFile.workDepartment,
  });
  addFieldCandidate(candidates, {
    kind: "location",
    label: caseFile.workLocality,
    detail: "Localidad",
    candidateText: caseFile.workLocality,
  });
  return candidates;
}

function addFieldCandidate(
  candidates: SearchSuggestionCandidate[],
  {
    kind,
    label,
    detail,
    candidateText,
  }: {
    kind: Exclude<SearchSuggestionKind, "case" | "signal" | "alias">;
    label: string | null | undefined;
    detail: string;
    candidateText: string | null | undefined;
  },
) {
  const cleanLabel = String(label ?? "").trim();
  if (!cleanLabel) return;
  candidates.push({
    suggestion: {
      id: `${kind}:${normalizeSearchText(cleanLabel)}`,
      kind,
      label: cleanLabel,
      detail,
      query: cleanLabel,
      matchCount: 1,
    },
    searchText: normalizeSearchText(candidateText),
  });
}

function addEntitySuggestions(
  suggestions: SearchSuggestion[],
  byId: Map<string, SearchSuggestion>,
  caseFile: SearchSuggestionCase,
  query: string,
) {
  addFieldSuggestion({
    suggestions,
    byId,
    kind: "supplier",
    label: caseFile.supplierName,
    detail: caseFile.supplierDocument ? `Proveedor · ${caseFile.supplierDocument}` : "Proveedor",
    query,
    candidateText: [caseFile.supplierName, caseFile.supplierDocument].join(" "),
  });
  addFieldSuggestion({
    suggestions,
    byId,
    kind: "document",
    label: caseFile.supplierDocument,
    detail: "CUIT / documento de proveedor",
    query,
    candidateText: [caseFile.supplierDocument, compactIdentifier(caseFile.supplierDocument)].join(" "),
  });
  addFieldSuggestion({
    suggestions,
    byId,
    kind: "agency",
    label: caseFile.agencyName,
    detail: "Organismo",
    query,
    candidateText: [caseFile.agencyName, caseFile.agencyCode, caseFile.contractingUnit].join(" "),
  });
  addFieldSuggestion({
    suggestions,
    byId,
    kind: "source",
    label: caseFile.receipt.sourceName,
    detail: caseFile.receipt.sourceId,
    query,
    candidateText: [caseFile.receipt.sourceName, caseFile.receipt.sourceId].join(" "),
  });
  [caseFile.procedureNumber, caseFile.workNumber].forEach((identifier) => {
    addFieldSuggestion({
      suggestions,
      byId,
      kind: "identifier",
      label: identifier,
      detail: "Identificador oficial",
      query,
      candidateText: identifier,
    });
  });
  addFieldSuggestion({
    suggestions,
    byId,
    kind: "location",
    label: caseFile.workProvince,
    detail: "Provincia",
    query,
    candidateText: caseFile.workProvince,
  });
  addFieldSuggestion({
    suggestions,
    byId,
    kind: "location",
    label: caseFile.workDepartment,
    detail: "Departamento",
    query,
    candidateText: caseFile.workDepartment,
  });
  addFieldSuggestion({
    suggestions,
    byId,
    kind: "location",
    label: caseFile.workLocality,
    detail: "Localidad",
    query,
    candidateText: caseFile.workLocality,
  });
}

function addFieldSuggestion({
  suggestions,
  byId,
  kind,
  label,
  detail,
  query,
  candidateText,
}: {
  suggestions: SearchSuggestion[];
  byId: Map<string, SearchSuggestion>;
  kind: Exclude<SearchSuggestionKind, "case" | "signal" | "alias">;
  label: string | null | undefined;
  detail: string;
  query: string;
  candidateText: string | null | undefined;
}) {
  const cleanLabel = String(label ?? "").trim();
  if (!cleanLabel) return;
  if (!matchesSuggestionText(candidateText, query)) return;
  addSuggestion(suggestions, byId, {
    id: `${kind}:${normalizeSearchText(cleanLabel)}`,
    kind,
    label: cleanLabel,
    detail,
    query: cleanLabel,
    matchCount: 1,
  });
}

function addSuggestion(
  suggestions: SearchSuggestion[],
  byId: Map<string, SearchSuggestion>,
  suggestion: SearchSuggestion,
) {
  const existing = byId.get(suggestion.id);
  if (existing) {
    if (suggestion.matchCount !== undefined) {
      existing.matchCount = (existing.matchCount ?? 0) + suggestion.matchCount;
    }
    return;
  }
  byId.set(suggestion.id, suggestion);
  suggestions.push(suggestion);
}

function compareSearchSuggestions(
  left: SearchSuggestion,
  right: SearchSuggestion,
  normalizedQuery: string,
): number {
  return suggestionMatchRank(left, normalizedQuery) - suggestionMatchRank(right, normalizedQuery) ||
    suggestionPriority(left) - suggestionPriority(right) ||
    (right.matchCount ?? 0) - (left.matchCount ?? 0) ||
    left.label.localeCompare(right.label, "es");
}

function suggestionMatchRank(suggestion: SearchSuggestion, normalizedQuery: string): number {
  const label = normalizeSearchText(suggestion.label);
  if (label === normalizedQuery) return 0;
  if (label.startsWith(normalizedQuery)) return 1;
  if (label.includes(normalizedQuery)) return 2;
  return 3;
}

function suggestionPriority(suggestion: SearchSuggestion): number {
  if (suggestion.kind === "location") {
    const detail = normalizeSearchText(suggestion.detail);
    if (detail === "provincia") return 0;
    if (detail === "departamento") return 1;
    if (detail === "localidad") return 2;
    return 3;
  }
  if (suggestion.kind === "alias") return 4;
  if (suggestion.kind === "supplier") return 5;
  if (suggestion.kind === "agency") return 6;
  if (suggestion.kind === "document") return 7;
  if (suggestion.kind === "identifier") return 8;
  if (suggestion.kind === "case") return 9;
  if (suggestion.kind === "source") return 10;
  if (suggestion.kind === "signal") return 11;
  return 12;
}

function matchesSuggestionText(value: string | null | undefined, query: string): boolean {
  const haystack = normalizeSearchText(value);
  return matchesNormalizedSuggestionText(haystack, expandSearchQuery(query));
}

function matchesNormalizedSuggestionText(haystack: string, normalizedQueries: string[]): boolean {
  return normalizedQueries.some((normalizedQuery) =>
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

function buildCaseLinkSearchText(caseFile: SearchSuggestionCase): string {
  const parts = [
    caseFile.id,
    caseFile.title,
    caseFile.workNumber,
    caseFile.procedureNumber,
    caseFile.receipt.sourceId,
    caseFile.receipt.sourceName,
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
