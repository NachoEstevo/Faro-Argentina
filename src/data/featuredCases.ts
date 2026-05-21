export type FeaturedVariant = "geo" | "documentary";

export interface FeaturedCase {
  countryCode: "AR";
  caseId: string;
  variant: FeaturedVariant;
  marker: { lat: number; lon: number };
  callout: { lat: number; lon: number };
  kicker: string;
  title: string;
  blurb: string;
  tags: string[];
}

// Callout positions stay near Argentina while leaving the case cards readable.
export const FEATURED_CASES: FeaturedCase[] = [
  {
    countryCode: "AR",
    caseId: "AR-CONTRACT-46-1585-CON21",
    variant: "geo",
    marker: { lat: -46.076525, lon: -67.628974 },
    callout: { lat: -50.0, lon: -44.0 },
    kicker: "OBRA · PATAGONIA",
    title: "Vialidad — Ruta 3 Patagonia",
    blurb: "Contrato y obra pública con geometría oficial para abrir fuente, receipt y caveats.",
    tags: ["DNV", "USD 67M", "RN 3"],
  },
  {
    countryCode: "AR",
    caseId: "AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026",
    variant: "documentary",
    marker: { lat: -34.6, lon: -58.4 },
    callout: { lat: -27.0, lon: -47.0 },
    kicker: "CAUSA JUDICIAL",
    title: "Cuadernos / La Camarita",
    blurb: "Contexto judicial oficial vinculado a proveedores; no reemplaza la lectura documental.",
    tags: ["Contexto", "TOF 7", "MPF"],
  },
];
