import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArgentinaContractCases,
  buildChileCompraCases,
  buildPeruBudgetCases,
  buildPeruContractCases,
  type ArgentinaSupplierRow,
  type ArgentinaLocationRow,
  type ArgentinaOfferRow,
  type ArgentinaOpeningActRow,
  type ArgentinaProcedureRow,
  type ChileCompraSnapshot,
  type PeruContractRow,
} from "../src/lib/data/crossCountryCases.ts";
import { parseCsv, type RawArgentinaWorkRow } from "../src/lib/data/argentinaWorks.ts";
import { profileCsvSnapshot, profileJsonSnapshot } from "../src/lib/data/snapshots.ts";
import { profileXlsxSnapshot, readXlsxRows } from "../src/lib/data/xlsx.ts";

const pePath = new URL("../data/official/pe/mef-2026-gasto-diario.sample.csv", import.meta.url);
const arWorksPath = new URL("../data/official/ar/onc-contratar-obras.csv", import.meta.url);
const arContractsPath = new URL("../data/official/ar/onc-contratar-contratos.csv", import.meta.url);
const arSuppliersPath = new URL("../data/official/ar/sipro-proveedores.csv", import.meta.url);
const arProceduresPath = new URL(
  "../data/official/ar/onc-contratar-procedimientos.csv",
  import.meta.url,
);
const arOffersPath = new URL("../data/official/ar/onc-contratar-ofertas.csv", import.meta.url);
const arLocationsPath = new URL(
  "../data/official/ar/onc-contratar-ubicacion-geografica.csv",
  import.meta.url,
);
const arOpeningActsPath = new URL(
  "../data/official/ar/onc-contratar-actas-apertura.csv",
  import.meta.url,
);
const peContractsPath = new URL("../data/official/pe/oece-contratos-2025.xlsx", import.meta.url);
const peOcdsPath = new URL(
  "../data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
  import.meta.url,
);
const clPath = new URL(
  "../data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  import.meta.url,
);
const outputPath = new URL("../src/data/crossCountryCaseFiles.json", import.meta.url);

const generatedAt = new Date().toISOString();
const peText = await readFile(pePath, "utf8");
const arWorksText = await readFile(arWorksPath, "utf8");
const arContractsText = await readFile(arContractsPath, "utf8");
const arSuppliersText = await readFile(arSuppliersPath, "utf8");
const arProceduresText = await readFile(arProceduresPath, "utf8");
const arOffersText = await readFile(arOffersPath, "utf8");
const arLocationsText = await readFile(arLocationsPath, "utf8");
const arOpeningActsText = await readFile(arOpeningActsPath, "utf8");
const peContractsBuffer = await readFile(peContractsPath);
const peOcdsText = await readFile(peOcdsPath, "utf8");
const clText = await readFile(clPath, "utf8");
const arWorksProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-OBRAS",
  rawPath: "data/official/ar/onc-contratar-obras.csv",
  text: arWorksText,
  keyColumns: ["numero_obra", "procedimiento_numero", "latitud_1", "longitud_1"],
});
const arContractsProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  text: arContractsText,
  keyColumns: ["contrato_numero", "procedimiento_numero", "contratista_cuit", "contrato_monto"],
});
const arSuppliersProfile = profileCsvSnapshot({
  sourceId: "AR-SIPRO-PROVEEDORES",
  rawPath: "data/official/ar/sipro-proveedores.csv",
  text: arSuppliersText,
  keyColumns: ["cuit___nit", "razon_social", "provincia"],
});
const arProceduresProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
  rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
  text: arProceduresText,
  keyColumns: [
    "procedimiento_numero",
    "procedimiento_estado",
    "procedimiento_tipo",
    "presupuesto_oficial_monto",
  ],
});
const arOffersProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-OFERTAS",
  rawPath: "data/official/ar/onc-contratar-ofertas.csv",
  text: arOffersText,
  keyColumns: ["procedimiento_numero", "oferente_cuit", "oferente_razon_social", "oferta_monto"],
});
const arLocationsProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-UBICACION",
  rawPath: "data/official/ar/onc-contratar-ubicacion-geografica.csv",
  text: arLocationsText,
  keyColumns: ["numero_obra", "provincia_nombre", "departamento_nombre", "localidad_nombre"],
});
const arOpeningActsProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
  rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
  text: arOpeningActsText,
  keyColumns: ["procedimiento_numero", "fecha_creacion", "cantidad_ofertas_confirmadas"],
});
const peProfile = profileCsvSnapshot({
  sourceId: "PE-MEF-GASTO-DIARIO",
  rawPath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
  text: peText,
  keyColumns: ["ANO_EJE", "SEC_EJEC", "PRODUCTO_PROYECTO", "MONTO_DEVENGADO"],
});
const clProfile = profileJsonSnapshot({
  sourceId: "CL-MERCADO-PUBLICO-API",
  rawPath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  text: clText,
  recordPath: ["details"],
});
const peContractsProfile = profileXlsxSnapshot({
  sourceId: "PE-OECE-CONTRATOS",
  rawPath: "data/official/pe/oece-contratos-2025.xlsx",
  buffer: peContractsBuffer,
});
const peOcdsProfile = profileJsonSnapshot({
  sourceId: "PE-OECE-OCDS",
  rawPath: "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
  text: peOcdsText,
  recordPath: ["releases"],
});

