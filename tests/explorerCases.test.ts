import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import { filterExplorerCases } from "../src/lib/data/explorerCases.ts";
import type { ArgentinaWorkCase } from "../src/lib/data/argentinaWorks.ts";
import type { CrossCountryCaseFile } from "../src/lib/data/crossCountryCases.ts";

const argentinaCases = argentinaDataset.cases as ArgentinaWorkCase[];
const crossCountryCases = crossCountryDataset.cases as CrossCountryCaseFile[];

test("filterExplorerCases includes Argentina contracts only after official geo enrichment", () => {
  const cases = filterExplorerCases({
    countryCode: "AR",
    argentinaCases,
    crossCountryCases,
    query: "",
    year: 2023,
  });

  const contractCases = cases.filter((caseFile) => caseFile.id.startsWith("AR-CONTRACT-"));

  assert.equal(cases.length, 305);
  assert.equal(contractCases.length, 82);
  assert.equal(contractCases.every((caseFile) => caseFile.coordinates !== null), true);
});

test("filterExplorerCases lets Argentina map search find suppliers", () => {
  const cases = filterExplorerCases({
    countryCode: "AR",
    argentinaCases,
    crossCountryCases,
    query: "warlet",
    year: 2023,
  });

  assert.equal(cases.some((caseFile) => caseFile.id === "AR-CONTRACT-14-1002-CON21"), true);
});
