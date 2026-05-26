import test from "node:test";
import assert from "node:assert/strict";

import type { EvidencePack } from "../src/lib/caseRepository.ts";
import { buildInvestigationDossier } from "../src/lib/data/investigationDossiers.ts";
import { createInvestigationWorkspace } from "../src/lib/data/investigationWorkspaces.ts";

test("buildInvestigationDossier keeps evidence, user context, gaps and actor identity basis separate", () => {
  const workspace = {
    ...createInvestigationWorkspace(
      {
        title: "Dossier Vialidad",
        countryCode: "AR",
        description: "Carpeta de trabajo.",
        investigationQuestion: "Qué falta verificar?",
      },
      new Date("2026-05-26T12:00:00.000Z"),
    ),
    caseIds: ["AR-CASE-1", "AR-CASE-2"],
    caseRelations: [
      {
        caseId: "AR-CASE-1",
        reason: "same_supplier" as const,
        note: "Comparar proveedor recurrente.",
        addedAt: "2026-05-26T12:05:00.000Z",
      },
      {
        caseId: "AR-CASE-2",
        reason: "same_supplier" as const,
        note: "",
        addedAt: "2026-05-26T12:06:00.000Z",
      },
    ],
    sourceLinks: [{ id: "SRC-1", url: "https://example.test", label: "Fuente usuario", note: "" }],
  };

  const dossier = buildInvestigationDossier(workspace, [
    pack({ id: "AR-CASE-1", coordinates: null, contextual: false }),
    pack({ id: "AR-CASE-2", coordinates: { lat: 0, lon: 0 }, contextual: true }),
  ]);

  assert.equal(dossier.matrix.length, 2);
  assert.match(dossier.matrix[0].officialEvidence, /Fuente: Fuente oficial/);
  assert.match(dossier.matrix[0].userContext, /Contexto del usuario: Comparar proveedor recurrente/);
  assert.match(dossier.matrix[0].gap, /geometría/i);
  assert.match(dossier.matrix[1].gap, /geometría/i);
  assert.match(dossier.gaps.join("\n"), /fuente manual/);
  assert.match(dossier.nextSteps.join("\n"), /Abrir fuente oficial/);
  assert.deepEqual(dossier.actors.find((actor) => actor.label === "Proveedor Test")?.basis, "CUIT/documento");
  assert.doesNotMatch(JSON.stringify(dossier), /corrupci[oó]n|fraude|culpable|delito probado|publicar caso/i);
});

function pack(input: { id: string; coordinates: { lat: number; lon: number } | null; contextual: boolean }): EvidencePack {
  return {
    packType: "faro_evidence_pack",
    generatedAt: "2026-05-26T12:00:00.000Z",
    caseFile: {
      id: input.id,
      countryCode: "AR",
      title: `Caso ${input.id}`,
      supplierName: "Proveedor Test",
      supplierDocument: "30-70000000-0",
      agencyName: "Organismo Test",
      amount: { currency: "ARS", value: 100 },
      year: 2026,
      coordinates: input.coordinates,
      caveats: ["El contrato oficial no confirma pago por sí solo."],
      receipt: receipt(input.id),
    },
    receipt: receipt(input.id),
    relatedReceipts: [],
    contextualCitations: input.contextual ? [{
      citationId: `CTX-${input.id}`,
      title: "Contexto documental",
      publisher: "Fuente contextual",
      url: "https://example.test/context",
      publishedAt: "2026-01-01",
      relevance: "Contexto separado.",
      caveats: ["No reemplaza fuente oficial."],
    }] : [],
    signals: [{
      code: "single_bidder",
      kind: "watch",
      severity: "medium",
      priority: 10,
      label: "Competencia baja",
      summary: "Revisar competencia.",
      evidence: "Dato de prueba.",
      caveat: "Señal de revisión, no conclusión.",
      action: "Abrir fuente oficial.",
      leadEligible: true,
    }],
    caveats: ["El contrato oficial no confirma pago por sí solo."],
    verificationSteps: ["Pedir certificados de avance o recepción."],
  } as unknown as EvidencePack;
}

function receipt(caseId: string) {
  return {
    receiptId: `REC-${caseId}`,
    sourceId: "SRC",
    sourceName: "Fuente oficial",
    sourceUrl: "https://example.test",
    rawPath: "data/test.json",
    fileHash: "sha256-file",
    rowHash: "sha256-row",
    snapshotHash: "sha256-snapshot",
    recordId: caseId,
    locatorType: "official_dataset",
    parserVersion: "test@1",
    extractedAt: "2026-05-26T12:00:00.000Z",
    locator: { label: "Dataset oficial", note: "Fuente dataset." },
  };
}
