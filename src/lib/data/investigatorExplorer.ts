import {
  buildCaseSignalContext,
  buildCaseSignalContextsByCountry,
  buildCaseSignals,
  type CaseSignalContext,
  type CaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";
import type { ExplorerCase } from "./explorerCases.ts";
import {
  describeReceiptLocator,
  type LocatorType,
} from "./evidenceReceipts.ts";
import type { CountryCode } from "./sourceCatalog.ts";

export type InvestigatorExplorerCase = ExplorerCase;
export type InvestigatorGeometryFilter = "any" | "with" | "without";
export type InvestigatorEntityType = "supplier" | "agency" | "source" | "signal";

export interface InvestigatorEntityFilter {
  type: InvestigatorEntityType;
  key: string;
}

export interface InvestigatorExplorerFilters {
  query?: string;
  countries?: CountryCode[];
  geometry?: InvestigatorGeometryFilter;
  signalCode?: string;
  entity?: InvestigatorEntityFilter;
  limit?: number;
}

export interface InvestigatorCaseRow {
  caseId: string;
  countryCode: CountryCode;
  caseType: string;
  title: string;
  year: number | null;
  workNumber: string;
  procedureNumber: string;
  agencyName: string;
  supplierLabel: string;
  amountLabel: string;
  amountValue: number | null;
  amountCurrency: string | null;
  sourceId: string;
  sourceName: string;
  recordId: string;
  locatorType: LocatorType;
  locatorLabel: string;
  locatorNote: string;
  hasOfficialGeometry: boolean;
  primarySignal: CaseSignal | null;
  signalCodes: string[];
  signalLabels: string[];
  entities: {
    supplierKey: string | null;
    agencyKey: string | null;
    sourceKey: string;
    signalKeys: string[];
  };
  exportHref: string;
  sortScore: number;
  searchText: string;
}

export interface InvestigatorFacet {
  type: InvestigatorEntityType;
  key: string;
  label: string;
  count: number;
  watchCount: number;
  sampleCaseId: string;
}

export interface InvestigatorExplorerView {
  viewType: "faro_investigator_explorer_v1";
  filters: InvestigatorExplorerFilters;
  stats: {
    totalCases: number;
    filteredCases: number;
    shownRows: number;
    facets: number;
  };
  rows: InvestigatorCaseRow[];
  facets: InvestigatorFacet[];
  activeEntity: InvestigatorFacet | null;
}

const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 500;

export function buildInvestigatorExplorer(
  cases: InvestigatorExplorerCase[],
  filters: InvestigatorExplorerFilters = {},
): InvestigatorExplorerView {
  const contextCases = cases.filter((caseFile) => matchesContextScope(caseFile, filters));
  const signalContexts = buildCaseSignalContextsByCountry(contextCases as SignalCaseFile[]);
  const fallbackContext = buildCaseSignalContext(cases as SignalCaseFile[]);
  const allRows = cases.map((caseFile) =>
    toInvestigatorRow(caseFile, signalContexts.get(caseFile.countryCode) ?? fallbackContext),
  );
  const filteredRows = allRows
    .filter((row) => matchesFilters(row, filters))
    .sort(compareRows);
  const facets = buildFacets(filteredRows);
  const rows = filteredRows.slice(0, clampLimit(filters.limit));

  return {
    viewType: "faro_investigator_explorer_v1",
    filters,
    stats: {
      totalCases: cases.length,
      filteredCases: filteredRows.length,
      shownRows: rows.length,
      facets: facets.length,
    },
    rows,
    facets,
    activeEntity: findActiveEntity(facets, filters.entity),
  };
}

function toInvestigatorRow(caseFile: InvestigatorExplorerCase, signalContext: CaseSignalContext): InvestigatorCaseRow {
  const signals = buildCaseSignals(caseFile as SignalCaseFile, signalContext);
  const primarySignal = signals[0] ?? null;
  const receipt = caseFile.receipt;
  const locator = describeReceiptLocator(receipt.locatorType);
  const supplierLabel = formatSupplier(caseFile);
  const amount = getAmount(caseFile);
  const signalLabels = signals.map((signal) => signal.label);
  const signalCodes = signals.map((signal) => signal.code);
  const sourceKey = entityKey(receipt.sourceId) ?? receipt.sourceId.toLowerCase();
  const row: Omit<InvestigatorCaseRow, "searchText"> = {
    caseId: caseFile.id,
    countryCode: caseFile.countryCode as CountryCode,
    caseType: "caseType" in caseFile ? caseFile.caseType : "public_work",
    title: caseFile.title,
    year: caseFile.year,
    workNumber: caseFile.workNumber,
    procedureNumber: caseFile.procedureNumber,
    agencyName: caseFile.agencyName || "Sin organismo",
    supplierLabel,
    amountLabel: formatAmount(amount),
    amountValue: amount?.value ?? null,
    amountCurrency: amount?.currency ?? null,
    sourceId: receipt.sourceId,
    sourceName: receipt.sourceName,
    recordId: receipt.recordId,
    locatorType: receipt.locatorType,
    locatorLabel: locator.label,
    locatorNote: locator.note,
    hasOfficialGeometry: caseFile.coordinates !== null,
    primarySignal,
    signalCodes,
    signalLabels,
    entities: {
      supplierKey: supplierLabel === "Sin proveedor" ? null : entityKey(supplierLabel),
      agencyKey: entityKey(caseFile.agencyName),
      sourceKey,
      signalKeys: signalCodes,
    },
    exportHref: `/api/export/${encodeURIComponent(caseFile.id)}`,
    sortScore: computeSortScore(signals, caseFile.coordinates !== null, amount?.value ?? null),
  };

  return {
    ...row,
    searchText: buildSearchText(row, signals),
  };
}

function matchesContextScope(caseFile: InvestigatorExplorerCase, filters: InvestigatorExplorerFilters): boolean {
  if (filters.countries?.length && !filters.countries.includes(caseFile.countryCode as CountryCode)) {
    return false;
  }
  if (!filters.entity || filters.entity.type === "signal") return true;
  if (filters.entity.type === "source") return (entityKey(caseFile.receipt.sourceId) ?? "") === filters.entity.key;
  if (filters.entity.type === "agency") return (entityKey(caseFile.agencyName) ?? "") === filters.entity.key;
  return entityKey(formatSupplier(caseFile)) === filters.entity.key;
}

function matchesFilters(row: InvestigatorCaseRow, filters: InvestigatorExplorerFilters): boolean {
  if (filters.countries?.length && !filters.countries.includes(row.countryCode)) return false;
  if (filters.geometry === "with" && !row.hasOfficialGeometry) return false;
  if (filters.geometry === "without" && row.hasOfficialGeometry) return false;
  if (filters.signalCode && !row.signalCodes.includes(filters.signalCode)) return false;
  if (filters.entity && !matchesEntity(row, filters.entity)) return false;

  const query = normalize(filters.query);
  if (!query) return true;
  return row.searchText.includes(query);
}

function matchesEntity(row: InvestigatorCaseRow, entity: InvestigatorEntityFilter): boolean {
  if (entity.type === "supplier") return row.entities.supplierKey === entity.key;
  if (entity.type === "agency") return row.entities.agencyKey === entity.key;
  if (entity.type === "source") return row.entities.sourceKey === entity.key;
  return row.entities.signalKeys.includes(entity.key);
}

function buildFacets(rows: InvestigatorCaseRow[]): InvestigatorFacet[] {
  const facets = new Map<string, MutableFacet>();

  for (const row of rows) {
    addFacet(facets, row, "source", row.entities.sourceKey, row.sourceName);
    addFacet(facets, row, "agency", row.entities.agencyKey, row.agencyName);
    addFacet(facets, row, "supplier", row.entities.supplierKey, row.supplierLabel);
    row.signalCodes.forEach((signalCode, index) => {
      addFacet(facets, row, "signal", signalCode, row.signalLabels[index] ?? signalCode);
    });
  }

  return Array.from(facets.values())
    .map((facet) => ({ ...facet }))
    .sort((left, right) =>
      right.count - left.count ||
      right.watchCount - left.watchCount ||
      left.label.localeCompare(right.label),
    )
    .slice(0, 32);
}

interface MutableFacet {
  type: InvestigatorEntityType;
  key: string;
  label: string;
  count: number;
  watchCount: number;
  sampleCaseId: string;
}

function addFacet(
  facets: Map<string, MutableFacet>,
  row: InvestigatorCaseRow,
  type: InvestigatorEntityType,
  key: string | null,
  label: string,
) {
  if (!key) return;
  const facetKey = `${type}:${key}`;
  const existing = facets.get(facetKey);
  const facet = existing ?? {
    type,
    key,
    label,
    count: 0,
    watchCount: 0,
    sampleCaseId: row.caseId,
  };

  facet.count += 1;
  if (row.primarySignal?.kind === "watch") facet.watchCount += 1;
  facets.set(facetKey, facet);
}

function findActiveEntity(
  facets: InvestigatorFacet[],
  entity: InvestigatorEntityFilter | undefined,
): InvestigatorFacet | null {
  if (!entity) return null;
  return facets.find((facet) => facet.type === entity.type && facet.key === entity.key) ?? null;
}

function buildSearchText(row: Omit<InvestigatorCaseRow, "searchText">, signals: CaseSignal[]): string {
  return normalize([
    row.caseId,
    row.countryCode,
    row.caseType,
    row.title,
    row.workNumber,
    row.procedureNumber,
    row.agencyName,
    row.supplierLabel,
    row.amountLabel,
    row.sourceId,
    row.sourceName,
    row.recordId,
    row.locatorLabel,
    row.locatorNote,
    ...signals.flatMap((signal) => [
      signal.code,
      signal.kind,
      signal.label,
      signal.summary,
      signal.evidence,
      signal.action,
    ]),
  ]);
}

function computeSortScore(
  signals: CaseSignal[],
  hasOfficialGeometry: boolean,
  amountValue: number | null,
): number {
  const primaryPriority = signals[0]?.priority ?? 0;
  const geometryBonus = hasOfficialGeometry ? 4 : 0;
  const amountBonus = amountValue !== null ? Math.min(Math.log10(Math.max(amountValue, 1)), 12) : 0;
  return primaryPriority * 100 + signals.length * 6 + geometryBonus + amountBonus;
}

function compareRows(left: InvestigatorCaseRow, right: InvestigatorCaseRow): number {
  return right.sortScore - left.sortScore || left.caseId.localeCompare(right.caseId);
}

function formatSupplier(caseFile: InvestigatorExplorerCase): string {
  if (!("supplierName" in caseFile)) return "Sin proveedor";
  return [caseFile.supplierName, caseFile.supplierDocument].filter(Boolean).join(" / ") || "Sin proveedor";
}

function getAmount(
  caseFile: InvestigatorExplorerCase,
): { value: number; currency: string; label: string } | null {
  if (!("amount" in caseFile)) return null;
  return caseFile.amount ?? null;
}

function formatAmount(amount: { value: number; currency: string; label: string } | null): string {
  if (!amount) return "Sin monto";
  return `${amount.currency} ${Math.round(amount.value).toLocaleString("es-AR")}`;
}

function entityKey(value: string | null | undefined): string | null {
  const normalized = normalize(value);
  return normalized.length > 0 ? normalized : null;
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(Number(limit)), 1), MAX_LIMIT);
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}
