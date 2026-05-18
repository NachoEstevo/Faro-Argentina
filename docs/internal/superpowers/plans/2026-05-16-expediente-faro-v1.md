# Expediente Faro V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simple, evidence-backed V1 flow where users can start from prioritized leads, open an expediente, understand why it appeared, inspect the official trail, and download an evidence pack.

**Architecture:** Add small pure data modules first, then expose them through the existing repository facade and thin API routes, then update React components to consume the shaped data. Keep the current static data spine; do not add a database, assistant, score engine, or broad UI rewrite.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node test runner with `--experimental-strip-types`, existing JSON artifacts, existing Leaflet map.

---

## File Structure

- Create `src/lib/data/caseLeads.ts`: builds one prioritized lead per case from existing `caseSignals` output.
- Create `tests/caseLeads.test.ts`: verifies lead priority, caveats, and no accusatory copy.
- Modify `src/lib/data/evidenceReceipts.ts`: adds human receipt locator labels for official detail/search/dataset/missing.
- Create `tests/receiptPresentation.test.ts`: verifies locator presentation.
- Create `src/lib/data/expediente.ts`: builds a case-file view model from one case, its signals, receipts, and actions.
- Create `tests/expediente.test.ts`: verifies sections required by the V1 spec.
- Modify `src/lib/caseRepository.ts`: exposes `buildLeadFeed`, `getExpedienteById`, and upgrades evidence pack contents.
- Create `src/app/api/leads/route.ts`: returns the prioritized lead feed with existing filters.
- Modify `src/app/api/cases/[id]/route.ts`: returns the expediente view model instead of the raw case file.
- Modify `src/app/api/export/[id]/route.ts`: uses upgraded evidence pack contents.
- Create `src/components/LeadFeed.tsx`: compact lead feed for the main experience.
- Modify `src/components/FaroExperience.tsx`: lets users select a case from lead feed or map.
- Modify `src/components/CaseSignals.tsx`: shows evidence and next action in the signal panel.
- Modify `src/components/CaseDetails.tsx`: reorganizes the panel into Summary, Why It Appeared, Official Trail, Context, and Actions.
- Modify `src/app/globals.css`: focused styles for the lead feed and expediente sections.

Do not rename existing data files or generated artifacts in this plan.

---

### Task 1: Case Lead Domain

**Files:**
- Create: `src/lib/data/caseLeads.ts`
- Test: `tests/caseLeads.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/caseLeads.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { buildCaseLeads } from "../src/lib/data/caseLeads.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";

const receipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "14-1002-CON21",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "case-leads-test@1",
  row: { contrato_numero: "14-1002-CON21" },
});

const highPriorityCase = {
  id: "AR-CONTRACT-14-1002-CON21",
  countryCode: "AR",
  caseType: "procurement_contract",
  title: "Construccion de cubierta metalica",
  workNumber: "14-1002-CON21",
  year: 2021,
  procedureNumber: "14-0007-LPU20",
  agencyName: "Comision Nacional de Energia Atomica",
  agencyCode: "105",
  contractingUnit: "Compras CNEA",
  executionTerm: null,
  executionTermType: null,
  coordinates: { lat: -34.585722, lon: -58.389361 },
  evidenceLevel: "official_dataset",
  amount: { value: 120, currency: "ARS", label: "monto_contrato" },
  officialBudget: { value: 100, currency: "ARS", label: "presupuesto_oficial" },
  bidderCount: 1,
  offerCount: 1,
  supplierName: "Proveedor de prueba",
  supplierDocument: "30-70043585-3",
  relatedReceipts: [receipt],
  receipt,
  caveats: ["Contrato oficial; no prueba pagos por si solo."],
};

const lowerPriorityCase = {
  ...highPriorityCase,
  id: "CL-TENDER-1002-53-LP26",
  countryCode: "CL",
  title: "Convenio mantenimiento",
  coordinates: null,
  amount: { value: 1000, currency: "CLP", label: "monto_adjudicado_item_sum" },
  officialBudget: undefined,
  bidderCount: 13,
  claimCount: 12,
  awardActUrl: "https://www.mercadopublico.cl/award-act",
  supplierName: "Proveedor adjudicado",
  supplierDocument: "78.047.617-6",
  caveats: ["Adjudicacion oficial; no prueba pago efectivo."],
};

test("buildCaseLeads returns one prioritized lead per case", () => {
  const leads = buildCaseLeads([lowerPriorityCase, highPriorityCase], { limit: 10 });

  assert.equal(leads.length, 2);
  assert.equal(leads[0]?.caseId, "AR-CONTRACT-14-1002-CON21");
  assert.equal(leads[0]?.primarySignal.code, "single_bidder");
  assert.equal(leads[0]?.countryCode, "AR");
  assert.equal(leads[0]?.sourceId, "AR-CONTRATAR-CONTRATOS");
  assert.match(leads[0]?.why ?? "", /Competencia baja/);
  assert.match(leads[0]?.nextAction ?? "", /Abrir actas/);
});

test("buildCaseLeads supports country and query filters", () => {
  const leads = buildCaseLeads([lowerPriorityCase, highPriorityCase], {
    countryCode: "CL",
    query: "mantenimiento",
    limit: 10,
  });

  assert.equal(leads.length, 1);
  assert.equal(leads[0]?.caseId, "CL-TENDER-1002-53-LP26");
});

test("buildCaseLeads avoids accusation language", () => {
  const leads = buildCaseLeads([highPriorityCase], { limit: 10 });

  assert.doesNotMatch(JSON.stringify(leads), /corrup|fraude|delito|culpable/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/caseLeads.test.ts
```

