import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { GET, PATCH, POST } from "../src/app/api/admin/aportes/route.ts";
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

test("GET /api/admin/aportes requires a Clerk reviewer or admin role", async () => {
  const env = preserveEnv(authEnvKeys);
  enableInvestigatorAuth();

  try {
    const response = await GET(new Request("http://localhost/api/admin/aportes"));
    const payload = await response.json() as { error: string; message: string };

    assert.equal(response.status, 403);
    assert.equal(payload.error, "reviewer_access_required");
    assert.doesNotMatch(payload.message, /secret|env|FARO/i);
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/admin/aportes does not accept admin codes in query strings", async () => {
  const env = preserveEnv(["FARO_ADMIN_ACCESS_CODE", ...authEnvKeys]);
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  enableInvestigatorAuth();

  try {
    const response = await GET(new Request("http://localhost/api/admin/aportes?accessCode=review-code"));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 403);
    assert.equal(payload.error, "reviewer_access_required");
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/admin/aportes lists private submissions for review", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", "FARO_ADMIN_ACCESS_CODE", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution();
    const response = await GET(new Request("http://localhost/api/admin/aportes"));
    const payload = await response.json() as {
      inboxType: string;
      storageMode: string;
      stats: { total: number; submitted: number };
      submissions: Array<{
        id: string;
        title: string;
        status: string;
        contactEmail: string;
        attachments: Array<{ objectKey: string; publicUrl?: string }>;
      }>;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.inboxType, "faro_admin_aportes_inbox_v1");
    assert.equal(payload.storageMode, "local");
    assert.equal(payload.stats.total, 1);
    assert.equal(payload.stats.submitted, 1);
    assert.equal(payload.submissions[0]?.id, stored.contribution.id);
    assert.equal(payload.submissions[0]?.title, "Foto de avance visible");
    assert.equal(payload.submissions[0]?.status, "submitted");
    assert.equal(payload.submissions[0]?.contactEmail, "periodista@example.com");
    assert.equal(payload.submissions[0]?.attachments[0]?.publicUrl, undefined);
  } finally {
    restoreEnv(env);
  }
});

test("PATCH /api/admin/aportes updates review status and internal note", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", "FARO_ADMIN_ACCESS_CODE", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution();
    const response = await PATCH(new Request("http://localhost/api/admin/aportes", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        submissionId: stored.contribution.id,
        status: "needs_more_info",
        note: "Pedir fecha exacta y fuente oficial complementaria.",
        reviewerName: "Nombre enviado por cliente",
      }),
    }));
    const payload = await response.json() as {
      contribution: {
        id: string;
        status: string;
        reviewTrail: Array<{ id: string; status: string; note: string; reviewerName: string; createdAt: string }>;
      };
    };

    assert.equal(response.status, 200);
    assert.equal(payload.contribution.id, stored.contribution.id);
    assert.equal(payload.contribution.status, "needs_more_info");
    assert.deepEqual(payload.contribution.reviewTrail.at(-1), {
      id: "REV-001",
      status: "needs_more_info",
      note: "Pedir fecha exacta y fuente oficial complementaria.",
      reviewerName: "Reviewer Faro",
      createdAt: payload.contribution.reviewTrail.at(-1)?.createdAt,
    });

    const storedJson = JSON.parse(
      await readFile(join(storageDir, "submissions", `${stored.contribution.id}.json`), "utf8"),
    );
    assert.equal(storedJson.status, "needs_more_info");
    assert.equal(storedJson.reviewTrail[0].note, "Pedir fecha exacta y fuente oficial complementaria.");
  } finally {
    restoreEnv(env);
  }
});

