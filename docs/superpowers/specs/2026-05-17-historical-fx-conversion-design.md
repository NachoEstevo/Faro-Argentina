# Historical FX Conversion (ARS/CLP/PEN → USD) — Design

**Status:** approved (brainstorming)
**Date:** 2026-05-17
**Branch:** feat/ui-clean-redesign (or new feat branch at implementation)

## Problem

Faro shows procurement amounts in local currency (ARS for AR contracts, CLP for CL, PEN for PE). For investigators — and for the LATAM comparative view — a USD equivalent is essential. The conversion must be:

1. **Date-correct.** Argentine licitaciones span decades of wildly different FX regimes; using today's rate is meaningless. The rate has to match the date of the contract event.
2. **Source-correct.** Argentina has many parallel dollars (oficial, mayorista, MEP, CCL, blue, tarjeta). For public procurement, only the **official mayorista BCRA Comunicación A 3500** is defensible — it is the rate the State itself uses to denominate foreign-currency obligations. For CL and PE we use the equivalent central-bank reference rates.
3. **Auditable.** Every conversion has to be traceable to a specific snapshot of an official series, with hash, just like the rest of the Faro spine.

## Goals

- Each `amount` and `officialBudget` field on a case file carries a USD equivalent computed at the time of the contract event, or an explicit reason it was not computed.
- The UI shows the USD equivalent inline next to the local amount, with the FX date and source visible (tooltip or subtitle).
- The evidence pack export (`buildEvidencePack`) includes the USD equivalent automatically because it is part of the receipt.
- `data:verify` enforces that no case slips through with a non-USD amount and neither a `usdEquivalent` nor a `usdConversionNote`.

## Non-goals

- **No alternative dollar types.** Only official central-bank reference rates. No blue, MEP, CCL, tarjeta.
- **No interpolation, no last-business-day fallback.** If the exact anchor date has no FX, we try the next anchor candidate; if none of the cascade dates have FX, the case is reported as not-converted.
- **No live conversion at runtime.** All conversion happens at build time, baked into the JSON spine. Consistent with the rest of the project (`data:fetch` → `data:build` → `data:verify`).
- **No retro-conversion of historical judicial context.** Those records do not carry monetary amounts that need conversion in the current schema.

## Data Sources

| Country | Currency | Series | Source | Snapshot path |
|---------|----------|--------|--------|---------------|
| AR | ARS | Tipo de cambio mayorista, BCRA Com. A 3500 | datos.gob.ar / BCRA Series Estadísticas (whichever exposes the cleanest CSV) | `data/official/fx/ar-bcra-com-a3500-<YYYY-MM-DD>.csv` |
| CL | CLP | Dólar observado, diario | Banco Central de Chile (BCCh) | `data/official/fx/cl-bcch-observado-<YYYY-MM-DD>.csv` |
| PE | PEN | Tipo de cambio interbancario venta, diario | BCRP series web | `data/official/fx/pe-bcrp-interbancario-<YYYY-MM-DD>.csv` |

Each series gets a `source-catalog.json` entry with `sourceId`, `sourceName`, `sourceUrl`, `licenseUrl`, and is registered in `data/official/snapshot-manifest.json` with a content hash. The exact endpoint per series is chosen during implementation; the contract is that the snapshot is reproducible and the file is content-hashed.

## Anchor-date Cascade

For each `amount` on a case file we build a list of anchor candidates from the case in this priority order, then walk it top-to-bottom:

1. **Contract signed** — `contrato_perfeccionamiento_fecha` (AR work cases) or the country-specific equivalent on cross-country cases (e.g. CL `fechaAdjudicacion`, PE `awardDate` from OCDS releases — exact field resolved per dataset in build code).
2. **Opening** — `openingAt`.
3. **Published** — `publishedAt`.
4. **Year fallback** — `year` mapped to January 1st of that year.

The first candidate that **exists and has an exact FX rate on that date in the loaded series** wins. The conversion records `anchorDate` (the date that won), `anchorField` (the slot — `contract_signed | opening | published | year`), and the FX series source. If a candidate's date exists but has no FX entry, we move to the next candidate — we do **not** fall back to a nearby day.

