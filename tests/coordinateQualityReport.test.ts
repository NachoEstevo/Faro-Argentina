import test from "node:test";
import assert from "node:assert/strict";

import { buildCoordinateQualityReport } from "../src/lib/data/coordinateQualityReport.ts";

test("buildCoordinateQualityReport counts statuses by country", () => {
  const report = buildCoordinateQualityReport([
    {
      id: "AR-VALID",
      countryCode: "AR",
      title: "Valid Argentina case",
      coordinates: { lat: -34.609296, lon: -58.390555 },
    },
    {
      id: "AR-MISSING",
      countryCode: "AR",
      title: "Missing Argentina geometry",
      coordinates: null,
    },
    {
      id: "AR-ADMIN-REF",
      countryCode: "AR",
      title: "Argentina administrative reference",
      coordinates: { lat: -31.4201, lon: -64.1888 },
      geoEvidence: [
        {
          exposeOnMap: true,
        },
      ],
    },
    {
      id: "AR-OUTSIDE",
      countryCode: "AR",
      title: "Argentina outside bounds",
      coordinates: { lat: 38.8977, lon: -77.0365 },
    },
  ]);

  assert.equal(report.totalCases, 4);
  assert.equal(report.mapEligibleCases, 2);
  assert.match(report.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(report.byCountry.AR, {
    totalCases: 4,
    mapEligibleCases: 2,
    geoEvidenceCases: 1,
    byStatus: {
      valid_official_geometry: 2,
      missing_geometry: 1,
      outside_country_bounds: 1,
    },
  });
  assert.deepEqual(report.duplicateCaseIds, []);
});

test("buildCoordinateQualityReport detects duplicated case ids with mixed geometry", () => {
  const report = buildCoordinateQualityReport([
    {
      id: "AR-DUPLICATED",
      countryCode: "AR",
      title: "Duplicated public work",
      coordinates: { lat: -34.609296, lon: -58.390555 },
    },
    {
      id: "AR-DUPLICATED",
      countryCode: "AR",
      title: "Duplicated public work with missing geometry",
      coordinates: null,
    },
    {
      id: "AR-DUPLICATED",
      countryCode: "AR",
      title: "Duplicated public work with invalid geometry",
      coordinates: { lat: 0, lon: 0 },
    },
    {
      id: "AR-UNIQUE",
      countryCode: "AR",
      title: "Unique public work",
      coordinates: { lat: -34.5, lon: -58.4 },
    },
  ]);

  assert.deepEqual(report.duplicateCaseIds, [
    {
      caseId: "AR-DUPLICATED",
      countryCode: "AR",
      title: "Duplicated public work",
      count: 3,
      statuses: [
        "valid_official_geometry",
        "missing_geometry",
        "placeholder_geometry",
      ],
    },
  ]);
});
