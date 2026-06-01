import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { GET as GET_ATTACHMENT } from "../src/app/api/admin/aportes/attachment/route.ts";
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

const authEnvKeys = [
  "FARO_ENABLE_TEST_AUTH",
  "FARO_TEST_CLERK_USER_ID",
  "FARO_TEST_CLERK_USER_ROLE",
  "FARO_TEST_CLERK_USER_EMAIL",
  "FARO_TEST_CLERK_USER_NAME",
];
const productDbEnvKeys = ["DATABASE_URL"];

test("GET /api/admin/aportes/attachment requires reviewer access", async () => {
  const env = preserveEnv(authEnvKeys);
  enableInvestigatorAuth();

  try {
    const response = await GET_ATTACHMENT(new Request(
      "http://localhost/api/admin/aportes/attachment?submissionId=APORTE-20260521-FILE001&attachmentId=ATT-001",
    ));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 403);
    assert.equal(payload.error, "reviewer_access_required");
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/admin/aportes/attachment rejects arbitrary object key access", async () => {
  const env = preserveEnv(authEnvKeys);
  enableReviewerAuth();

  try {
    const response = await GET_ATTACHMENT(new Request(
      "http://localhost/api/admin/aportes/attachment?key=submissions/APORTE-20260521-FILE001/ATT-001.webp",
    ));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 400);
    assert.equal(payload.error, "missing_attachment_target");
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/admin/aportes/attachment opens an owned private attachment with no-store headers", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-attachment-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution("APORTE-20260521-FILE001");
    const attachment = stored.contribution.attachments[0];
    const response = await GET_ATTACHMENT(new Request(
      `http://localhost/api/admin/aportes/attachment?submissionId=${stored.contribution.id}&attachmentId=${attachment.id}`,
    ));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.match(response.headers.get("content-disposition") ?? "", /filename="ATT-001.webp"/);
    assert.equal(await response.text(), "fake image");
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/admin/aportes/attachment rejects an attachment id outside the submission manifest", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-attachment-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution("APORTE-20260521-FILE002");
    const response = await GET_ATTACHMENT(new Request(
      `http://localhost/api/admin/aportes/attachment?submissionId=${stored.contribution.id}&attachmentId=ATT-999`,
    ));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 404);
    assert.equal(payload.error, "attachment_not_found");
  } finally {
    restoreEnv(env);
  }
});

async function seedContribution(id: string) {
  return storeContribution({
    id,
    now: new Date("2026-05-21T20:00:00.000Z"),
    draft: {
      type: "add_photo",
      title: "Foto de avance visible",
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
      sizeBytes: 10,
      bytes: new TextEncoder().encode("fake image"),
    }],
  });
}

function preserveEnv(keys: string[]): Map<string, string | undefined> {
  return new Map(keys.map((key) => [key, process.env[key]]));
}

function clearR2Env(): void {
  for (const key of r2EnvKeys) delete process.env[key];
}

function clearProductDbEnv(): void {
  for (const key of productDbEnvKeys) delete process.env[key];
}

function enableReviewerAuth(): void {
  process.env.FARO_ENABLE_TEST_AUTH = "1";
  process.env.FARO_TEST_CLERK_USER_ID = "user_reviewer";
  process.env.FARO_TEST_CLERK_USER_ROLE = "reviewer";
  process.env.FARO_TEST_CLERK_USER_EMAIL = "reviewer@example.com";
  process.env.FARO_TEST_CLERK_USER_NAME = "Reviewer Faro";
}

function enableInvestigatorAuth(): void {
  process.env.FARO_ENABLE_TEST_AUTH = "1";
  process.env.FARO_TEST_CLERK_USER_ID = "user_investigator";
  process.env.FARO_TEST_CLERK_USER_ROLE = "investigator";
  process.env.FARO_TEST_CLERK_USER_EMAIL = "investigator@example.com";
  process.env.FARO_TEST_CLERK_USER_NAME = "Investigadora Faro";
}

function restoreEnv(env: Map<string, string | undefined>): void {
  for (const [key, value] of env) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
