import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArgentinaContractCases,
  type ArgentinaLocationRow,
  type ArgentinaOfferRow,
  type ArgentinaOpeningActRow,
  type ArgentinaProcedureRow,
  type ArgentinaSupplierRow,
} from "../src/lib/data/argentinaContracts.ts";
import { parseCsv } from "../src/lib/data/argentinaWorks.ts";
import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";
import { loadFxRegistryFromFiles } from "../src/lib/data/fxSeries.ts";
import { profileCsvSnapshot } from "../src/lib/data/snapshots.ts";

const rootDir = new URL("../", import.meta.url);
const outputPath = new URL("src/data/argentinaContractCases.json", rootDir);
const manifestPath = new URL("data/official/snapshot-manifest.json", rootDir);
const arContractsPath = new URL("data/official/ar/onc-contratar-contratos.csv", rootDir);
const arWorksPath = new URL("data/official/ar/onc-contratar-obras.csv", rootDir);
const arSuppliersPath = new URL("data/official/ar/sipro-proveedores.csv", rootDir);
const arProceduresPath = new URL("data/official/ar/onc-contratar-procedimientos.csv", rootDir);
const arOffersPath = new URL("data/official/ar/onc-contratar-ofertas.csv", rootDir);
const arLocationsPath = new URL("data/official/ar/onc-contratar-ubicacion-geografica.csv", rootDir);
const arOpeningActsPath = new URL("data/official/ar/onc-contratar-actas-apertura.csv", rootDir);
const argentinaContractCaseLimit = 300;

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  generatedAt?: string;
  snapshots: Array<{ sourceId: string; fileHash: string; fetchUrl: string }>;
};
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: manifest.generatedAt,
});

function fxSnapshotMeta(sourceId: string) {
  const entry = manifest.snapshots.find((snapshot) => snapshot.sourceId === sourceId);
  if (!entry) throw new Error(`fx snapshot ${sourceId} missing from manifest`);
  return {
    sourceId,
    sourceName: sourceId,
    sourceUrl: entry.fetchUrl,
    snapshotHash: entry.fileHash,
  };
}

const fxRegistry = await loadFxRegistryFromFiles({
  rootDir,
  profiles: [
    {
      currency: "ARS",
      relativePath: "data/official/fx/ar-bcra-com-a3500.csv",
      dateColumn: "indice_tiempo",
      rateColumn: "dolar_referencia_com_3500",
      dateFormat: "iso",
      delimiter: ",",
      sourceMeta: fxSnapshotMeta("AR-BCRA-COM-A3500"),
    },
  ],
});

const arContractsText = await readFile(arContractsPath, "utf8");
const arWorksText = await readFile(arWorksPath, "utf8");
const arSuppliersText = await readFile(arSuppliersPath, "utf8");
const arProceduresText = await readFile(arProceduresPath, "utf8");
const arOffersText = await readFile(arOffersPath, "utf8");
const arLocationsText = await readFile(arLocationsPath, "utf8");
const arOpeningActsText = await readFile(arOpeningActsPath, "utf8");

const arContractsProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  text: arContractsText,
  keyColumns: ["contrato_numero", "procedimiento_numero", "contratista_cuit", "contrato_monto"],
});
const arWorksProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-OBRAS",
  rawPath: "data/official/ar/onc-contratar-obras.csv",
  text: arWorksText,
  keyColumns: ["numero_obra", "procedimiento_numero", "latitud_1", "longitud_1"],
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

const arContractCases = buildArgentinaContractCases(arContractsText, {
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  fileHash: arContractsProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "argentina-contracts@1",
  fxRegistry,
}, {
  limit: argentinaContractCaseLimit,
  works: {
    rows: parseCsv(arWorksText),
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
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/23/distribution/23.1/download/sipro-proveedores.csv",
      rawPath: "data/official/ar/sipro-proveedores.csv",
      fileHash: arSuppliersProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-contracts@1",
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
      parserVersion: "argentina-contracts@1",
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
      parserVersion: "argentina-contracts@1",
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
      parserVersion: "argentina-contracts@1",
    },
  },
  openingActs: {
    rows: parseCsv<ArgentinaOpeningActRow>(arOpeningActsText),
    source: {
      sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
      sourceName: "CONTRAT.AR actas de apertura",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.7/download/onc-contratar-actas-apertura.csv",
      rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
      fileHash: arOpeningActsProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-contracts@1",
    },
  },
});

const dataset = {
  generatedAt,
  source: {
    sourceId: "AR-CONTRATAR-CONTRATOS",
    sourceName: "CONTRAT.AR contratos",
    sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
    filePath: "data/official/ar/onc-contratar-contratos.csv",
    fileHash: arContractsProfile.fileHash,
  },
  snapshotProfile: arContractsProfile,
  stats: {
    rawRows: parseCsv(arContractsText).length,
    caseFiles: arContractCases.length,
    mapReadyCases: arContractCases.filter((caseFile) => caseFile.coordinates !== null).length,
  },
  cases: arContractCases,
};

await mkdir(new URL("src/data/", rootDir), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  generatedAt,
  datasets: [dataset],
  cases: arContractCases,
}, null, 2)}\n`, "utf8");
