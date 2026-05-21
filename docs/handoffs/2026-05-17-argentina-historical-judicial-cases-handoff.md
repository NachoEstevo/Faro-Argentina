# Argentina Historical-Judicial Cases Handoff

Date: 2026-05-17

## What Changed

Faro now includes a curated Argentina historical-judicial context dataset:

- 1 CIJ Causa Vialidad context case.
- 5 MPF Causa Vialidad historical public-work context cases.
- 1 MPF Cuadernos / La Camarita network context case.
- 5 Cuadernos / La Camarita supplier-context cases linked to existing Faro
  CONTRAT.AR contract receipts.

The total checked-in corpus is now:

- 558 Argentina cases.
- 5 generated datasets.
- 1946 receipts.
- 8 raw snapshots in the manifest.

## Sources Added

- `AR-CIJ-VIALIDAD-VEREDICTO`
- `AR-MPF-VIALIDAD-ALEGATO`
- `AR-MPF-CUADERNOS-CAMARITA`
- `AR-CONTRATAR-HISTORICO-OBRAS` as an auxiliary older Argentina source.

Raw curated extracts live in:

- `data/official/ar/cij-vialidad-context.json`
- `data/official/ar/mpf-vialidad-alegato-context.json`
- `data/official/ar/mpf-cuadernos-camarita-context.json`

Generated cases live in:

- `src/data/argentinaHistoricalJudicialCases.json`

## Product Rule

These records are context and leads, not accusations.

Vialidad is modeled separately because the current Faro snapshots do not contain
a clean direct match to the 51 works from the judicial record.

Cuadernos / La Camarita supplier cases are linked to existing Faro contracts only
at entity/provider level. The related contracts are not represented as
judicialized contracts. The caveats must stay visible in exports and expediente
views.

## Implementation

Builder:

- `src/lib/data/argentinaHistoricalJudicial.ts`
- `scripts/build-argentina-historical-judicial-cases.ts`

Repository integration:

- `src/lib/caseRepository.ts` appends the generated cases to
  `investigatorCaseFiles` and includes the datasets in `dataSpineCoverage`.

Signals:

- `official_judicial_context` is a lead-eligible context signal.
- Missing geometry remains a data gap.
- No historical-judicial record is map-ready.

## Verification

Passing:

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run data:verify`
- `npm run data:quality-report`
- `npm run data:geo-report`

`npm run data:geo-report` now reports 633 total cases and 413 map-eligible
cases. The new judicial/historical cases remain off-map because they do not have
official validated geometry.

## Next Step

The strongest next data step is not more UI. It is loading the 51 Causa Vialidad
works from official judicial exhibits or an official administrative table with a
documentable join, then adding traces only where official geometry exists.