const peCases = buildPeruBudgetCases(peText, {
  sourceId: "PE-MEF-GASTO-DIARIO",
  sourceName: "MEF presupuesto y ejecucion de gasto diario",
  sourceUrl: "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2026-Gasto-Diario.csv",
  rawPath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
  fileHash: peProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
});
const arContractCases = buildArgentinaContractCases(arContractsText, {
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  fileHash: arContractsProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
}, {
  limit: 50,
  works: {
    rows: parseCsv<RawArgentinaWorkRow>(arWorksText),
    source: {
      sourceId: "AR-CONTRATAR-OBRAS",
      sourceName: "CONTRAT.AR obras",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv",
      rawPath: "data/official/ar/onc-contratar-obras.csv",
      fileHash: arWorksProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-works@1",
    },
  },
  suppliers: {
    rows: parseCsv<ArgentinaSupplierRow>(arSuppliersText),
    source: {
      sourceId: "AR-SIPRO-PROVEEDORES",
      sourceName: "SIPRO proveedores",
      sourceUrl: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/2/distribution/2.11/download/proveedores.csv",
      rawPath: "data/official/ar/sipro-proveedores.csv",
      fileHash: arSuppliersProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-suppliers@1",
    },
  },
  procedures: {
    rows: parseCsv<ArgentinaProcedureRow>(arProceduresText),
    source: {
      sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
      sourceName: "CONTRAT.AR procedimientos",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.1/download/onc-contratar-procedimientos.csv",
      rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
      fileHash: arProceduresProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-procedures@1",
    },
  },
  offers: {
    rows: parseCsv<ArgentinaOfferRow>(arOffersText),
    source: {
      sourceId: "AR-CONTRATAR-OFERTAS",
      sourceName: "CONTRAT.AR ofertas",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.3/download/onc-contratar-ofertas.csv",
      rawPath: "data/official/ar/onc-contratar-ofertas.csv",
      fileHash: arOffersProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-offers@1",
    },
  },
  locations: {
    rows: parseCsv<ArgentinaLocationRow>(arLocationsText),
    source: {
      sourceId: "AR-CONTRATAR-UBICACION",
      sourceName: "CONTRAT.AR ubicacion geografica",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.6/download/onc-contratar-ubicacion-geografica.csv",
      rawPath: "data/official/ar/onc-contratar-ubicacion-geografica.csv",
      fileHash: arLocationsProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-locations@1",
    },
  },
  openingActs: {
    rows: parseCsv<ArgentinaOpeningActRow>(arOpeningActsText),
    source: {
      sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
      sourceName: "CONTRAT.AR actas de apertura",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.8/download/onc-contratar-actas-apertura.csv",
      rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
      fileHash: arOpeningActsProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-opening-acts@1",
    },
  },
});
const peContractRows = readXlsxRows(peContractsBuffer, { limit: 30 })
  .rows as unknown as PeruContractRow[];
