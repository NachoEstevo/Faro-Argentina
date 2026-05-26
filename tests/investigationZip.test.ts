import test from "node:test";
import assert from "node:assert/strict";

import type { InvestigationCasePack } from "../src/lib/caseRepository.ts";
import { createInvestigationWorkspace } from "../src/lib/data/investigationWorkspaces.ts";
import { buildInvestigationZip } from "../src/lib/client/investigationZip.ts";

test("buildInvestigationZip creates a portable ZIP with workspace, notes, analysis and case packs", () => {
  const workspace = {
    ...createInvestigationWorkspace(
      {
        title: "Causa Vialidad",
        countryCode: "AR",
        description: "Carpeta privada.",
        investigationQuestion: "Qué falta verificar?",
        tags: ["vialidad"],
      },
      new Date("2026-05-17T12:00:00.000Z"),
    ),
    caseIds: ["AR-CASE-1"],
    caseRelations: [{
      caseId: "AR-CASE-1",
      reason: "same_judicial_context" as const,
      note: "Expediente agregado por contexto judicial oficial compartido.",
      addedAt: "2026-05-17T12:05:00.000Z",
    }],
    sourceLinks: [{ id: "SRC-1", url: "https://example.test", label: "Fuente", note: "Nota" }],
    notes: [{ id: "NOTE-1", body: "Cruzar fuente oficial.", createdAt: "2026-05-17T12:00:00.000Z" }],
    entities: [{ id: "ENT-1", label: "Proveedor", kind: "supplier" as const, note: "Entidad a revisar" }],
    analyses: [{
      id: "ANALYSIS-1",
      createdAt: "2026-05-17T12:10:00.000Z",
      summary: "Resumen",
      markdown: "# Análisis\n\nResumen de trabajo.",
    }],
  };
  const zip = buildInvestigationZip({
    workspace,
    casePacks: [casePack("AR-CASE-1")],
    analysisMarkdown: "# Análisis\n\nResumen de trabajo.",
  });
  const text = new TextDecoder().decode(zip.bytes);

  assert.equal(zip.mimeType, "application/zip");
  assert.equal(zip.filename, "faro-investigacion-causa-vialidad.zip");
  assert.equal(zip.bytes[0], 0x50);
  assert.equal(zip.bytes[1], 0x4b);
  assert.match(text, /workspace\.json/);
  assert.match(text, /README\.txt/);
  assert.match(text, /summary\.md/);
  assert.match(text, /dossier\.md/);
  assert.match(text, /evidence-matrix\.csv/);
  assert.match(text, /timeline\.md/);
  assert.match(text, /entities\.md/);
  assert.match(text, /notes\.md/);
  assert.match(text, /analysis\.md/);
  assert.match(text, /sources\/links\.json/);
  assert.match(text, /cases\/AR-CASE-1\.expediente\.json/);
  assert.match(text, /cases\/AR-CASE-1\.evidence\.json/);
  assert.match(text, /Carpeta de investigación Faro/);
  assert.match(text, /Mismo contexto judicial/);
  assert.match(text, /Expediente agregado por contexto judicial oficial compartido/);
  assert.match(text, /Matriz de evidencia/);
  assert.match(text, /Brechas para verificar/);
  assert.match(text, /Próximos pasos/);
  assert.match(text, /officialSourceUrl/);
  assert.match(text, /Contexto del usuario/);
  assert.match(text, /Sin geometría oficial: 1 expediente/);
  assert.match(text, /Proveedor/);
});

function casePack(caseId: string): InvestigationCasePack {
  return {
    caseId,
    expediente: {
      expedienteType: "faro_expediente_v1",
      generatedAt: "2026-05-17T12:00:00.000Z",
      summary: {
        caseId,
        countryCode: "AR",
        caseType: "public_work",
        title: "Caso de prueba",
        plainSummary: "Resumen",
        amountLabel: "ARS 100",
        organismLabel: "Vialidad",
        supplierLabel: "Proveedor",
        dateLabel: "2026",
        locationLabel: "Sin geometría oficial",
        evidenceLevel: "official_dataset",
      },
      whyItAppeared: [],
      officialTrail: {
        primary: {
          receiptId: "REC-1",
          sourceId: "SRC",
          sourceName: "Fuente",
          sourceUrl: "https://example.test",
          rawPath: "data/test.json",
          fileHash: "sha256-file",
          rowHash: "sha256-row",
          snapshotHash: "sha256-snapshot",
          recordId: caseId,
          locatorType: "official_dataset",
          parserVersion: "test@1",
          extractedAt: "2026-05-17T12:00:00.000Z",
          locator: { label: "Dataset oficial", note: "Nota" },
        },
        related: [],
      },
      investigationContext: {
        hasOfficialGeometry: false,
        relatedReceiptCount: 0,
        sourceCount: 1,
        geoEvidence: [],
        contextualCitations: [],
      },
      actions: {
        officialSourceHref: "https://example.test",
        reportHref: `/expediente/${caseId}/informe`,
        downloadEvidenceHref: `/api/export/${caseId}`,
        caseJsonHref: `/api/cases/${caseId}`,
      },
      caveats: [],
      nextVerification: [],
    },
    evidencePack: {
      packType: "faro_evidence_pack",
      generatedAt: "2026-05-17T12:00:00.000Z",
      caseFile: {
        id: caseId,
        countryCode: "AR",
        title: "Caso de prueba",
        supplierName: "Proveedor",
        supplierDocument: "30-70000000-0",
        agencyName: "Vialidad",
        amount: { currency: "ARS", value: 100 },
        year: 2026,
        coordinates: null,
        receipt: {
          receiptId: "REC-1",
          sourceId: "SRC",
          sourceName: "Fuente",
          sourceUrl: "https://example.test",
          rawPath: "data/test.json",
          fileHash: "sha256-file",
          rowHash: "sha256-row",
          snapshotHash: "sha256-snapshot",
          recordId: caseId,
          locatorType: "official_dataset",
          parserVersion: "test@1",
          extractedAt: "2026-05-17T12:00:00.000Z",
        },
        caveats: [],
      },
      receipt: {
        receiptId: "REC-1",
        sourceId: "SRC",
        sourceName: "Fuente",
        sourceUrl: "https://example.test",
        rawPath: "data/test.json",
        fileHash: "sha256-file",
        rowHash: "sha256-row",
        snapshotHash: "sha256-snapshot",
        recordId: caseId,
        locatorType: "official_dataset",
        parserVersion: "test@1",
        extractedAt: "2026-05-17T12:00:00.000Z",
      },
      relatedReceipts: [],
      contextualCitations: [],
      signals: [{ code: "official_dataset", label: "Dataset oficial", severity: "info" }],
      caveats: [],
      verificationSteps: [],
    },
  } as unknown as InvestigationCasePack;
}
