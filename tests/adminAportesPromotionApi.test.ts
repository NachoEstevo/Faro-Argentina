import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { POST as POST_PROMOTE } from "../src/app/api/admin/aportes/promote/route.ts";
import { POST as POST_WITHDRAW } from "../src/app/api/admin/aportes/withdraw/route.ts";
import { PATCH, POST as POST_LINK } from "../src/app/api/admin/aportes/route.ts";
import { GET as GET_PUBLIC_CURATED_EVIDENCE } from "../src/app/api/cases/[id]/curated-evidence/route.ts";
import { GET as GET_PUBLIC_CURATED_MEDIA } from "../src/app/api/cases/[id]/curated-evidence/[evidenceId]/media/route.ts";
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

test("POST /api/admin/aportes/promote requires admin role", async () => {
  const env = preserveEnv(authEnvKeys);
  enableReviewerAuth();

  try {
    const response = await POST_PROMOTE(promoteRequest({
      submissionId: "APORTE-20260521-PROMO01",
      expedienteId: "AR-CONTRACT-46-0453-CON22",
    }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 403);
    assert.equal(payload.error, "admin_access_required");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes/promote validates curated evidence checklist", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-promote-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableAdminAuth();

  try {
    const stored = await seedApprovedLinkedContribution("APORTE-20260521-PROMO01");
    const response = await POST_PROMOTE(new Request("http://localhost/api/admin/aportes/promote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        submissionId: stored.contribution.id,
        expedienteId: "AR-CONTRACT-46-0453-CON22",
        title: "",
      }),
    }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 400);
    assert.equal(payload.error, "invalid_curated_evidence");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes/promote requires approved contribution and validated case link", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-promote-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableAdminAuth();

  try {
    const stored = await seedContribution("APORTE-20260521-PROMO02");
    const response = await POST_PROMOTE(promoteRequest({
      submissionId: stored.contribution.id,
      expedienteId: "AR-CONTRACT-46-0453-CON22",
    }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 409);
    assert.equal(payload.error, "contribution_not_approved");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes/promote creates candidate and published curated evidence", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-promote-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableAdminAuth();

  try {
    const stored = await seedApprovedLinkedContribution("APORTE-20260521-PROMO03");
    const candidateResponse = await POST_PROMOTE(promoteRequest({
      submissionId: stored.contribution.id,
      expedienteId: "AR-CONTRACT-46-0453-CON22",
      status: "candidate",
    }));
    const candidate = await candidateResponse.json() as {
      contribution: { publicationStatus: string };
      evidence: { id: string; status: string; title: string };
    };

    assert.equal(candidateResponse.status, 200);
    assert.equal(candidate.contribution.publicationStatus, "candidate");
    assert.equal(candidate.evidence.status, "candidate");
    assert.equal(candidate.evidence.title, "Foto revisada de avance visible");

    const publishResponse = await POST_PROMOTE(promoteRequest({
      submissionId: stored.contribution.id,
      expedienteId: "AR-CONTRACT-46-0453-CON22",
      status: "published_curated",
    }));
    const published = await publishResponse.json() as {
      contribution: { publicationStatus: string };
      evidence: { id: string; status: string; caveat: string };
    };

    assert.equal(publishResponse.status, 200);
    assert.equal(published.contribution.publicationStatus, "published_curated");
    assert.equal(published.evidence.id, candidate.evidence.id);
    assert.equal(published.evidence.status, "published_curated");
    assert.match(published.evidence.caveat, /No reemplaza/i);
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes/promote can expose a curated public image copy", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-promote-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableAdminAuth();

  try {
    const stored = await seedApprovedLinkedContribution("APORTE-20260521-PROMO06");
    const publishResponse = await POST_PROMOTE(promoteRequest({
      submissionId: stored.contribution.id,
      expedienteId: "AR-CONTRACT-46-0453-CON22",
      status: "published_curated",
      attachmentId: "ATT-001",
      mediaAltText: "Foto aportada de avance visible revisada por Faro.",
    }));
    const published = await publishResponse.json() as {
      evidence: {
        media?: {
          type: string;
          url: string;
          altText: string;
          mimeType: string;
          sizeBytes: number;
          objectKey?: string;
        };
      };
    };

    assert.equal(publishResponse.status, 200);
    assert.deepEqual(published.evidence.media, {
      type: "image",
      url: "/api/cases/AR-CONTRACT-46-0453-CON22/curated-evidence/CURATED-APORTE-20260521-PROMO06-AR-CONTRACT-46-0453-CON22/media",
      altText: "Foto aportada de avance visible revisada por Faro.",
      mimeType: "image/webp",
      sizeBytes: 12,
    });

    const response = await GET_PUBLIC_CURATED_EVIDENCE(
      new Request("http://localhost/api/cases/AR-CONTRACT-46-0453-CON22/curated-evidence"),
      { params: Promise.resolve({ id: "AR-CONTRACT-46-0453-CON22" }) },
    );
    const payload = await response.json() as { evidence: Array<{ media?: Record<string, unknown> }> };

    assert.equal(response.status, 200);
    assert.equal(payload.evidence[0]?.media?.url, published.evidence.media?.url);
    assert.equal("objectKey" in (payload.evidence[0]?.media ?? {}), false);

    const mediaResponse = await GET_PUBLIC_CURATED_MEDIA(
      new Request("http://localhost/api/cases/AR-CONTRACT-46-0453-CON22/curated-evidence/CURATED-APORTE-20260521-PROMO06-AR-CONTRACT-46-0453-CON22/media"),
      {
        params: Promise.resolve({
          id: "AR-CONTRACT-46-0453-CON22",
          evidenceId: "CURATED-APORTE-20260521-PROMO06-AR-CONTRACT-46-0453-CON22",
        }),
      },
    );
    const bytes = new TextDecoder().decode(await mediaResponse.arrayBuffer());

    assert.equal(mediaResponse.status, 200);
    assert.equal(mediaResponse.headers.get("content-type"), "image/webp");
    assert.match(mediaResponse.headers.get("content-disposition") ?? "", /inline/);
    assert.equal(bytes, "fake image");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/admin/aportes/withdraw removes curated evidence from public status", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-promote-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableAdminAuth();

  try {
    const stored = await seedApprovedLinkedContribution("APORTE-20260521-PROMO04");
    const publishResponse = await POST_PROMOTE(promoteRequest({
      submissionId: stored.contribution.id,
      expedienteId: "AR-CONTRACT-46-0453-CON22",
      status: "published_curated",
    }));
    const published = await publishResponse.json() as { evidence: { id: string } };

    const withdrawResponse = await POST_WITHDRAW(new Request("http://localhost/api/admin/aportes/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ evidenceId: published.evidence.id }),
    }));
    const withdrawn = await withdrawResponse.json() as {
      evidence: { status: string; withdrawnAt: string; withdrawnByName: string };
    };

    assert.equal(withdrawResponse.status, 200);
    assert.equal(withdrawn.evidence.status, "withdrawn");
    assert.equal(withdrawn.evidence.withdrawnByName, "Admin Faro");

    const repeatedWithdrawResponse = await POST_WITHDRAW(new Request("http://localhost/api/admin/aportes/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ evidenceId: published.evidence.id }),
    }));
    const repeatedWithdrawn = await repeatedWithdrawResponse.json() as {
      evidence: { status: string; withdrawnAt: string; withdrawnByName: string };
    };

    assert.equal(repeatedWithdrawResponse.status, 200);
    assert.equal(repeatedWithdrawn.evidence.status, "withdrawn");
    assert.equal(repeatedWithdrawn.evidence.withdrawnAt, withdrawn.evidence.withdrawnAt);
    assert.equal(repeatedWithdrawn.evidence.withdrawnByName, "Admin Faro");
  } finally {
    restoreEnv(env);
  }
});

test("GET /api/cases/[id]/curated-evidence returns only the public curated DTO", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-promote-aportes-"));
  const env = preserveEnv(["FARO_CONTRIBUTIONS_STORAGE_DIR", ...authEnvKeys, ...r2EnvKeys, ...productDbEnvKeys]);
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;
  clearR2Env();
  clearProductDbEnv();
  enableAdminAuth();

  try {
    const stored = await seedApprovedLinkedContribution("APORTE-20260521-PROMO05");
    await POST_PROMOTE(promoteRequest({
      submissionId: stored.contribution.id,
      expedienteId: "AR-CONTRACT-46-0453-CON22",
      status: "published_curated",
    }));

    const response = await GET_PUBLIC_CURATED_EVIDENCE(
      new Request("http://localhost/api/cases/AR-CONTRACT-46-0453-CON22/curated-evidence"),
      { params: Promise.resolve({ id: "AR-CONTRACT-46-0453-CON22" }) },
    );
    const payload = await response.json() as { evidence: Array<Record<string, unknown>> };

    assert.equal(response.status, 200);
    assert.equal(payload.evidence.length, 1);
    assert.deepEqual(Object.keys(payload.evidence[0] ?? {}).sort(), [
      "caption",
      "caveat",
      "id",
      "permissionNote",
      "promotedAt",
      "reviewedByName",
      "sourceLabel",
      "title",
    ]);
    assert.equal("submissionId" in (payload.evidence[0] ?? {}), false);
    assert.equal("internalNote" in (payload.evidence[0] ?? {}), false);
    assert.equal("promotedByName" in (payload.evidence[0] ?? {}), false);
    assert.equal("withdrawnAt" in (payload.evidence[0] ?? {}), false);
  } finally {
    restoreEnv(env);
  }
});

async function seedApprovedLinkedContribution(id: string) {
  const stored = await seedContribution(id);
  const approveResponse = await PATCH(new Request("http://localhost/api/admin/aportes", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      submissionId: stored.contribution.id,
      status: "approved_for_investigation",
      note: "Revisado para investigación privada.",
    }),
  }));
  assert.equal(approveResponse.status, 200);
  const linkResponse = await POST_LINK(new Request("http://localhost/api/admin/aportes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      submissionId: stored.contribution.id,
      targetType: "case",
      targetId: "AR-CONTRACT-46-0453-CON22",
      note: "Material privado asociado al expediente.",
    }),
  }));
  assert.equal(linkResponse.status, 200);
  return stored;
}

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
      sizeBytes: 12,
      bytes: new TextEncoder().encode("fake image"),
    }],
  });
}

