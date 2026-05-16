import test from "node:test";
import assert from "node:assert/strict";

import { profileCsvSnapshot } from "../src/lib/data/snapshots.ts";

const csv = [
  "numero_obra,nombre_obra,latitud_1,longitud_1",
  "81-0009-OBR18,Palacio,-34.585722,-58.389361",
  "74-0011-OBR18,Camino,,",
].join("\n");

test("profileCsvSnapshot computes hash, row count and schema profile", () => {
  const profile = profileCsvSnapshot({
    sourceId: "AR-CONTRATAR-OBRAS",
    rawPath: "data/official/ar/onc-contratar-obras.csv",
    text: csv,
    keyColumns: ["numero_obra", "latitud_1", "longitud_1"],
  });

  assert.equal(profile.sourceId, "AR-CONTRATAR-OBRAS");
  assert.match(profile.fileHash, /^sha256-/);
  assert.equal(profile.byteSize, Buffer.byteLength(csv, "utf8"));
  assert.equal(profile.rowCount, 2);
  assert.deepEqual(profile.columns, ["numero_obra", "nombre_obra", "latitud_1", "longitud_1"]);
  assert.equal(profile.keyColumnProfiles.numero_obra.emptyCount, 0);
  assert.equal(profile.keyColumnProfiles.latitud_1.emptyCount, 1);
  assert.equal(profile.keyColumnProfiles.latitud_1.emptyRatio, 0.5);
});
