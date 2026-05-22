# Explorer Case Detail V2 Design

Date: 2026-05-22
Scope: private Argentina fork
Status: approved design direction, pending implementation plan

## Goal

Redesign the Explorer case detail so a journalist can understand the value of an
expediente without scrolling through a long stack of cards.

The first screen should answer:

1. Why should I look at this case?
2. What is the most important money trail?
3. What still needs verification?
4. Where do I go next?

Faro still does not accuse. The detail view must show signals, official
evidence, caveats and next steps without implying guilt or proof.

## Approved Direction

Use the approved Option A: **investigative reading with a strong money trail**.

The top of the detail view should keep a stable summary visible:

- case id, country and agency;
- title limited to a readable two-line block;
- primary caveat when one exists;
- primary actions: `Informe PDF`, `Abrir fuente`, `Guardar en carpeta`;
- `Por que mirar este expediente`;
- `Proximo paso`;
- a three-column economic strip.

Below that, use tabs to avoid a long vertical scroll:

- `Resumen`
- `Dinero`
- `Actores`
- `Evidencia`
- `Mapa`
- `Relacionados`

The current long card stack should become tab content instead of all rendering
at once.

## Information Hierarchy

### Always Visible

The always-visible area is not a marketing hero. It is a work surface header.

It should include:

- metadata line: `AR · #record · agency`;
- title;
- short agency subtitle when useful;
- primary signals as small chips;
- a compact `Por que mirar` panel based on the strongest review signal;
- a compact `Proximo paso` panel using the signal action or expediente next
  verification step;
- money strip when amount or official budget exists;
- folder save controls, but visually lighter than the evidence summary.

### Money Strip

The money strip should be closer to the reference image provided by the user:
large numeric values, small labels and clear progression.

Preferred columns:

1. `Presupuesto oficial`
2. `Adjudicado` or source-specific amount label
3. `Variacion`

If data is missing:

- keep the available columns;
- show a neutral gap label such as `Sin presupuesto oficial` or
  `Pago/avance pendiente`;
- never invent estimates.

Color rules:

- blue: action or official source affordance;
- green: available verified datapoint;
- yellow: review gap, caveat or value requiring interpretation;
- red: only real errors or blocked states, not investigation signals.

### Tabs

Tabs should keep the detail digestible for non-technical users.

`Resumen`

- compact competition summary;
- compact chronology summary;
- location summary;
- top caveats.

`Dinero`

- full amount rows currently in `MontoCard`;
- budget, award, variation and available USD equivalents;
- payment or progress gaps when known;
- copy must distinguish budget, adjudication, contextual amount and payment.

`Actores`

- supplier;
- agency;
- procedure;
- related identifiers;
- relation controls for saving the expediente into a carpeta.

`Evidencia`

- official receipt;
- locator type and caveat;
- raw path/hash details;
- contextual citations clearly separated from official evidence.

`Mapa`

- official geometry if map-eligible;
- administrative-reference caveat;
- OpenStreetMap link;
- data-gap copy when not map-ready.

`Relacionados`

- similar cases;
- shared agency/supplier reason;
- affordance to add related cases to a carpeta.

## Component Boundaries

Keep the route/controller thin. This should remain inside the Explorer
component layer and existing data helpers.

Expected frontend units:

- `ExplorerDetail`
  Owns selected case layout and active tab state.
- `CaseDetailSummary`
  Renders title, primary reason, next step and chips.
- `MoneyTrailStrip`
  Renders the three-column economic strip.
- `CaseDetailTabs`
  Owns tab buttons and selected tab.
- Existing detail cards
  Reused inside tab panels where possible: `MontoCard`, `CronologiaCard`,
  `CompetenciaCard`, `ProveedorCard`, `ProcedimientoCard`, `OrganismoCard`,
  `PuntoGeoCard`.

Do not introduce a generic tab framework unless another non-Explorer surface
needs it. Local duplication is acceptable if it keeps the implementation clear.

## Data Rules

- Use existing `buildCaseSignals(caseFile)` for primary signal selection.
- Use existing receipt helpers for official source links.
- Use existing amount formatting helpers.
- Do not compute a wrongdoing score.
- Do not infer or geocode coordinates.
- Do not treat missing payment/progress as proof of anything.
- Keep dataset catalog URLs described as official source pages, not direct case
  pages.

## Responsive Behavior

Desktop:

- summary panels use a two-column layout;
- money strip uses three columns;
- tabs stay in one row when space allows.

Tablet/mobile:

- summary panels stack;
- money strip stacks or becomes horizontally scrollable if values need fixed
  width;
- tabs become a compact two-column grid or horizontal scroll;
- title must not overflow the viewport.

## Accessibility

- Use real buttons for tabs with `role="tab"` and `aria-selected`.
- Preserve keyboard focus states.
- Keep action text visible, not icon-only.
- Do not rely only on color for meaning; color must be paired with copy such as
  `brecha`, `fuente`, `disponible` or `pendiente`.

## Acceptance Criteria

- A user can understand the primary reason to review a selected case without
  scrolling.
- Amount, budget and variation are visually prominent when present.
- Long evidence, actor and related-case data is separated into tabs.
- No UI copy implies corruption, guilt, fraud or proof.
- Cases without geometry remain readable and exportable.
- Existing report/source/export actions still work.
- Existing folder save flow still works.
- Mobile layout has no horizontal overflow.

## Verification

Focused tests:

- Explorer detail renders the approved tab labels.
- Explorer detail includes `Por que mirar` and `Proximo paso`.
- Explorer detail uses the money strip when amount/budget data exists.
- Explorer detail does not render all long technical evidence as the first
  visible block.
- Explorer detail keeps non-accusatory copy.

Full checks:

```bash
npm test
npm run typecheck
npm run build
```

Visual checks:

- `/pais/AR` with a selected contract case.
- `/pais/AR?mode=explorer` on desktop width.
- Mobile viewport around 390px wide.

## Non-Goals

- No auth.
- No backend persistence changes.
- No new data ingestion.
- No ML ranking.
- No new map geocoding.
- No broad Explorer rewrite beyond the case detail layout.