test("PATCH /api/admin/aportes rejects unknown review states", async () => {
  const env = preserveEnv(["FARO_ADMIN_ACCESS_CODE", ...authEnvKeys]);
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  enableReviewerAuth();

  try {
    const response = await PATCH(new Request("http://localhost/api/admin/aportes", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ submissionId: "APORTE-1", status: "published" }),
    }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 400);
    assert.equal(payload.error, "invalid_review_status");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes links an approved contribution to an existing expediente", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", "FARO_ADMIN_ACCESS_CODE", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution();
    await approveContribution(stored.contribution.id);

    const response = await POST(new Request("http://localhost/api/admin/aportes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        submissionId: stored.contribution.id,
        targetType: "case",
        targetId: "AR-CONTRACT-46-0453-CON22",
        note: "Usar como material privado para revisar avance visible.",
        reviewerName: "Nombre enviado por cliente",
      }),
    }));
    const payload = await response.json() as {
      contribution: {
        status: string;
        reviewLinks: Array<{
          id: string;
          targetType: string;
          targetId: string;
          targetLabel: string;
          note: string;
          linkedBy: string;
          createdAt: string;
        }>;
      };
    };

    assert.equal(response.status, 200);
    assert.equal(payload.contribution.status, "approved");
    assert.deepEqual(payload.contribution.reviewLinks.at(-1), {
      id: "LINK-001",
      targetType: "case",
      targetId: "AR-CONTRACT-46-0453-CON22",
      targetLabel: payload.contribution.reviewLinks.at(-1)?.targetLabel,
      note: "Usar como material privado para revisar avance visible.",
      linkedBy: "Reviewer Faro",
      createdAt: payload.contribution.reviewLinks.at(-1)?.createdAt,
    });
    assert.ok(payload.contribution.reviewLinks[0]?.targetLabel.length > 0);

    const storedJson = JSON.parse(
      await readFile(join(storageDir, "submissions", `${stored.contribution.id}.json`), "utf8"),
    );
    assert.equal(storedJson.reviewLinks[0].targetType, "case");
    assert.equal(storedJson.reviewLinks[0].targetId, "AR-CONTRACT-46-0453-CON22");
    assert.equal(storedJson.attachments[0].publicUrl, undefined);
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes links an approved contribution to an internal folder", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", "FARO_ADMIN_ACCESS_CODE", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution();
    await approveContribution(stored.contribution.id);

    const response = await POST(new Request("http://localhost/api/admin/aportes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        submissionId: stored.contribution.id,
        targetType: "workspace",
        targetId: "lazaro-baez-relaciones",
        targetLabel: "Carpeta Lázaro Báez",
        note: "Agrupar con otros aportes antes de usarlo.",
      }),
    }));
    const payload = await response.json() as {
      contribution: { reviewLinks: Array<{ targetType: string; targetId: string; targetLabel: string }> };
    };

    assert.equal(response.status, 200);
    assert.equal(payload.contribution.reviewLinks[0]?.targetType, "workspace");
    assert.equal(payload.contribution.reviewLinks[0]?.targetId, "lazaro-baez-relaciones");
    assert.equal(payload.contribution.reviewLinks[0]?.targetLabel, "Carpeta Lázaro Báez");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes only links approved private contributions", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", "FARO_ADMIN_ACCESS_CODE", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution();
    const response = await POST(new Request("http://localhost/api/admin/aportes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        submissionId: stored.contribution.id,
        targetType: "case",
        targetId: "AR-CONTRACT-46-0453-CON22",
      }),
    }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 409);
    assert.equal(payload.error, "contribution_not_approved");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes rejects unknown expediente targets", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-admin-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", "FARO_ADMIN_ACCESS_CODE", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  process.env.FARO_ADMIN_ACCESS_CODE = "review-code";
  clearR2Env();
  clearProductDbEnv();
  enableReviewerAuth();

  try {
    const stored = await seedContribution();
    await approveContribution(stored.contribution.id);
    const response = await POST(new Request("http://localhost/api/admin/aportes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        submissionId: stored.contribution.id,
        targetType: "case",
        targetId: "AR-NO-EXISTE",
      }),
    }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 404);
    assert.equal(payload.error, "review_target_not_found");
  } finally {
    restoreEnv(env);
  }
});

async function seedContribution() {
  return storeContribution({
    id: "APORTE-20260521-TEST0001",
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
      sizeBytes: 12,
      bytes: new TextEncoder().encode("fake image"),
    }],
  });
}

async function approveContribution(submissionId: string): Promise<void> {
  const response = await PATCH(new Request("http://localhost/api/admin/aportes", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      submissionId,
      status: "approved",
      note: "Revisado para carga privada.",
    }),
  }));
  assert.equal(response.status, 200);
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
