import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalRecordsFromArgentinaWork,
  buildCanonicalRecordsFromCrossCountryCase,
  type ProcurementProcess,
  type PublicWork,
  type Supplier,
} from "../src/lib/data/canonicalRecords.ts";
import {
  buildArgentinaWorkCases,
  parseCsv,
  type RawArgentinaWorkRow,
} from "../src/lib/data/argentinaWorks.ts";

const sampleCsv = [
  "procedimiento_numero,uoc_codigo,uoc_descripcion,organismo_codigo_saf,organismo_nombre,expediente_procedimiento_numero,numero_obra,nombre_obra,ues_nombre,plazo_ejecucion_obra,plazo_ejecucion_obra_tipo,latitud_1,longitud_1,latitud_2,longitud_2",
  "81-0040-LPU17,81/0,81/100 - DIRECCION GENERAL DE ADMINISTRACION,325,325 - Ministerio del Interior,9924,81-0009-OBR18,PALACIO NACIONAL DE LAS ARTES - PALAIS DE GLACE,2026,18,4,-34.585722,-58.389361,,",
].join("\n");

test("buildCanonicalRecordsFromArgentinaWork emits work, entity and geopoint records with receipts", () => {
  const [caseFile] = buildArgentinaWorkCases(parseCsv<RawArgentinaWorkRow>(sampleCsv), {
    sourceId: "AR-CONTRATAR-OBRAS",
    sourceName: "CONTRAT.AR obras",
    sourceUrl: "https://example.gov/obras.csv",
    extractedAt: "2026-05-16T00:00:00.000Z",
    fileHash: "sha256-test",
    rawPath: "data/official/ar/onc-contratar-obras.csv",
    parserVersion: "argentina-works@1",
  });

  assert.ok(caseFile);
  const records = buildCanonicalRecordsFromArgentinaWork(caseFile);
  const work = records.find((record): record is PublicWork => record.type === "public_work");
  const entity = records.find((record) => record.type === "public_entity");
  const geo = records.find((record) => record.type === "geo_point");

  assert.equal(work?.canonicalId, "public_work:AR:81-0009-OBR18");
  assert.equal(work?.officialIds.workNumber, "81-0009-OBR18");
  assert.equal(work?.receiptIds[0], caseFile.receipt.receiptId);
  assert.equal(entity?.canonicalId, "public_entity:AR:325");
  assert.equal(geo?.canonicalId, "geo_point:AR:81-0009-OBR18");
});

test("buildCanonicalRecordsFromCrossCountryCase emits buyer, supplier and procurement process", () => {
  const records = buildCanonicalRecordsFromCrossCountryCase({
    id: "CL-TENDER-1159-2-LP26",
    countryCode: "CL",
    caseType: "procurement_process",
    workNumber: "1159-2-LP26",
    year: 2026,
    title: "Bolsas de carga pesada",
    procedureNumber: "1159-2-LP26",
    agencyName: "Servicio Agricola y Ganadero",
    agencyCode: "1159",
    contractingUnit: "Coquimbo",
    executionTerm: null,
    executionTermType: null,
    coordinates: null,
    evidenceLevel: "official_dataset",
    amount: { value: 294, currency: "CLP", label: "monto_adjudicado" },
    supplierName: "Sociedad de Gestion e Inversiones Julfior SPA",
    receipt: {
      receiptId: "CL-MERCADO-PUBLICO-API-1159-2-LP26",
      sourceId: "CL-MERCADO-PUBLICO-API",
      sourceName: "API de Mercado Publico",
      sourceUrl: "https://api.mercadopublico.cl/modules/api.aspx",
      rawPath: "data/official/cl/sample.json",
      snapshotHash: "sha256-snapshot",
      fileHash: "sha256-snapshot",
      rowHash: "sha256-row",
      recordId: "1159-2-LP26",
      locatorType: "official_detail",
      extractedAt: "2026-05-16T00:00:00.000Z",
      parserVersion: "cross-country@1",
    },
    caveats: ["La adjudicacion no prueba pago."],
  });

  const process = records.find(
    (record): record is ProcurementProcess => record.type === "procurement_process",
  );
  const supplier = records.find((record): record is Supplier => record.type === "supplier");

  assert.equal(process?.supplierId, "supplier:CL:sociedad-de-gestion-e-inversiones-julfior-spa");
  assert.equal(process?.publicEntityId, "public_entity:CL:1159");
  assert.equal(supplier?.name, "Sociedad de Gestion e Inversiones Julfior SPA");
});
