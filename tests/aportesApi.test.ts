import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { POST } from "../src/app/api/aportes/route.ts";

test("POST /api/aportes stores a private photo contribution in local review storage", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "faro-aportes-"));
  const previousStorageDir = process.env.FARO_CONTRIBUTIONS_STORAGE_DIR;
  process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = storageDir;

  try {
    const form = new FormData();
    form.set("type", "add_photo");
    form.set("title", "Foto de avance visible");
    form.set("jurisdiction", "AR");
    form.set("explanation", "La imagen muestra el estado visible de la obra para revisar internamente.");
    form.set("relatedCase", "AR-CONTRATAR-CONTRATOS-381-1001-CON21");
    form.set("approximateLocation", "Santa Cruz");
    form.set("sourcePermissionConfirmed", "true");
    form.set("reviewConfirmed", "true");
    form.append("attachments", new File(["fake image"], "obra.webp", { type: "image/webp" }));

    const response = await POST(new Request("http://localhost/api/aportes", { method: "POST", body: form }));
    const payload = await response.json() as { submissionId: string; storageMode: string };

    assert.equal(response.status, 201);
    assert.equal(payload.storageMode, "local");
    assert.match(payload.submissionId, /^APORTE-/);

    const stored = JSON.parse(
      await readFile(join(storageDir, "submissions", `${payload.submissionId}.json`), "utf8"),
    );
    assert.equal(stored.type, "add_photo");
    assert.equal(stored.status, "submitted");
    assert.equal(stored.attachments[0].mimeType, "image/webp");
    assert.equal(stored.attachments[0].publicUrl, undefined);

    const attachment = await readFile(join(storageDir, stored.attachments[0].objectKey));
    assert.equal(attachment.toString(), "fake image");
  } finally {
    if (previousStorageDir === undefined) {
      delete process.env.FARO_CONTRIBUTIONS_STORAGE_DIR;
    } else {
      process.env.FARO_CONTRIBUTIONS_STORAGE_DIR = previousStorageDir;
    }
  }
});

test("POST /api/aportes rejects invalid contribution payloads", async () => {
  const form = new FormData();
  form.set("type", "add_photo");
  form.set("title", "Fraude en obra publica");
  form.set("jurisdiction", "AR");
  form.set("explanation", "Esto demuestra corrupcion.");
  form.set("sourcePermissionConfirmed", "true");
  form.set("reviewConfirmed", "true");

  const response = await POST(new Request("http://localhost/api/aportes", { method: "POST", body: form }));
  const payload = await response.json() as { errors: Array<{ field: string }> };

  assert.equal(response.status, 400);
  assert.deepEqual(payload.errors.map((error) => error.field), ["title", "explanation", "reviewAnchor"]);
});

test("POST /api/aportes uses STORAGE_* R2 configuration when present", async () => {
  const previousEnv = {
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
  };
  const previousFetch = globalThis.fetch;
  const uploadedUrls: string[] = [];

  process.env.STORAGE_ENDPOINT = "https://example.r2.cloudflarestorage.com";
  process.env.STORAGE_BUCKET = "faro";
  process.env.STORAGE_ACCESS_KEY = "test-access-key";
  process.env.STORAGE_SECRET_KEY = "test-secret-key";
  delete process.env.R2_ACCOUNT_ID;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_BUCKET;
  globalThis.fetch = async (input: URL | RequestInfo) => {
    uploadedUrls.push(String(input));
    return new Response(null, { status: 200 });
  };

  try {
    const form = new FormData();
    form.set("type", "add_photo");
    form.set("title", "Foto de cartel visible");
    form.set("jurisdiction", "AR");
    form.set("explanation", "La imagen sirve para revisar de forma privada el estado visible del lugar.");
    form.set("relatedCase", "AR-CONTRATAR-CONTRATOS-381-1001-CON21");
    form.set("approximateLocation", "Santa Cruz");
    form.set("sourcePermissionConfirmed", "true");
    form.set("reviewConfirmed", "true");
    form.append("attachments", new File(["fake image"], "cartel.png", { type: "image/png" }));

    const response = await POST(new Request("http://localhost/api/aportes", { method: "POST", body: form }));
    const payload = await response.json() as { storageMode: string };

    assert.equal(response.status, 201);
    assert.equal(payload.storageMode, "r2");
    assert.equal(uploadedUrls.length, 2);
    assert.match(uploadedUrls[0], /^https:\/\/example\.r2\.cloudflarestorage\.com\/faro\/submissions\/APORTE-/);
    assert.match(uploadedUrls[1], /\/submission\.json$/);
  } finally {
    restoreEnv(previousEnv);
    globalThis.fetch = previousFetch;
  }
});

function restoreEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
