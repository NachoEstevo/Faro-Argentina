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
  PE: {
    code: "PE",
    name: "Perú",
    sourceLabel: "Contratos OECE",
    centroid: [-9.19, -75.02],
    bounds: [
      [-18.35, -81.33],
      [-0.04, -68.65],
    ],
  },
  CL: {
    code: "CL",
    name: "Chile",
    sourceLabel: "Adjudicaciones",
    centroid: [-35.68, -71.54],
    bounds: [
      [-55.98, -75.64],
      [-17.5, -66.95],
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
  return value === "AR" || value === "PE" || value === "CL";
}
