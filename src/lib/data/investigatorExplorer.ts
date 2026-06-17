import {
  buildCaseSignalContext,
  buildCaseSignalContextsByCountry,
  buildCaseSignals,
  selectPrimaryCaseSignal,
  type CaseSignalContext,
  type CaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";
import type { ExplorerCase } from "./explorerCases.ts";
import {
  describeReceiptLocator,
  type LocatorType,
} from "./evidenceReceipts.ts";
import { shouldExposeCaseOnMap } from "./uiGates.ts";
import type { CountryCode } from "./sourceCatalog.ts";

export type InvestigatorExplorerCase = ExplorerCase;
export type InvestigatorGeometryFilter = "any" | "with" | "without";
export type InvestigatorEntityType = "supplier" | "agency" | "source" | "signal";
export type InvestigatorProfileType = InvestigatorEntityType | "province";

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
  entities?: InvestigatorEntityFilter[];
  yearFrom?: number;
  yearTo?: number;
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
  workProvince: string;
  workDepartment: string;
  workLocality: string;
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
  signalFacetCodes?: string[];
  publicWorkNumber?: string | null;
  entities?: {
    supplierKey: string | null;
    agencyKey: string | null;
    sourceKey: string;
    signalKeys: string[];
    signalFacetKeys: string[];
    signalFacetLabels: string[];
  };
  exportHref: string;
  sortScore: number;
  searchText?: string;
}

export interface InvestigatorFacet {
  type: InvestigatorEntityType;
  key: string;
  label: string;
  count: number;
  watchCount: number;
  sampleCaseId: string;
}

export interface InvestigatorEntityProfile {
  type: InvestigatorProfileType;
  key: string;
  label: string;
  categoryLabel: string;
  caseCount: number;
  watchCount: number;
  sourceCount: number;
  withoutMapGeometryCount: number;
  amountLabel: string;
  sampleCaseIds: string[];
  basis: string;
  caveat: string;
  nextAction: string;
  filter: InvestigatorEntityFilter | null;
}

export interface InvestigatorExplorerView {
  viewType: "faro_investigator_explorer_v1";
  filters: InvestigatorExplorerFilters;
  stats: {
    totalCases: number;
    filteredCases: number;
    filteredCasesWithPrimarySignal: number;
    filteredCasesWithoutMapGeometry: number;
    shownRows: number;
    facets: number;
  };
  rows: InvestigatorCaseRow[];
  facets: InvestigatorFacet[];
  profiles: InvestigatorEntityProfile[];
  activeEntities: InvestigatorFacet[];
  activeEntity: InvestigatorFacet | null;
}

export interface InvestigatorExplorerIndex {
  viewType: "faro_investigator_explorer_index_v1";
  filters: InvestigatorExplorerFilters;
  totalCases: number;
  rows: InvestigatorCaseRow[];
}

const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 500;

export function buildInvestigatorExplorer(
  cases: InvestigatorExplorerCase[],
  filters: InvestigatorExplorerFilters = {},
): InvestigatorExplorerView {
  return buildInvestigatorExplorerFromIndex(buildInvestigatorExplorerIndex(cases, filters), filters);
}

export function buildInvestigatorExplorerIndex(
  cases: InvestigatorExplorerCase[],
  filters: InvestigatorExplorerFilters = {},
): InvestigatorExplorerIndex {
  const contextCases = cases.filter((caseFile) => matchesContextScope(caseFile, filters));
  const signalContexts = buildCaseSignalContextsByCountry(contextCases as SignalCaseFile[]);
  const fallbackContext = buildCaseSignalContext(cases as SignalCaseFile[]);
  const allRows = cases.map((caseFile) =>
    toInvestigatorRow(caseFile, signalContexts.get(caseFile.countryCode) ?? fallbackContext),
  );

  return {
    viewType: "faro_investigator_explorer_index_v1",
    filters,
    totalCases: cases.length,
    rows: allRows,
  };
}

