# Wayback Map Flow Design

Date: 2026-05-16
Status: approved design scope, pending implementation plan
Companion docs: `2026-05-16-expediente-faro-v1-design.md`, `2026-05-16-sentinel-satellite-layer-design.md` (V1 satellite, superseded for this iteration)

## Promise

When the user clicks a map point with official coordinates, the basemap swaps
from CartoDB labels to Esri World Imagery, the map zooms in, and a floating
control lets the user step through one Wayback release per year (2014 to the
latest available). Sub-metre resolution, no labels by default, no static
caching, no audit chain.

Why yearly sampling and not per-coordinate change detection: Esri's Wayback
service does not expose a public "changes at this point" endpoint. The
official web app implements that by polling every release's per-release
metadata service (~100 HTTP calls per coordinate). That is too heavy for the
hackathon scope. Yearly sampling produces a clean ~12-tick timeline that
visually differs across years where the area developed; areas with no change
will look similar across ticks, and that is honest information.

## Principles

Aligned with existing Faro product rules:

- Map satellite mode only activates for cases with `coordinates && year`. The
  existing geometry gate is unchanged.
- Esri World Imagery base has no label overlay; the swap delivers a clean
  imagery view by default.
- Required attribution is visible on the floating control:
  `Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community`.
- Tiles are fetched live by the user's browser. Faro does not cache, proxy,
  redistribute, or commit any Esri imagery. ToS-compliant by construction.
- Copy is descriptive, not accusatory: "imagery del lugar en distintas fechas",
  never "cambio sospechoso".
- The release set is identical for every coordinate (yearly samples from the
  global Wayback config). No per-coordinate filtering, no "no-changes" branch.

## Scope

- Replaces the placeholder `satelliteBox` block in `CaseDetails.tsx` (lines
  59-80) — that block is removed entirely.
- The Sentinel-2 work shipped on branch `feat/sentinel-satellite-layer` is NOT
  reincorporated here; it remains preserved but unmerged. Future iterations may
  fold it back in as an audit footer.
- AR/PE/CL cases with coordinates trigger Wayback. Today only AR has cases with
  coordinates; PE/CL benefit when their geometry gates pass.

## Out of scope (explicit non-goals)

- Side-by-side simultaneous before/after view.
- Cadastral overlays (IDERA, GEOIDEP, IDE Chile) — future iteration.
- User annotations on imagery.
- Auditable receipt for the rendered tiles.
- Sentinel-2 evidence chain.

## Architecture

Pure client-side. No build script, no Python, no server routes.

```
RUNTIME (browser, react-leaflet)

  src/lib/data/wayback.ts
    Pure module + one fetcher:
      loadYearlyReleases(): Promise<WaybackRelease[]>
      tileUrlForRelease(releaseId): string
      formatReleaseYear(release): string
      mapConfigRawToReleases(raw): WaybackRelease[]
      pickYearlyReleases(releases): WaybackRelease[]
    Module-level caches: releasesCache, releasesPromise.

  src/components/WaybackControl.tsx
    Presentational, no fetch. Props: { state, onActiveReleaseChange, onClose, onRetry }.
    Renders: header + slider + year label + attribution.

  src/components/CaseMap.tsx (modified)
    Adds waybackState (off | loading | active | error).
    useEffect on selectedCase + first mount: triggers loadYearlyReleases once,
    then sets active release to the latest yearly sample whenever a case is selected.
    Renders Wayback or CartoDB TileLayer conditionally.
    Renders <WaybackControl /> overlay when state != "off".
    Updates maxZoom (12 -> 19) and flyTo zoom (8 -> 17 when wayback active).

  src/components/CaseDetails.tsx (modified)
    Removes satelliteBox block (lines 59-80).
    Drops Satellite from lucide import.
    Drops satelliteCandidate from investigationContext destructure.
```

### Boundaries

- `src/lib/data/wayback.ts` is the only module that touches the external Esri
  network. Pure functions wrap the fetches; helpers (`tileUrlForRelease`,
  `formatReleaseDate`, `mapConfigRawToReleases`, `mapChangesRawToReleases`)
  contain no I/O.
- `WaybackControl.tsx` consumes state shapes; it does not initiate fetches or
  hold network logic.
