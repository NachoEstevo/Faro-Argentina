# Map UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the noisy `<CaseDetails>` click panel with a compact `<CasePanel>` (collapsible technical details), group all map controls into a single `<MapDock>` bottom-right, move the Wayback year slider inline into the selected case panel, and layer in modern animations (CSS `@starting-style` + React 19 `<ViewTransition>`).

**Architecture:** All new components live isolated under `src/components/MapUI/` with `mapUI.module.css` scoped. The two integration points are `FaroExperience.tsx` (swap `<CaseDetails>` → `<CasePanel>`, remove `<MapLegend>` overlay) and `CaseMap.tsx` (remove Leaflet `<ZoomControl>`, swap `<Tooltip>` children, mount `<MapDock>` outside `<MapContainer>` via a `useMap()` bridge). Wayback state lifts from `CaseMap` into `FaroExperience` so `CasePanel` can host the slider inline. Existing files for Explorer (`CountrySidebar`, `RegionalSidebar`, `ExplorerView`, `MobileHeader`) and `CaseDetails.tsx` itself remain untouched to protect parallel work.

**Tech Stack:** Next 16.2 (App Router) · React 19.2 · TypeScript 6 · Leaflet 1.9 + react-leaflet 5 · lucide-react · CSS Modules. No new dependencies.

**Pre-flight context for the engineer:**
- Spec lives at `docs/superpowers/specs/2026-05-17-map-ui-redesign-design.md`. Read it before starting.
- Design tokens live in `src/app/globals.css` as `--cf-*` variables. Reuse them (e.g. `var(--cf-bg)`, `var(--cf-border)`, `var(--cf-accent)`).
- Branch is `feat/ui-map`. Do all work on this branch. Never push without explicit user request.
- Never commit to `main`.
- The dev server runs on `http://127.0.0.1:3002` via `npm run dev`.
- The project uses `node --test` (no jsdom). UI components are verified manually in browser; only pure utility code gets a `tests/*.test.ts` file.

---

## File Structure

**New files:**
```
src/components/MapUI/
  CasePanel.tsx                   # main composer for the click-panel
  MapDock.tsx                     # zoom + capas + leyenda dock
  LayersPopover.tsx               # popover anchored to "capas" button
  LegendPopover.tsx               # popover anchored to "leyenda" button
  MarkerTooltip.tsx               # children for Leaflet <Tooltip> on hover
  MapDockBridge.tsx               # child of <MapContainer>, exposes map handlers via callback ref
  mapUI.module.css                # scoped styles for the whole MapUI module
  panel/
    PanelHero.tsx                 # kicker + title + chips + close
    PanelWhy.tsx                  # "Por qué apareció" section
    PanelFacts.tsx                # 2x2 grid of 4 critical facts
    PanelImagery.tsx              # wraps <WaybackControl> inline
    PanelTechDetails.tsx          # <details> accordion: signal panel, hash, rawPath, related receipts
    PanelNextSteps.tsx            # <details> accordion: nextVerification list
    PanelActions.tsx              # Ver fuente, Exportar, Rastro visual buttons
```

**Files modified:**
- `src/components/CaseMap.tsx` — drop `<ZoomControl>`, swap `<Tooltip>` children to `<MarkerTooltip>`, mount `<MapDockBridge>`, add `basemap` state, drop `<WaybackControl>` render (state lifts to parent).
- `src/components/FaroExperience.tsx` — swap `<CaseDetails>` for `<CasePanel>`, remove `<MapLegend>` from `overlayLayer`, host wayback state, render `<MapDock>` overlayed outside `<MapContainer>`.
- `src/components/RegionalMap/RegionalMap.module.css` — refresh CSS for `.floatingToggle` only (no logic change).
- `src/app/globals.css` — add `prefers-reduced-motion` global block (one-time addition).

**Files NOT touched** (verified before merge with `git diff main..HEAD --`):
- `src/components/CaseDetails.tsx`
- `src/components/RegionalMap/CountrySidebar.tsx`
- `src/components/RegionalMap/RegionalSidebar.tsx`
- `src/components/Explorer/ExplorerView.tsx`
- `src/components/RegionalMap/MobileHeader.tsx`
- `src/components/WaybackControl.tsx`
- `src/components/RegionalMap/MapLegend.tsx` (its render is removed from `FaroExperience` but the file stays for now)

---

### Task 1: Scaffold MapUI directory and CSS module with shared tokens

**Files:**
- Create: `src/components/MapUI/mapUI.module.css`
- Create: `src/components/MapUI/MapDock.tsx` (placeholder skeleton)

- [ ] **Step 1: Create the CSS module file with shared design tokens**

Create `src/components/MapUI/mapUI.module.css` with:

```css
/* Shared tokens for MapUI module — composed on top of globals.css --cf-* */
.module {
  --mui-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --mui-surface: rgba(13, 15, 19, 0.92);
  --mui-surface-strong: rgba(13, 15, 19, 0.96);
  --mui-border: rgba(255, 255, 255, 0.08);
  --mui-border-strong: rgba(255, 255, 255, 0.12);
  --mui-border-soft: rgba(255, 255, 255, 0.06);
  --mui-hover: rgba(255, 255, 255, 0.06);
  --mui-fact-bg: rgba(255, 255, 255, 0.03);
  --mui-text: #eef2f7;
  --mui-text-muted: rgba(255, 255, 255, 0.6);
  --mui-text-faint: rgba(255, 255, 255, 0.45);
  --mui-accent: #5aa9e5;
  --mui-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  --mui-radius: 12px;
  --mui-radius-sm: 10px;
}

/* Severity colors (mirror CaseMap.tsx pickMarkerColors) */
.severityHigh   { --mui-sev: #d94c3a; }
.severityMedium { --mui-sev: #e07a5f; }
.severityLow    { --mui-sev: #d4a04a; }
.severityNone   { --mui-sev: #5aa9e5; }
```

- [ ] **Step 2: Create the MapDock placeholder so subsequent tasks can import it**

Create `src/components/MapUI/MapDock.tsx`:

```tsx
"use client";

import styles from "./mapUI.module.css";

export interface MapDockProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  basemap: "dark" | "satellite";
  onBasemapChange: (next: "dark" | "satellite") => void;
  severityCounts: { high: number; medium: number; total: number };
  shifted: boolean;
}

export default function MapDock(_props: MapDockProps) {
  return <div className={styles.module} />;
}
```

- [ ] **Step 3: Run typecheck to confirm scaffold compiles**

```bash
npm run typecheck
```
Expected: PASS (no errors). If errors, fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapUI/
git commit -m "chore: scaffold MapUI module with shared CSS tokens"
```

---

### Task 2: Build `MapDockBridge` to expose Leaflet map handlers to the outside dock

The dock lives OUTSIDE `<MapContainer>` (siblings in DOM), so it cannot call `useMap()`. The bridge is a tiny child of `<MapContainer>` that uses `useMap()` and publishes the handlers it needs via a callback ref passed from the parent.

**Files:**
- Create: `src/components/MapUI/MapDockBridge.tsx`

- [ ] **Step 1: Create the bridge component**

```tsx
"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export interface MapDockHandlers {
  zoomIn: () => void;
  zoomOut: () => void;
  getZoom: () => number;
  getMinZoom: () => number;
  getMaxZoom: () => number;
  subscribeZoom: (cb: () => void) => () => void;
}

interface Props {
  onReady: (handlers: MapDockHandlers) => void;
}

export default function MapDockBridge({ onReady }: Props) {
  const map = useMap();

  useEffect(() => {
    const handlers: MapDockHandlers = {
      zoomIn: () => map.zoomIn(1, { animate: true }),
      zoomOut: () => map.zoomOut(1, { animate: true }),
      getZoom: () => map.getZoom(),
      getMinZoom: () => map.getMinZoom(),
      getMaxZoom: () => map.getMaxZoom(),
      subscribeZoom: (cb) => {
        map.on("zoomend", cb);
        map.on("zoomstart", cb);
        return () => {
          map.off("zoomend", cb);
          map.off("zoomstart", cb);
        };
      },
    };
    onReady(handlers);
  }, [map, onReady]);

  return null;
}
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/MapUI/MapDockBridge.tsx
git commit -m "feat: add MapDockBridge to expose leaflet handlers"
```

---

### Task 3: Implement `MapDock` UI (buttons + container, no popovers yet)

**Files:**
- Modify: `src/components/MapUI/MapDock.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

- [ ] **Step 1: Replace MapDock skeleton with full button stack**

