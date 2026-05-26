# Carpetas Pro Dossier Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `Carpetas` into a clearer dossier builder for journalists and investigators: declared relation motives, deterministic evidence matrix, detected actors/gaps, next verification steps and a more useful export.

**Architecture:** Keep the slice local-first and inside the existing investigation workspace boundary. Add a pure deterministic dossier builder in `src/lib/data/investigationDossiers.ts`, render a compact dossier panel from `InvestigationsChrome`, and include the same deterministic dossier artifacts in the ZIP export. Do not add dependencies, do not publish anything automatically, and do not add AI search.

**Tech Stack:** Next.js App Router, React client components, CSS modules, localStorage workspace persistence, existing case-pack API, Node test runner.

---

## File Structure

- Create: `src/lib/data/investigationDossiers.ts`
  - Add deterministic dossier types and `buildInvestigationDossier()`.
  - Reuse `buildInvestigationAggregate()` and evidence packs without adding persistence.
  - Preserve the boundary between official receipts, contextual material and user-entered notes.
- Modify: `src/components/Investigations/InvestigationsView.tsx`
  - Build the dossier from the active workspace and selected case packs.
  - Pass it to summary/export panels.
- Modify: `src/components/Investigations/InvestigationsChrome.tsx`
  - Add `DossierBuilderPanel`.
  - Keep copy neutral: evidence, gaps and next steps, never claims.
- Modify: `src/components/Investigations/InvestigationsView.module.css`
  - Add compact matrix/list styles that work in light and dark mode.
- Modify: `src/lib/client/investigationZip.ts`
  - Add `dossier.md` and `evidence-matrix.csv` to exported ZIP.
- Create: `tests/investigationDossiers.test.ts`
  - Test dossier rows, actors, gaps and next steps.
- Modify: `tests/investigationsViewIntegration.test.ts`
  - Test UI labels and non-accusatory copy.
- Modify: `tests/investigationZip.test.ts`
  - Test new export files and content.

## Task 1: Deterministic Dossier Model

**Files:**
- Create: `src/lib/data/investigationDossiers.ts`
- Test: `tests/investigationDossiers.test.ts`

- [ ] **Step 1: Add failing test for dossier matrix**

Add a test that imports `buildInvestigationDossier` and asserts:

```ts
const dossier = buildInvestigationDossier(workspace, [packA, packB]);
assert.equal(dossier.matrix.length, 2);
assert.match(dossier.matrix[0].officialEvidence, /Fuente/);
assert.match(dossier.matrix[0].userContext, /Usuario/);
assert.match(dossier.matrix[0].gap, /geometría/i);
assert.match(dossier.nextSteps.join("\n"), /Abrir fuente oficial/);
assert.equal(dossier.actors.find((actor) => actor.label === "Proveedor")?.basis, "CUIT/documento");
assert.doesNotMatch(JSON.stringify(dossier), /corrupci[oó]n|fraude|culpable|delito probado/i);
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/investigationDossiers.test.ts
```

Expected: fail because `buildInvestigationDossier` does not exist.

- [ ] **Step 3: Implement dossier helpers**

Add exported types:

```ts
export interface InvestigationDossierMatrixRow {
  caseId: string;
  title: string;
  relation: string;
  officialEvidence: string;
  userContext: string;
  caveat: string;
  gap: string;
  nextStep: string;
}

export interface InvestigationDossierActor {
  label: string;
  kind: "Proveedor" | "Organismo" | "Entidad manual";
  basis: "CUIT/documento" | "Nombre normalizado" | "Entidad cargada por usuario";
  count: number;
  caseIds: string[];
}

export interface InvestigationDossier {
  matrix: InvestigationDossierMatrixRow[];
  actors: InvestigationDossierActor[];
  gaps: string[];
  nextSteps: string[];
}
```

