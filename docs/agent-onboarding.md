# Faro Argentina Agent Onboarding

Date: 2026-05-21
Audience: agents, engineers and collaborators cloning this private fork
Status: Argentina-focused workflow after private fork cleanup

## What Faro Is

Faro converts official public data into verifiable investigation files.

The product is not a corruption accusation engine. It is a source-backed
workflow for asking:

```text
What is happening with public money here, and what can be verified?
```

The core path is:

```text
map/explorer -> lead -> expediente -> official trail -> caveats -> export
```

The most important product unit is the expediente, not the map point.

## Product Surfaces

### Entry Screen

`src/components/EntryGate.tsx`

First-visit screen with three paths:

- understand Faro;
- enter the map;
- open investigator mode.

### Map Mode

Main orchestration lives in `src/components/FaroExperience.tsx`.

The map receives Argentina data only. Map-visible cases must pass the coordinate
quality gate.

Important rule: a case can be a valid expediente without being map-visible.

### Investigator Mode

Main files:

- `src/components/Explorer/ExplorerView.tsx`
- `src/components/Explorer/Explorer.module.css`
- `src/components/CaseInspector.tsx`
- `src/lib/data/investigatorExplorer.ts`
- `src/lib/data/caseInspector.ts`

This mode scans all current Argentina expedientes, including cases without
official geometry and cases whose geometry needs review.

### Expediente And Evidence

Main files:

- `src/lib/data/expediente.ts`
- `src/lib/data/caseSignals.ts`
- `src/lib/data/evidenceReceipts.ts`
- `src/lib/data/receiptOfficialSource.ts`
- `src/lib/caseRepository.ts`

The expediente explains why a case appeared, what official trail supports it,
what caveats apply and what should be checked next.

Public UI actions should use `getPublicOfficialSourceHref` so dataset receipts
open the official catalog or portal page instead of downloading raw files. Raw
receipt URLs remain part of exports and reproducibility.

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

Repository facade:

```text
src/lib/caseRepository.ts
```

This facade exposes:

- map-safe Argentina cases;
- full investigator case list;
- case lookup;
- lead feed;
- expediente lookup;
- evidence packs;
- readiness and coverage data.

## Coordinate Quality Gate

Core files:

- `src/lib/data/coordinateQuality.ts`
- `src/lib/data/coordinateQualityReport.ts`
- `src/lib/data/uiGates.ts`
- `scripts/report-coordinate-quality.ts`

Only `valid_official_geometry` can reach the map.

Do not correct coordinates. If a coordinate looks like it is missing a negative
sign, classify it as `sign_suspect` and leave it out of the map.

Current expected shape:

- `7.932` total expedientes;
- `426` map eligible after the gate;
- `7.285` Mapa de Inversiones projects are searchable/exportable as progress
  coverage, but stay off-map because the current CSV snapshot has no
  latitud/longitud columns;
- invalid and known-bad Argentina coordinates remain available as data gaps in
  Explorer/export, but must not be drawn on the map.

## Duplicate Official Rows

Some official Argentina work rows repeat the same official `numero_obra`.

`src/lib/data/argentinaWorks.ts` assigns stable generated ids such as:

```text
AR-WORK-501-0003-OBR22--row-2
```

This prevents one duplicate row from hiding another in reports, `/api/cases/[id]`
or `/api/export/[id]`.

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

Full verification:

```bash
npm run data:build
npm run data:verify
npm run data:geo-report
npm run data:quality-report
npm test
npm run typecheck
npm run build
```

Run the full suite before release work that changes code or data.

## Current Priorities

1. Keep the Argentina evidence spine reproducible.
2. Deepen source joins across contracts, works, suppliers, offers and opening
   acts.
3. Keep satellite and map work dependent on validated geometry and date anchors.
4. Expand historical-judicial context only when the official join is documentable.

## What Not To Do

- Do not infer map points from text, suppliers, agencies or weak geocoding.
- Do not hide missing data; show it as a gap.
- Do not add accusations or wrongdoing rankings.
- Do not present contracts/adjudications as payments unless a payment source
  supports it.
- Do not remove caveats to make the UI feel cleaner.
