import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArgentinaWorkCases,
  parseCsv,
  type RawArgentinaWorkRow,
} from "../src/lib/data/argentinaWorks.ts";
import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";
import { profileCsvSnapshot } from "../src/lib/data/snapshots.ts";

const sourcePath = new URL("../data/official/ar/onc-contratar-obras.csv", import.meta.url);
const outputPath = new URL("../src/data/argentinaWorkCases.json", import.meta.url);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);
const officialSourceUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv";

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { generatedAt?: string };
const text = await readFile(sourcePath, "utf8");
const hash = createHash("sha256").update(text).digest("hex");
const rows = parseCsv<RawArgentinaWorkRow>(text);
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: manifest.generatedAt,
});
const snapshotProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-OBRAS",
  rawPath: "data/official/ar/onc-contratar-obras.csv",
  text,
  keyColumns: ["numero_obra", "procedimiento_numero", "organismo_codigo_saf", "latitud_1", "longitud_1"],
});
const cases = buildArgentinaWorkCases(rows, {
  sourceId: "AR-CONTRATAR-OBRAS",
  sourceName: "CONTRAT.AR obras",
  sourceUrl: officialSourceUrl,
  extractedAt: generatedAt,
  fileHash: `sha256-${hash}`,
  rawPath: "data/official/ar/onc-contratar-obras.csv",
  parserVersion: "argentina-works@1",
});

const payload = {
  generatedAt,
  source: {
    sourceId: "AR-CONTRATAR-OBRAS",
    sourceName: "CONTRAT.AR obras",
    sourceUrl: officialSourceUrl,
    filePath: "data/official/ar/onc-contratar-obras.csv",
    fileHash: `sha256-${hash}`,
  },
  snapshotProfile,
  stats: {
    rawRows: rows.length,
    caseFiles: cases.length,
    mapReadyCases: cases.filter((caseFile) => caseFile.coordinates !== null).length,
  },
  cases,
};

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
