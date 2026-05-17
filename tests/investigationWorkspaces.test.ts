import test from "node:test";
import assert from "node:assert/strict";

import type { EvidencePack } from "../src/lib/caseRepository.ts";
import {
  addCaseToWorkspace,
  buildInvestigationAggregate,
  createInvestigationWorkspace,
  removeCaseFromWorkspace,
} from "../src/lib/data/investigationWorkspaces.ts";

test("createInvestigationWorkspace builds a neutral local workspace", () => {
  const workspace = createInvestigationWorkspace(
    {
      title: "Causa Vialidad",
      countryCode: "AR",
      description: "Revisar obras y fuentes oficiales asociadas.",
      investigationQuestion: "Que esta sostenido por receipts oficiales?",
      tags: [" vialidad ", "Santa Cruz", ""],
    },
    new Date("2026-05-17T12:00:00.000Z"),
  );

  assert.equal(workspace.version, "faro_investigation_workspace_v1");
  assert.match(workspace.id, /^INV-20260517-/);
  assert.equal(workspace.title, "Causa Vialidad");
  assert.equal(workspace.countryCode, "AR");
  assert.deepEqual(workspace.tags, ["vialidad", "Santa Cruz"]);
  assert.deepEqual(workspace.caseIds, []);
  assert.deepEqual(workspace.sourceLinks, []);
  assert.deepEqual(workspace.notes, []);
  assert.deepEqual(workspace.entities, []);
  assert.equal(workspace.createdAt, "2026-05-17T12:00:00.000Z");
  assert.equal(workspace.updatedAt, "2026-05-17T12:00:00.000Z");
});

test("addCaseToWorkspace dedupes case ids and removeCaseToWorkspace updates timestamps", () => {
  const workspace = createInvestigationWorkspace(
    { title: "Carpeta", countryCode: "AR", description: "", tags: [] },
    new Date("2026-05-17T12:00:00.000Z"),
  );

  const withCase = addCaseToWorkspace(workspace, "AR-CASE-1", new Date("2026-05-17T12:05:00.000Z"));
  const deduped = addCaseToWorkspace(withCase, "AR-CASE-1", new Date("2026-05-17T12:10:00.000Z"));
  const removed = removeCaseFromWorkspace(deduped, "AR-CASE-1", new Date("2026-05-17T12:15:00.000Z"));

  assert.deepEqual(withCase.caseIds, ["AR-CASE-1"]);
  assert.equal(deduped.caseIds.length, 1);
  assert.equal(deduped.updatedAt, "2026-05-17T12:10:00.000Z");
  assert.deepEqual(removed.caseIds, []);
  assert.equal(removed.updatedAt, "2026-05-17T12:15:00.000Z");
});

