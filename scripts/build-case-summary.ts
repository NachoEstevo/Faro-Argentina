import { writeFile } from "node:fs/promises";

import workPayload from "../src/data/argentinaWorkCases.json" with { type: "json" };
import contractPayload from "../src/data/argentinaContractCases.json" with { type: "json" };
import investmentMapPayload from "../src/data/argentinaInvestmentMapCases.json" with { type: "json" };
import historicalJudicialPayload from "../src/data/argentinaHistoricalJudicialCases.json" with { type: "json" };

const cases = [
  ...workPayload.cases,
  ...contractPayload.cases,
  ...investmentMapPayload.cases,
  ...historicalJudicialPayload.cases,
];

const summary = {
  generatedAt: new Date().toISOString(),
  totalCases: cases.length,
  countries: {
    AR: {
      caseCount: cases.filter((caseFile) => caseFile.countryCode === "AR").length,
    },
  },
  sourceCounts: {
    argentinaWorkCases: workPayload.cases.length,
    argentinaContractCases: contractPayload.cases.length,
    argentinaInvestmentMapCases: investmentMapPayload.cases.length,
    argentinaHistoricalJudicialCases: historicalJudicialPayload.cases.length,
  },
};

await writeFile(
  new URL("../src/data/caseSummary.json", import.meta.url),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8",
);

console.log(`Built case summary for ${summary.totalCases} cases`);