export function buildClientInvestigatorExplorerIndex(
  cases: InvestigatorExplorerCase[],
  filters: InvestigatorExplorerFilters = {},
): InvestigatorExplorerIndex {
  const index = buildInvestigatorExplorerIndex(cases, filters);
  const casesById = new Map(cases.map((caseFile) => [caseFile.id, caseFile]));
  return {
    ...index,
    rows: index.rows.map((row) => {
      const caseFile = casesById.get(row.caseId);
      const { entities: _entities, searchText: _searchText, ...compactRow } = row;
      return {
        ...compactRow,
        signalFacetCodes: getInvestigatorRowSignalFacetKeys(row),
        publicWorkNumber: getCaseTextField(caseFile, "publicWorkNumber") || null,
        primarySignal: row.primarySignal
          ? {
              code: row.primarySignal.code,
              kind: row.primarySignal.kind,
              severity: row.primarySignal.severity,
              priority: row.primarySignal.priority,
              label: row.primarySignal.label,
              leadEligible: row.primarySignal.leadEligible,
          } as CaseSignal
          : null,
      };
    }),
  };
}

export function buildInvestigatorExplorerFromIndex(
  index: InvestigatorExplorerIndex,
  filters: InvestigatorExplorerFilters = {},
): InvestigatorExplorerView {
  const facetRows = index.rows.filter((row) => matchesFilters(row, {
    ...filters,
    entity: undefined,
    entities: undefined,
  }));
  const filteredRows = index.rows
    .filter((row) => matchesFilters(row, filters))
    .sort(compareRows);
  const filteredSummary = summarizeRows(filteredRows);
  const facets = buildFacets(facetRows);
  const profiles = buildProfiles(filteredRows);
  const rows = filteredRows.slice(0, clampLimit(filters.limit));
  const activeEntities = findActiveEntities(
    buildFacets(facetRows, Number.POSITIVE_INFINITY),
    getEntityFilters(filters),
  );

  return {
    viewType: "faro_investigator_explorer_v1",
    filters,
    stats: {
      totalCases: index.totalCases,
      filteredCases: filteredRows.length,
      filteredCasesWithPrimarySignal: filteredSummary.withPrimarySignal,
      filteredCasesWithoutMapGeometry: filteredSummary.withoutMapGeometry,
      shownRows: rows.length,
      facets: facets.length,
    },
    rows,
    facets,
    profiles,
    activeEntities,
    activeEntity: activeEntities[0] ?? null,
  };
}

function summarizeRows(rows: InvestigatorCaseRow[]): {
  withPrimarySignal: number;
  withoutMapGeometry: number;
} {
  let withPrimarySignal = 0;
  let withoutMapGeometry = 0;
  for (const row of rows) {
    if (row.primarySignal) withPrimarySignal += 1;
    if (!row.hasOfficialGeometry) withoutMapGeometry += 1;
  }
  return { withPrimarySignal, withoutMapGeometry };
}

