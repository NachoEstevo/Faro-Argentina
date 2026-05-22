import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { buildArgentinaInvestmentMapCases } from "../src/lib/data/argentinaInvestmentMap.ts";
import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";
import { profileCsvSnapshot } from "../src/lib/data/snapshots.ts";

const rootDir = new URL("../", import.meta.url);
const sourcePath = new URL("data/official/ar/mapa-inversiones-obras.csv", rootDir);
const outputPath = new URL("src/data/argentinaInvestmentMapCases.json", rootDir);
const manifestPath = new URL("data/official/snapshot-manifest.json", rootDir);
const sourceUrl = "https://datos.gob.ar/dataset/obras-mapa-inversiones-argentina";
const downloadUrl = "https://mapainversiones.obraspublicas.gob.ar/opendata/dataset_mop.csv";
const sourceId = "AR-MAPA-INVERSIONES-OBRAS";

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  generatedAt?: string;
  snapshots?: Array<{ sourceId: string; fetchedAt?: string }>;
};
const snapshot = manifest.snapshots?.find((entry) => entry.sourceId === sourceId);
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: snapshot?.fetchedAt ?? manifest.generatedAt,
});
const text = await readFile(sourcePath, "utf8");
const hash = createHash("sha256").update(text).digest("hex");
const snapshotProfile = profileCsvSnapshot({
  sourceId,
  rawPath: "data/official/ar/mapa-inversiones-obras.csv",
  text,
  keyColumns: [
    "idproyecto",
    "numeroobra",
    "nombreobra",
    "montototal",
    "avancefisico",
    "avancefinanciero",
    "nombreprovincia",
    "url_perfil_obra",
  ],
});
const cases = buildArgentinaInvestmentMapCases(text, {
  sourceId,
  sourceName: "Mapa de Inversiones Argentina obras",
  sourceUrl: downloadUrl,
  extractedAt: generatedAt,
  fileHash: `sha256-${hash}`,
  rawPath: "data/official/ar/mapa-inversiones-obras.csv",
  parserVersion: "argentina-investment-map@1",
});

const payload = {
  generatedAt,
  source: {
    sourceId,
    sourceName: "Mapa de Inversiones Argentina obras",
    sourceUrl,
    filePath: "data/official/ar/mapa-inversiones-obras.csv",
    fileHash: `sha256-${hash}`,
  },
  snapshotProfile,
  stats: {
    rawRows: snapshotProfile.rowCount,
    caseFiles: cases.length,
    mapReadyCases: 0,
  },
  cases,
};

await mkdir(new URL("src/data/", rootDir), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
