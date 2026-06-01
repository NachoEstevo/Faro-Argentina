import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import catalog from "../data/sources/source-catalog.json" with { type: "json" };
import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import argentinaContractDataset from "../src/data/argentinaContractCases.json" with { type: "json" };
import argentinaInvestmentMapDataset from "../src/data/argentinaInvestmentMapCases.json" with { type: "json" };
import historicalJudicialDataset from "../src/data/argentinaHistoricalJudicialCases.json" with { type: "json" };
import { verifyDataSpine } from "../src/lib/data/dataSpineVerifier.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

test("verifyDataSpine validates catalog, raw hashes, snapshots and receipts together", async () => {
  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: catalog as SourceCatalogEntry[],
    datasets: [
      argentinaDataset,
      ...argentinaContractDataset.datasets,
      argentinaInvestmentMapDataset,
      ...historicalJudicialDataset.datasets,
    ],
  });

  assert.deepEqual(report.errors, []);
  assert.equal(report.checkedDatasets, 6);
  assert.equal(report.checkedCases, 7932);
  assert.equal(report.checkedReceipts, 9617);
  assert.equal(report.checkedRawFiles, 11);
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
  const brokenDataset = structuredClone(argentinaContractDataset.datasets[0]);
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

test("verifyDataSpine reports a missing row-level receipt record id", async () => {
  const brokenDataset = structuredClone(argentinaInvestmentMapDataset);
  brokenDataset.cases[0].receipt.recordId = "missing-project-id";

  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: catalog as SourceCatalogEntry[],
    datasets: [brokenDataset],
  });

  assert.match(report.errors.join("\n"), /row missing/);
});

test("verifyDataSpine reports a row-level receipt hash mismatch", async () => {
  const brokenDataset = structuredClone(argentinaInvestmentMapDataset);
  brokenDataset.cases[0].receipt.rowHash = "sha256-bad";

  const report = await verifyDataSpine({
    rootDir: new URL("../", import.meta.url),
    sources: catalog as SourceCatalogEntry[],
    datasets: [brokenDataset],
  });

  assert.match(report.errors.join("\n"), /row hash mismatch/);
});

test("verifyDataSpine reports duplicate exact raw row matches", async () => {
  const csvText = "id,name\nrow-1,Hospital\nrow-1,Hospital\n";
  const tempDir = await mkdtemp(join(tmpdir(), "faro-row-receipt-"));
  await writeFile(join(tempDir, "fixture.csv"), csvText, "utf8");
  const fixtureHash = `sha256-${createHash("sha256").update(csvText).digest("hex")}`;
  const receipt = createEvidenceReceipt({
    sourceId: "TEST-CSV",
    sourceName: "Test CSV",
    sourceUrl: "https://example.test/fixture.csv",
    rawPath: "fixture.csv",
    snapshotHash: fixtureHash,
    recordId: "row-1",
    locatorType: "official_dataset",
    extractedAt: "2026-06-01T00:00:00.000Z",
    parserVersion: "test@1",
    row: { id: "row-1", name: "Hospital" },
  });

  const report = await verifyDataSpine({
    rootDir: pathToFileURL(`${tempDir}/`),
    sources: [
      {
        sourceId: "TEST-CSV",
        countryCode: "AR",
        name: "Test CSV",
        agency: "Test",
        category: "public_works",
        priority: "mvp",
        official: true,
        accessMode: "direct_download",
        format: "csv",
        sourceUrl: "https://example.test/fixture.csv",
        downloadUrl: "https://example.test/fixture.csv",
        updateFrequency: "unknown",
        keyFields: ["id"],
        caveats: [],
      },
    ],
    datasets: [
      {
        source: {
          sourceId: "TEST-CSV",
          filePath: "fixture.csv",
          fileHash: fixtureHash,
        },
        snapshotProfile: {
          fileHash: fixtureHash,
          columns: ["id", "name"],
        },
        cases: [
          {
            id: "TEST-CASE",
            caveats: ["Synthetic verifier fixture."],
            receipt,
          },
        ],
      },
    ],
  });

  assert.match(report.errors.join("\n"), /duplicate row/);
});