- `CaseMap.tsx` is the orchestrator: selection -> fetch -> state -> render.
- `CaseDetails.tsx` only loses dead UI; no new logic.

### Endpoints

```
GET https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json
GET https://wayback.maptiles.arcgis.com/arcgis/rest/services/
    World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/<releaseId>/{z}/{y}/{x}
```

Only one fetched endpoint (config). Tile URLs are constructed locally from the
release id. The tile server lowercases and may redirect to a canonical release
id; the browser handles the 301 transparently.

### Auth

Anonymous. Esri Wayback tile and config endpoints are publicly reachable
without a token at hackathon-scale traffic. If 429 rate-limit errors appear in
production, the fallback is to add an ArcGIS Developer account API key as an
optional query parameter on tile requests. No setup required for this
iteration.

### Why pure client (not API route)

- Tiles flow directly from Esri's CDN to the user's browser. We do not proxy
  or cache them.
- Config and metadata responses are public JSON, accessible by `fetch` without
  CORS friction.
- No server state, no Python, no build artifacts. The feature is one TS file
  plus one component plus a CaseMap modification.

### Cache strategy

- `loadYearlyReleases`: module-level constant after first fetch. Concurrent
  callers share one in-flight Promise.
- Yearly subset is derived from the config in the same call and stored
  alongside; no separate cache entry.
- Tile responses: standard browser HTTP cache, governed by Esri's
  `Cache-Control` headers.
- Errors are NOT cached; the next call retries.

### Dependencies

No new npm packages. `react-leaflet` is already in use. Native `fetch`. The
community wrapper `@vannizhang/wayback-core` was considered and rejected: it
adds a dependency for trivial JSON parsing.

## Data Contract

### Types

```ts
export interface WaybackRelease {
  releaseId: number;       // e.g. 49059 (key from the config JSON)
  releaseDate: string;     // ISO date parsed from itemTitle, e.g. "2026-04-30"
  releaseLabel: string;    // e.g. "World Imagery (Wayback 2026-04-30)"
  year: number;            // e.g. 2026, derived from releaseDate
}
```

### CaseMap state

```ts
type WaybackState =
  | { status: "off" }
  | { status: "loading"; caseId: string }
  | { status: "active"; caseId: string; releases: WaybackRelease[]; activeReleaseId: number }
  | { status: "error"; caseId: string; message: string };
```

State transitions:

- `off -> loading`: `selectedCaseId` changes to a case with coordinates.
- `loading -> active`: yearly releases load successfully (typically one shared
  Promise resolves and every subsequent selection skips straight to active).
- `loading -> error`: config fetch times out, returns 4xx/5xx, or throws.
- `* -> off`: user clicks the `X` close button on the control (which calls
  `onSelectCase("")` to clear selection), or the lead feed deselects the case
  from any other source.

### Public API surface of `wayback.ts`

```ts
export async function loadYearlyReleases(): Promise<WaybackRelease[]>;
export function tileUrlForRelease(releaseId: number): string;
export function formatReleaseYear(release: WaybackRelease): string;
export function mapConfigRawToReleases(raw: Record<string, unknown>): WaybackRelease[];
export function pickYearlyReleases(releases: WaybackRelease[]): WaybackRelease[];
```

### Raw shape

Config (`waybackconfig.json` on S3):

```json
{
  "49059": {
    "itemID": "a2f72b9711c1449bb4be3ae41ea9eed4",
    "itemTitle": "World Imagery (Wayback 2026-04-30)",
    "itemURL": "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/49059/{level}/{row}/{col}",
    "metadataLayerUrl": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r04/MapServer",
    "metadataLayerItemID": "1b105b52b3af48908f7a4962d0f60dcc",
    "layerIdentifier": "WB_2026_R04"
  },
  "22869": { ... }
}
```

Mapping rules:

- `releaseId`: the JSON object key, parsed as integer.
- `releaseDate`: extracted via regex from `itemTitle`. Pattern:
  `\((\d{4})-(\d{2})-(\d{2})\)`. Entries whose title does not match are skipped.
- `releaseLabel`: the `itemTitle` verbatim.
- `year`: derived from `releaseDate`.

Yearly sampling: group all parsed releases by `year`, keep the latest
(maximum `releaseDate`) per year, sort ascending. Result is roughly 12-13
releases between 2014 and the current year.

### Tile URL helper

