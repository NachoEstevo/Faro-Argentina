import test from "node:test";
import assert from "node:assert/strict";

import type { EvidencePack } from "../src/lib/caseRepository.ts";
import {
  addCaseToWorkspace,
  addVerificationTaskToWorkspace,
  createInvestigationWorkspace,
  updateVerificationTaskStatus,
} from "../src/lib/data/investigationWorkspaces.ts";
import { buildInvestigationDossierReadiness } from "../src/lib/data/investigationReadiness.ts";

test("buildInvestigationDossierReadiness blocks empty folders without accusing", () => {
  const workspace = createInvestigationWorkspace({
    title: "Carpeta",
    countryCode: "AR",
  }, new Date("2026-06-04T12:00:00.000Z"));

  const readiness = buildInvestigationDossierReadiness(workspace, []);

  assert.equal(readiness.level, "initial");
  assert.equal(readiness.label, "Inicial");
  assert.ok(readiness.score.blocked >= 1);
  assert.match(readiness.blockers.join("\n"), /Evidencia oficial/);
  assert.doesNotMatch(JSON.stringify(readiness), /fraude|culpable|corrupci[oó]n|delito|publicar caso/i);
});

test("buildInvestigationDossierReadiness marks handoff ready with caveats when gaps remain", () => {
  const created = createInvestigationWorkspace({
    title: "Carpeta",
    countryCode: "AR",
  }, new Date("2026-06-04T12:00:00.000Z"));
  const withCases = addCaseToWorkspace(
    addCaseToWorkspace(created, "AR-CASE-1", {
      reason: "same_supplier",
      note: "Comparar proveedor y fuente oficial.",
      now: new Date("2026-06-04T12:01:00.000Z"),
    }),
    "AR-CASE-2",
    {
      reason: "same_agency",
      note: "Mismo organismo para revisar patron administrativo.",
      now: new Date("2026-06-04T12:02:00.000Z"),
    },
  );
  const withTask = addVerificationTaskToWorkspace(withCases, {
    action: "Abrir fuentes oficiales y confirmar los records.",
    source: "Dossier",
    status: "done",
  }, new Date("2026-06-04T12:03:00.000Z"));
  const readiness = buildInvestigationDossierReadiness(withTask, [
    pack({ id: "AR-CASE-1", sourceId: "SRC-1", coordinates: { lat: -34.6, lon: -58.4 }, amount: 100, supplierName: "Proveedor A" }),
    pack({ id: "AR-CASE-2", sourceId: "SRC-2", coordinates: null, amount: null, supplierName: "Proveedor B" }),
  ]);

  assert.equal(readiness.level, "handoff_ready");
  assert.equal(readiness.label, "Lista para handoff interno con caveats");
  assert.equal(readiness.score.blocked, 0);
  assert.ok(readiness.checks.find((check) => check.id === "data_gaps")?.status === "review");
  assert.match(readiness.nextActions.join("\n"), /pendientes de verificacion/);
});

test("buildInvestigationDossierReadiness requires relation notes and verification tasks", () => {
  const workspace = addCaseToWorkspace(
    createInvestigationWorkspace({ title: "Carpeta", countryCode: "AR" }, new Date("2026-06-04T12:00:00.000Z")),
    "AR-CASE-1",
    {
      reason: "manual_hypothesis",
      note: "",
      now: new Date("2026-06-04T12:01:00.000Z"),
    },
  );
  const readiness = buildInvestigationDossierReadiness(workspace, [
    pack({ id: "AR-CASE-1", sourceId: "SRC-1", coordinates: { lat: -34.6, lon: -58.4 }, amount: 100, supplierName: "Proveedor A" }),
  ]);

  assert.equal(readiness.level, "working");
  assert.deepEqual(
    readiness.checks
      .filter((check) => check.status === "blocked")
      .map((check) => check.id)
      .sort(),
    ["relation_context", "verification_plan"],
  );
});

test("buildInvestigationDossierReadiness flags manual material as review work", () => {
  const withCase = addCaseToWorkspace(
    createInvestigationWorkspace({ title: "Carpeta", countryCode: "AR" }, new Date("2026-06-04T12:00:00.000Z")),
    "AR-CASE-1",
    {
      reason: "manual_hypothesis",
      note: "Verificar documento manual contra la fuente oficial.",
      now: new Date("2026-06-04T12:01:00.000Z"),
    },
  );
  const withTask = addVerificationTaskToWorkspace(withCase, {
    action: "Confirmar documento manual.",
    source: "Dossier",
    status: "done",
  }, new Date("2026-06-04T12:02:00.000Z"));
  const withManualSource = {
    ...updateVerificationTaskStatus(withTask, "TASK-1", "done", new Date("2026-06-04T12:03:00.000Z")),
    sourceLinks: [{ id: "SRC-1", url: "https://example.test", label: "Fuente manual", note: "" }],
  };

  const readiness = buildInvestigationDossierReadiness(withManualSource, [
    pack({ id: "AR-CASE-1", sourceId: "SRC-1", coordinates: { lat: -34.6, lon: -58.4 }, amount: 100, supplierName: "Proveedor A" }),
  ]);

  assert.equal(readiness.level, "handoff_ready");
  assert.equal(readiness.checks.find((check) => check.id === "manual_material")?.status, "review");
  assert.match(readiness.nextActions.join("\n"), /metadata|permiso|relevancia/);
});

function pack(input: {
  id: string;
  sourceId: string;
  coordinates: { lat: number; lon: number } | null;
  amount: number | null;
  supplierName: string | null;
}): EvidencePack {
  const receipt = {
    receiptId: `REC-${input.id}`,
    sourceId: input.sourceId,
    sourceName: "Fuente oficial",
    sourceUrl: "https://example.test",
    rawPath: "data/test.csv",
    fileHash: "sha256-file",
    rowHash: "sha256-row",
    snapshotHash: "sha256-snapshot",
    recordId: input.id,
    locatorType: "official_dataset",
    parserVersion: "test@1",
    extractedAt: "2026-06-04T12:00:00.000Z",
  };
  return {
    packType: "faro_evidence_pack",
    generatedAt: "2026-06-04T12:00:00.000Z",
    caseFile: {
      id: input.id,
      countryCode: "AR",
      title: `Caso ${input.id}`,
      year: 2026,
      workNumber: input.id,
      procedureNumber: input.id,
      agencyName: "Organismo Test",
      coordinates: input.coordinates,
      amount: input.amount === null ? null : { currency: "ARS", value: input.amount, label: "monto" },
      supplierName: input.supplierName,
      supplierDocument: null,
      caveats: ["No confirma pagos por si solo."],
      receipt,
    },
    receipt,
    relatedReceipts: [],
    contextualCitations: [],
    signals: [],
    caveats: ["No confirma pagos por si solo."],
    verificationSteps: ["Abrir fuente oficial."],
  } as unknown as EvidencePack;
}
