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

export function normalizeAdminName(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
