# Aportes Operativos Admin Evidencia Curada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Faro Aportes into a private, auditable review operation with explicit admin-only curated publication, without mixing user material with official evidence.

**Architecture:** Keep public submission storage as the source of received material, add normalized review/publication states, and layer audit plus curated-public records on top. Route handlers stay thin; review, audit, attachment validation, and curation logic live in focused server/data modules. Public expediente surfaces read only published curated evidence and render it in a separate section from official receipts, map geometry, exports, and caveats.

**Tech Stack:** Next.js App Router, React server/client components, TypeScript, local/R2 contribution storage, optional Neon Postgres product database, Clerk auth, Node test runner.

---

## Product Guardrails

- Faro does not accuse. Copy must describe review state, official evidence, user-provided material, gaps, and next verification.
- A public submission is private by default and remains private after review approval.
- Reviewer can review, open private attachments, add notes, and link approved material to expedientes or carpetas.
- Admin is required to publish or withdraw curated evidence.
- Original user-uploaded files never get a public URL.
- Published curated evidence is a redacted/curated record with title, caption, caveat, source/permission, reviewer, promotion date, and link to an expediente.
- Published curated evidence never changes map geometry and never becomes official evidence.

## Subagent Review Incorporated

- Backend/security review: normalize `approved` to `approved_for_investigation`, add `publicationStatus`, harden admin mutations with origin checks, validate attachment ownership, audit sensitive reads/actions, require admin for publish/withdraw, and fail closed for test auth in production.
- UI/UX review: make `/admin/aportes` feel like a review desk, not a table; show review/publication as two rails; keep status pills compact; keep public curated material clearly separate from official trail.
- Test/sequence review: migrate model first, then API security and attachment validation, then link flow, then promotion service/routes, then public rendering and UI.

## File Structure

- `src/lib/data/userContributions.ts`: canonical contribution types, review statuses, publication statuses, curated evidence types, validation helpers, build defaults, legacy status normalization.
- `src/lib/server/contributionReviewStorage.ts`: local/R2/Neon review orchestration, link eligibility, attachment ownership validation, local fallback curation records.
- `src/lib/server/contributionReviewDb.ts`: Neon review event and link persistence.
- `src/lib/server/contributionAuditDb.ts`: audit event types, Neon persistence, local fallback no-op/list shape used by tests.
- `src/lib/server/curatedContributionEvidenceDb.ts`: Neon persistence and read helpers for published curated evidence.
- `src/lib/server/adminRequestGuards.ts`: same-origin validation for admin mutations and conservative in-memory mutation throttling for development/runtime protection.
- `src/lib/server/faroAuth.ts`: Clerk/test-auth production guard and role helpers.
- `src/app/api/admin/aportes/route.ts`: list inbox, update review status, link approved material.
- `src/app/api/admin/aportes/attachment/route.ts`: private attachment read with ownership validation and audit.
- `src/app/api/admin/aportes/linked/route.ts`: private material associated with expediente/carpeta.
- `src/app/api/admin/aportes/promote/route.ts`: admin-only candidate/publish route.
- `src/app/api/admin/aportes/withdraw/route.ts`: admin-only withdraw route.
- `src/app/api/admin/audit/route.ts`: admin-only audit feed.
- `src/lib/data/expediente.ts`: optional curated evidence on expediente public view.
- `src/lib/data/caseReport.ts`: optional curated evidence in printable report model.
- `src/components/Explorer/ExplorerView.tsx`: public expediente evidence tab renders curated evidence separately.
- `src/components/PrintableCaseReport.tsx`: printable report renders curated evidence on white report surface.
- `src/components/Admin/AdminAportesTypes.ts`: client types, state labels, publication labels, sort/filter helpers.
- `src/components/Admin/AdminAportesView.tsx`: review desk list, filters, selected detail orchestration.
- `src/components/Admin/AdminAportesDetail.tsx`: contribution summary, private attachment warnings, review rail, link form, admin curation panel.
- `src/components/Admin/AdminAportesView.module.css`: compact operational layout with stable tab/status geometry in light/dark.
- `data/product/migrations/002_aportes_operational_review.sql`: Postgres review-status compatibility, audit log, curated evidence records.
- `tests/*`: model, DB, API, UI integration, public surface, and regression coverage listed per task.

