import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pageUrl = new URL("../src/app/admin/expediente/[id]/page.tsx", import.meta.url);
const viewUrl = new URL("../src/components/Admin/AdminExpedienteReviewView.tsx", import.meta.url);

test("/admin/expediente/[id] renders a private associated-material view", async () => {
  const source = [
    await readFile(pageUrl, "utf8"),
    await readFile(viewUrl, "utf8"),
  ].join("\n");

  assert.match(source, /AdminExpedienteReviewView/);
  assert.match(source, /\/api\/admin\/aportes\/linked/);
  assert.match(source, /Código privado/);
  assert.match(source, /Material asociado/);
  assert.match(source, /Aportes vinculados/);
  assert.match(source, /No modifica el expediente público/);
  assert.match(source, /Abrir archivo privado/);
  assert.doesNotMatch(source, /Publicar ahora|Publicar aporte|Caso probado|Fraude|Corrupción/);
});
