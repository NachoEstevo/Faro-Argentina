import test from "node:test";
import assert from "node:assert/strict";

import { buildCaseMarkerKey, isMapMarkerEligible } from "../src/lib/data/mapMarkers.ts";

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

test("isMapMarkerEligible only accepts coordinates that pass country bounds", () => {
  assert.equal(isMapMarkerEligible({
    countryCode: "PE",
    coordinates: { lat: -5.613, lon: -78.434 },
  }), true);

  assert.equal(isMapMarkerEligible({
    countryCode: "PE",
    coordinates: null,
  }), false);

  assert.equal(isMapMarkerEligible({
    countryCode: "CL",
    coordinates: { lat: 38.8977, lon: -77.0365 },
  }), false);
});