## Task 1: Normalize Contribution States

**Files:**
- Modify: `src/lib/data/userContributions.ts`
- Modify: `src/components/Admin/AdminAportesTypes.ts`
- Modify: `tests/userContributions.test.ts`
- Modify: `tests/adminAportesTypes.test.ts` if present; otherwise cover through `tests/adminAportesApi.test.ts`

- [ ] **Step 1: Write model tests for review/publication defaults**

Add assertions that:

```ts
import {
  CONTRIBUTION_PUBLICATION_STATUSES,
  CONTRIBUTION_REVIEW_STATUSES,
  buildUserContribution,
  normalizeContributionPublicationStatus,
  normalizeContributionReviewStatus,
} from "../src/lib/data/userContributions.ts";

assert.deepEqual([...CONTRIBUTION_REVIEW_STATUSES], [
  "submitted",
  "accepted_for_review",
  "needs_more_info",
  "approved_for_investigation",
  "rejected",
]);
assert.deepEqual([...CONTRIBUTION_PUBLICATION_STATUSES], [
  "private",
  "candidate",
  "published_curated",
  "withdrawn",
]);
assert.equal(normalizeContributionReviewStatus("approved"), "approved_for_investigation");
assert.equal(normalizeContributionPublicationStatus(undefined), "private");

const contribution = buildUserContribution(validDraft, {
  id: "APORTE-20260531-TEST-0001",
  createdAt: "2026-05-31T12:00:00.000Z",
});
assert.equal(contribution.status, "submitted");
assert.equal(contribution.publicationStatus, "private");
```

- [ ] **Step 2: Run the focused model test**

Run:

```bash
node --experimental-strip-types --test tests/userContributions.test.ts
```

Expected: fails because `CONTRIBUTION_PUBLICATION_STATUSES` and normalization helpers do not exist.

- [ ] **Step 3: Implement canonical statuses and aliases**

In `src/lib/data/userContributions.ts`:

```ts
export const CONTRIBUTION_REVIEW_STATUSES = [
  "submitted",
  "accepted_for_review",
  "needs_more_info",
  "approved_for_investigation",
  "rejected",
] as const;

export type ContributionReviewStatus = (typeof CONTRIBUTION_REVIEW_STATUSES)[number];
export type LegacyContributionReviewStatus = "approved";

export const CONTRIBUTION_PUBLICATION_STATUSES = [
  "private",
  "candidate",
  "published_curated",
  "withdrawn",
] as const;

export type ContributionPublicationStatus = (typeof CONTRIBUTION_PUBLICATION_STATUSES)[number];

export function normalizeContributionReviewStatus(value: unknown): ContributionReviewStatus {
  if (value === "approved") return "approved_for_investigation";
  return CONTRIBUTION_REVIEW_STATUSES.includes(value as ContributionReviewStatus)
    ? value as ContributionReviewStatus
    : "submitted";
}

export function normalizeContributionPublicationStatus(value: unknown): ContributionPublicationStatus {
  return CONTRIBUTION_PUBLICATION_STATUSES.includes(value as ContributionPublicationStatus)
    ? value as ContributionPublicationStatus
    : "private";
}
```

Add `publicationStatus: ContributionPublicationStatus` to `UserContribution` and set `publicationStatus: "private"` in `buildUserContribution`.

- [ ] **Step 4: Update admin client state labels**

In `src/components/Admin/AdminAportesTypes.ts`, change `ReviewStatus` to include `approved_for_investigation`, add `PublicationStatus`, change the approval label from “Aprobado para cargar” to “Aprobado para investigar”, and keep a local helper that maps legacy `"approved"` to `"approved_for_investigation"` before sorting or counting.

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --experimental-strip-types --test tests/userContributions.test.ts tests/adminAportesApi.test.ts
```

Expected: all focused tests pass after API test expectations are updated from `approved` to `approved_for_investigation`.

## Task 2: Add Database Migration, Audit Log, and Curated Evidence Persistence

**Files:**
- Create: `data/product/migrations/002_aportes_operational_review.sql`
- Create: `src/lib/server/contributionAuditDb.ts`
- Create: `src/lib/server/curatedContributionEvidenceDb.ts`
- Modify: `src/lib/server/contributionReviewDb.ts`
- Create: `tests/contributionAuditDb.test.ts`
- Create: `tests/curatedContributionEvidence.test.ts`
- Modify: `tests/contributionReviewDb.test.ts`

- [ ] **Step 1: Add migration**

Create a migration that:

```sql
alter table contribution_review_events
  drop constraint if exists contribution_review_events_status_check;