function toInvestigatorRow(caseFile: InvestigatorExplorerCase, signalContext: CaseSignalContext): InvestigatorCaseRow {
  const signals = buildCaseSignals(caseFile as SignalCaseFile, signalContext);
  const primarySignal = selectPrimaryCaseSignal(signals);
  const receipt = caseFile.receipt;
  const locator = describeReceiptLocator(receipt.locatorType);
  const supplierLabel = formatSupplier(caseFile);
  const amount = getAmount(caseFile);
  const signalLabels = signals.map((signal) => signal.label);
  const signalCodes = signals.map((signal) => signal.code);
  const signalFacets = signals.filter((signal) => signal.leadEligible);
  const sourceKey = entityKey(receipt.sourceId) ?? receipt.sourceId.toLowerCase();
  const row: Omit<InvestigatorCaseRow, "searchText"> = {
    caseId: caseFile.id,
    countryCode: caseFile.countryCode as CountryCode,
    caseType: "caseType" in caseFile ? caseFile.caseType : "public_work",
    title: caseFile.title,
    year: caseFile.year,
    workNumber: caseFile.workNumber,
    procedureNumber: caseFile.procedureNumber,
    workProvince: getCaseTextField(caseFile, "workProvince"),
    workDepartment: getCaseTextField(caseFile, "workDepartment"),
    workLocality: getCaseTextField(caseFile, "workLocality"),
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
    hasOfficialGeometry: shouldExposeCaseOnMap(caseFile),
    primarySignal,
    signalCodes,
    signalLabels,
    entities: {
      supplierKey: supplierLabel === "Sin proveedor" ? null : entityKey(supplierLabel),
      agencyKey: entityKey(caseFile.agencyName),
      sourceKey,
      signalKeys: signalCodes,
      signalFacetKeys: signalFacets.map((signal) => signal.code),
      signalFacetLabels: signalFacets.map((signal) => signal.label),
    },
    exportHref: `/api/export/${encodeURIComponent(caseFile.id)}`,
    sortScore: computeSortScore(signals, primarySignal, caseFile.coordinates !== null, amount?.value ?? null),
  };

  return {
    ...row,
    searchText: buildSearchText(row, signals, caseFile),
  };
}

function buildProfiles(rows: InvestigatorCaseRow[], limit = 8): InvestigatorEntityProfile[] {
  const profiles = new Map<string, MutableProfile>();
  for (const row of rows) {
    addProfile(profiles, row, "supplier", getInvestigatorRowSupplierKey(row), row.supplierLabel);
    addProfile(profiles, row, "agency", getInvestigatorRowAgencyKey(row), row.agencyName);
    addProfile(profiles, row, "province", entityKey(row.workProvince), row.workProvince);
    addProfile(profiles, row, "source", getInvestigatorRowSourceKey(row), row.sourceName);
    getInvestigatorRowSignalFacetKeys(row).forEach((signalCode) => {
      addProfile(profiles, row, "signal", signalCode, getInvestigatorRowSignalLabel(row, signalCode));
    });
  }

  return Array.from(profiles.values())
    .map(toEntityProfile)
    .sort(compareProfiles)
    .slice(0, limit);
}

interface MutableProfile {
  type: InvestigatorProfileType;
  key: string;
  label: string;
  rows: InvestigatorCaseRow[];
}

function addProfile(
  profiles: Map<string, MutableProfile>,
  row: InvestigatorCaseRow,
  type: InvestigatorProfileType,
  key: string | null,
  label: string,
) {
  if (!key || !label || label === "Sin proveedor" || label === "Sin organismo") return;
  const profileKey = `${type}:${key}`;
  const profile = profiles.get(profileKey) ?? { type, key, label, rows: [] };
  profile.rows.push(row);
  profiles.set(profileKey, profile);
}

function toEntityProfile(profile: MutableProfile): InvestigatorEntityProfile {
  const sourceKeys = new Set(profile.rows.map((row) => getInvestigatorRowSourceKey(row)));
  const withoutMapGeometryCount = profile.rows.filter((row) => !row.hasOfficialGeometry).length;
  const watchCount = profile.rows.filter((row) => row.primarySignal?.kind === "watch").length;
  const sampleCaseIds = profile.rows.slice(0, 3).map((row) => row.caseId);
  return {
    type: profile.type,
    key: profile.key,
    label: profile.label,
    categoryLabel: profileTypeLabel(profile.type),
    caseCount: profile.rows.length,
    watchCount,
    sourceCount: sourceKeys.size,
    withoutMapGeometryCount,
    amountLabel: summarizeProfileAmount(profile.rows),
    sampleCaseIds,
    basis: profileBasis(profile.type),
    caveat: profileCaveat(profile.type),
    nextAction: profileNextAction(profile.type),
    filter: profile.type === "province" ? null : { type: profile.type, key: profile.key },
  };
}

