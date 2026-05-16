import test from "node:test";
import assert from "node:assert/strict";

import { buildCaseMarkerKey } from "../src/lib/data/mapMarkers.ts";

test("buildCaseMarkerKey keeps repeated official work ids distinct on the map", () => {
  const caseFile = {
    id: "AR-WORK-501-0003-OBR21",
    coordinates: { lat: -34.1, lon: -58.2 },
  };

  assert.notEqual(
    buildCaseMarkerKey(caseFile, 0),
    buildCaseMarkerKey(caseFile, 1),
  );
});
