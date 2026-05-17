import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pageUrl = new URL("../src/app/expediente/[id]/informe/page.tsx", import.meta.url);
const componentUrl = new URL("../src/components/PrintableCaseReport.tsx", import.meta.url);
const buttonUrl = new URL("../src/components/ReportPrintButton.tsx", import.meta.url);

test("printable report page uses the repository report view model", async () => {
  const source = await readFile(pageUrl, "utf8");

  assert.match(source, /getCaseReportById/);
  assert.match(source, /PrintableCaseReport/);
  assert.match(source, /notFound/);
});

test("PrintableCaseReport renders simple report sections and keeps JSON secondary", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.match(source, /Qué estás mirando/);
  assert.match(source, /Por qué aparece en Faro/);
  assert.match(source, /Rastro oficial/);
  assert.match(source, /Contexto periodístico/);
  assert.match(source, /Anexo técnico/);
  assert.match(source, /JSON técnico/);
  assert.doesNotMatch(source, /fraude|culpable|corrup|robo/i);
});

test("ReportPrintButton opens the browser print flow for Save as PDF", async () => {
  const source = await readFile(buttonUrl, "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /Guardar PDF/);
});
