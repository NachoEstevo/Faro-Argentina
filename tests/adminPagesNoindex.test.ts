import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("admin aportes page declares noindex metadata", async () => {
  const source = await readFile(new URL("../src/app/admin/aportes/page.tsx", import.meta.url), "utf8");

  assert.match(source, /robots:\s*\{/);
  assert.match(source, /index:\s*false/);
  assert.match(source, /follow:\s*false/);
});

test("admin expediente review page declares noindex metadata", async () => {
  const source = await readFile(new URL("../src/app/admin/expediente/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(source, /robots:\s*\{/);
  assert.match(source, /index:\s*false/);
  assert.match(source, /follow:\s*false/);
});
