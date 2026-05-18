# Investigation Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 `Investigaciones` workflow: local-first research folders, cross-case aggregation, access-code-gated Minimax analysis, and portable ZIP export.

**Architecture:** Keep pending user research separate from public Faro expedientes. Pure workspace and aggregate logic lives under `src/lib/data`; Minimax access lives behind a server route; the UI stores active work in browser storage and exports a local ZIP without adding dependencies.

**Tech Stack:** Next.js App Router, React client components, Node test runner, browser `localStorage`, server-side `fetch`, internal uncompressed ZIP writer.

---

### Task 1: Workspace Model And Aggregates

**Files:**
- Create: `src/lib/data/investigationWorkspaces.ts`
- Test: `tests/investigationWorkspaces.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests for:
- `createInvestigationWorkspace` builds a local workspace with neutral metadata.
- `addCaseToWorkspace` dedupes case ids.
- `buildInvestigationAggregate` counts repeated suppliers, agencies, sources, signals, amounts and gaps from evidence packs.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
node --experimental-strip-types --test tests/investigationWorkspaces.test.ts
```

Expected: module-not-found or missing export failure.

- [ ] **Step 3: Implement minimal model**

Implement focused functions:
- `createInvestigationWorkspace(input, now?)`
- `addCaseToWorkspace(workspace, caseId)`
- `removeCaseFromWorkspace(workspace, caseId)`
- `buildInvestigationAggregate(workspace, packs)`
- `normalizeInvestigationText(value)`

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/investigationWorkspaces.test.ts
```

Expected: all tests pass.

### Task 2: Case Pack API

**Files:**
- Modify: `src/lib/caseRepository.ts`
- Create: `src/app/api/investigations/case-pack/route.ts`
- Test: `tests/investigationsApi.test.ts`

- [ ] **Step 1: Write failing API tests**

Test that `GET /api/investigations/case-pack?ids=<id>` returns an expediente and evidence pack, rejects too many ids, and reports missing case ids.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
node --experimental-strip-types --test tests/investigationsApi.test.ts
```

Expected: missing route/export failure.

- [ ] **Step 3: Implement API**

Add a repository helper to return case packs from ids. Add a thin route that parses comma-separated ids, limits to 40, and returns JSON.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/investigationsApi.test.ts
```

Expected: all tests pass.

### Task 3: Minimax Analysis Boundary

**Files:**
- Create: `src/lib/server/minimaxInvestigationAnalysis.ts`
- Create: `src/app/api/investigations/analyze/route.ts`
- Test: `tests/investigationAnalysisApi.test.ts`

- [ ] **Step 1: Write failing tests**

Test wrong access code, missing `MINIMAX_API_KEY`, payload size limits, and a successful fake Minimax response parsed into structured analysis.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
node --experimental-strip-types --test tests/investigationAnalysisApi.test.ts
```

Expected: missing route/export failure.

- [ ] **Step 3: Implement server boundary**

Validate `INVESTIGATIONS_ACCESS_CODE` server-side. Use `MINIMAX_API_KEY` only on the server. Call MiniMax with Bearer auth and a prompt that forbids invented sources and accusation language.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/investigationAnalysisApi.test.ts
```

Expected: all tests pass with fake fetch.

### Task 4: Client ZIP Export

**Files:**
- Create: `src/lib/client/investigationZip.ts`
- Test: `tests/investigationZip.test.ts`

- [ ] **Step 1: Write failing tests**

Test that `buildInvestigationZip` produces a PK ZIP buffer containing `workspace.json`, `README.txt`, `notes.md`, `analysis.md`, `sources/links.json`, and case pack JSON files.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
node --experimental-strip-types --test tests/investigationZip.test.ts
```

Expected: missing module failure.

- [ ] **Step 3: Implement minimal uncompressed ZIP writer**

Implement CRC32, local headers, central directory and end-of-central-directory records. Keep it dependency-free.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/investigationZip.test.ts
```

Expected: all tests pass.

### Task 5: Investigaciones UI

**Files:**
- Create: `src/components/Investigations/InvestigationsView.tsx`
- Create: `src/components/Investigations/InvestigationsView.module.css`
- Modify: `src/components/FaroExperience.tsx`
- Modify: `src/components/Aportes/AportesView.tsx`
- Modify: `src/components/RegionalMap/FloatingModeToggle.tsx`
- Modify: `src/app/pais/[code]/page.tsx`
- Test: `tests/investigationsViewIntegration.test.ts`

- [ ] **Step 1: Write source-level integration tests**

Assert the new tab is reachable, copy avoids public-case language, the UI uses `/api/investigations/case-pack`, `/api/investigations/analyze`, local storage and ZIP export.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
node --experimental-strip-types --test tests/investigationsViewIntegration.test.ts
```

Expected: missing component or missing route copy failure.

- [ ] **Step 3: Implement UI**

Add a compact full-screen tab consistent with Aportes:
- create/edit local workspace;
- search current cases;
- add/remove selected cases;
- add source links, notes and entities;
- fetch case packs;
- request Minimax analysis with access code;
- export ZIP locally.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/investigationsViewIntegration.test.ts
```

Expected: all tests pass.

### Task 6: Final Verification

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Include env placeholders**

Ensure `.env.example` contains empty placeholders only:

```env
MINIMAX_API_KEY=
INVESTIGATIONS_ACCESS_CODE=
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
node --experimental-strip-types --test \
  tests/investigationWorkspaces.test.ts \
  tests/investigationsApi.test.ts \
  tests/investigationAnalysisApi.test.ts \
  tests/investigationZip.test.ts \
  tests/investigationsViewIntegration.test.ts
```

- [ ] **Step 3: Run full checks**

Run:

```bash
npm run typecheck
npm run build
npm test
```

- [ ] **Step 4: Secret scan**

Run:

Run a tracked-file scan for the access-code value and any non-empty secret placeholders before committing.

Expected: no committed secret values.