test("buildInvestigationAggregate summarizes repeated entities, amounts, signals and gaps", () => {
  const workspace = {
    ...createInvestigationWorkspace(
      { title: "Vialidad", countryCode: "AR", description: "", tags: [] },
      new Date("2026-05-17T12:00:00.000Z"),
    ),
    caseIds: ["AR-CASE-1", "AR-CASE-2", "AR-CASE-3"],
    entities: [
      { id: "ENT-1", label: "Austral Construcciones", kind: "supplier" as const, note: "" },
      { id: "ENT-2", label: "Dirección Nacional de Vialidad", kind: "agency" as const, note: "" },
    ],
  };
  const aggregate = buildInvestigationAggregate(workspace, [
    pack({
      id: "AR-CASE-1",
      supplierName: "Austral Construcciones S.A.",
      supplierDocument: "30-71111111-1",
      agencyName: "Dirección Nacional de Vialidad",
      amount: { currency: "ARS", value: 100 },
      year: 2007,
      sourceId: "AR-MPF-VIALIDAD-ALEGATO",
      signalCode: "official_judicial_context",
      hasGeometry: false,
    }),
    pack({
      id: "AR-CASE-2",
      supplierName: "Austral Construcciones S.A.",
      supplierDocument: "30-71111111-1",
      agencyName: "Dirección Nacional de Vialidad",
      amount: { currency: "ARS", value: 250 },
      year: 2008,
      sourceId: "AR-CONTRATAR-OBRAS",
      signalCode: "single_bidder",
      hasGeometry: true,
    }),
    pack({
      id: "AR-CASE-3",
      supplierName: "Otro Proveedor",
      supplierDocument: "30-72222222-2",
      agencyName: "Dirección Nacional de Vialidad",
      amount: { currency: "USD", value: 10 },
      year: 2008,
      sourceId: "AR-CONTRATAR-OBRAS",
      signalCode: "single_bidder",
      hasGeometry: false,
    }),
  ]);

  assert.equal(aggregate.caseCount, 3);
  assert.deepEqual(aggregate.sourceIds.sort(), ["AR-CONTRATAR-OBRAS", "AR-MPF-VIALIDAD-ALEGATO"]);
  assert.deepEqual(aggregate.repeatedSuppliers[0], {
    label: "Austral Construcciones S.A.",
    document: "30-71111111-1",
    count: 2,
    caseIds: ["AR-CASE-1", "AR-CASE-2"],
  });
  assert.deepEqual(aggregate.repeatedAgencies[0], {
    label: "Dirección Nacional de Vialidad",
    count: 3,
    caseIds: ["AR-CASE-1", "AR-CASE-2", "AR-CASE-3"],
  });
  assert.deepEqual(aggregate.amountsByCurrency, [
    { currency: "ARS", total: 350, count: 2 },
    { currency: "USD", total: 10, count: 1 },
  ]);
  assert.equal(aggregate.signals.find((signal) => signal.code === "single_bidder")?.count, 2);
  assert.equal(aggregate.geometryGaps.count, 2);
  assert.deepEqual(aggregate.timeline.find((bucket) => bucket.year === 2008)?.caseIds, ["AR-CASE-2", "AR-CASE-3"]);
  assert.deepEqual(aggregate.entityMatches.map((match) => match.entityLabel), [
    "Austral Construcciones",
    "Dirección Nacional de Vialidad",
  ]);
});

function pack(input: {
  id: string;
  supplierName: string;
  supplierDocument: string;
  agencyName: string;
  amount: { currency: string; value: number };
  year: number;
  sourceId: string;
  signalCode: string;
  hasGeometry: boolean;
}): EvidencePack {
  return {
    packType: "faro_evidence_pack",
    generatedAt: "2026-05-17T12:00:00.000Z",
    caseFile: {
      id: input.id,
      countryCode: "AR",
      title: input.id,
      supplierName: input.supplierName,
      supplierDocument: input.supplierDocument,
      agencyName: input.agencyName,
      amount: input.amount,
      year: input.year,
      coordinates: input.hasGeometry ? { lat: -34.6, lon: -58.4 } : null,
      caveats: [],
      receipt: {
        receiptId: `${input.sourceId}-${input.id}`,
        sourceId: input.sourceId,
        sourceName: input.sourceId,
        sourceUrl: "https://example.test",
        rawPath: "data/test.json",
        fileHash: "sha256-file",
        rowHash: "sha256-row",
        snapshotHash: "sha256-snapshot",
        recordId: input.id,
        locatorType: "official_dataset",
        parserVersion: "test@1",
        extractedAt: "2026-05-17T12:00:00.000Z",
      },
    },
    receipt: {
      receiptId: `${input.sourceId}-${input.id}`,
      sourceId: input.sourceId,
      sourceName: input.sourceId,
      sourceUrl: "https://example.test",
      rawPath: "data/test.json",
      fileHash: "sha256-file",
      rowHash: "sha256-row",
      snapshotHash: "sha256-snapshot",
      recordId: input.id,
      locatorType: "official_dataset",
      parserVersion: "test@1",
      extractedAt: "2026-05-17T12:00:00.000Z",
    },
    relatedReceipts: [],
    contextualCitations: [],
    signals: [{
      code: input.signalCode,
      label: input.signalCode,
      kind: "watch",
      severity: "medium",
      summary: input.signalCode,
      evidence: input.signalCode,
      caveat: "Revisar fuente oficial.",
      action: "Abrir receipt.",
      leadEligible: true,
    }],
    caveats: [],
    verificationSteps: [],
  } as unknown as EvidencePack;
}
