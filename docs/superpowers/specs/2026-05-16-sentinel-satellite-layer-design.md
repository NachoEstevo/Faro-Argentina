# Sentinel-2 Satellite Layer Design

Date: 2026-05-16
Status: approved design scope, pending implementation plan
Companion docs: `2026-05-16-expediente-faro-v1-design.md`, `docs/handoffs/2026-05-16-ui-ux-expediente-faro-v1.md`

## Promise

For cases that have an official coordinate and a year, Faro shows two Sentinel-2
snapshots (one before the contract and one recent) as **verifiable territorial
context**. The feature does not prove physical progress, does not prove payments,
does not perform automatic change detection.

## Principles

Aligned with the existing Faro product rules:

- Every visible scene is treated as just another official source. Each scene
  carries an `EvidenceReceipt` with `sourceId`, scene id, datetime, cloud cover,
  hash, and STAC item URL. The user can reproduce the same scene from the same
  link.
- The satellite panel only appears when the case has official geometry
  (`coordinates`) and a temporal anchor (`year`). Cases without geometry behave
  as today: no panel.
- Caveats live next to the imagery, not on a separate screen.
- Language stays verification-first: "imagen satelital", "snapshot", "contexto
  territorial". Never "antes de la corrupcion", "post irregularidad", "obra
  fantasma" or similar.
- A dataset-level locator is never presented as a direct record. The Planetary
  Computer STAC item URL is a direct record (`official_detail` locator).

## Scope

Any case file with `coordinates && year`, regardless of `countryCode`. Today this
effectively covers Argentina; Peru and Chile are wired through so the layer
turns on automatically once their cases acquire official geometry.

## Architecture

```
BUILD-TIME (Python script, on-demand)
  scripts/fetch-sentinel-scenes.py
    reads case datasets (AR/PE/CL) with coord + year
    per case:
      bbox = 500 m around the point
      window_before = [contractDate - 6 months, contractDate]
      window_after  = [today - 6 months, today]
      query Planetary Computer STAC, filter eo:cloud_cover < 10 %
      if empty, expand: (12 months, < 30 %), (18 months, < 50 %)
      sign url, fetch B04/B03/B02 clipped to bbox
      normalize 8-bit, export WebP 512 x 512
      write receipt + manifest entry
    outputs:
      public/sentinel/<caseId>/{before,after}.webp
      data/sentinel/scene-manifest.json

RUNTIME (Next.js, no external network)
  src/lib/data/satelliteScenes.ts
    loadSceneManifest(): Map<caseId, SatelliteEvidence>
  src/lib/data/expediente.ts
    buildExpediente() adds expediente.satelliteEvidence
  src/lib/data/evidenceReceipts.ts
    new global sourceId 'PC-SENTINEL2-L2A'
  src/components/SatellitePanel.tsx
    side-by-side thumbnails + zoom modal
    consumes /sentinel/<caseId>/*.webp as static assets
```

### Boundaries

- `scripts/fetch-sentinel-scenes.py`: only contact point with the external
  world. Isolated from the app runtime.
- `data/sentinel/scene-manifest.json`: contract between the script and the app,
  mirrors `data/official/snapshot-manifest.json`.
- `src/lib/data/satelliteScenes.ts`: pure module that loads the manifest and
  exposes `getSceneEvidence(caseId)`.
- `src/lib/data/expediente.ts`: extends the view model with
  `satelliteEvidence: SatelliteEvidence | null`.
- `src/components/SatellitePanel.tsx`: UI; consumes the view model, never hits
  the network.

### Why Python (not Node)

`pystac-client` + `planetary-computer` + `rasterio` cover STAC query, signed-URL
access, COG windowed read, reprojection and export in roughly 150 lines. A Node
equivalent (`geotiff` + `sharp` + manual CRS work) is six times that and brittle
on edge cases. Python is the right tool here. Cost: a new `scripts/requirements.txt`
and a documented `pip install` step. The app runtime and the Next.js build are
unaffected.

## Data Contract

### Scene Manifest

File: `data/sentinel/scene-manifest.json`. Follows the same shape pattern as
`data/official/snapshot-manifest.json`.