Expected: FAIL with module-not-found for `src/lib/data/caseLeads.ts`.

- [ ] **Step 3: Implement the lead domain**

Create `src/lib/data/caseLeads.ts`:

```ts
import {
  buildCaseSignals,
  type CaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";
import type { CountryCode } from "./sourceCatalog.ts";

export interface CaseLeadFilters {
  countryCode?: CountryCode;
  sourceId?: string;
  caseType?: string;
  query?: string;
  limit?: number;
}

export interface CaseLead {
  leadId: string;
  caseId: string;
  countryCode: CountryCode;
  caseTitle: string;
  sourceId: string;
  sourceName: string;
  caseType: string | null;
  primarySignal: CaseSignal;
  signalCount: number;
  why: string;
  caveat: string;
  evidence: string;
  nextAction: string;
  sortScore: number;
}

export function buildCaseLeads(
  cases: SignalCaseFile[],
  filters: CaseLeadFilters = {},
): CaseLead[] {
  const limit = clampLimit(filters.limit);
  return cases
    .filter((caseFile) => matchesFilters(caseFile, filters))
    .map(toLead)
    .filter((lead): lead is CaseLead => lead !== null)
    .sort((left, right) =>
      right.sortScore - left.sortScore || left.caseId.localeCompare(right.caseId),
    )
    .slice(0, limit);
}

function toLead(caseFile: SignalCaseFile): CaseLead | null {
  const signals = buildCaseSignals(caseFile);
  const primarySignal = signals[0];
  if (!primarySignal) return null;
  return {
    leadId: `${caseFile.id}-${primarySignal.code}`,
    caseId: caseFile.id,
    countryCode: caseFile.countryCode as CountryCode,
    caseTitle: caseFile.title,
    sourceId: caseFile.receipt.sourceId,
    sourceName: caseFile.receipt.sourceName,
    caseType: caseFile.caseType ?? null,
    primarySignal,
    signalCount: signals.length,
    why: `${primarySignal.label}: ${primarySignal.summary}`,
    caveat: primarySignal.caveat,
    evidence: primarySignal.evidence,
    nextAction: primarySignal.action,
    sortScore: primarySignal.priority * 100 + Math.min(signals.length, 20),
  };
}

function matchesFilters(caseFile: SignalCaseFile, filters: CaseLeadFilters): boolean {
  if (filters.countryCode && caseFile.countryCode !== filters.countryCode) return false;
  if (filters.sourceId && caseFile.receipt.sourceId !== filters.sourceId) return false;
  if (filters.caseType && caseFile.caseType !== filters.caseType) return false;
  const query = clean(filters.query).toLowerCase();
  if (!query) return true;
  return [
    caseFile.id,
    caseFile.title,
    caseFile.workNumber,
    caseFile.procedureNumber,
    caseFile.agencyName,
    caseFile.supplierName,
    caseFile.supplierDocument,
    caseFile.receipt.sourceId,
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 12;
  return Math.min(Math.max(Math.trunc(value ?? 12), 1), 50);
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
```

- [ ] **Step 4: Run lead tests**

Run:

```bash
node --experimental-strip-types --test tests/caseLeads.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/caseLeads.ts tests/caseLeads.test.ts
git commit -m "feat: build prioritized case leads"
```

---

### Task 2: Receipt Locator Presentation