Overwrite `src/components/MapUI/MapDock.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Info, Layers, Minus, Plus } from "lucide-react";
import styles from "./mapUI.module.css";

export interface MapDockProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  basemap: "dark" | "satellite";
  onBasemapChange: (next: "dark" | "satellite") => void;
  severityCounts: { high: number; medium: number; total: number };
  shifted: boolean;
}

type OpenPopover = "layers" | "legend" | null;

export default function MapDock(props: MapDockProps) {
  const { onZoomIn, onZoomOut, canZoomIn, canZoomOut, shifted } = props;
  const [open, setOpen] = useState<OpenPopover>(null);

  const toggle = (which: Exclude<OpenPopover, null>) =>
    setOpen((current) => (current === which ? null : which));

  return (
    <div
      className={`${styles.module} ${styles.dockHost} ${shifted ? styles.dockHostShifted : ""}`}
      data-open={open ?? "none"}
    >
      <div className={styles.dock} role="group" aria-label="Controles del mapa">
        <button
          type="button"
          className={styles.dockButton}
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Acercar"
          title="Acercar"
        >
          <Plus size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.dockButton}
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Alejar"
          title="Alejar"
        >
          <Minus size={16} aria-hidden />
        </button>
        <div className={styles.dockDividerStrong} aria-hidden />
        <button
          type="button"
          className={`${styles.dockButton} ${open === "layers" ? styles.dockButtonActive : ""}`}
          onClick={() => toggle("layers")}
          aria-label="Capas"
          aria-expanded={open === "layers"}
          title="Capas"
        >
          <Layers size={16} aria-hidden />
        </button>
        <div className={styles.dockDividerSoft} aria-hidden />
        <button
          type="button"
          className={`${styles.dockButton} ${open === "legend" ? styles.dockButtonActive : ""}`}
          onClick={() => toggle("legend")}
          aria-label="Leyenda"
          aria-expanded={open === "legend"}
          title="Leyenda"
        >
          <Info size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append dock styles to `mapUI.module.css`**

```css
.dockHost {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 500;
  transition: transform 280ms var(--mui-ease);
}

.dockHostShifted {
  transform: translateX(-420px);
}

.dock {
  width: 40px;
  display: flex;
  flex-direction: column;
  background: var(--mui-surface);
  backdrop-filter: blur(12px);
  border: 1px solid var(--mui-border);
  border-radius: var(--mui-radius);
  box-shadow: var(--mui-shadow);
  overflow: hidden;
}

.dockButton {
  appearance: none;
  border: 0;
  background: transparent;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition:
    background-color 120ms var(--mui-ease),
    color 120ms var(--mui-ease);
  position: relative;
}

.dockButton:hover:not(:disabled) {
  background: var(--mui-hover);
  color: var(--mui-text);
}

.dockButton:active:not(:disabled) {
  transform: scale(0.96);
  transition-duration: 80ms;
}

.dockButton:disabled {
  color: rgba(255, 255, 255, 0.25);
  cursor: not-allowed;
}

.dockButtonActive {
  background: rgba(90, 169, 229, 0.12);
  color: var(--mui-accent);
}

.dockButtonActive::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--mui-accent);
  border-radius: 0 2px 2px 0;
}

.dockDividerSoft {
  height: 1px;
  background: var(--mui-border-soft);
  margin: 0 8px;
}

.dockDividerStrong {
  height: 1px;
  background: var(--mui-border-strong);
}
```

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/MapUI/MapDock.tsx src/components/MapUI/mapUI.module.css
git commit -m "feat: implement MapDock vertical control stack"
```

---

### Task 4: Implement `LayersPopover` and `LegendPopover`

**Files:**
- Create: `src/components/MapUI/LayersPopover.tsx`
- Create: `src/components/MapUI/LegendPopover.tsx`
- Modify: `src/components/MapUI/MapDock.tsx` (wire popovers, add outside-click dismissal)
- Modify: `src/components/MapUI/mapUI.module.css` (popover styles)

- [ ] **Step 1: Create `LayersPopover.tsx`**

```tsx
"use client";

import styles from "./mapUI.module.css";

interface Props {
  basemap: "dark" | "satellite";
  onChange: (next: "dark" | "satellite") => void;
}

export default function LayersPopover({ basemap, onChange }: Props) {
  return (
    <div className={styles.popover} role="dialog" aria-label="Seleccionar capa base">
      <p className={styles.popoverKicker}>Imagen base</p>
      <label className={styles.popoverOption}>
        <input
          type="radio"
          name="mui-basemap"
          checked={basemap === "dark"}
          onChange={() => onChange("dark")}
        />
        <span>Dark (CartoDB)</span>
      </label>
      <label className={styles.popoverOption}>
        <input
          type="radio"
          name="mui-basemap"
          checked={basemap === "satellite"}
          onChange={() => onChange("satellite")}
        />
        <span>Satelital (Esri)</span>
      </label>
      <p className={styles.popoverNote}>
        Wayback (imagen por año) se activa al abrir un expediente con coordenadas oficiales.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `LegendPopover.tsx`**

```tsx
"use client";

import styles from "./mapUI.module.css";

interface Props {
  highCount: number;
  mediumCount: number;
  totalCount: number;
}

export default function LegendPopover({ highCount, mediumCount, totalCount }: Props) {
  const normalCount = Math.max(0, totalCount - highCount - mediumCount);
  return (
    <div className={styles.popover} role="dialog" aria-label="Leyenda del mapa">
      <p className={styles.popoverKicker}>Qué significa cada punto</p>
      <ul className={styles.legendList}>
        <li>
          <span className={`${styles.legendDot} ${styles.legendDotHigh}`} aria-hidden />
          <span>
            <strong>Alerta alta</strong>
            <em>Single bidder o concentración fuerte · {highCount}</em>
          </span>
        </li>
        <li>
          <span className={`${styles.legendDot} ${styles.legendDotMedium}`} aria-hidden />
          <span>
            <strong>Alerta media</strong>
            <em>Competencia limitada o sobreprecio · {mediumCount}</em>
          </span>
        </li>
        <li>
          <span className={`${styles.legendDot} ${styles.legendDotNormal}`} aria-hidden />
          <span>
            <strong>Obra pública</strong>
            <em>Sin alertas detectadas · {normalCount}</em>
          </span>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Append popover + legend styles to `mapUI.module.css`**

```css
.popoverAnchor {
  position: absolute;
  right: 56px;
  bottom: 0;
  pointer-events: none;
}

.popover {
  pointer-events: auto;
  width: 260px;
  padding: 16px;
  background: var(--mui-surface);
  backdrop-filter: blur(12px);
  border: 1px solid var(--mui-border);
  border-radius: var(--mui-radius);
  box-shadow: var(--mui-shadow);
  color: var(--mui-text);
  transform-origin: right center;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popoverKicker {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mui-text-muted);
  margin: 0 0 6px;
}

.popoverOption {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  cursor: pointer;
  padding: 6px 4px;
  border-radius: 6px;
}

.popoverOption:hover { background: var(--mui-hover); }

.popoverOption input[type="radio"] {
  accent-color: var(--mui-accent);
}

.popoverNote {
  font-size: 12px;
  color: var(--mui-text-faint);
  margin: 4px 0 0;
  line-height: 1.5;
}

.legendList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legendList li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
}

.legendList strong { display: block; font-size: 13px; }

.legendList em { font-style: normal; color: var(--mui-text-muted); }

.legendDot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.legendDotHigh   { background: #d94c3a; }
.legendDotMedium { background: #e07a5f; }
.legendDotNormal { background: #5aa9e5; }
```

- [ ] **Step 4: Wire popovers into `MapDock.tsx`**

Modify `src/components/MapUI/MapDock.tsx` — add imports and outside-click + Esc handling, render the active popover anchored left of the dock.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Info, Layers, Minus, Plus } from "lucide-react";
import LayersPopover from "./LayersPopover";
import LegendPopover from "./LegendPopover";
import styles from "./mapUI.module.css";

export interface MapDockProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  basemap: "dark" | "satellite";
  onBasemapChange: (next: "dark" | "satellite") => void;
  severityCounts: { high: number; medium: number; total: number };
  shifted: boolean;
}

type OpenPopover = "layers" | "legend" | null;

