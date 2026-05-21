import test from "node:test";
import assert from "node:assert/strict";

import { resolveSupplierIdentity } from "../src/lib/data/entityResolution.ts";

test("resolveSupplierIdentity uses document keys when available", () => {
  const identity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "WARLET S.A.",
    supplierDocument: "30-70043585-3",
  });

  assert.deepEqual(identity, {
    key: "supplier:AR:doc:30700435853",
    method: "document",
    confidence: "high",
    label: "WARLET S.A. / 30-70043585-3",
    document: "30700435853",
    normalizedName: "WARLET S A",
    aliasKey: "WARLET",
  });
});

test("resolveSupplierIdentity falls back to normalized name with lower confidence", () => {
  const identity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Obras del Sur S.R.L.",
    supplierDocument: null,
  });

  assert.equal(identity?.key, "supplier:AR:name:OBRAS DEL SUR");
  assert.equal(identity?.method, "normalized_name");
  assert.equal(identity?.confidence, "low");
  assert.equal(identity?.aliasKey, "OBRAS DEL SUR");
});

test("resolveSupplierIdentity keeps document and name keys separated", () => {
  const documentIdentity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Proveedor Regional SA",
    supplierDocument: "123",
  });
  const nameIdentity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Proveedor Regional SA",
    supplierDocument: null,
  });

  assert.notEqual(documentIdentity?.key, nameIdentity?.key);
});

test("resolveSupplierIdentity preserves alphanumeric verifier digits", () => {
  const identity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Proveedor Documento K SA",
    supplierDocument: "12.975.530-k",
  });

  assert.equal(identity?.key, "supplier:AR:doc:12975530K");
  assert.equal(identity?.document, "12975530K");
  assert.equal(identity?.confidence, "high");
});

test("resolveSupplierIdentity preserves alphanumeric official documents", () => {
  const identity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Proveedor extranjero",
    supplierDocument: "L0606465503",
  });

  assert.equal(identity?.key, "supplier:AR:doc:L0606465503");
  assert.equal(identity?.document, "L0606465503");
  assert.equal(identity?.confidence, "high");
});

test("resolveSupplierIdentity ignores document strings without digits", () => {
  const identity = resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: "Proveedor sin documento",
    supplierDocument: "N/A",
  });

  assert.equal(identity?.key, "supplier:AR:name:PROVEEDOR SIN DOCUMENTO");
  assert.equal(identity?.method, "normalized_name");
  assert.equal(identity?.confidence, "low");
});

test("resolveSupplierIdentity returns null when supplier data is missing", () => {
  assert.equal(resolveSupplierIdentity({
    countryCode: "AR",
    supplierName: null,
    supplierDocument: null,
  }), null);
});
