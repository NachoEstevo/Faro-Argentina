import type { CountryCode, SourceCatalogEntry } from "./sourceCatalog.ts";

export interface CaseDatasetLike {
  source: {
    sourceId: string;
  };
  stats: {
    rawRows: number;
    caseFiles: number;
    mapReadyCases: number;
  };
  cases: Array<{
    countryCode: CountryCode;
    coordinates: unknown | null;
    receipt?: unknown;
  }>;
}

export interface CountryCoverage {
  mvpSources: number;
  totalSources: number;
  sourcesWithSnapshots: number;
  rawRows: number;
  caseFiles: number;
  caseFilesWithReceipts: number;
  caseFilesWithCoordinates: number;
}

export interface CoverageReport {
  countries: Record<CountryCode, CountryCoverage>;
}

const countries: CountryCode[] = ["AR"];

export function buildCoverageReport({
  sources,
  caseDatasets,
}: {
  sources: SourceCatalogEntry[];
  caseDatasets: CaseDatasetLike[];
}): CoverageReport {
  const coverage = Object.fromEntries(
    countries.map((countryCode) => [countryCode, emptyCoverage()]),
  ) as Record<CountryCode, CountryCoverage>;
  const snapshotSourceIds = new Set(caseDatasets.map((dataset) => dataset.source.sourceId));

  sources.forEach((source) => {
    const country = coverage[source.countryCode];
    country.totalSources += 1;
    if (source.priority === "mvp") country.mvpSources += 1;
    if (snapshotSourceIds.has(source.sourceId)) country.sourcesWithSnapshots += 1;
  });

  caseDatasets.forEach((dataset) => {
    const countryCode = dataset.cases[0]?.countryCode;
    if (!countryCode) return;
    const country = coverage[countryCode];
    country.rawRows += dataset.stats.rawRows;
    country.caseFiles += dataset.stats.caseFiles;
    country.caseFilesWithCoordinates += dataset.cases.filter(
      (caseFile) => caseFile.coordinates !== null,
    ).length;
    country.caseFilesWithReceipts += dataset.cases.filter(
      (caseFile) => caseFile.receipt !== undefined,
    ).length;
  });

  return { countries: coverage };
}

function emptyCoverage(): CountryCoverage {
  return {
    mvpSources: 0,
    totalSources: 0,
    sourcesWithSnapshots: 0,
    rawRows: 0,
    caseFiles: 0,
    caseFilesWithReceipts: 0,
    caseFilesWithCoordinates: 0,
  };
}
