import {
  buildCaseSignals,
  buildCaseSignalContextsByCountry,
  selectLeadCaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";
import { assessCoordinateQuality } from "./coordinateQuality.ts";
import {
  buildEvidenceClaimMatrix,
  type EvidenceClaimCode,
  type EvidenceClaimStatus,
} from "./evidenceClaimMatrix.ts";
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
  claimCoverage: Record<EvidenceClaimCode, EvidenceClaimCoverage>;
  fxCoverage: {
    converted: number;
    notConverted: Record<string, number>;
  };
}

export interface DataQualitySource {
  sourceId: string;
  countryCode: string | null;
  rawRows: number;
  cases: number;
  mapReadyCases: number;
}

export interface EvidenceClaimCoverage {
  supported: number;
  partial: number;
  notSupported: number;
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
    rowReceipts?: DataSpineVerificationReport["rowReceipts"];
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
  const allCases = datasets.flatMap((dataset) => dataset.cases);
  const signalContextsByCountry = buildCaseSignalContextsByCountry(allCases);
  let totalCases = 0;
  let totalRawRows = 0;

  for (const dataset of datasets) {
    totalRawRows += dataset.stats.rawRows;
    const datasetCountryCode = getDatasetCountryCode(dataset);

    const source = bySource[dataset.source.sourceId] ?? {
      sourceId: dataset.source.sourceId,
      countryCode: datasetCountryCode,
      rawRows: 0,
      cases: 0,
      mapReadyCases: 0,
    };
    source.rawRows += dataset.stats.rawRows;
    source.cases += dataset.cases.length;
    source.mapReadyCases += dataset.stats.mapReadyCases;
    if (!source.countryCode) source.countryCode = datasetCountryCode;
    bySource[dataset.source.sourceId] = source;

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
      if (caseFile.amount && caseFile.amount.value > 0) {
        const amt = caseFile.amount as { usdEquivalent?: unknown; usdConversionNote?: string };
        if (amt.usdEquivalent !== null && amt.usdEquivalent !== undefined) {
          country.fxCoverage.converted += 1;
        } else if (typeof amt.usdConversionNote === "string") {
          country.fxCoverage.notConverted[amt.usdConversionNote] =
            (country.fxCoverage.notConverted[amt.usdConversionNote] ?? 0) + 1;
        }
      }
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

      const signals = buildCaseSignals(caseFile, signalContextsByCountry.get(caseFile.countryCode));
      if (selectLeadCaseSignal(signals)) country.withLeadEligibleSignal += 1;
      for (const signal of signals) {
        country.signals[signal.code] = (country.signals[signal.code] ?? 0) + 1;
      }
      const claimMatrix = buildEvidenceClaimMatrix(caseFile);
      for (const claim of claimMatrix.claims) {
        const coverage = country.claimCoverage[claim.code] ?? emptyClaimCoverage();
        incrementClaimCoverage(coverage, claim.status);
        country.claimCoverage[claim.code] = coverage;
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
      rowReceipts: verification.rowReceipts,
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
    claimCoverage: emptyClaimCoverageByCode(),
    fxCoverage: { converted: 0, notConverted: {} },
  };
}

function emptyClaimCoverageByCode(): Record<EvidenceClaimCode, EvidenceClaimCoverage> {
  return {
    official_record: emptyClaimCoverage(),
    declared_amount: emptyClaimCoverage(),
    official_budget: emptyClaimCoverage(),
    supplier_identity: emptyClaimCoverage(),
    competition: emptyClaimCoverage(),
    official_location: emptyClaimCoverage(),
    declared_progress: emptyClaimCoverage(),
    provider_payment: emptyClaimCoverage(),
    judicial_context: emptyClaimCoverage(),
    budget_execution: emptyClaimCoverage(),
  };
}

function emptyClaimCoverage(): EvidenceClaimCoverage {
  return { supported: 0, partial: 0, notSupported: 0 };
}

function incrementClaimCoverage(
  coverage: EvidenceClaimCoverage,
  status: EvidenceClaimStatus,
): void {
  if (status === "supported") coverage.supported += 1;
  if (status === "partial") coverage.partial += 1;
  if (status === "not_supported") coverage.notSupported += 1;
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
