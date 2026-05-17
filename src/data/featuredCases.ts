export type FeaturedVariant = "geo" | "documentary";

export interface FeaturedCase {
  countryCode: "AR" | "PE" | "CL";
  caseId: string;
  variant: FeaturedVariant;
  marker: { lat: number; lon: number };
  callout: { lat: number; lon: number };
  kicker: string;
  title: string;
  blurb: string;
  tags: string[];
}

// Callout positions are spread across the landing-map perimeter so the 6
// cards do not overlap. East-of-the-continent (Atlantic) hosts the AR
// cards; the Pacific corridor and the Amazon basin host the PE/CL ones.
export const FEATURED_CASES: FeaturedCase[] = [
  // Argentina
  {
    countryCode: "AR",
    caseId: "AR-CONTRACT-46-1585-CON21",
    variant: "geo",
    marker: { lat: -46.076525, lon: -67.628974 },
    callout: { lat: -50.0, lon: -44.0 },
    kicker: "OBRA · PATAGONIA",
    title: "Vialidad — Ruta 3 Patagonia",
    blurb: "Misma ruta y agencia que la causa que llegó a la Corte. ¿Qué pasa con la obra nueva?",
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
    blurb: "Las anotaciones que sacudieron la Argentina. Sentencia 2026 — leé el detalle.",
    tags: ["Coimas", "Sentencia 2026", "TOF 7"],
  },
];
