import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const caseMapUrl = new URL("../src/components/CaseMap.tsx", import.meta.url);

test("CaseMap filters markers through the map eligibility gate", async () => {
  const source = await readFile(caseMapUrl, "utf8");

  assert.match(source, /isMapMarkerEligible/);
  assert.match(source, /cases\.filter\(isMapMarkerEligible\)/);
  assert.doesNotMatch(source, /caseFile\.coordinates !== null/);
});
