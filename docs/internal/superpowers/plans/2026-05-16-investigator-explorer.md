# Investigator Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first scanner-style Investigator Explorer so users can search, filter, pivot, open expedientes, and continue tracing official records without depending on map geometry.

**Architecture:** Add a pure Explorer view-model module first, cover it with tests, then add a focused React scanner component and integrate it into the current `FaroExperience` with a Map / Explorer mode switch. Reuse the existing expediente panel for detail reading.

**Tech Stack:** Next.js App Router, React, TypeScript, existing static case files, existing `caseSignals`, `evidenceReceipts`, and `CaseDetails` components.

---

## File Structure

- Create `src/lib/data/investigatorExplorer.ts`: builds scanner rows, search/filter behavior, and pivot facets.
- Create `tests/investigatorExplorer.test.ts`: covers cross-country scanning, search, filters, pivots, and safe language.
- Create `src/components/InvestigatorExplorer.tsx`: client scanner UI with controls, pivot chips, and row selection.
- Modify `src/components/FaroExperience.tsx`: adds Map / Explorer mode and keeps selected expediente state coherent across modes.
- Modify `src/app/globals.css`: adds focused scanner styling.
- Document scope in `docs/internal/superpowers/specs/2026-05-16-investigator-explorer-design.md`.

## Tasks

### Task 1: Explorer Domain

- [ ] Add failing tests for row shaping, query search, geometry filtering, entity pivots, and non-accusatory copy.
- [ ] Implement `buildInvestigatorExplorer`.
- [ ] Export small typed filters and row/facet models.
- [ ] Run `node --experimental-strip-types --test tests/investigatorExplorer.test.ts`.

### Task 2: Scanner UI

- [ ] Add `InvestigatorExplorer.tsx`.
- [ ] Render search, country controls, geometry controls, signal selector, pivot chips, and scanner rows.
- [ ] Keep the row copy short and evidence-first.
- [ ] Row click calls the parent selection callback with the case id.

### Task 3: Experience Integration

- [ ] Add Map / Explorer state to `FaroExperience`.
- [ ] Read `mode=explorer` from the URL when present.
- [ ] In Explorer mode, select cases from all countries rather than only the current map country.
- [ ] Keep the existing `CaseDetails` panel as the selected expediente surface.

### Task 4: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Start the dev server and smoke-test Map / Explorer navigation locally.
