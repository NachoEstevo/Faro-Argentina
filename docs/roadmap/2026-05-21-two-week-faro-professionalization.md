# Faro Two Week Professionalization Roadmap

Date: 2026-05-21
Scope: private Argentina fork
Audience: product, engineering, data, demo prep

## North Star

In two weeks, Faro should feel like a professional civic investigation product:
an investigator can move from official public data to a readable expediente, group
related records into a private carpeta, export the material, and receive reviewed
public contributions without blurring the line between lead, evidence and claim.

Faro does not accuse. Faro shows where to look, why to look there, what official
evidence exists, and what still needs verification.

## Release Principle

Ship fewer stronger records before many weak records. Every added case must keep:

- official source metadata;
- receipt hash and raw path;
- caveat close to the claim;
- map eligibility separate from explorer/export availability;
- no invented coordinates or inferred wrongdoing.

## Week 1: Make The Data Spine Stronger

### 1. Argentina Data Spine Expansion

Goal: expand Argentina coverage without weakening evidence.

Deliverables:

- canonicalized CONTRAT.AR contracts beyond the current 300-case cap;
- duplicate contract handling with deterministic case ids;
- updated data quality and coordinate reports;
- updated README/product counts;
- regression tests for dedupe, receipts and export counts.

Acceptance:

- no duplicate case ids;
- `npm run data:verify` passes;
- `npm run data:quality-report` shows the new coverage and gaps;
- map-ready count increases only when geometry is valid;
- cases without geometry remain available in Explorer/export.

### 2. Evidence Semantics Pass

Goal: make the new larger corpus easier to trust.

Deliverables:

- source quality labels visible in case/export paths;
- clearer caveats for contracts vs offers vs works vs judicial context;
- supplier recurrence confidence split between document match and name-only match;
- data report summary that highlights blockers rather than hiding them.

Acceptance:

- no UI copy says or implies guilt;
- repeated supplier signals explain confidence source;
- evidence packs preserve all related receipts.

### 3. Explorer And Expediente Review

Goal: keep larger data usable for a journalist.

Deliverables:

- better defaults for Explorer sorting and pivots;
- clearer empty states for no geometry/no amount/no source page;
- expediente copy that distinguishes official fact, context and next verification;
- printable report remains simple and non-technical.

Acceptance:

- a user can find a supplier, open a case, inspect receipts and export in under a
  minute;
- case pages do not show raw JSON as the primary artifact.

## Week 2: Turn It Into A Professional Workflow

### 4. Carpetas For Journalists And Investigators

Goal: make `Investigaciones` feel like a real workbench.

Deliverables:

- easier add-to-carpeta actions from Explorer and expediente;
- visible list of carpetas, not just one local workspace;
- per-carpeta notes, sources, entities and relation reasons;
- readable analysis matrix with evidence, gap and next step;
- ZIP/PDF export that a journalist can hand to another person.

Acceptance:

- carpetas remain private/local unless we explicitly add auth later;
- Minimax stays server-side and access-code gated;
- analysis never becomes accusation or proof.

### 5. Aportes And Review Queue

Goal: let people submit photos or extra information, then keep review private.

Deliverables:

- public `Aportes` entry that is easy to find;
- intake for photo/link/text/source context/contact;
- private review queue with statuses: revisar, necesita mas info, aprobado para
  cargar, rechazado;
- reviewer view showing submission payload, files, source anchors and caveats;
- approved aportes stay separate from official case data until manually curated.

Acceptance:

- no aporte is public by default;
- contact info remains private;
- reviewers can inspect R2/local payloads without opening raw object keys by hand;
- approved aportes are traceable to their submission id.

### 6. Professional UI/UX Pass

Goal: make Faro clean, understandable and credible for non-technical users.

Deliverables:

- simplified first screen;
- clearer top navigation: Mapa, Explorer, Carpetas, Aportes;
- consistent Spanish copy and accents where the project encoding supports it;
- denser but readable investigator surfaces;
- mobile sanity pass for main routes.

Acceptance:

- no page feels like a hackathon placeholder;
- every primary action is visible and works;
- no hidden feature needed for the demo.

### 7. Institutional Demo Package

Goal: prepare the project for a high-stakes presentation.

Deliverables:

- 3-minute demo script;
- sample investigation folder;
- selected high-quality Argentina cases;
- before/after data coverage note;
- risk and caveat slide: what Faro proves, what it does not prove.

Acceptance:

- the demo can run locally and from production;
- all claims are grounded in official sources or clearly labeled as product plans;
- presenter can explain receipts and caveats without technical deep dive.

### 8. Casos Curados Institucionales

Goal: offer a small set of strong entry points without turning the product into
a forced demo.

Deliverables:

- curated case metadata tied to real Faro case ids;
- map callouts only for cases with validated official geometry;
- documentary/data-gap cases in a separate editorial panel;
- visible source and limit text on every curated card;
- no required minimum count beyond the cases that are defensible.

Acceptance:

- every curated case has receipt and caveat;
- non-map cases are not drawn on the map;
- judicial context is labeled as context, not a conclusion;
- release review checks government-endorsement risk, accusation drift and
  judicial-overclaiming before publish.

## Do Not Do During These Two Weeks

- Do not add public accusations, rankings of guilt, fraud scores or corruption
  scores.
- Do not geocode missing coordinates.
- Do not mix public contributions into official expedientes automatically.
- Do not add auth until the local-first and review flows are clear.
- Do not chase visual polish before data trust and core workflows work.

## Verification Bundle

Use this bundle for any product or data release:

```bash
npm run data:verify
npm run data:quality-report
npm run data:geo-report
npm test
npm run typecheck
npm run build
```