```json
{
  "generatedAt": "2026-05-16T18:00:00.000Z",
  "stacEndpoint": "https://planetarycomputer.microsoft.com/api/stac/v1",
  "collection": "sentinel-2-l2a",
  "parameters": {
    "bboxSideMeters": 500,
    "renderWidthPx": 512,
    "cloudCoverThresholds": [10, 30, 50],
    "dateWindowMonths": [6, 12, 18]
  },
  "scenes": [
    {
      "caseId": "AR-CONTRACT-14-1002-CON21",
      "anchorDate": "2021-05-12",
      "before": {
        "sceneId": "S2A_MSIL2A_20201108T140051_R067_T20JPN_20201108T185611",
        "datetime": "2020-11-08T14:00:51Z",
        "cloudCover": 4.7,
        "windowExpandedTo": "6_months_lt_10pct",
        "imagePath": "public/sentinel/AR-CONTRACT-14-1002-CON21/before.webp",
        "imageHash": "sha256-abc...",
        "stacItemUrl": "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/S2A_..."
      },
      "after": {
        "sceneId": "S2B_MSIL2A_20260318T140049_R067_T20JPN_20260318T210332",
        "datetime": "2026-03-18T14:00:49Z",
        "cloudCover": 8.2,
        "windowExpandedTo": "6_months_lt_10pct",
        "imagePath": "public/sentinel/AR-CONTRACT-14-1002-CON21/after.webp",
        "imageHash": "sha256-def...",
        "stacItemUrl": "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/S2B_..."
      },
      "caveats": []
    }
  ]
}
```

Rules:

- `before` and `after` are independently nullable. A case can have one, both, or
  neither.
- `windowExpandedTo` records which fallback step succeeded; the UI shows it as a
  caveat when not equal to `6_months_lt_10pct`.
- `imageHash` is the sha256 of the final WebP, not of the source COG.
- `stacItemUrl` lets anyone re-fetch the same scene from Planetary Computer.

### Satellite Receipt

Each scene becomes an `EvidenceReceipt` with the existing shape. New global
`sourceId`: **`PC-SENTINEL2-L2A`** (the source is global, not per country).

```ts
createEvidenceReceipt({
  sourceId: "PC-SENTINEL2-L2A",
  sourceName: "Planetary Computer · Sentinel-2 L2A",
  sourceUrl: scene.stacItemUrl,
  rawPath: scene.imagePath,
  snapshotHash: scene.imageHash,
  recordId: scene.sceneId,
  locatorType: "official_detail",
  extractedAt: scene.datetime,
  parserVersion: "sentinel-fetcher@1",
  row: {
    sceneId: scene.sceneId,
    cloudCover: scene.cloudCover,
    bbox: scene.bbox,
    windowExpandedTo: scene.windowExpandedTo
  }
})
```

`locatorType: "official_detail"` is correct: the STAC item URL is the
reproducible direct link for that scene.

### Expediente View Model Extension

```ts
export interface SatelliteScene {
  sceneId: string;
  datetime: string;
  cloudCover: number;
  imageUrl: string;
  stacItemUrl: string;
  receipt: EvidenceReceipt;
  caveats: string[];
}

export interface SatelliteEvidence {
  available: boolean;
  reason: string | null;
  bboxSideMeters: number;
  before: SatelliteScene | null;
  after: SatelliteScene | null;
  caveats: string[];
}

export interface ExpedienteView {
  // ... existing fields
  satelliteEvidence: SatelliteEvidence | null;
}
```

Rule: `satelliteEvidence` is populated only when `caseFile.coordinates &&
caseFile.year`. Cases without geometry keep `satelliteEvidence: null` and the
panel does not render.

### Minimal Changes to Existing Modules

- `src/lib/data/caseSignals.ts` -> `addGeoSignals()`: drop the
  `countryCode === "AR"` guard on `sentinel_candidate`. Update the label/copy so
  it describes the actual fact ("Imagen Sentinel-2 disponible") rather than
  implying something is pending.
- `src/lib/data/evidenceReceipts.ts`: no structural change. New `sourceId`
  consumed through the existing factory.
- `src/lib/caseRepository.ts`: in `buildEvidencePack()`, include satellite
  receipts inside `relatedReceipts` so the exported JSON carries them.

## UI

