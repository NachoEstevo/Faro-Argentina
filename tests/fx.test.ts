import test from "node:test";
import assert from "node:assert/strict";

import { convertAmountToUsd, type FxSeries, type FxSeriesRegistry } from "../src/lib/data/fx.ts";

const emptyRegistry: FxSeriesRegistry = new Map();

test("convertAmountToUsd returns already_usd when currency is USD", () => {
  const result = convertAmountToUsd({
    amount: 1000,
    currency: "USD",
    anchorCandidates: [{ field: "contract_signed", date: "2020-01-15" }],
    series: emptyRegistry,
  });

  assert.equal(result.conversion, null);
  assert.equal(result.note, "already_usd");
});

test("convertAmountToUsd returns currency_not_supported for unknown currency with no series", () => {
  const result = convertAmountToUsd({
    amount: 1000,
    currency: "BRL",
    anchorCandidates: [{ field: "contract_signed", date: "2020-01-15" }],
    series: emptyRegistry,
  });

  assert.equal(result.conversion, null);
  assert.equal(result.note, "currency_not_supported");
});

test("convertAmountToUsd returns no_anchor_date when every candidate has null date", () => {
  const arsSeries: FxSeries = new Map([
    ["2020-01-15", { rate: 60, sourceMeta: stubSourceMeta() }],
  ]);
  const registry: FxSeriesRegistry = new Map([["ARS", arsSeries]]);

  const result = convertAmountToUsd({
    amount: 1000,
    currency: "ARS",
    anchorCandidates: [
      { field: "contract_signed", date: null },
      { field: "opening", date: null },
      { field: "published", date: null },
      { field: "year", date: null },
    ],
    series: registry,
  });

  assert.equal(result.conversion, null);
  assert.equal(result.note, "no_anchor_date");
});

test("convertAmountToUsd uses the first cascade candidate when its date has FX", () => {
  const arsSeries: FxSeries = new Map([
    ["2018-03-14", { rate: 20.4, sourceMeta: stubSourceMeta() }],
    ["2018-04-01", { rate: 20.6, sourceMeta: stubSourceMeta() }],
  ]);
  const registry: FxSeriesRegistry = new Map([["ARS", arsSeries]]);

  const result = convertAmountToUsd({
    amount: 1_234_567,
    currency: "ARS",
    anchorCandidates: [
      { field: "contract_signed", date: "2018-03-14" },
      { field: "opening", date: "2018-04-01" },
      { field: "published", date: null },
      { field: "year", date: "2018-01-01" },
    ],
    series: registry,
  });

  assert.ok(result.conversion, "expected a conversion to be returned");
  assert.equal(result.conversion!.fxRate, 20.4);
  assert.equal(result.conversion!.fxDate, "2018-03-14");
  assert.equal(result.conversion!.anchorDate, "2018-03-14");
  assert.equal(result.conversion!.anchorField, "contract_signed");
  assert.equal(result.conversion!.fxSource.sourceId, "ar-bcra-com-a3500");
  assert.equal(result.note, undefined);
});

function stubSourceMeta() {
  return {
    sourceId: "ar-bcra-com-a3500",
    sourceName: "BCRA Comunicacion A 3500",
    sourceUrl: "https://example.test/fx",
    snapshotHash: "sha256-stub",
  };
}
