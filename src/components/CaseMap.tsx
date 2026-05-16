"use client";

import { useEffect, useMemo } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import { buildCaseMarkerKey } from "@/lib/data/mapMarkers";

interface Props {
  cases: ExplorerCase[];
  selectedCaseId: string | null;
  traceMode: boolean;
  onSelectCase: (id: string) => void;
}

export default function CaseMap({ cases, selectedCaseId, traceMode, onSelectCase }: Props) {
  const selectedCase = cases.find((caseFile) => caseFile.id === selectedCaseId) ?? null;
  const mapCases = cases.filter((caseFile) => caseFile.coordinates !== null);

  return (
    <MapContainer
      center={[-31.5, -64.2]}
      zoom={5}
      minZoom={3}
      maxZoom={12}
      zoomControl={false}
      scrollWheelZoom
      className="leafletRoot"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position="bottomright" />
      <MapFocus cases={mapCases} selectedCase={selectedCase} />
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
  );
}

function MapFocus({
  cases,
  selectedCase,
}: {
  cases: ExplorerCase[];
  selectedCase: ExplorerCase | null;
}) {
  const map = useMap();
  const boundsKey = useMemo(
    () => cases.map((caseFile) => caseFile.id).join("|"),
    [cases],
  );

  useEffect(() => {
    if (selectedCase?.coordinates) {
      map.flyTo([selectedCase.coordinates.lat, selectedCase.coordinates.lon], 8, {
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
  }, [boundsKey, cases, map, selectedCase]);

  return null;
}
