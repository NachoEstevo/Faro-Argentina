import test from "node:test";
import assert from "node:assert/strict";

import sourceCatalog from "../data/sources/source-catalog.json" with { type: "json" };
import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import argentinaContractDataset from "../src/data/argentinaContractCases.json" with { type: "json" };
import argentinaInvestmentMapDataset from "../src/data/argentinaInvestmentMapCases.json" with { type: "json" };
import historicalJudicialDataset from "../src/data/argentinaHistoricalJudicialCases.json" with { type: "json" };
import { buildCoverageReport, type CaseDatasetLike } from "../src/lib/data/coverage.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

test("buildCoverageReport summarizes source readiness and case evidence coverage", () => {
  const report = buildCoverageReport({
    sources: sourceCatalog as SourceCatalogEntry[],
    caseDatasets: [
      argentinaDataset as CaseDatasetLike,
      ...(argentinaContractDataset.datasets as CaseDatasetLike[]),
      argentinaInvestmentMapDataset as CaseDatasetLike,
      ...(historicalJudicialDataset.datasets as CaseDatasetLike[]),
    ],
  });

  assert.equal(report.countries.AR.mvpSources >= 7, true);
  assert.equal(report.countries.AR.sourcesWithSnapshots, 6);
  assert.equal(report.countries.AR.rawRows, 7935);
  assert.equal(report.countries.AR.caseFiles, 7932);
  assert.equal(report.countries.AR.caseFilesWithReceipts, 7932);
  assert.equal(report.countries.AR.caseFilesWithCoordinates, 491);
  assert.deepEqual(Object.keys(report.countries), ["AR"]);
});
