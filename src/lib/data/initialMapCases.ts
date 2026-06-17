import workPayload from "../../data/argentinaWorkCases.json" with { type: "json" };
import contractPayload from "../../data/argentinaContractCases.json" with { type: "json" };

import type { ArgentinaContractCaseFile } from "./argentinaContractCases.ts";
import type { ArgentinaWorkCase } from "./argentinaWorks.ts";
import type { ExplorerCase } from "./explorerCases.ts";
import { shouldExposeCaseOnMap } from "./uiGates.ts";

const workCases = workPayload.cases as ArgentinaWorkCase[];
const contractCases = contractPayload.cases as ArgentinaContractCaseFile[];

const argentinaFullMapCases: ExplorerCase[] = [
  ...workCases.filter(shouldExposeCaseOnMap),
  ...contractCases.filter(shouldExposeCaseOnMap),
];

export const argentinaInitialMapCases: ExplorerCase[] =
  argentinaFullMapCases.map(toInitialMapCase);

export function getInitialMapCaseById(caseId: string): ExplorerCase | null {
  return argentinaFullMapCases.find((caseFile) => caseFile.id === caseId) ?? null;
}

function toInitialMapCase(caseFile: ExplorerCase): ExplorerCase {
  const projected: Record<string, unknown> = {
    id: caseFile.id,
    countryCode: caseFile.countryCode,
    caseType: "caseType" in caseFile ? caseFile.caseType : undefined,
    workNumber: caseFile.workNumber,
    year: caseFile.year,
    title: caseFile.title,
    procedureNumber: caseFile.procedureNumber,
    agencyName: caseFile.agencyName,
    agencyCode: caseFile.agencyCode,
    contractingUnit: caseFile.contractingUnit,
    executionTerm: caseFile.executionTerm,
    executionTermType: caseFile.executionTermType,
    coordinates: caseFile.coordinates,
    evidenceLevel: caseFile.evidenceLevel,
    receipt: {
      receiptId: caseFile.receipt.receiptId,
      sourceId: caseFile.receipt.sourceId,
      sourceName: caseFile.receipt.sourceName,
      sourceUrl: caseFile.receipt.sourceUrl,
      recordId: caseFile.receipt.recordId,
      locatorType: caseFile.receipt.locatorType,
    },
  };

  copyIfPresent(projected, caseFile, "locationName");
  copyIfPresent(projected, caseFile, "workProvince");
  copyIfPresent(projected, caseFile, "workDepartment");
  copyIfPresent(projected, caseFile, "workLocality");
  copyIfPresent(projected, caseFile, "bidderCount");
  copyIfPresent(projected, caseFile, "offerCount");
  copyIfPresent(projected, caseFile, "claimCount");
  copyIfPresent(projected, caseFile, "amount");
  copyIfPresent(projected, caseFile, "officialBudget");
  copyIfPresent(projected, caseFile, "supplierName");
  copyIfPresent(projected, caseFile, "supplierDocument");
  copyIfPresent(projected, caseFile, "awardActUrl");
  copyIfPresent(projected, caseFile, "projectStage");
  copyIfPresent(projected, caseFile, "physicalProgress");
  copyIfPresent(projected, caseFile, "financialProgress");
  copyIfPresent(projected, caseFile, "geoEvidence");
  copyIfPresent(projected, caseFile, "judicialStatus");
  copyIfPresent(projected, caseFile, "contextSummary");
  copyIfPresent(projected, caseFile, "localMatchStatus");
  copyIfPresent(projected, caseFile, "relatedCaseIds");

  return projected as unknown as ExplorerCase;
}

function copyIfPresent<T extends object>(
  target: Record<string, unknown>,
  source: T,
  key: string,
) {
  if (key in source) {
    target[key] = (source as Record<string, unknown>)[key];
  }
}
