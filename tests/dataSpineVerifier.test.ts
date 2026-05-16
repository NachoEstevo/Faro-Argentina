import test from "node:test";
import assert from "node:assert/strict";

import catalog from "../data/sources/source-catalog.json" with { type: "json" };
import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import { verifyDataSpine } from "../src/lib/data/dataSpineVerifier.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

test("verifyDataSpine validates catalog, raw hashes, snapshots and receipts together", async () => {
  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: catalog as SourceCatalogEntry[],
    datasets: [
      argentinaDataset,
      ...crossCountryDataset.datasets,
    ],
  });

  assert.deepEqual(report.errors, []);
  assert.equal(report.checkedDatasets, 5);
  assert.equal(report.checkedCases, 349);
  assert.equal(report.checkedReceipts, 349);
  assert.equal(report.checkedRawFiles, 5);
});

test("verifyDataSpine reports a receipt hash mismatch", async () => {
  const brokenDataset = structuredClone(argentinaDataset);
  brokenDataset.cases[0].receipt.snapshotHash = "sha256-bad";

  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: catalog as SourceCatalogEntry[],
    datasets: [brokenDataset],
  });

  assert.match(report.errors.join("\n"), /receipt hash mismatch/);
});
