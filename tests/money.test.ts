import test from "node:test";
import assert from "node:assert/strict";

import { formatAmountWithUsd } from "../src/lib/format/money.ts";

const conversion = {
  usd: 60517.99,
  fxRate: 20.4,
  fxDate: "2018-03-14",
  anchorDate: "2018-03-14",
  anchorField: "contract_signed" as const,
  fxSource: {
    sourceId: "AR-BCRA-COM-A3500",
    sourceName: "BCRA Comunicacion A 3500",
    sourceUrl: "https://example.test/",
    snapshotHash: "sha256-stub",
  },
};

test("formatAmountWithUsd renders local amount and usd equivalent", () => {
  const result = formatAmountWithUsd({
    value: 1_234_567,
    currency: "ARS",
    label: "monto_contrato",
    usdEquivalent: conversion,
  });

  assert.match(result.primary, /ARS/);
  assert.match(result.primary, /1\.234\.567/);
  assert.match(result.usdSegment ?? "", /US\$\s*60\.518/);
  assert.match(result.usdSegment ?? "", /14\/03\/2018/);
  assert.match(result.usdSegment ?? "", /BCRA/);
  assert.equal(result.note, undefined);
});

test("formatAmountWithUsd omits usd segment when conversion is null", () => {
  const result = formatAmountWithUsd({
    value: 1_000,
    currency: "ARS",
    label: "monto_contrato",
    usdEquivalent: null,
    usdConversionNote: "no_fx_for_anchor_dates",
  });

  assert.equal(result.usdSegment, null);
  assert.equal(result.note, "no_fx_for_anchor_dates");
});

test("formatAmountWithUsd hides chip for already_usd cases", () => {
  const result = formatAmountWithUsd({
    value: 5000,
    currency: "USD",
    label: "monto_contrato",
    usdEquivalent: null,
    usdConversionNote: "already_usd",
  });

  assert.match(result.primary, /USD/);
  assert.equal(result.usdSegment, null);
  assert.equal(result.note, "already_usd");
  assert.equal(result.showMissingChip, false);
});

test("formatAmountWithUsd flags missing chip when conversion failed", () => {
  const result = formatAmountWithUsd({
    value: 1000,
    currency: "ARS",
    label: "monto_contrato",
    usdEquivalent: null,
    usdConversionNote: "no_fx_for_anchor_dates",
  });

  assert.equal(result.showMissingChip, true);
});

test("formatAmountWithUsd returns dash for null amount", () => {
  const result = formatAmountWithUsd(null);
  assert.equal(result.primary, "—");
  assert.equal(result.usdSegment, null);
  assert.equal(result.showMissingChip, false);
});