const peContractCases = buildPeruContractCases(peContractRows, {
  sourceId: "PE-OECE-CONTRATOS",
  sourceName: "OECE contratos",
  sourceUrl: "https://www.datosabiertos.gob.pe/node/20236/dataset",
  rawPath: "data/official/pe/oece-contratos-2025.xlsx",
  fileHash: peContractsProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
}, 25, {
  releases: (JSON.parse(peOcdsText) as { releases: [] }).releases,
  source: {
    sourceId: "PE-OECE-OCDS",
    sourceName: "Portal de contrataciones abiertas OCDS",
    sourceUrl: "https://contratacionesabiertas.oece.gob.pe/descargas",
    rawPath: "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
    fileHash: peOcdsProfile.fileHash,
    extractedAt: generatedAt,
    parserVersion: "peru-ocds@1",
  },
});
const clCases = buildChileCompraCases(JSON.parse(clText) as ChileCompraSnapshot, {
  sourceId: "CL-MERCADO-PUBLICO-API",
  sourceName: "API de Mercado Publico",
  sourceUrl: "https://api.mercadopublico.cl/modules/api.aspx",
  rawPath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  fileHash: clProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
});

const payload = {
  generatedAt,
  datasets: [
    buildDataset({
      sourceId: "AR-CONTRATAR-CONTRATOS",
      sourceName: "CONTRAT.AR contratos",
      sourceUrl: "https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar",
      filePath: "data/official/ar/onc-contratar-contratos.csv",
      fileHash: arContractsProfile.fileHash,
      snapshotProfile: arContractsProfile,
      rawRows: arContractsProfile.rowCount,
      cases: arContractCases,
    }),
    buildDataset({
      sourceId: "PE-MEF-GASTO-DIARIO",
      sourceName: "MEF presupuesto y ejecucion de gasto diario",
      sourceUrl: "https://www.datosabiertos.gob.pe/dataset/presupuesto-y-ejecuci%C3%B3n-de-gasto",
      filePath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
      fileHash: peProfile.fileHash,
      snapshotProfile: peProfile,
      rawRows: peProfile.rowCount,
      cases: peCases,
    }),
    buildDataset({
      sourceId: "PE-OECE-CONTRATOS",
      sourceName: "OECE contratos",
      sourceUrl: "https://www.datosabiertos.gob.pe/node/20236/dataset",
      filePath: "data/official/pe/oece-contratos-2025.xlsx",
      fileHash: peContractsProfile.fileHash,
      snapshotProfile: peContractsProfile,
      rawRows: peContractsProfile.rowCount,
      cases: peContractCases,
    }),
    buildDataset({
      sourceId: "CL-MERCADO-PUBLICO-API",
      sourceName: "API de Mercado Publico",
      sourceUrl: "https://api.mercadopublico.cl/modules/api.aspx",
      filePath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
      fileHash: clProfile.fileHash,
      snapshotProfile: clProfile,
      rawRows: clProfile.recordCount,
      cases: clCases,
    }),
  ],
  cases: [...arContractCases, ...peCases, ...peContractCases, ...clCases],
};

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

function buildDataset({
  sourceId,
  sourceName,
  sourceUrl,
  filePath,
  fileHash,
  snapshotProfile,
  rawRows,
  cases,
}: {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  filePath: string;
  fileHash: string;
  snapshotProfile: unknown;
  rawRows: number;
  cases: Array<{ coordinates: unknown | null; receipt?: unknown }>;
}) {
  return {
    generatedAt,
    source: { sourceId, sourceName, sourceUrl, filePath, fileHash },
    snapshotProfile,
    stats: {
      rawRows,
      caseFiles: cases.length,
      mapReadyCases: cases.filter((caseFile) => caseFile.coordinates !== null).length,
    },
    cases,
  };
}
