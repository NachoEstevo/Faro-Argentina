"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { canvas as createCanvasRenderer, type Map as LeafletMap } from "leaflet";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import { buildCaseMarkerKey, isMapMarkerEligible } from "@/lib/data/mapMarkers";
import {
  buildCaseSignalContext,
  buildCaseSignals,
  selectPrimaryCaseSignal,
  type CaseSignal,
  type CaseAlertSeverity,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import { tileUrlForRelease } from "@/lib/data/wayback";
import type { WaybackState } from "./WaybackControl";

interface Props {
  cases: ExplorerCase[];
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
  resetViewToken: number;
  waybackState: WaybackState;
  onWaybackTileLoadingChange: (loading: boolean) => void;
}

const ARGENMAP_LIGHT_URL =
  "https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png";
const ARGENMAP_ATTRIBUTION = "Mapa base: Instituto Geográfico Nacional - Argenmap";
const ESRI_ATTRIBUTION = "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const WAYBACK_PREFETCH_ZOOM = 17;
const MAP_TILE_SIZE = 256;
const ARGENTINA_OVERVIEW_CENTER: [number, number] = [-38.4, -64.4];
const ARGENTINA_INITIAL_ZOOM = 5;
const ARGENTINA_OVERVIEW_ZOOM = 5;
const ARGENTINA_OVERVIEW_MAX_ZOOM = 6;
const ARGENTINA_OVERVIEW_FIT_THRESHOLD = 120;
const prefetchedWaybackTiles = new Set<string>();
const prefetchedArgenmapTiles = new Set<string>();
const MAX_TOOLTIP_TITLE_LENGTH = 72;
const MAX_TOOLTIP_ROW_LENGTH = 38;
const MAX_TOOLTIP_SIGNAL_LENGTH = 34;
const HOVER_TOOLTIP_MARGIN = 12;
const HOVER_TOOLTIP_GAP = 14;
const MAP_TILE_KEEP_BUFFER = 4;
const MARKER_CANVAS_HIT_TOLERANCE = 12;
const MAP_TILE_PREFETCH_RADIUS = 1;
const MAX_PREFETCHED_ARGENMAP_TILES = 180;

export default function CaseMap({
  cases,
  selectedCaseId,
  onSelectCase,
  resetViewToken,
  waybackState,
  onWaybackTileLoadingChange,
}: Props) {
  const mapCases = useMemo(() => cases.filter(isMapMarkerEligible), [cases]);
  const markerRenderer = useMemo(
    () => createCanvasRenderer({ padding: 0.5, tolerance: MARKER_CANVAS_HIT_TOLERANCE }),
    [],
  );
  const [hoveredCaseId, setHoveredCaseId] = useState<string | null>(null);
  const selectedCase = useMemo(
    () => mapCases.find((caseFile) => caseFile.id === selectedCaseId) ?? null,
    [mapCases, selectedCaseId],
  );
  const hoveredCase = useMemo(
    () => mapCases.find((caseFile) => caseFile.id === hoveredCaseId) ?? null,
    [hoveredCaseId, mapCases],
  );

  const markerContextById = useMemo(() => {
    const signalContext = buildCaseSignalContext(mapCases as SignalCaseFile[]);
    const map = new Map<string, MarkerContext>();
    for (const caseFile of mapCases) {
      const signals = buildCaseSignals(caseFile as SignalCaseFile, signalContext);
      const mapGeoEvidence = getMapGeoEvidence(caseFile);
      const referenceLabel = buildReferenceLabel(mapGeoEvidence);
      map.set(caseFile.id, {
        severity: getSeverityFromSignals(signals),
        tooltip: buildMarkerTooltip(caseFile, signals, referenceLabel),
      });
    }
    return map;
  }, [mapCases]);

  const handleClose = useCallback(() => {
    onSelectCase("");
  }, [onSelectCase]);

  useEffect(() => {
    if (!hoveredCaseId) return;
    if (!mapCases.some((caseFile) => caseFile.id === hoveredCaseId)) {
      setHoveredCaseId(null);
    }
  }, [hoveredCaseId, mapCases]);

  const waybackTileUrl =
    waybackState.status === "active" ? tileUrlForRelease(waybackState.activeReleaseId) : null;

  useEffect(() => {
    onWaybackTileLoadingChange(Boolean(waybackTileUrl));
  }, [onWaybackTileLoadingChange, waybackTileUrl]);

  return (
    <MapContainer
        center={ARGENTINA_OVERVIEW_CENTER}
        zoom={ARGENTINA_INITIAL_ZOOM}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        preferCanvas
        scrollWheelZoom
        inertia
        inertiaDeceleration={2600}
        easeLinearity={0.22}
        zoomAnimationThreshold={4}
        className="leafletRoot"
      >
        {waybackTileUrl ? (
          <TileLayer
            key={waybackTileUrl}
            attribution={ESRI_ATTRIBUTION}
            url={waybackTileUrl}
            maxZoom={19}
            keepBuffer={MAP_TILE_KEEP_BUFFER}
            updateWhenZooming={false}
            eventHandlers={{
              loading: () => onWaybackTileLoadingChange(true),
              load: () => onWaybackTileLoadingChange(false),
            }}
            // Some Wayback releases lack tiles past z=17 and return 404s. Cap
            // tile requests at 17 and let Leaflet upscale for z=18-19 instead.
            maxNativeZoom={17}
          />
        ) : (
          <TileLayer
            attribution={ARGENMAP_ATTRIBUTION}
            url={ARGENMAP_LIGHT_URL}
            keepBuffer={MAP_TILE_KEEP_BUFFER}
            updateWhenZooming={false}
          />
        )}
        <SafeZoomControl />
        <MapFocus
          cases={mapCases}
          selectedCase={selectedCase}
          resetViewToken={resetViewToken}
          waybackActive={selectedCase?.coordinates != null && waybackState.status !== "off" && waybackState.status !== "error"}
          onDeselect={handleClose}
        />
        <ArgenmapTileWarmup enabled={!waybackTileUrl} />
        <WaybackTilePrefetcher selectedCase={selectedCase} waybackState={waybackState} />
        <HoverTooltipOverlay
          caseFile={hoveredCase}
          tooltip={hoveredCase ? markerContextById.get(hoveredCase.id)?.tooltip ?? null : null}
        />
        {mapCases.map((caseFile, index) => {
          const isSelected = caseFile.id === selectedCaseId;
          const markerContext = markerContextById.get(caseFile.id);
          const severity = markerContext?.severity ?? null;
          const coordinates = caseFile.coordinates;
          if (!coordinates) return null;
          const mapGeoEvidence = getMapGeoEvidence(caseFile);
          const isAdminReference = mapGeoEvidence?.precision === "official_admin_centroid";
          const colors = pickMarkerColors(isSelected, severity);
          const radius = isSelected ? 9 : isAdminReference ? 5.5 : severity === "high" ? 8 : severity === "medium" ? 7 : 6;
          const weight = isSelected ? 3 : isAdminReference ? 1.4 : severity === "high" ? 2.2 : severity === "medium" ? 1.8 : 1.5;
          const fillOpacity = isSelected ? 0.95 : isAdminReference ? 0.46 : severity === "high" ? 0.88 : severity === "medium" ? 0.82 : 0.7;
          return (
            <CircleMarker
              key={buildCaseMarkerKey(caseFile, index)}
              center={[coordinates.lat, coordinates.lon]}
              radius={radius}
              renderer={markerRenderer}
              eventHandlers={{
                click: () => {
                  setHoveredCaseId(null);
                  onSelectCase(caseFile.id);
                },
                mouseover: () => setHoveredCaseId(caseFile.id),
                mouseout: () => {
                  setHoveredCaseId((current) => (current === caseFile.id ? null : current));
                },
              }}
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity,
                opacity: 0.95,
                weight,
                dashArray: isAdminReference ? "3 4" : undefined,
              }}
            />
          );
        })}
      </MapContainer>
  );
}