function promoteRequest(input: {
  submissionId: string;
  expedienteId: string;
  status?: "candidate" | "published_curated";
  attachmentId?: string;
  mediaAltText?: string;
}) {
  return new Request("http://localhost/api/admin/aportes/promote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      submissionId: input.submissionId,
      expedienteId: input.expedienteId,
      status: input.status ?? "published_curated",
      title: "Foto revisada de avance visible",
      caption: "Material aportado para orientar revisión documental del expediente.",
      caveat: "No reemplaza la fuente oficial ni confirma avance físico por sí solo.",
      sourceLabel: "Aporte privado revisado por Faro",
      permissionNote: "La persona confirmó que era material propio o autorizado para revisión.",
      reviewedByName: "Equipo Faro",
      internalNote: "Publicar sólo como evidencia complementaria.",
      attachmentId: input.attachmentId,
      mediaAltText: input.mediaAltText,
    }),
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

function enableAdminAuth(): void {
  process.env.FARO_ENABLE_TEST_AUTH = "1";
  process.env.FARO_TEST_CLERK_USER_ID = "user_admin";
  process.env.FARO_TEST_CLERK_USER_ROLE = "admin";
  process.env.FARO_TEST_CLERK_USER_EMAIL = "admin@example.com";
  process.env.FARO_TEST_CLERK_USER_NAME = "Admin Faro";
}

function enableReviewerAuth(): void {
  process.env.FARO_ENABLE_TEST_AUTH = "1";
  process.env.FARO_TEST_CLERK_USER_ID = "user_reviewer";
  process.env.FARO_TEST_CLERK_USER_ROLE = "reviewer";
  process.env.FARO_TEST_CLERK_USER_EMAIL = "reviewer@example.com";
  process.env.FARO_TEST_CLERK_USER_NAME = "Reviewer Faro";
}

function restoreEnv(env: Map<string, string | undefined>): void {
  for (const [key, value] of env) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
