# Investigation Case-Starter Workflow

> **For:** Faro Argentina
> **Date:** 2026-05-31
> **Goal:** Convert the current Explorer search, Carpetas, and Aportes surfaces into a tighter investigation workflow for journalists and researchers: find entities/places, start a folder with a question, link official expedientes with relation notes, accept private contributions with better case linkage, and keep all product caveats explicit.

## Principles

- Faro does not accuse. Every workflow must say what official evidence exists, what is missing, and what should be verified next.
- Carpetas are not generic saved lists. They are case-starter workspaces: question -> related expedientes -> relation notes -> evidence matrix -> verification steps -> export.
- Aportes are private review material. Nothing submitted by users becomes public automatically.
- Search should feel investigativo: province, locality, supplier, CUIT, organism, signal, source, alias, receipt, and expediente matches should be labeled by category.
- Do not add dependencies. Keep changes scoped to existing React components, data helpers, tests, and docs.

## Current State

- `ExplorerView` already has grouped search suggestions, but grouping/label helpers live inside the component.
- `Carpetas` can create workspaces, add cases, add notes, build a dossier, run analysis, and export. The search box still feels like a plain filter.
- `Aportes` has type-specific forms, privacy copy, and server submission. The related case field is still free text.
- `FaroExperience` passes `allCases` to Explorer and Carpetas, but not to Aportes.

## Target Shape

1. Shared investigative search presentation
   - Keep search matching/building in `src/lib/data/searchSuggestions.ts`.
   - Extract grouping/label/count UI into a small shared `SearchSuggestionGroups` component.
   - Keep Explorer behavior unchanged after the move.
   - Add tests for grouping priority and count copy.

2. Carpetas as a case-starter workflow
   - In `InvestigationsView`, build search suggestions from `allCases` using the shared helper.
   - In `CaseSearchPanel`, show categorized suggestions above filtered results.
   - Selecting a suggestion updates the query to the suggested entity/place/identifier.
   - Add a compact “empezar investigación” action in the resumen tab that moves the user to `Expedientes`.
   - Surface the carpeta’s investigation question in the overview so the workspace is anchored in a hypothesis/question, not just a title.
   - Default relation reason to a neutral working hypothesis, not judicial context.
   - Keep relation reason and relation note prominent before adding cases, with copy that asks what the expediente helps verify.
   - Add compact evidence context to result cards: source, signal/gap, and receipt basis where available.

3. Aportes with assisted case linkage
   - Pass `allCases` from `FaroExperience` into `AportesView`.
   - Replace the repeated free-text “Caso Faro relacionado” inputs with a single controlled field component.
   - Use a narrow case-link lookup, not the full investigative search surface.
   - Show only expediente/id/source-oriented suggestions while typing.
   - Selecting a case suggestion fills the submitted field with the case id.
   - Keep display search text separate from submitted `relatedCase`.
   - Preserve existing validation: corrections still require a related case; sources/photos can remain optional.
   - Reset the controlled related-case field after a successful submission.
   - Explain that this is a user-suggested link for review; it does not confirm relation and is not published automatically.

4. Documentation and agent contract
   - Update `docs/product/faro-product-context.md` with the investigation-workflow contract.
   - Update `AGENTS.md` only if it helps future agents avoid regressing Carpetas into saved lists or Aportes into public publishing.

## Implementation Steps

### Step 1: Extract reusable search suggestion presentation

Files:
- `src/components/SearchSuggestionGroups.tsx`
- `src/components/SearchSuggestionGroups.module.css`
- `src/components/Explorer/ExplorerView.tsx`
- `tests/searchSuggestions.test.ts`
- `tests/explorerViewIntegration.test.ts`

Changes:
- Add a small presentational component that groups suggestions, labels categories, formats counts, and calls `onSelectSuggestion`.
- Keep matching/building in `src/lib/data/searchSuggestions.ts`.
- Remove local presentation helpers from `ExplorerView`.
- Keep exact Explorer panel copy and layout.

Validation:
- Search tests confirm `Provincia` groups come before other groups.
- Explorer integration test confirms grouped suggestion rendering still exists.

### Step 2: Improve Carpetas case-starter loop

