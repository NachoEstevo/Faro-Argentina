import test from "node:test";
import assert from "node:assert/strict";

import {
  profileCsvSnapshot,
  profileJsonSnapshot,
} from "../src/lib/data/snapshots.ts";

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

test("profileJsonSnapshot computes hash, keys and nested record count", () => {
  const json = JSON.stringify({
    sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
    details: [{ id: "a" }, { id: "b" }],
  });

  const profile = profileJsonSnapshot({
    sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
    rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
    text: json,
    recordPath: ["details"],
  });

  assert.equal(profile.sourceId, "AR-CONTRATAR-PROCEDIMIENTOS");
  assert.match(profile.fileHash, /^sha256-/);
  assert.equal(profile.topLevelType, "object");
  assert.deepEqual(profile.keys, ["sourceId", "details"]);
  assert.equal(profile.recordCount, 2);
});
