import test from "node:test";
import assert from "node:assert/strict";

import { GET } from "../src/app/api/investigations/case-pack/route.ts";

const vialidadCaseId = "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME";

test("GET /api/investigations/case-pack returns expedientes and evidence packs", async () => {
  const response = await GET(new Request(`http://localhost/api/investigations/case-pack?ids=${vialidadCaseId}`));
  const payload = await response.json() as {
    casePacks: Array<{ caseId: string; expediente: { summary: { caseId: string } }; evidencePack: { packType: string } }>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.casePacks.length, 1);
  assert.equal(payload.casePacks[0]?.caseId, vialidadCaseId);
  assert.equal(payload.casePacks[0]?.expediente.summary.caseId, vialidadCaseId);
  assert.equal(payload.casePacks[0]?.evidencePack.packType, "faro_evidence_pack");
});

test("GET /api/investigations/case-pack rejects empty and oversized requests", async () => {
  const emptyResponse = await GET(new Request("http://localhost/api/investigations/case-pack"));
  const emptyPayload = await emptyResponse.json() as { error: string };
  const ids = Array.from({ length: 41 }, (_, index) => `CASE-${index}`).join(",");
  const largeResponse = await GET(new Request(`http://localhost/api/investigations/case-pack?ids=${ids}`));
  const largePayload = await largeResponse.json() as { error: string; limit: number };

  assert.equal(emptyResponse.status, 400);
  assert.equal(emptyPayload.error, "missing_case_ids");
  assert.equal(largeResponse.status, 400);
  assert.equal(largePayload.error, "too_many_case_ids");
  assert.equal(largePayload.limit, 40);
});

test("GET /api/investigations/case-pack reports missing case ids", async () => {
  const response = await GET(new Request(`http://localhost/api/investigations/case-pack?ids=${vialidadCaseId},NOPE`));
  const payload = await response.json() as { error: string; missingCaseIds: string[] };

  assert.equal(response.status, 404);
  assert.equal(payload.error, "case_not_found");
  assert.deepEqual(payload.missingCaseIds, ["NOPE"]);
});
