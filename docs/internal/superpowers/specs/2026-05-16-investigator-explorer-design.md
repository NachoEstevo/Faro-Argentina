# Investigator Explorer Design

Date: 2026-05-16
Status: approved direction, first implementation slice

## Product Thesis

Faro needs a scanner-style mode for following public-money records without
depending on the map. The map answers where a case is when official geometry
exists. The Investigator Explorer answers how to trace a case through official
records, receipts, suppliers, organisms, sources, and signals.

The reference is a blockchain explorer only at the interaction level: search,
click an event, inspect evidence, pivot to related entities, and keep tracing.
Faro should not call records "transactions" unless a source actually contains a
payment or transfer. The safe product language is expediente, evento oficial,
rastro, entidad, receipt, and fuente.

## Problem

The current V1 flow can open a strong expediente from a lead feed or map point.
It does not yet let an investigator start from a provider, organism, source,
receipt id, signal, or free-text search and then follow related records.

That makes Faro useful as a demo, but less useful as a working investigation
tool.

## Users

- Journalists and watchdogs who need to search names, follow entities, and
  export evidence.
- Auditors and civic institutions that need source-level traceability.
- Citizens who need a simple path from "what is this?" to "what can I verify?"

## Core Promise

A user can type a provider, organism, procedure, source, or receipt id, open a
case, and then pivot to related official records without losing the evidence
context.

## MVP Scope

### Explorer Mode

Add a mode beside the current map experience:

- Map: territory-first, only with official geometry.
- Explorer: evidence-first, works for all countries and cases.

The Explorer opens as a scanner-style surface with filters, rows, pivots, and a
selected expediente panel.

### Scanner Rows

Each row represents one official case or expediente-ready event. A row should
show enough information to decide whether to open it:

- country;
- type;
- title;
- organism;
- supplier when available;
- amount when available;
- primary signal;
- source;
- receipt locator label;
- geometry status.

Rows are not accusations or rankings. Sort order can prioritize stronger signals
and traceability, but labels must remain investigative.

### Search And Filters

Search should match:

- case id;
- title;
- work or procedure number;
- organism;
- supplier name or document;
- source id or source name;
- receipt record id;
- signal code or label.

Initial filters:

- country: all, Argentina, Peru, Chile;
- geometry: any, with official geometry, without official geometry;
- signal: all or one signal code;
- entity pivot when selected.

### Pivots

The first pivot layer should support:

- supplier;
- organism;
- source;
- signal.

Clicking a pivot filters the scanner to related cases and keeps the selected
expediente available. Later versions can promote these pivots into dedicated
entity pages.

### Expediente Panel

The existing expediente panel remains the reading surface. The Explorer should
reuse it rather than inventing a second detail view.

Clicking a scanner row opens:

- summary;
- why it appeared;
- official trail;
- caveats;
- next verification;
- export action.

### Non-Goals

- No wrongdoing score.
- No country ranking.
- No inferred map points.
- No new dependency.
- No database migration.
- No payment-flow language unless a source supports payments directly.
- No full visual redesign before the workflow is functional.

## Architecture

Add a pure data module under `src/lib/data` that turns existing case files into
Explorer rows and pivot facets. React should consume that view model. Route
handlers, if added later, should stay thin and call the same module.

Use existing data:

- case files;
- case signals;
- evidence receipts;
- receipt locator presentation;
- expediente builder.

## Acceptance Criteria

- The main experience has a clear Map / Explorer mode switch.
- Explorer mode scans cases across AR, PE, and CL, including cases without
  official geometry.
- Search finds supplier, organism, source, procedure, case id, receipt id, and
  signal text.
- Rows open the existing expediente panel.
- Pivot chips can narrow the scanner by supplier, organism, source, or signal.
- Geometry and receipt locator status are visible without implying weak data is
  stronger than it is.
- Tests cover row shaping, search, filters, pivots, and non-accusatory copy.
- `npm test`, `npm run typecheck`, and `npm run build` pass.
