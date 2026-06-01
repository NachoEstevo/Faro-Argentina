import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRelationProvenance,
  buildSupplierRelationProvenance,
  inferCaseRelationProvenance,
} from "../src/lib/data/relationProvenance.ts";

test("buildSupplierRelationProvenance gives exact CUIT higher confidence than normalized names", () => {
  const cuit = buildSupplierRelationProvenance({
    key: "supplier:AR:doc:30700435853",
    method: "document",
    confidence: "high",
    label: "WARLET S.A. / 30-70043585-3",
    document: "30700435853",
    normalizedName: "WARLET S A",
    aliasKey: "WARLET",
  });
  const normalizedName = buildSupplierRelationProvenance({
    key: "supplier:AR:name:OBRAS DEL SUR",
    method: "normalized_name",
    confidence: "low",
    label: "Obras del Sur S.R.L.",
    document: null,
    normalizedName: "OBRAS DEL SUR S R L",
    aliasKey: "OBRAS DEL SUR",
  });

  assert.equal(cuit.label, "CUIT exacto");
  assert.equal(cuit.confidence, "high");
  assert.equal(normalizedName.label, "Nombre normalizado");
  assert.equal(normalizedName.confidence, "low");
  assert.notEqual(cuit.confidence, normalizedName.confidence);
});

test("relation provenance caveats do not overclaim wrongdoing or proven relationships", () => {
  const provenances = [
    buildRelationProvenance("exact_cuit"),
    buildRelationProvenance("same_agency"),
    buildRelationProvenance("same_work_number"),
    buildRelationProvenance("normalized_name"),
    buildRelationProvenance("judicial_context"),
    buildRelationProvenance("user_suggested"),
  ];

  assert.deepEqual(provenances.map((item) => item.label), [
    "CUIT exacto",
    "Mismo organismo",
    "Mismo numero de obra",
    "Nombre normalizado",
    "Fuente judicial contextual",
    "Sugerido por usuario",
  ]);
  assert.doesNotMatch(
    provenances.map((item) => `${item.label} ${item.caveat}`).join("\n"),
    /corrup|fraude|delito|culpable|robo|irregularidad probada|relacion probada/i,
  );
});

test("inferCaseRelationProvenance prefers exact CUIT before normalized supplier names", () => {
  const exactCuit = inferCaseRelationProvenance(
    {
      countryCode: "AR",
      supplierName: "WARLET S.A.",
      supplierDocument: "30-70043585-3",
      agencyName: "Ministerio de Obras Publicas",
      workNumber: "OBRA-123",
      caseType: "contract",
    },
    {
      countryCode: "AR",
      supplierName: "WARLET SA",
      supplierDocument: "30700435853",
      agencyName: "Ministerio de Obras Publicas",
      workNumber: "OBRA-123",
      caseType: "contract",
    },
  );
  const normalizedName = inferCaseRelationProvenance(
    {
      countryCode: "AR",
      supplierName: "Obras del Sur S.R.L.",
      supplierDocument: null,
      agencyName: "Ministerio de Obras Publicas",
      workNumber: null,
      caseType: "contract",
    },
    {
      countryCode: "AR",
      supplierName: "OBRAS DEL SUR SA",
      supplierDocument: null,
      agencyName: "Otra Agencia",
      workNumber: null,
      caseType: "contract",
    },
  );

  assert.equal(exactCuit[0]?.label, "CUIT exacto");
  assert.equal(exactCuit[0]?.confidence, "high");
  assert.equal(normalizedName[0]?.label, "Nombre normalizado");
  assert.equal(normalizedName[0]?.confidence, "low");
});

test("inferCaseRelationProvenance does not create a relation only from judicial context", () => {
  const provenances = inferCaseRelationProvenance(
    {
      countryCode: "AR",
      supplierName: "Proveedor Norte",
      supplierDocument: "30-11111111-1",
      agencyName: "Organismo A",
      workNumber: "OBRA-1",
      caseType: "judicial_context",
    },
    {
      countryCode: "AR",
      supplierName: "Proveedor Sur",
      supplierDocument: "30-22222222-2",
      agencyName: "Organismo B",
      workNumber: "OBRA-2",
      caseType: "contract",
    },
  );

  assert.deepEqual(provenances, []);
});
