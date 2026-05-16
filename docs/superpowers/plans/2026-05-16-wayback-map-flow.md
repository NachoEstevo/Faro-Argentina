# Wayback Map Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the Leaflet basemap to Esri World Imagery Wayback when a case is selected, with a floating control that lets the user step through the historical releases where Esri captured visible imagery changes at the case's coordinate.

**Architecture:** Pure client-side. A new `wayback.ts` module wraps the three Esri endpoints (config, change-by-location, tile URL) with module-level caches. A new `WaybackControl.tsx` component renders the floating slider. `CaseMap.tsx` holds a `WaybackState` machine, fetches on selection change, and renders the Wayback `TileLayer` conditionally. `CaseDetails.tsx` loses the obsolete `satelliteBox` placeholder.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, react-leaflet, native `fetch`, Lucide icons. No new npm packages. No unit tests (user-approved exception).

**Spec:** `docs/superpowers/specs/2026-05-16-wayback-map-flow-design.md`

---

## File Structure

**Create:**
- `src/lib/data/wayback.ts` — pure module: types, fetchers with caches, URL/date helpers.
- `src/components/WaybackControl.tsx` — presentational React component with four states (loading, active, no-changes, error).

**Modify:**
- `src/components/CaseMap.tsx` — adds `WaybackState`, fetch effect, conditional `TileLayer`, `MapContainer maxZoom`, `MapFocus` zoom level, `<WaybackControl />` render.
- `src/components/CaseDetails.tsx` — drop `Satellite` from lucide import, drop `satelliteCandidate` destructure, remove the `{satelliteCandidate && (...)}` block.
- `src/app/globals.css` — append `.waybackControl` and related class rules.

No tests, no data files, no scripts.

---

### Task 1: Smoke check Esri endpoints

**Files:** none changed; this is a manual verification step before coding.

- [ ] **Step 1: Hit the Wayback config endpoint**

Run:

```bash
curl -s "https://livingatlas.arcgis.com/wayback/config/waybackconfig.json" | head -c 400
```

Expected: a JSON object whose top-level keys are numeric strings (release ids) and values are objects with `releaseNum`, `releaseDateLabel`, `itemTitle`, etc. If the response is HTML or 404, STOP and report — the spec must be re-evaluated.

- [ ] **Step 2: Hit the changes-by-location endpoint with an Argentine coordinate**

Run:

```bash
curl -s "https://metadataqueryservice.maptiles.arcgis.com/arcgis/rest/services/MetadataQueryService/MapServer/exts/MetadataQueryServer/queryRecentChangesByLocation?location=-58.39,-34.59&inSR=4326"
```

Expected: a JSON array of release id integers, e.g. `[10, 23, 41, 87]` (the exact ids vary). If empty `[]` is returned, that location simply has no captured changes — still valid. If the response is HTML or an error envelope, STOP and report.

- [ ] **Step 3: Confirm a tile URL renders**

Pick one release id from Step 2's array (e.g. `41`). Open in browser:

```
https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_41/MapServer/tile/16/22000/40000
```

(The `16/22000/40000` is a placeholder z/y/x; the response should be either a PNG image or a 200 OK with imagery for some tile.) If the response is 4xx/5xx, STOP and report.

- [ ] **Step 4: Record findings**

In the chat / PR description, paste a one-line confirmation: "Esri endpoints respond as expected: config returned N releases, changes endpoint returned X ids for AR sample point, tile URL serves PNG." No commit; this is a pre-flight check only.

---

### Task 2: Create `wayback.ts`

**Files:**
- Create: `src/lib/data/wayback.ts`

- [ ] **Step 1: Write the module**

Create `src/lib/data/wayback.ts`:

