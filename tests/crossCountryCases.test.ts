import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArgentinaContractCases,
  buildChileCompraCases,
  buildPeruBudgetCases,
  buildPeruContractCases,
  type ChileCompraSnapshot,
} from "../src/lib/data/crossCountryCases.ts";

const options = {
  sourceId: "PE-MEF-GASTO-DIARIO",
  sourceName: "MEF presupuesto y ejecucion de gasto diario",
  sourceUrl: "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2026-Gasto-Diario.csv",
  rawPath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
  fileHash: "sha256-sample",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "cross-country@1",
};

test("buildPeruBudgetCases turns MEF rows into exportable evidence cases", () => {
  const csv = [
    '"ANO_EJE","MES_EJE","SEC_EJEC","EJECUTORA_NOMBRE","DEPARTAMENTO_META_NOMBRE","PRODUCTO_PROYECTO","PRODUCTO_PROYECTO_NOMBRE","ACTIVIDAD_ACCION_OBRA","ACTIVIDAD_ACCION_OBRA_NOMBRE","GENERICA_NOMBRE","ESPECIFICA_DET_NOMBRE","MONTO_DEVENGADO","MONTO_GIRADO"',
    '"2026","5","723","REGION AMAZONAS-TRANSPORTES","AMAZONAS","3999999","SIN PRODUCTO","5000616","CONTROL DEL TRANSPORTE","BIENES Y SERVICIOS","VIATICOS","645","645"',
  ].join("\n");

  const [caseFile] = buildPeruBudgetCases(csv, options);

  assert.equal(caseFile?.countryCode, "PE");
  assert.equal(caseFile?.caseType, "budget_execution");
  assert.equal(caseFile?.agencyName, "REGION AMAZONAS-TRANSPORTES");
  assert.equal(caseFile?.amount?.currency, "PEN");
  assert.equal(caseFile?.receipt.locatorType, "official_dataset");
});

test("buildArgentinaContractCases enriches contracts with official work geometry and SIPRO supplier data", () => {
  const contractsCsv = [
    "contrato_numero,procedimiento_numero,procedimiento_nombre,uoc_codigo,uoc_descripcion,organismo_codigo_saf,organismo_nombre,expediente_procedimiento_numero,numero_obra,nombre_obra,contrato_perfeccionamiento_fecha,contratista_cuit,contratista_razon_social,contrato_monto,contrato_moneda",
    "14-1002-CON21,14-0007-LPU20,Construccion cubierta,14,Compras CNEA,105,Comision Nacional de Energia Atomica,EX-2021,14-0001-OBR21,Construccion cubierta,2021-04-07T00:00:00,30-70043585-3,Warlet S.A,8694426.61,ARS",
  ].join("\n");
  const workRows = [
    {
      numero_obra: "14-0001-OBR21",
      nombre_obra: "Construccion cubierta",
      latitud_1: "-34.585722",
      longitud_1: "-58.389361",
    },
  ];
  const supplierRows = [
    {
      cuit___nit: "30700435853",
      razon_social: "WARLET S.A.",
      localidad: "Ciudad Autónoma de Buenos Aires",
      provincia: "Ciudad Autónoma de Buenos Aires",
    },
  ];

  const [caseFile] = buildArgentinaContractCases(contractsCsv, {
    ...options,
    sourceId: "AR-CONTRATAR-CONTRATOS",
    sourceName: "CONTRAT.AR contratos",
    sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
    rawPath: "data/official/ar/onc-contratar-contratos.csv",
  }, {
    limit: 1,
    works: {
      rows: workRows,
      source: {
        ...options,
        sourceId: "AR-CONTRATAR-OBRAS",
        sourceName: "CONTRAT.AR obras",
        sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv",
        rawPath: "data/official/ar/onc-contratar-obras.csv",
      },
    },
    suppliers: {
      rows: supplierRows,
      source: {
        ...options,
        sourceId: "AR-SIPRO-PROVEEDORES",
        sourceName: "SIPRO proveedores",
        sourceUrl: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/2/distribution/2.11/download/proveedores.csv",
        rawPath: "data/official/ar/sipro-proveedores.csv",
      },
    },
  });

  assert.deepEqual(caseFile?.coordinates, { lat: -34.585722, lon: -58.389361 });
  assert.equal(caseFile?.locationName, "Construccion cubierta");
  assert.equal(caseFile?.supplierProvince, "Ciudad Autónoma de Buenos Aires");
  assert.equal(caseFile?.supplierLocality, "Ciudad Autónoma de Buenos Aires");
  assert.deepEqual(
    caseFile?.relatedReceipts?.map((receipt) => receipt.sourceId).sort(),
    ["AR-CONTRATAR-OBRAS", "AR-SIPRO-PROVEEDORES"],
  );
});

