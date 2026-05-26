import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const productDocumentUrl = new URL("../src/components/ProductDocument.tsx", import.meta.url);
const methodologyPageUrl = new URL("../src/app/metodologia/page.tsx", import.meta.url);
const dataPageUrl = new URL("../src/app/datos/page.tsx", import.meta.url);

test("product document navigation keeps public resources inside Faro", async () => {
  const source = await readFile(productDocumentUrl, "utf8");

  assert.match(source, /\/metodologia/);
  assert.match(source, /\/datos/);
  assert.match(source, /\/privacidad/);
  assert.match(source, /\/pais\/AR\?mode=aportes/);
  assert.doesNotMatch(source, /github\.com/);
});

test("methodology page explains Faro without depending on GitHub", async () => {
  const source = await readFile(methodologyPageUrl, "utf8");

  assert.match(source, /Metodología \| Faro/);
  assert.match(source, /Qué es Faro/);
  assert.match(source, /Cómo se arma un expediente/);
  assert.match(source, /Mapa y geometría/);
  assert.match(source, /Qué no afirma Faro/);
  assert.match(source, /No acusa ni reemplaza la verificación/);
  assert.doesNotMatch(source, /github\.com/);
});

test("data page documents sources, caveats and export path", async () => {
  const source = await readFile(dataPageUrl, "utf8");

  assert.match(source, /Datos \| Faro/);
  assert.match(source, /CONTRAT\.AR contratos y obras/);
  assert.match(source, /Mapa de Inversiones Argentina/);
  assert.match(source, /geometría oficial validada/);
  assert.match(source, /\/api\/export\?country=AR/);
  assert.match(source, /Una señal de revisión no es una conclusión automática/);
  assert.doesNotMatch(source, /github\.com/);
});
