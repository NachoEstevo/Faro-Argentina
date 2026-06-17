"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import { buildCaseMarkerKey, isMapMarkerEligible } from "@/lib/data/mapMarkers";
import {
  getCaseAlertSeverity,
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
const ARGENTINA_INITIAL_ZOOM = 5;
const ARGENTINA_OVERVIEW_MAX_ZOOM = 5;
const prefetchedWaybackTiles = new Set<string>();

export default function CaseMap({
  cases,
  selectedCaseId,
  traceMode,
  onSelectCase,
  waybackState,
  onWaybackTileLoadingChange,
}: Props) {
  const selectedCase = cases.find(
    (caseFile) => caseFile.id === selectedCaseId && isMapMarkerEligible(caseFile),
  ) ?? null;
  const mapCases = cases.filter(isMapMarkerEligible);

  const severityById = useMemo(() => {
    const map = new Map<string, CaseAlertSeverity | null>();
    for (const caseFile of mapCases) {
      map.set(caseFile.id, getCaseAlertSeverity(caseFile as SignalCaseFile));
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
        center={[-31.5, -64.2]}
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
          const severity = severityById.get(caseFile.id) ?? null;
          const coordinates = caseFile.coordinates;
          if (!coordinates) return null;
          const mapGeoEvidence = getMapGeoEvidence(caseFile);
          const isAdminReference = mapGeoEvidence?.precision === "official_admin_centroid";
          const referenceLabel = buildReferenceLabel(mapGeoEvidence);
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
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>{caseFile.title}</strong>
                <span>{buildCaseSubtitle(caseFile)}</span>
                {referenceLabel ? <span>{referenceLabel}</span> : null}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
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

function buildCaseSubtitle(caseFile: ExplorerCase): string {
  const parts: string[] = [];
  if (caseFile.agencyName) parts.push(caseFile.agencyName);
  if ("supplierName" in caseFile && caseFile.supplierName) {
    parts.push(caseFile.supplierName);
  }
  if (caseFile.year) parts.push(String(caseFile.year));
  return parts.length > 0 ? parts.join(" · ") : caseFile.workNumber;
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
