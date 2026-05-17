import test from "node:test";
import assert from "node:assert/strict";

import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";

test("resolveDataBuildTimestamp prefers explicit env timestamp", () => {
  assert.equal(
    resolveDataBuildTimestamp({
      envTimestamp: "2026-05-17T12:30:00.000Z",
      manifestTimestamp: "2026-05-16T06:58:58.684Z",
    }),
    "2026-05-17T12:30:00.000Z",
  );
});

test("resolveDataBuildTimestamp falls back to manifest timestamp", () => {
  assert.equal(
    resolveDataBuildTimestamp({
      envTimestamp: undefined,
      manifestTimestamp: "2026-05-16T06:58:58.684Z",
    }),
    "2026-05-16T06:58:58.684Z",
  );
});

test("resolveDataBuildTimestamp rejects invalid explicit timestamp", () => {
  assert.throws(
    () => resolveDataBuildTimestamp({
      envTimestamp: "not-a-date",
      manifestTimestamp: "2026-05-16T06:58:58.684Z",
    }),
    /Invalid FARO_DATA_BUILD_TIMESTAMP/,
  );
});

test("resolveDataBuildTimestamp rejects missing deterministic inputs", () => {
  assert.throws(
    () => resolveDataBuildTimestamp({
      envTimestamp: undefined,
      manifestTimestamp: undefined,
    }),
    /missing snapshot manifest timestamp/,
  );
});
