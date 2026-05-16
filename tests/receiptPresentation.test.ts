import test from "node:test";
import assert from "node:assert/strict";

import { describeReceiptLocator } from "../src/lib/data/evidenceReceipts.ts";

test("describeReceiptLocator explains official detail receipts", () => {
  assert.deepEqual(describeReceiptLocator("official_detail"), {
    locatorType: "official_detail",
    label: "Detalle oficial",
    actionLabel: "Abrir registro",
    note: "Link al registro oficial especifico.",
    isDirectRecord: true,
  });
});

test("describeReceiptLocator explains dataset-level receipts honestly", () => {
  assert.deepEqual(describeReceiptLocator("official_dataset"), {
    locatorType: "official_dataset",
    label: "Dataset oficial",
    actionLabel: "Abrir fuente",
    note: "Fuente oficial del dataset; no es un link directo al registro.",
    isDirectRecord: false,
  });
});

test("describeReceiptLocator explains official search receipts", () => {
  assert.deepEqual(describeReceiptLocator("official_search"), {
    locatorType: "official_search",
    label: "Busqueda oficial",
    actionLabel: "Buscar registro",
    note: "Link de busqueda oficial usando el identificador del registro.",
    isDirectRecord: false,
  });
});

test("describeReceiptLocator explains missing locator receipts", () => {
  assert.deepEqual(describeReceiptLocator("missing"), {
    locatorType: "missing",
    label: "Sin URL exacta",
    actionLabel: "Ver receipt",
    note: "Faro conserva el registro y hash, pero no hay URL oficial exacta.",
    isDirectRecord: false,
  });
});
