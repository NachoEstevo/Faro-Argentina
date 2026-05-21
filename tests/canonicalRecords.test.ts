import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalRecordsFromArgentinaWork,
  buildCanonicalRecordsFromArgentinaContractCase,
  type GeoPoint,
  type ProcurementContract,
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

test("buildCanonicalRecordsFromArgentinaContractCase emits buyer, supplier and contract records", () => {
  const records = buildCanonicalRecordsFromArgentinaContractCase({
    id: "AR-CONTRACT-14-1002-CON21",
    countryCode: "AR",
    caseType: "procurement_contract",
    workNumber: "14-1002-CON21",
    year: 2026,
    title: "Construccion cubierta",
    procedureNumber: "14-0007-LPU20",
    agencyName: "Comision Nacional de Energia Atomica",
    agencyCode: "105",
    contractingUnit: "Compras CNEA",
    executionTerm: null,
    executionTermType: null,
    coordinates: null,
    evidenceLevel: "official_dataset",
    amount: { value: 8694426.61, currency: "ARS", label: "monto_contrato", usdEquivalent: null, usdConversionNote: "currency_not_supported" },
    supplierName: "WARLET S.A.",
    supplierDocument: "30-70043585-3",
    receipt: {
      receiptId: "AR-CONTRATAR-CONTRATOS-14-1002-CON21",
      sourceId: "AR-CONTRATAR-CONTRATOS",
      sourceName: "CONTRAT.AR contratos",
      sourceUrl: "https://datos.gob.ar",
      rawPath: "data/official/ar/onc-contratar-contratos.csv",
      snapshotHash: "sha256-snapshot",
      fileHash: "sha256-snapshot",
      rowHash: "sha256-row",
      recordId: "14-1002-CON21",
      locatorType: "official_dataset",
      extractedAt: "2026-05-16T00:00:00.000Z",
      parserVersion: "argentina-contracts@1",
    },
    caveats: ["Contrato no prueba pago."],
  });

  const contract = records.find(
    (record): record is ProcurementContract => record.type === "procurement_contract",
  );
  const supplier = records.find((record): record is Supplier => record.type === "supplier");
  const entity = records.find((record) => record.type === "public_entity");

  assert.equal(entity?.canonicalId, "public_entity:AR:105");
  assert.equal(contract?.supplierId, "supplier:AR:30-70043585-3");
  assert.equal(contract?.publicEntityId, "public_entity:AR:105");
  assert.equal(contract?.officialIds.procedureNumber, "14-0007-LPU20");
  assert.equal(supplier?.name, "WARLET S.A.");
  assert.equal(supplier?.officialIds.document, "30-70043585-3");
});

test("buildCanonicalRecordsFromArgentinaContractCase links Argentina contracts to official work geometry", () => {
  const records = buildCanonicalRecordsFromArgentinaContractCase({
    id: "AR-CONTRACT-14-1002-CON21",
    countryCode: "AR",
    caseType: "procurement_contract",
    workNumber: "14-1002-CON21",
    publicWorkNumber: "14-0001-OBR21",
    year: 2021,
    title: "Construccion cubierta",
    procedureNumber: "14-0007-LPU20",
    agencyName: "Comision Nacional de Energia Atomica",
    agencyCode: "105",
    contractingUnit: "Compras CNEA",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -34.585722, lon: -58.389361 },
    locationName: "Construccion cubierta",
    locationSource: "AR-CONTRATAR-OBRAS",
    evidenceLevel: "official_dataset",
    amount: { value: 8694426.61, currency: "ARS", label: "monto_contrato", usdEquivalent: null, usdConversionNote: "currency_not_supported" },
    supplierName: "WARLET S.A.",
    supplierDocument: "30-70043585-3",
    supplierProvince: "Ciudad Autónoma de Buenos Aires",
    supplierLocality: "Ciudad Autónoma de Buenos Aires",
    receipt: {
      receiptId: "AR-CONTRATAR-CONTRATOS-14-1002-CON21",
      sourceId: "AR-CONTRATAR-CONTRATOS",
      sourceName: "CONTRAT.AR contratos",
      sourceUrl: "https://datos.gob.ar",
      rawPath: "data/official/ar/onc-contratar-contratos.csv",
      snapshotHash: "sha256-snapshot",
      fileHash: "sha256-snapshot",
      rowHash: "sha256-row",
      recordId: "14-1002-CON21",
      locatorType: "official_dataset",
      extractedAt: "2026-05-16T00:00:00.000Z",
      parserVersion: "argentina-contracts@1",
    },
    relatedReceipts: [
      {
        receiptId: "AR-CONTRATAR-OBRAS-14-0001-OBR21",
        sourceId: "AR-CONTRATAR-OBRAS",
        sourceName: "CONTRAT.AR obras",
        sourceUrl: "https://datos.gob.ar",
        rawPath: "data/official/ar/onc-contratar-obras.csv",
        snapshotHash: "sha256-work",
        fileHash: "sha256-work",
        rowHash: "sha256-row-work",
        recordId: "14-0001-OBR21",
        locatorType: "official_dataset",
        extractedAt: "2026-05-16T00:00:00.000Z",
        parserVersion: "argentina-contract-work-link@1",
      },
      {
        receiptId: "AR-SIPRO-PROVEEDORES-30700435853",
        sourceId: "AR-SIPRO-PROVEEDORES",
        sourceName: "SIPRO proveedores",
        sourceUrl: "https://datos.gob.ar",
        rawPath: "data/official/ar/sipro-proveedores.csv",
        snapshotHash: "sha256-sipro",
        fileHash: "sha256-sipro",
        rowHash: "sha256-row-sipro",
        recordId: "30700435853",
        locatorType: "official_dataset",
        extractedAt: "2026-05-16T00:00:00.000Z",
        parserVersion: "argentina-contract-supplier-link@1",
      },
    ],
    caveats: ["Contrato no prueba pago."],
  });

  const contract = records.find(
    (record): record is ProcurementContract => record.type === "procurement_contract",
  );
  const work = records.find((record): record is PublicWork => record.type === "public_work");
  const geo = records.find((record): record is GeoPoint => record.type === "geo_point");
  const supplier = records.find((record): record is Supplier => record.type === "supplier");

  assert.equal(contract?.publicWorkId, "public_work:AR:14-0001-OBR21");
  assert.equal(work?.canonicalId, "public_work:AR:14-0001-OBR21");
  assert.equal(work?.receiptIds.includes("AR-CONTRATAR-OBRAS-14-0001-OBR21"), true);
  assert.equal(work?.geoPointId, "geo_point:AR:14-0001-OBR21");
  assert.deepEqual(geo?.coordinates, { lat: -34.585722, lon: -58.389361 });
  assert.equal(supplier?.receiptIds.includes("AR-SIPRO-PROVEEDORES-30700435853"), true);
});
