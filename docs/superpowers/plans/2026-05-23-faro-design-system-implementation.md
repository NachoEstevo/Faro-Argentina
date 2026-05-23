# Faro Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Faro design-system direction across the first usable slice: clean home map, Explorer selected preset, document light/dark reading mode, and small workflow polish for Aportes.

**Architecture:** Keep the map as the primary home surface and move selected-case discovery into Explorer. Reuse the existing `CURATED_CASES` data as the selected-expediente source, but do not draw selected cases or promotional cards on the home map. Add document-mode state only inside report/document surfaces and preserve existing CSS module patterns.

**Tech Stack:** Next.js App Router, React 19, CSS modules/global CSS tokens, Node test runner, existing `lucide-react` icons. No new UI, animation, auth, data or map dependencies.

---

## File Map

- Modify: `src/app/globals.css`
  Add document light tokens and viewport-safe shell defaults.
- Modify: `src/app/pais/[code]/page.tsx`
  Parse `preset=selected` from query params.
- Modify: `src/components/FaroExperience.tsx`
  Carry the initial Explorer preset into `ExplorerView`.
- Modify: `src/components/RegionalMap/RegionalMap.tsx`
  Remove home selected-case panel and obsolete featured host.
- Modify: `src/components/RegionalMap/CountryMap.tsx`
  Remove `FeaturedCasesOverlay` from home map rendering.
- Modify: `src/components/RegionalMap/TrustStrip.tsx`
  Add the discreet `Expedientes seleccionados` link.
- Modify: `src/components/RegionalMap/RegionalMap.module.css`
  Style the trust-strip link and remove obsolete selected-case hosts.
- Delete: `src/components/RegionalMap/FeaturedCasesOverlay.tsx`
- Delete: `src/components/RegionalMap/FeaturedCasesOverlay.module.css`
- Delete: `src/components/RegionalMap/CuratedCasesPanel.tsx`
- Delete: `src/components/RegionalMap/CuratedCasesPanel.module.css`
- Delete: `src/data/featuredCases.ts`
- Modify: `src/data/curatedCases.ts`
  Keep the data source but align user-facing labels to `Expedientes seleccionados` and non-accusatory copy.
- Modify: `src/components/Explorer/ExplorerView.tsx`
  Add selected preset filtering, banner, active state and clear action.
- Modify: `src/components/Explorer/Explorer.module.css`
  Style preset banner and selected-preset affordances.
- Modify: `src/components/PrintableCaseReport.tsx`
  Add client-side document mode toggle with local persistence.
- Modify: `src/components/PrintableCaseReport.module.css`
  Add dark document mode and replace ad-hoc colors with document tokens.
- Modify: `src/components/Aportes/AportesView.tsx`
  Treat uploads as private files, not only photos; allow PDF to match backend validation.
- Modify: `tests/curatedCases.test.ts`
  Replace home-panel expectations with clean-home and selected-link expectations.
- Modify: `tests/faroExperienceIntegration.test.ts`
  Add preset route wiring and operational map preservation source tests.
- Modify: `tests/explorerViewIntegration.test.ts`
  Add selected-preset behavior tests.
- Modify: `tests/printableCaseReport.test.ts`
  Add document-mode toggle tests.
- Modify: `tests/aportesViewIntegration.test.ts`
  Add private-files/PDF upload copy tests.
- Modify: `tests/userContributions.test.ts`
  Add PDF validation coverage for private aportes.

## Task 1: Write Design-System Regression Tests

**Files:**
- Modify: `tests/curatedCases.test.ts`
- Modify: `tests/faroExperienceIntegration.test.ts`
- Modify: `tests/explorerViewIntegration.test.ts`
- Modify: `tests/printableCaseReport.test.ts`
- Modify: `tests/aportesViewIntegration.test.ts`
- Modify: `tests/userContributions.test.ts`

- [ ] **Step 1: Replace home panel expectations with clean-map expectations**

In `tests/curatedCases.test.ts`, remove imports and assertions for:

```ts
FeaturedCasesOverlay
FeaturedCasesOverlay.module.css
CuratedCasesPanel
CuratedCasesPanel.module.css
FEATURED_CASES
```

Also delete/rewrite the old tests named:

```text
featured map cases only include curated cases with validated map geometry
documentary curated cases stay out of map marker data
curated documentary panel renders source, limit and explorer routing
featured overlay remains map-only
```

Add assertions that:

