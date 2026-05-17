import type { CrossCountryCode } from "./crossCountryCases.ts";
import type { GeoPoint } from "./coordinateQuality.ts";

export type GeoEvidencePrecision =
  | "official_point"
  | "official_address"
  | "official_admin_centroid"
  | "official_admin_reference"
  | "ai_candidate_unverified";

export type GeoEvidenceGranularity =
  | "site"
  | "address"
  | "district"
  | "province"
  | "department"
  | "commune"
  | "region";

export type GeoEvidenceConfidence = "high" | "medium" | "low";

export interface GeoEvidenceItem {
  precision: GeoEvidencePrecision;
  granularity: GeoEvidenceGranularity;
  label: string;
  sourceId: string;
  sourceField: string;
  method: string;
  confidence: GeoEvidenceConfidence;
  coordinates: GeoPoint | null;
  exposeOnMap: boolean;
  satelliteEligible: boolean;
  caveat: string;
}

export interface AdminCentroidRecord {
  countryCode: CrossCountryCode;
  code: string;
  region: string;
  province?: string;
  district?: string;
  commune?: string;
  coordinates: GeoPoint;
  sourceId: string;
}

export function normalizeAdminName(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function findPeruDistrictCentroid(
  centroids: AdminCentroidRecord[],
  location: {
    department?: string | null;
    province?: string | null;
    district?: string | null;
  },
): AdminCentroidRecord | null {
  const department = normalizeAdminName(location.department);
  const province = normalizeAdminName(location.province);
  const district = normalizeAdminName(location.district);
  if (!department || !province || !district) return null;

  return centroids.find((centroid) =>
    centroid.countryCode === "PE" &&
    normalizeAdminName(centroid.region) === department &&
    normalizeAdminName(centroid.province) === province &&
    normalizeAdminName(centroid.district) === district
  ) ?? null;
}

export function findChileCommuneCentroid(
  centroids: AdminCentroidRecord[],
  location: {
    region?: string | null;
    commune?: string | null;
  },
): AdminCentroidRecord | null {
  const region = normalizeAdminName(location.region);
  const commune = normalizeAdminName(location.commune);
  if (!region || !commune) return null;

  return centroids.find((centroid) =>
    centroid.countryCode === "CL" &&
    normalizeAdminName(centroid.region) === region &&
    normalizeAdminName(centroid.commune) === commune
  ) ?? null;
}

export function buildAdminCentroidGeoEvidence({
  countryCode,
  centroid,
  label,
  sourceField,
  method,
}: {
  countryCode: CrossCountryCode;
  centroid: AdminCentroidRecord;
  label: string;
  sourceField: string;
  method: string;
}): GeoEvidenceItem {
  const granularity = countryCode === "CL" ? "commune" : "district";
  const countryLabel = countryCode === "CL" ? "Chile" : "Peru";
  return {
    precision: "official_admin_centroid",
    granularity,
    label,
    sourceId: centroid.sourceId,
    sourceField,
    method,
    confidence: "medium",
    coordinates: centroid.coordinates,
    exposeOnMap: true,
    satelliteEligible: false,
    caveat: `Centroide administrativo oficial de ${countryLabel}; no es sitio exacto de ejecucion ni prueba visual de avance.`,
  };
}

export function extractPeruLocationFromText(
  text: string | null | undefined,
): { department: string; province: string; district: string } | null {
  const cleaned = String(text ?? "").replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /distrito\s+de\s+([^,.;]+)[,.;\s]+provincia\s+de\s+([^,.;]+)[,.;\s]+([a-záéíóúñü\s]+)$/i,
  );
  if (!match) return null;

  return {
    district: match[1]?.trim() ?? "",
    province: match[2]?.trim() ?? "",
    department: match[3]?.trim() ?? "",
  };
}