export default function MapDock(props: MapDockProps) {
  const {
    onZoomIn,
    onZoomOut,
    canZoomIn,
    canZoomOut,
    basemap,
    onBasemapChange,
    severityCounts,
    shifted,
  } = props;
  const [open, setOpen] = useState<OpenPopover>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = (which: Exclude<OpenPopover, null>) =>
    setOpen((current) => (current === which ? null : which));

  return (
    <>
      {open !== null && (
        <button
          type="button"
          className={styles.popoverScrim}
          onClick={() => setOpen(null)}
          aria-label="Cerrar popover"
          tabIndex={-1}
        />
      )}
      <div
        className={`${styles.module} ${styles.dockHost} ${shifted ? styles.dockHostShifted : ""}`}
      >
        {open !== null && (
          <div className={styles.popoverAnchor}>
            {open === "layers" && (
              <LayersPopover basemap={basemap} onChange={onBasemapChange} />
            )}
            {open === "legend" && (
              <LegendPopover
                highCount={severityCounts.high}
                mediumCount={severityCounts.medium}
                totalCount={severityCounts.total}
              />
            )}
          </div>
        )}
        <div className={styles.dock} role="group" aria-label="Controles del mapa">
          <button
            type="button"
            className={styles.dockButton}
            onClick={onZoomIn}
            disabled={!canZoomIn}
            aria-label="Acercar"
            title="Acercar"
          >
            <Plus size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.dockButton}
            onClick={onZoomOut}
            disabled={!canZoomOut}
            aria-label="Alejar"
            title="Alejar"
          >
            <Minus size={16} aria-hidden />
          </button>
          <div className={styles.dockDividerStrong} aria-hidden />
          <button
            type="button"
            className={`${styles.dockButton} ${open === "layers" ? styles.dockButtonActive : ""}`}
            onClick={() => toggle("layers")}
            aria-label="Capas"
            aria-expanded={open === "layers"}
            title="Capas"
          >
            <Layers size={16} aria-hidden />
          </button>
          <div className={styles.dockDividerSoft} aria-hidden />
          <button
            type="button"
            className={`${styles.dockButton} ${open === "legend" ? styles.dockButtonActive : ""}`}
            onClick={() => toggle("legend")}
            aria-label="Leyenda"
            aria-expanded={open === "legend"}
            title="Leyenda"
          >
            <Info size={16} aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Add scrim style to `mapUI.module.css`**

```css
.popoverScrim {
  position: fixed;
  inset: 0;
  background: transparent;
  border: 0;
  cursor: default;
  z-index: 499;
}
```

- [ ] **Step 6: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/MapUI/
git commit -m "feat: add Layers and Legend popovers to MapDock"
```

---

### Task 5: Integrate `MapDock` into `CaseMap` and `FaroExperience` (no panel changes yet)

Lift wayback state up, add `basemap` state, render `<MapDock>` from `FaroExperience` using handlers from `<MapDockBridge>` mounted inside `CaseMap`.

**Files:**
- Modify: `src/components/CaseMap.tsx`
- Modify: `src/components/FaroExperience.tsx`

- [ ] **Step 1: Update `CaseMap.tsx` props and state**

Change the `Props` interface and component signature in `src/components/CaseMap.tsx`:

Replace lines 16-21:

```tsx
interface Props {
  cases: ExplorerCase[];
  selectedCaseId: string | null;
  traceMode: boolean;
  onSelectCase: (id: string) => void;
  basemap: "dark" | "satellite";
  onMapHandlersReady: (handlers: MapDockHandlers) => void;
  waybackState: WaybackState;
  onWaybackStateChange: (next: WaybackState) => void;
}
```

Add imports near the top:

```tsx
import MapDockBridge, { type MapDockHandlers } from "./MapUI/MapDockBridge";
```

Update the function signature:

```tsx
export default function CaseMap({
  cases,
  selectedCaseId,
  traceMode,
  onSelectCase,
  basemap,
  onMapHandlersReady,
  waybackState,
  onWaybackStateChange,
}: Props) {
```

- [ ] **Step 2: Remove internal wayback state from `CaseMap.tsx`**

Delete the local `useState<WaybackState>` and `retryToken` state (currently lines ~39-41 and the wayback `useEffect` that follows ~43-87). Wayback effect logic moves to `FaroExperience`. Replace the entire wayback `useEffect` and the `handleActiveReleaseChange`, `handleClose`, `handleRetry` callbacks (lines ~39-103) with this minimal block:

```tsx
const selectedCase = cases.find((caseFile) => caseFile.id === selectedCaseId) ?? null;
const mapCases = cases.filter((caseFile) => caseFile.coordinates !== null);

const severityById = useMemo(() => {
  const map = new Map<string, CaseAlertSeverity | null>();
  for (const caseFile of mapCases) {
    map.set(caseFile.id, getCaseAlertSeverity(caseFile as SignalCaseFile));
  }
  return map;
}, [mapCases]);

const waybackTileUrl =
  waybackState.status === "active" ? tileUrlForRelease(waybackState.activeReleaseId) : null;
```

- [ ] **Step 3: Replace the `<TileLayer>` render to honor `basemap` prop**

Where the current `<TileLayer>` ternary lives (~lines 118-130), replace with:

```tsx
{waybackTileUrl ? (
  <TileLayer
    key={waybackTileUrl}
    attribution={ESRI_ATTRIBUTION}
    url={waybackTileUrl}
    maxZoom={19}
    maxNativeZoom={17}
  />
) : basemap === "satellite" ? (
  <TileLayer
    key="esri-imagery"
    attribution={ESRI_ATTRIBUTION}
    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    maxZoom={19}
  />
) : (
  <TileLayer key="cartodb-dark" attribution={CARTODB_ATTRIBUTION} url={CARTODB_URL} />
)}
```

- [ ] **Step 4: Remove the Leaflet `<ZoomControl>` and add `<MapDockBridge>`**

Find `<ZoomControl position="bottomright" />` (line ~131) and replace with:

```tsx
<MapDockBridge onReady={onMapHandlersReady} />
```

Remove the `ZoomControl` import from the top of the file.

- [ ] **Step 5: Remove the sibling `<WaybackControl>` render**

At the end of `CaseMap.tsx`, the current return is `<><MapContainer>...</MapContainer><WaybackControl .../></>`. Drop the `<WaybackControl>` and unwrap the fragment. Final return is just `<MapContainer>...</MapContainer>`. Remove the `WaybackControl` and `WaybackState` imports (move `WaybackState` import to be a type-only re-export if needed elsewhere; in this codebase it's only used by `FaroExperience` after this change).

Update line 14:

```tsx
import type { WaybackState } from "./WaybackControl";
```

(type-only) keeps it importable for the prop type without rendering the component.

- [ ] **Step 6: Lift wayback state into `FaroExperience.tsx`**

In `src/components/FaroExperience.tsx`, add imports near the top:

```tsx
import { loadYearlyReleases } from "@/lib/data/wayback";
import type { WaybackState } from "./WaybackControl";
import MapDock from "./MapUI/MapDock";
import type { MapDockHandlers } from "./MapUI/MapDockBridge";
```

Add state inside the component, after the other `useState` declarations (after `userToggledSidebar`):

```tsx
const [basemap, setBasemap] = useState<"dark" | "satellite">("dark");
const [waybackState, setWaybackState] = useState<WaybackState>({ status: "off" });
const [waybackRetryToken, setWaybackRetryToken] = useState(0);
const [mapHandlers, setMapHandlers] = useState<MapDockHandlers | null>(null);
const [zoomTick, setZoomTick] = useState(0);
const hasArmedWaybackRef = useRef(false);
```

Add `useRef` to the React import at the top of the file if not already present.

- [ ] **Step 7: Port the wayback effect from `CaseMap` to `FaroExperience`**

Add this `useEffect` after the other effects in `FaroExperience.tsx`:

```tsx
useEffect(() => {
  let cancelled = false;
  const coordinates = selectedCase?.coordinates;
  const caseId = selectedCase?.id;
  if (!caseId || !coordinates || viewMode !== "map") {
    setWaybackState({ status: "off" });
    hasArmedWaybackRef.current = true;
    return;
  }
  if (!hasArmedWaybackRef.current) {
    hasArmedWaybackRef.current = true;
    return;
  }
  setWaybackState({ status: "loading", caseId });
  loadYearlyReleases()
    .then((releases) => {
      if (cancelled) return;
      if (releases.length === 0) {
        setWaybackState({ status: "error", caseId, message: "Wayback no devolvio releases disponibles." });
        return;
      }
      const latest = releases[releases.length - 1];
      setWaybackState({
        status: "active",
        caseId,
        releases,
        activeReleaseId: latest.releaseId,
      });
    })
    .catch((error: unknown) => {
      if (cancelled) return;
      setWaybackState({
        status: "error",
        caseId,
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    });
  return () => {
    cancelled = true;
  };
}, [selectedCase?.id, selectedCase?.coordinates?.lat, selectedCase?.coordinates?.lon, viewMode, waybackRetryToken]);
```

- [ ] **Step 8: Hook map zoom subscription so the dock disables +/- correctly**

Add a second effect that subscribes to zoom events when `mapHandlers` is available:

```tsx
useEffect(() => {
  if (!mapHandlers) return;
  const onZoom = () => setZoomTick((tick) => tick + 1);
  const unsubscribe = mapHandlers.subscribeZoom(onZoom);
  return unsubscribe;
}, [mapHandlers]);
```

Compute `canZoomIn` / `canZoomOut` inside the component:

```tsx
const currentZoom = mapHandlers?.getZoom() ?? 0;
const minZoom = mapHandlers?.getMinZoom() ?? 0;
const maxZoom = mapHandlers?.getMaxZoom() ?? 0;
const canZoomIn = mapHandlers ? currentZoom < maxZoom : false;
const canZoomOut = mapHandlers ? currentZoom > minZoom : false;
// zoomTick is referenced here to force recompute on zoom events
void zoomTick;
```

- [ ] **Step 9: Pass props to `<CaseMap>` and render `<MapDock>` overlayed**

In the JSX of `FaroExperience`, update the `<CaseMap>` render:

```tsx
<CaseMap
  cases={countryCases}
  selectedCaseId={selectedCase?.id ?? null}
  traceMode={traceMode}
  onSelectCase={setSelectedCaseId}
  basemap={basemap}
  onMapHandlersReady={setMapHandlers}
  waybackState={waybackState}
  onWaybackStateChange={setWaybackState}
/>
```

Add `<MapDock>` inside `overlayLayer` (alongside the existing back-link and floating toggle), placed AFTER the toggle. Remove the existing `<MapLegend>` render:

```tsx
{viewMode === "map" && (
  <MapDock
    onZoomIn={() => mapHandlers?.zoomIn()}
    onZoomOut={() => mapHandlers?.zoomOut()}
    canZoomIn={canZoomIn}
    canZoomOut={canZoomOut}
    basemap={basemap}
    onBasemapChange={setBasemap}
    severityCounts={severityCounts}
    shifted={Boolean(selectedCase)}
  />
)}
```

Delete the entire `{viewMode === "map" && !selectedCase && (<MapLegend .../>)}` block from `overlayLayer`. Remove the `import MapLegend` line at the top.

- [ ] **Step 10: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 11: Smoke test in browser**

```bash
npm run dev
```
Open `http://127.0.0.1:3002`. Click into AR map. Verify:
- Dock appears bottom-right with 4 buttons (no Leaflet zoom control visible).
- Zoom + / − work, disabled state appears at extremes.
- Click "Capas" → popover opens with two radios. Switch to "Satelital" → tiles change to Esri imagery.
- Click "Leyenda" → popover opens with three rows + counts.
- Esc and outside click close popovers.
- The old `<MapLegend>` overlay is gone.

If any of these fails, debug before committing.

- [ ] **Step 12: Commit**

```bash
git add src/components/CaseMap.tsx src/components/FaroExperience.tsx
git commit -m "feat: replace leaflet zoom + map legend with unified MapDock"
```

---

### Task 6: Build `MarkerTooltip` and swap it in `CaseMap`

**Files:**
- Create: `src/components/MapUI/MarkerTooltip.tsx`
- Modify: `src/components/CaseMap.tsx` (swap `<Tooltip>` children)
- Modify: `src/components/MapUI/mapUI.module.css` (tooltip styles)
- Modify: `src/app/globals.css` (override Leaflet's default tooltip border for our class)

- [ ] **Step 1: Create `MarkerTooltip.tsx`**

```tsx
"use client";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseAlertSeverity } from "@/lib/data/caseSignals";
import styles from "./mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
  severity: CaseAlertSeverity | null;
}

const SEVERITY_LABEL: Record<NonNullable<CaseAlertSeverity>, string> = {
  high: "ALERTA ALTA",
  medium: "ALERTA MEDIA",
  low: "ALERTA BAJA",
};

const SEVERITY_CLASS: Record<NonNullable<CaseAlertSeverity>, string> = {
  high: styles.severityHigh,
  medium: styles.severityMedium,
  low: styles.severityLow,
};

export default function MarkerTooltip({ caseFile, severity }: Props) {
  const label = severity ? SEVERITY_LABEL[severity] : "OBRA PÚBLICA";
  const sevClass = severity ? SEVERITY_CLASS[severity] : styles.severityNone;
  const meta = [caseFile.agencyName, caseFile.year ? String(caseFile.year) : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={`${styles.module} ${styles.markerTooltip} ${sevClass}`}>
      <span className={styles.markerTooltipChip}>
        <span className={styles.markerTooltipChipDot} aria-hidden />
        {label}
      </span>
      <h4 className={styles.markerTooltipTitle}>{caseFile.title}</h4>
      {meta && <p className={styles.markerTooltipMeta}>{meta}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Append tooltip styles to `mapUI.module.css`**

```css
.markerTooltip {
  width: 240px;
  padding: 12px 14px;
  background: var(--mui-surface-strong);
  backdrop-filter: blur(8px);
  border: 1px solid var(--mui-border);
  border-radius: var(--mui-radius-sm);
  box-shadow: var(--mui-shadow);
  color: var(--mui-text);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.markerTooltipChip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mui-sev, var(--mui-accent));
  font-weight: 600;
}

.markerTooltipChipDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mui-sev, var(--mui-accent));
}

.markerTooltipTitle {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.markerTooltipMeta {
  font-size: 11px;
  color: var(--mui-text-muted);
  margin: 0;
}
```

- [ ] **Step 3: Override Leaflet's tooltip wrapper in `globals.css`**

Append to `src/app/globals.css` (at the bottom, before final closing braces of `:root` or `html` rules — find a safe insertion point at file end):

```css
.leaflet-tooltip.faro-marker-tooltip {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  color: inherit !important;
  pointer-events: none;
}

.leaflet-tooltip.faro-marker-tooltip::before {
  display: none !important;
}
```

- [ ] **Step 4: Swap `<Tooltip>` children in `CaseMap.tsx`**

Find the existing `<Tooltip>` block (lines ~174-177 in the original):

```tsx
<Tooltip direction="top" offset={[0, -8]}>
  <strong>{caseFile.title}</strong>
  <span>{buildCaseSubtitle(caseFile)}</span>
</Tooltip>
```

Replace with:

```tsx
<Tooltip direction="top" offset={[0, -12]} className="faro-marker-tooltip" opacity={1}>
  <MarkerTooltip caseFile={caseFile} severity={severity} />
</Tooltip>
```

Note: `severity` is already in scope (computed at line 153). Add import at top:

```tsx
import MarkerTooltip from "./MapUI/MarkerTooltip";
```

Remove the now-unused `buildCaseSubtitle` helper if no longer referenced (search the file — if no other callsite, delete the function).

- [ ] **Step 5: typecheck and smoke test**

```bash
npm run typecheck
npm run dev
```
Open `http://127.0.0.1:3002` and hover over markers. Expect: mini-card tooltip appears above each dot with chip + title + meta. Old plain `<strong>` tooltip is gone.

- [ ] **Step 6: Commit**

```bash
git add src/components/MapUI/MarkerTooltip.tsx src/components/MapUI/mapUI.module.css src/components/CaseMap.tsx src/app/globals.css
git commit -m "feat: replace plain leaflet tooltips with MarkerTooltip mini-cards"
```

---

### Task 7: Add hover halo and selected-marker pulse

**Files:**
- Modify: `src/components/CaseMap.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

The halo for hover state is achieved by adding a second `<CircleMarker>` per case with a larger radius, opacity 0 by default and animated to opacity via Leaflet's pathOptions update on hover. The cleanest implementation is to render two CircleMarkers stacked, with the outer one tracking a local hover state.

- [ ] **Step 1: Add hover state tracking in `CaseMap.tsx`**

Inside the component, after the existing state declarations, add:

```tsx
const [hoveredCaseId, setHoveredCaseId] = useState<string | null>(null);
```

Make sure `useState` is in the React imports at top (it already is — review confirms).

- [ ] **Step 2: Update the marker render to stack a halo CircleMarker**

Find the `.map((caseFile, index) => { ... return (<CircleMarker .../>) })` block (lines ~151-180). Replace the `<CircleMarker>` return with:

```tsx
const isHovered = caseFile.id === hoveredCaseId;
const isFocused = isSelected || isHovered;
const haloRadius = isSelected ? 18 : 14;
return (
  <Fragment key={buildCaseMarkerKey(caseFile, index)}>
    {isFocused && (
      <CircleMarker
        center={[coordinates.lat, coordinates.lon]}
        radius={haloRadius}
        interactive={false}
        pathOptions={{
          color: colors.fill,
          weight: 0,
          fillColor: colors.fill,
          fillOpacity: isSelected ? 0.12 : 0.18,
        }}
        className={isSelected ? "faro-marker-halo-selected" : "faro-marker-halo-hover"}
      />
    )}
    <CircleMarker
      center={[coordinates.lat, coordinates.lon]}
      radius={radius}
      eventHandlers={{
        click: () => onSelectCase(caseFile.id),
        mouseover: () => setHoveredCaseId(caseFile.id),
        mouseout: () => setHoveredCaseId((current) => (current === caseFile.id ? null : current)),
      }}
      pathOptions={{
        color: colors.stroke,
        fillColor: colors.fill,
        fillOpacity,
        opacity: 0.95,
        weight,
      }}
    >
      <Tooltip direction="top" offset={[0, -12]} className="faro-marker-tooltip" opacity={1}>
        <MarkerTooltip caseFile={caseFile} severity={severity} />
      </Tooltip>
    </CircleMarker>
  </Fragment>
);
```

Add to imports:

```tsx
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
```

Note: react-leaflet's `CircleMarker` doesn't accept a `className` prop directly; it accepts `pathOptions.className` instead. Adjust:

```tsx
pathOptions={{
  color: colors.fill,
  weight: 0,
  fillColor: colors.fill,
  fillOpacity: isSelected ? 0.12 : 0.18,
  className: isSelected ? "faro-marker-halo-selected" : "faro-marker-halo-hover",
}}
```

And drop the top-level `className` on the halo `<CircleMarker>`.

- [ ] **Step 3: Add the pulse keyframes via globals**

Append to `src/app/globals.css`:

```css
.faro-marker-halo-selected {
  transform-origin: center;
  animation: faro-halo-pulse 2.4s ease-in-out infinite;
}

@keyframes faro-halo-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.7; }
}

@media (prefers-reduced-motion: reduce) {
  .faro-marker-halo-selected {
    animation: none;
  }
}
```

- [ ] **Step 4: typecheck and smoke test**

```bash
npm run typecheck
npm run dev
```
Hover a dot → halo concentric appears. Click → halo bigger, pulse loop. Move away from hover → halo disappears unless selected. Toggle reduce-motion in devtools (Rendering → Emulate CSS prefers-reduced-motion) → pulse stops.

- [ ] **Step 5: Commit**

```bash
git add src/components/CaseMap.tsx src/app/globals.css
git commit -m "feat: add hover halo and pulse animation for map markers"
```

---

### Task 8: Build `PanelHero` + `PanelWhy` (top section of CasePanel)

**Files:**
- Create: `src/components/MapUI/panel/PanelHero.tsx`
- Create: `src/components/MapUI/panel/PanelWhy.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

- [ ] **Step 1: Create `PanelHero.tsx`**

```tsx
"use client";

import { ShieldCheck, X } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { CaseSignalChips } from "@/components/CaseSignals";
import styles from "../mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  onClose: () => void;
}

export default function PanelHero({ caseFile, signalContext, onClose }: Props) {
  return (
    <header className={styles.panelHero}>
      <button
        type="button"
        className={styles.panelClose}
        onClick={onClose}
        aria-label="Cerrar panel"
        title="Cerrar"
      >
        <X size={14} aria-hidden />
      </button>
      <p className={styles.panelKicker}>
        <ShieldCheck size={12} aria-hidden /> Expediente verificable
      </p>
      <h1 className={styles.panelTitle}>{caseFile.title}</h1>
      <div className={styles.panelChips}>
        <CaseSignalChips caseFile={caseFile} limit={3} signalContext={signalContext} />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `PanelWhy.tsx`**

```tsx
"use client";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

export default function PanelWhy({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  return (
    <section className={styles.panelSection}>
      <p className={styles.panelSectionKicker}>Por qué apareció</p>
      <p className={styles.panelBody}>{expediente.summary.plainSummary}</p>
    </section>
  );
}
```

- [ ] **Step 3: Append panel hero + section + body styles**

```css
.panelHero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panelClose {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--mui-text-muted);
  cursor: pointer;
  transition: background-color 120ms var(--mui-ease), color 120ms var(--mui-ease);
}

.panelClose:hover {
  background: var(--mui-hover);
  color: var(--mui-text);
}

.panelKicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mui-accent);
  margin: 0;
  font-weight: 600;
}

