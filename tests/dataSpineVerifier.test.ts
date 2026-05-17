import test from "node:test";
import assert from "node:assert/strict";

import catalog from "../data/sources/source-catalog.json" with { type: "json" };
import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import historicalJudicialDataset from "../src/data/argentinaHistoricalJudicialCases.json" with { type: "json" };
import { verifyDataSpine } from "../src/lib/data/dataSpineVerifier.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

test("verifyDataSpine validates catalog, raw hashes, snapshots and receipts together", async () => {
  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: catalog as SourceCatalogEntry[],
    datasets: [
      argentinaDataset,
      ...crossCountryDataset.datasets,
      ...historicalJudicialDataset.datasets,
    ],
  });

  assert.deepEqual(report.errors, []);
  assert.equal(report.checkedDatasets, 8);
  assert.equal(report.checkedCases, 483);
  assert.equal(report.checkedReceipts, 1208);
  assert.equal(report.checkedRawFiles, 14);
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

test("verifyDataSpine validates related receipts against their raw source files", async () => {
  const brokenDataset = structuredClone(crossCountryDataset.datasets[0]);
  const brokenCase = brokenDataset.cases[0] as typeof brokenDataset.cases[number] & {
    relatedReceipts: Array<typeof brokenDataset.cases[number]["receipt"]>;
  };
  brokenCase.relatedReceipts = [
    {
      ...brokenCase.receipt,
      sourceId: "AR-SIPRO-PROVEEDORES",
      rawPath: "data/official/ar/sipro-proveedores.csv",
      snapshotHash: "sha256-bad",
    },
  ];

  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: catalog as SourceCatalogEntry[],
    datasets: [brokenDataset],
  });

  assert.match(report.errors.join("\n"), /related receipt hash mismatch/);
});

test("verifyDataSpine reports catalog key fields missing from snapshot schemas", async () => {
  const brokenCatalog = (catalog as SourceCatalogEntry[]).map((source) =>
    source.sourceId === "AR-CONTRATAR-OBRAS"
      ? { ...source, keyFields: ["numero_obra", "missing_key"] }
      : source,
  );

  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: brokenCatalog,
    datasets: [argentinaDataset],
  });

  assert.match(report.errors.join("\n"), /catalog keyField missing_key missing from snapshot/);
});
