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
