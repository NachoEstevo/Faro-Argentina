import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminCentroidGeoEvidence,
  findChileCommuneCentroid,
  findPeruDistrictCentroid,
  normalizeAdminName,
  type AdminCentroidRecord,
} from "../src/lib/data/geoEvidence.ts";

const peruCentroids: AdminCentroidRecord[] = [
  {
    countryCode: "PE",
    code: "010202",
    region: "AMAZONAS",
    province: "BAGUA",
    district: "LA PECA",
    coordinates: { lat: -5.613, lon: -78.434 },
    sourceId: "PE-IDEP-LIMITE-DISTRITAL",
  },
];

const chileCentroids: AdminCentroidRecord[] = [
  {
    countryCode: "CL",
    code: "04101",
    region: "Región de Coquimbo",
    province: "Elqui",
    commune: "La Serena",
    coordinates: { lat: -29.9, lon: -71.25 },
    sourceId: "CL-CIREN-LIMITE-COMUNAL",
  },
];

test("normalizeAdminName supports accent-insensitive administrative matching", () => {
  assert.equal(normalizeAdminName("Región de Coquimbo "), "region de coquimbo");
  assert.equal(normalizeAdminName("LA  PECA"), "la peca");
});

test("findPeruDistrictCentroid matches official district/province/department text", () => {
  const centroid = findPeruDistrictCentroid(peruCentroids, {
    department: "Amazonas",
    province: "Bagua",
    district: "La Peca",
  });

  assert.equal(centroid?.code, "010202");
});

test("findChileCommuneCentroid matches official commune and region text", () => {
  const centroid = findChileCommuneCentroid(chileCentroids, {
    region: "Region de Coquimbo",
    commune: "La Serena",
  });

  assert.equal(centroid?.code, "04101");
});

test("buildAdminCentroidGeoEvidence marks administrative centroids as non-satellite evidence", () => {
  const evidence = buildAdminCentroidGeoEvidence({
    countryCode: "PE",
    centroid: peruCentroids[0],
    label: "La Peca / Bagua / Amazonas",
    sourceField: "tender.description",
    method: "official_admin_catalog_match",
  });

  assert.equal(evidence.precision, "official_admin_centroid");
  assert.equal(evidence.granularity, "district");
  assert.equal(evidence.exposeOnMap, true);
  assert.equal(evidence.satelliteEligible, false);
  assert.deepEqual(evidence.coordinates, { lat: -5.613, lon: -78.434 });
  assert.match(evidence.caveat, /centroide administrativo/i);
});
