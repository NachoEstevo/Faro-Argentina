import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { GET as GET_LINKED } from "../src/app/api/admin/aportes/linked/route.ts";
import { PATCH, POST } from "../src/app/api/admin/aportes/route.ts";
import { storeContribution } from "../src/lib/server/contributionStorage.ts";

const r2EnvKeys = [
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
  "STORAGE_BUCKET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];

test("GET /api/admin/aportes/linked requires private admin access", async () => {
  const env = preserveEnv(["FARO_ADMIN_ACCESS_CODE"]);
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";

  try {
    const response = await GET_LINKED(new Request(
      "http://localhost/api/admin/aportes/linked?targetType=case&targetId=AR-CONTRACT-46-0453-CON22",
    ));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 401);
    assert.equal(payload.error, "admin_access_required");
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/admin/aportes/linked lists private material associated with an expediente", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-linked-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", "FARO_ADMIN_ACCESS_CODE", ...r2EnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  clearR2Env();

  try {
    const linked = await seedContribution("APORTE-20260521-LINKED01", "Foto de avance visible");
    const unrelated = await seedContribution("APORTE-20260521-OTHER001", "Otro material privado");
    await approveAndLink(linked.contribution.id, "AR-CONTRACT-46-0453-CON22");
    await approveAndLink(unrelated.contribution.id, "AR-WORK-81-0009-OBR18");

    const response = await GET_LINKED(new Request(
      "http://localhost/api/admin/aportes/linked?targetType=case&targetId=AR-CONTRACT-46-0453-CON22",
      { headers: { "x-faro-admin-code": "review-code" } },
    ));
    const payload = await response.json() as {
      viewType: string;
      target: { type: string; id: string; label: string };
      contributions: Array<{
        id: string;
        title: string;
        status: string;
        explanation: string;
        contactEmail: string;
        link: { targetId: string; note: string };
        attachments: Array<{ objectKey: string; publicUrl?: string }>;
      }>;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.viewType, "faro_admin_linked_aportes_v1");
    assert.equal(payload.target.type, "case");
    assert.equal(payload.target.id, "AR-CONTRACT-46-0453-CON22");
    assert.ok(payload.target.label.length > 0);
    assert.equal(payload.contributions.length, 1);
    assert.equal(payload.contributions[0]?.id, linked.contribution.id);
    assert.equal(payload.contributions[0]?.status, "approved");
    assert.equal(payload.contributions[0]?.contactEmail, "periodista@example.com");
    assert.equal(payload.contributions[0]?.link.targetId, "AR-CONTRACT-46-0453-CON22");
    assert.equal(payload.contributions[0]?.link.note, "Material privado asociado al expediente.");
    assert.equal(payload.contributions[0]?.attachments[0]?.publicUrl, undefined);
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/admin/aportes/linked rejects unknown expediente targets", async () => {
  const env = preserveEnv(["FARO_ADMIN_ACCESS_CODE"]);
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";

  try {
    const response = await GET_LINKED(new Request(
      "http://localhost/api/admin/aportes/linked?targetType=case&targetId=AR-NO-EXISTE",
      { headers: { "x-faro-admin-code": "review-code" } },
    ));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 404);
    assert.equal(payload.error, "review_target_not_found");
  } finally {
    restoreEnv(env);
  }
});

async function seedContribution(id: string, title: string) {
  return storeContribution({
    id,
    now: new Date("2026-05-21T20:00:00.000Z"),
    draft: {
      type: "add_photo",
      title,
      jurisdiction: "AR",
      explanation: "Material propio para revisar contra fuentes oficiales.",
      relatedCase: "AR-CONTRACT-46-0453-CON22",
      approximateLocation: "Santa Fe",
      contactName: "Periodista",
      contactEmail: "periodista@example.com",
      sourcePermissionConfirmed: true,
      reviewConfirmed: true,
    },
    files: [{
      filename: "avance.webp",
      mimeType: "image/webp",
      sizeBytes: 12,
      bytes: new TextEncoder().encode("fake image"),
    }],
  });
}

async function approveAndLink(submissionId: string, targetId: string): Promise<void> {
  const approveResponse = await PATCH(new Request("http://localhost/api/admin/aportes", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-faro-admin-code": "review-code",
    },
    body: JSON.stringify({
      submissionId,
      status: "approved",
      note: "Revisado para carga privada.",
    }),
  }));
  assert.equal(approveResponse.status, 200);

  const linkResponse = await POST(new Request("http://localhost/api/admin/aportes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-faro-admin-code": "review-code",
    },
    body: JSON.stringify({
      submissionId,
      targetType: "case",
      targetId,
      note: "Material privado asociado al expediente.",
    }),
  }));
  assert.equal(linkResponse.status, 200);
}

function preserveEnv(keys: string[]): Map<string, string | undefined> {
  return new Map(keys.map((key) => [key, process.env[key]]));
}

function clearR2Env(): void {
  for (const key of r2EnvKeys) delete process.env[key];
}

function restoreEnv(env: Map<string, string | undefined>): void {
  for (const [key, value] of env) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
