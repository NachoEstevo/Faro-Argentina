import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const caseFileRouteUrl = new URL("../src/app/api/cases/[id]/case-file/route.ts", import.meta.url);
const clientCasesExportUrl = new URL("../public/exports/faro-client-investigator-cases.json", import.meta.url);
const nonMapSignalCaseId = "AR-WORK-279-0003-OBR19";

test("case-file route can fall back to the exported full corpus for non-map cases", async () => {
  const source = await readFile(caseFileRouteUrl, "utf8");

  assert.match(source, /getInitialMapCaseById/);
  assert.match(source, /clientInvestigatorCasesPath/);
  assert.match(source, /faro-client-investigator-cases\.json/);
  assert.match(source, /findExportedCaseById/);
  assert.match(source, /getInitialMapCaseById\(caseId\) \?\? await findExportedCaseById\(caseId\)/);
  assert.doesNotMatch(source, /getCaseById/);
});

test("client full corpus includes signal cases that are intentionally not map-drawable", async () => {
  const payload = JSON.parse(await readFile(clientCasesExportUrl, "utf8")) as {
    cases: Array<{
      id: string;
      coordinates: { lat: number; lon: number } | null;
      receipt?: { fileHash?: string };
      caveats?: string[];
    }>;
  };
  const caseFile = payload.cases.find((candidate) => candidate.id === nonMapSignalCaseId);

  assert.equal(caseFile?.coordinates?.lat, 0);
  assert.equal(caseFile?.coordinates?.lon, 0);
  assert.equal(Boolean(caseFile?.receipt?.fileHash), true);
  assert.equal((caseFile?.caveats?.length ?? 0) > 0, true);
});