### Placement

Replaces the current `satelliteBox` placeholder in `CaseDetails.tsx` (lines
59-80). Renders after `CaseSignalPanel` and before `receiptBox`, only when
`expediente.satelliteEvidence?.available`.

### Panel layout

```
+-- Imagenes Sentinel-2 --------------------- contexto territorial --+
|                                                                    |
|  Imagen oficial Copernicus . Recorte 500 m alrededor del punto     |
|                                                                    |
|  [ WebP 256x256 ]            [ WebP 256x256 ]                      |
|                                                                    |
|   ANTES DEL CONTRATO          ESCENA RECIENTE                      |
|   8 nov 2020 . 4.7% nubes     18 mar 2026 . 8.2% nubes             |
|   Ver escena oficial          Ver escena oficial                   |
|                                                                    |
|  La imagen muestra cobertura del suelo en dos fechas. No prueba    |
|  avance fisico, pagos ni cumplimiento. Las nubes, la resolucion    |
|  (10 m por pixel) y la fecha pueden ocultar cambios.               |
|                                                                    |
+--------------------------------------------------------------------+
```

Each thumbnail is clickable and opens a zoom modal with the full-size image
(~512x512) plus complete metadata: scene id, exact datetime, STAC link, WebP
hash, link to Copernicus Browser.

### States

| State | Render |
|---|---|
| `satelliteEvidence === null` | Nothing; the existing `traceBox` already explains "sin geometria oficial". |
| `available && before && after` | Full panel, two thumbnails. |
| `available && !before && after` | Single column ("Escena reciente") with caveat "No se encontro escena previa al contrato con baja nubosidad." |
| `available && before && !after` | Single column ("Antes del contrato") with caveat "Escena reciente no disponible para esta coordenada." |
| `available && !before && !after` | Panel with message "Sentinel-2 no devolvio escenas usables para esta coordenada en las ventanas exploradas." plus a STAC link for manual verification. |
| `windowExpandedTo !== "6_months_lt_10pct"` | Inline badge on the scene: "Ventana ampliada: 12 meses, <30 % nubes." |

### Zoom modal

```
+-- Sentinel-2 . 8 nov 2020 ------------------------------------- x +
|                                                                   |
|             [ WebP 512x512 ]                                      |
|                                                                   |
|  Scene id      S2A_MSIL2A_20201108T140051_R067_T20JPN_...         |
|  Plataforma    Sentinel-2A                                        |
|  Resolucion    10 m por pixel (bandas B04, B03, B02)              |
|  Nubosidad     4.7 %                                              |
|  Recorte       500 x 500 m alrededor de -34.5857, -58.3893        |
|  Procesamiento Planetary Computer . Sentinel-2 L2A                |
|  Hash WebP     sha256-abc123...                                   |
|                                                                   |
|  [ Abrir en Copernicus Browser ]  [ Ver receipt JSON ]            |
|                                                                   |
+-------------------------------------------------------------------+
```

### Interactions With Existing UI

- The current `satelliteBox` (CaseDetails.tsx lines 59-80) is removed.
- `sentinel_candidate` signal copy is updated to describe the actual fact
  instead of suggesting a pending action.
- `traceBox` ("Rastro visual" toggle) stays untouched; it is kept as a separate
  affordance for a future non-satellite visual layer.
- `/api/export/[id]` automatically carries satellite receipts because they are
  included in `relatedReceipts`. No route handler change needed beyond the
  repository update.

### CSS

A new `.satellitePanel` section in `globals.css`, roughly 80 lines. Matches the
existing visual shell: subtle rgba border, generous padding, mono typography for
metadata, accent gold only on hovers.

## Testing

### Node tests

| File | Coverage |
|---|---|
| `tests/satelliteScenes.test.ts` (new) | `loadSceneManifest()` parses ok; `getSceneEvidence(caseId)` returns `null` for cases without entries; `SatelliteEvidence` assembled with before/after, only-before, only-after, both-null. |
| `tests/expediente.test.ts` (extend) | AR case with coord + year + scene -> `satelliteEvidence.available === true`. PE case without coord -> `satelliteEvidence === null`. AR case with coord but no scene in manifest -> `available: false` with `reason`. |
| `tests/evidenceReceipts.test.ts` (extend) | Receipt with `sourceId: "PC-SENTINEL2-L2A"` validates; `locatorType: "official_detail"` describes correctly. |
| `tests/caseSignals.test.ts` (extend) | `sentinel_candidate` fires for AR, PE, CL when coord + year are present. |
| `tests/exportBundles.test.ts` (extend) | `buildEvidencePack()` includes satellite receipts in `relatedReceipts` when scenes exist. |