```ts
const regionalMapSource = await readFile(regionalMapUrl, "utf8");
const countryMapSource = await readFile(countryMapUrl, "utf8");
const trustStripSource = await readFile(trustStripUrl, "utf8");

assert.doesNotMatch(regionalMapSource, /CuratedCasesPanel|faro-featured-host|curatedPanelHost/);
assert.doesNotMatch(countryMapSource, /FeaturedCasesOverlay/);
assert.match(trustStripSource, /Expedientes seleccionados/);
assert.match(trustStripSource, /preset=selected/);
assert.match(trustStripSource, /Seleccionados/);
```

- [ ] **Step 2: Keep data-quality tests for selected expedientes**

Keep tests that verify `CURATED_CASES`:

```ts
assert.ok(CURATED_CASES.length >= 1);
assert.ok(CURATED_CASES.length <= 5);
```

Keep receipt/caveat/map-state tests using `getCaseById` and `shouldExposeCaseOnMap`.

- [ ] **Step 3: Add route and operational-map wiring tests**

Create or update `tests/faroExperienceIntegration.test.ts` with source assertions:

```ts
const paisPageUrl = new URL("../src/app/pais/[code]/page.tsx", import.meta.url);
const faroExperienceUrl = new URL("../src/components/FaroExperience.tsx", import.meta.url);

const paisSource = await readFile(paisPageUrl, "utf8");
const faroSource = await readFile(faroExperienceUrl, "utf8");

assert.match(paisSource, /readParam\(search\.preset\)/);
assert.match(paisSource, /initialExplorerPreset/);
assert.match(faroSource, /initialExplorerPreset/);
assert.match(faroSource, /<ExplorerView[\s\S]*initialPreset=\{initialExplorerPreset\}/);
assert.match(faroSource, /<CaseMap[\s\S]*cases=\{countryReviewCases\}/);
assert.match(faroSource, /onSelectCase=\{setSelectedCaseId\}/);
```

- [ ] **Step 4: Add Explorer selected-preset tests**

In `tests/explorerViewIntegration.test.ts`, add a test asserting:

```ts
assert.match(source, /initialPreset/);
assert.match(source, /CURATED_CASES/);
assert.match(source, /selectedCaseIds/);
assert.match(source, /Expedientes seleccionados/);
assert.match(source, /Ver todos los expedientes|Limpiar filtro/);
assert.match(source, /preset === "selected"/);
assert.match(source, /selectedDetailCase/);
assert.match(source, /selectedCaseIds\.has\(selectedCase\.id\)/);
assert.match(source, /clearPreset/);
assert.match(source, /presetScopedCases/);
```

- [ ] **Step 5: Add report mode tests**

In `tests/printableCaseReport.test.ts`, add a test asserting:

```ts
assert.match(source, /"use client"/);
assert.match(source, /Claro/);
assert.match(source, /Oscuro/);
assert.match(source, /faro-report-mode/);
assert.match(source, /typeof window/);
assert.match(source, /try/);
assert.match(css, /data-doc-mode="light"/);
assert.match(css, /data-doc-mode="dark"/);
```

- [ ] **Step 6: Add Aportes private-file tests**

In `tests/aportesViewIntegration.test.ts`, add assertions that the view accepts PDF and avoids photo-only language:

```ts
assert.match(source, /application\\/pdf/);
assert.match(source, /Archivos privados/);
assert.doesNotMatch(source, /Fotos privadas/);
assert.match(source, /material enviado/i);
```

- [ ] **Step 7: Add PDF validation test**

In `tests/userContributions.test.ts`, add:

```ts
const result = validateContributionDraft({
  ...baseDraft,
  attachments: [
    { filename: "informe.pdf", mimeType: "application/pdf", sizeBytes: 240_000 },
  ],
});

assert.equal(result.valid, true);
assert.deepEqual(result.errors, []);
```

- [ ] **Step 8: Run focused tests and verify RED**

Run:

```bash
node --experimental-strip-types --test \
  tests/curatedCases.test.ts \
  tests/faroExperienceIntegration.test.ts \
  tests/explorerViewIntegration.test.ts \
  tests/printableCaseReport.test.ts \
  tests/aportesViewIntegration.test.ts \
  tests/userContributions.test.ts
```

Expected: FAIL on missing selected-preset/report-mode/private-file/home-clean behavior.

