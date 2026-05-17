import type { ExplorerCase } from "./explorerCases";
import type { CrossCountryCaseFile } from "./crossCountryCases";

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function parseYearString(value: string | null | undefined): number | null {
  if (!value) return null;
  const head = value.slice(0, 4);
  if (!/^\d{4}$/.test(head)) return null;
  const parsed = Number.parseInt(head, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resolves the most informative "year" for a case file by walking a small
 * cascade: explicit `year` first, then the awarded date, then the published
 * date. Returns null when nothing usable is on the case.
 */
export function resolveCaseYear(caseFile: ExplorerCase): number | null {
  if (caseFile.year) return caseFile.year;
  if (isCrossCountryCase(caseFile)) {
    return parseYearString(caseFile.awardedAt) ?? parseYearString(caseFile.publishedAt);
  }
  return null;
}
