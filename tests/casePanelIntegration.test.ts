import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panelFactsUrl = new URL("../src/components/MapUI/panel/PanelFacts.tsx", import.meta.url);

test("PanelFacts labels administrative map points as non-exact territory", async () => {
  const source = await readFile(panelFactsUrl, "utf8");

  assert.match(source, /Territorio/);
  assert.match(source, /official_admin_centroid/);
  assert.match(source, /Referencia comunal, no sitio exacto/);
});
