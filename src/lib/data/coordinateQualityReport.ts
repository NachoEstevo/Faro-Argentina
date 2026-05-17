import {
  assessCoordinateQuality,
  type CoordinateStatus,
  type GeoPoint,
} from "./coordinateQuality.ts";

export type CoordinateQualityReportCase = {
  id: string;
  countryCode: string;
  title: string;
  coordinates: GeoPoint | null;
  geoEvidence?: Array<{
    exposeOnMap: boolean;
  }>;
};

export type CoordinateQualityCountryReport = {
  totalCases: number;
  mapEligibleCases: number;
  geoEvidenceCases: number;
  byStatus: Partial<Record<CoordinateStatus, number>>;
};

export type CoordinateQualityReport = {
  generatedAt: string;
  totalCases: number;
  mapEligibleCases: number;
  byCountry: Record<string, CoordinateQualityCountryReport>;
  duplicateCaseIds: Array<{
    caseId: string;
    countryCode: string;
    title: string;
    count: number;
    statuses: CoordinateStatus[];
  }>;
};

export function buildCoordinateQualityReport(
  cases: CoordinateQualityReportCase[],
): CoordinateQualityReport {
  const byCountry: Record<string, CoordinateQualityCountryReport> = {};
  const casesById = new Map<
    string,
    {
      countryCode: string;
      title: string;
      count: number;
      statuses: CoordinateStatus[];
    }
  >();
  let mapEligibleCases = 0;

  for (const caseFile of cases) {
    const quality = assessCoordinateQuality({
      caseId: caseFile.id,
      countryCode: caseFile.countryCode,
      coordinates: caseFile.coordinates,
    });

    if (!byCountry[caseFile.countryCode]) {
      byCountry[caseFile.countryCode] = {
        totalCases: 0,
        mapEligibleCases: 0,
        geoEvidenceCases: 0,
        byStatus: {},
      };
    }

    const countryReport = byCountry[caseFile.countryCode];
    countryReport.totalCases += 1;
    if ((caseFile.geoEvidence ?? []).length > 0) {
      countryReport.geoEvidenceCases += 1;
    }
    countryReport.byStatus[quality.status] =
      (countryReport.byStatus[quality.status] ?? 0) + 1;

    if (quality.exposeOnMap) {
      mapEligibleCases += 1;
      countryReport.mapEligibleCases += 1;
    }

    const duplicateEntry = casesById.get(caseFile.id) ?? {
      countryCode: caseFile.countryCode,
      title: caseFile.title,
      count: 0,
      statuses: [],
    };
    duplicateEntry.count += 1;
    if (!duplicateEntry.statuses.includes(quality.status)) {
      duplicateEntry.statuses.push(quality.status);
    }
    casesById.set(caseFile.id, duplicateEntry);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    mapEligibleCases,
    byCountry,
    duplicateCaseIds: [...casesById.entries()]
      .filter(([, entry]) => entry.count > 1)
      .map(([caseId, entry]) => ({
        caseId,
        countryCode: entry.countryCode,
        title: entry.title,
        count: entry.count,
        statuses: entry.statuses,
      })),
  };
}
