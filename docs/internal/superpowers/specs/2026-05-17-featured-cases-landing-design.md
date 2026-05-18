# Featured Cases on Landing Map — Design Spec

**Date:** 2026-05-17
**Branch:** `feat/best-known-cases`

## Context

The landing page (`/`) shows a regional map of AR/PE/CL. Today, a user lands there and has no signal about which expedientes inside each country are worth a first look. They have to click a country, then explore. We want to surface the most recognizable cases per country directly on the landing map, with a one-click deep-link into the right view (map mode or explorer mode).

Two cases per country are featured — one with real coordinates (entry through the map) and one without (entry through the explorer). The visual is an editorial leader-line callout: small dot on the map, thin line to a compact card with the case name + one line of context + a "Ver →" affordance.

## Goals

1. Show two emblematic cases per country on the landing map with annotated callouts.
2. One-click deep-link into the relevant case (mapa or explorer based on whether the case has coords).
3. Respect Nielsen Norman heuristics: recognition over recall, visibility of status, match between system and real world, aesthetic and minimalist design.
4. Stagger entry animation so the user immediately perceives "there's something to investigate here".
5. Reuse existing tokens, easings, and module patterns from `MapUI`/`RegionalMap`.

## Non-goals

- Mobile callout experience (`<720px` hides them; we keep mobile as country-tap-to-open).
- Toggleable visibility or user-curated lists.
- More than 2 cases per country.
- Animating callouts out when navigating away (the page just unmounts).
- Automated UI tests (project has no jsdom harness).

## Decisions

| Question | Decision |
|---|---|
| How many per country? | 2 — one `geo`, one `documentary` |
| Click target | Deep-link `/pais/{code}?case={caseId}[&mode=explorer]` |
| Callout style | Editorial leader line: dot → thin diagonal line → card |
| Visibility | Permanent on load with staggered fade-in |
| Differentiation | Icon + microlabel + dot/line color tint by variant |
| Mobile | Hidden under 720px width |

## Curated cases

