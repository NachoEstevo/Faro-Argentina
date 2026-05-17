# Faro Agent Onboarding

Date: 2026-05-16
Audience: new agents, engineers and collaborators cloning this repo
Status: current handoff after investigator explorer and coordinate quality gate

## What Faro Is

Faro converts official public data into verifiable investigation files.

The product is not a corruption accusation engine. It is a source-backed workflow
for asking:

```text
What is happening with public money here, and what can be verified?
```

The core path is:

```text
map/scanner -> lead -> expediente -> official trail -> caveats -> export
```

The most important product unit is the expediente, not the map point.

## Current Product Surfaces

### Entry Screen

`src/components/EntryGate.tsx`

First-visit screen with three paths:

- understand Faro;
- enter the map;
- open investigator mode.

### Map Mode

Main orchestration lives in `src/components/FaroExperience.tsx`.

The map receives `argentinaWorkDataset`, which is now map-safe only. Map-visible
cases must pass the coordinate quality gate.

Important rule: a case can be a valid expediente without being map-visible.

### Investigator Mode

Main files:

- `src/components/InvestigatorExplorer.tsx`
- `src/components/CaseInspector.tsx`
- `src/lib/data/investigatorExplorer.ts`
- `src/lib/data/caseInspector.ts`

This mode scans all current expedientes, including cases without official
geometry and cases whose geometry needs review.

### Expediente And Evidence

Main files:

- `src/lib/data/expediente.ts`
- `src/lib/data/caseSignals.ts`
- `src/lib/data/evidenceReceipts.ts`
- `src/lib/caseRepository.ts`

The expediente explains why a case appeared, what official trail supports it,
what caveats apply and what should be checked next.

## Data Architecture

Raw official snapshots live under:

```text
data/official/
```

Generated app data lives under:

```text
src/data/
```

The source catalog is:

```text
data/sources/source-catalog.json
```

Build and verification scripts live under:

```text
scripts/
```

Repository facade:

```text
src/lib/caseRepository.ts
```

This facade exposes:

- map-safe Argentina dataset;
- full investigator case list;
- case lookup;
- lead feed;
- expediente lookup;
- evidence packs;
- readiness/coverage data.

## Coordinate Quality Gate

Core files:

- `src/lib/data/coordinateQuality.ts`
- `src/lib/data/coordinateQualityReport.ts`
- `src/lib/data/uiGates.ts`
- `scripts/report-coordinate-quality.ts`

The gate classifies coordinates as:

- `valid_official_geometry`
- `missing_geometry`
- `invalid_coordinate`
- `placeholder_geometry`
- `duplicated_value_geometry`
- `sign_suspect`
- `outside_country_bounds`
- `unsupported_country`

Only `valid_official_geometry` can reach the map.

Do not correct coordinates. For example, if a coordinate looks like it is missing
a negative sign, classify it as `sign_suspect` and leave it out of the map.

Current report:

```bash
npm run data:geo-report
```

Expected current shape:

- `1608` total expedientes;
- `1099` map eligible;
- map eligibility by country: `413/558` AR, `469/525` PE, `217/525` CL;
- invalid AR coordinates remain available as data gaps.

## Duplicate Official Rows

Some official Argentina work rows repeat the same official `numero_obra`.

`src/lib/caseRepository.ts` assigns runtime ids such as:

```text
AR-WORK-501-0003-OBR22--row-2
```

This prevents one duplicate row from hiding another in `/api/cases/[id]` or
`/api/export/[id]`.

The official identity is still preserved in:

```text
caseFile.workNumber
caseFile.receipt.recordId
```

Do not treat the runtime suffix as an official identifier.

## Commands

```bash
npm install
npm run dev
npm run data:geo-report
npm run typecheck
npm run build
```

Focused coordinate-gate tests:

```bash
node --experimental-strip-types --test \
  tests/coordinateQuality.test.ts \
  tests/coordinateQualityReport.test.ts \
  tests/uiGates.test.ts \
  tests/caseSignals.test.ts \
  tests/explorerCases.test.ts \
  tests/exportBundles.test.ts
```

Full test suite:

```bash
npm test
```

Current state: full `npm test`, `npm run typecheck`, `npm run build` and the
data spine verifier pass in the checked-in snapshot.

## Current Priorities

1. Canonicalize duplicate public works while preserving source rows and receipts.
2. Expand Argentina, Peru and Chile with validated official sources and useful
   cross-source joins.
3. Keep satellite work dependent on validated geometry and date anchors.
4. Deepen historical-judicial Argentina cases only when the official join is
   documentable.

## What Not To Do

- Do not infer map points from text, suppliers, agencies or weak geocoding.
- Do not hide missing data; show it as a gap.
- Do not add accusations or wrongdoing rankings.
- Do not present contracts/adjudications as payments unless a payment source
  supports it.
- Do not remove caveats to make the UI feel cleaner.
