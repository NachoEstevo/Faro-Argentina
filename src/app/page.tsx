import { promises as fs } from "node:fs";
import path from "node:path";
import type { FeatureCollection, Geometry } from "geojson";

import RegionalMap from "@/components/RegionalMap/RegionalMap";
import { totalCaseCount } from "@/lib/data/countries";
import snapshotManifest from "../../data/official/snapshot-manifest.json" with { type: "json" };

export const metadata = {
  title: "Faro - No acusa, ilumina",
  description:
    "Mapa y scanner de expedientes verificables para seguir dinero público con fuentes oficiales.",
  alternates: {
    canonical: "/",
  },
};

interface CountryProps {
  code: "AR" | "PE" | "CL";
  name: string;
}

export default async function Home() {
  const geojsonPath = path.join(process.cwd(), "public", "geo", "latam-countries.json");
  const raw = await fs.readFile(geojsonPath, "utf8");
  const geojson = JSON.parse(raw) as FeatureCollection<Geometry, CountryProps>;

  const totalCases = totalCaseCount();
  const lastUpdated = formatGeneratedAt((snapshotManifest as { generatedAt?: string }).generatedAt);
  const syncLabel = `Datos hasta ${monthLabel((snapshotManifest as { generatedAt?: string }).generatedAt)}`;

  return (
    <RegionalMap
      geojson={geojson}
      totalCases={totalCases}
      lastUpdated={lastUpdated}
      syncLabel={syncLabel}
    />
  );
}

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatGeneratedAt(isoDate?: string): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.getUTCDate();
  const month = MONTHS_ES[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function monthLabel(isoDate?: string): string {
  if (!isoDate) return "diciembre 2025";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "diciembre 2025";
  return `${MONTHS_ES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
