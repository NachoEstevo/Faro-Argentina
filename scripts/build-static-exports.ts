import { mkdir, rm, writeFile } from "node:fs/promises";

import {
  buildCaseCollectionPack,
  investigatorCaseFiles,
} from "../src/lib/caseRepository.ts";
import {
  buildCoreStaticExportFilters,
  buildStaticExportFileName,
  buildStaticExportHref,
  type StaticExportArtifact,
} from "../src/lib/data/staticExportArtifacts.ts";

const outputDirectory = new URL("../public/exports/", import.meta.url);
const clientInvestigatorCasesFileName = "faro-client-investigator-cases.json";
const filters = buildCoreStaticExportFilters(investigatorCaseFiles);
const artifacts: StaticExportArtifact[] = [];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const filter of filters) {
  const fileName = buildStaticExportFileName(filter);
  const href = buildStaticExportHref(filter);
  const pack = buildCaseCollectionPack(filter);
  await writeFile(new URL(fileName, outputDirectory), `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  artifacts.push({ filters: filter, fileName, href });
}

await writeFile(
  new URL(clientInvestigatorCasesFileName, outputDirectory),
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    artifactType: "faro_client_investigator_cases",
    cases: investigatorCaseFiles,
  })}\n`,
  "utf8",
);

await writeFile(
  new URL("manifest.json", outputDirectory),
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    artifactType: "faro_static_export_manifest",
    clientInvestigatorCases: {
      fileName: clientInvestigatorCasesFileName,
      href: `/exports/${clientInvestigatorCasesFileName}`,
    },
    artifacts,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Built ${artifacts.length} static export artifacts in public/exports`);
