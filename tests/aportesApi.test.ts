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
    form.set("privacyMode", "anonymous");
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
    assert.equal(stored.privacyMode, "anonymous");
    assert.equal(stored.contactEmail, null);
    assert.equal(stored.attachments[0].mimeType, "image/webp");
    assert.equal(stored.attachments[0].originalFilename, "archivo-001.webp");
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
  form.set("privacyMode", "anonymous");
  form.set("sourcePermissionConfirmed", "true");
  form.set("reviewConfirmed", "true");

  const response = await POST(new Request("http://localhost/api/aportes", { method: "POST", body: form }));
  const payload = await response.json() as { errors: Array<{ field: string }> };

  assert.equal(response.status, 400);
  assert.deepEqual(payload.errors.map((error) => error.field), [
    "title",
    "explanation",
    "approximateLocation",
    "attachments",
  ]);
});

test("POST /api/aportes rate limits repeated public submissions by client", async () => {
  const headers = { "x-forwarded-for": "203.0.113.10" };

  let response = new Response();
  for (let index = 0; index < 11; index += 1) {
    const form = new FormData();
    form.set("type", "add_photo");
    form.set("title", "Fuente publica para revisar");
    form.set("jurisdiction", "AR");
    response = await POST(new Request("http://localhost/api/aportes", {
      method: "POST",
      headers,
      body: form,
    }));
  }
  const payload = await response.json() as { error: string };

  assert.equal(response.status, 429);
  assert.equal(payload.error, "submission_rate_limited");
});

test("POST /api/aportes hides internal storage failures from public responses", async () => {
  const previousEnv = {
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
  };
  process.env.STORAGE_ENDPOINT = "http://127.0.0.1:9";
  process.env.STORAGE_BUCKET = "faro-test";
  process.env.STORAGE_ACCESS_KEY = "test-access-key";
  process.env.STORAGE_SECRET_KEY = "test-secret-key";
  const previousConsoleError = console.error;
  console.error = () => undefined;

  try {
    const form = new FormData();
    form.set("type", "add_source");
    form.set("title", "Fuente publica para revisar");
    form.set("jurisdiction", "AR");
    form.set("explanation", "La fuente agrega contexto verificable para revisión interna.");
    form.set("publicSourceUrl", "https://example.com/fuente");
    form.set("privacyMode", "anonymous");
    form.set("sourcePermissionConfirmed", "true");
    form.set("reviewConfirmed", "true");

    const response = await POST(new Request("http://localhost/api/aportes", { method: "POST", body: form }));
    const payload = await response.json() as { error: string; message: string };

    assert.equal(response.status, 500);
    assert.equal(payload.error, "submission_failed");
    assert.equal(payload.message, "No pudimos recibir el aporte en este momento. Probá nuevamente en unos minutos.");
    assert.doesNotMatch(payload.message, /R2|fetch|127\.0\.0\.1|storage|Cannot|undefined|null/i);
  } finally {
    console.error = previousConsoleError;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
