# Featured Cases on Landing Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Annotate the regional landing map with 2 emblematic cases per country (AR/PE/CL), each rendered as a small dot + thin leader line + compact card. Each card deep-links to the country page with the right case open (map or explorer mode depending on whether the case has coordinates).

**Architecture:** A new `FeaturedCasesOverlay` React component, mounted inside the landing `<MapContainer>`, subscribes to Leaflet map events and projects curated `lat/lon` coords into container pixels. It renders absolutely-positioned dots, an SVG line layer, and clickable cards. Click navigates to `/pais/{code}?case={id}[&mode=explorer]`. The country page reads the `case` param and passes it as `initialCaseId` to `FaroExperience`, which seeds `selectedCaseId` state so the panel/explorer detail open on mount.

**Tech Stack:** Next.js 16 App Router, React 19.2, TypeScript 6, Leaflet 1.9 + react-leaflet 5, lucide-react, CSS Modules. No new dependencies.

**Pre-flight for the engineer:**
- Branch: `feat/best-known-cases`. Never push to remote unless asked. Never commit to `main`.
- Spec: `docs/superpowers/specs/2026-05-17-featured-cases-landing-design.md` — read it first.
- Tokens live in `src/app/globals.css` as `--cf-*` vars; reuse them.
- Dev server: `npm run dev` → `http://127.0.0.1:3002`.
- Project uses `node --test`; no jsdom. UI is verified manually in browser.

---

## File Structure

**New:**
```
src/data/featuredCases.ts                              # curated FEATURED_CASES const
src/components/RegionalMap/FeaturedCasesOverlay.tsx    # overlay component
src/components/RegionalMap/FeaturedCasesOverlay.module.css
```

**Modified:**
- `src/app/pais/[code]/page.tsx` — add `case` searchParam read; pass `initialCaseId` to `FaroExperience`.
- `src/components/FaroExperience.tsx` — accept new `initialCaseId?: string` prop; seed `useState<string>(initialCaseId ?? "")`.
- `src/components/RegionalMap/CountryMap.tsx` — mount `<FeaturedCasesOverlay />` inside `<MapContainer>`.

**Not touched:** any other file. Specifically: `CountrySidebar`, `SidebarFilters`, `MapLegend`, `MobileHeader`, `RegionalSidebar`, `MapUI/*`, `CaseMap.tsx`, `CaseDetails.tsx`, `Explorer/*`.

---

### Task 1: Add curated `featuredCases.ts` + wire deep-link through `page.tsx` and `FaroExperience`

This task lands the data + URL plumbing so the next task can plug the overlay in and verify end-to-end.

**Files:**
- Create: `src/data/featuredCases.ts`
- Modify: `src/app/pais/[code]/page.tsx`
- Modify: `src/components/FaroExperience.tsx`

- [ ] **Step 1: Create `src/data/featuredCases.ts`**