Implement `buildInvestigationDossier(workspace, packs)` using only existing workspace relations, receipts, caveats, signals, geometry gaps and verification steps. It must be deterministic and non-accusatory. It must label user-entered notes/source links as user context, not official evidence. It must label actor recurrence basis as `CUIT/documento`, `Nombre normalizado` or `Entidad cargada por usuario`.

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
node --experimental-strip-types --test tests/investigationDossiers.test.ts
```

Expected: pass.

## Task 2: Dossier UI In Carpetas

**Files:**
- Modify: `src/components/Investigations/InvestigationsView.tsx`
- Modify: `src/components/Investigations/InvestigationsChrome.tsx`
- Modify: `src/components/Investigations/InvestigationsView.module.css`
- Test: `tests/investigationsViewIntegration.test.ts`

- [ ] **Step 1: Add failing UI integration assertions**

Assert that the investigations UI contains:

```ts
assert.match(source, /Dossier de trabajo/);
assert.match(source, /Matriz de evidencia/);
assert.match(source, /Actores comunes/);
assert.match(source, /Base de identidad/);
assert.match(source, /Brechas para verificar/);
assert.match(source, /Próximos pasos/);
assert.match(source, /contexto del usuario/i);
assert.match(source, /buildInvestigationDossier/);
assert.doesNotMatch(source, /Score de corrupción|Caso probado|Publicar caso/);
```

- [ ] **Step 2: Run UI integration test and verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/investigationsViewIntegration.test.ts
```

Expected: fail on missing dossier labels.

- [ ] **Step 3: Render the dossier panel**

In `InvestigationsView.tsx`, build:

```ts
const dossier = useMemo(
  () => workspace ? buildInvestigationDossier(workspace, selectedCasePacks.map((pack) => pack.evidencePack)) : null,
  [selectedCasePacks, workspace],
);
```

Render `DossierBuilderPanel` in the `resumen` tab after the overview and before the compact aggregate summary. Keep the existing tabs; do not create a new top-level route.

- [ ] **Step 4: Add compact styles**

Add CSS for matrix rows, actors, gaps and next steps using existing variables. No nested cards inside cards. Keep text readable in light and dark modes. The matrix should remain scan-friendly, not a full spreadsheet trapped in a tiny scroll region.

- [ ] **Step 5: Run UI integration test**

Run:

```bash
node --experimental-strip-types --test tests/investigationsViewIntegration.test.ts
```

Expected: pass.

## Task 3: Export Dossier Artifacts

**Files:**
- Modify: `src/lib/client/investigationZip.ts`
- Test: `tests/investigationZip.test.ts`

- [ ] **Step 1: Add failing export assertions**

Assert exported ZIP text contains:

```ts
assert.match(text, /dossier\.md/);
assert.match(text, /evidence-matrix\.csv/);
assert.match(text, /Matriz de evidencia/);
assert.match(text, /Brechas para verificar/);
assert.match(text, /Próximos pasos/);
```

- [ ] **Step 2: Run export test and verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/investigationZip.test.ts
```

Expected: fail on missing files/content.

- [ ] **Step 3: Add export files**

Use `buildInvestigationDossier()` inside `buildFiles()` and add:

- `dossier.md`: human-readable dossier summary.
- `evidence-matrix.csv`: one row per selected case with `caseId,title,relation,officialEvidence,userContext,caveat,gap,nextStep`.

Escape CSV cells by wrapping with quotes and doubling internal quotes.

- [ ] **Step 4: Run export test**

Run:

```bash
node --experimental-strip-types --test tests/investigationZip.test.ts
```

Expected: pass.

## Task 4: Validation And Review

**Files:**
- All changed files.

- [ ] **Step 1: Run focused tests**

```bash
node --experimental-strip-types --test tests/investigationDossiers.test.ts tests/investigationWorkspaces.test.ts tests/investigationsViewIntegration.test.ts tests/investigationZip.test.ts tests/investigationWorkspaceStorage.test.ts
```

- [ ] **Step 2: Run app checks**

```bash
npm run typecheck
npm run build
git diff --check
```

- [ ] **Step 3: Browser smoke**

Open:

```text
http://localhost:3002/pais/AR?mode=investigations
```

Expected: `Carpetas` still opens, the `Resumen` tab shows `Dossier de trabajo`, and the UI keeps the private/non-publication framing.

- [ ] **Step 4: Review constraints**

Confirm:

- No copy implies guilt, wrongdoing, fraud or proof.
- No user aporte is published automatically.
- Manual notes/sources remain labeled as user context, not official evidence.
- Actor recurrence displays identity basis and does not imply exact identity on name-only matches.
- No new dependency was added.
- Existing map/Explorer behavior is untouched.
