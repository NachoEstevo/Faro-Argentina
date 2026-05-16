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
  const procedureRows = [
    {
      procedimiento_numero: "14-0007-LPU20",
      procedimiento_estado: "Adjudicado",
      procedimiento_tipo: "Licitación Pública",
      presupuesto_oficial_monto: "5500000.00",
      publicacion_contratar_fecha: "2020-11-10 8:00:00",
      consultas_fin_fecha: "2020-11-20 18:00:00",
    },
  ];
  const offerRows = [
    {
      procedimiento_numero: "14-0007-LPU20",
      oferente_cuit: "30-70043585-3",
      oferente_razon_social: "Warlet S.A",
      oferta_monto: "8694426.61",
    },
    {
      procedimiento_numero: "14-0007-LPU20",
      oferente_cuit: "33-66162872-9",
      oferente_razon_social: "Instalectro S.A",
      oferta_monto: "8222525.98",
    },
  ];
  const locationRows = [
    {
      numero_obra: "14-0001-OBR21",
      provincia_nombre: "CIUDAD DE BUENOS AIRES",
      departamento_nombre: "CIUDAD DE BUENOS AIRES",
      localidad_nombre: "CIUDAD DE BUENOS AIRES",
      renglon_numero: "4.2.1-7003.2",
    },
  ];
  const openingActRows = [
    {
      procedimiento_numero: "14-0007-LPU20",
      id_acta_apertura: "7594",
      fecha_creacion: "2020-12-01T16:00:00",
      cantidad_ofertas_confirmadas: "2",
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
    procedures: {
      rows: procedureRows,
      source: {
        ...options,
        sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
        sourceName: "CONTRAT.AR procedimientos",
        sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.1/download/onc-contratar-procedimientos.csv",
        rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
      },
    },
    offers: {
      rows: offerRows,
      source: {
        ...options,
        sourceId: "AR-CONTRATAR-OFERTAS",
        sourceName: "CONTRAT.AR ofertas",
        sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.3/download/onc-contratar-ofertas.csv",
        rawPath: "data/official/ar/onc-contratar-ofertas.csv",
      },
    },
    locations: {
      rows: locationRows,
      source: {
        ...options,
        sourceId: "AR-CONTRATAR-UBICACION",
        sourceName: "CONTRAT.AR ubicacion geografica",
        sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.6/download/onc-contratar-ubicacion-geografica.csv",
        rawPath: "data/official/ar/onc-contratar-ubicacion-geografica.csv",
      },
    },
    openingActs: {
      rows: openingActRows,
      source: {
        ...options,
        sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
        sourceName: "CONTRAT.AR actas de apertura",
        sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.8/download/onc-contratar-actas-apertura.csv",
        rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
      },
    },
  });

  assert.deepEqual(caseFile?.coordinates, { lat: -34.585722, lon: -58.389361 });
  assert.equal(caseFile?.locationName, "Construccion cubierta");
  assert.equal(caseFile?.workProvince, "CIUDAD DE BUENOS AIRES");
  assert.equal(caseFile?.procedureState, "Adjudicado");
  assert.equal(caseFile?.procurementMethodDetails, "Licitación Pública");
  assert.equal(caseFile?.publishedAt, "2020-11-10");
  assert.equal(caseFile?.closedAt, "2020-11-20");
  assert.equal(caseFile?.openingAt, "2020-12-01");
  assert.equal(caseFile?.bidderCount, 2);
  assert.equal(caseFile?.offerCount, 2);
  assert.equal(caseFile?.officialBudget?.value, 5500000);
  assert.equal(caseFile?.supplierProvince, "Ciudad Autónoma de Buenos Aires");
  assert.equal(caseFile?.supplierLocality, "Ciudad Autónoma de Buenos Aires");
  assert.deepEqual(
    caseFile?.relatedReceipts?.map((receipt) => receipt.sourceId).sort(),
    [
      "AR-CONTRATAR-ACTAS-APERTURA",
      "AR-CONTRATAR-OBRAS",
      "AR-CONTRATAR-OFERTAS",
      "AR-CONTRATAR-PROCEDIMIENTOS",
      "AR-CONTRATAR-UBICACION",
      "AR-SIPRO-PROVEEDORES",
    ],
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

test("buildPeruContractCases enriches OECE contracts with OCDS release evidence", () => {
  const releaseUrl = "https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/1122118";
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
        fecha_publicacion_contrato: "2025-06-03",
        fecha_suscripcion_contrato: "2025-06-03",
      },
    ],
    {
      ...options,
      sourceId: "PE-OECE-CONTRATOS",
      sourceName: "OECE contratos",
      sourceUrl: "https://www.datosabiertos.gob.pe/node/20236/dataset",
      rawPath: "data/official/pe/oece-contratos-2025.xlsx",
    },
    25,
    {
      source: {
        ...options,
        sourceId: "PE-OECE-OCDS",
        sourceName: "Portal de contrataciones abiertas OCDS",
        sourceUrl: "https://contratacionesabiertas.oece.gob.pe/descargas",
        rawPath: "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
      },
      releases: [
        {
          tenderId: "1122118",
          fetchUrl: releaseUrl,
          package: {
            records: [
              {
                ocid: "ocds-dgv273-seacev3-1122118",
                compiledRelease: {
                  buyer: {
                    id: "PE-CONSUCODE-10373",
                    name: "GOBIERNO REGIONAL DE AMAZONAS - GERENCIA SUBREGIONAL BAGUA",
                  },
                  tender: {
                    id: "1122118",
                    numberOfTenderers: 1,
                    procurementMethodDetails: "Contratación Directa",
                  },
                  parties: [
                    {
                      id: "PE-CONSUCODE-10373",
                      name: "GOBIERNO REGIONAL DE AMAZONAS - GERENCIA SUBREGIONAL BAGUA",
                      address: {
                        locality: "BAGUA",
                        region: "BAGUA",
                        department: "AMAZONAS",
                      },
                    },
                    {
                      id: "PE-RUC-20487924050",
                      name: "INVERSIONES Y SERVICIOS MULTIPLES \"J&F RUAR\" E.I.R.L.",
                    },
                  ],
                  awards: [
                    {
                      id: "1122118-20487924050",
                      date: "2025-06-03T00:00:00-05:00",
                      suppliers: [
                        {
                          id: "PE-RUC-20487924050",
                          name: "INVERSIONES Y SERVICIOS MULTIPLES \"J&F RUAR\" E.I.R.L.",
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  );

  const peruCase = caseFile as typeof caseFile & {
    awardedAt: string | null;
    bidderCount: number | null;
    procurementMethodDetails: string | null;
    buyerDepartment: string | null;
    buyerRegion: string | null;
    buyerCommune: string | null;
  };

  assert.equal(caseFile?.agencyName, "GOBIERNO REGIONAL DE AMAZONAS - GERENCIA SUBREGIONAL BAGUA");
  assert.equal(caseFile?.supplierName, "INVERSIONES Y SERVICIOS MULTIPLES \"J&F RUAR\" E.I.R.L.");
  assert.equal(peruCase?.awardedAt, "2025-06-03");
  assert.equal(peruCase?.bidderCount, 1);
  assert.equal(peruCase?.procurementMethodDetails, "Contratación Directa");
  assert.equal(peruCase?.buyerDepartment, "AMAZONAS");
  assert.equal(peruCase?.buyerRegion, "BAGUA");
  assert.equal(peruCase?.buyerCommune, "BAGUA");
  assert.equal(caseFile?.relatedReceipts?.[0]?.sourceId, "PE-OECE-OCDS");
  assert.equal(caseFile?.relatedReceipts?.[0]?.sourceUrl, releaseUrl);
});

test("buildPeruContractCases normalizes OECE Excel serial dates for filters and validity", () => {
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
        fecha_publicacion_contrato: "45811",
        fecha_suscripcion_contrato: "45811",
        fecha_vigencia_inicial: "45811",
        fecha_vigencia_final: "45819",
        fecha_vigencia_fin_actualizada: "45819",
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

  assert.equal(caseFile?.year, 2025);
  assert.equal(caseFile?.executionTerm, "2025-06-03 - 2025-06-11");
  assert.equal(caseFile?.executionTermType, "vigencia_contractual");
});

test("buildChileCompraCases turns API details into exportable procurement cases", () => {
  const awardActUrl = "http://www.mercadopublico.cl/award-act";
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
            CantidadReclamos: 211,
            Comprador: {
              CodigoOrganismo: "7248",
              RutUnidad: "61.308.000-7",
              CodigoUnidad: "2155",
              NombreOrganismo: "Ministerio de Obras Publicas",
              NombreUnidad: "Direccion de Vialidad",
              RegionUnidad: "Region de Los Lagos",
              ComunaUnidad: "Puerto Montt",
            },
            Fechas: {
              FechaPublicacion: "2026-05-15T16:56:09.203",
              FechaCierre: "2026-05-20T15:00:00",
              FechaAdjudicacion: "2026-05-25T00:00:00",
            },
            Adjudicacion: {
              Numero: "511",
              NumeroOferentes: 13,
              UrlActa: awardActUrl,
            },
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
  assert.equal(caseFile?.amount?.label, "monto_adjudicado_item_sum");
  assert.equal(caseFile?.supplierName, "Proveedor adjudicado");
  assert.equal(caseFile?.supplierDocument, "78.047.617-6");
  assert.equal(caseFile?.receipt.locatorType, "official_detail");
  const chileCase = caseFile as typeof caseFile & {
    publishedAt: string | null;
    closedAt: string | null;
    awardedAt: string | null;
    awardActUrl: string | null;
    awardNumber: string | null;
    bidderCount: number | null;
    claimCount: number | null;
    buyerUnitCode: string | null;
    buyerUnitRut: string | null;
    buyerRegion: string | null;
    buyerCommune: string | null;
    itemCount: number | null;
    awardedLineCount: number | null;
  };
  assert.equal(chileCase?.publishedAt, "2026-05-15");
  assert.equal(chileCase?.closedAt, "2026-05-20");
  assert.equal(chileCase?.awardedAt, "2026-05-25");
  assert.equal(chileCase?.awardActUrl, awardActUrl);
  assert.equal(chileCase?.awardNumber, "511");
  assert.equal(chileCase?.bidderCount, 13);
  assert.equal(chileCase?.claimCount, 211);
  assert.equal(chileCase?.buyerUnitCode, "2155");
  assert.equal(chileCase?.buyerUnitRut, "61.308.000-7");
  assert.equal(chileCase?.buyerRegion, "Region de Los Lagos");
  assert.equal(chileCase?.buyerCommune, "Puerto Montt");
  assert.equal(chileCase?.itemCount, 1);
  assert.equal(chileCase?.awardedLineCount, 1);
  assert.equal(chileCase?.receipt.sourceUrl, awardActUrl);
});

test("buildChileCompraCases keeps missing Chile numeric context as null", () => {
  const [caseFile] = buildChileCompraCases(
    {
      details: [
        {
          Listado: [
            {
              CodigoExterno: "1002-54-LP26",
              Nombre: "Convenio sin metricas",
              CodigoEstado: 5,
              Comprador: {},
            },
          ],
        },
      ],
    },
    {
      ...options,
      sourceId: "CL-MERCADO-PUBLICO-API",
      sourceName: "API de Mercado Publico",
      sourceUrl: "https://api.mercadopublico.cl/modules/api.aspx",
      rawPath: "data/official/cl/sample.json",
    },
  );

  const chileCase = caseFile as typeof caseFile & {
    bidderCount: number | null;
    claimCount: number | null;
    itemCount: number | null;
    awardedLineCount: number | null;
  };

  assert.equal(chileCase?.bidderCount, null);
  assert.equal(chileCase?.claimCount, null);
  assert.equal(chileCase?.itemCount, null);
  assert.equal(chileCase?.awardedLineCount, 0);
});
