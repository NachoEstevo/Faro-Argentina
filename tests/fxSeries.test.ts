import test from "node:test";
import assert from "node:assert/strict";

import { parseFxCsv, type FxSeriesProfile } from "../src/lib/data/fxSeries.ts";

const arProfile: FxSeriesProfile = {
  currency: "ARS",
  dateColumn: "indice_tiempo",
  rateColumn: "tipo_cambio_a_3500_mayorista_referencia_compra_pesos_por_dolar",
  dateFormat: "iso",
  delimiter: ",",
  sourceMeta: {
    sourceId: "ar-bcra-com-a3500",
    sourceName: "BCRA Comunicacion A 3500",
    sourceUrl: "https://example.test/ar.csv",
    snapshotHash: "sha256-stub",
  },
};

test("parseFxCsv reads iso-date rows into a series map", () => {
  const csv = [
    "indice_tiempo,tipo_cambio_a_3500_mayorista_referencia_compra_pesos_por_dolar",
    "2018-03-14,20.4",
    "2018-04-01,20.6",
  ].join("\n");

  const series = parseFxCsv(csv, arProfile);

  assert.equal(series.size, 2);
  assert.equal(series.get("2018-03-14")?.rate, 20.4);
  assert.equal(series.get("2018-04-01")?.rate, 20.6);
  assert.equal(series.get("2018-03-14")?.sourceMeta.sourceId, "ar-bcra-com-a3500");
});

test("parseFxCsv parses dd/MM/yyyy date format", () => {
  const profile: FxSeriesProfile = { ...arProfile, dateFormat: "dd/MM/yyyy" };
  const csv = [
    "indice_tiempo,tipo_cambio_a_3500_mayorista_referencia_compra_pesos_por_dolar",
    "14/03/2018,20.4",
  ].join("\n");

  const series = parseFxCsv(csv, profile);

  assert.equal(series.get("2018-03-14")?.rate, 20.4);
});

test("parseFxCsv skips rows with empty or invalid rate", () => {
  const csv = [
    "indice_tiempo,tipo_cambio_a_3500_mayorista_referencia_compra_pesos_por_dolar",
    "2018-03-14,",
    "2018-03-15,not-a-number",
    "2018-03-16,20.5",
  ].join("\n");

  const series = parseFxCsv(csv, arProfile);

  assert.equal(series.size, 1);
  assert.equal(series.get("2018-03-16")?.rate, 20.5);
});

test("parseFxCsv supports semicolon delimiter and decimal comma", () => {
  const profile: FxSeriesProfile = { ...arProfile, delimiter: ";" };
  const csv = [
    "indice_tiempo;tipo_cambio_a_3500_mayorista_referencia_compra_pesos_por_dolar",
    "2018-03-14;20,4",
  ].join("\n");

  const series = parseFxCsv(csv, profile);
  assert.equal(series.get("2018-03-14")?.rate, 20.4);
});

test("parseFxCsv throws when required columns are missing", () => {
  const csv = ["unrelated,columns", "x,y"].join("\n");
  assert.throws(() => parseFxCsv(csv, arProfile), /missing required columns/);
});
