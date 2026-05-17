"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { GeoJSON, MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer } from "leaflet";
import L from "leaflet";

import type { CountryCode } from "@/lib/data/countries";
import { COUNTRIES, isCountryCode } from "@/lib/data/countries";

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const DEFAULT_STYLE = {
  color: "#7cc1ec",
  weight: 2.6,
  fillColor: "#5aa9e5",
  fillOpacity: 0.22,
  dashArray: "0",
} as const;

const HOVER_STYLE = {
  color: "#e3f1fb",
  weight: 3.2,
  fillColor: "#5aa9e5",
  fillOpacity: 0.5,
} as const;

interface CountryProperties {
  code: CountryCode;
  name: string;
}

function SyncView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    const computeZoom = () => {
      if (typeof window === "undefined") return zoom;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w < 900) return Math.max(3, zoom - 1);
      if (w >= 2400) return zoom + 1;
      if (h > w) return Math.max(3, zoom - 0.5);
      return zoom;
    };

    let lastZoom = computeZoom();
    map.setMinZoom(Math.max(3, lastZoom - 1));
    map.setMaxZoom(lastZoom + 1);
    map.setView(center, lastZoom, { animate: false });

    const onResize = () => {
      const next = computeZoom();
      if (next === lastZoom) return;
      lastZoom = next;
      map.setMinZoom(Math.max(3, next - 1));
      map.setMaxZoom(next + 1);
      map.setView(center, next, { animate: false });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map, center[0], center[1], zoom]);
  return null;
}

interface Props {
  geojson: FeatureCollection<Geometry, CountryProperties>;
}

export default function CountryMap({ geojson }: Props) {
  const router = useRouter();
  const layersRef = useRef<Map<CountryCode, Layer>>(new Map());

  const caseCountByCode = useMemo(() => {
    const map = new Map<CountryCode, number>();
    COUNTRIES.forEach((country) => map.set(country.code, country.caseCount));
    return map;
  }, []);

  const onEachFeature = useCallback(
    (feature: Feature<Geometry, CountryProperties>, layer: Layer) => {
      const code = feature.properties?.code;
      const name = feature.properties?.name;
      if (!isCountryCode(code)) return;
      layersRef.current.set(code, layer);

      const count = caseCountByCode.get(code) ?? 0;
      const tooltipContent = `<strong>${name}</strong><span>${count.toLocaleString("es-AR")} expedientes</span>`;
      layer.bindTooltip(tooltipContent, {
        direction: "top",
        sticky: true,
        offset: L.point(0, -8),
        className: "country-tooltip",
      });

      const path = layer as L.Path & {
        setStyle: (style: L.PathOptions) => void;
        bringToFront: () => void;
      };
      path.setStyle(DEFAULT_STYLE);

      layer.on({
        mouseover: () => {
          path.setStyle(HOVER_STYLE);
          path.bringToFront();
        },
        mouseout: () => {
          path.setStyle(DEFAULT_STYLE);
        },
        click: () => {
          router.push(`/pais/${code}`);
        },
        keydown: (event) => {
          const key = (event as L.LeafletKeyboardEvent).originalEvent.key;
          if (key === "Enter" || key === " ") {
            event.originalEvent?.preventDefault?.();
            router.push(`/pais/${code}`);
          }
        },
      });

      const element = (layer as L.Path).getElement();
      if (element instanceof SVGElement) {
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", `Ver expedientes de ${name}`);
        element.style.cursor = "pointer";
        element.style.outline = "none";
      }
    },
    [caseCountByCode, router],
  );

  return (
    <MapContainer
      center={[-32, -75]}
      zoom={4}
      minZoom={3.5}
      maxZoom={5}
      zoomSnap={0.5}
      zoomControl={false}
      scrollWheelZoom
      doubleClickZoom
      touchZoom
      boxZoom={false}
      keyboard
      dragging
      attributionControl={false}
      worldCopyJump={false}
      maxBounds={[
        [-65, -110],
        [5, -30],
      ]}
      maxBoundsViscosity={0.7}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution={ESRI_ATTRIBUTION}
        url={ESRI_IMAGERY_URL}
        maxZoom={19}
        noWrap
      />
      <GeoJSON data={geojson} onEachFeature={onEachFeature} />
      <ZoomControl position="bottomright" />
      <SyncView center={[-32, -75]} zoom={4} />
    </MapContainer>
  );
}

