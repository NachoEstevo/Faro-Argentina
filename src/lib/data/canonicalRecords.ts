import type { ArgentinaWorkCase } from "./argentinaWorks.ts";
import type { CrossCountryCaseFile } from "./crossCountryCases.ts";

export type CanonicalRecordType =
  | "public_work"
  | "public_entity"
  | "geo_point"
  | "procurement_process"
  | "budget_execution"
  | "supplier";

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

export interface ProcurementProcess extends CanonicalRecordBase {
  type: "procurement_process";
  title: string;
  officialIds: {
    procedureNumber: string;
  };
  publicEntityId: string | null;
  supplierId: string | null;
  amount: CrossCountryCaseFile["amount"];
}

export interface BudgetExecution extends CanonicalRecordBase {
  type: "budget_execution";
  title: string;
  officialIds: {
    executionKey: string;
  };
  publicEntityId: string | null;
  amount: CrossCountryCaseFile["amount"];
}

export interface Supplier extends CanonicalRecordBase {
  type: "supplier";
  name: string;
  officialIds: {
    normalizedName: string;
  };
}

export type CanonicalRecord =
  | PublicWork
  | PublicEntity
  | GeoPoint
  | ProcurementProcess
  | BudgetExecution
  | Supplier;

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

export function buildCanonicalRecordsFromCrossCountryCase(
  caseFile: CrossCountryCaseFile,
): CanonicalRecord[] {
  const records: CanonicalRecord[] = [];
  const receiptIds = [caseFile.receipt.receiptId];
  const publicEntityId = caseFile.agencyCode
    ? `public_entity:${caseFile.countryCode}:${caseFile.agencyCode}`
    : null;
  const supplierId = caseFile.supplierName
    ? `supplier:${caseFile.countryCode}:${slug(caseFile.supplierName)}`
    : null;

  if (publicEntityId) {
    records.push({
      canonicalId: publicEntityId,
      type: "public_entity",
      countryCode: caseFile.countryCode,
      receiptIds,
      confidence: "official_dataset",
      caveats: ["Organismo comprador o ejecutor declarado por fuente oficial."],
      name: caseFile.agencyName,
      officialIds: {
        agencyCode: caseFile.agencyCode,
      },
    });
  }

  if (supplierId && caseFile.supplierName) {
    records.push({
      canonicalId: supplierId,
      type: "supplier",
      countryCode: caseFile.countryCode,
      receiptIds,
      confidence: "official_dataset",
      caveats: ["Proveedor declarado en adjudicacion oficial; no prueba pago."],
      name: caseFile.supplierName,
      officialIds: {
        normalizedName: slug(caseFile.supplierName),
      },
    });
  }

  if (caseFile.caseType === "procurement_process") {
    records.push({
      canonicalId: `procurement_process:${caseFile.countryCode}:${caseFile.procedureNumber}`,
      type: "procurement_process",
      countryCode: caseFile.countryCode,
      receiptIds,
      confidence: "official_dataset",
      caveats: caseFile.caveats,
      title: caseFile.title,
      officialIds: {
        procedureNumber: caseFile.procedureNumber,
      },
      publicEntityId,
      supplierId,
      amount: caseFile.amount,
    });
    return records;
  }

  records.push({
    canonicalId: `budget_execution:${caseFile.countryCode}:${caseFile.workNumber}`,
    type: "budget_execution",
    countryCode: caseFile.countryCode,
    receiptIds,
    confidence: "official_dataset",
    caveats: caseFile.caveats,
    title: caseFile.title,
    officialIds: {
      executionKey: caseFile.workNumber,
    },
    publicEntityId,
    amount: caseFile.amount,
  });
  return records;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
