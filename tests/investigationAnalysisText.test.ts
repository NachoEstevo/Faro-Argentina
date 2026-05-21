import test from "node:test";
import assert from "node:assert/strict";

import {
  parseInvestigationAnalysisBlocks,
} from "../src/lib/data/investigationAnalysisText.ts";

test("parseInvestigationAnalysisBlocks keeps markdown tables structured for the UI", () => {
  const blocks = parseInvestigationAnalysisBlocks([
    "<think>Voy a analizar antes de responder.</think>",
    "# Evidencia oficial",
    "| Punto de revisión | Soporte oficial | Brecha |",
    "| --- | --- | --- |",
    "| **Obra vial** | caseId AR-1, receiptId R-1 | Falta acto administrativo |",
    "| Proveedor | sourceId AR-CONTRATAR | Confirmar identidad documental |",
  ].join("\n"));

  assert.deepEqual(blocks[0], { type: "heading", text: "Evidencia oficial" });

  const table = blocks.find((block) => block.type === "table");
  if (!table || table.type !== "table") assert.fail("expected a structured table block");

  assert.deepEqual(table.headers, ["Punto de revisión", "Soporte oficial", "Brecha"]);
  assert.deepEqual(table.rows, [
    ["Obra vial", "caseId AR-1, receiptId R-1", "Falta acto administrativo"],
    ["Proveedor", "sourceId AR-CONTRATAR", "Confirmar identidad documental"],
  ]);
});
