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