If no candidate yields an exact FX hit, the result is `usdEquivalent: null` with `usdConversionNote: "no_fx_for_anchor_dates"`. If the case has no non-null dates at all, it's `"no_anchor_date"` and we skip the FX lookup entirely.

## Data Model Changes

In `src/lib/data/argentinaContracts.ts`, `src/lib/data/crossCountryCases.ts`, and any other place that constructs an `amount` or `officialBudget`:

```ts
type FxConversion = {
  usd: number;                                  // converted value, full precision
  fxRate: number;                               // units of local currency per 1 USD
  fxDate: string;                               // YYYY-MM-DD of the rate actually used
  anchorDate: string;                           // YYYY-MM-DD of the anchor candidate that won
  anchorField: "contract_signed" | "opening" | "published" | "year";
  fxSource: {
    sourceId: string;
    sourceName: string;
    sourceUrl: string;
    snapshotHash: string;
  };
};

type Amount = {
  value: number;
  currency: "ARS" | "CLP" | "PEN" | "USD" | string;
  label: string;
  usdEquivalent: FxConversion | null;
  usdConversionNote?:
    | "no_anchor_date"
    | "no_fx_for_anchor_dates"
    | "currency_not_supported"
    | "already_usd";
};
```

`usdEquivalent` is **always present** on every `amount` (null when no conversion happened). `usdConversionNote` is present whenever `usdEquivalent` is null **or** when the conversion is trivial (`already_usd`). This shape makes the verify step a simple non-null-or-note check.

## Modules

### `src/lib/data/fx.ts` (new)

Pure module, no I/O at call time. Loads snapshot CSVs once at build start.

- `type FxSeries = Map<string /* YYYY-MM-DD */, { rate: number; sourceMeta: FxSourceMeta }>`
- `loadFxSeries(currency: "ARS" | "CLP" | "PEN"): FxSeries` — reads from `data/official/fx/...` based on `snapshot-manifest.json`. Throws if the snapshot is missing.
- `convertAmountToUsd({
    amount: number,
    currency: string,
    anchorCandidates: Array<{ field: "contract_signed" | "opening" | "published" | "year", date: string | null }>,
    series: FxSeriesRegistry,
  }): { conversion: FxConversion | null; note?: ConversionNote }` — pure, deterministic.

Rules:
- `currency === "USD"` → `{ conversion: null, note: "already_usd" }`.
- Currency without a known series → `{ conversion: null, note: "currency_not_supported" }`.
- No anchor candidate has a non-null date → `{ conversion: null, note: "no_anchor_date" }`.
- Cascade exhausted with no exact-date FX hit → `{ conversion: null, note: "no_fx_for_anchor_dates" }`.
- Otherwise compute `usd = round(amount / rate, 2)` and populate `FxConversion`.

### `scripts/fetch-fx-snapshots.ts` (new)

Run as part of `data:fetch`. Downloads each FX CSV, writes to `data/official/fx/<name>-<YYYY-MM-DD>.csv`, updates `snapshot-manifest.json` with hash, and appends/updates the matching entry in `source-catalog.json`. Same hygiene pattern as `fetch-official-snapshots.ts`.

### Build pipeline integration

In `scripts/build-argentina-work-cases.ts`, `scripts/build-cross-country-cases.ts`, and any other build script that touches `amount`:

1. Load all FX series at the top.
2. When constructing an `amount` or `officialBudget`, build the `anchorCandidates` array from the row, call `convertAmountToUsd`, attach `usdEquivalent` and `usdConversionNote` to the output.

### `src/lib/format/money.ts` (new or extended if it already exists)

- `formatAmountWithUsd(amount: Amount, options?: { locale?: string }): string` — main entry, returns the inline string used in UI: `"$ 1.234.567 ARS · ≈ US$ 60.518 (al 14/03/2018, BCRA A 3500)"`.
- `formatLocalOnly(amount: Amount)` and `formatUsdOnly(amount: Amount)` helpers for places that want only one side.
- When `usdEquivalent === null`, returns only the local-currency segment. Callers attach the "sin cotización oficial para esta fecha" chip; the helper exposes `amount.usdConversionNote` so the chip's tooltip can explain which dates were attempted.

