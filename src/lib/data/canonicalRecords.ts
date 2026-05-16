import type { ArgentinaWorkCase } from "./argentinaWorks.ts";

export type CanonicalRecordType = "public_work" | "public_entity" | "geo_point";

interface CanonicalRecordBase {
  canonicalId: string;
  type: CanonicalRecordType;
  countryCode: "AR" | "PE" | "CL";
  receiptIds: string[];
  confidence: "official_dataset" | "official_record" | "cross_verified" | "reviewed_case";
  caveats: string[];
}

export interface PublicWork extends CanonicalRecordBase {
  type: "public_work";
  title: string;
  officialIds: {
    workNumber: string;
    procedureNumber: string;
  };
  publicEntityId: string | null;
  geoPointId: string | null;
}

export interface PublicEntity extends CanonicalRecordBase {
  type: "public_entity";
  name: string;
  officialIds: {
    agencyCode: string;
  };
}

export interface GeoPoint extends CanonicalRecordBase {
  type: "geo_point";
  label: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  officialIds: {
    workNumber: string;
  };
}

export type CanonicalRecord = PublicWork | PublicEntity | GeoPoint;

export function buildCanonicalRecordsFromArgentinaWork(
  caseFile: ArgentinaWorkCase,
): CanonicalRecord[] {
  const records: CanonicalRecord[] = [];
  const receiptIds = [caseFile.receipt.receiptId];
  const publicEntityId = caseFile.agencyCode
    ? `public_entity:AR:${caseFile.agencyCode}`
    : null;
  const geoPointId = caseFile.coordinates
    ? `geo_point:AR:${caseFile.workNumber}`
    : null;

  records.push({
    canonicalId: `public_work:AR:${caseFile.workNumber}`,
    type: "public_work",
    countryCode: "AR",
    receiptIds,
    confidence: "official_dataset",
    caveats: caseFile.caveats,
    title: caseFile.title,
    officialIds: {
      workNumber: caseFile.workNumber,
      procedureNumber: caseFile.procedureNumber,
    },
    publicEntityId,
    geoPointId,
  });

  if (publicEntityId) {
    records.push({
      canonicalId: publicEntityId,
      type: "public_entity",
      countryCode: "AR",
      receiptIds,
      confidence: "official_dataset",
      caveats: ["Organismo declarado por la fuente oficial de la obra."],
      name: caseFile.agencyName,
      officialIds: {
        agencyCode: caseFile.agencyCode,
      },
    });
  }

  if (caseFile.coordinates && geoPointId) {
    records.push({
      canonicalId: geoPointId,
      type: "geo_point",
      countryCode: "AR",
      receiptIds,
      confidence: "official_dataset",
      caveats: ["Coordenada declarada por fuente oficial; no reemplaza verificacion en terreno."],
      label: caseFile.title,
      coordinates: caseFile.coordinates,
      officialIds: {
        workNumber: caseFile.workNumber,
      },
    });
  }

  return records;
}
