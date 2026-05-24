import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pageUrl = new URL("../src/app/admin/aportes/page.tsx", import.meta.url);
const viewUrl = new URL("../src/components/Admin/AdminAportesView.tsx", import.meta.url);
const detailUrl = new URL("../src/components/Admin/AdminAportesDetail.tsx", import.meta.url);
const typesUrl = new URL("../src/components/Admin/AdminAportesTypes.ts", import.meta.url);

test("/admin/aportes renders a private review tray, not a public publishing flow", async () => {
  const source = [
    await readFile(pageUrl, "utf8"),
    await readFile(viewUrl, "utf8"),
    await readFile(detailUrl, "utf8"),
    await readFile(typesUrl, "utf8"),
  ].join("\n");

  assert.match(source, /AdminAportesView/);
  assert.match(source, /\/api\/admin\/aportes/);
  assert.match(source, /Código privado/);
  assert.match(source, /Bandeja de aportes/);
  assert.match(source, /Necesita más info/);
  assert.match(source, /Aprobado para cargar/);
  assert.match(source, /Descartado/);
  assert.match(source, /Nota interna/);
  assert.match(source, /Modo de contacto/);
  assert.match(source, /Sin contacto/);
  assert.match(source, /Permite contacto/);
  assert.match(source, /Material no verificado/);
  assert.match(source, /No se publica automáticamente/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Vincular a expediente o carpeta/);
  assert.match(source, /ID de expediente o carpeta/);
  assert.match(source, /Sólo material aprobado/);
  assert.match(source, /Guardar vínculo/);
  assert.doesNotMatch(source, /accessCode=/);
  assert.doesNotMatch(source, /Publicar ahora|Publicar caso|Caso probado|Fraude|Corrupción/);
});
