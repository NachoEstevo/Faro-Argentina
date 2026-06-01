# Faro Parallel Workstreams - 2026-06-01

## Purpose

Coordinate parallel PRs for the next Faro professionalization phase.

Faro's product contract remains unchanged:

- Faro does not accuse.
- Faro shows where to look, why to look there, what official evidence exists,
  and what still needs verification.
- Private folders and user contributions are working material, not public
  evidence.
- Map exposure requires validated official geometry.
- Receipts, raw paths, hashes, caveats and source quality are product features,
  not implementation details.

## Current Baseline

- Repository: `/Users/estevito/Desktop/Faro/Faro-Indies`
- Private remote: `argentina` -> `NachoEstevo/Faro-Argentina`
- Base branch for PRs: `main` on `argentina`
- Current pushed main at coordination time: `43193df`
- Corpus: `7,932` Argentina cases, `9,617` receipts, `431` map-eligible
  cases after the geometry gate.
- Production uses Clerk, Neon Postgres and Cloudflare R2. Older deployment docs
  that describe a static-only app are stale.

## Working Rules For Parallel Threads

- Each workstream should branch from `argentina/main` with a `codex/` branch.
- Each workstream should open a separate PR to `argentina/main`.
- Keep PRs small enough to review independently.
- Do not modify unrelated files.
- Prefer tests over broad manual confidence.
- Before PR: run the narrow tests for the touched area plus `npm run typecheck`.
- For release-critical data/security changes, also run the relevant data scripts
  or build commands described below.

## Workstream 1 - Production Trust And Security Hardening

Branch: `codex/faro-prod-trust-hardening`

Goal: make the current product safer to operate with real users, especially
Aportes, admin routes and private writes.

Owns:

- `src/app/api/aportes/**`
- `src/app/api/admin/**`
- `src/app/api/investigations/workspaces/**`
- `src/app/api/investigations/analyze/**`
- `src/lib/server/*Guard*`
- related security/admin tests

Scope:

- Add durable or database-backed rate limits where feasible; if not feasible in
  one PR, add the minimal safe abstraction and explicit TODO-free fallback.
- Add same-origin/CSRF guard to cookie-authenticated write endpoints.
- Add rate limiting to admin attachment reads and public aporte submissions.
- Ensure admin pages/routes are noindex or server-protected as appropriate.
- Preserve the rule that Aportes are private by default and never public unless
  separately curated.

Do not own deployment prose. Leave broad runbooks to Workstream 5.

## Workstream 2 - Carpetas Pro Verification Workflow

Branch: `codex/faro-carpetas-pro-verification`

Goal: turn Carpetas into a stronger private case-starter workflow for
journalists and investigators.

Owns:

- `src/lib/data/investigationWorkspaces.ts`
- `src/components/Investigations/**`
- `src/app/api/investigations/**` except security guard concerns
- `tests/investigations*`

Scope:

- Add verification tasks/checklist to folders: status, source/action, owner or
  unassigned, due date if simple, and "ready/not ready" gate.
- Keep everything private. No public publication of folders.
- Improve dossier/export language so it separates hypothesis, evidence,
  caveat, gap and next action.
- Make relation reasons default to neutral hypothesis language.

Out of scope:

- Public case publication from folders.
- AI conclusions.

## Workstream 3 - Relationship Provenance And Confidence

Branch: `codex/faro-relation-provenance`

Goal: make relationships easy to understand without overclaiming.

Owns:

- `src/lib/data/entityResolution.ts`
- `src/lib/data/caseSignals.ts`
- relation/provenance helpers under `src/lib/data`
- focused UI display hooks only if they do not conflict with Workstream 2
- relation/provenance tests

Scope:

- Introduce simple relationship labels such as `CUIT exacto`, `Mismo organismo`,
  `Mismo numero de obra`, `Nombre normalizado`, `Fuente judicial contextual`,
  and `Sugerido por usuario`.
- Attach confidence levels and caveats to relationship explanations.
- Ensure UI/copy reads as "why this may be related", not "relationship proven".

Coordinate with Workstream 2 before touching shared Investigations components.

## Workstream 4 - Row-Level Receipt Verification

Branch: `codex/faro-row-level-receipts`

Goal: harden the data spine so receipts can be traced back to exact raw rows.

Owns:

- `src/lib/data/dataSpineVerifier.ts`
- source-specific raw row locator helpers under `src/lib/data`
- `scripts/report-data-quality.ts`
- data-spine tests

Scope:

- For supported sources, re-locate the raw row by `recordId`/locator fields.
- Recompute row hash from current raw snapshot and compare against the receipt.
- Report exact match, missing row, duplicate row, and row hash mismatch.
- Add tests that intentionally break a record id and row content.

Out of scope:

- Fetching new source snapshots.
- Changing generated case semantics unless required by verification failures.

## Workstream 5 - Data Source Spike: Payments, Execution, Certifications

Branch: `codex/faro-source-spike-payments`

Goal: identify the first official source that can close `payment_verification_gap`
for a narrow subset of cases.

Owns:

- `docs/data-sources/**`
- optional read-only/prototype scripts under `scripts/research/**`
- no generated production data unless the source join is proven and reviewed

Scope:

- Research official Argentina sources: Presupuesto Abierto, ONC/COMPR.AR,
  CONTRAT.AR related datasets, SIGEN/AGN where useful.
- Produce a source evaluation matrix: fields, join keys, update frequency,
  caveats, machine readability, and whether it can prove payment, certificate,
  reception, amendment or only context.
- Recommend one narrow ingest candidate and one selected-case subset.

Out of scope:

- Broad ingestion.
- Inferring joins without official/documentable keys.

## Workstream 6 - Institutional Docs And Runbook

Branch: `codex/faro-institutional-runbook`

Goal: remove trust-damaging drift and make production/deployment/currentness
explicit.

Owns:

- `README.md`
- `docs/deployment.md`
- `docs/product/faro-product-context.md`
- `docs/presentation/**`
- optional `docs/operations/**`

Scope:

- Fix stale counts and static-only deployment claims.
- Document Clerk roles, Neon migrations, R2 storage, env checklist, and release
  verification.
- Add a currentness/status section: snapshot dates, map-eligible count, missing
  geometry, searchable-only data, known gaps.
- Keep public copy sober and non-accusatory.

Out of scope:

- Code hardening owned by Workstream 1.

## Workstream 7 - Research Program And Paper Base

Branch: `codex/faro-research-paper-base`

Goal: turn the paper proposal into a concrete research program without mixing it
with product claims.

Owns:

- `docs/research/**`

Scope:

- Draft a base paper outline: relevance, infrastructure, sources, methodology,
  receipts, caveats, pipeline, product decisions and limitations.
- Prioritize 2-3 research lines:
  - caveats as alignment mechanisms;
  - public data friction;
  - evidence packs as boundary objects or civic evidence interfaces.
- Add ethics notes for human evaluation: consent, public/synthetic cases,
  privacy, non-sensitive materials and separation from private Aportes.

Out of scope:

- Running human studies.
- Claiming publication venue or results.

## Orchestration Expectations

The main orchestration thread should:

1. Track worker thread ids, branch names, PR URLs and status.
2. Review returned diffs for product-rule violations.
3. Avoid merging conflicting PRs without rerunning relevant checks.
4. Prefer this integration order:
   - Workstream 1 and 6 first for production trust.
   - Workstream 4 next for data defensibility.
   - Workstream 2 and 3 after coordination on shared UI/data boundaries.
   - Workstream 5 and 7 can land independently as research/docs.
