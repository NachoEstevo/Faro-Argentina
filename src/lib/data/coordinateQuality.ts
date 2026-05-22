import type { CountryCode } from "./sourceCatalog.ts";

export type GeoPoint = {
  lat: number;
  lon: number;
};

export type CoordinateStatus =
  | "valid_official_geometry"
  | "missing_geometry"
  | "invalid_coordinate"
  | "placeholder_geometry"
  | "duplicated_value_geometry"
  | "known_bad_geometry"
  | "sign_suspect"
  | "outside_country_bounds"
  | "unsupported_country";

export type CoordinateCandidate = {
  caseId?: string;
  countryCode: CountryCode | string;
  coordinates: GeoPoint | null;
};

export type CoordinateQuality = {
  caseId?: string;
  countryCode: string;
  coordinates: GeoPoint | null;
  status: CoordinateStatus;
  exposeOnMap: boolean;
  reasons: CoordinateStatus[];
  summary: string;
};

type Bounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

const countryBounds: Record<CountryCode, Bounds> = {
  AR: { minLat: -56, maxLat: -21, minLon: -74, maxLon: -53 },
};

const coordinateTolerance = 0.000001;

const knownBadGeometryCaseIds = new Set([
  "AR-WORK-74-0001-OBR21",
  "AR-WORK-74-0005-OBR21",
]);

export function assessCoordinateQuality(
  candidate: CoordinateCandidate,
): CoordinateQuality {
  const coordinates = candidate.coordinates;

  if (!coordinates) {
    return buildQuality(candidate, "missing_geometry", "Sin coordenadas oficiales.");
  }

  if (!isValidCoordinate(coordinates)) {
    return buildQuality(candidate, "invalid_coordinate", "Coordenadas invalidas.");
  }

  if (isPlaceholderCoordinate(coordinates)) {
    return buildQuality(
      candidate,
      "placeholder_geometry",
      "Coordenadas placeholder detectadas.",
    );
  }

  if (nearlyEqual(coordinates.lat, coordinates.lon)) {
    return buildQuality(
      candidate,
      "duplicated_value_geometry",
      "Latitud y longitud tienen el mismo valor.",
    );
  }

  if (candidate.caseId && knownBadGeometryCaseIds.has(candidate.caseId)) {
    return buildQuality(
      candidate,
      "known_bad_geometry",
      "Coordenadas oficiales bloqueadas por control de calidad manual.",
    );
  }

  if (candidate.countryCode === "AR" && isSouthernAtlanticCoordinate(coordinates)) {
    return buildQuality(
      candidate,
      "known_bad_geometry",
      "Coordenadas oficiales bloqueadas por control de calidad geografica.",
    );
  }

  const bounds = getCountryBounds(candidate.countryCode);
  if (!bounds) {
    return buildQuality(
      candidate,
      "unsupported_country",
      "Pais sin limites geograficos configurados.",
    );
  }

  if (isInsideBounds(coordinates, bounds)) {
    return {
      caseId: candidate.caseId,
      countryCode: candidate.countryCode,
      coordinates,
      status: "valid_official_geometry",
      exposeOnMap: true,
      reasons: [],
      summary: "Coordenadas oficiales dentro de los limites esperados.",
    };
  }

  if (looksLikeMissingSign(coordinates, bounds)) {
    return buildQuality(
      candidate,
      "sign_suspect",
      "Coordenadas fuera de limites; parecen tener un signo faltante.",
    );
  }

  return buildQuality(
    candidate,
    "outside_country_bounds",
    "Coordenadas fuera de los limites esperados del pais.",
  );
}

export function hasValidOfficialGeometry(
  candidate: CoordinateCandidate,
): boolean {
  return assessCoordinateQuality(candidate).status === "valid_official_geometry";
}

function buildQuality(
  candidate: CoordinateCandidate,
  status: Exclude<CoordinateStatus, "valid_official_geometry">,
  summary: string,
): CoordinateQuality {
  return {
    caseId: candidate.caseId,
    countryCode: candidate.countryCode,
    coordinates: candidate.coordinates,
    status,
    exposeOnMap: false,
    reasons: [status],
    summary,
  };
}

function isValidCoordinate(coordinates: GeoPoint): boolean {
  return (
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lon) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lon >= -180 &&
    coordinates.lon <= 180
  );
}

function isPlaceholderCoordinate(coordinates: GeoPoint): boolean {
  return (
    (nearlyEqual(coordinates.lat, 0) && nearlyEqual(coordinates.lon, 0)) ||
    (nearlyEqual(coordinates.lat, 0.123456) &&
      nearlyEqual(coordinates.lon, 0.123456))
  );
}

function getCountryBounds(countryCode: string): Bounds | null {
  if (countryCode === "AR") {
    return countryBounds[countryCode];
  }

  return null;
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= coordinateTolerance;
}

function isInsideBounds(coordinates: GeoPoint, bounds: Bounds): boolean {
  return (
    coordinates.lat >= bounds.minLat &&
    coordinates.lat <= bounds.maxLat &&
    coordinates.lon >= bounds.minLon &&
    coordinates.lon <= bounds.maxLon
  );
}

function isSouthernAtlanticCoordinate(coordinates: GeoPoint): boolean {
  return coordinates.lat <= -53 && coordinates.lon >= -60;
}

function looksLikeMissingSign(coordinates: GeoPoint, bounds: Bounds): boolean {
  const candidates = [
    { lat: -coordinates.lat, lon: coordinates.lon },
    { lat: coordinates.lat, lon: -coordinates.lon },
    { lat: -coordinates.lat, lon: -coordinates.lon },
  ];

  return candidates.some((candidate) => isInsideBounds(candidate, bounds));
}