```ts
function tileUrlForRelease(releaseId: number): string {
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/{z}/{y}/{x}`;
}
```

The endpoint returns a 301 redirect to a lowercased canonical release id; the
browser follows it transparently in 200 ms or less.

### Full module skeleton (canonical reference for implementation)

```ts
export interface WaybackRelease {
  releaseId: number;
  releaseDate: string;
  releaseLabel: string;
  year: number;
}

const CONFIG_URL =
  "https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json";
const TITLE_DATE_PATTERN = /\((\d{4})-(\d{2})-(\d{2})\)/;

let releasesCache: WaybackRelease[] | null = null;
let releasesPromise: Promise<WaybackRelease[]> | null = null;

export async function loadYearlyReleases(): Promise<WaybackRelease[]> {
  if (releasesCache) return releasesCache;
  if (releasesPromise) return releasesPromise;
  releasesPromise = (async () => {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) {
      releasesPromise = null;
      throw new Error(`Wayback config request failed: ${response.status}`);
    }
    const raw = (await response.json()) as Record<string, unknown>;
    const all = mapConfigRawToReleases(raw);
    const yearly = pickYearlyReleases(all);
    releasesCache = yearly;
    releasesPromise = null;
    return yearly;
  })();
  return releasesPromise;
}

export function tileUrlForRelease(releaseId: number): string {
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/{z}/{y}/{x}`;
}

export function formatReleaseYear(release: WaybackRelease): string {
  return String(release.year);
}

export function mapConfigRawToReleases(raw: Record<string, unknown>): WaybackRelease[] {
  const releases: WaybackRelease[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const releaseId = Number.parseInt(key, 10);
    const itemTitle = typeof entry.itemTitle === "string" ? entry.itemTitle : null;
    if (!Number.isFinite(releaseId) || !itemTitle) continue;
    const match = itemTitle.match(TITLE_DATE_PATTERN);
    if (!match) continue;
    const releaseDate = `${match[1]}-${match[2]}-${match[3]}`;
    const year = Number.parseInt(match[1], 10);
    releases.push({ releaseId, releaseDate, releaseLabel: itemTitle, year });
  }
  releases.sort((left, right) => left.releaseDate.localeCompare(right.releaseDate));
  return releases;
}

export function pickYearlyReleases(releases: WaybackRelease[]): WaybackRelease[] {
  const latestPerYear = new Map<number, WaybackRelease>();
  for (const release of releases) {
    const previous = latestPerYear.get(release.year);
    if (!previous || previous.releaseDate < release.releaseDate) {
      latestPerYear.set(release.year, release);
    }
  }
  return Array.from(latestPerYear.values()).sort((left, right) => left.year - right.year);
}
```

### No persistence

No JSON manifest written to `data/`, no WebPs written to `public/`, no receipts
generated, no commit of tile imagery. Wayback in V2 is exploratory; it is not
audit-chain evidence. A separate spec can reintroduce Sentinel-2 as the
hashable evidence layer alongside Wayback later.

## UI

### `WaybackControl.tsx` (new)

Floating control. Position: `absolute; bottom: 24px; left: 24px;`. Width:
~340px. z-index 5.

```
+------------------------------------------------+
| Imagery Esri Wayback                       [X] |  <- [X] is the Lucide X icon button
|                                                |
| <  ago 2024                                  > |  <- < > are Lucide ChevronLeft / ChevronRight buttons
| -----.----------------------------------       |
|                                                |
| Maxar / Airbus . Click flechas o arrastra      |
|                                                |
| Source: Esri, Maxar, Earthstar Geographics,    |
| and the GIS User Community                     |
+------------------------------------------------+
```

States:

- `loading`: header + spinner + "Cargando releases..." (occurs once per session
  while the global config is fetched).
- `active`: full layout above with year label and slider over the yearly
  releases.
- `error`: header + message + "Reintentar" button.

Props:

```ts
interface WaybackControlProps {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onClose: () => void;
  onRetry?: () => void;
}
```

Keyboard:

- `Arrow Left` / `Arrow Right` on focused slider: step one tick.
- `Escape` on focused control: triggers `onClose`.

### Changes in `CaseMap.tsx`

1. Add state: `const [waybackState, setWaybackState] = useState<WaybackState>({ status: "off" });`
2. Add effect that, on `selectedCase` with coordinates change, calls
   `loadYearlyReleases()` and transitions through `loading -> active`. After
   the first session-wide load, subsequent selections jump straight to
   `active` because the cache resolves synchronously.
3. Conditional `TileLayer`: Wayback when `active`; CartoDB otherwise.
4. Raise `MapContainer maxZoom` from 12 to 19.
5. Change `flyTo` target zoom from 8 to 17 when wayback is active.
6. Render `<WaybackControl />` overlay when `waybackState.status !== "off"`.

### `CaseDetails.tsx` cleanup

1. Drop `Satellite` from the lucide-react import.
2. Replace `const { hasOfficialGeometry, satelliteCandidate } = ...` with
   `const { hasOfficialGeometry } = expediente.investigationContext;`.
3. Remove the `{satelliteCandidate && (...)}` block currently at lines 59-80.

The `traceBox` (Circle of 65 km radius) is unchanged. At zoom 17 with Wayback
active, the 65 km circle falls entirely outside the viewport and does not
visually interfere.

### CSS

About 60 lines in `globals.css`. New classes: `.waybackControl`,
`.waybackControl header`, `.waybackSlider`, `.waybackDate`, `.waybackMeta`,
`.waybackAttribution`, `.waybackEmpty`, `.waybackError`. Style follows the
existing Faro shell: amber accents, panel-strong background, subtle border.

### Mobile

For viewports under 640 px:
- Control moves to `bottom: 84px` (so it sits above any collapsed case panel).
- Width becomes `calc(100vw - 32px)`.
- Behavior identical.

## Verification

No unit tests for this iteration. The rest of `src/lib/data/` modules carry
test files; `wayback.ts` will be the first exception. The rationale: its
heaviest logic (network calls) is not unit-testable without mocks, and the
remaining helpers are short and visually obvious. Future iterations can add
tests if regressions emerge.

### Automated gates

```bash
npm run typecheck
npm run build
```

Both must pass before merge.

### Manual checks at `127.0.0.1:3002/?demo=map`

- Clicking an AR case with coordinates triggers a flyTo to zoom 17, the
  basemap swaps to Wayback imagery, and the floating control appears at the
  bottom-left.
- The control displays the most recent release that captured a change at that
  coordinate.
- Moving the slider swaps the tile layer to the corresponding release.
- Pressing the close icon on the control (Lucide `X`, top-right) restores
  CartoDB, hides the control, and fits all bounds. Selecting a different
  marker swaps the wayback target to that case; selecting nothing (e.g.
  filtering the lead feed to empty) returns to `off`.
- A case without coordinates does not trigger the control.
- A rural coordinate with no Wayback changes shows "Sin cambios visibles" and
  the fallback release renders the basemap.
- DevTools mobile emulation at 375 px keeps the control reachable.
- Throttling the Esri network in DevTools triggers the error state with a
  retry button.

### Smoke check of Esri endpoints before coding

```
curl -s "https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json" | head -c 400
curl -sL -o /dev/null -w "%{http_code} %{content_type}\n" "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/49059/10/400/200"
```

If Esri changed contract, this is where we discover it. Empirically confirmed
on 2026-05-16: config returns JSON with release-id keys; tile URL serves JPEG
after a 301 redirect to a lowercased canonical id.

### Plan B if Esri changes or disappears

- `loadYearlyReleases` failure puts `WaybackState` into `error` -> control
  shows message and retry.
- CartoDB basemap, markers, lead feed, and case panel continue working.
- The change can be reverted by removing the conditional `TileLayer` block and
  the `WaybackControl` overlay. No data model rollback needed because no data
  is persisted.

## Open risks

- Esri's Wayback service has no SLA. Long-term reliance carries availability
  risk.
- Anonymous rate limits are undocumented; sudden spikes could trigger 429.
  Mitigation: add ArcGIS Developer account API key later.
- Yearly sampling means a year with no real imagery change at the coordinate
  will look identical to the previous tick. This is honest (Wayback re-issued
  the same imagery) but the user may expect every tick to differ.
- The slider date is the release date Esri published, not the imagery capture
  date. Copy reflects that: "Imagery Esri Wayback (release YYYY)".
- Mobile basemap at zoom 17 is bandwidth-heavy. Default zoom is intentional
  but users on slow connections will feel it.