```ts
export type FeaturedVariant = "geo" | "documentary";

export interface FeaturedCase {
  countryCode: "AR" | "PE" | "CL";
  caseId: string;
  variant: FeaturedVariant;
  marker: { lat: number; lon: number };
  callout: { lat: number; lon: number };
  kicker: string;
  title: string;
  blurb: string;
}

export const FEATURED_CASES: FeaturedCase[] = [
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

- [ ] **Step 2: Modify `src/components/FaroExperience.tsx` to accept `initialCaseId`**

Find the `Props` interface (around line 34) and add the new optional prop. Then update the destructure and the `useState` initialization.

In the imports / Props area:

```tsx
interface Props {
  dataset: CaseDataset<ArgentinaWorkCase>;
  crossCountryCases: CrossCountryCaseFile[];
  explorerCases?: ExplorerCase[];
  initialCountry?: "AR" | "PE" | "CL";
  initialEntryOpen?: boolean;
  initialMode?: "map" | "explorer";
  initialCaseId?: string;
}
```

Update the component signature destructure:

```tsx
export default function FaroExperience({
  dataset,
  crossCountryCases,
  explorerCases,
  initialCountry = "AR",
  initialEntryOpen = true,
  initialMode = "map",
  initialCaseId,
}: Props) {
```

Locate the line that declares `selectedCaseId` (currently `const [selectedCaseId, setSelectedCaseId] = useState<string>("");`) and change it to:

```tsx
const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId ?? "");
```

Nothing else changes in `FaroExperience` — the existing effect that validates `selectedCaseId` against the selected pool will clear it gracefully if the ID isn't found in data.

- [ ] **Step 3: Modify `src/app/pais/[code]/page.tsx` to read the `case` param**

The file currently reads `mode`. Add a read for `case` and pass it on.

Locate the section near line 67:

```tsx
const search = (await searchParams) ?? {};
const initialMode = readParam(search.mode) === "explorer" ? "explorer" : "map";
```

Replace with:

```tsx
const search = (await searchParams) ?? {};
const initialMode = readParam(search.mode) === "explorer" ? "explorer" : "map";
const initialCaseId = readParam(search.case);
```

Update the JSX `<FaroExperience>` call to pass the new prop:

```tsx
return (
  <FaroExperience
    dataset={argentinaWorkDataset}
    crossCountryCases={crossCountryCaseFiles}
    explorerCases={investigatorCaseFiles}
    initialCountry={upper}
    initialEntryOpen={false}
    initialMode={initialMode}
    initialCaseId={initialCaseId}
  />
);
```

The existing `readParam` helper at the bottom already does the right normalization (handles arrays); no changes needed there.

- [ ] **Step 4: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 5: Manual smoke**

Run `npm run dev` and verify:
- `http://127.0.0.1:3002/pais/AR?case=AR-CONTRACT-46-1585-CON21` opens with the case panel already showing that case.
- `http://127.0.0.1:3002/pais/AR?case=AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026&mode=explorer` opens in Explorer mode with the case selected.
- `http://127.0.0.1:3002/pais/AR?case=NONSENSE-ID` opens normally without crashing (panel stays closed because the ID can't be found in the pool).

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/data/featuredCases.ts src/app/pais/[code]/page.tsx src/components/FaroExperience.tsx
git commit -m "feat: deep-link case id into FaroExperience + add featuredCases data"
```

---

### Task 2: Build `FeaturedCasesOverlay` component and its CSS module

The component is a child of `<MapContainer>` that uses `useMap()`, listens to map events, projects each curated case's `marker` and `callout` lat/lon to container pixels, and renders dots + lines + cards. Cards click → `router.push`.

**Files:**
- Create: `src/components/RegionalMap/FeaturedCasesOverlay.tsx`
- Create: `src/components/RegionalMap/FeaturedCasesOverlay.module.css`

- [ ] **Step 1: Create `FeaturedCasesOverlay.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMap } from "react-leaflet";
import { ArrowRight, MapPin, Scale } from "lucide-react";

import {
  FEATURED_CASES,
  type FeaturedCase,
  type FeaturedVariant,
} from "@/data/featuredCases";
import styles from "./FeaturedCasesOverlay.module.css";

interface Projection {
  dotX: number;
  dotY: number;
  cardX: number;
  cardY: number;
  visible: boolean;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 96; // approximate; only used for visibility culling
const MARGIN = 12;

export default function FeaturedCasesOverlay() {
  const router = useRouter();
  const map = useMap();
  const [projections, setProjections] = useState<Record<string, Projection>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);

