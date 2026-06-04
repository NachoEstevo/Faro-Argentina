import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSourceCandidatePipeline,
  labelSourceCandidateStatus,
} from "../src/lib/data/sourceCandidatePipeline.ts";

test("source candidate pipeline keeps next data sources as reviewed candidates", () => {
  const pipeline = buildSourceCandidatePipeline();
  const presupuesto = pipeline.candidates.find((candidate) =>
    candidate.id === "ar-presupuesto-abierto-credito-bapin"
  );

  assert.equal(pipeline.viewType, "faro_source_candidate_pipeline_v1");
  assert.equal(pipeline.summary.total, pipeline.candidates.length);
  assert.equal(pipeline.summary.recommendedPrototype, 1);
  assert.equal(presupuesto?.status, "recommended_prototype");
  assert.match(presupuesto?.joinRule ?? "", /BAPIN oficial/);
  assert.match(presupuesto?.caveat ?? "", /No prueba pago a un proveedor/);
  assert.equal(labelSourceCandidateStatus("recommended_prototype"), "Prototipo recomendado");
});

test("source candidate pipeline rejects fuzzy or overclaiming ingestion language", () => {
  const pipeline = buildSourceCandidatePipeline();
  const serialized = JSON.stringify(pipeline);

  assert.match(serialized, /no se aceptan joins por nombres parecidos/i);
  assert.doesNotMatch(serialized, /payment_verified|fraude|corrup|culpable|ranking/i);
});
