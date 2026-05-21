import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArgentinaHistoricalJudicialCases,
  type ArgentinaHistoricalJudicialCase,
  type ArgentinaHistoricalJudicialSnapshot,
} from "../src/lib/data/argentinaHistoricalJudicial.ts";
import type { EvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";
import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";
import { profileJsonSnapshot } from "../src/lib/data/snapshots.ts";
import { loadFxRegistryFromFiles } from "../src/lib/data/fxSeries.ts";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import argentinaContractDataset from "../src/data/argentinaContractCases.json" with { type: "json" };

interface HistoricalSourceConfig {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  rawPath: string;
  filePath: URL;
}

const outputPath = new URL("../src/data/argentinaHistoricalJudicialCases.json", import.meta.url);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

const sourceConfigs: HistoricalSourceConfig[] = [
  {
    sourceId: "AR-CIJ-VIALIDAD-VEREDICTO",
    sourceName: "CIJ Causa Vialidad",
    sourceUrl: "https://www.cij.gov.ar/login/d/sentencia-SGU-f6fc6932-0023-41b8-bbb2-aec18b2d2a39.pdf",
    rawPath: "data/official/ar/cij-vialidad-context.json",
    filePath: new URL("../data/official/ar/cij-vialidad-context.json", import.meta.url),
  },
  {
    sourceId: "AR-MPF-VIALIDAD-ALEGATO",
    sourceName: "MPF Causa Vialidad alegato",
    sourceUrl: "https://www.fiscales.gob.ar/wp-content/uploads/2022/12/Indice-del-alegato-fiscal-Causa-5048-Vialidad.pdf",
    rawPath: "data/official/ar/mpf-vialidad-alegato-context.json",
    filePath: new URL("../data/official/ar/mpf-vialidad-alegato-context.json", import.meta.url),
  },
  {
    sourceId: "AR-MPF-CUADERNOS-CAMARITA",
    sourceName: "MPF Cuadernos La Camarita",
    sourceUrl: "https://www.fiscales.gob.ar/fiscalias/causa-cuadernos-comenzo-la-lectura-de-la-acusacion-por-la-cartelizacion-de-la-obra-publica-civil-en-cabeza-de-la-camara-argentina-de-empresas-viales/",
    rawPath: "data/official/ar/mpf-cuadernos-camarita-context.json",
    filePath: new URL("../data/official/ar/mpf-cuadernos-camarita-context.json", import.meta.url),
  },
];

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  generatedAt?: string;
  snapshots: Array<{ sourceId: string; fileHash: string; fetchUrl: string }>;
};
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: manifest.generatedAt,
});

function fxMeta(sourceId: string) {
  const entry = manifest.snapshots.find((s) => s.sourceId === sourceId);
  if (!entry) throw new Error(`fx snapshot ${sourceId} missing from manifest`);
  return { sourceId, sourceName: sourceId, sourceUrl: entry.fetchUrl, snapshotHash: entry.fileHash };
}

const fxRegistry = await loadFxRegistryFromFiles({
  rootDir: new URL("../", import.meta.url),
  profiles: [
    {
      currency: "ARS",
      relativePath: "data/official/fx/ar-bcra-com-a3500.csv",
      dateColumn: "indice_tiempo",
      rateColumn: "dolar_referencia_com_3500",
      dateFormat: "iso",
      delimiter: ",",
      sourceMeta: fxMeta("AR-BCRA-COM-A3500"),
    },
  ],
});
const localReceiptsByCaseId = buildLocalReceiptLookup();
const datasets = [];

for (const source of sourceConfigs) {
  const text = await readFile(source.filePath, "utf8");
  const snapshot = JSON.parse(text) as ArgentinaHistoricalJudicialSnapshot;
  const snapshotProfile = profileJsonSnapshot({
    sourceId: source.sourceId,
    rawPath: source.rawPath,
    text,
    recordPath: ["records"],
  });
  const cases = buildArgentinaHistoricalJudicialCases(snapshot.records, {
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    rawPath: source.rawPath,
    fileHash: snapshotProfile.fileHash,
    extractedAt: generatedAt,
    parserVersion: "argentina-historical-judicial@1",
    localReceiptsByCaseId,
    fxRegistry,
  });

  datasets.push({
    generatedAt,
    source: {
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      filePath: source.rawPath,
      fileHash: snapshotProfile.fileHash,
    },
    snapshotProfile,
    stats: {
      rawRows: snapshot.records.length,
      caseFiles: cases.length,
      mapReadyCases: 0,
    },
    cases,
  });
}

const allCases: ArgentinaHistoricalJudicialCase[] = datasets.flatMap((dataset) => dataset.cases);
const payload = {
  generatedAt,
  datasets,
  cases: allCases,
};

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

function buildLocalReceiptLookup(): Map<string, EvidenceReceipt> {
  const cases = [
    ...argentinaDataset.cases,
    ...argentinaContractDataset.cases,
  ] as Array<{ id: string; receipt?: EvidenceReceipt }>;
  return new Map(
    cases
      .filter((caseFile): caseFile is { id: string; receipt: EvidenceReceipt } =>
        caseFile.receipt !== undefined
      )
      .map((caseFile) => [caseFile.id, caseFile.receipt]),
  );
}
