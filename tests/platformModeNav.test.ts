import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const navUrl = new URL("../src/components/PlatformModeNav.tsx", import.meta.url);
const navStylesUrl = new URL("../src/components/PlatformModeNav.module.css", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const countrySidebarUrl = new URL("../src/components/RegionalMap/CountrySidebar.tsx", import.meta.url);
const mapLegendUrl = new URL("../src/components/RegionalMap/MapLegend.tsx", import.meta.url);
const sidebarFiltersUrl = new URL("../src/components/RegionalMap/SidebarFilters.tsx", import.meta.url);

test("PlatformModeNav keeps only public primary modes centered", async () => {
  const source = await readFile(navUrl, "utf8");
  const styles = await readFile(navStylesUrl, "utf8");

  assert.match(source, /PRIMARY_MODES/);
  assert.match(source, /mode: "map"/);
  assert.match(source, /mode: "explorer"/);
  assert.doesNotMatch(source, /mode: "investigations"/);
  assert.doesNotMatch(source, /mode="aportes"|Aportar|MessageSquarePlus|styles\.secondary/);
  assert.match(styles, /\.floating\s*\{[\s\S]*left: 20px;[\s\S]*right: 20px;[\s\S]*justify-content: center;/);
  assert.match(styles, /\.floating\s*\{[\s\S]*pointer-events: none;/);
  assert.match(styles, /\.root\.floating\s*\{[\s\S]*pointer-events: none;/);
  assert.match(styles, /\.floatingBar\s*\{[\s\S]*pointer-events: none;/);
  assert.match(styles, /\.root\.floatingBar\s*\{[\s\S]*pointer-events: none;/);
  assert.match(styles, /\.floatingBar \.primary\s*\{[\s\S]*pointer-events: auto;/);
  assert.match(styles, /--argentina-blue: #75aadb;/);
  assert.match(styles, /--argentina-white: #ffffff;/);
  assert.match(styles, /--argentina-gold: #fcbf49;/);
  assert.doesNotMatch(styles, /#843511/);
  assert.match(styles, /outline: 2px solid var\(--argentina-gold\)/);
  assert.match(styles, /\.item\s*\{[\s\S]*box-sizing: border-box;[\s\S]*min-height: 38px;/);
  assert.match(styles, /\.item svg,[\s\S]*\.item span\s*\{[\s\S]*pointer-events: none;/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.floatingBar \.primary\s*\{[\s\S]*display: inline-flex;[\s\S]*flex: 0 0 auto;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.floatingBar \.item\s*\{[\s\S]*width: 48px;[\s\S]*min-height: 44px;[\s\S]*padding: 0;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.floatingBar \.item svg\s*\{[\s\S]*width: 15px;[\s\S]*height: 15px;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{[\s\S]*\.floatingBar \.item span\s*\{[\s\S]*display: none;/);
  assert.doesNotMatch(source, /"sidebar"/);
  assert.doesNotMatch(styles, /\.sidebar/);
  assert.doesNotMatch(source, /Carpetas|Mis carpetas|FolderOpen|Aportes<\/span>/);
  assert.doesNotMatch(styles, /\.secondary/);
});

test("FaroExperience syncs mode changes into the country URL without touching CaseMap markers", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /const switchViewMode = useCallback/);
  assert.match(source, /router\.replace\(buildPlatformModeHref\(mode, selectedCountry\), \{ scroll: false \}\)/);
  assert.match(source, /<PlatformModeNav[\s\S]*activeMode=\{viewMode\}[\s\S]*onModeChange=\{switchViewMode\}/);
  assert.doesNotMatch(source, /showSecondaryAction/);
  assert.match(source, /<CaseMap[\s\S]*cases=\{countryReviewCases\}/);
  assert.match(source, /onSelectCase=\{setSelectedCaseId\}/);
});

test("PlatformModeNav can render direct country links when a route is provided", async () => {
  const source = await readFile(navUrl, "utf8");

  assert.match(source, /const href = hrefForMode\?\.\(mode\);/);
  assert.match(source, /if \(href\) \{/);
  assert.match(source, /<Link className=\{controlClassName\} href=\{href\} aria-label=\{ariaLabel\}>/);
});

test("map review language avoids alert-style accusation wording", async () => {
  const source = [
    await readFile(countrySidebarUrl, "utf8"),
    await readFile(mapLegendUrl, "utf8"),
    await readFile(sidebarFiltersUrl, "utf8"),
  ].join("\n");

  assert.match(source, /Revisión/);
  assert.match(source, /Prioridad de revisión/);
  assert.match(source, /Con señal/);
  assert.match(source, /Sin señal/);
  assert.match(source, />Señal</);
  assert.doesNotMatch(source, /Alertas|alertas|Sin alertas|Hallazgo/);
});
