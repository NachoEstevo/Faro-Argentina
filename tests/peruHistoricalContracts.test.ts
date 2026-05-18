import test from "node:test";
import assert from "node:assert/strict";

import {
  selectPeruHistoricalContracts,
  type PeruHistoricalYearRows,
} from "../src/lib/data/peruHistoricalContracts.ts";

const completeRow = {
  codigoentidad: "010001",
  codigoconvocatoria: "900001",
  descripcion_proceso: "MEJORAMIENTO DE CAMINO VECINAL EN EL DISTRITO DE LA PECA, PROVINCIA DE BAGUA, AMAZONAS",
  n_cod_contrato: "1001",
  codigo_contrato: "1001",
  num_contrato: "CONTRATO N 001",
  num_item: "1",
  monto_contratado_total: "1000000",
  monto_contratado_item: "1000000",
  moneda: "Soles",
  ruc_contratista: "20111111111",
  ruc_destinatario_pago: "20111111111",
  urlcontrato: "https://prodapp2.seace.gob.pe/contract.pdf",
  fecha_publicacion_contrato: "2018-04-01",
  fecha_suscripcion_contrato: "2018-04-02",
};

test("selectPeruHistoricalContracts returns high value complete rows for each requested year", () => {
  const rowsByYear: PeruHistoricalYearRows[] = [
    {
      year: 2018,
      fetchUrl: "https://official/2018.xlsx",
      fileHash: "sha256-2018",
      rowCount: 3,
      rows: [
        { ...completeRow, codigo_contrato: "LOW", monto_contratado_total: "200000" },
        { ...completeRow, codigo_contrato: "HIGH", monto_contratado_total: "900000" },
        { ...completeRow, codigo_contrato: "MID", monto_contratado_total: "500000" },
      ],
    },
    {
      year: 2019,
      fetchUrl: "https://official/2019.xlsx",
      fileHash: "sha256-2019",
      rowCount: 2,
      rows: [
        {
          ...completeRow,
          codigo_contrato: "NEXT",
          codigoconvocatoria: "900002",
          fecha_publicacion_contrato: "2019-01-02",
          fecha_suscripcion_contrato: "2019-01-03",
          monto_contratado_total: "700000",
        },
      ],
    },
  ];

  const selected = selectPeruHistoricalContracts(rowsByYear, {
    years: [2018, 2019],
    perYear: 1,
    minimumAmountPen: 100_000,
  });

  assert.deepEqual(selected.map((item) => `${item.sourceYear}:${item.row.codigo_contrato}`), [
    "2018:HIGH",
    "2019:NEXT",
  ]);
  assert.equal(selected[0]?.rank, 1);
  assert.equal(selected[0]?.reasons.includes("high_value_per_year"), true);
  assert.equal(selected[0]?.reasons.includes("official_contract_url"), true);
});

test("selectPeruHistoricalContracts rejects incomplete or mismatched rows", () => {
  const rowsByYear: PeruHistoricalYearRows[] = [
    {
      year: 2018,
      fetchUrl: "https://official/2018.xlsx",
      fileHash: "sha256-2018",
      rowCount: 7,
      rows: [
        { ...completeRow, codigo_contrato: "", monto_contratado_total: "990000" },
        { ...completeRow, codigo_contrato: "NO-TENDER", codigoconvocatoria: "", monto_contratado_total: "980000" },
        { ...completeRow, codigo_contrato: "NO-RUC", ruc_contratista: "", monto_contratado_total: "970000" },
        { ...completeRow, codigo_contrato: "NO-URL", urlcontrato: "", monto_contratado_total: "960000" },
        { ...completeRow, codigo_contrato: "NO-AMOUNT", monto_contratado_total: "", monto_contratado_item: "" },
        {
          ...completeRow,
          codigo_contrato: "WRONG-YEAR",
          fecha_publicacion_contrato: "2019-01-02",
          fecha_suscripcion_contrato: "2019-01-03",
          monto_contratado_total: "950000",
        },
        { ...completeRow, codigo_contrato: "VALID", monto_contratado_total: "940000" },
      ],
    },
  ];

  const selected = selectPeruHistoricalContracts(rowsByYear, {
    years: [2018],
    perYear: 3,
    minimumAmountPen: 100_000,
  });

  assert.deepEqual(selected.map((item) => item.row.codigo_contrato), ["VALID"]);
});

test("selectPeruHistoricalContracts deduplicates repeated contract item IDs before ranking", () => {
  const selected = selectPeruHistoricalContracts([
    {
      year: 2020,
      fetchUrl: "https://official/2020.xlsx",
      fileHash: "sha256-2020",
      rowCount: 3,
      rows: [
        {
          ...completeRow,
          codigo_contrato: "DUP",
          fecha_publicacion_contrato: "2020-01-02",
          fecha_suscripcion_contrato: "2020-01-03",
          monto_contratado_total: "900000",
        },
        {
          ...completeRow,
          codigo_contrato: "DUP",
          fecha_publicacion_contrato: "2020-01-02",
          fecha_suscripcion_contrato: "2020-01-03",
          monto_contratado_total: "800000",
        },
        {
          ...completeRow,
          codigo_contrato: "UNIQUE",
          fecha_publicacion_contrato: "2020-01-02",
          fecha_suscripcion_contrato: "2020-01-03",
          monto_contratado_total: "700000",
        },
      ],
    },
  ], {
    years: [2020],
    perYear: 2,
    minimumAmountPen: 100_000,
  });

  assert.deepEqual(selected.map((item) => item.row.codigo_contrato), ["DUP", "UNIQUE"]);
});