**Files:**
- Modify: `src/lib/data/evidenceReceipts.ts`
- Test: `tests/receiptPresentation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/receiptPresentation.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  describeReceiptLocator,
  type LocatorType,
} from "../src/lib/data/evidenceReceipts.ts";

test("describeReceiptLocator explains official detail receipts", () => {
  assert.deepEqual(describeReceiptLocator("official_detail"), {
    locatorType: "official_detail",
    label: "Detalle oficial",
    actionLabel: "Abrir registro",
    note: "Link al registro oficial especifico.",
    isDirectRecord: true,
  });
});

test("describeReceiptLocator explains dataset-level receipts honestly", () => {
  assert.deepEqual(describeReceiptLocator("official_dataset"), {
    locatorType: "official_dataset",
    label: "Dataset oficial",
    actionLabel: "Abrir fuente",
    note: "Fuente oficial del dataset; no es un link directo al registro.",
    isDirectRecord: false,
  });
});

test("describeReceiptLocator handles every locator type", () => {
  const locatorTypes: LocatorType[] = [
    "official_detail",
    "official_search",
    "official_dataset",
    "missing",
  ];

  assert.equal(locatorTypes.every((locatorType) => describeReceiptLocator(locatorType).label.length > 0), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/receiptPresentation.test.ts
```

Expected: FAIL because `describeReceiptLocator` is not exported.

- [ ] **Step 3: Implement receipt presentation**

Add this to `src/lib/data/evidenceReceipts.ts` after `EvidenceReceipt`:

```ts
export interface ReceiptLocatorPresentation {
  locatorType: LocatorType;
  label: string;
  actionLabel: string;
  note: string;
  isDirectRecord: boolean;
}

export function describeReceiptLocator(
  locatorType: LocatorType,
): ReceiptLocatorPresentation {
  if (locatorType === "official_detail") {
    return {
      locatorType,
      label: "Detalle oficial",
      actionLabel: "Abrir registro",
      note: "Link al registro oficial especifico.",
      isDirectRecord: true,
    };
  }
  if (locatorType === "official_search") {
    return {
      locatorType,
      label: "Busqueda oficial",
      actionLabel: "Buscar registro",
      note: "Link de busqueda oficial usando el identificador del registro.",
      isDirectRecord: false,
    };
  }
  if (locatorType === "official_dataset") {
    return {
      locatorType,
      label: "Dataset oficial",
      actionLabel: "Abrir fuente",
      note: "Fuente oficial del dataset; no es un link directo al registro.",
      isDirectRecord: false,
    };
  }
  return {
    locatorType,
    label: "Sin URL exacta",
    actionLabel: "Ver receipt",
    note: "Faro conserva el registro y hash, pero no hay URL oficial exacta.",
    isDirectRecord: false,
  };
}
```

- [ ] **Step 4: Run receipt tests**

Run:

```bash
node --experimental-strip-types --test tests/receiptPresentation.test.ts tests/evidenceReceipts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/evidenceReceipts.ts tests/receiptPresentation.test.ts
git commit -m "feat: describe receipt locators"
```

---

### Task 3: Expediente View Model

**Files:**
- Create: `src/lib/data/expediente.ts`
- Test: `tests/expediente.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/expediente.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { buildExpediente } from "../src/lib/data/expediente.ts";
import { createEvidenceReceipt } from "../src/lib/data/evidenceReceipts.ts";

const receipt = createEvidenceReceipt({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  snapshotHash: "sha256-snapshot",
  recordId: "14-1002-CON21",
  locatorType: "official_dataset",
  extractedAt: "2026-05-16T00:00:00.000Z",
  parserVersion: "expediente-test@1",
  row: { contrato_numero: "14-1002-CON21" },
});

const relatedReceipt = createEvidenceReceipt({
  ...receipt,
  sourceId: "AR-CONTRATAR-OBRAS",
  sourceName: "CONTRAT.AR obras",
  rawPath: "data/official/ar/onc-contratar-obras.csv",
  recordId: "81-0001-OBR19",
  row: { numero_obra: "81-0001-OBR19" },
});

test("buildExpediente creates the five V1 sections", () => {
  const expediente = buildExpediente({
    id: "AR-CONTRACT-14-1002-CON21",
    countryCode: "AR",
    caseType: "procurement_contract",
    title: "Construccion de cubierta metalica",
    workNumber: "14-1002-CON21",
    year: 2021,
    procedureNumber: "14-0007-LPU20",
    agencyName: "Comision Nacional de Energia Atomica",
    agencyCode: "105",
    contractingUnit: "Compras CNEA",
    executionTerm: null,
    executionTermType: null,
    coordinates: { lat: -34.585722, lon: -58.389361 },
    evidenceLevel: "official_dataset",
    amount: { value: 120, currency: "ARS", label: "monto_contrato" },
    officialBudget: { value: 100, currency: "ARS", label: "presupuesto_oficial" },
    bidderCount: 1,
    offerCount: 1,
    supplierName: "Proveedor de prueba",
    supplierDocument: "30-70043585-3",
    relatedReceipts: [relatedReceipt],
    receipt,
    caveats: ["Contrato oficial; no prueba pagos por si solo."],
  });

  assert.equal(expediente.expedienteType, "faro_expediente_v1");
  assert.equal(expediente.summary.caseId, "AR-CONTRACT-14-1002-CON21");
  assert.match(expediente.summary.plainSummary, /Contrato/);
  assert.equal(expediente.whyItAppeared.length > 0, true);
  assert.equal(expediente.officialTrail.primary.locator.label, "Dataset oficial");
  assert.equal(expediente.officialTrail.related.length, 1);
  assert.equal(expediente.actions.downloadEvidenceHref, "/api/export/AR-CONTRACT-14-1002-CON21");
  assert.equal(expediente.nextVerification.length > 0, true);
});

test("buildExpediente keeps missing geometry as a caveat, not a map point", () => {
  const expediente = buildExpediente({
    id: "PE-CONTRACT-2328678-1",
    countryCode: "PE",
    caseType: "procurement_contract",
    title: "Contratacion de maquinaria pesada",
    workNumber: "2328678-1",
    year: 2025,
    procedureNumber: "1122118",
    agencyName: "Gobierno Regional de Amazonas",
    agencyCode: "010373",
    contractingUnit: "ORDEN DE SERVICIO N. 373",
    executionTerm: "2025-06-03 - 2025-06-11",
    executionTermType: "vigencia_contractual",
    coordinates: null,
    evidenceLevel: "official_dataset",
    amount: { value: 113868.79, currency: "PEN", label: "monto_contratado" },
    supplierName: null,
    supplierDocument: "20487924050",
    receipt,
    caveats: ["Contrato oficial; falta geometria oficial para mapa."],
  });

  assert.equal(expediente.summary.locationLabel, "Sin geometria oficial");
  assert.equal(
    expediente.whyItAppeared.some((signal) => signal.code === "missing_official_geometry"),
    true,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/expediente.test.ts
```

