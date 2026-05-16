import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArgentinaContractCases,
  buildChileCompraCases,
  buildPeruBudgetCases,
  buildPeruContractCases,
  type ArgentinaSupplierRow,
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
const peContractsPath = new URL("../data/official/pe/oece-contratos-2025.xlsx", import.meta.url);
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
const peContractsBuffer = await readFile(peContractsPath);
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