alter table contribution_review_events
  add constraint contribution_review_events_status_check
  check (status in (
    'submitted',
    'accepted_for_review',
    'needs_more_info',
    'approved_for_investigation',
    'approved',
    'rejected'
  ));

create table if not exists contribution_audit_events (
  id bigserial primary key,
  submission_id text,
  action text not null,
  actor_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  actor_name text,
  actor_role text,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists curated_contribution_evidence (
  id text primary key,
  submission_id text not null,
  expediente_id text not null,
  status text not null check (status in ('candidate', 'published_curated', 'withdrawn')),
  title text not null,
  caption text not null,
  caveat text not null,
  source_label text not null,
  permission_note text not null,
  reviewed_by_name text not null,
  promoted_by_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  promoted_by_name text not null,
  promoted_at timestamptz not null,
  withdrawn_at timestamptz,
  withdrawn_by_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  withdrawn_by_name text,
  internal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contribution_audit_events_submission_idx
  on contribution_audit_events (submission_id, created_at desc);

create index if not exists curated_contribution_evidence_expediente_idx
  on curated_contribution_evidence (expediente_id, status, promoted_at desc);
```

- [ ] **Step 2: Add audit DB helper tests**

Test that `appendContributionAuditEvent` upserts the actor, inserts action/metadata, and returns a stable public shape with ISO dates.

- [ ] **Step 3: Implement `contributionAuditDb.ts`**

Export:

```ts
export type ContributionAuditAction =
  | "review_status_changed"
  | "review_link_created"
  | "attachment_opened"
  | "curated_candidate_created"
  | "curated_evidence_published"
  | "curated_evidence_withdrawn";

export interface ContributionAuditEvent {
  id: string;
  submissionId: string | null;
  action: ContributionAuditAction;
  actorName: string;
  actorRole: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
```

Implement `appendContributionAuditEvent(input, sql = getProductSql())` and `listContributionAuditEvents(input, sql = getProductSql())` using `upsertFaroUser` when an actor is present.

- [ ] **Step 4: Add curated evidence DB tests**

Test create/update candidate, publish, withdraw, list published by expediente, and ensure withdrawn items are not returned by the published-list helper.

- [ ] **Step 5: Implement `curatedContributionEvidenceDb.ts`**

Export `upsertCuratedContributionEvidence`, `withdrawCuratedContributionEvidence`, `listPublishedCuratedEvidenceForExpediente`, and `listCuratedEvidenceForSubmission`.

- [ ] **Step 6: Run persistence tests**

Run:

```bash
node --experimental-strip-types --test tests/contributionAuditDb.test.ts tests/curatedContributionEvidence.test.ts tests/contributionReviewDb.test.ts
```

Expected: tests pass with fake SQL adapters.

## Task 3: Harden Admin Requests and Auth

**Files:**
- Create: `src/lib/server/adminRequestGuards.ts`
- Modify: `src/lib/server/faroAuth.ts`
- Modify: `src/app/api/admin/aportes/route.ts`
- Modify: `src/app/api/admin/aportes/attachment/route.ts`
- Modify: `tests/adminAportesApi.test.ts`

- [ ] **Step 1: Add origin and test-auth failure tests**

Assert that `PATCH /api/admin/aportes` and `POST /api/admin/aportes` reject an `origin` not matching the request host with `403 admin_origin_rejected`. Assert that `requireFaroUser` rejects `FARO_ENABLE_TEST_AUTH=1` when `NODE_ENV=production`.

- [ ] **Step 2: Implement request guard**

Create `adminRequestGuards.ts`:

```ts
export function assertAdminMutationAllowed(request: Request): { ok: true } | {
  ok: false;
  status: 403 | 429;
  error: "admin_origin_rejected" | "admin_rate_limited";
  message: string;
} {
  const originResult = assertSameOrigin(request);
  if (!originResult.ok) return originResult;
  return checkInMemoryMutationRate(request);
}
```

The same-origin check accepts missing `origin` for server-side tests and same-host browser requests. The in-memory limiter keys by origin/host and allows a conservative burst for admin mutation endpoints; it is a runtime guard, not the only production defense.

- [ ] **Step 3: Wire guard into admin mutations**

Call `assertAdminMutationAllowed(request)` at the top of admin `PATCH`, admin `POST`, promote, and withdraw routes. Return the guard JSON error before auth when it fails.

- [ ] **Step 4: Fail closed for production test auth**

In `getTestUser`, return `null` when `process.env.NODE_ENV === "production"` even if `FARO_ENABLE_TEST_AUTH === "1"`.

- [ ] **Step 5: Run focused admin tests**

Run:

```bash
node --experimental-strip-types --test tests/adminAportesApi.test.ts
```

Expected: admin mutation security tests pass.

## Task 4: Validate Attachments by Ownership and Audit Opens

**Files:**
- Modify: `src/lib/server/contributionReviewStorage.ts`
- Modify: `src/app/api/admin/aportes/attachment/route.ts`
- Create: `tests/adminAportesAttachmentApi.test.ts`

- [ ] **Step 1: Write attachment ownership tests**

Cover:

```ts
// Returns 400 if submissionId or attachmentId is missing.
// Returns 404 if the attachment id is not listed on that submission.
// Returns 404 if objectKey belongs to another submission.
// Returns file bytes with cache-control private, no-store for a reviewer.
// Appends an attachment_opened audit event when product DB is configured.
```

- [ ] **Step 2: Implement owned attachment reader**

Replace raw `readContributionAttachment(objectKey)` route usage with:

```ts
export async function readContributionAttachmentForReview(input: {
  submissionId: string;
  attachmentId: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}): Promise<{
  storageMode: ContributionReviewStorageMode;
  body: Uint8Array;
  contentType: string;
  filename: string;
}> {
  const contribution = await readContributionForReview(input.submissionId);
  const attachment = contribution.attachments.find((item) => item.id === input.attachmentId);
  if (!attachment) throw new Error("Attachment not found");
  if (!attachment.objectKey.startsWith(`submissions/${contribution.id}/`)) {
    throw new Error("Attachment does not belong to submission");
  }
  await auditAttachmentOpenIfConfigured(input, attachment.objectKey);
  return readContributionAttachmentObject(attachment.objectKey);
}
```

Keep the lower-level object reader private to the storage module.

- [ ] **Step 3: Update attachment route contract**

Change the route to require `submissionId` and `attachmentId` query params instead of accepting an arbitrary `key`.

- [ ] **Step 4: Run attachment tests**

Run:

```bash
node --experimental-strip-types --test tests/adminAportesAttachmentApi.test.ts
```

Expected: all attachment tests pass.

## Task 5: Tighten Review Link Eligibility

**Files:**
- Modify: `src/lib/server/contributionReviewStorage.ts`
- Modify: `src/lib/server/contributionReviewDb.ts`
- Modify: `src/app/api/admin/aportes/linked/route.ts`
- Modify: `tests/adminAportesApi.test.ts`
- Modify: `tests/contributionReviewDb.test.ts`

- [ ] **Step 1: Write link eligibility tests**

Assert:

```ts
// A submitted contribution cannot be linked.
// A legacy approved contribution is treated as approved_for_investigation.
// A contribution approved_for_investigation can be linked.
// Link note is required.
// Linked material endpoint returns only approved_for_investigation material.
```

- [ ] **Step 2: Implement eligibility helper**

In `contributionReviewStorage.ts`:

```ts
function canLinkContribution(status: ContributionReviewStatus): boolean {
  return normalizeContributionReviewStatus(status) === "approved_for_investigation";
}
```

Require `normalizeText(input.note)` for links. Keep target case validation through `getCaseById`.

- [ ] **Step 3: Normalize hydrated DB review state**

When `hydrateContributionsWithReviewState` maps DB event rows, normalize legacy `approved` to `approved_for_investigation` before setting `contribution.status`.

- [ ] **Step 4: Run link tests**

Run:

```bash
node --experimental-strip-types --test tests/adminAportesApi.test.ts tests/contributionReviewDb.test.ts
```

Expected: link tests pass with the new status and required-note contract.

## Task 6: Add Admin-Only Promotion and Withdrawal APIs

**Files:**
- Create: `src/app/api/admin/aportes/promote/route.ts`
- Create: `src/app/api/admin/aportes/withdraw/route.ts`
- Modify: `src/lib/server/contributionReviewStorage.ts`
- Modify: `src/lib/server/curatedContributionEvidenceDb.ts`
- Create: `tests/adminAportesPromotionApi.test.ts`

- [ ] **Step 1: Write promotion API tests**

Cover:

```ts
// reviewer gets 403 on promote.
// admin gets 400 when checklist fields are missing.
// admin gets 409 when contribution is not approved_for_investigation.
// admin can create candidate without public visibility.
// admin can publish curated evidence with complete checklist.
// admin can withdraw published curated evidence.
```

- [ ] **Step 2: Implement promotion validation**

Create a service function in `contributionReviewStorage.ts`:

```ts
export async function promoteContributionEvidence(input: PromoteContributionEvidenceInput): Promise<{
  storageMode: ContributionReviewStorageMode;
  evidence: CuratedContributionEvidence;
}> {
  // Validate approved_for_investigation status.
  // Validate a case link exists for expedienteId.
  // Validate title, caption, caveat, sourceLabel, permissionNote.
  // Persist candidate/published state in Neon when configured.
  // Persist local fallback under .faro-contributions/curated-evidence.json for development.
  // Append audit event when configured.
}
```

- [ ] **Step 3: Implement promote route**

Use `requireFaroAdmin`, `assertAdminMutationAllowed`, and the service. Return `403 admin_access_required` for reviewer and `400 invalid_curated_evidence` for incomplete checklist.

- [ ] **Step 4: Implement withdraw route**

Use `requireFaroAdmin`, `assertAdminMutationAllowed`, and `withdrawCuratedContributionEvidence`. Withdrawal changes status to `withdrawn`, preserves the audit trail, and removes it from public published-list helpers.

- [ ] **Step 5: Run promotion tests**

Run:

```bash
node --experimental-strip-types --test tests/adminAportesPromotionApi.test.ts
```

Expected: role, checklist, candidate, publish, and withdraw behavior pass.

## Task 7: Render Curated Evidence on Public Expediente and Report

**Files:**
- Modify: `src/lib/data/expediente.ts`
- Modify: `src/lib/data/caseReport.ts`
- Modify: `src/components/Explorer/ExplorerView.tsx`
- Modify: `src/components/PrintableCaseReport.tsx`
- Modify: `tests/caseReport.test.ts`
- Modify: `tests/printableCaseReport.test.ts`
- Modify: `tests/mapMarkers.test.ts`
- Modify: `tests/exportBundles.test.ts`

- [ ] **Step 1: Add public-surface regression tests**

Assert:

```ts
// Published curated evidence appears under a separate "Aportes curados" or "Evidencia complementaria" section.
// Private/candidate/withdrawn evidence does not appear publicly.
// Curated evidence does not alter map marker counts.
// Curated evidence does not enter export bundles as official evidence.
```

- [ ] **Step 2: Extend expediente/report view models**

Add an optional `curatedEvidence` array with:

```ts
{
  id: string;
  title: string;
  caption: string;
  caveat: string;
  sourceLabel: string;
  permissionNote: string;
  reviewedByName: string;
  promotedAt: string;
}
```

Load it through a server helper that returns an empty array when product storage is not configured.

- [ ] **Step 3: Render public evidence separately**

In Explorer/detail evidence tab and printable report, render this after official receipts/caveats with copy:

```text
Material aportado y revisado por el equipo. No reemplaza la fuente oficial ni confirma por si solo la relacion investigada.
```

Do not show original filenames, contact data, object keys, or private notes.

- [ ] **Step 4: Run public-surface tests**

Run:

```bash
node --experimental-strip-types --test tests/caseReport.test.ts tests/printableCaseReport.test.ts tests/mapMarkers.test.ts tests/exportBundles.test.ts
```

Expected: public rendering and non-mixing regressions pass.

## Task 8: Upgrade Admin Aportes UI

**Files:**
- Modify: `src/components/Admin/AdminAportesTypes.ts`
- Modify: `src/components/Admin/AdminAportesView.tsx`
- Modify: `src/components/Admin/AdminAportesDetail.tsx`
- Modify: `src/components/Admin/AdminAportesView.module.css`
- Modify: `tests/adminAportesViewIntegration.test.ts` if present; otherwise create it

- [ ] **Step 1: Add UI integration tests**

Assert that the admin review desk renders:

```ts
// Review status rail.
// Publication status rail.
// Compact pending stats.
// Filters for status, type, files, contact mode, and candidate/publication state.
// Private attachment metadata warning.
// Link form with required note.
// Admin curation panel labels.
```

- [ ] **Step 2: Update client types and helpers**

Add `publicationStatus`, `publicationLabel`, `canLinkContribution`, `hasFiles`, `contactModeLabel`, `riskLabels`, and `filterContributionsForReviewDesk`.

- [ ] **Step 3: Rework `AdminAportesView` layout**

Keep a restrained operations-console shape:

- top summary stats in compact cards;
- left list with filters/search;
- right detail panel;
- no huge cards, no dense paragraphs in the list;
- stable row heights and status pills.

- [ ] **Step 4: Rework `AdminAportesDetail`**

Use sections:

- “Resumen”
- “Material privado”
- “Revisión”
- “Vínculos”
- “Publicación curada”
- “Trazabilidad”

Show original filenames only inside the private admin detail. For anonymous submissions, prefix the file area with “Nombre normalizado para revisión”.

- [ ] **Step 5: Add curation actions**

Wire detail actions to:

```ts
POST /api/admin/aportes/promote
POST /api/admin/aportes/withdraw
```

Use compact success/error messages and refresh selected contribution after action.

- [ ] **Step 6: Run UI tests**

Run:

```bash
node --experimental-strip-types --test tests/adminAportesViewIntegration.test.ts
```

Expected: admin UI contract tests pass.

## Task 9: Validate End-to-End and Update Durable Context

**Files:**
- Modify: `docs/product/faro-product-context.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update product context**

Add a short section that states:

```md
### Aportes operativos

Aportes es una bandeja privada de revisión. Recibir, aprobar para investigación,
vincular y publicar son decisiones distintas. Solo evidencia curada publicada
por admin puede aparecer en un expediente público, y siempre separada de las
fuentes oficiales.
```

- [ ] **Step 2: Update agent contract**

Add one durable rule:

```md
- Public use of user contributions requires manual curation, explicit caveat,
  and admin publication. Never treat private aportes as official evidence.
```

- [ ] **Step 3: Run full focused validation**

Run:

```bash
node --experimental-strip-types --test tests/userContributions.test.ts tests/aportesApi.test.ts tests/adminAportesApi.test.ts tests/adminAportesAttachmentApi.test.ts tests/adminAportesPromotionApi.test.ts tests/adminLinkedAportesApi.test.ts tests/contributionReviewDb.test.ts tests/contributionAuditDb.test.ts tests/curatedContributionEvidence.test.ts
node --experimental-strip-types --test tests/adminAportesViewIntegration.test.ts tests/adminExpedienteViewIntegration.test.ts tests/caseReport.test.ts tests/printableCaseReport.test.ts tests/exportBundles.test.ts tests/mapMarkers.test.ts
npm run typecheck
npm run build
git diff --check
```

Expected: all commands pass.

- [ ] **Step 4: Browser validation**

With the dev server running, check:

- `http://localhost:3002/pais/AR?mode=aportes`: public submission copy says private review and no automatic publication.
- `http://localhost:3002/admin/aportes`: review desk is legible in light/dark, status rails are stable, attachment warning is visible.
- `http://localhost:3002/admin/expediente/<case-id>`: linked private material is separated from official case data.
- `http://localhost:3002/expediente/<case-id>/informe`: report remains light mode and printable; curated evidence appears only as a separate section when published.
- `http://localhost:3002/pais/AR?mode=explorer`: map/explorer do not change marker behavior because of aportes.

Expected: UI is sober, compact, navigable, and no private material is visible publicly unless promoted as curated evidence.

## Self-Review

- Spec coverage: review states, publication states, audit, attachment ownership, admin-only publication, public separation, link eligibility, and UI review desk are each assigned to tasks.
- Placeholder scan: plan avoids unresolved implementation markers and names exact files, functions, routes, commands, and expected outcomes.
- Type consistency: `approved_for_investigation`, `private`, `candidate`, `published_curated`, and `withdrawn` are used consistently across model, API, UI, and persistence tasks.