Expected: FAIL with module-not-found for `src/lib/data/expediente.ts`.

- [ ] **Step 3: Implement expediente model**

Create `src/lib/data/expediente.ts`:

```ts
import {
  buildCaseSignals,
  type CaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";
import {
  describeReceiptLocator,
  type EvidenceReceipt,
  type ReceiptLocatorPresentation,
} from "./evidenceReceipts.ts";
import type { CountryCode } from "./sourceCatalog.ts";

export interface ExpedienteReceipt {
  receipt: EvidenceReceipt;
  locator: ReceiptLocatorPresentation;
}

export interface ExpedienteView {
  expedienteType: "faro_expediente_v1";
  generatedAt: string;
  summary: {
    caseId: string;
    countryCode: CountryCode;
    caseType: string | null;
    title: string;
    plainSummary: string;
    amountLabel: string;
    organismLabel: string;
    supplierLabel: string;
    dateLabel: string;
    locationLabel: string;
    evidenceLevel: string | null;
  };
  whyItAppeared: CaseSignal[];
  officialTrail: {
    primary: ExpedienteReceipt;
    related: ExpedienteReceipt[];
  };
  investigationContext: {
    hasOfficialGeometry: boolean;
    satelliteCandidate: boolean;
    relatedReceiptCount: number;
    sourceCount: number;
  };
  actions: {
    officialSourceHref: string;
    downloadEvidenceHref: string;
    caseJsonHref: string;
  };
  caveats: string[];
  nextVerification: string[];
}

export function buildExpediente(caseFile: SignalCaseFile): ExpedienteView {
  const signals = buildCaseSignals(caseFile);
  const primaryReceipt = caseFile.receipt as EvidenceReceipt;
  const relatedReceipts = normalizeReceipts(caseFile.relatedReceipts);
  const sourceCount = new Set([
    primaryReceipt.sourceId,
    ...relatedReceipts.map((receipt) => receipt.sourceId),
  ]).size;

  return {
    expedienteType: "faro_expediente_v1",
    generatedAt: new Date().toISOString(),
    summary: {
      caseId: caseFile.id,
      countryCode: caseFile.countryCode as CountryCode,
      caseType: caseFile.caseType ?? null,
      title: caseFile.title,
      plainSummary: buildPlainSummary(caseFile, signals),
      amountLabel: formatAmount(caseFile.amount),
      organismLabel: caseFile.agencyName ?? "Sin organismo",
      supplierLabel: formatSupplier(caseFile),
      dateLabel: formatDate(caseFile),
      locationLabel: formatLocation(caseFile),
      evidenceLevel: caseFile.evidenceLevel ?? null,
    },
    whyItAppeared: signals,
    officialTrail: {
      primary: {
        receipt: primaryReceipt,
        locator: describeReceiptLocator(primaryReceipt.locatorType),
      },
      related: relatedReceipts.map((receipt) => ({
        receipt,
        locator: describeReceiptLocator(receipt.locatorType),
      })),
    },
    investigationContext: {
      hasOfficialGeometry: Boolean(caseFile.coordinates),
      satelliteCandidate: signals.some((signal) => signal.code === "sentinel_candidate"),
      relatedReceiptCount: relatedReceipts.length,
      sourceCount,
    },
    actions: {
      officialSourceHref: caseFile.receipt.sourceUrl,
      downloadEvidenceHref: `/api/export/${caseFile.id}`,
      caseJsonHref: `/api/cases/${caseFile.id}`,
    },
    caveats: caseFile.caveats ?? [],
    nextVerification: buildNextVerification(signals),
  };
}

function buildPlainSummary(caseFile: SignalCaseFile, signals: CaseSignal[]): string {
  const kind = caseFile.caseType === "procurement_contract"
    ? "Contrato"
    : caseFile.caseType === "procurement_process"
      ? "Adjudicacion"
      : "Caso";
  const primary = signals[0]?.label;
  const suffix = primary ? ` Aparece por ${primary.toLowerCase()}.` : "";
  return `${kind} verificable con fuente oficial.${suffix}`;
}

function formatAmount(amount: SignalCaseFile["amount"]): string {
  if (!amount) return "Sin monto";
  return `${amount.currency} ${Math.round(amount.value).toLocaleString("es-AR")}`;
}

function formatSupplier(caseFile: SignalCaseFile): string {
  return caseFile.supplierName ?? caseFile.supplierDocument ?? "Sin proveedor";
}

function formatDate(caseFile: SignalCaseFile): string {
  const dates = caseFile as SignalCaseFile & {
    awardedAt?: string | null;
    publishedAt?: string | null;
  };
  return dates.awardedAt ?? dates.publishedAt ?? String(caseFile.year ?? "Sin fecha");
}

function formatLocation(caseFile: SignalCaseFile): string {
  if (!caseFile.coordinates) return "Sin geometria oficial";
  return `${caseFile.coordinates.lat}, ${caseFile.coordinates.lon}`;
}

function buildNextVerification(signals: CaseSignal[]): string[] {
  const steps = signals
    .filter((signal) => signal.kind === "watch" || signal.kind === "gap")
    .map((signal) => signal.action);
  return Array.from(new Set([
    ...steps,
    "Abrir la fuente oficial indicada en el receipt.",
    "Cruzar pagos, avance fisico y documentos antes de publicar conclusiones.",
  ]));
}

function normalizeReceipts(value: SignalCaseFile["relatedReceipts"]): EvidenceReceipt[] {
  return (value ?? []) as EvidenceReceipt[];
}
```