## Task 2: Foundations And Document Mode

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/PrintableCaseReport.tsx`
- Modify: `src/components/PrintableCaseReport.module.css`

- [ ] **Step 1: Add document tokens**

In `src/app/globals.css`, add:

```css
--cf-doc-bg: #f4f1ea;
--cf-doc-surface: #fbfaf6;
--cf-doc-text: #17202b;
--cf-doc-muted: #5e6673;
--cf-doc-border: rgba(23, 32, 43, 0.14);
--cf-doc-accent: #2b6f9f;
```

Also change product shells that currently use `height: 100vh` to `height: 100dvh` where safe.

- [ ] **Step 2: Add report mode state**

At the top of `PrintableCaseReport.tsx`, add `"use client";`, `useEffect`, and `useState`.

Implement:

```ts
type DocumentMode = "light" | "dark";
const REPORT_MODE_STORAGE_KEY = "faro-report-mode";
```

Use `useState<DocumentMode>("light")`. Read from localStorage only in `useEffect`,
guarded by `typeof window !== "undefined"` and `try/catch`. Render:

```tsx
<main className={styles.page} data-doc-mode={documentMode}>
```

- [ ] **Step 3: Add the document toggle**

Add a toolbar toggle with real buttons:

```tsx
<div className={styles.modeToggle} role="group" aria-label="Modo de lectura">
  <button type="button" aria-pressed={documentMode === "light"}>Claro</button>
  <button type="button" aria-pressed={documentMode === "dark"}>Oscuro</button>
</div>
```

Persist changes to `localStorage` in a guarded `try/catch`.

- [ ] **Step 4: Add CSS modes**

In `PrintableCaseReport.module.css`, replace the page/sheet hard-coded palette with document tokens and add dark variants under:

```css
.page[data-doc-mode="dark"] { ... }
.page[data-doc-mode="dark"] .sheet { ... }
```

Keep print mode light and toolbar hidden.

- [ ] **Step 5: Run report test**

Run:

```bash
node --experimental-strip-types --test tests/printableCaseReport.test.ts
```

Expected: PASS.

## Task 3: Home Cleanup And Trust Strip Entry

**Files:**
- Modify: `src/components/RegionalMap/RegionalMap.tsx`
- Modify: `src/components/RegionalMap/CountryMap.tsx`
- Modify: `src/components/RegionalMap/TrustStrip.tsx`
- Modify: `src/components/RegionalMap/RegionalMap.module.css`
- Delete: `src/components/RegionalMap/FeaturedCasesOverlay.tsx`
- Delete: `src/components/RegionalMap/FeaturedCasesOverlay.module.css`
- Delete: `src/components/RegionalMap/CuratedCasesPanel.tsx`
- Delete: `src/components/RegionalMap/CuratedCasesPanel.module.css`
- Delete: `src/data/featuredCases.ts`

- [ ] **Step 1: Remove home panels and callout hosts**

Remove `CuratedCasesPanel` import/rendering from `RegionalMap.tsx`.
Remove the `faro-featured-host` and `curatedPanelHost` blocks.

- [ ] **Step 2: Remove featured map overlay**

Remove `FeaturedCasesOverlay` import and render from `CountryMap.tsx`.

- [ ] **Step 3: Add selected-expedientes trust-strip link**

In `TrustStrip.tsx`, import `Link` and `CURATED_CASES`. Add:

```tsx
<Link href="/pais/AR?mode=explorer&preset=selected" className={styles.trustLink}>
  <span className={styles.trustLinkFull}>Expedientes seleccionados: {CURATED_CASES.length.toLocaleString("es-AR")}</span>
  <span className={styles.trustLinkShort}>Seleccionados</span>
</Link>
```

Keep the strip compact and do not add a card.

- [ ] **Step 4: Clean CSS**

Remove obsolete `.featuredHost`, `.featuredHostMuted`, `.curatedPanelHost`, and `.curatedPanelHostMuted` styles. Add `.trustLink`, `.trustLinkFull` and `.trustLinkShort`. The selected entry must remain visible at mobile widths even when `.trustExtras` are hidden.

- [ ] **Step 5: Run curated/home test**

Run:

```bash
node --experimental-strip-types --test tests/curatedCases.test.ts
```

Expected: PASS.

## Task 4: Explorer `Expedientes seleccionados` Preset

**Files:**
- Modify: `src/app/pais/[code]/page.tsx`
- Modify: `src/components/FaroExperience.tsx`
- Modify: `src/components/Explorer/ExplorerView.tsx`
- Modify: `src/components/Explorer/Explorer.module.css`

- [ ] **Step 1: Parse preset query param**

In `src/app/pais/[code]/page.tsx`, read:

```ts
const initialExplorerPreset = readParam(search.preset) === "selected" ? "selected" : null;
```

Pass it to `FaroExperience`.

- [ ] **Step 2: Carry preset into Explorer**

Add `initialExplorerPreset?: "selected" | null` to `FaroExperience` props and pass it to `ExplorerView`.

- [ ] **Step 3: Add preset state in Explorer**

In `ExplorerView.tsx`:

```ts
import { CURATED_CASES } from "@/data/curatedCases";
type ExplorerPreset = "selected" | null;
```

Create:

```ts
const selectedCaseIds = useMemo(() => new Set(CURATED_CASES.map((item) => item.caseId)), []);
const [preset, setPreset] = useState<ExplorerPreset>(initialPreset ?? null);
```

Filter the Explorer input cases when `preset === "selected"`:

```ts
const presetScopedCases = preset === "selected"
  ? cases.filter((caseFile) => selectedCaseIds.has(caseFile.id))
  : cases;
