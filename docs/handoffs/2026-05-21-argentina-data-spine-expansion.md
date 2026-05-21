# Argentina Data Spine Expansion Handoff

Date: 2026-05-21

## What Changed

Faro now promotes the full canonical Argentina CONTRAT.AR contract set from the
checked-in official snapshot.

The previous cap was 300 contract cases. The generator now keeps all unique
`contrato_numero` rows and skips duplicate contract rows deterministically.

## Current Shape

- 647 total Argentina cases.
- 246 CONTRAT.AR public work cases.
- 389 canonical CONTRAT.AR contract cases.
- 12 historical-judicial context cases.
- 435 map-eligible cases after the coordinate gate.
- 2,332 receipts.
- 10 verified raw files.

Contract source shape:

- 392 raw CSV rows parsed by the snapshot profiler.
- 391 non-empty contract rows.
- 389 unique `contrato_numero` values.
- 2 duplicate contract numbers skipped from generated contract cases.
- 245 contract cases have raw official coordinates before the coordinate gate.

## Canonicalization Rules

Contracts:

- case id remains `AR-CONTRACT-<contrato_numero>`;
- first row for a `contrato_numero` wins;
- later duplicate rows are not promoted to separate contract cases;
- raw identity remains reproducible through the official snapshot and receipt.

Works:

- duplicate official `numero_obra` rows are preserved;
- generated case ids keep the first row unsuffixed and append `--row-N` to later
  rows;
- `caseFile.workNumber` and `caseFile.receipt.recordId` keep the original
  official `numero_obra`.

## Verification

Passing after regeneration:

- `node --experimental-strip-types --test tests/argentinaWorks.test.ts tests/argentinaContractCases.test.ts`
- `npm run data:build`
- `npm run data:verify`
- `npm run data:quality-report`
- `npm run data:geo-report`

Observed reports:

- `data:verify`: 5 datasets, 647 cases, 2,332 receipts, 10 raw files, 0 errors.
- `data:quality-report`: 647 AR cases, 389 contract cases, 435 map-eligible
  geometry cases, 0 blockers.
- `data:geo-report`: 647 total cases, 435 map-eligible cases, no duplicate case
  ids.

## Product Caveats

More contracts improve coverage, but they do not prove payment, completion,
wrongdoing or physical execution.

Keep these caveats visible:

- `payment_verification_gap` remains expected for contract-only records.
- Missing geometry remains searchable/exportable but off-map.
- `sign_suspect`, `placeholder_geometry`, `known_bad_geometry` and duplicated
  coordinate values must not be manually corrected.
- Historical-judicial context must not be merged into modern contracts without a
  documented official match.

## Next Data Work

- Investigate Mapa de Inversiones as a progress/advance source only after
  endpoint health and receipt generation are verified.
- Add source-quality language to Explorer and expediente for contracts vs works
  vs judicial context.
- Improve supplier recurrence confidence labels: document match vs name-only.