- [ ] **Step 4: Run expediente tests**

Run:

```bash
node --experimental-strip-types --test tests/expediente.test.ts tests/receiptPresentation.test.ts tests/caseSignals.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/expediente.ts tests/expediente.test.ts
git commit -m "feat: build expediente view model"
```

---

### Task 4: Repository And API Surfaces

**Files:**
- Modify: `src/lib/caseRepository.ts`
- Create: `src/app/api/leads/route.ts`
- Modify: `src/app/api/cases/[id]/route.ts`
- Modify: `src/app/api/export/[id]/route.ts`
- Test: `tests/exportBundles.test.ts`

- [ ] **Step 1: Add repository/export tests**

Append to `tests/exportBundles.test.ts`:

```ts
import {
  buildEvidencePack,
  buildLeadFeed,
  getExpedienteById,
} from "../src/lib/caseRepository.ts";

test("buildLeadFeed exposes prioritized leads from repository data", () => {
  const feed = buildLeadFeed({ countryCode: "AR", limit: 5 });

  assert.equal(feed.feedType, "faro_case_lead_feed");
  assert.equal(feed.leads.length > 0, true);
  assert.equal(feed.leads.every((lead) => lead.countryCode === "AR"), true);
  assert.equal(feed.leads[0]?.primarySignal.priority >= feed.leads.at(-1)!.primarySignal.priority, true);
});

test("getExpedienteById returns a shaped expediente", () => {
  const lead = buildLeadFeed({ countryCode: "AR", limit: 1 }).leads[0];
  assert.ok(lead);

  const expediente = getExpedienteById(lead.caseId);

  assert.equal(expediente?.expedienteType, "faro_expediente_v1");
  assert.equal(expediente?.summary.caseId, lead.caseId);
  assert.equal((expediente?.whyItAppeared.length ?? 0) > 0, true);
});

test("buildEvidencePack includes related receipts and signals", () => {
  const lead = buildLeadFeed({
    countryCode: "AR",
    sourceId: "AR-CONTRATAR-CONTRATOS",
    limit: 1,
  }).leads[0];
  assert.ok(lead);

  const caseFile = argentinaDataset.cases
    .concat(crossCountryDataset.cases)
    .find((candidate) => candidate.id === lead.caseId) as ExportableCaseFile | undefined;
  assert.ok(caseFile);

  const pack = buildEvidencePack(caseFile);

  assert.equal(pack.packType, "faro_evidence_pack");
  assert.equal(Array.isArray(pack.signals), true);
  assert.equal(Array.isArray(pack.relatedReceipts), true);
  assert.equal(pack.verificationSteps.some((step) => /fuente oficial/i.test(step)), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/exportBundles.test.ts
```