```

Use `presetScopedCases` in year/pivot Explorer calculations, while keeping `countryAll` available for detail related-case lookups.

Choose closed preset behavior:

- manual search, country change, geometry filter, year slider, facet toggle, active pivot removal and `Limpiar` all exit the preset by calling `clearPreset()`;
- while the preset is active, any `selectedCase` outside `selectedCaseIds` is hidden or cleared.

Create:

```ts
const selectedDetailCase =
  preset === "selected" && selectedCase && !selectedCaseIds.has(selectedCase.id)
    ? null
    : selectedCase;
```

Pass `selectedDetailCase` to `ExplorerDetail`.

- [ ] **Step 4: Render banner and clear action**

Above the search box, render a compact banner only when selected preset is active:

```tsx
<div className={styles.presetBanner}>
  <div>
    <p>Expedientes seleccionados</p>
    <span>Selección breve con fuente oficial, límite visible y próximo paso.</span>
  </div>
  <button type="button" onClick={() => setPreset(null)}>Ver todos los expedientes</button>
</div>
```

Implement `clearPreset()` and call it from:

- `resetFilters`;
- `selectCountryScope`;
- `toggleFacet`;
- geometry radio `onChange`;
- year `onFromChange` / `onToChange`;
- active pivot chip `onClick`;
- search input `onChange`.

- [ ] **Step 5: Style the banner**

Add `.presetBanner` to `Explorer.module.css` using border/divided layout, not a large card.

- [ ] **Step 6: Run Explorer test**

Run:

```bash
node --experimental-strip-types --test tests/faroExperienceIntegration.test.ts tests/explorerViewIntegration.test.ts
```

Expected: PASS.

## Task 5: Aportes Private File Polish

**Files:**
- Modify: `src/components/Aportes/AportesView.tsx`

- [ ] **Step 1: Rename upload copy**

Change `Fotos privadas` to `Archivos privados`.

Change helper text to:

```tsx
JPG, PNG, WebP o PDF. Hasta 5 archivos, 10 MB cada uno.
```

- [ ] **Step 2: Accept PDFs in the input**

Change the file input accept attribute to:

```tsx
accept="image/jpeg,image/png,image/webp,application/pdf"
```

- [ ] **Step 3: Keep evidence boundary copy**

Ensure the sidebar still says material remains private and is not published automatically.

- [ ] **Step 4: Run Aportes test**

Run:

```bash
node --experimental-strip-types --test tests/aportesViewIntegration.test.ts tests/userContributions.test.ts
```

Expected: PASS.

## Task 6: Full Validation And Review

**Files:**
- No new source files unless a prior task requires a small helper.

- [ ] **Step 1: Run focused suite**

Run:

```bash
node --experimental-strip-types --test \
  tests/curatedCases.test.ts \
  tests/faroExperienceIntegration.test.ts \
  tests/explorerViewIntegration.test.ts \
  tests/printableCaseReport.test.ts \
  tests/aportesViewIntegration.test.ts \
  tests/userContributions.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full validation**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 3: Browser visual checks**

Start or reuse the dev server and check:

```text
/
/pais/AR
/pais/AR?mode=explorer&preset=selected
/expediente/AR-CONTRACT-46-1585-CON21/informe
/pais/AR?mode=aportes
/pais/AR?mode=investigations
```

Expected:

- home has no selected-case cards or callouts over the map;
- trust strip includes selected-expedientes micro entry;
- `/pais/AR` map still shows operational case points and a selected marker can still open a case panel;
- Explorer selected preset shows only selected expedientes and a clear exit;
- `preset=selected&case=<non-selected>` does not show that non-selected detail under the selected banner;
- report toggles Claro/Oscuro;
- Aportes upload copy says files and includes PDF.

- [ ] **Step 4: Request review**

Use subagents for:

1. spec compliance against `docs/superpowers/specs/2026-05-23-faro-design-system.md`;
2. code quality/regression review for changed files.

- [ ] **Step 5: Fix review findings**

Fix Critical and Important issues. Re-run relevant tests.
