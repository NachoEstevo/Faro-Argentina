import { assessCoordinateQuality, type GeoPoint } from "./coordinateQuality.ts";

export function buildCaseMarkerKey(
  caseFile: {
    id: string;
    coordinates: { lat: number; lon: number } | null;
  },
  index: number,
): string {
  const coordinates = caseFile.coordinates;
  if (!coordinates) return `${caseFile.id}-missing-${index}`;
  return `${caseFile.id}-${coordinates.lat}-${coordinates.lon}-${index}`;
}

export function isMapMarkerEligible(caseFile: {
  countryCode: string;
  coordinates: GeoPoint | null;
}): boolean {
  return assessCoordinateQuality({
    countryCode: caseFile.countryCode,
    coordinates: caseFile.coordinates,
  }).exposeOnMap;
}
