import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArgentinaWorkCases,
  parseCsv,
  type RawArgentinaWorkRow,
} from "../src/lib/data/argentinaWorks.ts";

const sourcePath = new URL("../data/official/ar/onc-contratar-obras.csv", import.meta.url);
const outputPath = new URL("../src/data/argentinaWorkCases.json", import.meta.url);
const officialSourceUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv";

const text = await readFile(sourcePath, "utf8");
const hash = createHash("sha256").update(text).digest("hex");
const rows = parseCsv<RawArgentinaWorkRow>(text);
const generatedAt = new Date().toISOString();
const cases = buildArgentinaWorkCases(rows, {
  sourceId: "AR-CONTRATAR-OBRAS",
  sourceName: "CONTRAT.AR obras",
  sourceUrl: officialSourceUrl,
  extractedAt: generatedAt,
  fileHash: `sha256-${hash}`,
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
  stats: {
    rawRows: rows.length,
    caseFiles: cases.length,
    mapReadyCases: cases.filter((caseFile) => caseFile.coordinates !== null).length,
  },
  cases,
};

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
