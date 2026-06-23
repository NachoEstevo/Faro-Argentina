import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const caseSignalsUrl = new URL("../src/components/CaseSignals.tsx", import.meta.url);
const globalStylesUrl = new URL("../src/app/globals.css", import.meta.url);

test("CaseSignalChips exposes tap-friendly explanatory popovers", async () => {
  const source = await readFile(caseSignalsUrl, "utf8");
  const styles = await readFile(globalStylesUrl, "utf8");

  assert.match(source, /<details key=\{signal\.code\} className=\{`signalChipDisclosure \$\{signal\.kind\}`\}>/);
  assert.match(source, /aria-label=\{`\$\{signal\.label\}\. Ver qué significa`\}/);
  assert.match(source, /className="signalChipHint"/);
  assert.match(source, /className="signalChipPopover" role="note"/);
  assert.match(source, /\{signal\.summary\}/);
  assert.match(source, /\{signal\.caveat\}/);
  assert.match(source, /\{signal\.action\}/);

  assert.match(styles, /\.signalChipDisclosure\s*\{[\s\S]*position: relative;/);
  assert.match(styles, /\.signalChip\s*\{[\s\S]*cursor: help;/);
  assert.match(styles, /\.signalChipPopover\s*\{[\s\S]*position: absolute;[\s\S]*background: #fffaf0;/);
  assert.match(styles, /@media \(max-width: 720px\)\s*\{[\s\S]*\.signalChipPopover\s*\{[\s\S]*position: fixed;[\s\S]*left: 16px;/);
});
