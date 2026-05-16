import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChileCompraCases,
  buildPeruBudgetCases,
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
  assert.equal(caseFile?.receipt.locatorType, "official_detail");
});
