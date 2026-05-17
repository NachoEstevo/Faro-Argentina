# Argentina Contract Expansion Handoff

Date: 2026-05-17

## What Changed

Faro now builds the first 150 Argentina CONTRAT.AR contract cases instead of the
initial 50-case pilot batch.

This is intentionally not the full 391 non-empty contract rows in the snapshot.
The 150-case batch adds meaningful coverage while avoiding the noisier tail with
more missing years and eventual duplicate contract numbers.

## Current Shape

- 483 total cases.
- 408 Argentina cases.
- 150 Argentina contract cases.
- 305 map-eligible cases.
- 8 datasets.
- 1208 receipts.
- 14 raw files verified.

Argentina contract year distribution:

- 2017: 12
- 2018: 26
- 2019: 21
- 2020: 8
- 2021: 31
- 2022: 29
- 2023: 9
- sin year: 14

## Why 150

The 150-case batch has:

- no duplicate contract ids;
- all cases with supplier identity;
- all cases with amount;
- 97 cases with official coordinates;
- 123 contract cases with a lead-eligible signal before repository-wide context;
- 2023 coverage without importing the full low-quality tail.

The full 391-row expansion is possible later, but it introduces duplicate contract
numbers and 82 contracts without parseable year. That should be handled with a
dedupe/canonicalization pass before promoting everything.

## Validation

Passing after regeneration:

- `npm run data:build`
- `npm run data:verify`
- `npm run data:quality-report`
- `npm run data:geo-report`
- `npm test`
- `npm run typecheck`
- `npm run build`

## Product Caveat

More contracts improve investigation coverage, but they do not by themselves
prove payment, completion, wrongdoing or physical execution. Keep receipts,
competition signals, supplier recurrence and geometry QA visible in the UI.