Expected: FAIL because `buildLeadFeed` and `getExpedienteById` are not exported, and `relatedReceipts` is not on the evidence pack.

- [ ] **Step 3: Modify repository facade**

In `src/lib/caseRepository.ts`:

1. Add imports:

```ts
import {
  buildCaseLeads,
  type CaseLead,
  type CaseLeadFilters,
} from "@/lib/data/caseLeads";
import {
  buildExpediente,
  type ExpedienteView,
} from "@/lib/data/expediente";
```

2. Extend `EvidencePack`:

```ts
export interface EvidencePack {
  packType: "faro_evidence_pack";
  generatedAt: string;
  caseFile: FaroCaseFile;
  receipt: FaroCaseFile["receipt"];
  relatedReceipts: FaroCaseFile["receipt"][];
  signals: CaseSignal[];
  caveats: string[];
  verificationSteps: string[];
}
```

3. Add a lead feed type and exports after `buildSignalFeed`:

```ts
export interface CaseLeadFeed {
  feedType: "faro_case_lead_feed";
  generatedAt: string;
  stats: {
    cases: number;
    leads: number;
  };
  filters: CaseLeadFilters;
  leads: CaseLead[];
}

export function buildLeadFeed(filters: CaseLeadFilters = {}): CaseLeadFeed {
  const cases = filterCaseFiles(filters);
  const leads = buildCaseLeads(cases as SignalCaseFile[], filters);
  return {
    feedType: "faro_case_lead_feed",
    generatedAt: new Date().toISOString(),
    stats: {
      cases: cases.length,
      leads: leads.length,
    },
    filters,
    leads,
  };
}

export function getExpedienteById(id: string): ExpedienteView | null {
  const caseFile = getCaseById(id);
  return caseFile ? buildExpediente(caseFile as SignalCaseFile) : null;
}
```

4. Update `buildEvidencePack`:

```ts
export function buildEvidencePack(caseFile: FaroCaseFile): EvidencePack {
  return {
    packType: "faro_evidence_pack",
    generatedAt: new Date().toISOString(),
    caseFile,
    receipt: caseFile.receipt,
    relatedReceipts: caseFile.relatedReceipts ?? [],
    signals: buildCaseSignals(caseFile as SignalCaseFile),
    caveats: caseFile.caveats,
    verificationSteps: [
      "Abrir la fuente oficial indicada en el receipt.",
      "Buscar el numero de obra, contrato o procedimiento en el dataset original.",
      "Revisar receipts relacionados antes de tratar el caso como evidencia cruzada.",
      "Cruzar contratos, pagos y avance fisico antes de publicar conclusiones.",
      "Si se usa Sentinel-2, revisar nubes, fecha de escena y resolucion antes de inferir avance.",
    ],
  };
}
```

- [ ] **Step 4: Add `/api/leads` route**

Create `src/app/api/leads/route.ts`:

```ts
import { NextResponse } from "next/server";

import { buildLeadFeed } from "@/lib/caseRepository";
import type { CountryCode } from "@/lib/data/sourceCatalog";

const countries: CountryCode[] = ["AR", "PE", "CL"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") as CountryCode | null;
  const sourceId = url.searchParams.get("sourceId") ?? undefined;
  const caseType = url.searchParams.get("caseType") ?? undefined;
  const query = url.searchParams.get("q") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 12);

  if (country && !countries.includes(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  return NextResponse.json(
    buildLeadFeed({
      countryCode: country ?? undefined,
      sourceId,
      caseType,
      query,
      limit,
    }),
  );
}
```

- [ ] **Step 5: Return expediente from case API**

Replace `src/app/api/cases/[id]/route.ts` with:

```ts
import { NextResponse } from "next/server";

import { getExpedienteById } from "@/lib/caseRepository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const expediente = getExpedienteById(id);
  if (!expediente) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  return NextResponse.json(expediente);
}
```

- [ ] **Step 6: Run API/repository tests**

Run:

```bash
node --experimental-strip-types --test tests/exportBundles.test.ts tests/caseLeads.test.ts tests/expediente.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/caseRepository.ts src/app/api/leads/route.ts src/app/api/cases/[id]/route.ts src/app/api/export/[id]/route.ts tests/exportBundles.test.ts
git commit -m "feat: expose expediente lead APIs"
```

---

### Task 5: Lead Feed UI

