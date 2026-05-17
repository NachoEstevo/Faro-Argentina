import { readFile } from "node:fs/promises";

import { buildDataQualityReport, type DataQualityDataset } from "../src/lib/data/dataQualityReport.ts";
import { verifyDataSpine } from "../src/lib/data/dataSpineVerifier.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

const rootDir = new URL("../", import.meta.url);

type DataSpineDataset = Parameters<typeof verifyDataSpine>[0]["datasets"][number];

type GeneratedDataset = DataQualityDataset & DataSpineDataset & {
  generatedAt?: string;
  source: DataQualityDataset["source"] & DataSpineDataset["source"];
};

const catalog = await readJson<SourceCatalogEntry[]>("data/sources/source-catalog.json");
const argentinaDataset = await readJson<GeneratedDataset>("src/data/argentinaWorkCases.json");
const crossCountryDataset = await readJson<{
  generatedAt: string;
  datasets: GeneratedDataset[];
}>("src/data/crossCountryCaseFiles.json");
const historicalJudicialDataset = await readJson<{
  generatedAt: string;
  datasets: GeneratedDataset[];
}>("src/data/argentinaHistoricalJudicialCases.json");

const datasets = [
  withCatalogCountry(argentinaDataset, catalog),
  ...crossCountryDataset.datasets.map((dataset) => withCatalogCountry(dataset, catalog)),
  ...historicalJudicialDataset.datasets.map((dataset) => withCatalogCountry(dataset, catalog)),
];

const verification = await verifyDataSpine({
  rootDir,
  sources: catalog,
  datasets,
});

const report = buildDataQualityReport({
  generatedAt:
    historicalJudicialDataset.generatedAt ??
    crossCountryDataset.generatedAt ??
    argentinaDataset.generatedAt ??
    new Date().toISOString(),
  verification,
  datasets,
});

console.log(JSON.stringify(report, null, 2));

if (report.blockers.length > 0) {
  process.exitCode = 1;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(new URL(path, rootDir), "utf8")) as T;
}

function withCatalogCountry(
  dataset: GeneratedDataset,
  catalog: SourceCatalogEntry[],
): GeneratedDataset {
  const source = catalog.find((entry) => entry.sourceId === dataset.source.sourceId);
  return {
    ...dataset,
    source: {
      ...dataset.source,
      countryCode: source?.countryCode ?? dataset.source.countryCode,
    },
  };
}
