# Casos Curados Institucionales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> or `superpowers:subagent-driven-development`. Track each checkbox as work is
> completed.

**Goal:** Build a small, evidence-first curated case layer for Faro Argentina
without forcing case count, weakening caveats, or turning sensitive documentary
records into map markers.

**Architecture:** Add a curated-case data module with editorial metadata and
tests against the live corpus. Keep `FeaturedCasesOverlay` for map-ready cases
only. Render non-map/documentary cases in a separate `CuratedCasesPanel` outside
the Leaflet canvas, with visible source and limit text.

**Reviewed changes from subagents:**

- Do not require Vialidad/Cuadernos as homepage map anchors.
- Do not render documentary cases inside the map overlay.
- Rename "brecha de transparencia" to "brecha de datos/verificacion".
- Show `Fuente` and `Limite` on every curated card.
- Test map markers against the official geometry gate and case coordinates.
- Treat `AR-MAPA-INV-1003129182` as a data-gap-only case; no relationship is
  implied with Ruta 3 or any other curated case.

---

## Files

- Create: `src/data/curatedCases.ts`
- Create: `src/components/RegionalMap/CuratedCasesPanel.tsx`
- Create: `src/components/RegionalMap/CuratedCasesPanel.module.css`
- Create: `tests/curatedCases.test.ts`
- Modify: `src/data/featuredCases.ts`
- Modify: `src/components/RegionalMap/FeaturedCasesOverlay.tsx`
- Modify: `src/components/RegionalMap/FeaturedCasesOverlay.module.css`
- Modify: `src/components/RegionalMap/RegionalMap.tsx`
- Modify: `src/components/RegionalMap/RegionalMap.module.css`
- Modify: `docs/roadmap/2026-05-21-two-week-faro-professionalization.md`
- Modify: `docs/superpowers/specs/2026-05-23-casos-curados-institucionales-design.md`

## Task 1: Curated Case Contract

- [ ] Create `tests/curatedCases.test.ts`.
- [ ] Assert `CURATED_CASES.length >= 1 && <= 5`.
- [ ] Assert every curated `caseId` exists in `getCaseById`.
- [ ] Assert every curated case has a receipt and at least one caveat.
- [ ] Assert editorial copy does not contain accusation language.
- [ ] Assert `mapState === "map_ready"` matches `shouldExposeCaseOnMap`.
- [ ] Assert at least one curated case is map-ready and at least one is not
      map-ready, without requiring a fixed count.
- [ ] Assert the Mapa de Inversiones data-gap case has:
      `sourceId === "AR-MAPA-INVERSIONES-OBRAS"`,
      `receipt.locatorType === "official_detail"`, progress/amount data,
      `coordinates === null`, and `shouldExposeCaseOnMap === false`.
- [ ] Create `src/data/curatedCases.ts` with:
      `caseId`, `countryCode`, `role`, `mapState`, `kicker`, `title`,
      `summary`, `officialBasis`, `caveat`, `nextStep`, `mapLabel`,
      `actions`, and `tags`.
- [ ] Use cautious Spanish copy:
      "documento fuente", "limite", "sin punto de mapa validado",
      "contexto judicial oficial", "brecha de datos".

## Task 2: Map-Ready Featured Cases Only

- [ ] Update tests to import `FEATURED_CASES`.
- [ ] Assert every featured map case comes from `CURATED_CASES`.
- [ ] Assert every featured map case has `mapState === "map_ready"`.
- [ ] Assert every featured marker equals `getCaseById(caseId).coordinates`.
- [ ] Assert non-map curated cases are not present in `FEATURED_CASES`.
- [ ] Update `src/data/featuredCases.ts` to keep only map-ready featured
      callouts. For this sprint, the known safe map-ready case is
      `AR-CONTRACT-46-1585-CON21`.
- [ ] Remove the `documentary` featured variant and synthetic Buenos Aires
      marker.

## Task 3: Separate Editorial Panel For Curated Cases

- [ ] Create `src/components/RegionalMap/CuratedCasesPanel.tsx`.
- [ ] Render a compact rail/panel outside Leaflet, not inside
      `FeaturedCasesOverlay`.
- [ ] Show up to two cards initially; support expanding when there are more.
- [ ] Each card must show:
      `Fuente`, `Limite`, map state, title, summary, and "Abrir expediente".
- [ ] Clicking a card should route to
      `/pais/AR?mode=explorer&case=<caseId>`.
- [ ] Create `CuratedCasesPanel.module.css` with desktop and mobile-safe layout.
- [ ] Mount the panel from `RegionalMap.tsx`, muted while the welcome overlay is
      visible.
- [ ] Keep `FeaturedCasesOverlay` focused on map lines/dots/cards only.
- [ ] Add source-level tests that verify the panel imports `CURATED_CASES`,
      renders `Fuente`, `Limite`, `sin punto de mapa validado`, and routes to
      explorer.

## Task 4: Roadmap And Editorial Gate

- [ ] Update the two-week roadmap to record this layer as:
      "casos curados institucionales: expediente primero, mapa solo con
      geometria validada".
- [ ] Add a release gate:
      before publish, review visible copy for government-endorsement risk,
      accusation drift, and judicial-overclaiming.

## Task 5: Validation

- [ ] Run focused test:

```bash
node --experimental-strip-types --test tests/curatedCases.test.ts
```

- [ ] Run full test suite:

```bash
npm test
```

- [ ] Run typecheck:

```bash
npm run typecheck
```

- [ ] Run build:

```bash
npm run build
```

- [ ] Browser smoke:
      open `/`, dismiss the welcome overlay, verify the curated panel appears
      outside the map canvas and does not overlap primary controls.
- [ ] Browser smoke:
      open `/pais/AR?mode=explorer&case=AR-CONTRACT-46-1585-CON21`, verify the
      expediente opens.
- [ ] Browser smoke mobile width:
      verify the curated panel remains readable and the map-only callout does
      not create horizontal overflow.

## Task 6: Final Review

- [ ] Review diff for unrelated changes.
- [ ] Check sensitive copy manually for these forbidden meanings:
      government endorsement, guilt, hidden conduct, proven payment, proven
      execution, or closed judicial conclusion beyond the official source.
- [ ] Confirm untracked local artifacts such as `.playwright-cli/` and
      `.superpowers/` are not staged.