**Files:**
- Create: `src/components/LeadFeed.tsx`
- Modify: `src/components/FaroExperience.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the LeadFeed component**

Create `src/components/LeadFeed.tsx`:

```tsx
"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, Info } from "lucide-react";

import type { CaseLead } from "@/lib/data/caseLeads";
import type { CaseSignal } from "@/lib/data/caseSignals";

export default function LeadFeed({
  leads,
  selectedCaseId,
  onSelectCase,
}: {
  leads: CaseLead[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
}) {
  if (leads.length === 0) {
    return (
      <section className="leadFeed" aria-label="Pistas verificables">
        <div className="leadFeedHeader">
          <span>Pistas verificables</span>
          <strong>0</strong>
        </div>
        <p className="leadEmpty">No hay pistas para estos filtros.</p>
      </section>
    );
  }

  return (
    <section className="leadFeed" aria-label="Pistas verificables">
      <div className="leadFeedHeader">
        <span>Pistas verificables</span>
        <strong>{leads.length}</strong>
      </div>
      <div className="leadList">
        {leads.map((lead) => (
          <button
            key={lead.leadId}
            type="button"
            className={lead.caseId === selectedCaseId ? "leadCard active" : "leadCard"}
            onClick={() => onSelectCase(lead.caseId)}
          >
            <span className={`leadIcon ${lead.primarySignal.kind}`}>
              <SignalIcon signal={lead.primarySignal} />
            </span>
            <span className="leadBody">
              <span className="leadMeta">
                {lead.countryCode} · {lead.sourceId}
              </span>
              <strong>{lead.caseTitle}</strong>
              <small>{lead.why}</small>
            </span>
            <ArrowRight size={15} aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}

function SignalIcon({ signal }: { signal: CaseSignal }) {
  if (signal.kind === "watch") return <AlertTriangle size={15} aria-hidden />;
  if (signal.kind === "ready") return <CheckCircle2 size={15} aria-hidden />;
  if (signal.kind === "gap") return <CircleHelp size={15} aria-hidden />;
  return <Info size={15} aria-hidden />;
}
```

- [ ] **Step 2: Wire leads into FaroExperience**

In `src/components/FaroExperience.tsx`:

1. Add imports:

```tsx
import { buildCaseLeads } from "@/lib/data/caseLeads";
import LeadFeed from "./LeadFeed";
```

2. Add this memo after `countryCases`:

```tsx
  const leads = useMemo(() => {
    return buildCaseLeads(countryCases, { limit: 8 });
  }, [countryCases]);
```

3. Render `LeadFeed` inside `searchDock`, after the date control:

```tsx
        <LeadFeed
          leads={leads}
          selectedCaseId={selectedCase?.id ?? null}
          onSelectCase={setSelectedCaseId}
        />
```

- [ ] **Step 3: Add focused CSS**

Append to `src/app/globals.css`:

```css
.leadFeed {
  display: grid;
  gap: 10px;
  max-height: 38vh;
  min-width: 0;
}

.leadFeedHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(255, 252, 244, 0.64);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.leadFeedHeader strong {
  color: var(--accent);
  font-size: 13px;
}

.leadList {
  display: grid;
  gap: 8px;
  overflow: auto;
  padding-right: 4px;
}

.leadCard {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 18px;
  align-items: start;
  gap: 10px;
  width: 100%;
  border: 1px solid rgba(255, 252, 244, 0.12);
  background: rgba(10, 10, 10, 0.54);
  color: inherit;
  padding: 10px;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease;
}

.leadCard:hover,
.leadCard.active {
  border-color: rgba(243, 201, 105, 0.36);
  background: rgba(30, 25, 14, 0.68);
}

.leadIcon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(255, 252, 244, 0.12);
}

.leadIcon.watch { color: #ffd978; }
.leadIcon.ready { color: #98f5cf; }
.leadIcon.gap { color: #9dd8ff; }
.leadIcon.context { color: rgba(255, 252, 244, 0.7); }

.leadBody {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.leadMeta {
  color: rgba(255, 252, 244, 0.42);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.leadBody strong {
  color: rgba(255, 252, 244, 0.92);
  font-size: 12px;
  line-height: 1.25;
}

.leadBody small,
.leadEmpty {
  color: rgba(255, 252, 244, 0.58);
  font-size: 11px;
  line-height: 1.35;
}
```

- [ ] **Step 4: Verify UI compiles**

Run:

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LeadFeed.tsx src/components/FaroExperience.tsx src/app/globals.css
git commit -m "feat: add expediente lead feed"
```

---

### Task 6: Expediente UI Sections

**Files:**
- Modify: `src/components/CaseSignals.tsx`
- Modify: `src/components/CaseDetails.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Show evidence and next action in signals**

In `src/components/CaseSignals.tsx`, replace the inner content of each `signalItem` with:

```tsx
            <div>
              <div className="signalTitle">
                <strong>{signal.label}</strong>
                <span>{labelKind(signal.kind)}</span>
              </div>
              <p>{signal.summary}</p>
              <dl className="signalProof">
                <div>
                  <dt>Evidencia</dt>
                  <dd>{signal.evidence}</dd>
                </div>
                <div>
                  <dt>Caveat</dt>
                  <dd>{signal.caveat}</dd>
                </div>
                <div>
                  <dt>Siguiente paso</dt>
                  <dd>{signal.action}</dd>
                </div>
              </dl>
            </div>
```

- [ ] **Step 2: Use expediente model in CaseDetails**

In `src/components/CaseDetails.tsx`:

1. Add import:

```tsx
import { buildExpediente } from "@/lib/data/expediente";
```

2. At the top of `CaseDetails`, after `relatedReceipts`, add:

```tsx
  const expediente = buildExpediente(caseFile);
```

3. Replace the current `whyBox` paragraph with:

```tsx
      <section className="whyBox">
        <h2>Por que aparecio</h2>
        <p>{expediente.summary.plainSummary}</p>
      </section>
```

4. Replace the `receiptBox` header and rows with:

```tsx
      <section className="receiptBox">
        <h2>Rastro oficial</h2>
        <dl>
          <ReceiptRow label="Fuente" value={caseFile.receipt.sourceName} />
          <ReceiptRow label="Locator" value={expediente.officialTrail.primary.locator.label} />
          <ReceiptRow label="Nota" value={expediente.officialTrail.primary.locator.note} />
          <ReceiptRow label="Hash" value={`${caseFile.receipt.fileHash.slice(0, 24)}...`} />
          <ReceiptRow label="Raw path" value={caseFile.receipt.rawPath} />
          <ReceiptRow
            label="Extraido"
            value={new Date(caseFile.receipt.extractedAt).toLocaleString("es-AR")}
          />
        </dl>
```

5. After `traceBox`, add:

```tsx
      <section className="nextStepsBox">
        <h2>Que verificar despues</h2>
        <ol>
          {expediente.nextVerification.slice(0, 5).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
```

- [ ] **Step 3: Add CSS for proof and next steps**

Append to `src/app/globals.css`:

```css
.signalProof {
  display: grid;
  gap: 7px;
  margin: 10px 0 0;
}

.signalProof div {
  display: grid;
  gap: 2px;
}

.signalProof dt,
.nextStepsBox h2 {
  color: rgba(255, 252, 244, 0.42);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.signalProof dd {
  margin: 0;
  color: rgba(255, 252, 244, 0.64);
  font-size: 11px;
  line-height: 1.35;
}

.nextStepsBox {
  display: grid;
  gap: 10px;
  border: 1px solid rgba(255, 252, 244, 0.12);
  background: rgba(10, 10, 10, 0.38);
  padding: 14px;
}

.nextStepsBox ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: rgba(255, 252, 244, 0.68);
  font-size: 12px;
  line-height: 1.45;
}
```

- [ ] **Step 4: Verify UI compiles**

Run:

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CaseSignals.tsx src/components/CaseDetails.tsx src/app/globals.css
git commit -m "feat: organize expediente details"
```

---

### Task 7: Final Verification

**Files:**
- Read: all changed files

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run data verifier**

Run:

```bash
npm run data:verify
```

Expected:

```json
{
  "checkedDatasets": 5,
  "checkedCases": 371,
  "checkedReceipts": 633,
  "checkedRawFiles": 11,
  "errors": []
}
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: Next build succeeds and lists `/`, `/api/cases`, `/api/cases/[id]`, `/api/export`, `/api/export/[id]`, `/api/leads`, `/api/readiness`, and `/api/signals`.

- [ ] **Step 5: Smoke API routes**

Run:

```bash
npm run dev -- -p 3003
```

In another terminal:

```bash
curl -sS "http://127.0.0.1:3003/api/leads?country=AR&limit=3" | head -c 500
curl -sS "http://127.0.0.1:3003/api/readiness" | head -c 500
```

Expected: `/api/leads` returns `faro_case_lead_feed`; `/api/readiness` returns coverage JSON.

- [ ] **Step 6: Manual browser check**

Open:

```text
http://127.0.0.1:3003/?demo=map
```

Expected:

- lead feed is visible and scan-friendly;
- selecting a lead updates the case panel;
- case panel starts with why the case appeared;
- official trail distinguishes dataset-level receipts;
- export link downloads JSON;
- Peru and Chile explorer paths still show exportable cases without map points.

- [ ] **Step 7: Final status check**

Run:

```bash
git status --short --branch
git log --oneline -5
```

Expected: only intended implementation files changed or committed. Do not revert unrelated line-ending changes from the recovered checkout.
