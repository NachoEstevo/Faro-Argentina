# Argentina Data Spine Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Argentina official-contract coverage beyond the current 300-case cap while preserving unique case ids, receipts, caveats, map gating and export integrity.

**Architecture:** Keep the existing repo-versioned data model. Add deterministic contract-row canonicalization inside `src/lib/data/argentinaContracts.ts`, then raise the generator to include all canonical official contract rows. Preserve route/controller thinness by changing only data builders, generated artifacts, tests and docs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, repo-local JSON data artifacts, official CSV snapshots.

---

## Files

- Modify: `src/lib/data/argentinaContracts.ts`
- Modify: `scripts/build-argentina-contract-cases.ts`
- Modify: `tests/argentinaContractCases.test.ts`
- Modify: `tests/exportBundles.test.ts`
- Modify: `tests/coverage.test.ts` if generated counts change assertions there
- Regenerate: `src/data/argentinaContractCases.json`
- Regenerate: `src/data/argentinaWorkCases.json`
- Regenerate: `src/data/argentinaHistoricalJudicialCases.json`
- Regenerate: `src/data/articleCitations.json` if the build pipeline updates it
- Regenerate locally: `public/exports/*` (`public/exports/` is gitignored)
- Modify: `README.md`
- Modify: `docs/product/faro-product-context.md`
- Modify: `docs/README.md`
- Create: `docs/handoffs/2026-05-21-argentina-data-spine-expansion.md`

## Task 1: Establish Current Contract Duplicate Behavior

- [ ] **Step 1: Run the diagnostic**

```bash
node --experimental-strip-types - <<'NODE'
import { readFile } from "node:fs/promises";
import { parseCsv } from "./src/lib/data/argentinaWorks.ts";
import { clean } from "./src/lib/data/argentinaContractEnrichment.ts";
const text = await readFile("data/official/ar/onc-contratar-contratos.csv", "utf8");
const rows = parseCsv(text).filter((row) => clean(row.contrato_numero).length > 0);
const byContract = new Map();
for (const row of rows) {
  const key = clean(row.contrato_numero);
  byContract.set(key, [...(byContract.get(key) ?? []), row]);
}
const duplicates = [...byContract.entries()].filter(([, value]) => value.length > 1);
console.log({ rawRows: rows.length, uniqueContractNumbers: byContract.size, duplicateContractNumbers: duplicates.length });
console.log(duplicates.map(([key, value]) => ({ key, count: value.length })));
NODE
```

Expected: current snapshot has 391 non-empty contract rows, 389 unique contract numbers and 2 duplicated contract numbers.

- [ ] **Step 2: Do not fetch new snapshots in this task**

Use the checked-in official snapshots for this expansion. Fetching new external data is a separate release because it changes hashes and the evidence baseline.

## Task 2: Add Canonicalization Test

- [ ] **Step 1: Add failing test in `tests/argentinaContractCases.test.ts`**

```ts
test("buildArgentinaContractCases canonicalizes duplicate contract numbers before limiting", () => {
  const cases = buildArgentinaContractCases(duplicateContractCsv(), options, {
    ...argentinaContext(),
    limit: 10,
  });

  assert.deepEqual(cases.map((caseFile) => caseFile.id), [
    "AR-CONTRACT-CON-1",
    "AR-CONTRACT-CON-2",
  ]);
  assert.equal(cases[0]?.receipt.recordId, "CON-1");
});
```

- [ ] **Step 2: Add the fixture in the same test file**

```ts
function duplicateContractCsv(): string {
  return [
    "contrato_numero,procedimiento_numero,procedimiento_nombre,uoc_codigo,uoc_descripcion,organismo_codigo_saf,organismo_nombre,expediente_procedimiento_numero,numero_obra,nombre_obra,contrato_perfeccionamiento_fecha,contratista_cuit,contratista_razon_social,contrato_monto,contrato_moneda",
    "CON-1,PROC-1,Procedimiento generico,1,UOC Obras,604,Ministerio de Obras,EX-1,OBRA-1,Hospital modular,2022-04-10,30-12345678-9,Constructora Sur S.A.,1234567.89,ARS",
    "CON-1,PROC-1,Procedimiento generico,1,UOC Obras,604,Ministerio de Obras,EX-1,OBRA-1,Hospital modular,2022-04-10,30-12345678-9,Constructora Sur S.A.,1234567.89,ARS",
    "CON-2,PROC-1,Procedimiento generico,1,UOC Obras,604,Ministerio de Obras,EX-1,OBRA-1,Hospital modular,2022-04-10,30-12345678-9,Constructora Sur S.A.,2234567.89,ARS",
  ].join("\n");
}
```

