import test from "node:test";
import assert from "node:assert/strict";

import crossCountryCasePayload from "../src/data/crossCountryCaseFiles.json" with { type: "json" };

test("Peru case corpus includes historical OECE coverage from 2018 through 2024", () => {
  const years = new Set(
    crossCountryCasePayload.cases
      .filter((caseFile) => caseFile.countryCode === "PE")
      .map((caseFile) => caseFile.year)
      .filter((year): year is number => typeof year === "number"),
  );

  assert.deepEqual(
    [2018, 2019, 2020, 2021, 2022, 2023, 2024].filter((year) => !years.has(year)),
    [],
  );
});

test("Peru historical OECE corpus does not repeat the same contract item as separate cases", () => {
  const historicalCases = crossCountryCasePayload.cases.filter((caseFile) =>
    caseFile.countryCode === "PE" &&
    caseFile.receipt?.sourceId === "PE-OECE-CONTRATOS-HISTORICOS"
  );
  const uniqueCaseIds = new Set(historicalCases.map((caseFile) => caseFile.id));

  assert.equal(uniqueCaseIds.size, historicalCases.length);
});
