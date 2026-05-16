export interface WaybackRelease {
  releaseId: number;
  releaseDate: string;
  releaseLabel: string;
  year: number;
}

const CONFIG_URL =
  "https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json";
const TITLE_DATE_PATTERN = /\((\d{4})-(\d{2})-(\d{2})\)/;

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
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/{z}/{y}/{x}`;
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

export function pickYearlyReleases(releases: WaybackRelease[]): WaybackRelease[] {
  const latestPerYear = new Map<number, WaybackRelease>();
  for (const release of releases) {
    const previous = latestPerYear.get(release.year);
    if (!previous || previous.releaseDate < release.releaseDate) {
      latestPerYear.set(release.year, release);
    }
  }
  return Array.from(latestPerYear.values()).sort((left, right) => left.year - right.year);
}
