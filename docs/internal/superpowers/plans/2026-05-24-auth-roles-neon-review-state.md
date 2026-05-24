# Auth Roles And Neon Review State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Faro's production foundation by making admin review role-gated through Clerk and moving private review state into Neon/Postgres.

**Architecture:** Public map, Explorer and contribution intake remain open. Private folders use Clerk-authenticated users and Neon workspace rows. Admin aporte review uses Clerk roles (`reviewer` or `admin`) and stores review events/links in Neon when `DATABASE_URL` is configured, while R2/local storage remains the object store for submitted manifests and private attachments.

**Tech Stack:** Next.js App Router, Clerk, Neon serverless Postgres, TypeScript node tests.

---

### Task 1: Role Gate Admin APIs

**Files:**
- Modify: `src/lib/server/faroAuth.ts`
- Modify: `src/app/api/admin/aportes/route.ts`
- Modify: `src/app/api/admin/aportes/linked/route.ts`
- Modify: `src/app/api/admin/aportes/attachment/route.ts`
- Test: `tests/adminAportesApi.test.ts`
- Test: `tests/adminLinkedAportesApi.test.ts`

- [x] Add `requireFaroReviewer()` and `requireFaroAdmin()` helpers that reuse `requireFaroUser()` and return `403 reviewer_access_required` when the session role is only `investigator`.
- [x] Replace `verifyAdminAccess(request)` in admin API routes with `requireFaroReviewer()`.
- [x] Update tests so valid admin calls use `FARO_ENABLE_TEST_AUTH=1` with `FARO_TEST_CLERK_USER_ROLE=reviewer`, without `x-faro-admin-code`.
- [x] Add a regression test that `investigator` cannot read `/api/admin/aportes`.

### Task 2: Neon Review Events And Links

**Files:**
- Modify: `data/product/migrations/001_product_core.sql`
- Create: `src/lib/server/contributionReviewDb.ts`
- Modify: `src/lib/server/contributionReviewStorage.ts`
- Test: `tests/contributionReviewDb.test.ts`
- Test: `tests/adminAportesApi.test.ts`

- [x] Add `contribution_review_events` and `contribution_review_links` tables with `submission_id`, reviewer identity, status/link metadata and timestamps.
- [x] Implement a small repository that overlays DB review events/links onto contribution manifests.
- [x] Keep R2/local contribution manifests as private object records; do not publish attachments.
- [x] Fall back to the legacy JSON review trail only when `DATABASE_URL` is absent, so local development remains usable.

### Task 3: Admin UI Without Private Code

**Files:**
- Modify: `src/components/Admin/AdminAportesView.tsx`
- Modify: `src/components/Admin/AdminExpedienteReviewView.tsx`
- Modify: `src/components/Admin/AdminAportesView.module.css`
- Test: `tests/adminAportesViewIntegration.test.ts`

- [x] Remove the private-code input from admin review screens.
- [x] Fetch admin APIs with Clerk session cookies only.
- [x] Show copy that says admin access is invite-only and tied to a Faro reviewer account.

### Task 4: Verification

**Commands:**
- `npm test -- tests/adminAportesApi.test.ts tests/adminLinkedAportesApi.test.ts tests/contributionReviewDb.test.ts tests/adminAportesViewIntegration.test.ts tests/investigationsWorkspacesApi.test.ts`
- `npm run typecheck`
- `npm run build`

**Expected:** All commands pass with no data-spine or public evidence changes.

**Result:** Implemented and verified on 2026-05-24. `npm test -- tests/adminAportesApi.test.ts tests/adminLinkedAportesApi.test.ts tests/adminAportesViewIntegration.test.ts tests/adminExpedienteViewIntegration.test.ts tests/contributionReviewDb.test.ts tests/investigationsWorkspacesApi.test.ts`, `npm run typecheck`, `npm run build`, and `npm run db:migrate` passed.