function compareProfiles(left: InvestigatorEntityProfile, right: InvestigatorEntityProfile): number {
  return (
    right.caseCount - left.caseCount ||
    right.watchCount - left.watchCount ||
    right.sourceCount - left.sourceCount ||
    profilePriority(left.type) - profilePriority(right.type) ||
    left.label.localeCompare(right.label, "es")
  );
}

function profilePriority(type: InvestigatorProfileType): number {
  if (type === "supplier") return 1;
  if (type === "agency") return 2;
  if (type === "province") return 3;
  if (type === "source") return 4;
  return 5;
}

function profileTypeLabel(type: InvestigatorProfileType): string {
  if (type === "supplier") return "Proveedor";
  if (type === "agency") return "Organismo";
  if (type === "province") return "Provincia";
  if (type === "source") return "Fuente";
  return "Señal";
}

function profileBasis(type: InvestigatorProfileType): string {
  if (type === "supplier") return "Agrupado por proveedor/documento declarado.";
  if (type === "agency") return "Agrupado por organismo comprador o ejecutor.";
  if (type === "province") return "Agrupado por ubicación oficial declarada.";
  if (type === "source") return "Agrupado por fuente y receipt.";
  return "Agrupado por señal de revisión calculada.";
}

function profileCaveat(type: InvestigatorProfileType): string {
  if (type === "supplier") return "No prueba relación entre expedientes fuera de la identidad declarada.";
  if (type === "agency") return "No compara desempeño institucional ni calidad de ejecución.";
  if (type === "province") return "La ubicación puede ser administrativa y no siempre punto exacto de obra.";
  if (type === "source") return "La fuente define qué afirmaciones permite y cuáles quedan pendientes.";
  return "La señal orienta revisión; no es una conclusión automática.";
}

function profileNextAction(type: InvestigatorProfileType): string {
  if (type === "supplier") return "Abrir ejemplos y revisar receipts, CUIT y organismo antes de relacionar.";
  if (type === "agency") return "Comparar fuentes y señales dentro del mismo organismo.";
  if (type === "province") return "Cruzar con mapa, fuente original y expedientes sin geometría.";
  if (type === "source") return "Leer caveats de fuente antes de usar el conjunto en revisión externa.";
  return "Abrir expedientes y convertir la señal en una tarea verificable.";
}

function summarizeProfileAmount(rows: InvestigatorCaseRow[]): string {
  const amounts = rows.filter((row) => row.amountValue !== null && row.amountCurrency);
  if (amounts.length === 0) return "Sin monto comparable";
  const currencies = new Set(amounts.map((row) => row.amountCurrency));
  if (currencies.size !== 1) return "Montos en monedas mixtas";
  const currency = amounts[0]?.amountCurrency ?? "";
  const total = amounts.reduce((sum, row) => sum + (row.amountValue ?? 0), 0);
  return `${currency} ${Math.round(total).toLocaleString("es-AR")}`;
}

function matchesContextScope(caseFile: InvestigatorExplorerCase, filters: InvestigatorExplorerFilters): boolean {
  if (filters.countries?.length && !filters.countries.includes(caseFile.countryCode as CountryCode)) {
    return false;
  }
  return matchesCaseEntities(caseFile, getEntityFilters(filters).filter((entity) => entity.type !== "signal"));
}

function matchesFilters(row: InvestigatorCaseRow, filters: InvestigatorExplorerFilters): boolean {
  if (filters.countries?.length && !filters.countries.includes(row.countryCode)) return false;
  if (filters.yearFrom !== undefined && row.year !== null && row.year < filters.yearFrom) return false;
  if (filters.yearTo !== undefined && row.year !== null && row.year > filters.yearTo) return false;
  if (filters.geometry === "with" && !row.hasOfficialGeometry) return false;
  if (filters.geometry === "without" && row.hasOfficialGeometry) return false;
  if (filters.signalCode && !row.signalCodes.includes(filters.signalCode)) return false;
  if (!matchesEntityFilters(row, getEntityFilters(filters))) return false;

  const query = normalize(filters.query);
  if (!query) return true;
  return getInvestigatorRowSearchText(row).includes(query);
}