test("buildArgentinaContractCases turns CONTRAT.AR contracts into supplier-aware cases", () => {
  const csv = [
    "contrato_numero,procedimiento_numero,procedimiento_nombre,uoc_codigo,uoc_descripcion,organismo_codigo_saf,organismo_nombre,expediente_procedimiento_numero,numero_obra,nombre_obra,contrato_perfeccionamiento_fecha,contratista_cuit,contratista_razon_social,contrato_monto,contrato_moneda",
    "14-1002-CON21,14-0007-LPU20,Construccion cubierta,14,Compras CNEA,105,Comision Nacional de Energia Atomica,EX-2021,14-0001-OBR21,Construccion cubierta,2021-04-07T00:00:00,30-70043585-3,Warlet S.A,8694426.61,ARS",
  ].join("\n");

  const [caseFile] = buildArgentinaContractCases(csv, {
    ...options,
    sourceId: "AR-CONTRATAR-CONTRATOS",
    sourceName: "CONTRAT.AR contratos",
    sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
    rawPath: "data/official/ar/onc-contratar-contratos.csv",
  });

  assert.equal(caseFile?.countryCode, "AR");
  assert.equal(caseFile?.caseType, "procurement_contract");
  assert.equal(caseFile?.supplierName, "Warlet S.A");
  assert.equal(caseFile?.supplierDocument, "30-70043585-3");
  assert.equal(caseFile?.amount?.currency, "ARS");
  assert.equal(caseFile?.receipt.locatorType, "official_dataset");
});

test("buildPeruContractCases turns OECE contract rows into supplier-aware cases", () => {
  const [caseFile] = buildPeruContractCases(
    [
      {
        codigoentidad: "010373",
        codigoconvocatoria: "1122118",
        descripcion_proceso: "Contratacion de maquinaria pesada",
        n_cod_contrato: "2328678",
        codigo_contrato: "2328678",
        num_contrato: "ORDEN DE SERVICIO N. 373",
        num_item: "1",
        monto_contratado_total: "113868.79",
        monto_contratado_item: "113868.79",
        moneda: "Soles",
        ruc_contratista: "20487924050",
        ruc_destinatario_pago: "20487924050",
        urlcontrato: "https://prodapp.seace.gob.pe/contrato",
        fecha_publicacion_contrato: "2025-01-05",
        fecha_suscripcion_contrato: "2025-01-03",
      },
    ],
    {
      ...options,
      sourceId: "PE-OECE-CONTRATOS",
      sourceName: "OECE contratos",
      sourceUrl: "https://www.datosabiertos.gob.pe/node/20236/dataset",
      rawPath: "data/official/pe/oece-contratos-2025.xlsx",
    },
  );

  assert.equal(caseFile?.countryCode, "PE");
  assert.equal(caseFile?.caseType, "procurement_contract");
  assert.equal(caseFile?.supplierDocument, "20487924050");
  assert.equal(caseFile?.amount?.currency, "PEN");
  assert.equal(caseFile?.receipt.locatorType, "official_detail");
});

test("buildChileCompraCases turns API details into exportable procurement cases", () => {
  const snapshot: ChileCompraSnapshot = {
    details: [
      {
        Listado: [
          {
            CodigoExterno: "1002-53-LP26",
            Nombre: "Convenio mantenimiento",
            CodigoEstado: 5,
            Moneda: "CLP",
            MontoEstimado: 1000,
            Comprador: {
              CodigoOrganismo: "7248",
              NombreOrganismo: "Ministerio de Obras Publicas",
              NombreUnidad: "Direccion de Vialidad",
              RegionUnidad: "Region de Los Lagos",
            },
            Fechas: { FechaPublicacion: "2026-05-15T16:56:09.203" },
            Items: {
              Listado: [
                {
                  Cantidad: 2,
                  Adjudicacion: {
                    RutProveedor: "78.047.617-6",
                    NombreProveedor: "Proveedor adjudicado",
                    MontoUnitario: 500,
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const [caseFile] = buildChileCompraCases(snapshot, {
    ...options,
    sourceId: "CL-MERCADO-PUBLICO-API",
    sourceName: "API de Mercado Publico",
    sourceUrl: "https://api.mercadopublico.cl/modules/api.aspx",
    rawPath: "data/official/cl/sample.json",
  });

  assert.equal(caseFile?.countryCode, "CL");
  assert.equal(caseFile?.caseType, "procurement_process");
  assert.equal(caseFile?.agencyCode, "7248");
  assert.equal(caseFile?.amount?.value, 1000);
  assert.equal(caseFile?.amount?.label, "monto_adjudicado");
  assert.equal(caseFile?.supplierName, "Proveedor adjudicado");
  assert.equal(caseFile?.supplierDocument, "78.047.617-6");
  assert.equal(caseFile?.receipt.locatorType, "official_detail");
});
