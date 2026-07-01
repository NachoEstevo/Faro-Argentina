import type { ArgentinaWorkCase } from "./argentinaWorks.ts";
import type { ArgentinaContractCaseFile } from "./argentinaContractCases.ts";

export type CanonicalRecordType =
  | "public_work"
  | "public_entity"
  | "geo_point"
  | "procurement_process"
  | "procurement_contract"
  | "budget_execution"
  | "supplier";

interface CanonicalRecordBase {
  canonicalId: string;
  type: CanonicalRecordType;
  countryCode: "AR";
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
  publicWorkId?: string | null;
  amount: ArgentinaContractCaseFile["amount"];
}

export interface ProcurementContract extends CanonicalRecordBase {
  type: "procurement_contract";
  title: string;
  officialIds: {
    contractNumber: string;
    procedureNumber: string;
  };
  publicEntityId: string | null;
  supplierId: string | null;
  publicWorkId?: string | null;
  amount: ArgentinaContractCaseFile["amount"];
}

export interface BudgetExecution extends CanonicalRecordBase {
  type: "budget_execution";
  title: string;
  officialIds: {
    executionKey: string;
  };
  publicEntityId: string | null;
  amount: ArgentinaContractCaseFile["amount"];
}

export interface Supplier extends CanonicalRecordBase {
  type: "supplier";
  name: string;
  officialIds: {
    normalizedName: string;
    document: string | null;
  };
}

export type CanonicalRecord =
  | PublicWork
  | PublicEntity
  | GeoPoint
  | ProcurementProcess
  | ProcurementContract
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
      caveats: ["Coordenada declarada por fuente oficial; no reemplaza verificación en terreno."],
      label: caseFile.title,
      coordinates: caseFile.coordinates,
      officialIds: {
        workNumber: caseFile.workNumber,
      },
    });
  }

  return records;
}

export function buildCanonicalRecordsFromArgentinaContractCase(
  caseFile: ArgentinaContractCaseFile,
): CanonicalRecord[] {
  const records: CanonicalRecord[] = [];
  const receiptIds = [
    caseFile.receipt.receiptId,
    ...(caseFile.relatedReceipts ?? []).map((receipt) => receipt.receiptId),
  ];
  const publicEntityId = caseFile.agencyCode
    ? `public_entity:${caseFile.countryCode}:${caseFile.agencyCode}`
    : null;
  const supplierKey = caseFile.supplierDocument ?? caseFile.supplierName;
  const supplierId = supplierKey
    ? `supplier:${caseFile.countryCode}:${slug(supplierKey)}`
    : null;
  const publicWorkId = caseFile.publicWorkNumber
    ? `public_work:${caseFile.countryCode}:${caseFile.publicWorkNumber}`
    : null;
  const geoPointId = caseFile.publicWorkNumber && caseFile.coordinates
    ? `geo_point:${caseFile.countryCode}:${caseFile.publicWorkNumber}`
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

  if (supplierId && supplierKey) {
    records.push({
      canonicalId: supplierId,
      type: "supplier",
      countryCode: caseFile.countryCode,
      receiptIds,
      confidence: "official_dataset",
      caveats: ["Proveedor declarado en adjudicación oficial; no prueba pago."],
      name: caseFile.supplierName ?? `Proveedor ${caseFile.supplierDocument}`,
      officialIds: {
        normalizedName: slug(caseFile.supplierName ?? supplierKey),
        document: caseFile.supplierDocument,
      },
    });
  }

  if (publicWorkId && caseFile.publicWorkNumber) {
    records.push({
      canonicalId: publicWorkId,
      type: "public_work",
      countryCode: caseFile.countryCode,
      receiptIds,
      confidence: "official_dataset",
      caveats: ["Obra pública enlazada desde identificador oficial relacionado."],
      title: caseFile.locationName ?? caseFile.title,
      officialIds: {
        workNumber: caseFile.publicWorkNumber,
        procedureNumber: caseFile.procedureNumber,
      },
      publicEntityId,
      geoPointId,
    });
  }

  if (geoPointId && caseFile.coordinates && caseFile.publicWorkNumber) {
    records.push({
      canonicalId: geoPointId,
      type: "geo_point",
      countryCode: caseFile.countryCode,
      receiptIds,
      confidence: "official_dataset",
      caveats: ["Coordenada cruzada desde fuente oficial relacionada."],
      label: caseFile.locationName ?? caseFile.title,
      coordinates: caseFile.coordinates,
      officialIds: {
        workNumber: caseFile.publicWorkNumber,
      },
    });
  }

  records.push({
    canonicalId: `procurement_contract:${caseFile.countryCode}:${caseFile.workNumber}`,
    type: "procurement_contract",
    countryCode: caseFile.countryCode,
    receiptIds,
    confidence: "official_dataset",
    caveats: caseFile.caveats,
    title: caseFile.title,
    officialIds: {
      contractNumber: caseFile.workNumber,
      procedureNumber: caseFile.procedureNumber,
    },
    publicEntityId,
    supplierId,
    publicWorkId,
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
