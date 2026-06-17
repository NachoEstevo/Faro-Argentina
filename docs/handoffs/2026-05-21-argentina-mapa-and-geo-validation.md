# Argentina Mapa de Inversiones and Geo Validation Handoff

Date: 2026-05-21

## What Changed

- Added `AR-MAPA-INVERSIONES-OBRAS` as an active Argentina source.
- Fetched and checked in `data/official/ar/mapa-inversiones-obras.csv`.
- Generated `src/data/argentinaInvestmentMapCases.json` with 7,285 progress
  projects.
- Connected those projects to Explorer, expediente, exports, quality reports and
  data-spine verification.
- Hardened the coordinate gate so southern Atlantic coordinates inside the broad
  Argentina bounding box no longer reach the map.

## Current Shape

- 7,932 total Argentina cases.
- 246 CONTRAT.AR public work cases.
- 389 canonical CONTRAT.AR contract cases.
- 7,285 Mapa de Inversiones progress cases.
- 12 historical-judicial context cases.
- 426 map-eligible cases after the coordinate gate.
- 9,617 receipts.
- 11 verified raw files.

## Mapa de Inversiones Rules

The current Mapa CSV has project ids, work numbers, amounts, stage, physical and
financial progress, province/department and an official profile URL.

It does not include latitude/longitude columns in the current snapshot.

Therefore:

- Mapa cases are searchable and exportable.
- Mapa cases get reproducible receipts and `official_detail` profile links.
- Mapa cases do not draw map markers.
- Mapa cases emit `official_progress_declared` and `missing_official_geometry`.
- Mapa counterpart names stay available as context, but do not create supplier
  recurrence leads by themselves.

## Geo Gate Rules

The previous gate blocked two known bad work ids, but contract cases reusing the
same official ocean coordinates still passed.

The gate now also blocks far southern Atlantic coordinates with:

- `lat <= -53`
- `lon >= -60`

This catches the known ocean duplicates while preserving mainland/Tierra del
Fuego points west of the Atlantic band. The original coordinate remains in the
case data as a review gap; Faro does not correct or replace it.

The gate also blocks the reviewed Rio de la Plata coordinate
`-34.392726, -58.312183`, which CONTRAT.AR reports for DNV signage works and
related contracts but which falls near Playa Honda. Those cases stay in the data
as official-coordinate review gaps and are not drawn on the map.

## Verification

Passing after regeneration:

- `npm run data:build`
- focused tests for investment-map parsing, coordinate quality, map markers,
  explorer filters, coverage, data-spine verification and export bundles
- `npm run data:geo-report`
- `npm run data:quality-report`

Observed reports:

- `data:geo-report`: 7,932 total cases, 426 map-eligible, 11 known-bad geometry
  records, 7,441 missing-geometry records.
- `data:quality-report`: 6 datasets, 7,932 cases, 7,935 raw rows, 9,617
  receipts, 11 raw files, 0 blockers.

## Next Data Work

- Find an official Mapa/Georef join that supplies project-level geometry without
  inferring coordinates from names.
- Add a source-specific Explorer filter for "con avance declarado" if the larger
  Mapa volume makes the default Explorer too noisy.
- Add a progress-focused case report section once there are at least two progress
  sources or an official certification/payment source to compare against.
