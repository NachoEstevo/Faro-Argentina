import type { ArgentinaWorkCase } from "./argentinaWorks.ts";
import type { ArgentinaHistoricalJudicialCase } from "./argentinaHistoricalJudicial.ts";
import type { ArticleCitation } from "./articleCitations.ts";
import type { ArgentinaContractCaseFile } from "./argentinaContractCases.ts";
import type { ArgentinaInvestmentMapCaseFile } from "./argentinaInvestmentMap.ts";
import type { CountryCode } from "./sourceCatalog.ts";
import { shouldExposeCaseOnMap } from "./uiGates.ts";

export type ExplorerCase =
  (
    ArgentinaWorkCase |
    ArgentinaContractCaseFile |
    ArgentinaInvestmentMapCaseFile |
    ArgentinaHistoricalJudicialCase
  ) & {
    contextualCitations?: ArticleCitation[];
  };

export function filterExplorerCases({
  countryCode,
  argentinaCases,
  argentinaContractCases,
  query,
  year,
}: {
  countryCode: CountryCode;
  argentinaCases: ArgentinaWorkCase[];
  argentinaContractCases: ArgentinaContractCaseFile[];
  query: string;
  year: number | null;
}): ExplorerCase[] {
  const pool = [
    ...argentinaCases,
    ...argentinaContractCases.filter((caseFile) => caseFile.countryCode === countryCode),
  ].filter(shouldExposeCaseOnMap);

  const normalizedQuery = query.trim().toLowerCase();
  return pool.filter((caseFile) => {
    const matchesYear =
      year === null || caseFile.year === null || caseFile.year <= year;
    if (!matchesYear) return false;
    if (normalizedQuery.length === 0) return true;
    return searchableText(caseFile).includes(normalizedQuery);
  });
}

function searchableText(caseFile: ExplorerCase): string {
  return [
    caseFile.title,
    caseFile.workNumber,
    caseFile.procedureNumber,
    caseFile.agencyName,
    "supplierName" in caseFile ? caseFile.supplierName : undefined,
    "supplierDocument" in caseFile ? caseFile.supplierDocument : undefined,
  ]
    .join(" ")
    .toLowerCase();
}
