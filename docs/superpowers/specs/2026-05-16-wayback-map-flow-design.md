# Wayback Map Flow Design

Date: 2026-05-16
Status: approved design scope, pending implementation plan
Companion docs: `2026-05-16-expediente-faro-v1-design.md`, `2026-05-16-sentinel-satellite-layer-design.md` (V1 satellite, superseded for this iteration)

## Promise

When the user clicks a map point with official coordinates, the basemap swaps
from CartoDB labels to Esri World Imagery, the map zooms in, and a floating
control lets the user step through the Wayback releases where Esri captured
visible imagery changes at that coordinate. Sub-metre resolution, no labels by
default, no static caching, no audit chain.

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
- If the metadata service returns zero releases for a coordinate, the control
  shows "Sin cambios visibles" and the basemap renders the most recent global
  Wayback release as a fallback so the visual swap still occurs.

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
    Pure module + fetchers Esri:
      loadWaybackConfig(): Promise<WaybackRelease[]>
      fetchChangesForPoint(caseId, lat, lon): Promise<WaybackRelease[]>
      tileUrlForRelease(releaseId): string
      formatReleaseDate(release): string
      mapConfigRawToReleases(raw): WaybackRelease[]
      mapChangesRawToReleases(config, raw): WaybackRelease[]
    Module-level caches: configCache, configPromise, changesCache.

  src/components/WaybackControl.tsx
    Presentational, no fetch. Props: { state, onActiveReleaseChange, onClose, onRetry }.
    Renders: header + slider + date label + metadata + attribution.

  src/components/CaseMap.tsx (modified)
    Adds waybackState (off | loading | active | no-changes | error).
    useEffect on selectedCase: triggers fetchChangesForPoint, sets state.
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
GET https://livingatlas.arcgis.com/wayback/config/waybackconfig.json
GET https://metadataqueryservice.maptiles.arcgis.com/arcgis/rest/services/
    MetadataQueryService/MapServer/exts/MetadataQueryServer/
    queryRecentChangesByLocation?location=<lon>,<lat>&inSR=4326
GET https://wayback.maptiles.arcgis.com/arcgis/rest/services/
    World_Imagery_<releaseId>/MapServer/tile/{z}/{y}/{x}
```

### Auth

Anonymous by default. Esri Wayback tile and metadata endpoints are publicly
reachable without a token at hackathon-scale traffic. If 429 rate-limit errors
appear in production, the fallback is to add an ArcGIS Developer account API
key as an optional query parameter on every request. No setup required for
this iteration.

### Why pure client (not API route)

- Tiles flow directly from Esri's CDN to the user's browser. We do not proxy
  or cache them.
- Config and metadata responses are public JSON, accessible by `fetch` without
  CORS friction.
- No server state, no Python, no build artifacts. The feature is one TS file
  plus one component plus a CaseMap modification.

### Cache strategy

- `loadWaybackConfig`: module-level constant after first fetch. Concurrent
  callers share one in-flight Promise.
- `fetchChangesForPoint`: `Map<caseId, WaybackRelease[]>` keyed by case id.
  Hits cache on revisit; never evicted in tab lifetime.
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
  releaseId: number;       // e.g. 10
  releaseDate: string;     // ISO date, e.g. "2024-08-15"
  releaseLabel: string;    // e.g. "World Imagery Wayback 2024-08-15"
}
```

### CaseMap state

```ts
type WaybackState =
  | { status: "off" }
  | { status: "loading"; caseId: string }
  | { status: "active"; caseId: string; releases: WaybackRelease[]; activeReleaseId: number }
  | { status: "no-changes"; caseId: string; latestRelease: WaybackRelease }
  | { status: "error"; caseId: string; message: string };
```

State transitions:

