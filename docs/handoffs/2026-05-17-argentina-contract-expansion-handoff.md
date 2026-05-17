# Argentina Contract Expansion Handoff

Date: 2026-05-17

## What Changed

Faro now builds the first 300 Argentina CONTRAT.AR contract cases instead of the
initial 50-case pilot batch.

This is intentionally not the full 391 non-empty contract rows in the snapshot.
The 300-case batch adds meaningful coverage while avoiding the later tail that
introduces duplicate contract numbers.

## Current Shape

- 633 total cases.
- 558 Argentina cases.
- 300 Argentina contract cases.
- 413 map-eligible cases.
- 8 datasets.
- 2046 receipts.
- 14 raw files verified.

Argentina contract year distribution:

- 2017: 12
- 2018: 26
- 2019: 21
- 2020: 12
- 2021: 59
- 2022: 87
- 2023: 31
- sin year: 52

## Why 300

The 300-case batch has:

- no duplicate contract ids;
- all cases with supplier identity;
- all cases with amount;
- 215 cases with official coordinates;
- 254 contract cases with a lead-eligible signal before repository-wide context;
- 2023 coverage without importing the duplicate-heavy tail.

The full 391-row expansion is possible later, but it introduces duplicate contract
numbers and 82 contracts without parseable year. That should be handled with a
dedupe/canonicalization pass before promoting everything.

The 350-case cut was also tested and rejected for this pass because it already
introduced 2 duplicate contract ids / record ids.

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
