import test from "node:test";
import assert from "node:assert/strict";

import sourceCatalog from "../data/sources/source-catalog.json" with { type: "json" };
import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import { buildCoverageReport, type CaseDatasetLike } from "../src/lib/data/coverage.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

test("buildCoverageReport summarizes source readiness and case evidence coverage", () => {
  const report = buildCoverageReport({
    sources: sourceCatalog as SourceCatalogEntry[],
    caseDatasets: [argentinaDataset as CaseDatasetLike],
  });

  assert.equal(report.countries.AR.mvpSources >= 6, true);
  assert.equal(report.countries.AR.sourcesWithSnapshots, 1);
  assert.equal(report.countries.AR.rawRows, 246);
  assert.equal(report.countries.AR.caseFiles, 246);
  assert.equal(report.countries.AR.caseFilesWithReceipts, 246);
  assert.equal(report.countries.AR.caseFilesWithCoordinates, 246);
  assert.equal(report.countries.PE.mvpSources >= 1, true);
  assert.equal(report.countries.PE.caseFiles, 0);
  assert.equal(report.countries.CL.mvpSources >= 1, true);
  assert.equal(report.countries.CL.caseFiles, 0);
});
