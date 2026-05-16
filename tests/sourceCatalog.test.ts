import test from "node:test";
import assert from "node:assert/strict";

import catalog from "../data/sources/source-catalog.json" with { type: "json" };
import {
  getMvpSourcesByCountry,
  validateSourceCatalog,
  type SourceCatalogEntry,
} from "../src/lib/data/sourceCatalog.ts";

test("source catalog covers the first three Faro countries with official MVP sources", () => {
  const report = validateSourceCatalog(catalog as SourceCatalogEntry[]);

  assert.deepEqual(report.errors, []);
  assert.equal(report.totalSources >= 6, true);
  assert.deepEqual(Object.keys(report.sourcesByCountry).sort(), ["AR", "CL", "PE"]);
  assert.equal(getMvpSourcesByCountry(catalog as SourceCatalogEntry[], "AR").length >= 2, true);
  assert.equal(getMvpSourcesByCountry(catalog as SourceCatalogEntry[], "PE").length >= 1, true);
  assert.equal(getMvpSourcesByCountry(catalog as SourceCatalogEntry[], "CL").length >= 1, true);
});

test("source catalog validation rejects duplicate ids and non-official sources", () => {
  const badCatalog = [
    catalog[0],
    { ...catalog[0] },
    { ...(catalog[1] as SourceCatalogEntry), sourceId: "BAD-01", official: false },
  ] as SourceCatalogEntry[];

  const report = validateSourceCatalog(badCatalog);

  assert.match(report.errors.join("\n"), /Duplicate sourceId/);
  assert.match(report.errors.join("\n"), /must be official/);
});
