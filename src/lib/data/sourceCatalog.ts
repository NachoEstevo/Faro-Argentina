export type CountryCode = "AR";

export type SourcePriority = "mvp" | "later";

export type SourceAccessMode =
  | "direct_download"
  | "portal_download"
  | "portal_api"
  | "api";

export interface SourceCatalogEntry {
  sourceId: string;
  countryCode: CountryCode;
  name: string;
  agency: string;
  category: string;
  priority: SourcePriority;
  official: boolean;
  accessMode: SourceAccessMode;
  format: string;
  sourceUrl: string;
  downloadUrl: string | null;
  updateFrequency: string;
  keyFields: string[];
  caveats: string[];
}

export interface SourceCatalogValidationReport {
  totalSources: number;
  sourcesByCountry: Record<CountryCode, number>;
  errors: string[];
}

const countryCodes: CountryCode[] = ["AR"];

export function validateSourceCatalog(
  sources: SourceCatalogEntry[],
): SourceCatalogValidationReport {
  const errors: string[] = [];
  const seen = new Set<string>();
  const sourcesByCountry = { AR: 0 };

  sources.forEach((source, index) => {
    if (seen.has(source.sourceId)) {
      errors.push(`Duplicate sourceId: ${source.sourceId}`);
    }
    seen.add(source.sourceId);

    if (!countryCodes.includes(source.countryCode)) {
      errors.push(`Source at index ${index} has unsupported countryCode`);
    } else {
      sourcesByCountry[source.countryCode] += 1;
    }

    if (!source.official) errors.push(`${source.sourceId} must be official`);
    if (!isHttpUrl(source.sourceUrl)) errors.push(`${source.sourceId} must have an official URL`);
    if (source.downloadUrl !== null && !isHttpUrl(source.downloadUrl)) {
      errors.push(`${source.sourceId} has an invalid download URL`);
    }
    if (source.keyFields.length === 0) errors.push(`${source.sourceId} needs key fields`);
    if (source.caveats.length === 0) errors.push(`${source.sourceId} needs caveats`);
  });

  countryCodes.forEach((countryCode) => {
    const hasMvp = sources.some(
      (source) => source.countryCode === countryCode && source.priority === "mvp",
    );
    if (!hasMvp) errors.push(`${countryCode} needs at least one MVP source`);
  });

  return { totalSources: sources.length, sourcesByCountry, errors };
}

export function getMvpSourcesByCountry(
  sources: SourceCatalogEntry[],
  countryCode: CountryCode,
): SourceCatalogEntry[] {
  return sources.filter(
    (source) => source.countryCode === countryCode && source.priority === "mvp",
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