  // Recompute pixel positions for every featured case based on the current map view.
  useEffect(() => {
    const recompute = () => {
      rafRef.current = null;
      const size = map.getSize();
      setContainerSize({ width: size.x, height: size.y });
      const next: Record<string, Projection> = {};
      for (const fc of FEATURED_CASES) {
        const dot = map.latLngToContainerPoint([fc.marker.lat, fc.marker.lon]);
        const card = map.latLngToContainerPoint([fc.callout.lat, fc.callout.lon]);
        const visible =
          dot.x > -MARGIN &&
          dot.y > -MARGIN &&
          dot.x < size.x + MARGIN &&
          dot.y < size.y + MARGIN &&
          card.x > -CARD_WIDTH &&
          card.y > -CARD_HEIGHT &&
          card.x < size.x + CARD_WIDTH &&
          card.y < size.y + CARD_HEIGHT;
        next[fc.caseId] = {
          dotX: dot.x,
          dotY: dot.y,
          cardX: card.x,
          cardY: card.y,
          visible,
        };
      }
      setProjections(next);
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(recompute);
    };

    // Initial compute.
    recompute();

    map.on("move", schedule);
    map.on("zoom", schedule);
    map.on("viewreset", schedule);
    map.on("resize", schedule);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      map.off("move", schedule);
      map.off("zoom", schedule);
      map.off("viewreset", schedule);
      map.off("resize", schedule);
    };
  }, [map]);

  const sortedCases = useMemo(
    () =>
      FEATURED_CASES.map((fc, index) => ({ fc, index })),
    [],
  );

  const handleOpen = (fc: FeaturedCase) => {
    const params = new URLSearchParams({ case: fc.caseId });
    if (fc.variant === "documentary") params.set("mode", "explorer");
    router.push(`/pais/${fc.countryCode}?${params.toString()}`);
  };

  return (
    <div className={styles.host} aria-hidden={containerSize.width === 0}>
      <svg
        className={styles.lines}
        width={containerSize.width}
        height={containerSize.height}
        aria-hidden
      >
        {sortedCases.map(({ fc }) => {
          const p = projections[fc.caseId];
          if (!p || !p.visible) return null;
          return (
            <line
              key={`line-${fc.caseId}`}
              x1={p.dotX}
              y1={p.dotY}
              x2={p.cardX}
              y2={p.cardY}
              className={`${styles.line} ${styles[`line_${fc.variant}`]}`}
            />
          );
        })}
      </svg>

      {sortedCases.map(({ fc, index }) => {
        const p = projections[fc.caseId];
        if (!p) return null;
        const delay = 200 + index * 80;
        return (
          <span
            key={`dot-${fc.caseId}`}
            className={`${styles.dot} ${styles[`dot_${fc.variant}`]} ${
              p.visible ? "" : styles.hidden
            }`}
            style={{
              transform: `translate(${p.dotX}px, ${p.dotY}px)`,
              animationDelay: `${delay}ms`,
            }}
            aria-hidden
          />
        );
      })}

      {sortedCases.map(({ fc, index }) => {
        const p = projections[fc.caseId];
        if (!p) return null;
        const delay = 200 + index * 80;
        const Icon = fc.variant === "geo" ? MapPin : Scale;
        const actionLabel =
          fc.variant === "geo" ? "Ver en el mapa" : "Leer expediente";
        const ariaLabel = `Abrir ${fc.title} en ${
          fc.variant === "geo" ? "el mapa" : "el expediente"
        } de ${fc.countryCode}`;
        return (
          <button
            key={`card-${fc.caseId}`}
            type="button"
            className={`${styles.card} ${styles[`card_${fc.variant}`]} ${
              p.visible ? "" : styles.hidden
            }`}
            style={{
              transform: `translate(${p.cardX}px, ${p.cardY}px)`,
              animationDelay: `${delay}ms`,
            }}
            onClick={() => handleOpen(fc)}
            aria-label={ariaLabel}
          >
            <span className={styles.kicker}>
              <Icon size={11} aria-hidden /> {fc.kicker}
            </span>
            <strong className={styles.title}>{fc.title}</strong>
            <span className={styles.blurb}>{fc.blurb}</span>
            <span className={styles.action}>
              {actionLabel} <ArrowRight size={12} aria-hidden />
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `FeaturedCasesOverlay.module.css`**

```css
.host {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 401;
  --fc-ease: cubic-bezier(0.32, 0.72, 0, 1);
}

.lines {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.line {
  stroke-width: 1;
  fill: none;
  opacity: 1;
  transition: opacity 240ms var(--fc-ease);
}

.line_geo {
  stroke: rgba(255, 255, 255, 0.55);
}

.line_documentary {
  stroke: rgba(255, 255, 255, 0.35);
  stroke-dasharray: 3 3;
}

.dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  margin-top: -4px;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
  opacity: 1;
  animation: fc-enter 320ms var(--fc-ease) backwards;
}

.dot_geo {
  background: var(--cf-accent);
  box-shadow: 0 0 0 6px rgba(90, 169, 229, 0.18);
  animation:
    fc-enter 320ms var(--fc-ease) backwards,
    fc-pulse 2.4s ease-in-out infinite;
}

.dot_documentary {
  background: rgba(90, 169, 229, 0.2);
  border: 1.5px solid var(--cf-accent);
  box-sizing: border-box;
}

.card {
  position: absolute;
  top: 0;
  left: 0;
  width: 220px;
  pointer-events: auto;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(13, 15, 19, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  color: var(--cf-text);
  font: inherit;
  opacity: 1;
  animation: fc-enter 320ms var(--fc-ease) backwards;
  transition:
    border-color 160ms var(--fc-ease),
    background-color 160ms var(--fc-ease);
}

.card:hover {
  background: rgba(13, 15, 19, 0.96);
  border-color: rgba(255, 255, 255, 0.16);
}

.card:focus-visible {
  outline: none;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 0 0 2px rgba(90, 169, 229, 0.7);
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.title {
  font-family: var(--cf-font-heading);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--cf-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blurb {
  font-size: 12px;
  line-height: 1.5;
  color: var(--cf-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--cf-accent);
  margin-top: 2px;
}

.hidden {
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms var(--fc-ease);
}

@keyframes fc-enter {
  from {
    opacity: 0;
    transform-origin: center;
  }
  to {
    opacity: 1;
  }
}

@keyframes fc-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 6px rgba(90, 169, 229, 0.18);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(90, 169, 229, 0.1);
  }
}

@media (max-width: 720px) {
  .host {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot,
  .card {
    animation-duration: 0.01ms !important;
  }
  .dot_geo {
    animation: fc-enter 0.01ms backwards !important;
  }
}
```

A note on the `transform` keyframe: the entry uses opacity-only because `transform` is reserved for positioning. Cards already animate "into view" by appearing on the map. This keeps the implementation simple and avoids a conflict between animation transform and positioning transform.

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/RegionalMap/FeaturedCasesOverlay.tsx src/components/RegionalMap/FeaturedCasesOverlay.module.css
git commit -m "feat: add FeaturedCasesOverlay component (not yet mounted)"
```

---

### Task 3: Mount `FeaturedCasesOverlay` inside `CountryMap` and verify end-to-end

**Files:**
- Modify: `src/components/RegionalMap/CountryMap.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/components/RegionalMap/CountryMap.tsx`, after the existing imports, add:

```tsx
import FeaturedCasesOverlay from "./FeaturedCasesOverlay";
```

- [ ] **Step 2: Mount the overlay inside `<MapContainer>`**

Locate the return statement near the bottom (around line 139-172). Inside `<MapContainer>`, after the existing `<GeoJSON data={geojson} onEachFeature={onEachFeature} />` line and before `<ZoomControl position="bottomright" />`, add:

```tsx
<FeaturedCasesOverlay />
```

The block now looks like:

```tsx
<TileLayer
  attribution={ESRI_ATTRIBUTION}
  url={ESRI_IMAGERY_URL}
  maxZoom={19}
  noWrap
/>
<GeoJSON data={geojson} onEachFeature={onEachFeature} />
<FeaturedCasesOverlay />
<ZoomControl position="bottomright" />
<SyncView center={[-32, -75]} zoom={4} />
```

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 4: Manual smoke matrix in browser**

Run `npm run dev` and verify on `http://127.0.0.1:3002/`:

1. Landing loads → six callouts appear with stagger (200ms, 280ms, 360ms, 440ms, 520ms, 600ms).
2. Each card shows: kicker with icon + title + blurb + "Ver en el mapa →" or "Leer expediente →".
3. Variant differentiation: `geo` dots are solid blue with halo + pulse; `documentary` dots are hollow blue with no pulse. Lines: `geo` solid, `documentary` dashed.
4. Click "Vialidad — Ruta 3 Patagonia" → navigates to `/pais/AR?case=AR-CONTRACT-46-1585-CON21`. The page opens with the case panel showing that case on the country map.
5. Click "Cuadernos / La Camarita" → `/pais/AR?case=AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026&mode=explorer`. Explorer view opens with the case selected.
6. Click "Pasco — obra Gobierno Regional" → `/pais/PE?case=PE-CONTRACT-2343672-1`.
7. Click "Marcona — parque urbano" → `/pais/PE?case=PE-CONTRACT-2377518-1&mode=explorer`.
8. Click "Hospital Roberto del Río" → `/pais/CL?case=CL-TENDER-1057491-76-LP26`.
9. Click "Marcapasos Hospital Fricke" → `/pais/CL?case=CL-OCDS-608-282-I225&mode=explorer`.
10. Pan/zoom the landing map → dots, lines, and cards stay glued to their locations smoothly.
11. Tab through the page → each card is focusable in order; Enter activates navigation; focus ring is visible.
12. Resize viewport below 720px → callouts disappear.
13. DevTools → Rendering → Emulate CSS `prefers-reduced-motion: reduce` → cards appear without animation; pulse stops on geo dots.
14. Click on a country shape (not a card) in an area without a callout → existing behavior preserved (navigates to the country page without `case`).

If any item fails, fix and re-verify before committing.

- [ ] **Step 5: No-regression diff**

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

- [ ] **Step 6: Existing tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/RegionalMap/CountryMap.tsx
git commit -m "feat: mount FeaturedCasesOverlay inside the landing CountryMap"
```

---

## Notes for the implementer

1. **Branch is `feat/best-known-cases`.** Never push to remote unless asked. Never commit to `main`.
2. **Read the spec first**: `docs/superpowers/specs/2026-05-17-featured-cases-landing-design.md`.
3. **Don't touch** any file outside the three listed under "Modified" + the three under "New". Specifically: `CountrySidebar`, `SidebarFilters`, `MapLegend`, `MobileHeader`, `RegionalSidebar`, the entire `MapUI/` folder, `CaseMap.tsx`, `CaseDetails.tsx`, and the `Explorer/` folder.
4. After each task, run `npm run typecheck`. After Task 3, walk the manual smoke matrix in a browser.
5. If a `caseId` from `featuredCases.ts` doesn't resolve in data, `FaroExperience` clears `selectedCaseId` automatically — the URL still navigates to the country, just without the panel open. That's acceptable graceful degradation.
6. Animations rely on `@starting-style` / standard CSS keyframes; older browsers degrade to instant. Acceptable.