```ts
export interface WaybackRelease {
  releaseId: number;
  releaseDate: string;
  releaseLabel: string;
}

const CONFIG_URL = "https://livingatlas.arcgis.com/wayback/config/waybackconfig.json";
const CHANGES_URL =
  "https://metadataqueryservice.maptiles.arcgis.com/arcgis/rest/services/MetadataQueryService/MapServer/exts/MetadataQueryServer/queryRecentChangesByLocation";

let configCache: WaybackRelease[] | null = null;
let configPromise: Promise<WaybackRelease[]> | null = null;
const changesCache = new Map<string, WaybackRelease[]>();

export async function loadWaybackConfig(): Promise<WaybackRelease[]> {
  if (configCache) return configCache;
  if (configPromise) return configPromise;
  configPromise = (async () => {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) {
      configPromise = null;
      throw new Error(`Wayback config request failed: ${response.status}`);
    }
    const raw = (await response.json()) as Record<string, unknown>;
    const releases = mapConfigRawToReleases(raw);
    configCache = releases;
    configPromise = null;
    return releases;
  })();
  return configPromise;
}

export async function fetchChangesForPoint(
  caseId: string,
  lat: number,
  lon: number,
): Promise<WaybackRelease[]> {
  const cached = changesCache.get(caseId);
  if (cached) return cached;
  const [config, ids] = await Promise.all([loadWaybackConfig(), fetchChangesIds(lat, lon)]);
  const releases = mapChangesRawToReleases(config, ids);
  changesCache.set(caseId, releases);
  return releases;
}

async function fetchChangesIds(lat: number, lon: number): Promise<number[]> {
  const url = `${CHANGES_URL}?location=${lon},${lat}&inSR=4326&f=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Wayback changes request failed: ${response.status}`);
  }
  const parsed = (await response.json()) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Wayback changes response is not an array");
  }
  return parsed.filter((value): value is number => typeof value === "number");
}

export function tileUrlForRelease(releaseId: number): string {
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_${releaseId}/MapServer/tile/{z}/{y}/{x}`;
}