function getEntityFilters(filters: InvestigatorExplorerFilters): InvestigatorEntityFilter[] {
  const entities = filters.entities ?? [];
  return filters.entity ? [filters.entity, ...entities] : entities;
}

function matchesEntityFilters(
  row: InvestigatorCaseRow,
  entities: InvestigatorEntityFilter[],
): boolean {
  if (entities.length === 0) return true;
  const byType = groupEntitiesByType(entities);
  return Array.from(byType.values()).every((group) =>
    group.some((entity) => matchesEntity(row, entity)),
  );
}

function matchesCaseEntities(
  caseFile: InvestigatorExplorerCase,
  entities: InvestigatorEntityFilter[],
): boolean {
  if (entities.length === 0) return true;
  const byType = groupEntitiesByType(entities);
  return Array.from(byType.values()).every((group) =>
    group.some((entity) => matchesCaseEntity(caseFile, entity)),
  );
}

function matchesEntity(row: InvestigatorCaseRow, entity: InvestigatorEntityFilter): boolean {
  if (entity.type === "supplier") return getInvestigatorRowSupplierKey(row) === entity.key;
  if (entity.type === "agency") return getInvestigatorRowAgencyKey(row) === entity.key;
  if (entity.type === "source") return getInvestigatorRowSourceKey(row) === entity.key;
  return getInvestigatorRowSignalKeys(row).includes(entity.key);
}

function matchesCaseEntity(
  caseFile: InvestigatorExplorerCase,
  entity: InvestigatorEntityFilter,
): boolean {
  if (entity.type === "source") return (entityKey(caseFile.receipt.sourceId) ?? "") === entity.key;
  if (entity.type === "agency") return (entityKey(caseFile.agencyName) ?? "") === entity.key;
  if (entity.type === "supplier") return entityKey(formatSupplier(caseFile)) === entity.key;
  return true;
}

function groupEntitiesByType(
  entities: InvestigatorEntityFilter[],
): Map<InvestigatorEntityType, InvestigatorEntityFilter[]> {
  const byType = new Map<InvestigatorEntityType, InvestigatorEntityFilter[]>();
  for (const entity of entities) {
    const group = byType.get(entity.type) ?? [];
    group.push(entity);
    byType.set(entity.type, group);
  }
  return byType;
}

