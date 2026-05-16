import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  inferXlsxRowCount,
  profileXlsxSnapshot,
  readXlsxRows,
} from "../src/lib/data/xlsx.ts";

const contractsPath = new URL("../data/official/pe/oece-contratos-2025.xlsx", import.meta.url);

test("readXlsxRows reads the official OECE contracts workbook without xlsx dependency", async () => {
  const buffer = await readFile(contractsPath);
  const sheet = readXlsxRows(buffer, { limit: 2 });

  assert.equal(sheet.sheetPath, "xl/worksheets/sheet1.xml");
  assert.equal(inferXlsxRowCount(sheet.dimension), 63234);
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[0]?.codigoentidad, "010373");
  assert.equal(sheet.rows[0]?.ruc_contratista, "20487924050");
  assert.match(sheet.rows[0]?.descripcion_proceso ?? "", /CONTRATACION DEL SERVICIO/);
});

test("profileXlsxSnapshot captures OECE schema and hash", async () => {
  const buffer = await readFile(contractsPath);
  const profile = profileXlsxSnapshot({
    sourceId: "PE-OECE-CONTRATOS",
    rawPath: "data/official/pe/oece-contratos-2025.xlsx",
    buffer,
  });

  assert.equal(profile.rowCount, 63234);
  assert.match(profile.fileHash, /^sha256-/);
  assert.equal(profile.columns.includes("codigoentidad"), true);
  assert.equal(profile.columns.includes("ruc_contratista"), true);
  assert.equal(profile.columns.includes("monto_contratado_total"), true);
});
