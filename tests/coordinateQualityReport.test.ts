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
      id: "PE-VALID",
      countryCode: "PE",
      title: "Valid Peru case",
      coordinates: { lat: -12.046374, lon: -77.042793 },
      geoEvidence: [
        {
          exposeOnMap: true,
        },
      ],
    },
    {
      id: "CL-OUTSIDE",
      countryCode: "CL",
      title: "Chile outside bounds",
      coordinates: { lat: 38.8977, lon: -77.0365 },
    },
  ]);

  assert.equal(report.totalCases, 4);
  assert.equal(report.mapEligibleCases, 2);
  assert.match(report.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(report.byCountry.AR, {
    totalCases: 2,
    mapEligibleCases: 1,
    geoEvidenceCases: 0,
    byStatus: {
      valid_official_geometry: 1,
      missing_geometry: 1,
    },
  });
  assert.deepEqual(report.byCountry.PE, {
    totalCases: 1,
    mapEligibleCases: 1,
    geoEvidenceCases: 1,
    byStatus: {
      valid_official_geometry: 1,
    },
  });
  assert.deepEqual(report.byCountry.CL, {
    totalCases: 1,
    mapEligibleCases: 0,
    geoEvidenceCases: 0,
    byStatus: {
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