function buildFacets(rows: InvestigatorCaseRow[], limit = 32): InvestigatorFacet[] {
  const facets = new Map<string, MutableFacet>();

  for (const row of rows) {
    addFacet(facets, row, "source", getInvestigatorRowSourceKey(row), row.sourceName);
    addFacet(facets, row, "agency", getInvestigatorRowAgencyKey(row), row.agencyName);
    addFacet(facets, row, "supplier", getInvestigatorRowSupplierKey(row), row.supplierLabel);
    getInvestigatorRowSignalFacetKeys(row).forEach((signalCode) => {
      addFacet(facets, row, "signal", signalCode, getInvestigatorRowSignalLabel(row, signalCode));
    });
  }

  return Array.from(facets.values())
    .map((facet) => ({ ...facet }))
    .sort((left, right) =>
      right.count - left.count ||
      right.watchCount - left.watchCount ||
      left.label.localeCompare(right.label),
    )
    .slice(0, limit);
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

function findActiveEntities(
  facets: InvestigatorFacet[],
  entities: InvestigatorEntityFilter[],
): InvestigatorFacet[] {
  return entities
    .map((entity) => findActiveEntity(facets, entity))
    .filter((facet): facet is InvestigatorFacet => facet !== null);
}

function buildSearchText(
  row: Omit<InvestigatorCaseRow, "searchText">,
  signals: CaseSignal[],
  caseFile: InvestigatorExplorerCase,
): string {
  return normalize([
    row.caseId,
    row.countryCode,
    row.caseType,
    row.title,
    row.workNumber,
    row.procedureNumber,
    row.agencyName,
    "agencyCode" in caseFile ? caseFile.agencyCode : null,
    "contractingUnit" in caseFile ? caseFile.contractingUnit : null,
    row.supplierLabel,
    "supplierDocument" in caseFile ? caseFile.supplierDocument : null,
    "workProvince" in caseFile ? caseFile.workProvince : null,
    "workDepartment" in caseFile ? caseFile.workDepartment : null,
    "workLocality" in caseFile ? caseFile.workLocality : null,
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

function buildCompactSearchText(
  row: InvestigatorCaseRow,
  caseFile: InvestigatorExplorerCase | undefined,
): string {
  const signalFacetLabels = getInvestigatorRowSignalFacetKeys(row).map((signalCode) =>
    getInvestigatorRowSignalLabel(row, signalCode),
  );

  return normalize([
    row.caseId,
    row.countryCode,
    row.caseType,
    row.title,
    row.workNumber,
    row.procedureNumber,
    row.agencyName,
    getCaseTextField(caseFile, "agencyCode"),
    getCaseTextField(caseFile, "contractingUnit"),
    row.supplierLabel,
    getCaseTextField(caseFile, "supplierDocument"),
    row.workProvince,
    row.workDepartment,
    row.workLocality,
    row.amountLabel,
    row.sourceId,
    row.sourceName,
    row.recordId,
    row.locatorLabel,
    ...row.signalCodes,
    ...row.signalLabels,
    ...signalFacetLabels,
  ]);
}

export function getInvestigatorRowSupplierKey(row: InvestigatorCaseRow): string | null {
  if (row.entities) return row.entities.supplierKey;
  if (!row.supplierLabel || row.supplierLabel === "Sin proveedor") return null;
  return entityKey(row.supplierLabel);
}

export function getInvestigatorRowAgencyKey(row: InvestigatorCaseRow): string | null {
  return row.entities?.agencyKey ?? entityKey(row.agencyName);
}

export function getInvestigatorRowSourceKey(row: InvestigatorCaseRow): string {
  return row.entities?.sourceKey ?? entityKey(row.sourceId) ?? row.sourceId.toLowerCase();
}

export function getInvestigatorRowSignalKeys(row: InvestigatorCaseRow): string[] {
  return row.entities?.signalKeys ?? row.signalCodes;
}

export function getInvestigatorRowSignalFacetKeys(row: InvestigatorCaseRow): string[] {
  return row.entities?.signalFacetKeys ?? row.signalFacetCodes ?? [];
}

export function getInvestigatorRowSignalLabel(row: InvestigatorCaseRow, signalCode: string): string {
  const facetIndex = row.entities?.signalFacetKeys.indexOf(signalCode) ?? -1;
  if (facetIndex >= 0) return row.entities?.signalFacetLabels[facetIndex] ?? signalCode;
  const signalIndex = row.signalCodes.indexOf(signalCode);
  return signalIndex >= 0 ? row.signalLabels[signalIndex] ?? signalCode : signalCode;
}

const compactSearchTextCache = new WeakMap<InvestigatorCaseRow, string>();

export function getInvestigatorRowSearchText(row: InvestigatorCaseRow): string {
  if (row.searchText) return row.searchText;
  const cached = compactSearchTextCache.get(row);
  if (cached) return cached;
  const searchText = buildCompactSearchText(row, undefined);
  compactSearchTextCache.set(row, searchText);
  return searchText;
}

function computeSortScore(
  signals: CaseSignal[],
  primarySignal: CaseSignal | null,
  hasOfficialGeometry: boolean,
  amountValue: number | null,
): number {
  const primaryPriority = primarySignal?.priority ?? 0;
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

function getCaseTextField(caseFile: InvestigatorExplorerCase | undefined, field: string): string {
  const value = (caseFile as unknown as Record<string, unknown> | undefined)?.[field];
  return typeof value === "string" ? value : "";
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
