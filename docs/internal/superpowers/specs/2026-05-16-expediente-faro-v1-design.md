# Expediente Faro V1 Design

Date: 2026-05-16
Status: approved design scope, pending implementation plan

## Product Thesis

Faro turns official public-data fragments into verifiable investigation files.
It does not accuse, rank countries by wrongdoing, or replace human review. It
helps a user understand what is worth looking at, why it appeared, what official
evidence supports it, what is missing, and what to verify next.

The map is a strong entry point when official geometry exists, especially for
Argentina public works. The product unit, however, is the expediente: a
navigable case file that can also work for Peru and Chile records without
official coordinates.

## Problem

Official public-money data is fragmented across datasets, portals, formats, and
generic links. A serious user loses time before knowing whether a record is
worth reviewing. A casual visualization can also overstate weak evidence.

Faro should reduce the time between a public-data signal and a reproducible
verification path.

## Primary Users

- Journalists and watchdogs who need leads, evidence, caveats, and exports.
- Auditors or civic institutions that need traceability, source coverage, and
  reproducible review paths.
- Interested citizens who need plain-language explanations before raw data.

V1 should not optimize for a mass-consumer accusation experience. It should feel
like a serious civic investigation tool with a simple first path.

## V1 Promise

In less than 30 seconds, a user understands why a case appeared. In less than 2
minutes, the user can open the official source or export an evidence pack for
external review.

## Core Flow

1. Lead feed or map answers: what is worth looking at first?
2. Expediente answers: why does this case matter?
3. Official trail answers: what evidence supports it?
4. Next verification answers: what should be checked before concluding?

The product route is:

```text
source data -> normalized case -> signal -> expediente -> evidence/export -> next verification
```

## Feature Scope

### Lead Feed

The lead feed is a prioritized list of cases generated from existing
`caseSignals` logic. It should be easy to scan and should not require the user
to understand the map first.

Each lead should show:

- country;
- case title;
- strongest signal;
- source id;
- key metric when available;
- confidence or readiness language;
- action to open the expediente.

Initial signals come from existing data:

- single bidder;
- limited competition;
- amount over official budget;
- high claim volume;
- official award act available;
- cross-source evidence;
- supplier identified;
- official geometry;
- Sentinel-2 candidate;
- missing official geometry;
- missing payment or progress verification.

### Expediente Faro

The expediente is the main product surface. It should be a navigable case file,
not a raw table.

The V1 expediente has five sections:

1. Summary: plain-language sentence plus amount, organism, supplier, date,
   location when available, and evidence level.
2. Why It Appeared: the signals that explain why this case is worth reviewing.
   Each signal must include evidence, caveat, and next action.
3. Official Trail: source receipt, source URL, locator type, file hash, raw
   path, parser version, extracted timestamp, and related receipts.
4. Investigation Context: similar cases by supplier, organism, or signal when
   available from current data; satellite candidate context only when geometry
   and timing support it.
5. Actions: open official source, download evidence pack, return to feed/map,
   and inspect JSON when useful.

### Official Trail

Receipts should be explained with human labels:

- official detail;
- official search;
- official dataset;
- missing exact URL.

The UI must avoid presenting a dataset URL as if it were a direct official
record page. If the record only has a dataset-level locator, say that clearly.

### Evidence Pack

The export should remain a durable artifact. It should include:

- case file;
- primary receipt;
- related receipts;
- signals;
- caveats;
- verification steps;
- generated timestamp.

The export should be useful outside the UI.

### Map Mode

The map is used when a case has official coordinates and enough caveats to be
shown safely. Argentina can be the first map-driven demo path.

Peru and Chile records should still be first-class exportable expedientes even
when they cannot be mapped. They should not be forced onto the map through
inferred geometry.

## UX Principles

- Every screen answers one question.
- Start with "why this appeared", not raw fields.
- Caveats are visible near the claim they qualify.
- A missing layer is shown as a coverage gap, not hidden.
- The UI uses plain labels first and technical receipt fields second.
- No accusatory language.
- No country wrongdoing ranking.
- No satellite implication unless the case has official geometry and a suitable
  time anchor.

## Non-Goals For V1

- No database migration or Postgres dependency.
- No assistant or generated narrative answers.
- No country score.
- No public-money ledger rewrite.
- No new countries unless a concrete source-backed case requires it.
- No inferred map points from names, supplier addresses, or weak geocoding.
- No UI rebuild before the core flow is clear.

## Implementation Boundaries

Use the current static data spine and existing TypeScript modules:

- `src/lib/caseRepository.ts`
- `src/lib/data/caseSignals.ts`
- `src/lib/data/evidenceReceipts.ts`
- `src/lib/data/caseCollections.ts`
- `src/lib/data/uiGates.ts`

Keep route handlers thin. Any new lead ranking, case-file shaping, or receipt
labeling logic belongs in `src/lib/data` or `src/lib/caseRepository.ts`, not in
React components.

## Acceptance Criteria

- A user can start from a prioritized lead feed or map point.
- Opening a case explains why it appeared before showing technical details.
- Each signal includes evidence, caveat, and a next verification action.
- The official trail distinguishes direct detail links from dataset-level
  receipts.
- The evidence pack downloads and contains the case, receipts, signals, caveats,
  and verification steps.
- Peru and Chile cases remain usable without map coordinates.
- `npm test`, `npm run typecheck`, `npm run data:verify`, and `npm run build`
  pass after implementation.

## Open Product Decision

The first implementation slice should focus on Argentina contracts and works
with official geometry because that path can show the strongest map-to-expediente
demo. The same expediente model must work for Peru and Chile exportable cases so
the product does not become map-dependent.
