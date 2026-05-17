import type { ArgentinaWorkCase } from "./argentinaWorks.ts";
import type { CrossCountryCaseFile } from "./crossCountryCases.ts";
import type { CountryCode } from "./sourceCatalog.ts";
import { shouldExposeCaseOnMap } from "./uiGates.ts";

export type ExplorerCase = ArgentinaWorkCase | CrossCountryCaseFile;

export function filterExplorerCases({
  countryCode,
  argentinaCases,
  crossCountryCases,
  query,
  year,
}: {
  countryCode: CountryCode;
  argentinaCases: ArgentinaWorkCase[];
  crossCountryCases: CrossCountryCaseFile[];
  query: string;
  year: number;
}): ExplorerCase[] {
  const pool = countryCode === "AR"
    ? [
        ...argentinaCases,
        ...crossCountryCases.filter((caseFile) => caseFile.countryCode === "AR"),
      ].filter(shouldExposeCaseOnMap)
    : crossCountryCases.filter((caseFile) => caseFile.countryCode === countryCode);

  const normalizedQuery = query.trim().toLowerCase();
  return pool.filter((caseFile) => {
    const matchesYear = caseFile.year === null || caseFile.year <= year;
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