Not covered by automated tests: the Python script itself and live Planetary
Computer access. Tests never hit the network.

### Fixtures

`tests/fixtures/scene-manifest.test.json` carries three entries:

- AR with valid before + after
- AR with only after (before failed all windows)
- AR with no scenes (both null)

Tests load this fixture, not the real manifest.

### Python verifier

`scripts/verify-sentinel-manifest.py` checks:

- Every `imagePath` exists on disk.
- Every `imageHash` matches the sha256 of the current file.
- Every `caseId` in the manifest exists in the dataset (no orphan scenes).
- `cloudCover` is between 0 and 100.
- `datetime` is valid ISO and consistent with the declared window.

Exits non-zero on any mismatch.

### Package scripts

```json
"scripts": {
  "sentinel:setup": "pip install -r scripts/requirements.txt",
  "sentinel:fetch": "python scripts/fetch-sentinel-scenes.py",
  "sentinel:verify": "python scripts/verify-sentinel-manifest.py",
  "data:build": "node --experimental-strip-types scripts/build-argentina-work-cases.ts && node --experimental-strip-types scripts/build-cross-country-cases.ts",
  "data:verify": "node --experimental-strip-types scripts/verify-data-spine.ts && python scripts/verify-sentinel-manifest.py"
}
```

`sentinel:fetch` is kept separate from `data:build` on purpose: the AR/PE/CL
case build is fast (under a minute); the scene fetch is slow (minutes to hours
depending on case count) and is invoked on demand.

### Acceptance gate for V1

The following must pass after implementation:

```
npm test
npm run sentinel:verify
npm run data:verify
npm run typecheck
npm run build
```

Manual checks:

- Open an AR case with coordinates at `127.0.0.1:3002/?demo=map` and see both
  images.
- Click a thumbnail; the zoom modal opens with complete metadata.
- A PE or CL case without coordinates does not render the satellite panel.
- A case with a partial scene (only `after`) renders one column plus the
  caveat.
- The downloaded evidence pack JSON includes the satellite receipts inside
  `relatedReceipts`.

### Documentation

A small `scripts/README-sentinel.md` describes:

- How to install Python and the script dependencies.
- How to run the fetcher.
- What happens if Planetary Computer is unreachable.
- How to regenerate only missing scenes (idempotency).

## Storage decision

Generated WebPs are committed to the repo at
`public/sentinel/<caseId>/{before,after}.webp`. Each WebP is ~50-200 KB. With
the current AR cases that have official coordinates, the total stays well under
20 MB. If the satellite layer grows past ~100 MB of imagery, the migration path
is to move the files to Cloudflare R2 (free up to 10 GB, zero egress) and only
change the `imageUrl` field in the manifest; the receipt model already points
to the STAC item URL as the canonical source.

## Non-goals for V1

- No automatic change detection, NDVI overlay, or band math beyond true-color
  RGB export.
- No live tile fetching at runtime. Everything is precomputed.
- No Leaflet overlay of Sentinel tiles inside the existing map. The satellite
  panel is its own UI surface.
- No scheduled refresh job in CI. Refresh is manual via `sentinel:fetch`.
- No new countries beyond AR/PE/CL.
- No fallback to alternate providers (Sentinel Hub, Element84) if Planetary
  Computer is unreachable. The script errors out and the user reruns.

## Open risks

- Python dependency adds friction for contributors who only know TS. Mitigated
  by a clear README and a single `pip install` step.
- COG download sizes can be large for cases in dense Sentinel tiles. Mitigated
  by clipping at read time via `rasterio.windows.from_bounds()`.
- Planetary Computer is a Microsoft service; long-term availability is not
  guaranteed. Mitigated by recording the STAC item URL so any compatible STAC
  client can reproduce the fetch.
