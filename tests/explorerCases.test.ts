import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import argentinaContractDataset from "../src/data/argentinaContractCases.json" with { type: "json" };
import { filterExplorerCases } from "../src/lib/data/explorerCases.ts";
import type { ArgentinaWorkCase } from "../src/lib/data/argentinaWorks.ts";
import type { ArgentinaContractCaseFile } from "../src/lib/data/argentinaContractCases.ts";

const argentinaCases = argentinaDataset.cases as ArgentinaWorkCase[];
const argentinaContractCases = argentinaContractDataset.cases as ArgentinaContractCaseFile[];

test("filterExplorerCases includes Argentina contracts only after official geo enrichment", () => {
  const cases = filterExplorerCases({
    countryCode: "AR",
    argentinaCases,
    argentinaContractCases,
    query: "",
    year: 2023,
  });

  const contractCases = cases.filter((caseFile) => caseFile.id.startsWith("AR-CONTRACT-"));

  assert.equal(cases.length, 431);
  assert.equal(contractCases.length, 210);
  assert.equal(contractCases.every((caseFile) => caseFile.coordinates !== null), true);
  assert.equal(cases.some((caseFile) => caseFile.id === "AR-WORK-74-0001-OBR21"), false);
  assert.equal(cases.some((caseFile) => caseFile.id === "AR-WORK-74-0005-OBR21"), false);
  assert.equal(cases.some((caseFile) => caseFile.id === "AR-CONTRACT-74-1345-CON21"), false);
});

test("filterExplorerCases lets Argentina map search find suppliers", () => {
  const cases = filterExplorerCases({
    countryCode: "AR",
    argentinaCases,
    argentinaContractCases,
    query: "warlet",
    year: 2023,
  });

  assert.equal(cases.some((caseFile) => caseFile.id === "AR-CONTRACT-14-1002-CON21"), true);
});
