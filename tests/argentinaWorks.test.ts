import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArgentinaWorkCases,
  parseCsv,
  type RawArgentinaWorkRow,
} from "../src/lib/data/argentinaWorks.ts";

const sampleCsv = [
  "procedimiento_numero,uoc_codigo,uoc_descripcion,organismo_codigo_saf,organismo_nombre,expediente_procedimiento_numero,numero_obra,nombre_obra,ues_nombre,plazo_ejecucion_obra,plazo_ejecucion_obra_tipo,latitud_1,longitud_1,latitud_2,longitud_2",
  "81-0040-LPU17,81/0,81/100 - DIRECCION GENERAL DE ADMINISTRACION,325,325 - Ministerio del Interior,9924,81-0009-OBR18,PALACIO NACIONAL DE LAS ARTES - PALAIS DE GLACE,2026,18,4,-34.585722,-58.389361,,",
  "74-0013-LPU18,74/0,74/00 - ADMINISTRACION DE PARQUES NACIONALES,107,107 - Administracion de Parques Nacionales,9968,74-0011-OBR18,\"Mejoramiento, reparacion Camino Acceso Cerro Tronador\",4369,550,2,-41.212333,-71.305491,,",
].join("\n");

test("parseCsv handles quoted commas and preserves official text identifiers", () => {
  const rows = parseCsv<RawArgentinaWorkRow>(sampleCsv);

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.numero_obra, "81-0009-OBR18");
  assert.equal(rows[1]?.nombre_obra, "Mejoramiento, reparacion Camino Acceso Cerro Tronador");
});

test("buildArgentinaWorkCases turns official work rows into map-ready case files", () => {
  const rows = parseCsv<RawArgentinaWorkRow>(sampleCsv);
  const cases = buildArgentinaWorkCases(rows, {
    sourceId: "AR-CONTRATAR-OBRAS",
    sourceName: "CONTRAT.AR obras",
    sourceUrl: "https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar/archivo/jgm_30.5",
    extractedAt: "2026-05-16T00:00:00.000Z",
    fileHash: "sha256-test",
    rawPath: "data/official/ar/onc-contratar-obras.csv",
    parserVersion: "argentina-works@1",
  });

  assert.equal(cases.length, 2);
  assert.equal(cases[0]?.id, "AR-WORK-81-0009-OBR18");
  assert.equal(cases[0]?.countryCode, "AR");
  assert.equal(cases[0]?.year, 2017);
  assert.deepEqual(cases[0]?.coordinates, { lat: -34.585722, lon: -58.389361 });
  assert.equal(cases[0]?.receipt.sourceId, "AR-CONTRATAR-OBRAS");
  assert.equal(cases[0]?.receipt.locatorType, "official_dataset");
  assert.equal(cases[0]?.receipt.rawPath, "data/official/ar/onc-contratar-obras.csv");
  assert.equal(cases[0]?.receipt.parserVersion, "argentina-works@1");
  assert.match(cases[0]?.receipt.rowHash ?? "", /^sha256-/);
  assert.equal(cases[0]?.evidenceLevel, "official_dataset");
  assert.match(cases[0]?.caveats[0] ?? "", /No confirma pagos/);
});

test("buildArgentinaWorkCases assigns stable ids to duplicate official rows", () => {
  const rows = parseCsv<RawArgentinaWorkRow>([
    "procedimiento_numero,uoc_codigo,uoc_descripcion,organismo_codigo_saf,organismo_nombre,expediente_procedimiento_numero,numero_obra,nombre_obra,ues_nombre,plazo_ejecucion_obra,plazo_ejecucion_obra_tipo,latitud_1,longitud_1,latitud_2,longitud_2",
    "501-0001-LPU22,501/0,UOC,501,Ministerio,EX-1,501-0003-OBR22,Obra repetida,2026,18,4,-34.6,-58.4,,",
    "501-0002-LPU22,501/0,UOC,501,Ministerio,EX-2,501-0003-OBR22,Obra repetida,2026,18,4,-34.61,-58.41,,",
  ].join("\n"));
  const cases = buildArgentinaWorkCases(rows, {
    sourceId: "AR-CONTRATAR-OBRAS",
    sourceName: "CONTRAT.AR obras",
    sourceUrl: "https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar/archivo/jgm_30.5",
    extractedAt: "2026-05-16T00:00:00.000Z",
    fileHash: "sha256-test",
    rawPath: "data/official/ar/onc-contratar-obras.csv",
    parserVersion: "argentina-works@1",
  });

  assert.deepEqual(cases.map((caseFile) => caseFile.id), [
    "AR-WORK-501-0003-OBR22",
    "AR-WORK-501-0003-OBR22--row-2",
  ]);
  assert.equal(cases[1]?.receipt.recordId, "501-0003-OBR22");
});
