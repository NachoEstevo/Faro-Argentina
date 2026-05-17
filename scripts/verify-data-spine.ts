import { readFile } from "node:fs/promises";

import { verifyDataSpine } from "../src/lib/data/dataSpineVerifier.ts";
import { verifyArticleCitations } from "../src/lib/data/articleCitationVerifier.ts";
import type { ArticleCitation } from "../src/lib/data/articleCitations.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

const rootDir = new URL("../", import.meta.url);

const catalog = await readJson<SourceCatalogEntry[]>("data/sources/source-catalog.json");
const argentinaDataset = await readJson<unknown>("src/data/argentinaWorkCases.json");
const crossCountryDataset = await readJson<{ datasets: unknown[] }>(
  "src/data/crossCountryCaseFiles.json",
);
const historicalJudicialDataset = await readJson<{ datasets: unknown[] }>(
  "src/data/argentinaHistoricalJudicialCases.json",
);
const articleCitationDataset = await readJson<{ citations: ArticleCitation[] }>(
  "src/data/articleCitations.json",
);

const datasets = [
  argentinaDataset,
  ...crossCountryDataset.datasets,
  ...historicalJudicialDataset.datasets,
] as Parameters<typeof verifyDataSpine>[0]["datasets"];

const report = await verifyDataSpine({
  rootDir,
  sources: catalog,
  datasets,
});
const articleReport = verifyArticleCitations({
  citations: articleCitationDataset.citations,
  cases: datasets.flatMap((dataset) => dataset.cases) as Parameters<typeof verifyArticleCitations>[0]["cases"],
});

console.log(JSON.stringify({
  ...report,
  contextualCitations: articleReport,
}, null, 2));

if (report.errors.length > 0 || articleReport.errors.length > 0) {
  process.exitCode = 1;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(new URL(path, rootDir), "utf8")) as T;
}
