export interface WaybackRelease {
  releaseId: number;
  releaseDate: string;
  releaseLabel: string;
  year: number;
}

const CONFIG_URL =
  "https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json";
const TITLE_DATE_PATTERN = /(\d{4})-(\d{2})-(\d{2})/;
const ARCGIS_API_KEY = process.env.NEXT_PUBLIC_ARCGIS_API_KEY ?? "";
const TOKEN_SUFFIX = ARCGIS_API_KEY ? `?token=${encodeURIComponent(ARCGIS_API_KEY)}` : "";

let releasesCache: WaybackRelease[] | null = null;
let releasesPromise: Promise<WaybackRelease[]> | null = null;

export async function loadYearlyReleases(): Promise<WaybackRelease[]> {
  if (releasesCache) return releasesCache;
  if (releasesPromise) return releasesPromise;
  releasesPromise = (async () => {
    try {
      const response = await fetch(CONFIG_URL);
      if (!response.ok) {
        throw new Error(`Wayback config request failed: ${response.status}`);
      }
      const raw = (await response.json()) as Record<string, unknown>;
      const all = mapConfigRawToReleases(raw);
      const yearly = pickYearlyReleases(all);
      releasesCache = yearly;
      return yearly;
    } finally {
      releasesPromise = null;
    }
  })();
  return releasesPromise;
}

export function tileUrlForRelease(releaseId: number): string {
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/{z}/{y}/{x}${TOKEN_SUFFIX}`;
}

export function formatReleaseYear(release: WaybackRelease): string {
  return String(release.year);
}

export function mapConfigRawToReleases(raw: Record<string, unknown>): WaybackRelease[] {
  const releases: WaybackRelease[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const releaseId = Number.parseInt(key, 10);
    const itemTitle = typeof entry.itemTitle === "string" ? entry.itemTitle : null;
    if (!Number.isFinite(releaseId) || !itemTitle) continue;
    const match = itemTitle.match(TITLE_DATE_PATTERN);
    if (!match) continue;
    const releaseDate = `${match[1]}-${match[2]}-${match[3]}`;
    const year = Number.parseInt(match[1], 10);
    releases.push({ releaseId, releaseDate, releaseLabel: itemTitle, year });
  }
  releases.sort((left, right) => left.releaseDate.localeCompare(right.releaseDate));
  return releases;
}

/**
 * Picks the release that best matches `targetYear`. Prefers an exact year
 * match. When no exact match exists, prefers the latest release at or before
 * the target year (so we show how the place looked when the case was active,
 * not a future snapshot). Falls back to the most recent release if nothing is
 * at or before. Returns null only when `releases` is empty.
 */
export function pickReleaseForYear(
  releases: WaybackRelease[],
  targetYear: number | null | undefined,
): WaybackRelease | null {
  if (releases.length === 0) return null;
  if (targetYear == null) return releases[releases.length - 1];
  const exact = releases.find((release) => release.year === targetYear);
  if (exact) return exact;
  let candidate: WaybackRelease | null = null;
  for (const release of releases) {
    if (release.year <= targetYear && (!candidate || release.year > candidate.year)) {
      candidate = release;
    }
  }
  return candidate ?? releases[releases.length - 1];
}

export function pickYearlyReleases(releases: WaybackRelease[]): WaybackRelease[] {
  const latestPerYear = new Map<number, WaybackRelease>();
  for (const release of releases) {
    const previous = latestPerYear.get(release.year);
    // Wayback config releaseIds are not chronological, so we sort by the title
    // date (the actual snapshot date). Some releases lack z>=18 tiles; coverage
    // gaps are handled at the tile-layer level via maxNativeZoom rather than
    // here.
    if (!previous || previous.releaseDate < release.releaseDate) {
      latestPerYear.set(release.year, release);
    }
  }
  return Array.from(latestPerYear.values()).sort((left, right) => left.year - right.year);
}