const SHORT_MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function formatReleaseDate(release: WaybackRelease): string {
  const date = new Date(`${release.releaseDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return release.releaseDate;
  const month = SHORT_MONTH_LABELS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${month} ${year}`;
}

export function mapConfigRawToReleases(raw: Record<string, unknown>): WaybackRelease[] {
  const releases: WaybackRelease[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const releaseId = Number.parseInt(key, 10);
    const releaseDate = typeof entry.releaseDateLabel === "string" ? entry.releaseDateLabel : null;
    const releaseLabel = typeof entry.itemTitle === "string" ? entry.itemTitle : null;
    if (!Number.isFinite(releaseId) || !releaseDate || !releaseLabel) continue;
    releases.push({ releaseId, releaseDate, releaseLabel });
  }
  releases.sort((left, right) => left.releaseDate.localeCompare(right.releaseDate));
  return releases;
}

export function mapChangesRawToReleases(
  config: WaybackRelease[],
  raw: number[],
): WaybackRelease[] {
  const wanted = new Set(raw);
  return config
    .filter((release) => wanted.has(release.releaseId))
    .sort((left, right) => left.releaseDate.localeCompare(right.releaseDate));
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit 0, no diagnostics.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/wayback.ts
git commit -m "feat: add wayback module with esri fetchers and helpers"
```

---

### Task 3: Create `WaybackControl.tsx`

**Files:**
- Create: `src/components/WaybackControl.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/WaybackControl.tsx`:

```tsx
"use client";

import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";

import {
  formatReleaseDate,
  type WaybackRelease,
} from "@/lib/data/wayback";

export type WaybackState =
  | { status: "off" }
  | { status: "loading"; caseId: string }
  | { status: "active"; caseId: string; releases: WaybackRelease[]; activeReleaseId: number }
  | { status: "no-changes"; caseId: string; latestRelease: WaybackRelease }
  | { status: "error"; caseId: string; message: string };

interface Props {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onClose: () => void;
  onRetry?: () => void;
}

const ATTRIBUTION =
  "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export default function WaybackControl({ state, onActiveReleaseChange, onClose, onRetry }: Props) {
  if (state.status === "off") return null;

  return (
    <aside className="waybackControl" role="region" aria-label="Esri Wayback releases">
      <header>
        <h3>Imagery Esri Wayback</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar Wayback">
          <X size={14} aria-hidden />
        </button>
      </header>
      <Body state={state} onActiveReleaseChange={onActiveReleaseChange} onRetry={onRetry} />
      <footer className="waybackAttribution">{ATTRIBUTION}</footer>
    </aside>
  );
}

function Body({
  state,
  onActiveReleaseChange,
  onRetry,
}: {
  state: Exclude<WaybackState, { status: "off" }>;
  onActiveReleaseChange: (releaseId: number) => void;
  onRetry?: () => void;
}) {
  if (state.status === "loading") {
    return <p className="waybackEmpty">Cargando releases...</p>;
  }
  if (state.status === "error") {
    return (
      <div className="waybackError">
        <p>{state.message || "No se pudo cargar Wayback."}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            <RefreshCw size={12} aria-hidden /> Reintentar
          </button>
        ) : null}
      </div>
    );
  }
  if (state.status === "no-changes") {
    return (
      <div>
        <p className="waybackEmpty">Sin cambios visibles en esta coordenada.</p>
        <p className="waybackMeta">Mostrando release mas reciente: {formatReleaseDate(state.latestRelease)}</p>
      </div>
    );
  }
  const { releases, activeReleaseId } = state;
  const activeIndex = releases.findIndex((release) => release.releaseId === activeReleaseId);
  const safeIndex = activeIndex >= 0 ? activeIndex : releases.length - 1;
  const activeRelease = releases[safeIndex];
  const canGoBack = safeIndex > 0;
  const canGoForward = safeIndex < releases.length - 1;

  return (
    <div>
      <div className="waybackDate">{formatReleaseDate(activeRelease)}</div>
      <div className="waybackSlider">
        <button
          type="button"
          onClick={() => canGoBack && onActiveReleaseChange(releases[safeIndex - 1].releaseId)}
          disabled={!canGoBack}
          aria-label="Release anterior"
        >
          <ChevronLeft size={14} aria-hidden />
        </button>
        <input
          type="range"
          min={0}
          max={releases.length - 1}
          step={1}
          value={safeIndex}
          onChange={(event) => {
            const next = releases[Number.parseInt(event.target.value, 10)];
            if (next) onActiveReleaseChange(next.releaseId);
          }}
          disabled={releases.length <= 1}
          aria-label="Wayback release"
        />
        <button
          type="button"
          onClick={() => canGoForward && onActiveReleaseChange(releases[safeIndex + 1].releaseId)}
          disabled={!canGoForward}
          aria-label="Release siguiente"
        >
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
      <p className="waybackMeta">
        Maxar / Airbus . {releases.length} {releases.length === 1 ? "release" : "releases"} disponibles
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/WaybackControl.tsx
git commit -m "feat: add wayback control component"
```

---

### Task 4: Wire `CaseMap.tsx`

**Files:**
- Modify: `src/components/CaseMap.tsx`

- [ ] **Step 1: Replace the file with the wired version**

Replace the entire contents of `src/components/CaseMap.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import { buildCaseMarkerKey } from "@/lib/data/mapMarkers";
import {
  fetchChangesForPoint,
  loadWaybackConfig,
  tileUrlForRelease,
} from "@/lib/data/wayback";
import WaybackControl, { type WaybackState } from "./WaybackControl";

interface Props {
  cases: ExplorerCase[];
  selectedCaseId: string | null;
  traceMode: boolean;
  onSelectCase: (id: string) => void;
}

const CARTODB_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTODB_ATTRIBUTION = "&copy; OpenStreetMap contributors &copy; CARTO";
const ESRI_ATTRIBUTION = "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export default function CaseMap({ cases, selectedCaseId, traceMode, onSelectCase }: Props) {
  const selectedCase = cases.find((caseFile) => caseFile.id === selectedCaseId) ?? null;
  const mapCases = cases.filter((caseFile) => caseFile.coordinates !== null);

  const [waybackState, setWaybackState] = useState<WaybackState>({ status: "off" });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const coordinates = selectedCase?.coordinates;
    const caseId = selectedCase?.id;
    if (!caseId || !coordinates) {
      setWaybackState({ status: "off" });
      return;
    }
    setWaybackState({ status: "loading", caseId });
    fetchChangesForPoint(caseId, coordinates.lat, coordinates.lon)
      .then(async (releases) => {
        if (cancelled) return;
        if (releases.length === 0) {
          const config = await loadWaybackConfig();
          if (cancelled) return;
          const latest = config[config.length - 1];
          if (!latest) {
            setWaybackState({
              status: "error",
              caseId,
              message: "Wayback no devolvio releases disponibles.",
            });
            return;
          }
          setWaybackState({ status: "no-changes", caseId, latestRelease: latest });
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
  }, [selectedCase?.id, selectedCase?.coordinates?.lat, selectedCase?.coordinates?.lon, retryToken]);

  const handleActiveReleaseChange = useCallback((releaseId: number) => {
    setWaybackState((current) =>
      current.status === "active" ? { ...current, activeReleaseId: releaseId } : current,
    );
  }, []);

  const handleClose = useCallback(() => {
    setWaybackState({ status: "off" });
    onSelectCase("");
  }, [onSelectCase]);

  const handleRetry = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  const waybackTileUrl =
    waybackState.status === "active"
      ? tileUrlForRelease(waybackState.activeReleaseId)
      : waybackState.status === "no-changes"
        ? tileUrlForRelease(waybackState.latestRelease.releaseId)
        : null;

  return (
    <>
      <MapContainer
        center={[-31.5, -64.2]}
        zoom={5}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        scrollWheelZoom
        className="leafletRoot"
      >
        {waybackTileUrl ? (
          <TileLayer key={waybackTileUrl} attribution={ESRI_ATTRIBUTION} url={waybackTileUrl} maxZoom={19} />
        ) : (
          <TileLayer attribution={CARTODB_ATTRIBUTION} url={CARTODB_URL} />
        )}
        <ZoomControl position="bottomright" />
        <MapFocus cases={mapCases} selectedCase={selectedCase} waybackActive={waybackTileUrl !== null} />
        {selectedCase?.coordinates && traceMode && (
          <Circle
            center={[selectedCase.coordinates.lat, selectedCase.coordinates.lon]}
            radius={65000}
            pathOptions={{
              color: "#d8a63d",
              fillColor: "#f3c969",
              fillOpacity: 0.08,
              opacity: 0.7,
              weight: 1,
            }}
          />
        )}
        {mapCases.map((caseFile, index) => {
          const isSelected = caseFile.id === selectedCaseId;
          const coordinates = caseFile.coordinates;
          if (!coordinates) return null;
          return (
            <CircleMarker
              key={buildCaseMarkerKey(caseFile, index)}
              center={[coordinates.lat, coordinates.lon]}
              radius={isSelected ? 9 : 6}
              eventHandlers={{ click: () => onSelectCase(caseFile.id) }}
              pathOptions={{
                color: isSelected ? "#111827" : "#7c4a03",
                fillColor: isSelected ? "#f3c969" : "#d8a63d",
                fillOpacity: isSelected ? 0.95 : 0.72,
                opacity: 0.95,
                weight: isSelected ? 3 : 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>{caseFile.title}</strong>
                <span>{caseFile.workNumber}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <WaybackControl
        state={waybackState}
        onActiveReleaseChange={handleActiveReleaseChange}
        onClose={handleClose}
        onRetry={handleRetry}
      />
    </>
  );
}

function MapFocus({
  cases,
  selectedCase,
  waybackActive,
}: {
  cases: ExplorerCase[];
  selectedCase: ExplorerCase | null;
  waybackActive: boolean;
}) {
  const map = useMap();
  const boundsKey = useMemo(() => cases.map((caseFile) => caseFile.id).join("|"), [cases]);

  useEffect(() => {
    if (selectedCase?.coordinates) {
      const targetZoom = waybackActive ? 17 : 8;
      map.flyTo([selectedCase.coordinates.lat, selectedCase.coordinates.lon], targetZoom, {
        animate: true,
        duration: 0.9,
      });
      return;
    }
    const coordinates = cases.flatMap((caseFile) =>
      caseFile.coordinates ? [[caseFile.coordinates.lat, caseFile.coordinates.lon] as [number, number]] : [],
    );
    if (coordinates.length > 1) {
      map.fitBounds(coordinates, { padding: [80, 80], maxZoom: 5 });
    }
  }, [boundsKey, cases, map, selectedCase, waybackActive]);

  return null;
}
```

Notes for the implementer:
- The `<WaybackControl />` lives OUTSIDE the `<MapContainer>` so it can be positioned with absolute CSS relative to `.leafletRoot`'s parent (`.faroShell`). It is rendered inside the fragment that wraps both.
- The `key={waybackTileUrl}` on the Wayback `TileLayer` forces Leaflet to remount when the URL changes (between releases). Without it, react-leaflet sometimes re-uses the cached tile pyramid from the previous release.
- The `retryToken` is bumped by `handleRetry` so the effect re-runs even when `selectedCase` did not change.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/CaseMap.tsx
git commit -m "feat: wire wayback flow into case map"
```

---

### Task 5: Clean up `CaseDetails.tsx`

**Files:**
- Modify: `src/components/CaseDetails.tsx`

- [ ] **Step 1: Drop `Satellite` from the lucide import**

Replace the first import line:

```tsx
import { Download, ExternalLink, FileSearch, Route, Satellite, ShieldCheck } from "lucide-react";
```

with:

```tsx
import { Download, ExternalLink, FileSearch, Route, ShieldCheck } from "lucide-react";
```

- [ ] **Step 2: Drop `satelliteCandidate` from the destructure**

Replace the line currently at line 24:

```tsx
  const { hasOfficialGeometry, satelliteCandidate } = expediente.investigationContext;
```

with:

```tsx
  const { hasOfficialGeometry } = expediente.investigationContext;
```

- [ ] **Step 3: Remove the `satelliteBox` block**

Delete the entire JSX block currently at lines 59-80 of `src/components/CaseDetails.tsx`. The block begins with:

```tsx
      {satelliteCandidate && (
        <section className="satelliteBox">
```

and ends with the closing `)}` after the `</section>` (around line 80). After removal, the surrounding JSX flows directly from `<CaseSignalPanel caseFile={caseFile} />` into `<section className="receiptBox">`.

- [ ] **Step 4: Run typecheck and tests**

Run:

```bash
npm run typecheck
npm test
```

Expected: typecheck exit 0; existing tests pass (the placeholder removal does not touch any tested module).

- [ ] **Step 5: Commit**

```bash
git add src/components/CaseDetails.tsx
git commit -m "chore: remove satellite placeholder from case details"
```

---

### Task 6: Add Wayback CSS to `globals.css`

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append the rules at the end of the file**

Append this block at the bottom of `src/app/globals.css`:

```css
.waybackControl {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 5;
  width: 340px;
  border: 1px solid var(--faro-line);
  background: var(--faro-panel-strong);
  backdrop-filter: blur(18px);
  box-shadow: var(--faro-shadow);
  padding: 14px 16px;
  display: grid;
  gap: 10px;
  color: var(--faro-text);
  font-size: 12px;
  pointer-events: auto;
}

.waybackControl header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.waybackControl header h3 {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--faro-amber);
}

.waybackControl header button {
  background: transparent;
  border: 1px solid var(--faro-line);
  color: rgba(255, 255, 255, 0.7);
  padding: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.waybackControl header button:hover {
  border-color: var(--faro-amber);
  color: var(--faro-amber);
}

.waybackDate {
  font-weight: 700;
  color: var(--faro-amber-strong);
  font-size: 16px;
  letter-spacing: 0.02em;
}

.waybackSlider {
  display: grid;
  grid-template-columns: 28px 1fr 28px;
  align-items: center;
  gap: 8px;
}

.waybackSlider button {
  background: transparent;
  border: 1px solid var(--faro-line);
  color: var(--faro-text);
  padding: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.waybackSlider button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.waybackSlider input[type="range"] {
  width: 100%;
  accent-color: var(--faro-amber);
}

.waybackMeta {
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  line-height: 1.35;
}

.waybackEmpty {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  line-height: 1.4;
}

.waybackError {
  display: grid;
  gap: 8px;
  color: rgba(255, 200, 200, 0.85);
  font-size: 12px;
}

.waybackError button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--faro-line);
  color: var(--faro-amber);
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  justify-self: start;
}

.waybackAttribution {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.42);
  border-top: 1px solid var(--faro-line);
  padding-top: 8px;
  line-height: 1.3;
}

@media (max-width: 640px) {
  .waybackControl {
    bottom: 84px;
    left: 16px;
    right: 16px;
    width: auto;
  }
}
```

- [ ] **Step 2: Run typecheck and build**

Run:

```bash
npm run typecheck
npm run build
```

Expected: typecheck exit 0; production build succeeds with the same routes as before.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: style wayback control"
```

---

### Task 7: Verification gate

**Files:** none.

- [ ] **Step 1: Full automated gate**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all green. The existing tests must still pass; Wayback adds no tests but also touches no tested module.

- [ ] **Step 2: Start the dev server**

Run:

```bash
npm run dev
```

Open `http://127.0.0.1:3002/?demo=map`.

- [ ] **Step 3: Manual smoke checks**

Verify in the browser:

1. The map loads with the CartoDB basemap and case markers.
2. Click an AR marker with coordinates. Within a second, the map flies in to ~zoom 17, the basemap swaps to Esri Wayback (no labels visible), and the floating `WaybackControl` appears at the bottom-left.
3. The control shows the most recent release that captured changes at that point (e.g. "ago 2024").
4. Drag the slider left or click the left chevron. The tiles re-render to the older release; the date label updates.
5. Click the `X` button. The control disappears, the basemap returns to CartoDB, and the map fits all bounds.
6. Click a different AR marker. The flow repeats with the new coordinate.
7. Open DevTools, switch to a mobile viewport (375 px). The control reflows to span the bottom of the viewport, above the case panel.
8. Open DevTools Network tab and block `wayback.maptiles.arcgis.com`. Click a marker. The control should show the loading state briefly, then transition to the error state with a "Reintentar" button. Click Reintentar. (Unblock the domain first to make the retry succeed.)
9. Pick a case in a sparsely-mapped rural coordinate if available. The "Sin cambios visibles" state should render (or, if all your test cases have changes, simulate by editing `fetchChangesIds` to return `[]` and reloading — revert the edit after verifying).

- [ ] **Step 4: Capture findings**

In the chat / PR description, summarize: which checks passed, which (if any) needed adjustment, and any anomalies (latency, occasional 404 tiles in remote regions, etc.).

- [ ] **Step 5: Final status**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: working tree clean, six new commits on `feat/wayback-map-flow` (Tasks 2-6), branch ahead of `main` by the spec commit (`ad5af9e`, `9d455d3`) + the six implementation commits.

No push. The branch is ready for review or merge per the user's decision.
