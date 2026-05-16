# UI/UX Handoff: Expediente Faro V1

Date: 2026-05-16
Audience: UI/UX lead
Status: implemented product flow, ready for design iteration

## Why This Exists

This slice turns Faro from a map/data demo into an investigation flow.

The user should be able to answer five questions quickly:

1. What should I look at first?
2. Why did this case appear?
3. What official evidence supports it?
4. What is missing or uncertain?
5. What can I export or verify next?

The important product unit is the expediente, not the map point. The map is a
strong entry point when official geometry exists, especially for Argentina, but
Peru and Chile cases must still feel like first-class expedientes even without
map coordinates.

## Product Rule

Faro does not accuse. Faro shows where to look, why to look there, what evidence
exists, and what still needs verification.

Avoid UI language that implies guilt, corruption, fraud, ranking of wrongdoing,
or proof of misuse. Use language like:

- pista
- revisar
- evidencia oficial
- caveat
- falta verificar
- siguiente paso
- rastro oficial

## Current Flow

```text
official data -> normalized case -> signal -> lead -> expediente -> evidence pack
```

The implemented screen flow is:

1. User opens the map/demo.
2. Left side shows filters and a prioritized lead feed.
3. User selects a lead or map point.
4. Right panel opens the expediente.
5. User sees why it appeared, the official trail, caveats, next verification
   steps, source link, and JSON evidence export.

## What The Lead Feed Shows

File: `src/components/LeadFeed.tsx`

Data source: `buildCaseLeads` in `src/lib/data/caseLeads.ts`

The lead feed is not a raw list. It is a prioritized set of cases built from the
strongest signal per case.

Each lead currently carries:

- country code;
- source name or source id;
- case title;
- strongest signal;
- one-line reason (`lead.why`);
- evidence/caveat/action in the lead model;
- selected state.

The lead feed answers: "What is worth opening first?"

Design opportunity:

- Make this feel like an investigation inbox or triage queue.
- The strongest signal should be scannable without reading the full card.
- Avoid making it look like a corruption ranking.
- Preserve the distinction between "watch", "ready", "gap", and "context".

## What The Expediente Shows

Files:

- `src/lib/data/expediente.ts`
- `src/components/CaseDetails.tsx`
- `src/components/CaseSignals.tsx`

The expediente view model has these sections:

1. Summary
2. Why It Appeared
3. Official Trail
4. Investigation Context
5. Actions / Next Verification

In the UI today, that maps to:

- header and metrics;
- "Por que aparecio";
- signal proof rows;
- "Rastro oficial";
- related receipts;
- source/export actions;
- optional visual trace / Sentinel context;
- "Que verificar despues".

The expediente answers: "Why is this case reviewable, and what can I verify?"

## Signals

File: `src/lib/data/caseSignals.ts`

Signals are explainers, not accusations.

Each signal has:

- `kind`: `watch`, `ready`, `gap`, or `context`;
- `label`: short UI label;
- `summary`: why the signal matters;
- `evidence`: what official field/source supports it;
- `caveat`: what the user must not overclaim;
- `action`: what to verify next.

The signal panel now shows all three proof fields:

- Evidencia
- Caveat
- Siguiente paso

Design opportunity:

- Caveats should stay close to the claim they qualify.
- Evidence should feel concrete but not overwhelming.
- Next steps should read like a checklist, not legal advice.

## Official Trail

File: `src/lib/data/evidenceReceipts.ts`

The official trail is the core trust surface.

Receipts include:

- source name;
- source URL;
- raw path;
- file hash;
- row hash;
- record id;
- locator type;
- parser version;
- extracted timestamp.

Locator labels are important:

- `Detalle oficial`: direct official detail record.
- `Busqueda oficial`: official search page using the record id.
- `Dataset oficial`: official dataset URL, not a direct record page.
- `Sin URL exacta`: Faro has receipt/hash metadata but no exact official URL.

Design rule:

Do not make a dataset URL look like a direct official case page. If the locator
is dataset-level, the UI should say that plainly.

## Evidence Pack

Endpoint: `/api/export/[id]`