Files:
- `src/components/Investigations/InvestigationsView.tsx`
- `src/components/Investigations/InvestigationsChrome.tsx`
- `src/components/Investigations/InvestigationsView.module.css`
- `tests/investigationsViewIntegration.test.ts`

Changes:
- Compute `searchSuggestions` in `InvestigationsView`.
- Add `onSelectSearchSuggestion`.
- Pass suggestions into `CaseSearchPanel`.
- Render a small categorized suggestion block using the shared labels/counts.
- Add overview CTA: “Buscar primer expediente” / “Agregar más expedientes” that switches to the expedientes tab.
- Surface `workspace.investigationQuestion` when present.
- Change the initial relation reason to `manual_hypothesis`.
- Make the add-case prompt ask for the relationship to the investigation question.
- Expand result cards beyond title/id with source and a neutral signal/gap label.

Validation:
- Integration test asserts Carpetas uses `buildSearchSuggestions`, renders categorized suggestions, defaults to `manual_hypothesis`, has the overview CTA, and avoids accusatory copy.

### Step 3: Improve Aportes related-case linkage

Files:
- `src/components/FaroExperience.tsx`
- `src/components/Aportes/AportesView.tsx`
- `src/components/Aportes/AportesView.module.css`
- `src/lib/data/searchSuggestions.ts`
- `tests/aportesViewIntegration.test.ts`
- `tests/faroExperienceIntegration.test.ts`
- `tests/searchSuggestions.test.ts`

Changes:
- Extend `AportesView` props with `cases`.
- Add controlled `relatedCase` state.
- Add separate controlled `relatedCaseQuery` state.
- Add `RelatedCaseField` local component.
- Add `buildCaseLinkSuggestions` for narrow case/id/source lookup.
- Use the shared suggestion UI in compact mode for the related-case field.
- Keep the field name `relatedCase` so the existing API path is unchanged.
- For correction submissions, require a submitted case id or typed case/url; do not submit entity/location text as a confirmed relation.
- Add copy: “Ayuda a orientar la revisión; no confirma relación y no se publica.”

Validation:
- Integration test asserts Aportes receives cases, uses search suggestions, keeps related-case name, and preserves private-review copy.
- Unit test asserts case-link suggestions do not include aliases, signals, or broad locations.
- Existing contribution/API tests still pass.

### Step 4: Docs and durable context

Files:
- `docs/product/faro-product-context.md`
- `AGENTS.md`

Changes:
- Add a concise workflow section:
  - Explorer finds official records.
  - Carpetas converts them into investigation packages.
  - Aportes feeds private review, not publication.
  - All relationships need explicit relation reasons or caveats.

Validation:
- Quick grep for “case-starter”, “Aportes”, and “no se publica automáticamente”.
- Keep AGENTS change short and durable: approved private review material is still not public evidence; public use requires manual curation/redaction and explicit source/caveat handling.

### Step 5: Full validation

Commands:

```bash
node --experimental-strip-types --test tests/searchSuggestions.test.ts tests/explorerViewIntegration.test.ts tests/investigationsViewIntegration.test.ts tests/aportesViewIntegration.test.ts tests/faroExperienceIntegration.test.ts
node --experimental-strip-types --test tests/userContributions.test.ts tests/aportesApi.test.ts tests/adminAportesApi.test.ts tests/adminLinkedAportesApi.test.ts tests/contributionReviewDb.test.ts
npm run typecheck
npm run build
```

Browser checks:
- `http://localhost:3002/pais/AR?mode=explorer`
  - Type `Buenos Aires`; first suggestion group should be `Provincia`.
- `http://localhost:3002/pais/AR?mode=investigations`
  - Type `CPC` or `Buenos Aires`; suggestions should show categories before result rows.
  - Overview CTA should switch to Expedientes.
  - Add-case controls should default to a neutral hypothesis, not judicial context.
- `http://localhost:3002/pais/AR?mode=aportes`
  - Type in “Caso Faro relacionado”; suggestions should appear.
  - Selecting a case should fill the case id.
  - The field copy should make clear the suggested link is private review metadata.

## Review Questions For Subagents

1. Product workflow: Does this make Carpetas materially more useful for journalists/researchers, or is it mostly presentation?
2. Engineering: Are the files and tests scoped enough? Is helper extraction justified by at least three use cases?
3. Privacy/security: Does the Aportes change preserve anonymity, private review, and no auto-publication?
