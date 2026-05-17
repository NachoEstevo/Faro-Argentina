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
}

export const FEATURED_CASES: FeaturedCase[] = [
  // Argentina
  {
    countryCode: "AR",
    caseId: "AR-CONTRACT-46-1585-CON21",
    variant: "geo",
    marker: { lat: -46.076525, lon: -67.628974 },
    callout: { lat: -42.0, lon: -55.0 },
    kicker: "OBRA · PATAGONIA",
    title: "Vialidad — Ruta 3 Patagonia",
    blurb: "DNV · USD 67M · obras Santa Cruz/Chubut",
  },
  {
    countryCode: "AR",
    caseId: "AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026",
    variant: "documentary",
    marker: { lat: -34.6, lon: -58.4 },
    callout: { lat: -29.5, lon: -49.0 },
    kicker: "CAUSA JUDICIAL",
    title: "Cuadernos / La Camarita",
    blurb: "Juicio oral TOF 7 · contratos y proveedores",
  },
  // Peru
  {
    countryCode: "PE",
    caseId: "PE-CONTRACT-2343672-1",
    variant: "geo",
    marker: { lat: -10.643432, lon: -76.194278 },
    callout: { lat: -6.0, lon: -68.0 },
    kicker: "OBRA · PASCO",
    title: "Pasco — obra Gobierno Regional",
    blurb: "USD 52M · expediente técnico + ejecución",
  },
  {
    countryCode: "PE",
    caseId: "PE-CONTRACT-2377518-1",
    variant: "documentary",
    marker: { lat: -15.2, lon: -75.2 },
    callout: { lat: -18.5, lon: -84.0 },
    kicker: "CONTRATO · ICA",
    title: "Marcona — parque urbano",
    blurb: "Municipalidad distrital · USD 1.8M",
  },
  // Chile
  {
    countryCode: "CL",
    caseId: "CL-TENDER-1057491-76-LP26",
    variant: "geo",
    marker: { lat: -33.430964, lon: -70.606399 },
    callout: { lat: -28.0, lon: -62.5 },
    kicker: "SALUD · SANTIAGO",
    title: "Hospital Roberto del Río",
    blurb: "Campaña IRA 2026 · servicios clínicos",
  },
  {
    countryCode: "CL",
    caseId: "CL-OCDS-608-282-I225",
    variant: "documentary",
    marker: { lat: -33.02, lon: -71.55 },
    callout: { lat: -38.0, lon: -82.5 },
    kicker: "SALUD · VIÑA DEL MAR",
    title: "Marcapasos Hospital Fricke",
    blurb: "Servicio quirúrgico · USD 2.3M",
  },
];
