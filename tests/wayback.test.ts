import test from "node:test";
import assert from "node:assert/strict";

import {
  mapConfigRawToReleases,
  pickYearlyReleases,
  tileUrlForRelease,
} from "../src/lib/data/wayback.ts";

test("pickYearlyReleases keeps the most recent snapshot date per year", () => {
  const releases = [
    { releaseId: 49059, releaseDate: "2026-04-30", releaseLabel: "World Imagery (Wayback 2026-04-30)", year: 2026 },
    { releaseId: 22869, releaseDate: "2026-03-26", releaseLabel: "World Imagery (Wayback 2026-03-26)", year: 2026 },
    { releaseId: 64001, releaseDate: "2026-02-26", releaseLabel: "World Imagery (Wayback 2026-02-26)", year: 2026 },
    { releaseId: 58924, releaseDate: "2025-09-25", releaseLabel: "World Imagery (Wayback 2025-09-25)", year: 2025 },
    { releaseId: 52304, releaseDate: "2025-09-04", releaseLabel: "World Imagery (Wayback 2025-09-04)", year: 2025 },
  ];

  const yearly = pickYearlyReleases(releases);

  assert.equal(yearly.length, 2);
  const year2026 = yearly.find((release) => release.year === 2026);
  assert.equal(year2026!.releaseId, 49059, "2026 bucket should be the latest snapshot date, not the highest releaseId");

  const year2025 = yearly.find((release) => release.year === 2025);
  assert.equal(year2025!.releaseId, 58924);
});

test("pickYearlyReleases sorts buckets ascending by year", () => {
  const releases = [
    { releaseId: 70000, releaseDate: "2026-01-01", releaseLabel: "x", year: 2026 },
    { releaseId: 10000, releaseDate: "2014-02-20", releaseLabel: "x", year: 2014 },
    { releaseId: 50000, releaseDate: "2020-06-10", releaseLabel: "x", year: 2020 },
  ];

  const yearly = pickYearlyReleases(releases);

  assert.deepEqual(
    yearly.map((release) => release.year),
    [2014, 2020, 2026],
  );
});

test("mapConfigRawToReleases extracts ISO dates from itemTitle and skips malformed entries", () => {
  const raw = {
    "12345": { itemTitle: "World Imagery (Wayback 2023-08-04)" },
    "67890": { itemTitle: "No date here" },
    "11111": { somethingElse: true },
    "22222": { itemTitle: "World Imagery (Wayback 2022-01-15)" },
  };

  const releases = mapConfigRawToReleases(raw);

  assert.equal(releases.length, 2);
  assert.deepEqual(
    releases.map((release) => ({ releaseId: release.releaseId, releaseDate: release.releaseDate, year: release.year })),
    [
      { releaseId: 22222, releaseDate: "2022-01-15", year: 2022 },
      { releaseId: 12345, releaseDate: "2023-08-04", year: 2023 },
    ],
  );
});

test("tileUrlForRelease emits the WMTS tile template Leaflet expects", () => {
  const url = tileUrlForRelease(52304);
  assert.equal(
    url.startsWith(
      "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/52304/",
    ),
    true,
  );
  assert.match(url, /\/52304\/\{z\}\/\{y\}\/\{x\}/);
});
