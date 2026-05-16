import test from "node:test";
import assert from "node:assert/strict";

import {
  createEvidenceReceipt,
  shouldExposeReceiptInUi,
} from "../src/lib/data/evidenceReceipts.ts";

test("createEvidenceReceipt builds deterministic dataset-level receipts with row hash", () => {
  const receipt = createEvidenceReceipt({
    sourceId: "AR-CONTRATAR-OBRAS",
    sourceName: "CONTRAT.AR obras",
    sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv",
    rawPath: "data/official/ar/onc-contratar-obras.csv",
    snapshotHash: "sha256-snapshot",
    recordId: "81-0009-OBR18",
    locatorType: "official_dataset",
    extractedAt: "2026-05-16T00:00:00.000Z",
    parserVersion: "argentina-works@1",
    row: { numero_obra: "81-0009-OBR18", nombre_obra: "Palacio" },
  });

  assert.equal(receipt.receiptId, "AR-CONTRATAR-OBRAS-81-0009-OBR18");
  assert.equal(receipt.locatorType, "official_dataset");
  assert.equal(receipt.rawPath, "data/official/ar/onc-contratar-obras.csv");
  assert.equal(receipt.parserVersion, "argentina-works@1");
  assert.match(receipt.rowHash, /^sha256-/);
  assert.equal(shouldExposeReceiptInUi(receipt), true);
});

test("shouldExposeReceiptInUi hides missing locators", () => {
  const receipt = createEvidenceReceipt({
    sourceId: "AR-CONTRATAR-OBRAS",
    sourceName: "CONTRAT.AR obras",
    sourceUrl: "https://example.gov/data.csv",
    rawPath: "data/raw.csv",
    snapshotHash: "sha256-snapshot",
    recordId: "missing-row",
    locatorType: "missing",
    extractedAt: "2026-05-16T00:00:00.000Z",
    parserVersion: "test@1",
    row: { id: "missing-row" },
  });

  assert.equal(shouldExposeReceiptInUi(receipt), false);
});