- [ ] **Step 3: Verify the test fails before implementation**

```bash
node --experimental-strip-types --test tests/argentinaContractCases.test.ts
```

Expected: FAIL because duplicate `CON-1` produces duplicate case ids.

## Task 3: Canonicalize Contract Rows

- [ ] **Step 1: Add a small helper in `src/lib/data/argentinaContracts.ts`**

```ts
function uniqueContractRows(rows: ArgentinaContractRow[]): ArgentinaContractRow[] {
  const seen = new Set<string>();
  const uniqueRows: ArgentinaContractRow[] = [];
  for (const row of rows) {
    const contractNumber = clean(row.contrato_numero);
    if (!contractNumber || seen.has(contractNumber)) continue;
    seen.add(contractNumber);
    uniqueRows.push(row);
  }
  return uniqueRows;
}
```

- [ ] **Step 2: Use it before slicing**

```ts
return uniqueContractRows(parseCsv<ArgentinaContractRow>(text))
  .slice(0, context.limit)
  .map((row) =>
    buildCase({
      row,
      options,
      context,
      worksByNumber,
      suppliersByDocument,
      proceduresByNumber,
      locationsByWork,
      openingActsByProcedure,
      offerStatsByProcedure,
    })
  );
```

- [ ] **Step 3: Run the focused test**

```bash
node --experimental-strip-types --test tests/argentinaContractCases.test.ts
```

Expected: PASS.

## Task 4: Raise Contract Coverage To Full Canonical Set

- [ ] **Step 1: Change the generator limit**

In `scripts/build-argentina-contract-cases.ts`, replace:

```ts
const argentinaContractCaseLimit = 300;
```

with:

```ts
const argentinaContractCaseLimit = Number.POSITIVE_INFINITY;
```

- [ ] **Step 2: Regenerate data artifacts**

```bash
npm run data:build
```

Expected: `src/data/argentinaContractCases.json` now contains 389 contract cases.

- [ ] **Step 3: Update count assertions**

Update tests that assert `300` contract cases to the generated canonical count. Keep assertions exact rather than loose so future snapshot changes are visible.

## Task 5: Verify Data Integrity

- [ ] **Step 1: Verify data spine**

```bash
npm run data:verify
```

Expected: PASS.

- [ ] **Step 2: Generate quality reports**

```bash
npm run data:quality-report
npm run data:geo-report
```

Expected: reports complete and show updated totals. Do not "fix" invalid geometry by hand.

- [ ] **Step 2b: Remove generated duplicate case-id blockers**

If `npm run data:geo-report` reports duplicate case ids, keep the official
identifier in `receipt.recordId` and add stable generated suffixes such as
`--row-2` to the generated case id. Do not drop official rows.

- [ ] **Step 3: Run product tests**

```bash
npm test
npm run typecheck
npm run build
```

Expected: all pass.

## Task 6: Update Documentation And Handoff

- [ ] **Step 1: Update current counts**

Update `README.md` and `docs/product/faro-product-context.md` with generated counts:

- Argentina expedientes;
- contract cases;
- receipts;
- snapshots;
- map-eligible cases.

- [ ] **Step 2: Add handoff**

Create `docs/handoffs/2026-05-21-argentina-data-spine-expansion.md` with:

- what changed;
- canonicalization rule;
- before/after counts;
- validation commands;
- caveats and next data blockers.

- [ ] **Step 3: Link handoff from `docs/README.md`**

Add the handoff to "Handoffs Vigentes".

## Task 7: Commit And Push

- [ ] **Step 1: Check scope**

```bash
git status -sb
git diff --check
```

Expected: only data expansion, tests and docs are modified. `.playwright-cli/` remains untracked and unstaged.

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/argentinaContracts.ts src/lib/data/argentinaWorks.ts scripts/build-argentina-contract-cases.ts tests/argentinaContractCases.test.ts tests/argentinaWorks.test.ts tests/exportBundles.test.ts tests/coverage.test.ts tests/dataSpineVerifier.test.ts tests/explorerCases.test.ts src/data/argentinaContractCases.json src/data/argentinaWorkCases.json src/data/argentinaHistoricalJudicialCases.json src/data/articleCitations.json README.md docs/README.md docs/agent-onboarding.md docs/product/faro-product-context.md docs/handoffs/2026-05-21-argentina-data-spine-expansion.md docs/roadmap/2026-05-21-two-week-faro-professionalization.md docs/superpowers/plans/2026-05-21-argentina-data-spine-expansion.md
git commit -m "Expand Argentina contract data spine"
```

- [ ] **Step 3: Push private fork**

```bash
git push argentina HEAD:main
```
