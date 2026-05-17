import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArticleCitations,
  type ArticleCitationInput,
} from "../src/lib/data/articleCitations.ts";
import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";

const rootDir = new URL("../", import.meta.url);
const inputPath = new URL("data/articles/article-citations.json", rootDir);
const outputPath = new URL("src/data/articleCitations.json", rootDir);
const manifestPath = new URL("data/official/snapshot-manifest.json", rootDir);

const input = JSON.parse(await readFile(inputPath, "utf8")) as {
  citations: ArticleCitationInput[];
};
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  generatedAt?: string;
};
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: manifest.generatedAt,
});

const payload = buildArticleCitations(input.citations, { generatedAt });

await mkdir(new URL("src/data/", rootDir), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
