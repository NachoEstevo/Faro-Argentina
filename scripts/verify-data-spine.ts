import { readFile } from "node:fs/promises";

import { verifyDataSpine } from "../src/lib/data/dataSpineVerifier.ts";
import type { SourceCatalogEntry } from "../src/lib/data/sourceCatalog.ts";

const rootDir = new URL("../", import.meta.url);

const catalog = await readJson<SourceCatalogEntry[]>("data/sources/source-catalog.json");
const argentinaDataset = await readJson<unknown>("src/data/argentinaWorkCases.json");
const crossCountryDataset = await readJson<{ datasets: unknown[] }>(
  "src/data/crossCountryCaseFiles.json",
);

const report = await verifyDataSpine({
  rootDir,
  sources: catalog,
  datasets: [
    argentinaDataset,
    ...crossCountryDataset.datasets,
  ] as Parameters<typeof verifyDataSpine>[0]["datasets"],
});

console.log(JSON.stringify(report, null, 2));

if (report.errors.length > 0) {
  process.exitCode = 1;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(new URL(path, rootDir), "utf8")) as T;
}