The evidence pack is meant to survive outside the UI. It includes:

- case file;
- primary receipt;
- related receipts;
- signals;
- caveats;
- verification steps;
- generated timestamp.

Design opportunity:

- The export action should feel like "download investigation package", not just
  "download JSON".
- Keep source/open/export actions clearly separated.

Important implementation detail:

Some case ids contain `/`. UI links must use the encoded hrefs already produced
by the model or call `encodeURIComponent(caseFile.id)`. Do not interpolate raw
ids into `/api/export/${id}` or `/api/cases/${id}`.

## Map And Geometry Rules

The map is only for cases with official geometry.

Do not infer map points from:

- supplier address;
- agency name;
- locality text;
- weak geocoding;
- user assumptions.

Argentina has map-ready cases because some records cross to official work
geometry. Peru and Chile currently remain usable as expedientes without map
points.

Sentinel-2 / visual trace rule:

Only show satellite or visual-trace affordances when the expediente has official
geometry and a suitable time anchor. If there is no official geometry, say that
Faro does not draw the case on the map yet.

## Current Country Behavior

Argentina:

- map points are shown when cases pass map safety gates;
- selected map point or lead opens full expediente;
- some contracts have related receipts and official work geometry.

Peru:

- no inferred map points;
- lead selection opens full expediente;
- trace button is disabled when there is no official geometry;
- export remains available.

Chile:

- no inferred map points;
- lead selection opens full expediente;
- official award act/context can appear as signal evidence;
- export remains available.

## Main Code Surfaces

Domain/data:

- `src/lib/data/caseLeads.ts`: prioritized lead feed.
- `src/lib/data/caseSignals.ts`: signal rules and copy.
- `src/lib/data/evidenceReceipts.ts`: receipt locator labels.
- `src/lib/data/expediente.ts`: expediente view model.
- `src/lib/caseRepository.ts`: repository facade, lead feed, expediente lookup,
  evidence pack.

Routes:

- `/api/leads`: prioritized lead feed.
- `/api/cases/[id]`: shaped expediente, not raw case file.
- `/api/export/[id]`: evidence pack.
- `/api/export`: collection evidence pack.

UI:

- `src/components/FaroExperience.tsx`: map/feed/detail orchestration.
- `src/components/LeadFeed.tsx`: prioritized lead list.
- `src/components/CaseDetails.tsx`: expediente panel.
- `src/components/CaseSignals.tsx`: signal proof rows.
- `src/app/globals.css`: current visual shell.

## UX Principles To Preserve

- Start with why this appeared.
- Put caveats next to claims.
- Use official source language before technical metadata.
- Make missing data visible as a coverage gap.
- Let Peru and Chile work without a map.
- Never imply satellite evidence unless geometry supports it.
- Do not rank countries or cases by wrongdoing.
- Do not hide export/source actions behind decorative UI.

## Current Limitations

- The UI is intentionally functional, not final.
- There is no database; the app uses static generated data.
- There is no assistant or generated narrative.
- The evidence pack is JSON-first today.
- Similar-case context is still basic; the current strongest value is signal,
  receipt, related receipts, and export.
- Mobile is usable but should be redesigned deliberately if the panel/feed
  interaction becomes central.

## Suggested UI/UX Next Questions

- Should the first screen feel more like a map, an investigation inbox, or a
  split workspace?
- How should the lead feed communicate priority without looking like a guilt
  score?
- What is the best visual treatment for caveats so users actually read them?
- Should the evidence pack action be renamed to "Descargar expediente" or
  "Descargar evidencia"?
- How much receipt metadata should be visible by default versus collapsible?
- How should no-geometry cases feel first-class without pretending they belong
  on the map?
- What does a journalist need to copy, cite, or export in one click?

## Validation State

The implementation was verified with:

- `npm test`
- `npm run data:verify`
- `npm run typecheck`
- `npm run build`
- API smoke tests for `/api/leads`, `/api/cases/[id]`, and `/api/export/[id]`
- browser smoke checks for desktop/mobile and no-geometry PE behavior

The local demo was running at:

```text
http://127.0.0.1:3003/?demo=map
```

