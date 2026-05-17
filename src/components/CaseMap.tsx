"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import { buildCaseMarkerKey } from "@/lib/data/mapMarkers";
import {
  getCaseAlertSeverity,
  type CaseAlertSeverity,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import { loadYearlyReleases, tileUrlForRelease } from "@/lib/data/wayback";
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

  const severityById = useMemo(() => {
    const map = new Map<string, CaseAlertSeverity | null>();
    for (const caseFile of mapCases) {
      map.set(caseFile.id, getCaseAlertSeverity(caseFile as SignalCaseFile));
    }
    return map;
  }, [mapCases]);

  const [waybackState, setWaybackState] = useState<WaybackState>({ status: "off" });
  const [retryToken, setRetryToken] = useState(0);
  const hasArmedWaybackRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const coordinates = selectedCase?.coordinates;
    const caseId = selectedCase?.id;
    if (!caseId || !coordinates) {
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
          setWaybackState({
            status: "error",
            caseId,
            message: "Wayback no devolvio releases disponibles.",
          });
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
    waybackState.status === "active" ? tileUrlForRelease(waybackState.activeReleaseId) : null;

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
        <MapFocus cases={mapCases} selectedCase={selectedCase} waybackActive={selectedCase?.coordinates != null && waybackState.status !== "error"} />
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
      <WaybackControl
        state={waybackState}
        onActiveReleaseChange={handleActiveReleaseChange}
        onClose={handleClose}
        onRetry={handleRetry}
      />
    </>
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
