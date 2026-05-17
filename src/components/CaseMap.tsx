"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import { buildCaseMarkerKey } from "@/lib/data/mapMarkers";
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
}

const CARTODB_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTODB_ATTRIBUTION = "&copy; OpenStreetMap contributors &copy; CARTO";
const ESRI_ATTRIBUTION = "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export default function CaseMap({ cases, selectedCaseId, traceMode, onSelectCase, waybackState }: Props) {
  const selectedCase = cases.find((caseFile) => caseFile.id === selectedCaseId) ?? null;
  const mapCases = cases.filter((caseFile) => caseFile.coordinates !== null);

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

  return (
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
          <TileLayer
            key={waybackTileUrl}
            attribution={ESRI_ATTRIBUTION}
            url={waybackTileUrl}
            maxZoom={19}
            // Some Wayback releases lack tiles past z=17 and return 404s. Cap
            // tile requests at 17 and let Leaflet upscale for z=18-19 instead.
            maxNativeZoom={17}
          />
        ) : (
          <TileLayer attribution={CARTODB_ATTRIBUTION} url={CARTODB_URL} />
        )}
        <ZoomControl position="bottomright" />
        <MapFocus
          cases={mapCases}
          selectedCase={selectedCase}
          waybackActive={selectedCase?.coordinates != null && waybackState.status !== "error"}
          onDeselect={handleClose}
        />
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
          const colors = pickMarkerColors(isSelected, severity);
          const radius = isSelected ? 9 : severity === "high" ? 8 : severity === "medium" ? 7 : 6;
          const weight = isSelected ? 3 : severity === "high" ? 2.2 : severity === "medium" ? 1.8 : 1.5;
          const fillOpacity = isSelected ? 0.95 : severity === "high" ? 0.88 : severity === "medium" ? 0.82 : 0.7;
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
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>{caseFile.title}</strong>
                <span>{buildCaseSubtitle(caseFile)}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
  );
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
      const targetZoom = waybackActive ? WAYBACK_TARGET_ZOOM : 8;
      map.flyTo([selectedCase.coordinates.lat, selectedCase.coordinates.lon], targetZoom, {
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
        maxZoom: 5,
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