### UI touchpoints

- `CasePanel` — primary monto and `officialBudget` rows use `formatAmountWithUsd`.
- Map marker tooltip / popover — if it shows the monto, same helper.
- Lead list rows — same helper.
- Evidence pack export — no UI change needed; the JSON already carries `usdEquivalent` because it comes from the receipt.

## Verification and Reporting

- `scripts/verify-data-spine.ts`: for every case where `amount.currency !== "USD"` (and same for `officialBudget`), require either `usdEquivalent !== null` or a non-empty `usdConversionNote`. Hard fail otherwise. Apply identically to `officialBudget`.
- `scripts/report-data-quality.ts`: add a "Conversión USD" section with per-country counts grouped by `usdConversionNote`. Surfaces FX series gaps (e.g., a country's series start date being later than some contracts).
- Snapshot integrity: `data:verify` already checks `snapshot-manifest.json` hashes; the FX CSVs ride that mechanism for free.

## Testing

`tests/fx.test.ts` (new):

1. Cascade hits on the first candidate (`contrato_perfeccionamiento_fecha`).
2. First candidate has no FX entry → falls through to second candidate which does → conversion uses second candidate's date, `anchorField` recorded as the second one.
3. All four candidates fail → `null` + `"no_fx_for_anchor_dates"`.
4. `currency === "USD"` → `null` + `"already_usd"`, no rate lookup attempted.
5. Currency unknown → `null` + `"currency_not_supported"`.
6. Missing anchor dates entirely → `null` + `"no_anchor_date"`.
7. **Golden case:** one historical Argentine contract with a known date and amount, converted against a manually-verified BCRA rate. Same for one CL and one PE case. Locks the math.

Existing tests that touch `amount` (`caseInspector.test.ts`, `caseSignals.test.ts`, etc.) get their fixtures extended so `usdEquivalent` and `usdConversionNote` round-trip correctly.

## Error Handling

- **FX CSV missing at build time:** `loadFxSeries` throws with the path expected; `data:build` fails loud. No silent fallback to a different series or to stale.
- **FX CSV parse error:** same — fail the build.
- **Unknown currency at runtime:** never reached, since the conversion happens at build. The UI helper handles `usdEquivalent === null` by showing only the local segment.
- **Series start postdates many contracts:** expected, especially for older AR cases. They get `usdConversionNote: "no_fx_for_anchor_dates"`. Visible in the data-quality report so we can decide later whether to extend coverage with a separate historical source.

## Out of scope (explicitly)

- Showing or computing blue/MEP/CCL.
- Adjusting for inflation (constant-USD or constant-ARS-of-year-X). Different problem.
- Backfilling FX for synthetic/historical-judicial cases that do not have monetary amounts in the schema.
- A runtime currency-switch UI. We render both inline; if that becomes cluttered we revisit, but YAGNI for now.

## Open implementation choices (small, decided during build)

- Exact BCRA endpoint: datos.gob.ar `tipos-de-cambio-historicos` vs BCRA Series Estadísticas direct CSV. Whichever is most stable and content-hashable.
- Exact column to use from BCCh CSV (`Dólar observado` is the canonical column name; verify on snapshot).
- Rounding rule for `usd`: 2 decimals for amounts under USD 100k, integer for amounts above, or always 2 decimals. Decide when writing tests so golden cases lock it.

## Acceptance

- All existing `amount`/`officialBudget` fields on all cases either carry a `usdEquivalent` or a `usdConversionNote`. `data:verify` passes.
- The data-quality report lists per-country conversion coverage and gap reasons.
- CasePanel shows `"$ 1.234.567 ARS · ≈ US$ 60.518 (al 14/03/2018, BCRA A 3500)"` for a converted case, and `"$ X ARS"` + a "sin cotización oficial para esta fecha" chip for a non-converted case.
- Golden tests pin three known conversions (one AR, one CL, one PE).
