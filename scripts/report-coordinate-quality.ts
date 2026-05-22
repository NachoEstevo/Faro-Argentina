import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import argentinaContractDataset from "../src/data/argentinaContractCases.json" with { type: "json" };
import argentinaInvestmentMapDataset from "../src/data/argentinaInvestmentMapCases.json" with { type: "json" };
import historicalJudicialDataset from "../src/data/argentinaHistoricalJudicialCases.json" with { type: "json" };
import { buildCoordinateQualityReport } from "../src/lib/data/coordinateQualityReport.ts";
import type { CoordinateQualityReportCase } from "../src/lib/data/coordinateQualityReport.ts";

const argentinaCases = argentinaDataset.cases.map(toReportCase);
const argentinaContractCases = argentinaContractDataset.datasets.flatMap((dataset) =>
  dataset.cases.map(toReportCase),
);
const historicalJudicialCases = historicalJudicialDataset.datasets.flatMap((dataset) =>
  dataset.cases.map(toReportCase),
);

const report = buildCoordinateQualityReport([
  ...argentinaCases,
  ...argentinaContractCases,
  ...argentinaInvestmentMapDataset.cases.map(toReportCase),
  ...historicalJudicialCases,
]);

console.log(JSON.stringify(report, null, 2));

function toReportCase(caseFile: {
  id: string;
  countryCode: string;
  title: string;
  coordinates: CoordinateQualityReportCase["coordinates"];
  geoEvidence?: CoordinateQualityReportCase["geoEvidence"];
}): CoordinateQualityReportCase {
  return {
    id: caseFile.id,
    countryCode: caseFile.countryCode,
    title: caseFile.title,
    coordinates: caseFile.coordinates,
    geoEvidence: caseFile.geoEvidence,
  };
}
