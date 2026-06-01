# Faro Worker Prompts - 2026-06-01

These prompts are intended for independent Codex threads/workers. Each worker
should branch from `argentina/main`, open a draft PR to `argentina/main`, and
not merge.

## Shared Context For Every Worker

Repo: `/Users/estevito/Desktop/Faro/Faro-Indies`

Remote: `argentina -> https://github.com/NachoEstevo/Faro-Argentina.git`

Read first:

- `AGENTS.md`
- `docs/coordination/2026-06-01-parallel-workstreams.md`
- `docs/product/faro-product-context.md`

Product invariants:

- Faro does not accuse.
- Faro shows where to look, why to look there, what official evidence exists,
  and what still needs verification.
- Aportes and Carpetas are private working material by default.
- Public evidence requires explicit manual curation, caveats and source labels.
- Map exposure requires validated official geometry.

Final response requirements:

- branch name;
- commit hash;
- PR URL if created;
- files changed;
- tests/checks run;
- residual risks and handoff notes.

## Worker 1 - Production Trust And Security Hardening

Branch: `codex/faro-prod-trust-hardening`

Prompt:

```text
You are Worker 1 for Faro Argentina production trust hardening.

Repo: /Users/estevito/Desktop/Faro/Faro-Indies
Remote: argentina -> https://github.com/NachoEstevo/Faro-Argentina.git
Base branch: argentina/main
Create branch: codex/faro-prod-trust-hardening
Open a draft PR to argentina/main if possible. Do not merge.

Read first:
- AGENTS.md
- docs/coordination/2026-06-01-parallel-workstreams.md
- docs/superpowers/specs/2026-05-31-aportes-operativos-admin-evidencia-curada-design.md
- docs/product/faro-product-context.md

Product invariants:
- Faro does not accuse.
- Aportes are private by default and never public unless separately curated.
- Do not weaken production security to make local dev easier.
- Do not hardcode secrets or emails.

Ownership:
- src/app/api/aportes/**
- src/app/api/admin/**
- src/app/api/investigations/workspaces/**
- src/app/api/investigations/analyze/**
- src/lib/server/*Guard*
- related security/admin tests

Task:
1. Inspect current auth, admin guards, Aportes submission route, admin attachment
   route, workspace write route, analysis route, metadata/noindex handling.
2. Implement a focused production hardening PR:
   - add same-origin/CSRF guard to cookie-authenticated writes that lack it;
   - add rate limiting to public Aportes submissions and admin attachment reads;
   - ensure admin pages are noindex or server-protected as appropriate;
   - avoid changing broad deployment prose, owned by another workstream.
3. Add/update tests for the protected paths.
4. Run targeted tests plus npm run typecheck. If build is cheap and relevant,
   run it; otherwise state why not.

Constraints:
- Do not modify docs/deployment.md, README.md, docs/product/faro-product-context.md
  except if absolutely necessary for a code behavior note.
- Do not edit Investigations UI or data spine files.
- You are not alone in the codebase; do not revert changes from others.
```

## Worker 2 - Carpetas Pro Verification Workflow

Branch: `codex/faro-carpetas-pro-verification`

Prompt:

```text
You are Worker 2 for Faro Argentina Carpetas Pro verification workflow.

Repo: /Users/estevito/Desktop/Faro/Faro-Indies
Remote: argentina -> https://github.com/NachoEstevo/Faro-Argentina.git
Base branch: argentina/main
Create branch: codex/faro-carpetas-pro-verification
Open a draft PR to argentina/main if possible. Do not merge.

Read first:
- AGENTS.md
- docs/coordination/2026-06-01-parallel-workstreams.md
- docs/product/faro-product-context.md
- docs/superpowers/plans/2026-05-26-carpetas-pro-dossier-builder.md
- docs/superpowers/plans/2026-05-31-investigation-case-starter-workflow.md

Product invariants:
- Carpetas are private workspaces, not public publications.
- A folder organizes hypotheses, evidence, caveats, gaps and next steps; it
  does not prove relationships.
- No accusatory copy.

Ownership:
- src/lib/data/investigationWorkspaces.ts
- src/components/Investigations/**
- src/app/api/investigations/** except security guard concerns already owned by
  Worker 1
- tests/investigations*

Task:
1. Inspect current Carpetas workflow: creation, relation reasons, evidence
   matrix, notes, analysis, export.
2. Add a lightweight verification task/checklist layer inside Carpetas:
   - task title/action/source;
   - status such as pending/in_progress/done/blocked or equivalent;
   - optional owner/unassigned and due date only if simple;
   - clear ready/not-ready gate for publication/investigation handoff;
   - ability to save generated next steps as tasks, not only as a note, if
     feasible in this PR.
3. Keep the UI clean and compact; richer detail can sit behind disclosure/tabs.
4. Ensure default relation language is neutral, e.g. hypothesis/manual, not same
   judicial context by default.
5. Update tests for folder workflow and serialization/export changes.

Constraints:
- Do not implement public publication of folders.
- Do not touch security guard files unless needed for type compile, coordinate
  with Worker 1 scope.
- Coordinate conceptually with Worker 3: if you need relationship confidence UI,
  keep it minimal and avoid changing their owned data helpers.
- You are not alone in the codebase; do not revert changes from others.
```

