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
    blurb: "DNV · obras Santa Cruz/Chubut",
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
    blurb: "Juicio oral TOF 7 · contratos y proveedores",
    tags: ["Coimas", "Sentencia 2026", "TOF 7"],
  },
  // Peru
  {
    countryCode: "PE",
    caseId: "PE-CONTRACT-2343672-1",
    variant: "geo",
    marker: { lat: -10.643432, lon: -76.194278 },
    callout: { lat: -2.0, lon: -62.0 },
    kicker: "OBRA · PASCO",
    title: "Pasco — obra Gobierno Regional",
    blurb: "Expediente técnico + ejecución de obra",
    tags: ["Gob. Regional", "USD 52M", "Obra grande"],
  },
  {
    countryCode: "PE",
    caseId: "PE-CONTRACT-2377518-1",
    variant: "documentary",
    marker: { lat: -15.2, lon: -75.2 },
    callout: { lat: -6.0, lon: -100.0 },
    kicker: "CONTRATO · ICA",
    title: "Marcona — parque urbano",
    blurb: "Municipalidad distrital · espacios públicos",
    tags: ["Municipal", "USD 1.8M", "Obra urbana"],
  },
  // Chile
  {
    countryCode: "CL",
    caseId: "CL-TENDER-1057491-76-LP26",
    variant: "geo",
    marker: { lat: -33.430964, lon: -70.606399 },
    callout: { lat: -28.0, lon: -105.0 },
    kicker: "SALUD · SANTIAGO",
    title: "Hospital Roberto del Río",
    blurb: "Servicios clínicos pediátricos",
    tags: ["Salud", "Campaña IRA", "Santiago"],
  },
  {
    countryCode: "CL",
    caseId: "CL-OCDS-608-282-I225",
    variant: "documentary",
    marker: { lat: -33.02, lon: -71.55 },
    callout: { lat: -48.0, lon: -100.0 },
    kicker: "SALUD · VIÑA DEL MAR",
    title: "Marcapasos Hospital Fricke",
    blurb: "Servicio quirúrgico de implantación y seguimiento",
    tags: ["Hospital", "USD 2.3M", "Salud"],
  },
];