function SafeZoomControl() {
  const map = useMap();

  useEffect(() => {
    const mapInternals = map as LeafletMap & {
      _controlContainer?: HTMLElement;
      _controlCorners?: Record<string, HTMLElement>;
    };
    if (
      !map.getContainer().isConnected ||
      !mapInternals._controlContainer ||
      !mapInternals._controlCorners
    ) {
      return;
    }

    const zoomControl = L.control.zoom({ position: "topright" });
    zoomControl.addTo(map);

    return () => {
      try {
        zoomControl.remove();
      } catch {
        // Leaflet can double-clean controls during development remounts.
      }
    };
  }, [map]);

  return null;
}

interface MarkerContext {
  severity: CaseAlertSeverity | null;
  tooltip: MarkerTooltip;
}

interface MarkerTooltip {
  kicker: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
  primarySignal: {
    kind: CaseSignal["kind"];
    heading: string;
    label: string;
  } | null;
  referenceLabel: string | null;
}

interface HoverTooltipPosition {
  left: number;
  top: number;
  height: number;
  arrowX: number;
  placement: "top" | "bottom";
}

function HoverTooltipOverlay({
  caseFile,
  tooltip,
}: {
  caseFile: ExplorerCase | null;
  tooltip: MarkerTooltip | null;
}) {
  const map = useMap();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<HoverTooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    if (!caseFile?.coordinates || !tooltip) {
      setPosition(null);
      return;
    }
    const containerPoint = map.latLngToContainerPoint([
      caseFile.coordinates.lat,
      caseFile.coordinates.lon,
    ]);
    const mapSize = map.getSize();
    const cardRect = cardRef.current?.getBoundingClientRect();
    const fallbackWidth = Math.min(312, Math.max(220, mapSize.x - HOVER_TOOLTIP_MARGIN * 2));
    const width = cardRect?.width || fallbackWidth;
    const height = cardRect?.height || 176;
    const maxLeft = Math.max(HOVER_TOOLTIP_MARGIN, mapSize.x - HOVER_TOOLTIP_MARGIN - width);
    const maxTop = Math.max(HOVER_TOOLTIP_MARGIN, mapSize.y - HOVER_TOOLTIP_MARGIN - height);

    let placement: HoverTooltipPosition["placement"] = "top";
    let top = containerPoint.y - height - HOVER_TOOLTIP_GAP;
    if (top < HOVER_TOOLTIP_MARGIN) {
      placement = "bottom";
      top = containerPoint.y + HOVER_TOOLTIP_GAP;
    }
    top = clampNumber(top, HOVER_TOOLTIP_MARGIN, maxTop);

    const left = clampNumber(
      containerPoint.x - width / 2,
      HOVER_TOOLTIP_MARGIN,
      maxLeft,
    );
    const arrowX = clampNumber(containerPoint.x - left, 18, Math.max(18, width - 18));

    setPosition({
      left,
      top,
      height,
      arrowX,
      placement,
    });
  }, [caseFile, map, tooltip]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (!caseFile?.coordinates || !tooltip) return;
    updatePosition();
    map.on("move", updatePosition);
    map.on("zoom", updatePosition);
    map.on("resize", updatePosition);
    return () => {
      map.off("move", updatePosition);
      map.off("zoom", updatePosition);
      map.off("resize", updatePosition);
    };
  }, [caseFile?.coordinates, map, tooltip, updatePosition]);

  if (!caseFile || !tooltip || !position) return null;

  return (
    <div className="caseMapHoverLayer" aria-hidden>
      <span
        className={`caseMapTooltipPointer caseMapTooltipPointer-${position.placement}`}
        style={{
          transform: `translate3d(${Math.round(position.left + position.arrowX - 5.5)}px, ${Math.round(
            position.placement === "top" ? position.top + position.height - 6 : position.top - 5,
          )}px, 0) rotate(${position.placement === "top" ? 45 : 225}deg)`,
        }}
      />
      <div
        ref={cardRef}
        className={`caseMapTooltip caseMapHoverCard caseMapTooltipPlacement-${position.placement}`}
        style={{
          transform: `translate3d(${Math.round(position.left)}px, ${Math.round(position.top)}px, 0)`,
        }}
      >
        <div className="caseMapTooltipInner">
          <span className="caseMapTooltipKicker">{tooltip.kicker}</span>
          <strong className="caseMapTooltipTitle">{tooltip.title}</strong>
          {tooltip.rows.length > 0 && (
            <dl className="caseMapTooltipFacts">
              {tooltip.rows.map((row) => (
                <div key={row.label} className="caseMapTooltipFact">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {tooltip.primarySignal && (
            <span className={`caseMapTooltipSignal caseMapTooltipSignal-${tooltip.primarySignal.kind}`}>
              <span className="caseMapTooltipSignalLabel">
                {tooltip.primarySignal.heading}: {tooltip.primarySignal.label}
              </span>
            </span>
          )}
          {tooltip.referenceLabel ? (
            <span className="caseMapTooltipReference">{tooltip.referenceLabel}</span>
          ) : null}
          <span className="caseMapTooltipAction">Abrir expediente</span>
        </div>
      </div>
    </div>
  );
}

function WaybackTilePrefetcher({
  selectedCase,
  waybackState,
}: {
  selectedCase: ExplorerCase | null;
  waybackState: WaybackState;
}) {
  const map = useMap();

  useEffect(() => {
    if (waybackState.status !== "active" || !selectedCase?.coordinates) return;
    let cancelled = false;
    let cancelIdlePrefetch: (() => void) | null = null;
    const coordinates = selectedCase.coordinates;

    const activeTileUrl = buildWaybackCenterTileUrl(
      map,
      coordinates,
      waybackState.activeReleaseId,
    );
    if (!activeTileUrl) return;

    void preloadWaybackTile(activeTileUrl, "high").finally(() => {
      if (cancelled) return;
      const followUpReleases = getFollowUpPrefetchReleases(
        waybackState.releases,
        waybackState.activeReleaseId,
      );
      cancelIdlePrefetch = scheduleIdlePrefetch(() => {
        for (const release of followUpReleases) {
          const url = buildWaybackCenterTileUrl(map, coordinates, release.releaseId);
          if (url) void preloadWaybackTile(url, "low");
        }
      });
    });

    return () => {
      cancelled = true;
      cancelIdlePrefetch?.();
    };
  }, [
    map,
    selectedCase?.coordinates?.lat,
    selectedCase?.coordinates?.lon,
    selectedCase?.id,
    waybackState,
  ]);

  return null;
}

function ArgenmapTileWarmup({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    let cancelIdlePrefetch: (() => void) | null = null;

    const scheduleWarmup = () => {
      cancelIdlePrefetch?.();
      cancelIdlePrefetch = scheduleIdlePrefetch(() => prefetchArgenmapNextZoomTiles(map));
    };

    scheduleWarmup();
    map.on("moveend", scheduleWarmup);
    map.on("zoomend", scheduleWarmup);
    return () => {
      cancelIdlePrefetch?.();
      map.off("moveend", scheduleWarmup);
      map.off("zoomend", scheduleWarmup);
    };
  }, [enabled, map]);

  return null;
}

function getSeverityFromSignals(signals: CaseSignal[]): CaseAlertSeverity | null {
  const rank: Record<CaseAlertSeverity, number> = { high: 3, medium: 2, low: 1 };
  let best: CaseAlertSeverity | null = null;
  for (const signal of signals) {
    if (signal.kind !== "watch") continue;
    const severity = signal.severity ?? "medium";
    if (best === null || rank[severity] > rank[best]) best = severity;
  }
  return best;
}

function pickMarkerColors(
  isSelected: boolean,
  severity: CaseAlertSeverity | null,
): { fill: string; stroke: string } {
  if (isSelected) {
    return { fill: "#b8daf0", stroke: "#0d0f13" };
  }
  if (severity === "high") {
    return { fill: "#d94c3a", stroke: "#6a1e15" };
  }
  if (severity === "medium") {
    return { fill: "#e07a5f", stroke: "#7a3520" };
  }
  if (severity === "low") {
    return { fill: "#d4a04a", stroke: "#7a5820" };
  }
  return { fill: "#5aa9e5", stroke: "#3577a8" };
}

function buildMarkerTooltip(
  caseFile: ExplorerCase,
  signals: CaseSignal[],
  referenceLabel: string | null,
): MarkerTooltip {
  const primarySignal = pickTooltipSignal(signals);
  return {
    kicker: buildTooltipKicker(caseFile),
    title: summarizeTooltipText(caseFile.title, MAX_TOOLTIP_TITLE_LENGTH),
    rows: buildTooltipRows(caseFile),
    primarySignal: primarySignal
      ? {
          kind: primarySignal.kind,
          heading: labelSignalHeading(primarySignal),
          label: summarizeTooltipText(primarySignal.label, MAX_TOOLTIP_SIGNAL_LENGTH),
        }
      : null,
    referenceLabel,
  };
}

function pickTooltipSignal(signals: CaseSignal[]): CaseSignal | null {
  return (
    selectPrimaryCaseSignal(signals) ??
    signals.find((signal) => signal.code === "official_progress_declared") ??
    signals.find((signal) => signal.code === "official_award_act") ??
    signals.find((signal) => signal.code === "cross_source_evidence") ??
    signals.find((signal) => signal.code === "supplier_identified") ??
    null
  );
}

function buildTooltipKicker(caseFile: ExplorerCase): string {
  return [
    labelCaseType(caseFile),
    caseFile.year ? String(caseFile.year) : null,
    shortSourceName(caseFile.receipt.sourceName),
  ].filter((value): value is string => Boolean(value)).join(" · ");
}

function labelCaseType(caseFile: ExplorerCase): string {
  if (!("caseType" in caseFile) || !caseFile.caseType) return "Obra publica";
  if (caseFile.caseType === "procurement_contract") return "Contrato";
  if (caseFile.caseType === "public_works_progress") return "Avance de obra";
  if (caseFile.caseType === "judicial_context") return "Contexto judicial";
  if (caseFile.caseType === "historical_public_work") return "Obra historica";
  if (caseFile.caseType === "supplier_judicial_context") return "Contexto proveedor";
  return "Expediente";
}

function buildTooltipRows(caseFile: ExplorerCase): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if ("supplierName" in caseFile && caseFile.supplierName) {
    addTooltipRow(rows, "Proveedor", caseFile.supplierName);
  } else {
    addTooltipRow(rows, "Organismo", caseFile.agencyName);
  }
  addTooltipRow(rows, "Monto", formatTooltipAmount("amount" in caseFile ? caseFile.amount : null));
  if (rows.length < 2) {
    addTooltipRow(rows, "Proced.", caseFile.procedureNumber || caseFile.workNumber);
  }
  return rows.slice(0, 2);
}

function addTooltipRow(
  rows: Array<{ label: string; value: string }>,
  label: string,
  value: string | null | undefined,
) {
  const cleaned = cleanText(value);
  if (!cleaned) return;
  rows.push({ label, value: summarizeTooltipText(cleaned, MAX_TOOLTIP_ROW_LENGTH) });
}

function formatTooltipAmount(amount: SignalCaseFile["amount"]): string | null {
  if (!amount || !Number.isFinite(amount.value) || amount.value <= 0) return null;
  const usdEquivalent = readUsdEquivalent(amount);
  if (usdEquivalent !== null) return `US$ ${Math.round(usdEquivalent).toLocaleString("es-AR")}`;
  return `${amount.currency} ${Math.round(amount.value).toLocaleString("es-AR")}`;
}

function readUsdEquivalent(amount: SignalCaseFile["amount"]): number | null {
  const candidate = amount as { usdEquivalent?: { usd?: unknown } | null };
  const usd = candidate.usdEquivalent?.usd;
  return typeof usd === "number" && Number.isFinite(usd) ? usd : null;
}

function labelSignalHeading(signal: CaseSignal): string {
  if (signal.kind === "watch") return "Señal de revisión";
  if (signal.kind === "gap") return "Dato a completar";
  if (signal.kind === "ready") return "Evidencia disponible";
  return "Contexto";
}

function summarizeTooltipText(value: string, maxLength = MAX_TOOLTIP_ROW_LENGTH): string {
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function shortSourceName(sourceName: string): string {
  const cleaned = cleanText(sourceName);
  if (cleaned.length <= 24) return cleaned;
  return cleaned.replace(/^Argentina\s+/i, "").slice(0, 24).trim();
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getMapGeoEvidence(caseFile: ExplorerCase) {
  if (!("geoEvidence" in caseFile)) return null;
  return caseFile.geoEvidence?.find((evidence) =>
    evidence.exposeOnMap && evidence.coordinates,
  ) ?? null;
}

function buildReferenceLabel(
  evidence: ReturnType<typeof getMapGeoEvidence>,
): string | null {
  if (evidence?.precision !== "official_admin_centroid") return null;
  if (evidence.granularity === "commune") {
    return "Referencia comunal, no ubicacion exacta";
  }
  if (evidence.granularity === "district") {
    return "Referencia distrital, no ubicacion exacta";
  }
  return "Referencia administrativa, no ubicacion exacta";
}

function buildWaybackCenterTileUrl(
  map: LeafletMap,
  coordinates: NonNullable<ExplorerCase["coordinates"]>,
  releaseId: number,
): string | null {
  const point = map
    .project([coordinates.lat, coordinates.lon], WAYBACK_PREFETCH_ZOOM)
    .divideBy(MAP_TILE_SIZE)
    .floor();
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return tileUrlForRelease(releaseId)
    .replace("{z}", String(WAYBACK_PREFETCH_ZOOM))
    .replace("{x}", String(point.x))
    .replace("{y}", String(point.y));
}

function preloadWaybackTile(url: string, priority: "high" | "low"): Promise<void> {
  if (prefetchedWaybackTiles.has(url)) return Promise.resolve();
  prefetchedWaybackTiles.add(url);
  return preloadTileImage(url, priority);
}

function preloadArgenmapTile(url: string): Promise<void> {
  if (prefetchedArgenmapTiles.has(url)) return Promise.resolve();
  prefetchedArgenmapTiles.add(url);
  while (prefetchedArgenmapTiles.size > MAX_PREFETCHED_ARGENMAP_TILES) {
    const oldest = prefetchedArgenmapTiles.values().next().value;
    if (!oldest) break;
    prefetchedArgenmapTiles.delete(oldest);
  }
  return preloadTileImage(url, "low");
}

function preloadTileImage(url: string, priority: "high" | "low"): Promise<void> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    (image as HTMLImageElement & { fetchPriority?: "high" | "low" }).fetchPriority = priority;
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

function prefetchArgenmapNextZoomTiles(map: LeafletMap) {
  const currentZoom = Math.floor(map.getZoom());
  const targetZoom = Math.min(map.getMaxZoom(), currentZoom + 1);
  if (targetZoom <= currentZoom) return;
  const centerTile = map
    .project(map.getCenter(), targetZoom)
    .divideBy(MAP_TILE_SIZE)
    .floor();
  const maxTileIndex = 2 ** targetZoom - 1;
  for (let dx = -MAP_TILE_PREFETCH_RADIUS; dx <= MAP_TILE_PREFETCH_RADIUS; dx += 1) {
    for (let dy = -MAP_TILE_PREFETCH_RADIUS; dy <= MAP_TILE_PREFETCH_RADIUS; dy += 1) {
      const x = centerTile.x + dx;
      const y = centerTile.y + dy;
      if (x < 0 || y < 0 || x > maxTileIndex || y > maxTileIndex) continue;
      void preloadArgenmapTile(buildArgenmapTileUrl(targetZoom, x, y));
    }
  }
}

function buildArgenmapTileUrl(zoom: number, x: number, y: number): string {
  const tmsY = 2 ** zoom - 1 - y;
  return ARGENMAP_LIGHT_URL
    .replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{-y}", String(tmsY));
}

function getFollowUpPrefetchReleases(releases: Array<{ releaseId: number }>, activeReleaseId: number) {
  const activeIndex = releases.findIndex((release) => release.releaseId === activeReleaseId);
  return releases
    .map((release, index) => ({ release, index }))
    .filter(({ release }) => release.releaseId !== activeReleaseId)
    .sort((left, right) => {
      if (activeIndex < 0) return left.index - right.index;
      return Math.abs(left.index - activeIndex) - Math.abs(right.index - activeIndex);
    })
    .map(({ release }) => release);
}

function scheduleIdlePrefetch(callback: () => void): () => void {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 1400 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(callback, 350);
  return () => window.clearTimeout(handle);
}

const WAYBACK_TARGET_ZOOM = 17;
const WAYBACK_FLY_DURATION_SECONDS = 0.9;
// Guard window so the flyTo into Wayback (and its zoomend at z=17) does not
// trip the zoom-out-to-deselect handler before the user actually zooms out.
const ZOOM_OUT_ARM_DELAY_MS = 1200;

function MapFocus({
  cases,
  selectedCase,
  resetViewToken,
  waybackActive,
  onDeselect,
}: {
  cases: ExplorerCase[];
  selectedCase: ExplorerCase | null;
  resetViewToken: number;
  waybackActive: boolean;
  onDeselect: () => void;
}) {
  const map = useMap();
  // Track the last navigation target so unrelated re-renders (e.g. moving the
  // Wayback year slider) do not yank the user back to the case centroid after
  // they have panned the map. We compare a string key rather than identity so
  // recomputed object references for the same selection are ignored.
  const lastFlightTargetRef = useRef<string | null>(null);
  const lastResetTokenRef = useRef(resetViewToken);

  useEffect(() => {
    if (!selectedCase?.coordinates) {
      lastFlightTargetRef.current = null;
      return;
    }
    const targetKey = `case:${selectedCase.id}:${selectedCase.coordinates.lat}:${selectedCase.coordinates.lon}`;
    if (lastFlightTargetRef.current === targetKey) return;
    lastFlightTargetRef.current = targetKey;

    map.flyTo([selectedCase.coordinates.lat, selectedCase.coordinates.lon], WAYBACK_TARGET_ZOOM, {
      animate: true,
      duration: WAYBACK_FLY_DURATION_SECONDS,
    });
  }, [map, selectedCase?.coordinates?.lat, selectedCase?.coordinates?.lon, selectedCase?.id]);

  useEffect(() => {
    if (resetViewToken === lastResetTokenRef.current) return;
    lastResetTokenRef.current = resetViewToken;

    const coordinates = cases.flatMap((caseFile) =>
      caseFile.coordinates ? [[caseFile.coordinates.lat, caseFile.coordinates.lon] as [number, number]] : [],
    );
    if (coordinates.length > 1) {
      if (coordinates.length > ARGENTINA_OVERVIEW_FIT_THRESHOLD) {
        map.flyTo(ARGENTINA_OVERVIEW_CENTER, ARGENTINA_OVERVIEW_ZOOM, {
          animate: true,
          duration: WAYBACK_FLY_DURATION_SECONDS,
        });
        return;
      }
      map.flyToBounds(coordinates, {
        padding: [80, 80],
        maxZoom: ARGENTINA_OVERVIEW_MAX_ZOOM,
        duration: WAYBACK_FLY_DURATION_SECONDS,
      });
    }
  }, [cases, map, resetViewToken]);

  useEffect(() => {
    if (!selectedCase || !waybackActive) return;
    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, ZOOM_OUT_ARM_DELAY_MS);
    const handleZoomEnd = () => {
      if (!armed) return;
      if (map.getZoom() < WAYBACK_TARGET_ZOOM) {
        onDeselect();
      }
    };
    map.on("zoomend", handleZoomEnd);
    return () => {
      clearTimeout(armTimer);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, selectedCase, waybackActive, onDeselect]);

  return null;
}
