import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildChileCompraCases,
  buildPeruBudgetCases,
  buildPeruContractCases,
  type ChileCompraSnapshot,
  type PeruContractRow,
} from "../src/lib/data/crossCountryCases.ts";
import { profileCsvSnapshot, profileJsonSnapshot } from "../src/lib/data/snapshots.ts";
import { profileXlsxSnapshot, readXlsxRows } from "../src/lib/data/xlsx.ts";

const pePath = new URL("../data/official/pe/mef-2026-gasto-diario.sample.csv", import.meta.url);
const peContractsPath = new URL("../data/official/pe/oece-contratos-2025.xlsx", import.meta.url);
const clPath = new URL(
  "../data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  import.meta.url,
);
const outputPath = new URL("../src/data/crossCountryCaseFiles.json", import.meta.url);

const generatedAt = new Date().toISOString();
const peText = await readFile(pePath, "utf8");
const peContractsBuffer = await readFile(peContractsPath);
const clText = await readFile(clPath, "utf8");
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
  cases: [...peCases, ...peContractCases, ...clCases],
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
