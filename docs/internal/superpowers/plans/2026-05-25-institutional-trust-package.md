# Institutional Trust Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make Faro presentation-ready through stronger selected cases, serious Aportes privacy language, and a concise institutional presentation package.

**Architecture:** Keep the app map-first and evidence-first. Reuse existing data modules and UI surfaces: `curatedCases`, Explorer selected preset, Aportes, admin Aportes detail and static legal pages. Add one documentation artifact for the institutional route.

**Tech Stack:** Next.js App Router, React components, CSS modules, Node test runner with `--experimental-strip-types`.

---

## Files

- Modify: `src/data/curatedCases.ts`
- Modify: `src/components/Explorer/ExplorerView.tsx`
- Modify: `src/components/Explorer/Explorer.module.css`
- Modify: `src/components/Aportes/AportesView.tsx`
- Modify: `src/components/Admin/AdminAportesDetail.tsx`
- Modify: `src/app/privacidad/page.tsx`
- Modify: `src/app/seguridad/page.tsx`
- Modify: `src/app/aportes/politica/page.tsx`
- Create: `docs/presentation/2026-05-25-institutional-demo-package.md`
- Modify tests:
  - `tests/curatedCases.test.ts`
  - `tests/explorerViewIntegration.test.ts`
  - `tests/aportesViewIntegration.test.ts`
  - `tests/adminAportesViewIntegration.test.ts`
  - `tests/userContributions.test.ts`

## Task 1: Selected Cases And Explorer Rationale

- [x] Add a fifth selected case only if it passes existing receipt, caveat and geometry tests: `AR-CONTRACT-74-0052-CON23`.
- [x] Extend curated metadata with a short `presentationReason`.
- [x] Render compact selected-case rationale in the Explorer selected preset banner.
- [x] Keep `/` unchanged except for the discreet trust-strip link.
- [x] Update tests so selected cases may be 4 to 6, every case has `presentationReason`, and Explorer source contains the rationale UI.

Run:

```bash
node --experimental-strip-types --test tests/curatedCases.test.ts tests/explorerViewIntegration.test.ts
```

Expected: all tests pass.

## Task 2: Public Aportes Privacy Clarity

- [x] Add upload-adjacent copy explaining no-contact mode, filename redaction and file metadata limits.
- [x] Keep "sin contacto" wording instead of promising anonymous submission.
- [x] Ensure contact mode still requires email and no-contact mode clears contact fields.
- [x] Add or update tests for privacy copy, metadata caveat and contact email requirement.

Run:

```bash
node --experimental-strip-types --test tests/aportesViewIntegration.test.ts tests/userContributions.test.ts
```

Expected: all tests pass.

## Task 3: Admin Privacy Visibility

- [x] Show `privacyMode` in `AdminAportesDetail` as "Sin contacto" or "Permite contacto".
- [x] Add a reviewer note that private files may still contain metadata.
- [x] Update admin view integration tests.

Run:

```bash
node --experimental-strip-types --test tests/adminAportesViewIntegration.test.ts
```

Expected: all tests pass.

## Task 4: Static Policy Pages

- [x] Update privacy policy with what is stored, what is not published, provider/log caveats, rights timelines and legal closure items.
- [x] Update security page with no-contact limits, file metadata, private bucket/admin role expectations and sensitive-use warning.
- [x] Update Aportes policy with retention/review semantics and "approved is not true or public".
- [x] Keep legal pages as light printable/readable documents, not dark workbench UI.

Run:

```bash
node --experimental-strip-types --test tests/aportesViewIntegration.test.ts
```

Expected: legal route tests pass.

## Task 5: Presentation Package

- [x] Create `docs/presentation/2026-05-25-institutional-demo-package.md`.
- [x] Include route sequence, curated case list, script, evidence boundaries, presenter checklist and forbidden claims.
- [x] Keep the package grounded in actual routes and selected case ids.
- [x] Add non-accusatory copy assertions to `tests/curatedCases.test.ts`.

Run:

```bash
node --experimental-strip-types --test tests/curatedCases.test.ts
```

Expected: presentation copy remains non-accusatory.

## Task 6: Final Validation

- [x] Run focused tests:

```bash
npm test -- tests/curatedCases.test.ts tests/explorerViewIntegration.test.ts tests/aportesViewIntegration.test.ts tests/adminAportesViewIntegration.test.ts tests/userContributions.test.ts
```

- [x] Run full checks:

```bash
npm run typecheck
npm run build
git diff --check
```

- [x] If any count in docs is changed, run (no aplica: no se actualizaron conteos de datos):

```bash
npm run data:verify
npm run data:geo-report
npm run data:quality-report
```

Expected: tests, typecheck, build and diff check pass. Data checks are required only if counts are updated.
