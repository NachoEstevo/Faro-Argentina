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

test("CaseSignalPanel exposes help popovers on signal cards", async () => {
  const source = await readFile(caseSignalsUrl, "utf8");
  const styles = await readFile(globalStylesUrl, "utf8");

  assert.match(source, /<SignalHelpDisclosure signal=\{signal\} \/>/);
  assert.match(source, /function SignalHelpDisclosure\(\{ signal \}: \{ signal: CaseSignal \}\)/);
  assert.match(source, /<details className="signalHelpDisclosure">/);
  assert.match(source, /className="signalHelpButton" aria-label=\{`\$\{signal\.label\}\. Ver qué significa`\}/);
  assert.match(source, /className="signalHelpPopover" role="note"/);
  assert.match(source, /\{signal\.evidence\}/);
  assert.match(source, /\{signal\.caveat\}/);
  assert.match(source, /\{signal\.action\}/);

  assert.match(styles, /\.signalHelpDisclosure\s*\{[\s\S]*position: relative;/);
  assert.match(styles, /\.signalHelpButton\s*\{[\s\S]*cursor: help;/);
  assert.match(styles, /\.signalHelpPopover\s*\{[\s\S]*position: absolute;[\s\S]*background: #fffaf0;/);
  assert.match(styles, /@media \(max-width: 720px\)\s*\{[\s\S]*\.signalHelpPopover\s*\{[\s\S]*position: fixed;[\s\S]*bottom: calc\(104px \+ env\(safe-area-inset-bottom, 0px\)\);/);
});
