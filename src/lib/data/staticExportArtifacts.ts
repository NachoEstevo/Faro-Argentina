import type { CaseCollectionFilters } from "./caseCollections.ts";
import type { CountryCode } from "./sourceCatalog.ts";

export interface StaticExportArtifact {
  filters: CaseCollectionFilters;
  href: string;
  fileName: string;
}

export function buildStaticExportFileName(filters: CaseCollectionFilters): string {
  return [
    "faro",
    filters.countryCode ?? "all",
    filters.sourceId ?? "all-sources",
    filters.caseType ?? "all-types",
  ].join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-") + ".evidence.json";
}

export function buildStaticExportHref(filters: CaseCollectionFilters): string {
  return `/exports/${buildStaticExportFileName(filters)}`;
}

export function buildCoreStaticExportFilters(
  cases: Array<{ countryCode: CountryCode; receipt: { sourceId: string }; caseType?: string }>,
): CaseCollectionFilters[] {
  const filters: CaseCollectionFilters[] = [{}];
  const countries = unique(cases.map((caseFile) => caseFile.countryCode));

  for (const countryCode of countries) {
    filters.push({ countryCode });

    const countryCases = cases.filter((caseFile) => caseFile.countryCode === countryCode);
    for (const sourceId of unique(countryCases.map((caseFile) => caseFile.receipt.sourceId))) {
      filters.push({ countryCode, sourceId });
    }
  }

  return filters;
}

export function findStaticExportArtifact(
  filters: CaseCollectionFilters,
  artifacts: StaticExportArtifact[],
): StaticExportArtifact | null {
  return artifacts.find((artifact) => filtersMatch(artifact.filters, filters)) ?? null;
}

function filtersMatch(left: CaseCollectionFilters, right: CaseCollectionFilters): boolean {
  return clean(left.countryCode) === clean(right.countryCode) &&
    clean(left.sourceId) === clean(right.sourceId) &&
    clean(left.caseType) === clean(right.caseType) &&
    clean(left.query) === clean(right.query);
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function unique<TValue extends string>(values: TValue[]): TValue[] {
  return Array.from(new Set(values)).sort();
}
