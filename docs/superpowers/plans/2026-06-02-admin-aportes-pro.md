# Admin Aportes Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the public-contribution review loop so Faro admins can keep a clean private inbox, avoid repeated actions, and publish reviewed photo material only as clearly caveated curated evidence.

**Architecture:** Keep review decisions separate from inbox housekeeping and public publication. Review status says what the team decided about the aporte; inbox state says whether the item is active, archived, or removed from the working tray; curated publication remains a second admin-only act that can optionally create a safe public media copy.

**Tech Stack:** Next.js App Router, React client admin views, CSS Modules, local/R2 contribution storage, optional Neon product DB review overlay, Node test runner.

---

### Task 1: Model And Tests

**Files:**
- Modify: `src/lib/data/userContributions.ts`
- Modify: `src/components/Admin/AdminAportesTypes.ts`
- Modify: `tests/adminAportesTypes.test.ts`
- Modify: `tests/adminAportesApi.test.ts`
- Modify: `tests/adminAportesPromotionApi.test.ts`

- [ ] **Step 1: Add failing tests for operational behavior**

Add tests that prove:
- a repeated review status does not create another trail event;
- a reviewer can archive an aporte without deleting the underlying record;
- an admin can remove an aporte from the visible tray using a soft removal state;
- filtered inbox tabs count active, archived, removed, rejected, and published items distinctly;
- publishing an approved photo aporte can expose a public curated media URL that is not the private attachment key.

- [ ] **Step 2: Run targeted tests and confirm RED**

Run:

```bash
npm test tests/adminAportesTypes.test.ts tests/adminAportesApi.test.ts tests/adminAportesPromotionApi.test.ts
```

Expected: FAIL because the new fields, route behavior, and public media fields do not exist yet.

### Task 2: Backend Contracts

**Files:**
- Modify: `src/lib/data/userContributions.ts`
- Modify: `src/lib/server/contributionReviewStorage.ts`
- Modify: `src/lib/server/contributionReviewDb.ts`
- Modify: `src/lib/server/curatedContributionEvidenceDb.ts`
- Modify: `src/app/api/admin/aportes/route.ts`
- Create: `src/app/api/cases/[id]/curated-evidence/[evidenceId]/media/route.ts`
- Create: `data/product/migrations/004_admin_aportes_pro.sql`

- [ ] **Step 1: Add inbox state**

Add `ContributionInboxState = "active" | "archived" | "removed"` and normalize missing legacy records to `"active"`.

- [ ] **Step 2: Add disposition mutation**

Add an admin/reviewer endpoint path through `PATCH /api/admin/aportes` using `inboxState`, `note`, and `submissionId`. The operation must write an audit event, update local/R2 manifests when Neon is not configured, and use a Neon disposition table when configured.

- [ ] **Step 3: Make review updates idempotent**

If the current normalized review status already equals the requested status, return the contribution without appending a duplicate review event.

- [ ] **Step 4: Add curated media copy**

Allow promotion input to include `attachmentId` and `mediaAltText`. Only image attachments may become public curated media. Store a curated copy under a non-private key and expose it through a public API route only when the evidence is `published_curated`.

### Task 3: Admin UI

**Files:**
- Modify: `src/components/Admin/AdminAportesView.tsx`
- Modify: `src/components/Admin/AdminAportesDetail.tsx`
- Modify: `src/components/Admin/AdminAportesView.module.css`
- Modify: `tests/adminAportesViewIntegration.test.ts`

- [ ] **Step 1: Replace flat filters with operational tabs**

Use tabs for `Activos`, `En revisión`, `Necesita info`, `Aprobados`, `Descartados`, `Publicados`, `Archivados`, and `Removidos`.

- [ ] **Step 2: Disable repeated actions**

Current status actions must be disabled and visually marked as the current decision. Terminal/publication actions should show the next meaningful action instead of repeating the same one.

- [ ] **Step 3: Add archive/remove controls**

Show `Archivar` and `Quitar de bandeja` as housekeeping actions. Both require an internal note and explain that they do not publish, erase official records, or change the review decision.

- [ ] **Step 4: Add photo publication controls**

When the selected contribution has image attachments, allow choosing one image and setting public alt text before saving curated evidence. Show a clear statement that the public media is a curated copy.

### Task 4: Validation

**Files:**
- No additional production files unless tests expose a concrete gap.

- [ ] **Step 1: Run focused tests**

```bash
npm test tests/adminAportesTypes.test.ts tests/adminAportesApi.test.ts tests/adminAportesPromotionApi.test.ts tests/adminAportesViewIntegration.test.ts
```

- [ ] **Step 2: Run full validation**

```bash
git diff --check
npm run typecheck
npm test
npm run build
```

- [ ] **Step 3: Review against product contract**

Confirm:
- private aportes remain private until explicit curated-publication;
- public media never uses a private object key;
- soft removal keeps a recoverable audit trail;
- UI copy avoids accusation language and does not treat aportes as official evidence.
