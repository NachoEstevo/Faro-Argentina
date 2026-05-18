import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChileOcdsListUrl,
  buildChileOcdsRawPath,
  buildChileOcdsSnapshotPlan,
  selectChileOcdsSnapshotFiles,
} from "../src/lib/data/chileOcdsSnapshots.ts";

test("buildChileOcdsSnapshotPlan keeps a small historical sample per year plus the current batch", () => {
  const plan = buildChileOcdsSnapshotPlan({
    currentYear: 2026,
    currentMonth: 1,
    currentLimit: 500,
    historicalYears: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
    historicalLimit: 50,
  });

  assert.deepEqual(
    plan.map((period) => `${period.year}-${period.month}:${period.limit}`),
    [
      "2019-1:50",
      "2020-1:50",
      "2021-1:50",
      "2022-1:50",
      "2023-1:50",
      "2024-1:50",
      "2025-1:50",
      "2026-1:500",
    ],
  );
  assert.equal(
    buildChileOcdsRawPath(plan[0]!),
    "data/official/cl/chilecompra-ocds-procesos-2019-01.sample.json",
  );
  assert.equal(
    buildChileOcdsListUrl(plan[0]!),
    "https://api.mercadopublico.cl/APISOCDS/OCDS/listaOCDSAgnoMes/2019/1/0/50",
  );
});

test("buildChileOcdsSnapshotPlan allows an explicit period override for focused fetches", () => {
  const plan = buildChileOcdsSnapshotPlan({
    override: "2024-03:25, 2021-12",
    currentLimit: 80,
  });

  assert.deepEqual(
    plan.map((period) => `${period.year}-${period.month}:${period.limit}`),
    ["2021-12:80", "2024-3:25"],
  );
});

test("selectChileOcdsSnapshotFiles keeps only ChileCompra OCDS snapshots in chronological order", () => {
  assert.deepEqual(
    selectChileOcdsSnapshotFiles([
      "notes.txt",
      "chilecompra-ocds-procesos-2026-01.sample.json",
      "chilecompra-ocds-procesos-2020-01.sample.json",
      "mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
      "chilecompra-ocds-procesos-2019-12.sample.json",
    ]),
    [
      {
        fileName: "chilecompra-ocds-procesos-2019-12.sample.json",
        rawPath: "data/official/cl/chilecompra-ocds-procesos-2019-12.sample.json",
        year: 2019,
        month: 12,
      },
      {
        fileName: "chilecompra-ocds-procesos-2020-01.sample.json",
        rawPath: "data/official/cl/chilecompra-ocds-procesos-2020-01.sample.json",
        year: 2020,
        month: 1,
      },
      {
        fileName: "chilecompra-ocds-procesos-2026-01.sample.json",
        rawPath: "data/official/cl/chilecompra-ocds-procesos-2026-01.sample.json",
        year: 2026,
        month: 1,
      },
    ],
  );
});