## Worker 3 - Relationship Provenance And Confidence

Branch: `codex/faro-relation-provenance`

Prompt:

```text
You are Worker 3 for Faro Argentina relationship provenance and confidence.

Repo: /Users/estevito/Desktop/Faro/Faro-Indies
Remote: argentina -> https://github.com/NachoEstevo/Faro-Argentina.git
Base branch: argentina/main
Create branch: codex/faro-relation-provenance
Open a draft PR to argentina/main if possible. Do not merge.

Read first:
- AGENTS.md
- docs/coordination/2026-06-01-parallel-workstreams.md
- docs/product/faro-product-context.md
- src/lib/data/entityResolution.ts
- src/lib/data/caseSignals.ts
- src/lib/data/investigationWorkspaces.ts

Product invariants:
- Relationships are leads/hypotheses unless backed by explicit official
  evidence.
- Do not imply guilt, corruption, fraud or proven wrongdoing.
- Keep labels simple for a journalist: why this may be related, confidence,
  caveat.

Ownership:
- src/lib/data/entityResolution.ts
- src/lib/data/caseSignals.ts
- new relation/provenance helpers under src/lib/data
- relation/provenance tests
- only minimal UI display hooks if no conflict with Worker 2

Task:
1. Inspect current entity resolution, supplier recurrence, similar cases,
   investigation dossier common actors.
2. Implement a small relation provenance model/helpers with labels such as:
   - CUIT exacto
   - Mismo organismo
   - Mismo numero de obra
   - Nombre normalizado
   - Fuente judicial contextual
   - Sugerido por usuario
3. Attach confidence and caveat text to those labels.
4. Expose this model where it already naturally fits without large UI refactors,
   or add tests/docs if UI integration would conflict with Worker 2.
5. Add tests proving labels do not overclaim and confidence differs between
   exact CUIT and normalized-name matches.

Constraints:
- Do not modify broad Investigations components unless necessary and
  low-conflict.
- Do not change public case ranking language to sound accusatory.
- Do not add dependencies.
- You are not alone in the codebase; do not revert changes from others.
```

## Worker 4 - Row-Level Receipt Verification

Branch: `codex/faro-row-level-receipts`

Prompt:

```text
You are Worker 4 for Faro Argentina row-level receipt verification.

Repo: /Users/estevito/Desktop/Faro/Faro-Indies
Remote: argentina -> https://github.com/NachoEstevo/Faro-Argentina.git
Base branch: argentina/main
Create branch: codex/faro-row-level-receipts
Open a draft PR to argentina/main if possible. Do not merge.

Read first:
- AGENTS.md
- docs/coordination/2026-06-01-parallel-workstreams.md
- docs/handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md
- src/lib/data/dataSpineVerifier.ts
- src/lib/data/evidenceReceipts.ts
- scripts/report-data-quality.ts

Ownership:
- src/lib/data/dataSpineVerifier.ts
- source-specific raw row locator helpers under src/lib/data
- scripts/report-data-quality.ts
- data-spine tests

Task:
1. Inspect how receipts are generated and verified today.
2. Add row-level verification for supported sources:
   - re-locate raw row by recordId/locator fields;
   - ensure exactly one raw row match where expected;
   - recompute row hash from current raw snapshot;
   - report missing row, duplicate row and row hash mismatch.
3. Start with a narrow set of high-value sources if full coverage is too big.
4. Add tests that intentionally break a record id and row content.
5. Ensure reports distinguish failure from source freshness/schema drift where
   possible.

Constraints:
- Do not fetch new data.
- Do not change generated cases unless verification reveals a clear bug and the
  fix is scoped.
- Do not modify UI components.
- You are not alone in the codebase; do not revert changes from others.

Validation:
- npm run data:verify
- npm run data:quality-report
- relevant tests
- npm run typecheck
```

## Worker 5 - Data Source Spike: Payments, Execution, Certifications

Branch: `codex/faro-source-spike-payments`

Prompt:

