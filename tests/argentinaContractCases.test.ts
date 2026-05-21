import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArgentinaContractCases,
  type ArgentinaContractBuildContext,
} from "../src/lib/data/argentinaContracts.ts";

const options = {
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://datos.gob.ar/contratos",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  fileHash: "sha256-contracts",
  extractedAt: "2026-05-18T00:00:00.000Z",
  parserVersion: "argentina-contracts@1",
};

test("buildArgentinaContractCases turns official contracts into supplier-aware Argentina cases", () => {
  const [caseFile] = buildArgentinaContractCases(contractCsv(), options, argentinaContext());

  assert.equal(caseFile?.id, "AR-CONTRACT-CON-1");
  assert.equal(caseFile?.countryCode, "AR");
  assert.equal(caseFile?.caseType, "procurement_contract");
  assert.equal(caseFile?.title, "Hospital modular - ampliacion de guardia");
  assert.deepEqual(caseFile?.coordinates, { lat: -34.62, lon: -58.44 });
  assert.equal(caseFile?.supplierName, "Constructora Sur S.A.");
  assert.equal(caseFile?.supplierDocument, "30-12345678-9");
  assert.equal(caseFile?.bidderCount, 2);
  assert.equal(caseFile?.amount?.currency, "ARS");
  assert.equal(caseFile?.receipt.parserVersion, "argentina-contracts@1");
});

test("buildArgentinaContractCases preserves related official receipts", () => {
  const [caseFile] = buildArgentinaContractCases(contractCsv(), options, argentinaContext());
  const relatedSourceIds = new Set(caseFile?.relatedReceipts?.map((receipt) => receipt.sourceId));

  assert.equal(relatedSourceIds.has("AR-CONTRATAR-OBRAS"), true);
  assert.equal(relatedSourceIds.has("AR-SIPRO-PROVEEDORES"), true);
  assert.equal(relatedSourceIds.has("AR-CONTRATAR-PROCEDIMIENTOS"), true);
  assert.equal(relatedSourceIds.has("AR-CONTRATAR-OFERTAS"), true);
  assert.equal(relatedSourceIds.has("AR-CONTRATAR-ACTAS-APERTURA"), true);
  assert.equal(relatedSourceIds.has("AR-CONTRATAR-UBICACION"), true);
});

test("buildArgentinaContractCases keeps cases available when geometry is missing", () => {
  const [caseFile] = buildArgentinaContractCases(contractCsv(), options, {
    ...argentinaContext(),
    works: undefined,
  });

  assert.equal(caseFile?.coordinates, null);
  assert.equal(caseFile?.locationSource, null);
  assert.equal(caseFile?.caveats.some((caveat) => /ubicacion|mapa/i.test(caveat)), true);
});

function contractCsv(): string {
  return [
    "contrato_numero,procedimiento_numero,procedimiento_nombre,uoc_codigo,uoc_descripcion,organismo_codigo_saf,organismo_nombre,expediente_procedimiento_numero,numero_obra,nombre_obra,contrato_perfeccionamiento_fecha,contratista_cuit,contratista_razon_social,contrato_monto,contrato_moneda",
    "CON-1,PROC-1,Procedimiento generico,1,UOC Obras,604,Ministerio de Obras,EX-1,OBRA-1,Hospital modular,2022-04-10,30-12345678-9,Constructora Sur S.A.,1234567.89,ARS",
  ].join("\n");
}

function argentinaContext(): ArgentinaContractBuildContext {
  return {
    limit: 20,
    works: {
      rows: [
        {
          numero_obra: "OBRA-1",
          nombre_obra: "Hospital modular - ampliacion de guardia",
          latitud_1: "-34.62",
          longitud_1: "-58.44",
        },
      ],
      source: relatedSource("AR-CONTRATAR-OBRAS"),
    },
    suppliers: {
      rows: [
        {
          cuit___nit: "30-12345678-9",
          razon_social: "Constructora Sur S.A.",
          localidad: "La Plata",
          provincia: "Buenos Aires",
        },
      ],
      source: relatedSource("AR-SIPRO-PROVEEDORES"),
    },
    procedures: {
      rows: [
        {
          procedimiento_numero: "PROC-1",
          procedimiento_nombre: "Hospital modular - ampliacion de guardia",
          procedimiento_estado: "Adjudicado",
          procedimiento_tipo: "Licitacion publica",
          presupuesto_oficial_monto: "1000000",
          publicacion_contratar_fecha: "2022-03-01",
          consultas_fin_fecha: "2022-03-15",
        },
      ],
      source: relatedSource("AR-CONTRATAR-PROCEDIMIENTOS"),
    },
    offers: {
      rows: [
        {
          procedimiento_numero: "PROC-1",
          oferente_cuit: "30-12345678-9",
          oferente_razon_social: "Constructora Sur S.A.",
          oferta_monto: "1234567.89",
        },
        {
          procedimiento_numero: "PROC-1",
          oferente_cuit: "30-99999999-1",
          oferente_razon_social: "Otra Constructora S.R.L.",
          oferta_monto: "1300000",
        },
      ],
      source: relatedSource("AR-CONTRATAR-OFERTAS"),
    },
    locations: {
      rows: [
        {
          numero_obra: "OBRA-1",
          provincia_nombre: "Buenos Aires",
          departamento_nombre: "La Plata",
          localidad_nombre: "La Plata",
          renglon_numero: "1",
        },
      ],
      source: relatedSource("AR-CONTRATAR-UBICACION"),
    },
    openingActs: {
      rows: [
        {
          procedimiento_numero: "PROC-1",
          id_acta_apertura: "ACTA-1",
          fecha_creacion: "2022-03-20",
          cantidad_ofertas_confirmadas: "2",
          razon_social: "Constructora Sur S.A.",
        },
      ],
      source: relatedSource("AR-CONTRATAR-ACTAS-APERTURA"),
    },
  };
}

function relatedSource(sourceId: string) {
  return {
    sourceId,
    sourceName: sourceId,
    sourceUrl: "https://datos.gob.ar",
    rawPath: `data/official/ar/${sourceId.toLowerCase()}.csv`,
    fileHash: `sha256-${sourceId.toLowerCase()}`,
    extractedAt: "2026-05-18T00:00:00.000Z",
    parserVersion: "argentina-contracts@1",
  };
}