.panelTitle {
  font-size: 22px;
  line-height: 1.25;
  font-weight: 600;
  margin: 0;
  color: var(--mui-text);
  font-family: var(--cf-font-heading);
}

.panelChips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.panelSection {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panelSectionKicker {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mui-text-muted);
  margin: 0;
  font-weight: 500;
}

.panelBody {
  font-size: 14px;
  line-height: 1.55;
  color: var(--mui-text);
  margin: 0;
}
```

- [ ] **Step 4: typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/MapUI/panel/ src/components/MapUI/mapUI.module.css
git commit -m "feat: add PanelHero and PanelWhy components"
```

---

### Task 9: Build `PanelFacts` (4 critical facts grid)

**Files:**
- Create: `src/components/MapUI/panel/PanelFacts.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

- [ ] **Step 1: Create `PanelFacts.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { formatAmountWithUsd, type AmountInput } from "@/lib/format/money";
import styles from "../mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
}

function renderAmount(amount: AmountInput | null): ReactNode {
  if (!amount) return "Sin dato";
  const formatted = formatAmountWithUsd(amount);
  return (
    <>
      <span>{formatted.primary}</span>
      {formatted.usdSegment && <span className={styles.factSubvalue}>{formatted.usdSegment}</span>}
    </>
  );
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function formatSupplier(caseFile: ExplorerCase): string {
  if (isCrossCountryCase(caseFile)) {
    return caseFile.supplierName ?? caseFile.supplierDocument ?? "Sin dato";
  }
  return "Sin dato";
}

export default function PanelFacts({ caseFile }: Props) {
  const amount = isCrossCountryCase(caseFile)
    ? (caseFile.amount as AmountInput | null)
    : null;
  return (
    <div className={styles.factsGrid}>
      <Fact label="Monto">{renderAmount(amount)}</Fact>
      <Fact label="Año">{caseFile.year ?? "Sin dato"}</Fact>
      <Fact label="Organismo">{caseFile.agencyName ?? "Sin dato"}</Fact>
      <Fact label="Proveedor">{formatSupplier(caseFile)}</Fact>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <strong className={styles.factValue}>{children}</strong>
    </div>
  );
}
```

- [ ] **Step 2: Append facts grid styles**

```css
.factsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.fact {
  background: var(--mui-fact-bg);
  border: 1px solid var(--mui-border-soft);
  border-radius: var(--mui-radius-sm);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.factLabel {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mui-text-faint);
}

.factValue {
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  color: var(--mui-text);
  display: flex;
  flex-direction: column;
  gap: 2px;
  word-break: break-word;
}

.factSubvalue {
  font-size: 11px;
  font-weight: 400;
  color: var(--mui-text-muted);
}
```

- [ ] **Step 3: typecheck and commit**

```bash
npm run typecheck
git add src/components/MapUI/panel/PanelFacts.tsx src/components/MapUI/mapUI.module.css
git commit -m "feat: add PanelFacts 2x2 critical facts grid"
```

---

### Task 10: Build `PanelImagery` (inline Wayback wrapper)

**Files:**
- Create: `src/components/MapUI/panel/PanelImagery.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

- [ ] **Step 1: Create `PanelImagery.tsx`**

```tsx
"use client";

import WaybackControl, { type WaybackState } from "@/components/WaybackControl";
import styles from "../mapUI.module.css";

interface Props {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onClose: () => void;
  onRetry: () => void;
}

export default function PanelImagery({ state, onActiveReleaseChange, onClose, onRetry }: Props) {
  if (state.status === "off") return null;
  return (
    <section className={styles.panelSection}>
      <p className={styles.panelSectionKicker}>Imagen satelital</p>
      <div className={styles.imageryWrap}>
        <WaybackControl
          state={state}
          onActiveReleaseChange={onActiveReleaseChange}
          onClose={onClose}
          onRetry={onRetry}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Append imagery wrapper styles**

The `WaybackControl` component renders an `<aside className="waybackControl">` with header/X/footer. We override its container styling so it sits inline rather than floating bottom-left.

```css
.imageryWrap {
  /* WaybackControl renders position:fixed by default in the global stylesheet.
     We override layout inside this wrapper. */
}

.imageryWrap :global(.waybackControl) {
  position: static;
  margin: 0;
  width: 100%;
  background: var(--mui-fact-bg);
  border: 1px solid var(--mui-border-soft);
  border-radius: var(--mui-radius-sm);
  box-shadow: none;
}

.imageryWrap :global(.waybackControl header button) {
  /* hide the inline close button — closing is via the panel's X */
  display: none;
}
```

Note: this relies on `:global()` to reach into `WaybackControl`'s global classes. Verify the current `WaybackControl` styles in `src/app/globals.css` (search for `.waybackControl`). If positioning is set there, the override above will work; if not, adjust selector to wherever those styles live.

- [ ] **Step 3: Grep to confirm WaybackControl global styles location**

Run the Grep tool with pattern `\.waybackControl` over `src/` to locate where the floating positioning is defined. Expected hit: `src/app/globals.css` (the existing WaybackControl uses global classes like `.waybackControl`, `.waybackSlider`, `.waybackDate`, etc., styled in `globals.css`). If those styles set `position: fixed`, the `:global()` overrides in Step 2 will work. If positioning lives in a different file, point the override there instead.

- [ ] **Step 4: typecheck and commit**

```bash
npm run typecheck
git add src/components/MapUI/panel/PanelImagery.tsx src/components/MapUI/mapUI.module.css
git commit -m "feat: add PanelImagery wrapper for inline Wayback control"
```

---

### Task 11: Build `PanelTechDetails` and `PanelNextSteps` accordions

**Files:**
- Create: `src/components/MapUI/panel/PanelTechDetails.tsx`
- Create: `src/components/MapUI/panel/PanelNextSteps.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

- [ ] **Step 1: Create `PanelTechDetails.tsx`**

```tsx
"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import { CaseSignalPanel } from "@/components/CaseSignals";
import styles from "../mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function shortSource(sourceId: string): string {
  if (sourceId.includes("ACTAS")) return "Actas";
  if (sourceId.includes("CONTRATOS")) return "Contratos";
  if (sourceId.includes("OFERTAS")) return "Ofertas";
  if (sourceId.includes("PROCEDIMIENTOS")) return "Procedimiento";
  if (sourceId.includes("UBICACION")) return "Ubicacion";
  if (sourceId.includes("SIPRO")) return "SIPRO";
  if (sourceId.includes("OCDS")) return "OCDS";
  if (sourceId.includes("GASTO")) return "Presupuesto";
  if (sourceId.includes("MERCADO")) return "Adjudicaciones";
  return "Fuente";
}

export default function PanelTechDetails({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  const relatedReceipts = isCrossCountryCase(caseFile) ? caseFile.relatedReceipts ?? [] : [];
  return (
    <details className={styles.accordion}>
      <summary className={styles.accordionSummary}>
        <ChevronRight size={14} aria-hidden className={styles.accordionChevron} />
        Detalles técnicos
      </summary>
      <div className={styles.accordionBody}>
        <CaseSignalPanel caseFile={caseFile} signalContext={signalContext} />
        <dl className={styles.receiptList}>
          <ReceiptRow label="Fuente" value={caseFile.receipt.sourceName} />
          <ReceiptRow
            label="Locator"
            value={expediente.officialTrail.primary.locator.label}
          />
          <ReceiptRow
            label="Nota"
            value={expediente.officialTrail.primary.locator.note}
          />
          <ReceiptRow
            label="Hash"
            value={`${caseFile.receipt.fileHash.slice(0, 24)}...`}
          />
          <ReceiptRow label="Raw path" value={caseFile.receipt.rawPath} />
          <ReceiptRow
            label="Extraido"
            value={new Date(caseFile.receipt.extractedAt).toLocaleString("es-AR")}
          />
        </dl>
        {relatedReceipts.length > 0 && (
          <div className={styles.relatedReceipts}>
            <span className={styles.panelSectionKicker}>Evidencia cruzada</span>
            <div className={styles.relatedReceiptLinks}>
              {relatedReceipts.slice(0, 6).map((receipt) => (
                <a
                  key={receipt.receiptId}
                  href={receipt.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.relatedReceiptLink}
                >
                  <ExternalLink size={11} aria-hidden /> {shortSource(receipt.sourceId)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.receiptRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
```

- [ ] **Step 2: Create `PanelNextSteps.tsx`**

```tsx
"use client";

import { ChevronRight } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

export default function PanelNextSteps({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  if (expediente.nextVerification.length === 0) return null;
  return (
    <details className={styles.accordion}>
      <summary className={styles.accordionSummary}>
        <ChevronRight size={14} aria-hidden className={styles.accordionChevron} />
        Qué verificar después
      </summary>
      <div className={styles.accordionBody}>
        <ol className={styles.nextStepsList}>
          {expediente.nextVerification.slice(0, 5).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
```

- [ ] **Step 3: Append accordion + receipt styles**

```css
.accordion {
  border-top: 1px solid var(--mui-border-soft);
  padding: 12px 0;
}

.accordionSummary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--mui-text);
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

.accordionSummary::-webkit-details-marker { display: none; }

.accordionChevron {
  transition: transform 200ms var(--mui-ease);
  color: var(--mui-text-muted);
}

.accordion[open] .accordionChevron {
  transform: rotate(90deg);
}

.accordionBody {
  padding: 14px 4px 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.receiptList {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.receiptRow {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px;
  font-size: 12px;
  align-items: baseline;
}

.receiptRow dt {
  color: var(--mui-text-faint);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
}

.receiptRow dd {
  color: var(--mui-text);
  margin: 0;
  word-break: break-all;
  font-family: var(--cf-font-data);
}

.relatedReceipts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.relatedReceiptLinks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.relatedReceiptLink {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  background: var(--mui-fact-bg);
  border: 1px solid var(--mui-border-soft);
  border-radius: 6px;
  color: var(--mui-text);
  text-decoration: none;
}

.relatedReceiptLink:hover {
  background: var(--mui-hover);
}

.nextStepsList {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--mui-text);
}
```

- [ ] **Step 4: typecheck and commit**

```bash
npm run typecheck
git add src/components/MapUI/panel/ src/components/MapUI/mapUI.module.css
git commit -m "feat: add PanelTechDetails and PanelNextSteps accordions"
```

---

### Task 12: Build `PanelActions`

**Files:**
- Create: `src/components/MapUI/panel/PanelActions.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

- [ ] **Step 1: Create `PanelActions.tsx`**

```tsx
"use client";

import { Download, ExternalLink, Route } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
}

