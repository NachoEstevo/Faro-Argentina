"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";

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
  traceMode: boolean;
  onSelectCase: (id: string) => void;
  waybackState: WaybackState;
  onWaybackTileLoadingChange: (loading: boolean) => void;
}

const ARGENMAP_LIGHT_URL =
  "https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png";
const ARGENMAP_ATTRIBUTION = "Mapa base: Instituto Geográfico Nacional - Argenmap";
const ESRI_ATTRIBUTION = "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const WAYBACK_PREFETCH_ZOOM = 17;
const WAYBACK_TILE_SIZE = 256;
const ARGENTINA_OVERVIEW_CENTER: [number, number] = [-38.4, -64.4];
const ARGENTINA_INITIAL_ZOOM = 5;
const ARGENTINA_OVERVIEW_ZOOM = 5;
const ARGENTINA_OVERVIEW_MAX_ZOOM = 6;
const ARGENTINA_OVERVIEW_FIT_THRESHOLD = 120;
const prefetchedWaybackTiles = new Set<string>();
const MAX_TOOLTIP_SUMMARY_LENGTH = 130;

export default function CaseMap({
  cases,
  selectedCaseId,
  traceMode,
  onSelectCase,
  waybackState,
  onWaybackTileLoadingChange,
}: Props) {
  const mapCases = useMemo(() => cases.filter(isMapMarkerEligible), [cases]);
  const selectedCase = useMemo(
    () => mapCases.find((caseFile) => caseFile.id === selectedCaseId) ?? null,
    [mapCases, selectedCaseId],
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
        scrollWheelZoom
        className="leafletRoot"
      >
        {waybackTileUrl ? (
          <TileLayer
            key={waybackTileUrl}
            attribution={ESRI_ATTRIBUTION}
            url={waybackTileUrl}
            maxZoom={19}
            keepBuffer={3}
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
          <TileLayer attribution={ARGENMAP_ATTRIBUTION} url={ARGENMAP_LIGHT_URL} />
        )}
        <ZoomControl position="topright" />
        <MapFocus
          cases={mapCases}
          selectedCase={selectedCase}
          waybackActive={selectedCase?.coordinates != null && waybackState.status !== "off" && waybackState.status !== "error"}
          onDeselect={handleClose}
        />
        <WaybackTilePrefetcher selectedCase={selectedCase} waybackState={waybackState} />
        {selectedCase?.coordinates && traceMode && (
          <Circle
            center={[selectedCase.coordinates.lat, selectedCase.coordinates.lon]}
            radius={65000}
            pathOptions={{
              color: "#5aa9e5",
              fillColor: "#5aa9e5",
              fillOpacity: 0.08,
              opacity: 0.7,
              weight: 1,
            }}
          />
        )}
        {mapCases.map((caseFile, index) => {
          const isSelected = caseFile.id === selectedCaseId;
          const markerContext = markerContextById.get(caseFile.id);
          const severity = markerContext?.severity ?? null;
          const tooltip = markerContext?.tooltip ?? buildMarkerTooltip(caseFile, [], null);
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
              eventHandlers={{ click: () => onSelectCase(caseFile.id) }}
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity,
                opacity: 0.95,
                weight,
                dashArray: isAdminReference ? "3 4" : undefined,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} className="caseMapTooltip">
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
                      <span className="caseMapTooltipSignalSummary">
                        {tooltip.primarySignal.summary}
                      </span>
                    </span>
                  )}
                  {tooltip.referenceLabel ? (
                    <span className="caseMapTooltipReference">{tooltip.referenceLabel}</span>
                  ) : null}
                  <span className="caseMapTooltipAction">Clic para abrir el expediente</span>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
  );
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
    summary: string;
  } | null;
  referenceLabel: string | null;
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
    title: caseFile.title,
    rows: buildTooltipRows(caseFile),
    primarySignal: primarySignal
      ? {
          kind: primarySignal.kind,
          heading: labelSignalHeading(primarySignal),
          label: primarySignal.label,
          summary: summarizeTooltipText(primarySignal.summary),
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
  addTooltipRow(rows, "Organismo", caseFile.agencyName);
  if ("supplierName" in caseFile) addTooltipRow(rows, "Proveedor", caseFile.supplierName);
  addTooltipRow(rows, "Monto", formatTooltipAmount("amount" in caseFile ? caseFile.amount : null));
  addTooltipRow(rows, "Procedimiento", caseFile.procedureNumber || caseFile.workNumber);
  return rows.slice(0, 4);
}

function addTooltipRow(
  rows: Array<{ label: string; value: string }>,
  label: string,
  value: string | null | undefined,
) {
  const cleaned = cleanText(value);
  if (!cleaned) return;
  rows.push({ label, value: summarizeTooltipText(cleaned, 72) });
}

function formatTooltipAmount(amount: SignalCaseFile["amount"]): string | null {
  if (!amount || !Number.isFinite(amount.value) || amount.value <= 0) return null;
  const local = `${amount.currency} ${Math.round(amount.value).toLocaleString("es-AR")}`;
  const usdEquivalent = readUsdEquivalent(amount);
  if (usdEquivalent !== null) return `US$ ${Math.round(usdEquivalent).toLocaleString("es-AR")} (${local})`;
  return local;
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

function summarizeTooltipText(value: string, maxLength = MAX_TOOLTIP_SUMMARY_LENGTH): string {
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
    .divideBy(WAYBACK_TILE_SIZE)
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
  return new Promise((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    (image as HTMLImageElement & { fetchPriority?: "high" | "low" }).fetchPriority = priority;
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
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
  waybackActive,
  onDeselect,
}: {
  cases: ExplorerCase[];
  selectedCase: ExplorerCase | null;
  waybackActive: boolean;
  onDeselect: () => void;
}) {
  const map = useMap();
  const boundsKey = useMemo(() => cases.map((caseFile) => caseFile.id).join("|"), [cases]);
  // Track the last navigation target so unrelated re-renders (e.g. moving the
  // Wayback year slider) do not yank the user back to the case centroid after
  // they have panned the map. We compare a string key rather than identity so
  // recomputed object references for the same selection are ignored.
  const lastFlightTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const selectedId = selectedCase?.id ?? null;
    const targetKey = selectedId ? `case:${selectedId}` : `bounds:${boundsKey}`;
    if (lastFlightTargetRef.current === targetKey) return;
    lastFlightTargetRef.current = targetKey;

    if (selectedCase?.coordinates) {
      map.flyTo([selectedCase.coordinates.lat, selectedCase.coordinates.lon], WAYBACK_TARGET_ZOOM, {
        animate: true,
        duration: WAYBACK_FLY_DURATION_SECONDS,
      });
      return;
    }
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
  }, [boundsKey, cases, map, selectedCase, waybackActive]);

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