- `off -> loading`: `selectedCaseId` changes to a case with coordinates.
- `loading -> active`: fetch returns >= 1 release.
- `loading -> no-changes`: fetch returns 0 releases.
- `loading -> error`: fetch times out, returns 4xx/5xx, or throws.
- `* -> off`: user deselects the case, or clicks `[x]` on the control.

### Public API surface of `wayback.ts`

```ts
export async function loadWaybackConfig(): Promise<WaybackRelease[]>;
export async function fetchChangesForPoint(caseId: string, lat: number, lon: number): Promise<WaybackRelease[]>;
export function tileUrlForRelease(releaseId: number): string;
export function formatReleaseDate(release: WaybackRelease): string;
export function mapConfigRawToReleases(raw: Record<string, unknown>): WaybackRelease[];
export function mapChangesRawToReleases(config: WaybackRelease[], raw: number[]): WaybackRelease[];
```

### Raw shapes

Config (`waybackconfig.json`):

```json
{
  "10": {
    "releaseNum": 10,
    "releaseDateLabel": "2024-08-15",
    "itemTitle": "World Imagery Wayback 2024-08-15",
    "itemURL": "...",
    "metadataLayerUrl": "..."
  }
}
```

Mapped:

```ts
{
  releaseId: 10,
  releaseDate: "2024-08-15",
  releaseLabel: "World Imagery Wayback 2024-08-15",
}
```

Changes (`queryRecentChangesByLocation`): array of release ids, e.g. `[10, 23, 41, 87]`.

Mapped: filter config to those ids and sort ascending by `releaseDate`.

### Tile URL helper

```ts
function tileUrlForRelease(releaseId: number): string {
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_${releaseId}/MapServer/tile/{z}/{y}/{x}`;
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
| Imagery Esri Wayback                       [x] |
|                                                |
| <  ago 2024                                  > |
| -----.----------------------------------       |
|                                                |
| Maxar / Airbus . Click flechas o arrastra      |
|                                                |
| Source: Esri, Maxar, Earthstar Geographics,    |
| and the GIS User Community                     |
+------------------------------------------------+
```

States:

- `loading`: header + spinner + "Cargando releases..."
- `active`: full layout above.
- `no-changes`: header + body text "Sin cambios visibles en esta coordenada" +
  chip with fallback release date.
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
2. Add effect that triggers fetch on `selectedCase` change.
3. Conditional `TileLayer`: Wayback when `active` or `no-changes`; CartoDB
   otherwise.
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

- Clicking an AR case with coordinates triggers a flyTo to roughly zoom 17,
  the basemap swaps to Wayback imagery, and the floating control appears at
  the bottom-left.
- The control displays the most recent release that captured a change at that
  coordinate.
- Moving the slider swaps the tile layer to the corresponding release.
- Pressing `[x]` on the control or selecting empty space restores CartoDB and
  fits all bounds.
- A case without coordinates does not trigger the control.
- A rural coordinate with no Wayback changes shows "Sin cambios visibles" and
  the fallback release renders the basemap.
- DevTools mobile emulation at 375 px keeps the control reachable.
- Throttling the Esri network in DevTools triggers the error state with a
  retry button.

### Smoke check of Esri endpoints before coding

```
curl -s "https://livingatlas.arcgis.com/wayback/config/waybackconfig.json" | head -c 200
curl -s "https://metadataqueryservice.maptiles.arcgis.com/arcgis/rest/services/MetadataQueryService/MapServer/exts/MetadataQueryServer/queryRecentChangesByLocation?location=-58.39,-34.59&inSR=4326"
```

If Esri changed contract, this is where we discover it.

### Plan B if Esri changes or disappears

- `fetchChangesForPoint` failure puts `WaybackState` into `error` -> control
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
- The metadata query service returns "releases where Esri detected change",
  not "releases captured at date X". The slider date is therefore the release
  date, not the imagery capture date; copy reflects that.
- Mobile basemap at zoom 17 is bandwidth-heavy. Default zoom is intentional
  but users on slow connections will feel it.
