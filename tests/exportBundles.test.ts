import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import {
  buildCaseCollectionPack,
  filterCaseFiles,
  type ExportableCaseFile,
} from "../src/lib/data/caseCollections.ts";

const cases = [
  ...argentinaDataset.cases,
  ...crossCountryDataset.cases,
] as ExportableCaseFile[];

test("filterCaseFiles filters by country, source and case type", () => {
  const peContracts = filterCaseFiles(cases, {
    countryCode: "PE",
    sourceId: "PE-OECE-CONTRATOS",
    caseType: "procurement_contract",
  });

  assert.equal(peContracts.length, 25);
  assert.equal(peContracts.every((caseFile) => caseFile.countryCode === "PE"), true);
  assert.equal(
    peContracts.every((caseFile) => caseFile.receipt.sourceId === "PE-OECE-CONTRATOS"),
    true,
  );
});

test("buildCaseCollectionPack creates a country export with receipts and source summaries", () => {
  const pack = buildCaseCollectionPack(cases, { countryCode: "PE" });

  assert.equal(pack.packType, "faro_case_collection");
  assert.equal(pack.filters.countryCode, "PE");
  assert.equal(pack.stats.caseFiles, 50);
  assert.equal(pack.stats.receipts, 50);
  assert.deepEqual(pack.sourceIds.sort(), ["PE-MEF-GASTO-DIARIO", "PE-OECE-CONTRATOS"]);
  assert.equal(pack.cases.every((caseFile) => caseFile.countryCode === "PE"), true);
  assert.equal(pack.receipts[0]?.sourceId.startsWith("PE-"), true);
  assert.match(pack.verificationSteps.join("\n"), /No publicar conclusiones/);
});

test("buildCaseCollectionPack exports Argentina contract cases by source and type", () => {
  const pack = buildCaseCollectionPack(cases, {
    countryCode: "AR",
    sourceId: "AR-CONTRATAR-CONTRATOS",
    caseType: "procurement_contract",
  });

  assert.equal(pack.stats.caseFiles, 50);
  assert.equal(pack.stats.receipts > pack.stats.caseFiles, true);
  assert.deepEqual(pack.sourceIds, [
    "AR-CONTRATAR-CONTRATOS",
    "AR-CONTRATAR-OBRAS",
    "AR-SIPRO-PROVEEDORES",
  ]);
  assert.equal(pack.cases.every((caseFile) => caseFile.supplierDocument), true);
  assert.equal(
    pack.receipts.some((receipt) => receipt.sourceId === "AR-CONTRATAR-OBRAS"),
    true,
  );
  assert.equal(
    pack.receipts.some((receipt) => receipt.sourceId === "AR-SIPRO-PROVEEDORES"),
    true,
  );
});
