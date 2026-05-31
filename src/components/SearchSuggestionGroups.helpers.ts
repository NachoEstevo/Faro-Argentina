import type { SearchSuggestion } from "../lib/data/searchSuggestions";

export interface SearchSuggestionGroup {
  key: string;
  label: string;
  suggestions: SearchSuggestion[];
}

export function groupSearchSuggestions(suggestions: SearchSuggestion[]): SearchSuggestionGroup[] {
  const groups = new Map<string, SearchSuggestionGroup>();
  for (const suggestion of suggestions) {
    const key = suggestionGroupKey(suggestion);
    const group = groups.get(key) ?? {
      key,
      label: suggestionGroupLabel(suggestion),
      suggestions: [],
    };
    group.suggestions.push(suggestion);
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((left, right) =>
    suggestionGroupPriority(left.key) - suggestionGroupPriority(right.key),
  );
}

export function suggestionKindLabel(suggestion: SearchSuggestion): string {
  if (suggestion.kind === "supplier") return "Proveedor";
  if (suggestion.kind === "document") return "CUIT";
  if (suggestion.kind === "agency") return "Organismo";
  if (suggestion.kind === "case" || suggestion.kind === "identifier") return "Expediente";
  if (suggestion.kind === "source") return "Fuente";
  if (suggestion.kind === "signal") return "Señal";
  if (suggestion.kind === "alias") return "Alias";
  if (suggestion.kind === "location") return "Ubicación";
  return "Coincidencia";
}

export function suggestionCardDetail(suggestion: SearchSuggestion): string {
  if (suggestion.kind === "location") return "Campo oficial del expediente";
  if (suggestion.kind === "document") return "Identificador de proveedor";
  if (suggestion.kind === "identifier") return "Número oficial";
  return suggestion.detail;
}

export function formatSuggestionCount(count: number): string {
  const label = count === 1 ? "expediente" : "expedientes";
  return `${count.toLocaleString("es-AR")} ${label}`;
}

export function formatSuggestionGroupCount(count: number): string {
  const label = count === 1 ? "coincidencia" : "coincidencias";
  return `${count.toLocaleString("es-AR")} ${label}`;
}

function suggestionGroupKey(suggestion: SearchSuggestion): string {
  if (suggestion.kind === "location") return `location:${suggestion.detail}`;
  if (suggestion.kind === "case" || suggestion.kind === "identifier") return "case";
  return suggestion.kind;
}

function suggestionGroupLabel(suggestion: SearchSuggestion): string {
  if (suggestion.kind === "location") return suggestion.detail || "Ubicación";
  if (suggestion.kind === "case" || suggestion.kind === "identifier") return "Expedientes";
  return suggestionKindLabel(suggestion);
}

function suggestionGroupPriority(key: string): number {
  if (key === "location:Provincia") return 0;
  if (key === "location:Departamento") return 1;
  if (key === "location:Localidad") return 2;
  if (key === "alias") return 3;
  if (key === "supplier") return 4;
  if (key === "agency") return 5;
  if (key === "document") return 6;
  if (key === "case") return 7;
  if (key === "source") return 8;
  if (key === "signal") return 9;
  return 10;
}
