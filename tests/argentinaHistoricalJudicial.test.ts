import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArgentinaHistoricalJudicialCases,
  type ArgentinaHistoricalJudicialRecord,
} from "../src/lib/data/argentinaHistoricalJudicial.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";

const localReceipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-local",
  recordId: "451-1003-CON18",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "test@1",
  row: { contrato_numero: "451-1003-CON18" },
});

test("buildArgentinaHistoricalJudicialCases keeps judicial context receipt-first and off-map", () => {
  const [caseFile] = buildArgentinaHistoricalJudicialCases([fixtureRecord], {
    sourceId: "AR-MPF-CUADERNOS-CAMARITA",
    sourceName: "MPF Cuadernos La Camarita",
    sourceUrl: "https://www.fiscales.gob.ar/",
    rawPath: "data/official/ar/mpf-cuadernos-camarita-context.json",
    fileHash: "sha256-context",
    extractedAt: "2026-05-16T00:00:00.000Z",
    parserVersion: "argentina-historical-judicial@test",
    localReceiptsByCaseId: new Map([["AR-CONTRACT-451-1003-CON18", localReceipt]]),
  });

  assert.equal(caseFile.id, "AR-HIST-JUD-CUADERNOS-CAMARITA-COARCO");
  assert.equal(caseFile.countryCode, "AR");
  assert.equal(caseFile.caseType, "supplier_judicial_context");
  assert.equal(caseFile.coordinates, null);
  assert.equal(caseFile.receipt.sourceId, "AR-MPF-CUADERNOS-CAMARITA");
  assert.equal(caseFile.receipt.locatorType, "official_detail");
  assert.equal(caseFile.relatedCaseIds.length, 1);
  assert.equal(
    caseFile.relatedReceipts?.some((receipt) => receipt.recordId === "451-1003-CON18"),
    true,
  );
  assert.equal(caseFile.caveats.some((caveat) => /no convierte/i.test(caveat)), true);
  assert.doesNotMatch(
    JSON.stringify(caseFile.caveats),
    /corrupt|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i,
  );
});

test("buildArgentinaHistoricalJudicialCases preserves contextual judicial amounts with caveats", () => {
  const [caseFile] = buildArgentinaHistoricalJudicialCases([contextFixtureRecord], {
    sourceId: "AR-MPF-CUADERNOS-CAMARITA",
    sourceName: "MPF Cuadernos La Camarita",
    sourceUrl: "https://www.fiscales.gob.ar/",
    rawPath: "data/official/ar/mpf-cuadernos-camarita-context.json",
    fileHash: "sha256-context",
    extractedAt: "2026-05-16T00:00:00.000Z",
    parserVersion: "argentina-historical-judicial@test",
    fxRegistry: new Map(),
  });

  assert.equal(caseFile.id, "AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026");
  assert.equal(caseFile.caseType, "judicial_context");
  assert.equal(caseFile.amount?.value, 30_000_000);
  assert.equal(caseFile.amount?.currency, "USD");
  assert.match(caseFile.amount?.label ?? "", /recaudacion_total_aproximada/);
  assert.equal(caseFile.amount?.usdConversionNote, "already_usd");
  assert.equal(
    caseFile.caveats.some((caveat) => /no es monto adjudicado/i.test(caveat)),
    true,
  );
});

const contextFixtureRecord: ArgentinaHistoricalJudicialRecord = {
  contextId: "CUADERNOS-CAMARITA-TOF7-2026",
  caseType: "judicial_context",
  title: "Cuadernos / La Camarita - juicio oral TOF 7",
  year: 2026,
  procedureNumber: "CFP 13816/2018",
  agencyName: "Tribunal Oral en lo Criminal Federal Nro. 7",
  agencyCode: "TOF7",
  contractingUnit: "Ministerio Publico Fiscal de la Nacion",
  supplierName: "Camara Argentina de Empresas Viales",
  supplierDocument: null,
  amount: {
    value: 30_000_000,
    currency: "USD",
    label: "recaudacion_total_aproximada_declarada_por_imputado_colaborador_en_requerimiento_mpf",
  },
  officialBudget: null,
  judicialStatus: "Juicio oral en curso ante TOF 7; sin sentencia firme.",
  contextSummary: "MPF informa que el tramo La Camarita trata una acusacion vinculada a obra publica civil.",
  localMatchStatus: "Contexto de red; no es una obra o contrato individual.",
  sourceUrl: "https://www.fiscales.gob.ar/",
  locatorType: "official_detail",
  relatedSourceRefs: [],
  relatedLocalCaseIds: [],
  caveats: [
    "El monto USD 30.000.000 es una recaudacion total aproximada citada en el requerimiento MPF; no es monto adjudicado.",
  ],
};

const fixtureRecord: ArgentinaHistoricalJudicialRecord = {
  contextId: "CUADERNOS-CAMARITA-COARCO",
  caseType: "supplier_judicial_context",
  title: "La Camarita - proveedor mencionado y contrato Faro: COARCO SA",
  year: 2026,
  procedureNumber: "CFP 13816/2018",
  agencyName: "Tribunal Oral en lo Criminal Federal Nro. 7",
  agencyCode: "TOF7",
  contractingUnit: "Ministerio Publico Fiscal de la Nacion",
  supplierName: "COARCO SA",
  supplierDocument: "30-51650063-4",
  amount: null,
  officialBudget: null,
  judicialStatus: "Mencion en requerimiento MPF; juicio oral en curso.",
  contextSummary: "Fuente judicial oficial con contrato Faro relacionado por proveedor.",
  localMatchStatus: "Match exacto por razon social y CUIT en caso relacionado.",
  sourceUrl: "https://www.fiscales.gob.ar/",
  locatorType: "official_detail",
  relatedSourceRefs: [
    {
      sourceId: "AR-MPF-CUADERNOS-CAMARITA",
      sourceName: "MPF Cuadernos La Camarita",
      sourceUrl: "https://www.fiscales.gob.ar/",
      recordId: "MPF-CAMARITA-REQUERIMIENTO-2019",
      locatorType: "official_detail",
    },
  ],
  relatedLocalCaseIds: ["AR-CONTRACT-451-1003-CON18"],
  caveats: [
    "El match es a nivel entidad/proveedor; no afirma que el contrato Faro relacionado sea hecho del juicio.",
  ],
};
