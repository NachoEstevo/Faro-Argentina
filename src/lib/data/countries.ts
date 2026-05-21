import type { CountryCode } from "./sourceCatalog.ts";
import { getCasesByCountry } from "../caseRepository.ts";

export type { CountryCode };

export interface CountryConfig {
  code: CountryCode;
  name: string;
  sourceLabel: string;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
  caseCount: number;
}

const STATIC: Record<CountryCode, Omit<CountryConfig, "caseCount">> = {
  AR: {
    code: "AR",
    name: "Argentina",
    sourceLabel: "Obras CONTRAT.AR",
    centroid: [-38.4, -63.6],
    bounds: [
      [-55.06, -73.56],
      [-21.78, -53.64],
    ],
  },
};

export const COUNTRIES: CountryConfig[] = (Object.keys(STATIC) as CountryCode[]).map(
  (code) => ({
    ...STATIC[code],
    caseCount: getCasesByCountry(code).length,
  }),
);

export function getCountryConfig(code: CountryCode): CountryConfig | null {
  return COUNTRIES.find((country) => country.code === code) ?? null;
}

export function totalCaseCount(): number {
  return COUNTRIES.reduce((sum, country) => sum + country.caseCount, 0);
}

export function isCountryCode(value: string): value is CountryCode {
  return value === "AR";
}