export default function PanelActions({ caseFile, signalContext, traceMode, onTraceModeChange }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  const { hasOfficialGeometry } = expediente.investigationContext;
  const encodedId = encodeURIComponent(caseFile.id);
  return (
    <div className={styles.panelActions}>
      <div className={styles.actionRow}>
        <a
          href={caseFile.receipt.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.actionButton}
        >
          <ExternalLink size={14} aria-hidden /> Ver fuente
        </a>
        <a href={`/api/export/${encodedId}`} download className={styles.actionButton}>
          <Download size={14} aria-hidden /> Exportar
        </a>
      </div>
      <button
        type="button"
        className={`${styles.actionButton} ${styles.actionWide} ${traceMode && hasOfficialGeometry ? styles.actionWideActive : ""}`}
        disabled={!hasOfficialGeometry}
        onClick={() => {
          if (hasOfficialGeometry) onTraceModeChange(!traceMode);
        }}
      >
        <Route size={14} aria-hidden /> Rastro visual
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Append action styles**

```css
.panelActions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--mui-border-soft);
}

.actionRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.actionButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--mui-fact-bg);
  border: 1px solid var(--mui-border-soft);
  border-radius: var(--mui-radius-sm);
  color: var(--mui-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition:
    background-color 120ms var(--mui-ease),
    border-color 120ms var(--mui-ease);
}

.actionButton:hover:not(:disabled) {
  background: var(--mui-hover);
  border-color: var(--mui-border);
}

.actionButton:disabled {
  color: var(--mui-text-faint);
  cursor: not-allowed;
}

.actionWide {
  width: 100%;
}

.actionWideActive {
  background: rgba(90, 169, 229, 0.12);
  border-color: var(--mui-accent);
  color: var(--mui-accent);
}
```

- [ ] **Step 3: typecheck and commit**

```bash
npm run typecheck
git add src/components/MapUI/panel/PanelActions.tsx src/components/MapUI/mapUI.module.css
git commit -m "feat: add PanelActions component with source/export/trace buttons"
```

---

### Task 13: Compose `CasePanel` and integrate into `FaroExperience`

**Files:**
- Create: `src/components/MapUI/CasePanel.tsx`
- Modify: `src/components/FaroExperience.tsx`
- Modify: `src/components/MapUI/mapUI.module.css`

- [ ] **Step 1: Create `CasePanel.tsx`**

```tsx
"use client";

import type { CaseDataset } from "@/lib/caseRepository";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { WaybackState } from "@/components/WaybackControl";
import PanelHero from "./panel/PanelHero";
import PanelWhy from "./panel/PanelWhy";
import PanelFacts from "./panel/PanelFacts";
import PanelImagery from "./panel/PanelImagery";
import PanelTechDetails from "./panel/PanelTechDetails";
import PanelNextSteps from "./panel/PanelNextSteps";
import PanelActions from "./panel/PanelActions";
import styles from "./mapUI.module.css";

interface Props {
  caseFile: ExplorerCase;
  dataset: CaseDataset;
  signalContext?: CaseSignalContext;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
  onClose: () => void;
  waybackState: WaybackState;
  onWaybackReleaseChange: (releaseId: number) => void;
  onWaybackRetry: () => void;
}

export default function CasePanel({
  caseFile,
  signalContext,
  traceMode,
  onTraceModeChange,
  onClose,
  waybackState,
  onWaybackReleaseChange,
  onWaybackRetry,
}: Props) {
  return (
    <div className={`${styles.module} ${styles.casePanel}`}>
      <div className={styles.casePanelScroll}>
        <PanelHero caseFile={caseFile} signalContext={signalContext} onClose={onClose} />
        <div className={styles.panelDivider} aria-hidden />
        <PanelWhy caseFile={caseFile} signalContext={signalContext} />
        <div className={styles.panelDivider} aria-hidden />
        <PanelFacts caseFile={caseFile} />
        {caseFile.coordinates && waybackState.status !== "off" && (
          <>
            <div className={styles.panelDivider} aria-hidden />
            <PanelImagery
              state={waybackState}
              onActiveReleaseChange={onWaybackReleaseChange}
              onClose={onClose}
              onRetry={onWaybackRetry}
            />
          </>
        )}
        <PanelTechDetails caseFile={caseFile} signalContext={signalContext} />
        <PanelNextSteps caseFile={caseFile} signalContext={signalContext} />
        <PanelActions
          caseFile={caseFile}
          signalContext={signalContext}
          traceMode={traceMode}
          onTraceModeChange={onTraceModeChange}
        />
      </div>
    </div>
  );
}
```

Note: `dataset` is in the prop signature for backward compat but unused — keep it to match the existing `<aside>` parent and reduce diffs in `FaroExperience`. Mark it explicitly:

```tsx
// dataset reserved for future export linking; current implementation doesn't need it
```

Actually drop it — YAGNI. Remove `dataset` from the `Props` interface and don't pass it from `FaroExperience` either.

- [ ] **Step 2: Append CasePanel container styles**

```css
.casePanel {
  height: 100%;
  width: 100%;
  background: var(--cf-bg);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 40%);
  border-left: 1px solid var(--mui-border);
  display: flex;
  flex-direction: column;
  color: var(--mui-text);
}

.casePanelScroll {
  flex: 1;
  overflow-y: auto;
  padding: 32px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.casePanelScroll::-webkit-scrollbar { width: 8px; }
.casePanelScroll::-webkit-scrollbar-track { background: transparent; }
.casePanelScroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.panelDivider {
  height: 1px;
  background: var(--mui-border-soft);
}
```

- [ ] **Step 3: Swap `<CaseDetails>` for `<CasePanel>` in `FaroExperience.tsx`**

Find the existing render block (around line 279-289):

```tsx
{selectedCase && viewMode === "map" && (
  <aside className="casePanel" aria-label="Expediente Faro">
    <CaseDetails
      caseFile={selectedCase}
      dataset={dataset}
      signalContext={activeSignalContext}
      traceMode={traceMode}
      onTraceModeChange={setTraceMode}
    />
  </aside>
)}
```

Replace with:

```tsx
{selectedCase && viewMode === "map" && (
  <aside className="casePanel" aria-label="Expediente Faro">
    <CasePanel
      caseFile={selectedCase}
      signalContext={activeSignalContext}
      traceMode={traceMode}
      onTraceModeChange={setTraceMode}
      onClose={() => setSelectedCaseId("")}
      waybackState={waybackState}
      onWaybackReleaseChange={(releaseId) => {
        setWaybackState((current) =>
          current.status === "active" ? { ...current, activeReleaseId: releaseId } : current,
        );
      }}
      onWaybackRetry={() => setWaybackRetryToken((token) => token + 1)}
    />
  </aside>
)}
```

Add import:

```tsx
import CasePanel from "./MapUI/CasePanel";
```

Remove the `import { CaseDetails } from "./CaseDetails";` line (no other usages).

- [ ] **Step 4: typecheck and smoke test**

```bash
npm run typecheck
npm run dev
```
Click a marker. Verify:
- Panel appears on the right with the new layout: kicker, title, chips, divider, "Por qué apareció", divider, 2x2 facts, divider, "Imagen satelital" (if coordinates), accordions for "Detalles técnicos" and "Qué verificar después", action buttons at bottom.
- Close X (top-right) hides the panel.
- Old WaybackControl no longer appears bottom-left.

- [ ] **Step 5: Commit**

```bash
git add src/components/MapUI/CasePanel.tsx src/components/FaroExperience.tsx src/components/MapUI/mapUI.module.css
git commit -m "feat: integrate CasePanel and drop old CaseDetails from map mode"
```

---

### Task 14: Adjust `casePanel` aside container CSS to match new visuals

The `<aside className="casePanel">` in `FaroExperience` is a global class styled in `globals.css`. It needs to allow the new `CasePanel` to render edge-to-edge.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Find the existing `.casePanel` styles**

Run Grep for `\\.casePanel\\b` in `src/app/globals.css`. Note the current width, position, padding, etc.

- [ ] **Step 2: Strip internal padding from `.casePanel` aside**

The new `CasePanel` component handles its own padding (`.casePanelScroll` has `padding: 32px 28px 28px`). Remove `padding` from `.casePanel` global rule. Set width to `420px` (or 100vw on mobile), height `100vh`, position absolute, top 0 right 0, z-index above the dock (e.g. 600).

Update the `.casePanel` block in `src/app/globals.css` to:

```css
.casePanel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 100vw;
  background: transparent;
  border: 0;
  padding: 0;
  z-index: 600;
  display: flex;
}

@media (max-width: 720px) {
  .casePanel {
    width: 100vw;
  }
}
```

Adjust the exact selector if the existing styles use `.casePanel` differently — read the surrounding rules and preserve any non-layout properties that other consumers (Explorer?) might depend on. Verify with Grep that `casePanel` class is only referenced from `FaroExperience.tsx`.

- [ ] **Step 3: typecheck and smoke test**

```bash
npm run typecheck
npm run dev
```
Panel should now have proper 420px width, full height, transparent backing so the inner `CasePanel` background takes over.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: let CasePanel control its own background and padding"
```

---

### Task 15: Wire dock-shift animation and validate end-to-end without animations

**Files:** (already in place, no new edits — this task is a validation checkpoint)

- [ ] **Step 1: Verify dock shift works on panel open/close**

```bash
npm run dev
```
Click marker → dock should slide left by 420px smoothly (because `shifted={Boolean(selectedCase)}` was wired in Task 5). Close panel → dock returns.

If the dock is still hidden behind the panel or doesn't shift, debug:
1. Confirm `shifted={Boolean(selectedCase)}` is passed in `FaroExperience.tsx`.
2. Confirm `.dockHostShifted` is applied via inspector.
3. Confirm `transform` value is `translateX(-420px)` matching panel width.

- [ ] **Step 2: Verify no-regression diff for Explorer-side files**

```bash
git diff main..HEAD -- src/components/Explorer/ src/components/RegionalMap/CountrySidebar.tsx src/components/RegionalMap/RegionalSidebar.tsx src/components/CaseDetails.tsx src/components/RegionalMap/MobileHeader.tsx
```
Expected output: empty. If anything appears, revert those changes (they're out of scope for this branch).

- [ ] **Step 3: Smoke test Explorer mode**

In the browser, toggle to "Explorer". Confirm the sidebar, table, and detail view render identical to `main`. No visual regressions.

- [ ] **Step 4: Run existing tests**

```bash
npm run test
```
Expected: all existing tests pass (no test files were modified). If anything fails, debug.

If everything looks good, this checkpoint is a no-commit task — move on to animations.

---

### Task 16: Add `@starting-style` enter/exit transitions for panel, popovers, tooltip, dock

**Files:**
- Modify: `src/components/MapUI/mapUI.module.css`

These animations rely on CSS `@starting-style` (Chrome 117+, Safari 17.4+, Firefox 129+). Browsers below those fall back to instant transitions — graceful degradation.

- [ ] **Step 1: Add panel slide-in animation**

Append to `mapUI.module.css`:

```css
.casePanel {
  transition:
    opacity 280ms var(--mui-ease),
    transform 280ms var(--mui-ease);
  opacity: 1;
  transform: translateX(0);
}

@starting-style {
  .casePanel {
    opacity: 0;
    transform: translateX(20px);
  }
}
```

Note: `.casePanel` here refers to the class on the new wrapper inside `CasePanel.tsx` (which is `styles.casePanel`). The `<aside className="casePanel">` global is a different rule. Verify by checking the inspector that the new module class is the one transitioning.

- [ ] **Step 2: Add popover scale + slide animation**

```css
.popover {
  transition:
    opacity 180ms var(--mui-ease),
    transform 180ms var(--mui-ease);
  opacity: 1;
  transform: translateX(0) scale(1);
}

@starting-style {
  .popover {
    opacity: 0;
    transform: translateX(8px) scale(0.96);
  }
}
```

- [ ] **Step 3: Add tooltip fade-up animation**

```css
.markerTooltip {
  transition:
    opacity 140ms var(--mui-ease),
    transform 140ms var(--mui-ease);
  opacity: 1;
  transform: translateY(0);
}

@starting-style {
  .markerTooltip {
    opacity: 0;
    transform: translateY(-4px);
  }
}
```

- [ ] **Step 4: Add dock mount animation**

```css
.dockHost {
  transition:
    opacity 240ms var(--mui-ease),
    transform 280ms var(--mui-ease);
  opacity: 1;
}

@starting-style {
  .dockHost {
    opacity: 0;
    transform: translateY(12px) translateX(0);
  }
}

.dockHostShifted {
  transform: translateX(-420px);
}
```

Note: `transform` on `.dockHostShifted` was already set in Task 3. The `@starting-style` only applies on first mount.

- [ ] **Step 5: Smoke test in a modern browser**

```bash
npm run dev
```
- Open page → dock slides up + fades in.
- Click marker → panel slides in from the right.
- Open popovers → scale + slide.
- Close panel → slides out.
- Hover marker → tooltip fades up.

- [ ] **Step 6: Commit**

```bash
git add src/components/MapUI/mapUI.module.css
git commit -m "feat: add @starting-style enter transitions for panel, popovers, tooltip, dock"
```

---

### Task 17: Smooth `<details>` accordion expand using `interpolate-size`

**Files:**
- Modify: `src/components/MapUI/mapUI.module.css`

`interpolate-size: allow-keywords` lets `height: auto` animate. Available in Chrome 129+; falls back to instant in others.

- [ ] **Step 1: Add interpolate-size to module root**

Append:

```css
.module {
  interpolate-size: allow-keywords;
}

.accordion::details-content {
  /* enable height transition on the implicit details content block */
  block-size: 0;
  overflow: clip;
  transition: block-size 220ms var(--mui-ease), content-visibility 220ms allow-discrete;
}

.accordion[open]::details-content {
  block-size: auto;
}
```

Note: `::details-content` pseudo-element is part of the latest CSS spec; if it's not yet supported in target browsers, the accordion still works (just snaps open). The chevron rotation (already in Task 11) provides visual feedback either way.

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```
Click "Detalles técnicos" → in supporting browsers, content slides open smoothly; in others, snaps instantly. Either is acceptable.

- [ ] **Step 3: Commit**

```bash
git add src/components/MapUI/mapUI.module.css
git commit -m "feat: smooth accordion expansion via interpolate-size"
```

---

### Task 18: Add global `prefers-reduced-motion` guard

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append a global reduce-motion block**

At the bottom of `src/app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Verify with DevTools**

Open the page, toggle DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce". Click marker — panel should appear without slide. Close → no animation. Selected marker pulse stops.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "a11y: respect prefers-reduced-motion globally"
```

---

### Task 19: View Transition for basemap toggle

**Files:**
- Modify: `src/components/FaroExperience.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Wrap `setBasemap` in `document.startViewTransition`**

In `FaroExperience.tsx`, find where `setBasemap` is passed to `<MapDock onBasemapChange={...}>`. Replace with:

```tsx
const handleBasemapChange = useCallback((next: "dark" | "satellite") => {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (document as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(() =>
      setBasemap(next),
    );
    return;
  }
  setBasemap(next);
}, []);
```

Use `handleBasemapChange` in the JSX:

```tsx
onBasemapChange={handleBasemapChange}
```

Add `useCallback` to React imports if missing.

- [ ] **Step 2: Style the view-transition pseudo-elements**

Append to `src/app/globals.css`:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}
```

- [ ] **Step 3: Smoke test in Chrome**

```bash
npm run dev
```
Open Capas → toggle dark ↔ satelital. Should cross-fade between tilesets rather than snap.

- [ ] **Step 4: Commit**

```bash
git add src/components/FaroExperience.tsx src/app/globals.css
git commit -m "feat: smooth basemap toggle with view-transition"
```

---

### Task 20: View Transition for viewMode toggle (map ↔ explorer)

**Files:**
- Modify: `src/components/FaroExperience.tsx`

- [ ] **Step 1: Wrap `setViewMode` calls in `startViewTransition`**

Add helper near `handleBasemapChange`:

```tsx
const handleViewModeChange = useCallback((next: "map" | "explorer") => {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (document as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(() =>
      setViewMode(next),
    );
    return;
  }
  setViewMode(next);
}, []);
```

Update the two `onClick={() => setViewMode("map")}` and `onClick={() => setViewMode("explorer")}` calls inside `floatingToggle` (lines ~241, 248) to use `handleViewModeChange("map")` / `handleViewModeChange("explorer")` respectively.

Also update the calls in `EntryGate` (lines ~293, 297, 301) to use `handleViewModeChange`.

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```
Click Map/Explorer toggle. Should cross-fade rather than snap.

- [ ] **Step 3: Commit**

```bash
git add src/components/FaroExperience.tsx
git commit -m "feat: smooth viewmode toggle with view-transition"
```

---

### Task 21: Refresh `floatingToggle` CSS

**Files:**
- Modify: `src/components/RegionalMap/RegionalMap.module.css`

- [ ] **Step 1: Find the existing `.floatingToggle` and `.floatingToggleButton.active` rules**

Read those rules from `src/components/RegionalMap/RegionalMap.module.css`. Note current background, border, padding.

- [ ] **Step 2: Update the rules to match new visual language**

Modify (preserve any layout/position properties; only change visual surface):

```css
.floatingToggle {
  background: rgba(13, 15, 19, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  /* preserve existing border-radius, padding, gap, position */
}

.floatingToggleButton.active {
  background: transparent;
  color: var(--cf-accent);
  box-shadow: 0 0 0 1px rgba(90, 169, 229, 0.4);
}
```

Read the existing rules first to preserve everything else. Only override the surface properties.

- [ ] **Step 3: Smoke test**

Confirm toggle still works and looks consistent with the new dock.

- [ ] **Step 4: Commit**

```bash
git add src/components/RegionalMap/RegionalMap.module.css
git commit -m "style: refresh map/explorer floating toggle to match dock visuals"
```

---

### Task 22: Optional — Shared element view transition (marker → panel hero chip)

This is the highest-risk animation. Implementing it requires applying `view-transition-name` on the SVG path that Leaflet renders for each marker — there is no direct prop, so we use a ref into the `react-leaflet` `CircleMarker` and set the attribute via the underlying Leaflet path's `getElement()`.

**Files:**
- Modify: `src/components/CaseMap.tsx`
- Modify: `src/components/MapUI/panel/PanelHero.tsx`

- [ ] **Step 1: In `CaseMap.tsx`, set `view-transition-name` on the SELECTED marker's SVG element**

Inside the marker `.map()` block, after the `<CircleMarker>` render, add a small `<MarkerVTN>` helper component that uses a ref to set `view-transition-name` on the SVG path of the selected marker only:

```tsx
function MarkerVTN({ caseId, isSelected }: { caseId: string; isSelected: boolean }) {
  // Note: react-leaflet does not expose path SVG refs directly via CircleMarker.
  // We use a side-effect: query DOM by a synthesized class on the marker and set the style.
  useEffect(() => {
    if (!isSelected) return;
    const element = document.querySelector(`[data-marker-id="${CSS.escape(caseId)}"]`);
    if (element instanceof SVGElement) {
      element.style.viewTransitionName = `marker-${caseId}`;
      return () => {
        element.style.viewTransitionName = "";
      };
    }
  }, [caseId, isSelected]);
  return null;
}
```

This requires the marker to render `data-marker-id={caseFile.id}` on its SVG path. Leaflet's path supports adding attributes via the layer ref. Easiest: use `pathOptions.className` to inject a class that includes the id, then query it.

Refactor: extend `pathOptions` of the inner `<CircleMarker>`:

```tsx
pathOptions={{
  color: colors.stroke,
  fillColor: colors.fill,
  fillOpacity,
  opacity: 0.95,
  weight,
  className: `faro-marker-${caseFile.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
}}
```

Adjust `MarkerVTN` to query by that class instead of `[data-marker-id]`:

```tsx
const safeId = caseId.replace(/[^a-zA-Z0-9_-]/g, "_");
const element = document.querySelector(`.faro-marker-${safeId}`);
```

Render `<MarkerVTN caseId={caseFile.id} isSelected={isSelected} />` after each `<CircleMarker>`.

- [ ] **Step 2: In `PanelHero.tsx`, apply matching name to the kicker chip**

Update `PanelHero` to apply `style={{ viewTransitionName: \`marker-\${caseFile.id}\` }}` on the kicker `<p>`:

```tsx
<p
  className={styles.panelKicker}
  style={{ viewTransitionName: `marker-${caseFile.id}` }}
>
  <ShieldCheck size={12} aria-hidden /> Expediente verificable
</p>
```

- [ ] **Step 3: Wrap `setSelectedCaseId` in `startViewTransition` (the trigger)**

Already wrapped? No — selecting a case currently just calls `setSelectedCaseId`. Add a `handleSelectCase` in `FaroExperience.tsx`:

```tsx
const handleSelectCase = useCallback((id: string) => {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (document as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(() =>
      setSelectedCaseId(id),
    );
    return;
  }
  setSelectedCaseId(id);
}, []);
```

Pass `handleSelectCase` instead of `setSelectedCaseId` to `<CaseMap onSelectCase={...}>`.

- [ ] **Step 4: Smoke test in Chrome**

```bash
npm run dev
```
Click a marker. In supporting browsers (Chrome 111+), the dot should appear to "fly" toward the kicker chip while the panel slides in. If the effect is glitchy or makes the marker disappear, **revert this task** — disable shared transition and keep only the panel slide.

- [ ] **Step 5: Document fallback**

If the shared transition is too fragile, simply revert this task with `git revert HEAD` and continue. The base animations from Tasks 16-20 still provide a polished feel.

- [ ] **Step 6: Commit (if it works)**

```bash
git add src/components/CaseMap.tsx src/components/MapUI/panel/PanelHero.tsx src/components/FaroExperience.tsx
git commit -m "feat: shared element view-transition for marker to panel kicker"
```

---

### Task 23: Final verification and cleanup checkpoint

- [ ] **Step 1: Typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 2: Existing tests**

```bash
npm run test
```
Expected: PASS

- [ ] **Step 3: No-regression diff for Explorer-side files**

```bash
git diff main..HEAD -- src/components/Explorer/ \
  src/components/RegionalMap/CountrySidebar.tsx \
  src/components/RegionalMap/RegionalSidebar.tsx \
  src/components/CaseDetails.tsx \
  src/components/RegionalMap/MobileHeader.tsx \
  src/components/WaybackControl.tsx
```
Expected output: empty.

- [ ] **Step 4: Full manual smoke test**

```bash
npm run dev
```
Walk through this matrix:

| Action | Expected |
|---|---|
| Initial load AR | Dock fades in bottom-right. No old ZoomControl, no old MapLegend |
| Hover marker | Mini-card tooltip appears + concentric halo |
| Click marker | Panel slides in from right. Dock shifts left 420px. Marker shows pulsing halo. (Optional: shared element flight) |
| Click "Detalles técnicos" accordion | Expands with smooth height transition (or snaps in unsupported browsers) |
| Click "Qué verificar después" accordion | Expands |
| Drag the Wayback slider inside panel | Tiles update; release label updates |
| Click "Ver fuente" | Opens new tab to `receipt.sourceUrl` |
| Click "Exportar" | Triggers download from `/api/export/{id}` |
| Click "Rastro visual" (when geometry available) | Toggles the trace circle on the map |
| Click X | Panel slides out. Dock returns. Halo disappears |
| Press Esc with panel open | Panel closes |
| Click "Capas" | Popover scales/slides in from left of button |
| Change basemap | Cross-fade between tile providers (Chrome) |
| Click "Leyenda" | Popover scales/slides; shows counts |
| Click outside popover | Closes |
| Press Esc with popover open | Closes |
| Toggle to Explorer | Cross-fade; Explorer renders identical to main |
| Toggle back to Map | Cross-fade |
| Resize to mobile width (~720px) | Panel takes full viewport width; dock still accessible |
| DevTools: emulate prefers-reduced-motion: reduce | No pulse, no slide-in animations |
| Case without coordinates (open from Explorer, switch to map view with selection) | Panel renders without "Imagen satelital" section |

If any item fails, debug and fix in a follow-up task before declaring done.

- [ ] **Step 5: Lint-style review of leftover code**

Use the Grep tool with pattern `MapLegend|CaseDetails` over `src/components/FaroExperience.tsx`. Expected: zero hits (both imports were removed in Tasks 5 and 13 respectively). If any hit remains, remove the line, then run `npm run typecheck` again.

- [ ] **Step 6: Commit any cleanup**

```bash
git add -A
git commit -m "chore: remove dead imports after map UI redesign"
```

- [ ] **Step 7: Push? No.**

Do NOT push. The user explicitly said: never push to remote unless asked. Report back to the user with a summary of commits and let them decide.

---

## Notes for the implementing engineer

1. **Always work on `feat/ui-map`. Never on `main`.**
2. **Never push without explicit user request.**
3. **Read the spec first**: `docs/superpowers/specs/2026-05-17-map-ui-redesign-design.md`.
4. **Don't touch `CaseDetails.tsx`, `CountrySidebar.tsx`, `RegionalSidebar.tsx`, `ExplorerView.tsx`, `MobileHeader.tsx`, `WaybackControl.tsx`.** A parallel developer is iterating on Explorer.
5. **Verify after every task with `npm run typecheck`. The project uses node:test (no jsdom), so UI verification is manual in the browser.**
6. **Each commit must leave the app in a working state.** Don't commit code that breaks the build.
7. **If a step's exact line number is stale (the file was edited between tasks), use Grep to relocate the snippet by content.**
8. **For optional Task 22 (shared element transition): if it makes the markers glitch or disappear, revert it and move on. The rest of the plan stands on its own.**