Each entry is final. PE/CL "documentary" cases are curated to high-amount no-geo procurement records (not famous mediatic cases, since the data doesn't have those for PE/CL).

```ts
export interface FeaturedCase {
  countryCode: "AR" | "PE" | "CL";
  caseId: string;
  variant: "geo" | "documentary";
  marker: { lat: number; lon: number };   // dot position on landing map
  callout: { lat: number; lon: number }; // card anchor position
  kicker: string;                         // e.g. "OBRA · SANTA CRUZ"
  title: string;                          // 2 lines max
  blurb: string;                          // 1-2 lines context
}

const FEATURED_CASES: FeaturedCase[] = [
  // Argentina
  {
    countryCode: "AR",
    caseId: "AR-CONTRACT-46-1585-CON21",
    variant: "geo",
    marker: { lat: -46.076525, lon: -67.628974 },
    callout: { lat: -42.0, lon: -55.0 },
    kicker: "OBRA · PATAGONIA",
    title: "Vialidad — Ruta 3 Patagonia",
    blurb: "DNV · USD 67M · obras Santa Cruz/Chubut",
  },
  {
    countryCode: "AR",
    caseId: "AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026",
    variant: "documentary",
    marker: { lat: -34.6, lon: -58.4 },
    callout: { lat: -29.5, lon: -49.0 },
    kicker: "CAUSA JUDICIAL",
    title: "Cuadernos / La Camarita",
    blurb: "Juicio oral TOF 7 · contratos y proveedores",
  },
  // Peru
  {
    countryCode: "PE",
    caseId: "PE-CONTRACT-2343672-1",
    variant: "geo",
    marker: { lat: -10.643432, lon: -76.194278 },
    callout: { lat: -6.0, lon: -68.0 },
    kicker: "OBRA · PASCO",
    title: "Pasco — obra Gobierno Regional",
    blurb: "USD 52M · expediente técnico + ejecución",
  },
  {
    countryCode: "PE",
    caseId: "PE-CONTRACT-2377518-1",
    variant: "documentary",
    marker: { lat: -15.2, lon: -75.2 },
    callout: { lat: -18.5, lon: -84.0 },
    kicker: "CONTRATO · ICA",
    title: "Marcona — parque urbano",
    blurb: "Municipalidad distrital · USD 1.8M",
  },
  // Chile
  {
    countryCode: "CL",
    caseId: "CL-TENDER-1057491-76-LP26",
    variant: "geo",
    marker: { lat: -33.430964, lon: -70.606399 },
    callout: { lat: -28.0, lon: -62.5 },
    kicker: "SALUD · SANTIAGO",
    title: "Hospital Roberto del Río",
    blurb: "Campaña IRA 2026 · servicios clínicos",
  },
  {
    countryCode: "CL",
    caseId: "CL-OCDS-608-282-I225",
    variant: "documentary",
    marker: { lat: -33.02, lon: -71.55 },
    callout: { lat: -38.0, lon: -82.5 },
    kicker: "SALUD · VIÑA DEL MAR",
    title: "Marcapasos Hospital Fricke",
    blurb: "Servicio quirúrgico · USD 2.3M",
  },
];
```

All `callout` coordinates are picked so the cards land over open ocean (Atlantic or Pacific) or low-density inland areas, never overlapping a country shape or another callout.

## Architecture

### File structure

**New:**

```
src/data/featuredCases.ts                              # the const array above
src/components/RegionalMap/FeaturedCasesOverlay.tsx    # React/Leaflet overlay component
src/components/RegionalMap/FeaturedCasesOverlay.module.css
```

**Modified:**

- `src/components/RegionalMap/CountryMap.tsx` — mount `<FeaturedCasesOverlay />` inside `<MapContainer>`.
- `src/app/pais/[code]/page.tsx` — read `searchParams.case` and `searchParams.mode`, pass to `FaroExperience`.
- `src/components/FaroExperience.tsx` — accept new `initialCaseId?: string` prop, seed `selectedCaseId` state.

**Not touched:** `FaroExperience` state shape (only adds a new optional prop), `CountrySidebar`, `SidebarFilters`, `MapUI/CasePanel`, `MapLegend`, `CaseMap`, `Explorer/ExplorerView`, `CaseDetails`.

### `FeaturedCasesOverlay` component

Client component, child of `<MapContainer>`. Uses `useMap()`. Maintains a piece of state — a `Map<caseId, { dot: Point; card: Point; visible: boolean }>` — recomputed whenever the Leaflet view changes (`move`, `zoom`, `viewreset`, `resize`) by projecting each `marker` and `callout` lat/lon through `map.latLngToContainerPoint(...)`.

Renders a single absolutely-positioned host `<div>` that sits as a sibling of the Leaflet panes inside the `MapContainer`. The host has `pointer-events: none`. Inside it:

- One `<svg>` covering the host viewport with one `<line>` per case, drawn between dot pixel and card pixel.
- One `<button>` per case for the card — positioned via `transform: translate(${cardX}px, ${cardY}px)`. `pointer-events: auto` only on the buttons (and on the dots).
- One `<span>` per case for the dot — positioned via `transform: translate(${dotX}px, ${dotY}px)`.

Click handler on each card (or dot, both navigate):

```ts
const href = `/pais/${countryCode}` + buildSearch(caseId, variant);
router.push(href);

function buildSearch(caseId: string, variant: "geo" | "documentary") {
  const params = new URLSearchParams({ case: caseId });
  if (variant === "documentary") params.set("mode", "explorer");
  return `?${params.toString()}`;
}
```

Visibility check: if either projected point has negative coords or exceeds container bounds by more than a card width, mark the case `visible: false` and render with `opacity: 0; pointer-events: none`.

### Page deep-link wiring

`src/app/pais/[code]/page.tsx` is async and receives `searchParams` from Next App Router. It reads `searchParams.case` (string | string[] | undefined) and `searchParams.mode`. Sanitizes to a single string and a `"map" | "explorer"` literal; passes to `FaroExperience`:

```tsx
<FaroExperience
  dataset={...}
  crossCountryCases={...}
  explorerCases={...}
  initialCountry={code}
  initialEntryOpen={false}             // skip welcome overlay on deep-link
  initialMode={mode === "explorer" ? "explorer" : "map"}
  initialCaseId={typeof caseParam === "string" ? caseParam : undefined}
/>
```

When `initialCaseId` is set, we also force `initialEntryOpen={false}` so the welcome overlay doesn't intercept the deep-link.

`FaroExperience` change: add `initialCaseId?: string` to `Props`. Inside, change the existing `useState<string>("")` for `selectedCaseId` to `useState<string>(initialCaseId ?? "")`. Nothing else changes — the existing effect that validates `selectedCaseId` against the pool will clear it if the id doesn't exist (graceful).

### Visual specification

**Dot:**
- `geo`: 8px solid circle, fill `var(--cf-accent)` (#5aa9e5), with `box-shadow: 0 0 0 6px rgba(90, 169, 229, 0.18)` to render a halo ring. Pulse animation on the dot element via `transform: scale(1) → scale(1.08) → scale(1)` over 2.4s ease-in-out infinite; because the halo is a box-shadow on the same element, it scales together (paused under `prefers-reduced-motion: reduce`).
- `documentary`: 8px circle with `border: 1.5px solid var(--cf-accent)` and fill `rgba(90, 169, 229, 0.2)`. No pulse. Communicates "documental, no obra".

**Leader line:**
- 1px stroke.
- `geo`: solid, color `rgba(255, 255, 255, 0.55)`.
- `documentary`: `stroke-dasharray: 3 3`, color `rgba(255, 255, 255, 0.35)`.
- Endpoint on the card side is the corner of the card closest to the dot.

**Card:**
- 200-220px wide, padding `12px 14px`.
- Background `rgba(13, 15, 19, 0.92)` with `backdrop-filter: blur(12px)`.
- Border 1px `rgba(255, 255, 255, 0.08)`, radius 10px, shadow `0 8px 24px rgba(0, 0, 0, 0.4)`.
- Layout (top → bottom):
  - Kicker row: icon 11px (lucide `MapPin` for `geo`, `Scale` for `documentary`) + microlabel text 10px tabular caps `letter-spacing: 0.08em` color `--cf-text-muted`.
  - Title: 14px font-weight 600, color `--cf-text`, max 2 lines (`-webkit-line-clamp: 2`).
  - Blurb: 12px line-height 1.5, color `--cf-text-muted`, max 2 lines.
  - Action: 12px color `--cf-accent`, text `Ver en el mapa →` (geo) or `Leer expediente →` (documentary).
- Whole card is a `<button type="button">` with proper `aria-label` describing the destination ("Abrir Causa Vialidad en el mapa de Argentina").
- Focus state: `box-shadow: 0 0 0 2px rgba(90, 169, 229, 0.7)`.

**Animation (entry):**
- `@starting-style` with stagger via `animation-delay`:
  - Card #1: delay 200ms
  - Card #2: delay 280ms
  - …each +80ms.
- From state: `opacity: 0; transform: translateY(8px) scale(0.96)`.
- To state: `opacity: 1; transform: translateY(0) scale(1)`.
- Duration 320ms, ease `cubic-bezier(0.32, 0.72, 0, 1)` (same easing token used in `MapUI`).
- Lines and dots animate together with their card (same delay).
- `prefers-reduced-motion: reduce` → all transitions to 0.01ms; pulse animation disabled (global rule already exists in `globals.css`).

**Mobile (`max-width: 720px`):**
- `FeaturedCasesOverlay` renders nothing (`display: none` on the host).

### Behaviour at pan/zoom

The component subscribes to four Leaflet map events: `move`, `zoom`, `viewreset`, `resize`. Each fires the same handler, which iterates `FEATURED_CASES`, projects both `marker` and `callout` lat/lon, computes container-relative pixels, and updates internal state. React then re-renders only the transforms.

To keep this cheap: handler debounced via `requestAnimationFrame` (collapse multiple events in the same frame). No throttling beyond rAF — Leaflet itself fires `move` plenty during drag.

On unmount (page leaves), the component removes event listeners in the effect's cleanup.

## Verification

**Manual smoke matrix** (`npm run dev` → `http://127.0.0.1:3002/`):

- Landing loads → 6 callouts appear with stagger.
- Pan/zoom → cards and lines track without lag.
- Click each card → arrives at the expected URL with panel/explorer open on the right case.
- Mobile viewport (<720px) → callouts not visible.
- DevTools `prefers-reduced-motion: reduce` → animations and pulse disabled.
- Tab order: each card focusable; Enter activates navigation.
- Back from a `/pais/X` page (top-left "Mapa general" button) → returns to `/`, callouts re-animate.

**Technical checks:**

```bash
npm run typecheck
npm run test
```

**No-regression diff:**

```bash
git diff main..HEAD -- \
  src/components/RegionalMap/CountrySidebar.tsx \
  src/components/RegionalMap/SidebarFilters.tsx \
  src/components/RegionalMap/MapLegend.tsx \
  src/components/RegionalMap/MobileHeader.tsx \
  src/components/RegionalMap/RegionalSidebar.tsx \
  src/components/MapUI/ \
  src/components/CaseMap.tsx \
  src/components/CaseDetails.tsx \
  src/components/Explorer/
```
Must be empty.

## Risks

| Risk | Mitigation |
|---|---|
| `useMap` doesn't fire `move` for the initial view → callouts invisible on first paint | The effect runs the projection once on mount before subscribing to events |
| `latLngToContainerPoint` returns negatives when the dot/card is outside the visible viewport | Computed `visible` flag hides the callout (`opacity: 0; pointer-events: none`) but keeps it mounted so re-entry animates |
| SVG lines z-index below tile pane | Overlay host has `z-index: 401`; tile pane default is 200 |
| Card click bleeds through to country GeoJSON below | Overlay host is `pointer-events: none`; only cards and dots opt back in with `pointer-events: auto` |
| Curated `caseId` doesn't exist in data (e.g. dataset regenerates and ids change) | `FaroExperience` already clears `selectedCaseId` if it can't find it in the pool; URL still navigates to the country; user sees the country map without panel |
| Stagger delays cumulative over 80ms make the last card noticeably slow | Total animation finishes within 200ms + 5×80ms = 600ms; acceptable (under the 1s rule) |

## Out of scope

- Mobile callout treatment (out — hidden under 720px)
- Toggle / user preference to show/hide featured cases
- Animating exit when user clicks a card
- More than 2 cases per country
- UI tests with jsdom

## Notes for implementer

1. Branch is `feat/best-known-cases`. Never push to remote unless explicitly asked.
2. Never commit to `main`.
3. Read this spec end-to-end before touching code.
4. Do NOT touch any file listed under "Not touched" — Explorer and CasePanel work in parallel.
5. The featured case ids in `FEATURED_CASES` must exist in the underlying datasets. If a dataset regenerates and breaks an id, the overlay still works (the URL navigates to the country, just without panel open).
6. Animations rely on `@starting-style`; browsers without support degrade to instant (acceptable).
