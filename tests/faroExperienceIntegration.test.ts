import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paisPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);
const regionalMapStylesUrl = new URL("../src/components/RegionalMap/RegionalMap.module.css", import.meta.url);

test("country route wires the selected Explorer preset into FaroExperience", async () => {
  const pageSource = await readFile(paisPageUrl, "utf8");
  const experienceSource = await readFile(faroExperienceUrl, "utf8");

  assert.match(pageSource, /readParam\(search\.preset\)/);
  assert.match(pageSource, /initialExplorerPreset/);
  assert.match(experienceSource, /initialExplorerPreset/);
  assert.match(experienceSource, /<ExplorerView[\s\S]*initialPreset=\{initialExplorerPreset\}/);
});

test("FaroExperience preserves operational map case rendering", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");

  assert.match(source, /<CaseMap[\s\S]*cases=\{countryReviewCases\}/);
  assert.match(source, /<AportesView[\s\S]*cases=\{allCases\}/);
  assert.match(source, /useDeferredValue/);
  assert.match(source, /buildSearchSuggestionIndex/);
  assert.match(source, /buildSearchSuggestionsFromIndex/);
  assert.match(source, /onSelectCase=\{setSelectedCaseId\}/);
  assert.match(source, /viewMode === "map"/);
});

test("FaroExperience scopes light and dark themes to work views only", async () => {
  const source = await readFile(faroExperienceUrl, "utf8");
  const styles = await readFile(regionalMapStylesUrl, "utf8");

  assert.match(source, /type InterfaceTheme = "dark" \| "light"/);
  assert.match(source, /faro-interface-theme/);
  assert.match(source, /const activePlatformTheme = viewMode === "map" \? "dark" : interfaceTheme;/);
  assert.match(source, /data-platform-theme=\{activePlatformTheme\}/);
  assert.match(source, /viewMode !== "map" && \(\s*<InterfaceThemeToggle/);
  assert.match(source, /const nextTheme: InterfaceTheme = theme === "dark" \? "light" : "dark";/);
  assert.match(source, /aria-label=\{nextLabel\}/);
  assert.match(source, /<ThemeIcon size=\{15\} aria-hidden \/>/);
  assert.doesNotMatch(source, /<span>Claro<\/span>|<span>Oscuro<\/span>|role="group" aria-label="Tema de interfaz"/);

  assert.match(styles, /\.shell\[data-platform-theme="light"\]/);
  assert.match(styles, /\.interfaceThemeDock\s*\{[\s\S]*width: 38px;[\s\S]*height: 38px;/);
  assert.doesNotMatch(styles, /\.interfaceThemeButton|\.interfaceThemeButtonActive/);
});