```text
You are Worker 5 for Faro Argentina official-source research around payments,
execution, certifications, receptions and amendments.

Repo: /Users/estevito/Desktop/Faro/Faro-Indies
Remote: argentina -> https://github.com/NachoEstevo/Faro-Argentina.git
Base branch: argentina/main
Create branch: codex/faro-source-spike-payments
Open a draft PR to argentina/main if possible. Do not merge.

Read first:
- AGENTS.md
- docs/coordination/2026-06-01-parallel-workstreams.md
- docs/product/faro-product-context.md
- docs/handoffs/2026-05-21-argentina-mapa-and-geo-validation.md

Ownership:
- docs/data-sources/**
- optional read-only/prototype scripts under scripts/research/**
- no generated production data unless the source join is proven and reviewed

Task:
1. Research official Argentina sources that may close payment_verification_gap:
   - Presupuesto Abierto API/datasets;
   - ONC/COMPR.AR/CONTRAT.AR related datasets;
   - public works certificates/reception/amendment sources if official;
   - SIGEN/AGN only as context if not machine-readable.
2. Produce a source evaluation matrix:
   - official URL;
   - fields;
   - join keys;
   - update frequency;
   - machine readability;
   - what it can prove: payment, devengado, certificate, reception, amendment,
     physical progress, or only context;
   - caveats and risks.
3. Recommend one narrow ingest candidate and a small selected-case subset.
4. Do not infer joins without official/documentable keys.

Validation:
- cite official sources with links in the docs;
- no tests required unless adding prototype scripts;
- npm run typecheck if code/scripts are added.
```

## Worker 6 - Institutional Docs And Runbook

Branch: `codex/faro-institutional-runbook`

Prompt:

```text
You are Worker 6 for Faro Argentina institutional docs and production runbook.

Repo: /Users/estevito/Desktop/Faro/Faro-Indies
Remote: argentina -> https://github.com/NachoEstevo/Faro-Argentina.git
Base branch: argentina/main
Create branch: codex/faro-institutional-runbook
Open a draft PR to argentina/main if possible. Do not merge.

Read first:
- AGENTS.md
- docs/coordination/2026-06-01-parallel-workstreams.md
- README.md
- docs/deployment.md
- docs/product/faro-product-context.md
- docs/presentation/2026-05-25-institutional-demo-package.md

Ownership:
- README.md
- docs/deployment.md
- docs/product/faro-product-context.md
- docs/presentation/**
- optional docs/operations/**

Task:
1. Fix trust-damaging documentation drift:
   - README stale counts should reflect 7,932 cases / 9,617 receipts / 431
     map-eligible cases, or refer to generated reports instead of hardcoding.
   - deployment docs must describe the real production shape: Clerk, Neon, R2,
     migrations, storage verification, envs.
2. Add an operational runbook:
   - env checklist;
   - Clerk admin/reviewer role setup;
   - Neon migration checklist;
   - R2 bucket/storage smoke check;
   - release verification commands;
   - incident/contact/privacy owner placeholders only if explicit and not vague.
3. Add currentness/status language: snapshot dates, map-safe vs searchable-only
   data, known gaps, no geocoding.
4. Keep copy sober, public-facing and non-accusatory.

Constraints:
- Do not edit code.
- Do not invent legal owner/contact details.
- Coordinate with Worker 1 but do not document unmerged code as already live.
```

## Worker 7 - Research Program And Paper Base

Branch: `codex/faro-research-paper-base`

Prompt:

```text
You are Worker 7 for Faro Argentina research program and base paper outline.

Repo: /Users/estevito/Desktop/Faro/Faro-Indies
Remote: argentina -> https://github.com/NachoEstevo/Faro-Argentina.git
Base branch: argentina/main
Create branch: codex/faro-research-paper-base
Open a draft PR to argentina/main if possible. Do not merge.

Read first:
- AGENTS.md
- docs/coordination/2026-06-01-parallel-workstreams.md
- README.md
- docs/product/faro-product-context.md
- docs/presentation/2026-05-25-institutional-demo-package.md

Ownership:
- docs/research/**

Task:
1. Draft a base paper outline for Faro:
   - relevance;
   - infrastructure;
   - official sources;
   - methodology;
   - receipts and reproducibility;
   - caveats;
   - data pipeline;
   - design decisions;
   - limitations.
2. Prioritize 2-3 research lines:
   - caveats as alignment mechanisms;
   - public data friction;
   - evidence packs as boundary objects or civic evidence interfaces.
3. Add ethics notes for human evaluation:
   - consent;
   - public or synthetic cases;
   - no private Aportes data;
   - privacy and non-sensitive materials;
   - separation between product and academic study.
4. Keep it as a research program, not a claim of results or publication venue.

Constraints:
- Do not edit product code.
- Do not overstate Faro's current evidence coverage.
- Do not imply papers already exist.
```
