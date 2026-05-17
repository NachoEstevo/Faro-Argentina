import { buildCaseSignals, selectLeadCaseSignal, type SignalCaseFile } from "./caseSignals.ts";
import { assessCoordinateQuality } from "./coordinateQuality.ts";
import type { DataSpineVerificationReport } from "./dataSpineVerifier.ts";

export interface DataQualityDataset {
  source: {
    sourceId: string;
    countryCode?: string;
  };
  stats: {
    rawRows: number;
    caseFiles: number;
    mapReadyCases: number;
  };
  cases: SignalCaseFile[];
}

export interface DataQualityCountry {
  cases: number;
  rawRows: number;
  withReceipt: number;
  withAmount: number;
  withSupplierName: number;
  withSupplierDocument: number;
  withAnySupplierIdentity: number;
  withOfficialGeometry: number;
  withMapEligibleGeometry: number;
  withLeadEligibleSignal: number;
  signals: Record<string, number>;
}

export interface DataQualitySource {
  sourceId: string;
  countryCode: string | null;
  rawRows: number;
  cases: number;
  mapReadyCases: number;
}

export interface DataQualityReport {
  generatedAt: string;
  totals: {
    datasets: number;
    cases: number;
    rawRows: number;
  };
  verification: {
    checkedDatasets: number;
    checkedCases: number;
    checkedReceipts: number;
    checkedRawFiles: number;
    errors: number;
  };
  byCountry: Record<string, DataQualityCountry>;
  bySource: Record<string, DataQualitySource>;
  blockers: string[];
}

export function buildDataQualityReport({
  generatedAt,
  verification,
  datasets,
}: {
  generatedAt: string;
  verification: DataSpineVerificationReport;
  datasets: DataQualityDataset[];
}): DataQualityReport {
  const byCountry: Record<string, DataQualityCountry> = {};
  const bySource: Record<string, DataQualitySource> = {};
  let totalCases = 0;
  let totalRawRows = 0;

  for (const dataset of datasets) {
    totalRawRows += dataset.stats.rawRows;
    const datasetCountryCode = getDatasetCountryCode(dataset);

    bySource[dataset.source.sourceId] = {
      sourceId: dataset.source.sourceId,
      countryCode: datasetCountryCode,
      rawRows: dataset.stats.rawRows,
      cases: dataset.cases.length,
      mapReadyCases: dataset.stats.mapReadyCases,
    };

    if (datasetCountryCode) {
      const country = byCountry[datasetCountryCode] ?? emptyCountry();
      country.rawRows += dataset.stats.rawRows;
      byCountry[datasetCountryCode] = country;
    }

    for (const caseFile of dataset.cases) {
      totalCases += 1;
      const country = byCountry[caseFile.countryCode] ?? emptyCountry();
      country.cases += 1;

      if (caseFile.receipt) country.withReceipt += 1;
      if (caseFile.amount && caseFile.amount.value > 0) country.withAmount += 1;
      if (clean(caseFile.supplierName)) country.withSupplierName += 1;
      if (clean(caseFile.supplierDocument)) country.withSupplierDocument += 1;
      if (clean(caseFile.supplierName) || clean(caseFile.supplierDocument)) {
        country.withAnySupplierIdentity += 1;
      }
      if (caseFile.coordinates) country.withOfficialGeometry += 1;
      if (assessCoordinateQuality({
        caseId: caseFile.id,
        countryCode: caseFile.countryCode,
        coordinates: caseFile.coordinates ?? null,
      }).exposeOnMap) {
        country.withMapEligibleGeometry += 1;
      }

      const signals = buildCaseSignals(caseFile);
      if (selectLeadCaseSignal(signals)) country.withLeadEligibleSignal += 1;
      for (const signal of signals) {
        country.signals[signal.code] = (country.signals[signal.code] ?? 0) + 1;
      }

      byCountry[caseFile.countryCode] = country;
    }
  }

  return {
    generatedAt,
    totals: {
      datasets: datasets.length,
      cases: totalCases,
      rawRows: totalRawRows,
    },
    verification: {
      checkedDatasets: verification.checkedDatasets,
      checkedCases: verification.checkedCases,
      checkedReceipts: verification.checkedReceipts,
      checkedRawFiles: verification.checkedRawFiles,
      errors: verification.errors.length,
    },
    byCountry,
    bySource,
    blockers: buildBlockers(verification),
  };
}

function emptyCountry(): DataQualityCountry {
  return {
    cases: 0,
    rawRows: 0,
    withReceipt: 0,
    withAmount: 0,
    withSupplierName: 0,
    withSupplierDocument: 0,
    withAnySupplierIdentity: 0,
    withOfficialGeometry: 0,
    withMapEligibleGeometry: 0,
    withLeadEligibleSignal: 0,
    signals: {},
  };
}

function buildBlockers(verification: DataSpineVerificationReport): string[] {
  if (verification.errors.length === 0) return [];
  return [
    `Data spine has ${verification.errors.length} verification error(s). Fix receipts and raw hashes before expanding data.`,
  ];
}

function getDatasetCountryCode(dataset: DataQualityDataset): string | null {
  return dataset.source.countryCode ?? dataset.cases[0]?.countryCode ?? null;
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
