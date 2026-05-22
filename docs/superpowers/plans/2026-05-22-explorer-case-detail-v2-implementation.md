# Explorer Case Detail V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Explorer case detail into the approved investigative summary with a prominent money trail and tabbed detail categories.

**Architecture:** Keep the change inside the existing Explorer component boundary. `ExplorerDetail` owns active tab state, uses small local helper components for summary, money strip and tabs, and reuses the existing detail cards inside tab panels. No backend, auth, data ingestion, ML, or coordinate changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS modules, Node test runner.

---

## Files

- Modify: `tests/explorerViewIntegration.test.ts`
- Modify: `src/components/Explorer/ExplorerView.tsx`
- Modify: `src/components/Explorer/Explorer.module.css`
- Create: `docs/superpowers/plans/2026-05-22-explorer-case-detail-v2-implementation.md`

## Task 1: Test The Approved Detail Structure

- [x] **Step 1: Add failing integration assertions**

In `tests/explorerViewIntegration.test.ts`, add assertions that `ExplorerView` exposes:

- `ExplorerDetailTab`
- `CaseDetailSummary`
- `MoneyTrailStrip`
- `CaseDetailTabs`
- labels `Por qué mirar este expediente`, `Próximo paso`, `Dinero`, `Actores`, `Evidencia`, `Mapa`, `Relacionados`
- CSS classes `moneyTrailStrip`, `detailTabs`, `detailTabPanel`

- [x] **Step 2: Run focused test**

```bash
node --experimental-strip-types --test tests/explorerViewIntegration.test.ts
```

Expected: FAIL because the approved detail structure is not implemented.

## Task 2: Implement Detail Summary, Money Strip And Tabs

- [x] **Step 1: Add tab state and local components in `ExplorerView.tsx`**

Add:

- `type ExplorerDetailTab = "resumen" | "dinero" | "actores" | "evidencia" | "mapa" | "relacionados"`
- `DETAIL_TABS`
- `CaseDetailSummary`
- `MoneyTrailStrip`
- `CaseDetailTabs`
- helper functions for primary signal, next action, money-strip formatting and map gap copy.

- [x] **Step 2: Reorganize `ExplorerDetail`**

Keep the top actions and title visible, then render:

- `CaseDetailSummary`
- `MoneyTrailStrip`
- `CaseDetailTabs`
- tab panels:
  - `Resumen`: competition, chronology, location and compact caveat context
  - `Dinero`: amount and execution cards
  - `Actores`: folder form, supplier, procedure and agency cards
  - `Evidencia`: caveats, receipt and contextual citations
  - `Mapa`: official point card or data-gap copy
  - `Relacionados`: similar case cards or neutral empty state

- [x] **Step 3: Add CSS**

Add classes for:

- `detailSummaryGrid`
- `moneyTrailStrip`
- `moneyTrailCell`
- `moneyTrailValue`
- `moneyTrailMeta`
- `detailTabs`
- `detailTabButton`
- `detailTabButtonActive`
- `detailTabPanel`
- `detailTabGrid`
- `detailEmpty`

Keep mobile layout stacked and prevent horizontal overflow.

- [x] **Step 4: Run focused test**

```bash
node --experimental-strip-types --test tests/explorerViewIntegration.test.ts
```

Expected: PASS.

## Task 3: Full Validation And Visual Smoke

- [x] **Step 1: Run full checks**

```bash
npm test
npm run typecheck
npm run build
```

Expected: PASS.

- [x] **Step 2: Browser smoke**

Open `/pais/AR` on the local dev server and verify:

- summary and money strip appear before tabs;
- tabs do not overflow on desktop;
- selected case remains readable;
- no raw technical evidence appears first.

- [x] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-22-explorer-case-detail-v2-implementation.md tests/explorerViewIntegration.test.ts src/components/Explorer/ExplorerView.tsx src/components/Explorer/Explorer.module.css
git commit -m "Implement Explorer case detail tabs"
```
