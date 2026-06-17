import test from "node:test";
import assert from "node:assert/strict";

import {
  assessCoordinateQuality,
  hasValidOfficialGeometry,
} from "../src/lib/data/coordinateQuality.ts";

test("assessCoordinateQuality accepts official coordinates inside Argentina bounds", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-VALID",
    countryCode: "AR",
    coordinates: { lat: -34.609296, lon: -58.390555 },
  });

  assert.equal(quality.status, "valid_official_geometry");
  assert.equal(quality.exposeOnMap, true);
  assert.deepEqual(quality.coordinates, { lat: -34.609296, lon: -58.390555 });
  assert.deepEqual(quality.reasons, []);
});

test("assessCoordinateQuality treats missing coordinates as a data gap", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-CONTRACT-NO-GEO",
    countryCode: "AR",
    coordinates: null,
  });

  assert.equal(quality.status, "missing_geometry");
  assert.equal(quality.exposeOnMap, false);
  assert.equal(quality.coordinates, null);
  assert.deepEqual(quality.reasons, ["missing_geometry"]);
});

test("assessCoordinateQuality blocks placeholder coordinates", () => {
  const zero = assessCoordinateQuality({
    caseId: "AR-WORK-ZERO",
    countryCode: "AR",
    coordinates: { lat: 0, lon: 0 },
  });
  const sample = assessCoordinateQuality({
    caseId: "AR-WORK-SAMPLE",
    countryCode: "AR",
    coordinates: { lat: 0.123456, lon: 0.123456 },
  });

  assert.equal(zero.status, "placeholder_geometry");
  assert.equal(sample.status, "placeholder_geometry");
  assert.equal(zero.exposeOnMap, false);
  assert.equal(sample.exposeOnMap, false);
});

test("assessCoordinateQuality identifies coordinates that look like missing signs", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-SIGN",
    countryCode: "AR",
    coordinates: { lat: 30.6297222, lon: 66.2694444 },
  });

  assert.equal(quality.status, "sign_suspect");
  assert.equal(quality.exposeOnMap, false);
  assert.match(quality.summary, /signo/i);
});

test("assessCoordinateQuality identifies duplicated coordinate values", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-DUPLICATED",
    countryCode: "AR",
    coordinates: { lat: -34.609296, lon: -34.609296 },
  });
  const nearDuplicate = assessCoordinateQuality({
    caseId: "AR-WORK-NEAR-DUPLICATED",
    countryCode: "AR",
    coordinates: { lat: -34.609296, lon: -34.6092961 },
  });

  assert.equal(quality.status, "duplicated_value_geometry");
  assert.equal(nearDuplicate.status, "duplicated_value_geometry");
  assert.equal(quality.exposeOnMap, false);
  assert.equal(nearDuplicate.exposeOnMap, false);
});

test("assessCoordinateQuality blocks coordinates outside expected country bounds", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-USA",
    countryCode: "AR",
    coordinates: { lat: 38.8977, lon: -77.0365 },
  });

  assert.equal(quality.status, "outside_country_bounds");
  assert.equal(quality.exposeOnMap, false);
});

test("assessCoordinateQuality blocks southern Atlantic coordinates inside the broad Argentina bounds", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-CONTRACT-OCEAN-DUPLICATE",
    countryCode: "AR",
    coordinates: { lat: -54.31232, lon: -54.642749 },
  });

  assert.equal(quality.status, "known_bad_geometry");
  assert.equal(quality.exposeOnMap, false);
  assert.match(quality.summary, /control de calidad/i);
});

test("assessCoordinateQuality blocks the Rio de la Plata signage coordinate", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-46-0028-OBR21",
    countryCode: "AR",
    coordinates: { lat: -34.392726, lon: -58.312183 },
  });

  assert.equal(quality.status, "known_bad_geometry");
  assert.equal(quality.exposeOnMap, false);
  assert.match(quality.summary, /control de calidad/i);
});

test("assessCoordinateQuality keeps checked coastal urban coordinates map-safe", () => {
  const quality = assessCoordinateQuality({
    caseId: "AR-WORK-LA-PLATA-COASTAL-CHECK",
    countryCode: "AR",
    coordinates: { lat: -34.920494, lon: -57.953565 },
  });

  assert.equal(quality.status, "valid_official_geometry");
  assert.equal(quality.exposeOnMap, true);
});

test("assessCoordinateQuality reports unsupported countries distinctly", () => {
  const quality = assessCoordinateQuality({
    caseId: "UY-TENDER-VALID-LOOKING",
    countryCode: "UY",
    coordinates: { lat: -34.9, lon: -56.2 },
  });

  assert.equal(quality.status, "unsupported_country");
  assert.equal(quality.exposeOnMap, false);
  assert.deepEqual(quality.reasons, ["unsupported_country"]);
  assert.deepEqual(quality.coordinates, { lat: -34.9, lon: -56.2 });
});

test("hasValidOfficialGeometry is true only for validated official geometry", () => {
  assert.equal(hasValidOfficialGeometry({
    caseId: "AR-WORK-VALID",
    countryCode: "AR",
    coordinates: { lat: -34.609296, lon: -58.390555 },
  }), true);

  assert.equal(hasValidOfficialGeometry({
    caseId: "AR-WORK-ZERO",
    countryCode: "AR",
    coordinates: { lat: 0, lon: 0 },
  }), false);
});
