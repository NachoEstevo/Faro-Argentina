import workPayload from "../../data/argentinaWorkCases.json" with { type: "json" };
import contractPayload from "../../data/argentinaContractCases.json" with { type: "json" };

import type { ArgentinaContractCaseFile } from "./argentinaContractCases.ts";
import type { ArgentinaWorkCase } from "./argentinaWorks.ts";
import type { ExplorerCase } from "./explorerCases.ts";
import { shouldExposeCaseOnMap } from "./uiGates.ts";

const workCases = workPayload.cases as ArgentinaWorkCase[];
const contractCases = contractPayload.cases as ArgentinaContractCaseFile[];

export const argentinaInitialMapCases: ExplorerCase[] = [
  ...workCases.filter(shouldExposeCaseOnMap),
  ...contractCases.filter(shouldExposeCaseOnMap),
];
